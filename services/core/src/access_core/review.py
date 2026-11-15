"""Local publication approvals bind public fixtures to exact reviewed bytes."""

import hashlib
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from access_core.lessons import (
    EXAMPLE_CAPTIONS, EXAMPLE_ID, EXAMPLE_VIDEO, W3C_CAPTIONS,
    W3C_DESCRIBED_DURATION, W3C_DIRECTORY, W3C_ID, CaptionTrack, Lesson, parse_vtt,
)

Edition = Literal["standard", "described"]
Language = Literal["en", "am", "ti"]
ROOT = Path(__file__).resolve().parents[4]
SOURCE_APPROVALS = {
    "standard": ("bf32ab590d8d21d60021a64744abb1279ba2e3a160ed975292c8e8cae34f9126",
                 "7a4264289b663b8b2ae93abc3a6d8b883c7444927cc8877f5a9f89f5c1b6e345"),
    "described": ("a2094c816140360d9fe6267e5899a958e69fdf90a55ceeeb6ba4905cd2bfe792",
                  "b96a057d6278f698284782c6700cc667428dd5c0fe62ae63719323e0c124a299"),
}


@lru_cache(maxsize=128)
def _hash_file(path: Path, fingerprint: tuple[int, ...]) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def file_hash(path: Path) -> str:
    stat = path.stat()
    return _hash_file(path.resolve(), (stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns, stat.st_ctime_ns))


def review_directory() -> Path:
    return Path(os.environ.get("ACCESS_REVIEW_DIR", str(ROOT / "artifacts/reviews")))


def approval_record(lesson: Lesson, format: str, language: Language, edition: Edition) -> Path:
    return review_directory() / f"{lesson.lesson_id}-v{lesson.content_version}-{edition}-{language}-{format}.json"


def source_files(lesson: Lesson, edition: Edition = "standard") -> tuple[Path, Path]:
    if lesson.lesson_id == W3C_ID:
        return (W3C_DIRECTORY / ("described.mp4" if edition == "described" else "standard.mp4"),
                W3C_DIRECTORY / "captions-described.en.vtt" if edition == "described" else W3C_CAPTIONS)
    if lesson.lesson_id == EXAMPLE_ID and edition == "standard":
        return EXAMPLE_VIDEO, EXAMPLE_CAPTIONS
    raise ValueError("No allowlisted source for this edition")


class Approval(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)
    schema_version: Literal["1.0"] = "1.0"
    lesson_id: str
    content_version: int = Field(ge=1)
    course_version_id: str
    edition: Edition = "standard"
    language: Language = "en"
    format: Literal["vtt", "pdf", "brf", "document"]
    filename: str = Field(pattern=r"^[a-zA-Z0-9_-]+\.(?:vtt|pdf|brf|json)$")
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    video_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    source_captions_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    status: Literal["review-pending", "human-reviewed"]
    review_ref: str = Field(min_length=1, exclude=True)
    publication_ref: str = Field(min_length=1, exclude=True)


@dataclass(frozen=True)
class ReviewedAsset:
    path: Path
    sha256: str
    status: str


def approved_asset(lesson: Lesson, format: str, language: Language = "en", edition: Edition = "standard") -> ReviewedAsset | None:
    directory = review_directory()
    record = approval_record(lesson, format, language, edition)
    try:
        if not record.is_file() or not record.resolve().is_relative_to(directory.resolve()) or record.stat().st_size > 64 * 1024:
            return None
        approval = Approval.model_validate_json(record.read_bytes())
        if (approval.lesson_id, approval.content_version, approval.course_version_id, approval.edition,
            approval.language, approval.format, approval.status) != (
            lesson.lesson_id, lesson.content_version, lesson.course_version_id, edition, language, format, "human-reviewed"
        ):
            return None
        video, captions = source_files(lesson, edition)
        path = directory / approval.filename
        extension = "json" if format == "document" else format
        if path.suffix != f".{extension}" or not path.is_file() or not path.resolve().is_relative_to(directory.resolve()) or path.stat().st_size > 10 * 1024 * 1024:
            return None
        if (file_hash(video), file_hash(captions), file_hash(path)) != (
            approval.video_sha256, approval.source_captions_sha256, approval.sha256
        ):
            return None
        return ReviewedAsset(path, approval.sha256, approval.status)
    except (OSError, ValueError):
        return None


def approved_caption(lesson: Lesson, language: Language = "en", edition: Edition = "standard") -> ReviewedAsset | None:
    if not lesson.media:
        return None
    asset = approved_asset(lesson, "vtt", language, edition)
    try:
        record = approval_record(lesson, "vtt", language, edition)
        if asset is None and not record.exists() and not record.is_symlink() and lesson.lesson_id == W3C_ID and language == "en":
            video, captions = source_files(lesson, edition)
            if (file_hash(video), file_hash(captions)) == SOURCE_APPROVALS[edition]:
                asset = ReviewedAsset(captions, file_hash(captions), "source-reviewed")
        if asset:
            duration = lesson.media.duration if edition == "standard" else lesson.media.described_duration
            if duration is None:
                return None
            parse_vtt(asset.path.read_text(encoding="utf-8"), duration)
        return asset
    except (OSError, ValueError):
        return None


def published_lesson(lesson: Lesson) -> Lesson:
    if not lesson.media:
        return lesson
    media = lesson.media
    tracks = []
    prefix = f"/api/v1/lessons/{lesson.lesson_id}/media/"
    candidates = media.caption_tracks or (CaptionTrack(language="en", label="English · review pending", src=None, status="source-draft"),)
    for candidate in candidates:
        asset = approved_caption(lesson, candidate.language)
        kind = "captions" if candidate.language == "en" else f"captions-{candidate.language}"
        tracks.append(candidate.model_copy(update={
            "src": f"{prefix}{kind}?version={lesson.content_version}" if asset else None,
            "status": asset.status if asset else "review-pending",
            "label": {"en": "English", "am": "Amharic", "ti": "Tigrigna"}[candidate.language] + (" · reviewed" if asset else " · awaiting human review"),
        }))
    standard = approved_caption(lesson)
    described = approved_caption(lesson, edition="described") if media.described_src else None
    segments = parse_vtt(standard.path.read_text(encoding="utf-8"), media.duration) if standard else ()
    described_segments = parse_vtt(described.path.read_text(encoding="utf-8"), media.described_duration or W3C_DESCRIBED_DURATION) if described else ()
    sizes = {}
    for field, filename in (("src", "standard.mp4"), ("described_src", "described.mp4"),
                            ("audio_src", "audio.mp3"), ("described_audio_src", "audio-described.mp3")):
        path = W3C_DIRECTORY / filename if lesson.lesson_id == W3C_ID else EXAMPLE_VIDEO
        if getattr(media, field) and path.is_file():
            sizes[field] = path.stat().st_size
    return lesson.model_copy(update={
        "segments": segments,
        "media": media.model_copy(update={
            "caption_tracks": tuple(tracks), "captions": tracks[0].src,
            "caption_status": standard.status if standard else "review-pending",
            "described_captions": f"{prefix}described-captions?version={lesson.content_version}" if described else None,
            "described_caption_status": described.status if described else "review-pending",
            "described_segments": described_segments, "download_bytes": sizes,
        }),
    })
