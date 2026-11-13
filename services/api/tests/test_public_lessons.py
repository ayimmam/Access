import hashlib
import io
import json
import zipfile

from fastapi.testclient import TestClient

from access_api.main import app
from access_core.lessons import EXAMPLE_ID, parse_caption_source

client = TestClient(app)
BASE = "/api/v1/lessons/demo-learning-plan"


def test_manifest_and_cache_are_bound_to_version():
    response = client.get(BASE + "/manifest?version=1")
    assert response.status_code == 200
    assert response.json()["access"] == "public"
    assert client.get(BASE + "/manifest?version=1", headers={"If-None-Match": response.headers["etag"]}).status_code == 304
    assert client.get(BASE + "/manifest?version=2").status_code == 404


def test_unknown_and_unavailable_languages_have_safe_errors():
    for path in ["/api/v1/lessons/private-lesson/manifest", BASE + "/transcripts/am"]:
        response = client.get(path)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"
        assert response.json()["error"]["correlation_id"] == response.headers["x-correlation-id"]


def test_pack_matches_listing_hash_and_has_portable_content():
    listing = client.get(BASE + "/exports").json()
    item = next(item for item in listing["items"] if item["format"] == "zip")
    response = client.get(item["href"])
    assert hashlib.sha256(response.content).hexdigest() == item["sha256"]
    assert len(response.content) == item["bytes"]
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        manifest = json.loads(archive.read("manifest.json"))
        for entry in manifest["files"]:
            assert hashlib.sha256(archive.read(entry["path"])).hexdigest() == entry["sha256"]
        html = archive.read("index.html").decode()
        assert 'lang="en"' in html
        assert "<script" not in html
        assert "http" not in html


def test_invalid_version_and_format_do_not_reflect_input():
    for path in [BASE + "/manifest?version=secret-value", BASE + "/downloads/pdf"]:
        response = client.get(path)
        assert response.status_code == 422
        assert "secret-value" not in response.text


def test_no_staff_mutations_or_private_files_are_exposed():
    assert client.post(BASE + "/exports").status_code == 405
    assert client.get("/.env").status_code == 404
    assert client.get("/docs/references/certificates/Professional%20Foundations%20Certificate.png").status_code == 404


def test_cors_allows_only_configured_origins():
    response = client.get(BASE + "/manifest", headers={"Origin": "https://untrusted.example"})
    assert "access-control-allow-origin" not in response.headers
    response = client.get(BASE + "/manifest", headers={"Origin": "http://localhost:5173"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_example_media_captions_and_range_requests():
    base = f"/api/v1/lessons/{EXAMPLE_ID}"
    lesson = client.get(base + "/manifest").json()
    assert lesson["content_status"] == "source-draft"
    assert lesson["media"]["avatar_mode"] == "timing-prototype"
    assert lesson["segments"][0]["text"] == "[Music]"
    assert lesson["segments"][-1]["end"] == 121.496916
    captions = client.get(lesson["media"]["captions"])
    assert captions.headers["content-type"].startswith("text/vtt")
    assert "00:00:01.000 --> 00:00:09.000" in captions.text
    assert "0 seconds" not in captions.text
    response = client.get(lesson["media"]["src"], headers={"Range": "bytes=0-1023"})
    assert response.status_code == 206
    assert len(response.content) == 1024
    assert response.headers["content-type"] == "video/mp4"
    assert client.get(base + "/media/video?version=2").status_code == 404


def test_caption_parser_rejects_invalid_or_non_monotonic_timestamps():
    import pytest
    for text in ["no timed content", "0:60\n60 seconds\ntext", "0:09\n9 seconds\na\n0:08\n8 seconds\nb"]:
        with pytest.raises(ValueError):
            parse_caption_source(text, 20)


def test_media_pack_contains_captions_and_all_file_hashes_match():
    response = client.get(f"/api/v1/lessons/{EXAMPLE_ID}/downloads/zip")
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        manifest = json.loads(archive.read("manifest.json"))
        assert "captions.en.vtt" in archive.namelist()
        for entry in manifest["files"]:
            assert hashlib.sha256(archive.read(entry["path"])).hexdigest() == entry["sha256"]
