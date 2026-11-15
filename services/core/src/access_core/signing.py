"""Version-bound local signing manifests. Only registered files can be delivered."""
import hashlib
import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from access_core.lessons import Lesson, parse_vtt
from access_core.review import approved_caption, file_hash, source_files

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


class InterpreterVideo(Asset):
    filename: str = Field(pattern=r"^[a-zA-Z0-9_-]+\.mp4$")


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
    presentation: Literal['pending', 'hands-only', 'interpreter-video'] = 'pending'
    interpreter_video: InterpreterVideo | None = None
    requires_non_manual: bool = False
    hands_ambiguous: bool = False
    approved_render_sha256: str | None = Field(default=None, pattern=r'^[0-9a-f]{64}$')
    reference_recording_id: str | None = Field(default=None, min_length=1, exclude=True)
    deaf_review_ref: str | None = Field(default=None, min_length=1, exclude=True)
    interpreter_review_ref: str | None = Field(default=None, min_length=1, exclude=True)
    # Private audit references are excluded from public serialization.
    review_ref: str | None = Field(default=None, exclude=True)
    consent_ref: str | None = Field(default=None, exclude=True)

    @model_validator(mode="after")
    def validate_timing_and_approval(self):
        if self.end <= self.start:
            raise ValueError("Segment end must follow start")
        if self.status == "approved":
            if not all([self.natural_duration, self.review_ref, self.consent_ref, self.reference_recording_id,
                        self.deaf_review_ref, self.interpreter_review_ref, self.approved_render_sha256]):
                raise ValueError('Approved signing requires exact-render, Deaf/interpreter review and consent references')
            if self.presentation == 'hands-only':
                if not self.motion or not self.clip_name or self.requires_non_manual or self.hands_ambiguous or self.interpreter_video:
                    raise ValueError('Ambiguous or non-manual meaning requires reviewed interpreter video')
            elif self.presentation != 'interpreter-video' or not self.interpreter_video or self.motion:
                raise ValueError('Approved signing requires a single reviewed presentation')
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
    rig_version: str | None = None
    render_profile: Literal['hands-front-v1'] = 'hands-front-v1'
    segments: list[SigningSegment]

    @model_validator(mode="after")
    def validate_segments(self):
        last_end = 0.0
        ids = set()
        covered_cues = set()
        for segment in self.segments:
            if segment.id in ids or segment.start < last_end:
                raise ValueError("Segments must be unique and ordered without overlaps")
            if covered_cues.intersection(segment.cue_ids) or len(set(segment.cue_ids)) != len(segment.cue_ids):
                raise ValueError('Source cues must belong to one phrase only')
            if segment.status == 'approved' and self.language != 'ethsl':
                raise ValueError('This hands-only publication profile is EthSL only')
            if segment.status == 'approved' and segment.presentation == 'hands-only' and (
                not self.rig or self.rig_version != 'access-hands-v1'
            ):
                raise ValueError('Approved motion requires the reviewed hands rig version')
            ids.add(segment.id)
            covered_cues.update(segment.cue_ids)
            last_end = segment.end
        return self


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def render_revision(manifest: SigningManifest, segment: SigningSegment) -> str:
    binding = {
        'lesson': [manifest.lesson_id, manifest.media_id, manifest.content_version, manifest.course_version_id],
        'source': [manifest.video_sha256, manifest.captions_sha256, segment.text_sha256],
        'phrase': [segment.id, segment.cue_ids, segment.start, segment.end, segment.playback_rate, segment.natural_duration],
        'presentation': [manifest.language, manifest.render_profile, segment.presentation,
                         segment.requires_non_manual, segment.hands_ambiguous],
        'rig': [manifest.rig_version, manifest.rig.sha256 if manifest.rig else None],
        'motion': [segment.clip_name, segment.motion.sha256 if segment.motion else None],
        'video': segment.interpreter_video.sha256 if segment.interpreter_video else None,
        'recording': segment.reference_recording_id,
    }
    return text_hash(json.dumps(binding, sort_keys=True, separators=(',', ':')))


def prepare_manifest(lesson: Lesson, language: Language) -> SigningManifest:
    if not lesson.media:
        raise ValueError("Signing requires a source media item")
    video, captions = source_files(lesson)
    reviewed = approved_caption(lesson)
    source_segments = parse_vtt(reviewed.path.read_text(encoding="utf-8"), lesson.media.duration) if reviewed else lesson.segments
    if reviewed:
        captions = reviewed.path
    return SigningManifest(
        lesson_id=lesson.lesson_id, media_id=lesson.media.id, content_version=lesson.content_version,
        course_version_id=lesson.course_version_id, language=language,
        video_sha256=file_hash(video), captions_sha256=file_hash(captions),
        segments=[SigningSegment(id=s.id, cue_ids=[s.id], start=s.start, end=s.end,
                                 source_text=s.text, text_sha256=text_hash(s.text))
                  for s in source_segments if s.start is not None and s.end is not None],
    )


def validate_binding(manifest: SigningManifest, lesson: Lesson, directory: Path) -> SigningManifest:
    result = manifest.model_copy(deep=True)
    expected = prepare_manifest(lesson, manifest.language)
    if (manifest.lesson_id, manifest.media_id, manifest.content_version, manifest.course_version_id) != (
        expected.lesson_id, expected.media_id, expected.content_version, expected.course_version_id
    ):
        raise ValueError("Signing manifest identity differs from source lesson")
    source_changed = approved_caption(lesson) is None or manifest.video_sha256 != expected.video_sha256 or manifest.captions_sha256 != expected.captions_sha256
    rig_changed = bool(manifest.rig and not valid_asset(directory, manifest.rig))
    source_cues = {segment.id: segment for segment in expected.segments}
    cue_order = list(source_cues)
    for segment in result.segments:
        if segment.end > lesson.media.duration:
            raise ValueError("Signing segment exceeds source duration")
        valid_cues = len(set(segment.cue_ids)) == len(segment.cue_ids) and all(cue_id in source_cues for cue_id in segment.cue_ids)
        if valid_cues:
            first = cue_order.index(segment.cue_ids[0])
            valid_cues = cue_order[first:first + len(segment.cue_ids)] == segment.cue_ids
        if not valid_cues:
            raise ValueError('Phrase must reference ordered adjacent source cues')
        original_text = " ".join(source_cues[cue_id].source_text for cue_id in segment.cue_ids) if valid_cues else None
        changed = source_changed or rig_changed or segment.source_text != original_text or text_hash(segment.source_text) != segment.text_sha256
        changed = changed or bool(segment.motion and not valid_asset(directory, segment.motion))
        changed = changed or bool(segment.interpreter_video and not valid_asset(directory, segment.interpreter_video))
        changed = changed or segment.approved_render_sha256 != render_revision(manifest, segment)
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


def whole_lesson_video(manifest: SigningManifest, lesson: Lesson) -> InterpreterVideo | None:
    if not lesson.media or manifest.language != "ethsl":
        return None
    cue_ids = [segment.id for segment in prepare_manifest(lesson, "ethsl").segments]
    for segment in manifest.segments:
        if (segment.status == "approved" and segment.presentation == "interpreter-video" and
            segment.cue_ids == cue_ids and segment.start == 0 and segment.end == lesson.media.duration):
            return segment.interpreter_video
    return None


def public_manifest(manifest: SigningManifest) -> dict:
    data = manifest.model_dump()
    prefix = f"/api/v1/lessons/{manifest.lesson_id}/signing-assets/"
    def public_asset(asset: Asset) -> dict:
        return {"url": f"{prefix}{asset.filename}?lang={manifest.language}&version={manifest.content_version}", "sha256": asset.sha256, "license": asset.license}
    hands_approved = any(segment.status == 'approved' and segment.presentation == 'hands-only' for segment in manifest.segments)
    data["rig"] = public_asset(manifest.rig) if manifest.rig and hands_approved else None
    for stored, item in zip(manifest.segments, data["segments"]):
        item["motion"] = public_asset(stored.motion) if stored.motion and stored.status == "approved" else None
        item['interpreter_video'] = public_asset(stored.interpreter_video) if stored.interpreter_video and stored.status == 'approved' else None
    data["approved_count"] = sum(s.status == "approved" for s in manifest.segments)
    return data
