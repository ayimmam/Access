"""Public fixture repository and portable exports of the same lesson revision."""

import hashlib
import html
import io
import json
import re
import zipfile
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Segment(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    id: str
    heading: str
    text: str
    start: float | None = None
    end: float | None = None


class Media(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    id: str
    src: str
    captions: str
    duration: float
    caption_status: Literal["source-draft"] = "source-draft"
    avatar_mode: Literal["timing-prototype"] = "timing-prototype"
    sign_language: Literal["Ethiopian Sign Language"] = "Ethiopian Sign Language"


class Lesson(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    schema_version: Literal["1.0"] = "1.0"
    lesson_id: str
    content_version: int = Field(ge=1)
    course_version_id: str
    title: str
    language: str
    access: Literal["public"] = "public"
    content_status: Literal["synthetic-demo", "source-draft"] = "synthetic-demo"
    summary: str
    segments: tuple[Segment, ...]
    unavailable: tuple[str, ...]
    media: Media | None = None


DEMO = Lesson(
    lesson_id="demo-learning-plan",
    content_version=1,
    course_version_id="demo-course-v1",
    title="Make a learning plan",
    language="en",
    summary="A synthetic text lesson for testing independent access and downloads.",
    segments=(
        Segment(id="goal", heading="Choose one goal", text="Choose a skill you want to practise. Write one small goal you can complete this week."),
        Segment(id="time", heading="Choose a time", text="Choose a time and place that work for you. Start with a short session and take breaks when you need them."),
        Segment(id="review", heading="Review your progress", text="After practising, write what you learned and what you want to try next. Ask for help when you need it."),
    ),
    unavailable=("Lesson video", "English and Amharic captions", "Amharic translation", "Sign interpretation", "Audio description", "Tagged PDF", "Braille", "Audio download"),
)


EXAMPLE_DIRECTORY = Path(__file__).resolve().parents[4] / "example lessons"
EXAMPLE_VIDEO = EXAMPLE_DIRECTORY / "We Are Transforming Africa - ALX Africa (720p, h264).mp4"
EXAMPLE_CAPTIONS = EXAMPLE_DIRECTORY / "into-caption.txt"
EXAMPLE_ID = "alx-transforming-africa"
EXAMPLE_DURATION = 121.496916


def parse_caption_source(text: str, duration: float) -> tuple[Segment, ...]:
    """Parse the supplied timestamp/text export without rewriting its wording."""
    entries: list[tuple[float, str]] = []
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not re.fullmatch(r"\d+:\d{2}", line):
            index += 1
            continue
        minutes, seconds = map(int, line.split(":"))
        start = float(minutes * 60 + seconds)
        if seconds >= 60 or start >= duration or (entries and start <= entries[-1][0]):
            raise ValueError("Caption timestamps must increase within the video duration")
        index += 1
        # The export repeats each clock time in human-readable form on the next line.
        if index < len(lines) and re.fullmatch(r"\d+ (?:minute.*|seconds?)", lines[index].strip()):
            index += 1
        words = []
        while index < len(lines) and not re.fullmatch(r"\d+:\d{2}", lines[index].strip()):
            if lines[index].strip():
                words.append(lines[index].strip())
            index += 1
        if not words:
            raise ValueError("Caption segment has no source text")
        entries.append((start, " ".join(words)))
    if not entries:
        raise ValueError("Caption source has no timestamped segments")
    return tuple(
        Segment(id=f"cue-{i + 1}", heading=f"{int(start) // 60}:{int(start) % 60:02d}", text=words,
                start=start, end=entries[i + 1][0] if i + 1 < len(entries) else duration)
        for i, (start, words) in enumerate(entries)
    )


def example_lesson() -> Lesson:
    return Lesson(
        lesson_id=EXAMPLE_ID, content_version=1, course_version_id="alx-demo-v1",
        title="We Are Transforming Africa", language="en", content_status="source-draft",
        summary="Explore the ALX community, learning opportunities and experiences shared by its members.",
        segments=parse_caption_source(EXAMPLE_CAPTIONS.read_text(encoding="utf-8"), EXAMPLE_DURATION),
        unavailable=("Reviewed Ethiopian Sign Language interpretation", "Reviewed Amharic captions", "Audio description", "Tagged PDF", "Braille"),
        media=Media(id="alx-africa-intro-v1", src=f"/api/v1/lessons/{EXAMPLE_ID}/media/video?version=1",
                    captions=f"/api/v1/lessons/{EXAMPLE_ID}/media/captions?version=1", duration=EXAMPLE_DURATION),
    )


def get_lesson(lesson_id: str, version: int) -> Lesson:
    # This allowlisted public repository never resolves arbitrary filesystem paths.
    if version == 1:
        if lesson_id == DEMO.lesson_id:
            return DEMO
        if lesson_id == EXAMPLE_ID and EXAMPLE_VIDEO.is_file() and EXAMPLE_CAPTIONS.is_file():
            return example_lesson()
    raise KeyError(lesson_id)


def captions_vtt(lesson: Lesson) -> str:
    def clock(seconds: float) -> str:
        total = round(seconds * 1000)
        return f"{total // 3600000:02d}:{total // 60000 % 60:02d}:{total // 1000 % 60:02d}.{total % 1000:03d}"
    cues = ["WEBVTT", "NOTE Source-draft captions. Human timing and wording review pending."]
    for segment in lesson.segments:
        if segment.start is not None and segment.end is not None:
            cues.append(f"{segment.id}\n{clock(segment.start)} --> {clock(segment.end)}\n{html.escape(segment.text)}")
    return "\n\n".join(cues) + "\n"


def export_lesson(lesson: Lesson, format: str) -> tuple[bytes, str, str]:
    text = "\n\n".join([
        lesson.title, lesson.content_status + " · version " + str(lesson.content_version),
        *[f"{s.heading}\n{s.text}" for s in lesson.segments],
    ]) + "\n"
    sections = "".join(
        f'<section id="{html.escape(s.id, quote=True)}"><h2>{html.escape(s.heading)}</h2><p>{html.escape(s.text)}</p></section>'
        for s in lesson.segments
    )
    document = (
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f'<title>{html.escape(lesson.title)}</title>'
        '<style>body{max-width:65ch;margin:2rem auto;padding:0 1rem;font:1.125rem/1.7 sans-serif;color:#172d38;background:#fff}h1,h2{line-height:1.3}p{overflow-wrap:anywhere}</style>'
        f'<main><h1>{html.escape(lesson.title)}</h1><p>{html.escape(lesson.content_status)} · version {lesson.content_version}</p>{sections}</main></html>'
    ).encode()
    if format == "txt":
        return text.encode(), "text/plain; charset=utf-8", "txt"
    if format == "html":
        return document, "text/html; charset=utf-8", "html"
    if format != "zip":
        raise KeyError(format)
    files = {"index.html": document, "lesson.txt": text.encode()}
    if lesson.media:
        files["captions.en.vtt"] = captions_vtt(lesson).encode()
    manifest = {
        "schema_version": "1.0", "lesson_id": lesson.lesson_id,
        "content_version": lesson.content_version, "course_version_id": lesson.course_version_id,
        "content_status": lesson.content_status,
        "files": [{"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()} for name, data in files.items()],
    }
    files["manifest.json"] = json.dumps(manifest, indent=2).encode()
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            info = zipfile.ZipInfo(name, date_time=(2026, 11, 13, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    return output.getvalue(), "application/zip", "zip"
