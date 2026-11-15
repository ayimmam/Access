"""Prebuild portable public exports; request handlers only read approved artifacts."""

import hashlib
import html
import io
import json
import os
import zipfile
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from access_core.lessons import DEMO, EXAMPLE_ID, W3C_DIRECTORY, W3C_ID, Lesson, get_lesson
from access_core.review import approved_asset, approved_caption, file_hash, published_lesson, source_files

ROOT = Path(__file__).resolve().parents[4]
LABELS = {"html": "Download light HTML", "txt": "Download plain text", "zip": "Download offline pack",
          "pdf": "Download reviewed tagged PDF", "brf": "Download reviewed Braille file"}
TYPES = {"html": "text/html; charset=utf-8", "txt": "text/plain; charset=utf-8", "zip": "application/zip",
         "pdf": "application/pdf", "brf": "application/octet-stream"}


class DocumentSection(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    heading: str = Field(min_length=1)
    text: str = Field(min_length=1)
    image_description: str | None = None


class LessonDocument(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    title: str = Field(min_length=1)
    language: str = Field(pattern=r"^(en|am|ti)$")
    sections: tuple[DocumentSection, ...] = Field(min_length=1)


def export_directory() -> Path:
    return Path(os.environ.get("ACCESS_EXPORT_DIR", str(ROOT / "artifacts/lesson-exports")))


def descriptive_document(lesson: Lesson) -> LessonDocument | None:
    asset = approved_asset(lesson, "document") if lesson.media else None
    if not asset:
        return None
    try:
        document = LessonDocument.model_validate_json(asset.path.read_bytes())
        return document if document.language == lesson.language and document.title == lesson.title else None
    except (OSError, ValueError):
        return None


def publication_binding(lesson: Lesson) -> str:
    binding = {"lesson": published_lesson(lesson).model_dump(), "assets": {}}
    if lesson.media:
        for edition in ("standard", "described") if lesson.media.described_src else ("standard",):
            for path in source_files(lesson, edition):
                binding["assets"][f"{edition}:{path.name}"] = file_hash(path)
            for language in ("en", "am", "ti"):
                asset = approved_caption(lesson, language, edition)
                if asset:
                    binding["assets"][f"{edition}:{language}:vtt"] = asset.sha256
        for format in ("pdf", "brf", "document"):
            asset = approved_asset(lesson, format)
            if asset:
                binding["assets"][format] = asset.sha256
        if lesson.lesson_id == W3C_ID:
            for name in ("audio.mp3", "audio-described.mp3"):
                path = W3C_DIRECTORY / name
                if path.is_file():
                    binding["assets"][name] = file_hash(path)
    return hashlib.sha256(json.dumps(binding, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _text(lesson: Lesson) -> str:
    parts = [lesson.title, f"{lesson.content_status} · version {lesson.content_version}", lesson.summary]
    document = descriptive_document(lesson)
    if document:
        parts.extend(f"{section.heading}\n{section.text}" + (f"\nImage description: {section.image_description}" if section.image_description else "") for section in document.sections)
    elif lesson.media:
        parts.append("Reviewed descriptions of instructional visuals are not yet available. This transcript is not a validated descriptive document.")
    parts.append("Standard transcript" if lesson.media else "Lesson")
    parts.extend(f"{segment.heading}\n{segment.text}" for segment in lesson.segments)
    if lesson.media and not lesson.segments:
        parts.append("The source transcript is awaiting human review and is not published.")
    if lesson.media and lesson.media.described_segments:
        parts.append("Audio-described edition: spoken-caption transcript. Visual-description text still requires review.")
        parts.extend(f"{segment.heading}\n{segment.text}" for segment in lesson.media.described_segments)
    return "\n\n".join(parts) + "\n"


def _document(lesson: Lesson, files: dict[str, bytes] | None = None) -> bytes:
    escape = html.escape
    content = []
    audio_pack = bool(files and "audio.mp3" in files)
    if files is not None:
        content.append('<h2>Open this pack offline</h2><p>Extract all files into one folder, then open index.html in your browser. Keep the files together. No installation, account or connection is required. If a download is interrupted, reconnect and download the pack again.</p>')
        content.append('<p>' + ('Audio and text pack.' if audio_pack else 'Text-only pack: this lesson has no audio download.') + '</p>')
        for name, label in (("audio.mp3", "Standard lesson audio"), ("audio-described.mp3", "Audio-described lesson audio")):
            if name in files:
                content.append(f'<section><h2>{label}</h2><audio controls preload="none" aria-label="{label}" src="{name}"></audio><p><a href="{name}">Open {label.lower()}</a> ({len(files[name]):,} bytes)</p></section>')
        inventory = ''.join(f'<li><a href="{escape(name, quote=True)}">{escape(name)}</a> ({len(data):,} bytes)</li>' for name, data in files.items())
        content.append(f'<h2>Included files</h2><ul>{inventory}</ul><p>manifest.json records file sizes and SHA-256 hashes. These detect corruption, not independent proof of publisher identity.</p>')
    document = descriptive_document(lesson)
    if document:
        for section in document.sections:
            description = f'<p>Image description: {escape(section.image_description)}</p>' if section.image_description else ''
            content.append(f'<section lang="{escape(document.language, quote=True)}"><h2>{escape(section.heading)}</h2><p>{escape(section.text)}</p>{description}</section>')
    elif lesson.media:
        content.append('<p>Reviewed descriptions of instructional visuals are not yet available. This transcript is not a validated descriptive document.</p>')
    content.append('<h2>Standard transcript</h2>' if lesson.media else '<h2>Lesson</h2>')
    for segment in lesson.segments:
        content.append(f'<section><h3>{escape(segment.heading)}</h3><p>{escape(segment.text)}</p></section>')
    if lesson.media and not lesson.segments:
        content.append('<p>The source transcript is awaiting human review and is not published.</p>')
    if lesson.media and lesson.media.described_segments:
        content.append('<section lang="en"><h2>Audio-described edition: spoken-caption transcript</h2><p>The spoken captions use this edition’s extended timeline. Visual-description text still requires review.</p>')
        for segment in lesson.media.described_segments:
            content.append(f'<section><h3>{escape(segment.heading)}</h3><p>{escape(segment.text)}</p></section>')
        content.append('</section>')
    return (
        f'<!doctype html><html lang="{escape(lesson.language, quote=True)}"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f'<title>{escape(lesson.title)}</title>'
        '<style>body{max-width:65ch;margin:2rem auto;padding:0 1rem;font:1.125rem/1.7 sans-serif;color:#172d38;background:#fff}h1,h2,h3{line-height:1.3}p,a{overflow-wrap:anywhere}audio{width:100%}a{color:#155e63}:focus-visible{outline:3px solid #bd4e19;outline-offset:3px}</style></head><body>'
        f'<main><h1>{escape(lesson.title)}</h1><p>{escape(lesson.content_status)} · {escape(lesson.language)} · version {lesson.content_version}</p><p>{escape(lesson.summary)}</p>'
        + ''.join(content) + '</main></body></html>'
    ).encode()


def export_lesson(source: Lesson, format: str) -> tuple[bytes, str, str]:
    lesson = published_lesson(source)
    text = _text(lesson).encode()
    if format == "txt":
        return text, TYPES[format], format
    if format == "html":
        return _document(lesson), TYPES[format], format
    if format in ("pdf", "brf"):
        asset = approved_asset(source, format)
        if not asset:
            raise KeyError(format)
        return asset.path.read_bytes(), TYPES[format], format
    if format != "zip":
        raise KeyError(format)
    files = {"lesson.txt": text}
    if source.media:
        for edition in ("standard", "described") if source.media.described_src else ("standard",):
            for language in ("en", "am", "ti"):
                asset = approved_caption(source, language, edition)
                if asset:
                    name = f'captions{"-described" if edition == "described" else ""}.{language}.vtt'
                    files[name] = asset.path.read_bytes()
        if source.lesson_id == W3C_ID:
            for name in ("audio.mp3", "audio-described.mp3"):
                path = W3C_DIRECTORY / name
                if path.is_file():
                    files[name] = path.read_bytes()
        for format in ("pdf", "brf"):
            asset = approved_asset(source, format)
            if asset:
                files[f"lesson.{format}"] = asset.path.read_bytes()
    files["index.html"] = _document(lesson, files)
    files["manifest.json"] = json.dumps({
        "schema_version": "1.0", "lesson_id": lesson.lesson_id, "content_version": lesson.content_version,
        "course_version_id": lesson.course_version_id, "language": lesson.language, "content_status": lesson.content_status,
        "pack_type": "audio-and-text" if "audio.mp3" in files else "text-only",
        "files": [{"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()} for name, data in files.items()],
    }, indent=2).encode()
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            info = zipfile.ZipInfo(name, date_time=(2026, 11, 15, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    return output.getvalue(), TYPES["zip"], "zip"


def build_exports(lesson: Lesson) -> dict:
    binding = publication_binding(lesson)
    directory = export_directory() / f"{lesson.lesson_id}-v{lesson.content_version}"
    directory.mkdir(parents=True, exist_ok=True)
    items = []
    for format, label in LABELS.items():
        try:
            data, media_type, suffix = export_lesson(lesson, format)
        except KeyError:
            continue
        digest = hashlib.sha256(data).hexdigest()
        filename = f"{digest}.{suffix}"
        path = directory / filename
        if path.exists() and path.read_bytes() != data:
            raise ValueError("Immutable export collision")
        if not path.exists():
            path.write_bytes(data)
        if format == "zip":
            label += " · audio and text" if lesson.media and lesson.media.audio_src else " · text only"
        items.append({"format": format, "label": label, "bytes": len(data), "sha256": digest, "media_type": media_type,
                      "filename": filename, "href": f"/api/v1/lessons/{lesson.lesson_id}/downloads/{format}?version={lesson.content_version}&revision={digest}"})
    metadata = {"schema_version": "1.0", "lesson_id": lesson.lesson_id, "content_version": lesson.content_version,
                "language": lesson.language, "binding": binding, "items": items}
    temporary = directory / "metadata.tmp"
    temporary.write_text(json.dumps(metadata, sort_keys=True), encoding="utf-8")
    temporary.replace(directory / "metadata.json")
    return metadata


def export_metadata(lesson: Lesson) -> dict:
    directory = export_directory() / f"{lesson.lesson_id}-v{lesson.content_version}"
    try:
        metadata = json.loads((directory / "metadata.json").read_bytes())
        if (metadata["schema_version"], metadata["lesson_id"], metadata["content_version"], metadata["binding"]) != (
            "1.0", lesson.lesson_id, lesson.content_version, publication_binding(lesson)
        ):
            raise ValueError("Exports require republication")
        items = []
        for item in metadata["items"]:
            filename = f'{item["sha256"]}.{item["format"]}'
            if item["filename"] != filename or item["format"] not in LABELS or len(item["sha256"]) != 64 or any(character not in "0123456789abcdef" for character in item["sha256"]):
                raise ValueError("Invalid export metadata")
            path = directory / filename
            if path.is_file() and path.resolve().is_relative_to(directory.resolve()) and path.stat().st_size == item["bytes"]:
                items.append(item)
        return {**metadata, "items": items}
    except (OSError, KeyError, TypeError, ValueError) as error:
        raise ValueError("Published exports unavailable") from error


def main() -> None:
    for lesson_id in (DEMO.lesson_id, EXAMPLE_ID, W3C_ID):
        metadata = build_exports(get_lesson(lesson_id, 1))
        print(f'{lesson_id}: {len(metadata["items"])} prebuilt exports')


if __name__ == "__main__":
    main()
