import hashlib
import json
import pytest
from fastapi.testclient import TestClient

from access_api.main import app
from access_core.exports import build_exports, export_directory, export_lesson
from access_core.lessons import EXAMPLE_ID, W3C_DIRECTORY, W3C_ID, captions_vtt, get_lesson, parse_vtt
from access_core.review import approved_caption, file_hash, source_files
from access_core.signing import SigningManifest, prepare_manifest, render_revision

client = TestClient(app)


def test_generated_caption_timestamps_never_exceed_source_duration():
    lesson = get_lesson(EXAMPLE_ID, 1)
    segments = parse_vtt(captions_vtt(lesson), lesson.media.duration)
    assert len(segments) == len(lesson.segments)
    assert segments[-1].end <= lesson.media.duration


def approval(directory, lesson, format="vtt", language="am", status="human-reviewed"):
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"approved-{language}.{format}"
    data = (W3C_DIRECTORY / f"captions.{language}.vtt").read_bytes() if format == "vtt" else b"test-only-approved-document"
    (directory / filename).write_bytes(data)
    video, captions = source_files(lesson)
    record = dict(schema_version="1.0", lesson_id=lesson.lesson_id, content_version=lesson.content_version,
                  course_version_id=lesson.course_version_id, edition="standard", language=language,
                  format=format, filename=filename, sha256=hashlib.sha256(data).hexdigest(),
                  video_sha256=file_hash(video), source_captions_sha256=file_hash(captions), status=status,
                  review_ref="test-only-review", publication_ref="test-only-publication")
    path = directory / f"{lesson.lesson_id}-v1-standard-{language}-{format}.json"
    path.write_text(json.dumps(record))
    return path, record


def test_pending_caption_cannot_be_published_and_approved_bytes_are_version_bound(tmp_path, monkeypatch):
    monkeypatch.setenv("ACCESS_REVIEW_DIR", str(tmp_path))
    lesson = get_lesson(W3C_ID, 1)
    path, record = approval(tmp_path, lesson, status="review-pending")
    base = f"/api/v1/lessons/{W3C_ID}"
    assert client.get(base + "/media/captions-am").status_code == 404
    record["status"] = "human-reviewed"
    path.write_text(json.dumps(record))
    manifest = client.get(base + "/manifest").json()
    assert manifest["media"]["caption_tracks"][1]["status"] == "human-reviewed"
    assert "test-only-review" not in json.dumps(manifest)
    response = client.get(base + "/media/captions-am")
    assert response.status_code == 200 and "ጥሩ" in response.text
    assert client.get(base + "/media/captions-am?version=2").status_code == 404
    (tmp_path / record["filename"]).write_text("changed")
    assert client.get(base + "/media/captions-am").status_code == 404
    assert client.get(base + "/manifest").json()["media"]["caption_tracks"][1]["src"] is None


@pytest.mark.parametrize("field", ["video_sha256", "source_captions_sha256", "course_version_id", "language"])
def test_caption_approval_rejects_changed_source_or_context(tmp_path, monkeypatch, field):
    monkeypatch.setenv("ACCESS_REVIEW_DIR", str(tmp_path))
    lesson = get_lesson(W3C_ID, 1)
    path, record = approval(tmp_path, lesson)
    record[field] = "ti" if field == "language" else "changed" if field == "course_version_id" else "0" * 64
    path.write_text(json.dumps(record))
    assert approved_caption(lesson, "am") is None


def test_explicit_english_review_replaces_the_pinned_source_default_and_fails_closed(tmp_path, monkeypatch):
    monkeypatch.setenv("ACCESS_REVIEW_DIR", str(tmp_path))
    lesson = get_lesson(W3C_ID, 1)
    assert approved_caption(lesson).status == "source-reviewed"
    path, record = approval(tmp_path, lesson, language="en", status="review-pending")
    base = f"/api/v1/lessons/{W3C_ID}"
    assert client.get(base + "/media/captions").status_code == 404
    assert client.get(base + "/manifest").json()["segments"] == []
    record["status"] = "human-reviewed"
    path.write_text(json.dumps(record))
    assert approved_caption(lesson).status == "human-reviewed"
    (tmp_path / record["filename"]).write_bytes(b"changed")
    assert approved_caption(lesson) is None
    assert client.get(base + "/media/captions").status_code == 404
    assert client.get(base + "/manifest").json()["media"]["described_caption_status"] == "source-reviewed"


def test_direct_sign_route_ignores_present_but_unapproved_recording(tmp_path, monkeypatch):
    (tmp_path / "ethsl.mp4").write_bytes(b"pending-recording")
    monkeypatch.setattr("access_api.main.W3C_DIRECTORY", tmp_path)
    base = f"/api/v1/lessons/{W3C_ID}"
    assert client.get(base + "/manifest").json()["media"]["sign_src"] is None
    assert client.get(base + "/media/sign-video").status_code == 404


def test_whole_lesson_sign_video_uses_exact_render_review_and_becomes_stale(tmp_path, monkeypatch):
    lesson = get_lesson(W3C_ID, 1)
    recording = tmp_path / "reviewed.mp4"
    recording.write_bytes(b"test-only-reviewed-video")
    manifest = prepare_manifest(lesson, "ethsl")
    data = manifest.model_dump()
    segment = dict(id="whole-lesson", cue_ids=[item.id for item in lesson.segments], start=0., end=lesson.media.duration,
                   source_text=" ".join(item.text for item in lesson.segments), text_sha256="0" * 64,
                   status="approved", presentation="interpreter-video", natural_duration=lesson.media.duration,
                   interpreter_video=dict(filename=recording.name, sha256=file_hash(recording), license="test-only"),
                   approved_render_sha256="0" * 64, review_ref="test-review", consent_ref="test-consent",
                   deaf_review_ref="test-deaf", interpreter_review_ref="test-interpreter", reference_recording_id="test-recording")
    from access_core.signing import text_hash
    segment["text_sha256"] = text_hash(segment["source_text"])
    data["segments"] = [segment]
    reviewed = SigningManifest.model_validate(data)
    segment["approved_render_sha256"] = render_revision(reviewed, reviewed.segments[0])
    (tmp_path / f"{W3C_ID}-v1-ethsl.json").write_text(json.dumps(data))
    monkeypatch.setenv("ACCESS_SIGNING_DIR", str(tmp_path))
    base = f"/api/v1/lessons/{W3C_ID}"
    public = client.get(base + "/manifest").json()
    assert public["media"]["sign_status"] == "reviewed"
    assert client.get(public["media"]["sign_src"]).content == recording.read_bytes()
    with monkeypatch.context() as context:
        context.setenv("ACCESS_REVIEW_DIR", str(tmp_path / "caption-reviews"))
        review_path, review = approval(tmp_path / "caption-reviews", lesson, language="en", status="review-pending")
        assert client.get(base + "/media/sign-video").status_code == 404
        assert client.get(base + f"/signing-assets/{recording.name}").status_code == 404
        assert client.get(base + "/manifest").json()["media"]["sign_src"] is None
        review["status"] = "human-reviewed"
        review_path.write_text(json.dumps(review))
        assert client.get(base + "/media/sign-video").status_code == 200
        captions = tmp_path / "caption-reviews" / review["filename"]
        captions.write_bytes(captions.read_bytes() + b"\nNOTE Test-only revised reviewed captions\n")
        review["sha256"] = file_hash(captions)
        review_path.write_text(json.dumps(review))
        assert client.get(base + "/media/captions").status_code == 200
        assert client.get(base + "/media/sign-video").status_code == 404
    recording.write_bytes(b"changed")
    assert client.get(base + "/media/sign-video").status_code == 404
    assert client.get(base + "/manifest").json()["media"]["sign_src"] is None


def test_export_metadata_never_runs_generators_and_missing_file_is_partial_service(monkeypatch):
    def forbidden(*args):
        raise AssertionError("Request regenerated exports")
    monkeypatch.setattr("access_core.exports.export_lesson", forbidden)
    response = client.get(f"/api/v1/lessons/{W3C_ID}/exports")
    assert response.status_code == 200
    assert {item["format"] for item in response.json()["items"]} == {"html", "txt", "zip"}


def test_missing_prebuilt_optional_format_does_not_break_metadata(tmp_path, monkeypatch):
    monkeypatch.setenv("ACCESS_EXPORT_DIR", str(tmp_path / "exports"))
    lesson = get_lesson(W3C_ID, 1)
    metadata = build_exports(lesson)
    item = next(item for item in metadata["items"] if item["format"] == "zip")
    (export_directory() / f"{W3C_ID}-v1" / item["filename"]).unlink()
    base = f"/api/v1/lessons/{W3C_ID}"
    assert {item["format"] for item in client.get(base + "/exports").json()["items"]} == {"html", "txt"}
    assert client.get(base + "/manifest").status_code == 200
    assert client.get(item["href"]).status_code == 404


def test_exports_reject_tampering_and_stale_caption_approval(tmp_path, monkeypatch):
    monkeypatch.setenv("ACCESS_REVIEW_DIR", str(tmp_path / "reviews"))
    monkeypatch.setenv("ACCESS_EXPORT_DIR", str(tmp_path / "exports"))
    lesson = get_lesson(W3C_ID, 1)
    record_path, record = approval(tmp_path / "reviews", lesson)
    metadata = build_exports(lesson)
    item = next(item for item in metadata["items"] if item["format"] == "txt")
    path = export_directory() / f"{W3C_ID}-v1" / item["filename"]
    original = path.read_bytes()
    path.write_bytes(b"x" * len(original))
    assert client.get(item["href"]).status_code == 503
    path.write_bytes(original)
    assert client.get(item["href"]).status_code == 200
    record["status"] = "review-pending"
    record_path.write_text(json.dumps(record))
    assert client.get(item["href"]).status_code == 503
    assert client.get(f"/api/v1/lessons/{W3C_ID}/manifest").status_code == 200


def test_reviewed_descriptive_document_is_semantic_and_escaped(tmp_path, monkeypatch):
    monkeypatch.setenv("ACCESS_REVIEW_DIR", str(tmp_path))
    lesson = get_lesson(W3C_ID, 1)
    path, record = approval(tmp_path, lesson, format="document", language="en")
    document = tmp_path / "approved-en.json"
    document.write_text(json.dumps(dict(title=lesson.title, language="en", sections=[dict(
        heading="Teaching example", text="Read foreground and background together.", image_description='<img src=x onerror="alert(1)">'
    )])))
    record.update(filename=document.name, sha256=file_hash(document))
    path.write_text(json.dumps(record))
    output = export_lesson(lesson, "html")[0].decode()
    assert "<h2>Teaching example</h2>" in output
    assert "Image description: &lt;img" in output and '<img src=x' not in output
