import base64
import io
import json
import logging
import sqlite3
import struct
import wave
from concurrent.futures import ThreadPoolExecutor
from email.message import Message
from urllib.error import HTTPError

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from access_api import career_speech as facade
from access_api.main import app
from access_core import speech_transport
from access_core.career_speech import MAX_BODY_BYTES, MAX_RESPONSE_BYTES, SpeechPrompt, TranscriptionRequest, prompt_messages
from access_core.jobs import JOBS
from access_core.speech_transport import SpeechFailure
from access_worker import addis_speech, speech_gateway


@pytest.fixture(autouse=True)
def isolated_speech(monkeypatch, tmp_path):
    monkeypatch.setenv("ADDIS_API_KEY", "test-only-provider-credential")
    monkeypatch.setenv("ACCESS_SPEECH_WORKER_TOKEN", "test-only-private-worker-token-not-a-real-secret")
    monkeypatch.setenv("ACCESS_SPEECH_WORKER_URL", "http://speech:8010")
    monkeypatch.setenv("ACCESS_SPEECH_BUDGET_DB", str(tmp_path / "budget.sqlite3"))
    monkeypatch.setenv("ACCESS_SPEECH_DAILY_REQUEST_LIMIT", "100")
    monkeypatch.setattr(addis_speech.provider, "voice", None)

    def no_network(*args, **kwargs):
        pytest.fail("Speech tests must not contact a live provider")

    monkeypatch.setattr(speech_transport, "build_opener", no_network)


def headers(content_type="application/json", protocol=None):
    values = Message()
    values["Content-Type"] = content_type
    if protocol:
        values["X-Addis-Audio-Protocol"] = protocol
    return values


def recording(seconds=1, rate=16000):
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(rate)
        audio.writeframes(b"\0\0" * rate * seconds)
    return output.getvalue()


def transcription_body(audio=None):
    return {"consent": True, "content_type": "audio/wav", "audio": base64.b64encode(audio if audio is not None else recording()).decode()}


def browser_headers():
    return {"Origin": "http://localhost:5173"}


def worker_headers():
    return {"Authorization": "Bearer test-only-private-worker-token-not-a-real-secret"}


def test_catalog_is_public_even_when_provider_is_disabled_and_contains_no_credentials(monkeypatch):
    monkeypatch.delenv("ACCESS_SPEECH_WORKER_URL")
    response = TestClient(app).get("/api/v1/career-speech/catalog")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    catalog = response.json()
    assert catalog["language"] == "am" and catalog["speech_enabled"] is False
    assert set(catalog["jobs"]) == {job.id for job in JOBS}
    for job in catalog["jobs"].values():
        assert "ማሳያ" in job["summary"]
        assert len(job["responsibilities"]) == 3
    assert "test-only" not in response.text
    assert "የተወላጅ ተናጋሪ ግምገማ" in catalog["speech_help"]


@pytest.mark.parametrize("overrides", [
    {"consent": False}, {"consent": 1}, {"consent": "true"}, {"kind": "application"}, {"text": "private-draft-do-not-send"},
    {"job_ids": ["real-employer"]}, {"job_ids": [job.id for job in JOBS[:6]]},
    {"kind": "saved", "job_ids": []}, {"kind": "details", "job_ids": [JOBS[0].id, JOBS[1].id]},
    {"kind": "results", "job_ids": [JOBS[0].id], "total": 11},
    {"kind": "results", "job_ids": [JOBS[0].id], "total": 1, "start": 2},
    {"kind": "shortlist", "job_ids": [JOBS[0].id], "total": 0},
    {"kind": "changed", "total": "11"}, {"kind": "role", "total": 11},
])
def test_public_synthesis_rejects_unapproved_content(overrides, caplog):
    caplog.set_level(logging.INFO)
    response = TestClient(app).post("/api/v1/career-speech/speak", json={"consent": True, "kind": "role", **overrides}, headers=browser_headers())
    assert response.status_code == 422
    assert "private-draft" not in response.text + caplog.text
    assert "test-only" not in response.text + caplog.text


def test_five_results_and_saved_jobs_are_resolved_from_stable_ids():
    first = SpeechPrompt(consent=True, kind="results", job_ids=[job.id for job in JOBS[:5]], total=11)
    messages = prompt_messages(first)
    assert len(messages) == 7
    assert messages[0] == "11 ሥራዎች ተገኝተዋል። ውጤቶች ከ1 እስከ 5።"
    assert messages[3].startswith("ውጤት 3። የሲኤንሲ")
    assert messages[4].startswith("ውጤት 4። ጀማሪ የድር")
    saved = SpeechPrompt(consent=True, kind="saved", job_ids=[JOBS[2].id, JOBS[3].id])
    assert "የሲኤንሲ" in prompt_messages(saved)[0] and "ጀማሪ የድር" in prompt_messages(saved)[0]
    last = SpeechPrompt(consent=True, kind="results", job_ids=[JOBS[10].id], total=11, start=11)
    assert len(prompt_messages(last)) == 3
    assert "ከ11 እስከ 11" in prompt_messages(last)[0]
    assert "ምንም ሥራ" in prompt_messages(SpeechPrompt(consent=True, kind="results"))[0]


@pytest.mark.parametrize("audio,status", [(b"not audio", 422), (recording(seconds=16), 413), (recording(rate=8000), 422), (recording()[:-2], 422), (b"RIFF" + b"\0" * 100, 422)])
def test_invalid_audio_never_reaches_worker(audio, status):
    response = TestClient(app).post("/api/v1/career-speech/transcribe", json=transcription_body(audio), headers=browser_headers())
    assert response.status_code == status
    assert "RIFF" not in response.text


def test_canonical_fifteen_second_wav_is_accepted_without_client_duration_claims():
    audio = recording(seconds=15)
    assert TranscriptionRequest(**transcription_body(audio)).decoded_audio() == audio
    with pytest.raises(ValidationError):
        TranscriptionRequest(**{**transcription_body(), "duration": 1})
    with pytest.raises(ValidationError):
        TranscriptionRequest(**{**transcription_body(), "content_type": "audio/webm"})


def test_chunked_payload_limit_applies_before_validation():
    for target in [app, speech_gateway.app]:
        response = TestClient(target).post("/api/v1/career-speech/transcribe", content=iter([b"a" * 400000, b"b" * 400000]),
                                           headers={**browser_headers(), **worker_headers(), "Content-Type": "application/json"})
        assert response.status_code == 413
        assert response.headers["cache-control"] == "no-store"
        assert MAX_BODY_BYTES < 800000


def test_public_post_origin_and_cors_are_explicit(monkeypatch):
    client = TestClient(app)
    for origin in [None, "https://unapproved.example"]:
        response = client.post("/api/v1/career-speech/speak", json={"consent": True, "kind": "role"}, headers={"Origin": origin} if origin else {})
        assert response.status_code == 403
    response = client.options("/api/v1/career-speech/speak", headers={**browser_headers(), "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Content-Type"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-credentials" not in response.headers
    monkeypatch.delenv("ACCESS_SPEECH_WORKER_URL")
    assert client.post("/api/v1/career-speech/speak", json={"consent": True, "kind": "role"}, headers=browser_headers()).status_code == 503


def test_facade_relays_only_to_configured_private_worker(monkeypatch):
    requests = []

    def private_response(url, **kwargs):
        requests.append((url, kwargs))
        return json.dumps({"text": "ሶስት እና አራት አስቀምጥ"}).encode(), headers()

    monkeypatch.setattr(facade, "fetch_bounded", private_response)
    response = TestClient(app).post("/api/v1/career-speech/transcribe", json=transcription_body(), headers={**browser_headers(), "Cookie": "not-forwarded=value"})
    assert response.status_code == 200 and response.json()["text"].startswith("ሶስት")
    assert response.headers["cache-control"] == "no-store"
    assert requests[0][0] == "http://speech:8010/api/v1/career-speech/transcribe"
    assert set(requests[0][1]["headers"]) == {"Authorization", "Content-Type"}
    assert "x-api-key" not in requests[0][1]["headers"]
    monkeypatch.setenv("ACCESS_SPEECH_WORKER_URL", "http://169.254.169.254:8010")
    assert not facade.configured()


def test_private_worker_authentication_is_required_and_errors_hide_content(caplog, monkeypatch):
    client = TestClient(speech_gateway.app)
    caplog.set_level(logging.INFO)
    for authorization in [None, "Bearer wrong"]:
        response = client.post("/api/v1/career-speech/speak", json={"consent": True, "kind": "role"}, headers={"Authorization": authorization} if authorization else {})
        assert response.status_code == 403
    monkeypatch.setattr(addis_speech.provider, "synthesize", lambda prompt: b"ID3demo-audio")
    response = client.post("/api/v1/career-speech/speak", json={"consent": True, "kind": "role"}, headers=worker_headers())
    assert response.status_code == 200 and response.headers["content-type"] == "audio/mpeg"
    assert response.content == b"ID3demo-audio"
    assert "test-only" not in caplog.text
    assert "timestamp=" in caplog.text and "correlation=" in caplog.text


def test_worker_sends_only_bounded_audio_to_documented_scribe_endpoint(monkeypatch):
    requests = []

    def response(path, **kwargs):
        requests.append((path, kwargs))
        return json.dumps({"data": {"text": "ቀጣይ"}}).encode(), headers()

    monkeypatch.setattr(addis_speech.provider, "request", response)
    assert addis_speech.provider.transcribe(recording()) == "ቀጣይ"
    path, request = requests[0]
    assert path.startswith("/api/v1/scribe/transcribe?language=am&backend=turbo&request_id=")
    assert b'name="audio"' in request["body"] and b"Content-Type: audio/wav" in request["body"]
    assert recording() in request["body"]


def frames(audio=b"ID3demo-audio", completion=None):
    return struct.pack(">I", len(audio)) + audio + b"\0\0\0\0" + json.dumps(completion if completion is not None else {"data": {"id": "demo-clip"}}).encode()


def test_voices_catalog_and_framed_audio_never_follow_provider_urls(monkeypatch):
    calls = []

    def response(path, **kwargs):
        calls.append((path, kwargs))
        if "voices?" in path:
            return json.dumps({"data": [{"id": "am-unavailable", "language": "am", "is_available": False},
                                       {"id": "am-test", "language": "am", "is_available": True, "is_default": True}]}).encode(), headers()
        return frames(completion={"data": {"audio_url": "http://169.254.169.254/private"}}), headers("application/octet-stream", "mp3-frames-v1")

    monkeypatch.setattr(addis_speech.provider, "request", response)
    assert addis_speech.provider.synthesize(SpeechPrompt(consent=True, kind="role")) == b"ID3demo-audio"
    assert [call[0] for call in calls] == ["/api/v1/voice/voices?language=am", "/api/v1/voice/generations/stream"]
    body = json.loads(calls[1][1]["body"])
    assert body["voice_id"] == "am-test" and body["language"] == "am" and body["output_format"] == "mp3_44100"
    assert body["text"].startswith("ምን ዓይነት")


@pytest.mark.parametrize("payload,content_type,protocol", [
    (struct.pack(">I", 3) + b"ID3", "application/octet-stream", "mp3-frames-v1"),
    (frames(completion={"error": {"message": "private provider detail"}}), "application/octet-stream", "mp3-frames-v1"),
    (frames(), "audio/mpeg", "unknown"),
    (b'{"data":{"audio_url":"https://unapproved.example/audio"}}', "application/json", "mp3-frames-v1"),
    (struct.pack(">I", MAX_RESPONSE_BYTES + 1), "application/octet-stream", "mp3-frames-v1"),
])
def test_invalid_or_incomplete_synthesis_fails_closed(monkeypatch, payload, content_type, protocol):
    monkeypatch.setattr(addis_speech.provider, "current_voice", lambda: "am-test")
    monkeypatch.setattr(addis_speech.provider, "request", lambda *args, **kwargs: (payload, headers(content_type, protocol)))
    with pytest.raises(SpeechFailure):
        addis_speech.provider.synthesize(SpeechPrompt(consent=True, kind="role"))


def test_daily_budget_is_atomic_persistent_and_contains_only_aggregate_counts(monkeypatch, tmp_path):
    monkeypatch.setenv("ACCESS_SPEECH_DAILY_REQUEST_LIMIT", "3")

    def reserve(_index):
        try:
            addis_speech.reserve_request()
            return 200
        except SpeechFailure as error:
            return error.status

    with ThreadPoolExecutor(max_workers=8) as pool:
        outcomes = list(pool.map(reserve, range(8)))
    assert outcomes.count(200) == 3 and outcomes.count(429) == 5
    with pytest.raises(SpeechFailure):
        addis_speech.reserve_request()
    with sqlite3.connect(tmp_path / "budget.sqlite3") as database:
        assert [row[1] for row in database.execute("PRAGMA table_info(speech_budget)")] == ["day", "requests", "minute", "recent"]
        assert database.execute("SELECT requests FROM speech_budget").fetchone() == (3,)


def test_busy_or_exhausted_worker_returns_readable_retry_without_retrying(monkeypatch):
    monkeypatch.setenv("ACCESS_SPEECH_DAILY_REQUEST_LIMIT", "1")
    addis_speech.reserve_request()
    response = TestClient(speech_gateway.app).post("/api/v1/career-speech/speak", json={"consent": True, "kind": "role"}, headers=worker_headers())
    assert response.status_code == 429 and 1 <= int(response.headers["Retry-After"]) <= 86400
    assert "Use typed controls" in response.json()["error"]["message"]


class FakeResponse:
    status = 200

    def __init__(self, data, content_type="application/json"):
        self.body = io.BytesIO(data)
        self.headers = headers(content_type)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read1(self, size):
        return self.body.read(size)


def test_network_allowlist_mime_and_response_caps(monkeypatch):
    requests = []

    class Opener:
        def open(self, request, timeout):
            requests.append(request.full_url)
            return FakeResponse(b"a" * 11)

    monkeypatch.setattr(speech_transport, "build_opener", lambda *args: Opener())
    args = dict(destinations=addis_speech.DESTINATIONS, headers={}, content_types={"application/json"}, limit=10)
    for url in ["http://169.254.169.254/data", "https://api.addisassistant.com@unapproved.example/data", "https://user:password@api.addisassistant.com/data", "https://api.addisassistant.com:0/data"]:
        with pytest.raises(SpeechFailure):
            speech_transport.fetch_bounded(url, **args)
    assert requests == []
    with pytest.raises(SpeechFailure):
        speech_transport.fetch_bounded(addis_speech.PROVIDER, **args)
    with pytest.raises(SpeechFailure):
        speech_transport.NoRedirect().redirect_request(None, None, 302, "redirect", None, "https://unapproved.example")


def test_provider_429_does_not_leak_its_error_body(monkeypatch):
    class Opener:
        def open(self, request, timeout):
            raise HTTPError(request.full_url, 429, "private provider detail", headers(), io.BytesIO(b"private provider body"))

    monkeypatch.setattr(speech_transport, "build_opener", lambda *args: Opener())
    with pytest.raises(SpeechFailure) as caught:
        addis_speech.provider.request("/api/v1/voice/voices?language=am")
    assert caught.value.status == 429 and "private" not in str(caught.value)
