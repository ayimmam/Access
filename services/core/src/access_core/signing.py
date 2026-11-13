"""Version-bound local signing manifests. Only registered files can be delivered."""
import hashlib
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from access_core.lessons import EXAMPLE_CAPTIONS, EXAMPLE_VIDEO, Lesson

Language = Literal["ethsl", "asl"]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class Asset(StrictModel):
    filename: str = Field(pattern=r"^[a-zA-Z0-9_-]+\.glb$")
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    license: str = Field(min_length=1)


class SigningSegment(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    cue_ids: list[str] = Field(min_length=1)
    start: float = Field(ge=0)
    end: float = Field(gt=0)
    source_text: str
    text_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    status: Literal["awaiting-recording", "machine-draft", "approved", "stale-needs-revalidation"] = "awaiting-recording"
    motion: Asset | None = None
    clip_name: str | None = None
    natural_duration: float | None = Field(default=None, gt=0)
    playback_rate: float = Field(default=1, ge=.5, le=1.15)
    # Private audit references are excluded from public serialization.
    review_ref: str | None = Field(default=None, exclude=True)
    consent_ref: str | None = Field(default=None, exclude=True)

    @model_validator(mode="after")
    def validate_timing_and_approval(self):
        if self.end <= self.start:
            raise ValueError("Segment end must follow start")
        if self.status == "approved":
            if not all([self.motion, self.clip_name, self.natural_duration, self.review_ref, self.consent_ref]):
                raise ValueError("Approved signing requires motion, review and consent references")
            if self.natural_duration / self.playback_rate > self.end - self.start + .001:
                raise ValueError("Signing exceeds source window; revise the approved timeline")
        return self


class SigningManifest(StrictModel):
    schema_version: Literal["1.0"] = "1.0"
    lesson_id: str
    media_id: str
    content_version: int = Field(ge=1)
    course_version_id: str
    language: Language
    video_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    captions_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    rig: Asset | None = None
    segments: list[SigningSegment]

    @model_validator(mode="after")
    def validate_segments(self):
        last_end = 0.0
        ids = set()
        for segment in self.segments:
            if segment.id in ids or segment.start < last_end:
                raise ValueError("Segments must be unique and ordered without overlaps")
            if segment.status == "approved" and not self.rig:
                raise ValueError("Approved motion requires an avatar rig")
            ids.add(segment.id)
            last_end = segment.end
        return self


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def prepare_manifest(lesson: Lesson, language: Language) -> SigningManifest:
    if not lesson.media:
        raise ValueError("Signing requires a source media item")
    return SigningManifest(
        lesson_id=lesson.lesson_id, media_id=lesson.media.id, content_version=lesson.content_version,
        course_version_id=lesson.course_version_id, language=language,
        video_sha256=sha256(EXAMPLE_VIDEO), captions_sha256=sha256(EXAMPLE_CAPTIONS),
        segments=[SigningSegment(id=s.id, cue_ids=[s.id], start=s.start, end=s.end,
                                 source_text=s.text, text_sha256=text_hash(s.text))
                  for s in lesson.segments if s.start is not None and s.end is not None],
    )


def validate_binding(manifest: SigningManifest, lesson: Lesson, directory: Path) -> SigningManifest:
    result = manifest.model_copy(deep=True)
    expected = prepare_manifest(lesson, manifest.language)
    if (manifest.lesson_id, manifest.media_id, manifest.content_version, manifest.course_version_id) != (
        expected.lesson_id, expected.media_id, expected.content_version, expected.course_version_id
    ):
        raise ValueError("Signing manifest identity differs from source lesson")
    source_changed = manifest.video_sha256 != expected.video_sha256 or manifest.captions_sha256 != expected.captions_sha256
    rig_changed = bool(manifest.rig and not valid_asset(directory, manifest.rig))
    source_cues = {segment.id: segment for segment in lesson.segments}
    for segment in result.segments:
        if segment.end > lesson.media.duration:
            raise ValueError("Signing segment exceeds source duration")
        valid_cues = len(set(segment.cue_ids)) == len(segment.cue_ids) and all(cue_id in source_cues for cue_id in segment.cue_ids)
        original_text = " ".join(source_cues[cue_id].text for cue_id in segment.cue_ids) if valid_cues else None
        changed = source_changed or rig_changed or segment.source_text != original_text or text_hash(segment.source_text) != segment.text_sha256
        changed = changed or bool(segment.motion and not valid_asset(directory, segment.motion))
        if changed and segment.status == "approved":
            segment.status = "stale-needs-revalidation"
    return result


def valid_asset(directory: Path, asset: Asset) -> bool:
    path = directory / asset.filename
    return path.is_file() and path.stat().st_size <= 25 * 1024 * 1024 and path.resolve().is_relative_to(directory.resolve()) and sha256(path) == asset.sha256


def load_manifest(lesson: Lesson, language: Language, directory: Path) -> SigningManifest:
    # The lesson is already resolved through the public fixture allowlist.
    filename = f"{lesson.lesson_id}-v{lesson.content_version}-{language}.json"
    path = directory / filename
    if not path.exists():
        return prepare_manifest(lesson, language)
    if not path.resolve().is_relative_to(directory.resolve()) or path.stat().st_size > 2 * 1024 * 1024:
        raise ValueError("Signing manifest exceeds size limit")
    manifest = SigningManifest.model_validate_json(path.read_bytes())
    if manifest.language != language:
        raise ValueError("Signing manifest language differs from requested language")
    return validate_binding(manifest, lesson, directory)


def public_manifest(manifest: SigningManifest) -> dict:
    data = manifest.model_dump()
    prefix = f"/api/v1/lessons/{manifest.lesson_id}/signing-assets/"
    def public_asset(asset: Asset) -> dict:
        return {"url": f"{prefix}{asset.filename}?lang={manifest.language}&version={manifest.content_version}", "sha256": asset.sha256, "license": asset.license}
    data["rig"] = public_asset(manifest.rig) if manifest.rig else None
    for stored, item in zip(manifest.segments, data["segments"]):
        item["motion"] = public_asset(stored.motion) if stored.motion and stored.status == "approved" else None
    data["approved_count"] = sum(s.status == "approved" for s in manifest.segments)
    return data
