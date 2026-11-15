"""Public fixture repository and portable exports of the same lesson revision."""

import html
import re
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


class CaptionTrack(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    language: Literal["en", "am", "ti"]
    label: str
    src: str | None
    status: Literal["source-draft", "source-reviewed", "machine-translated-review-pending", "human-reviewed", "review-pending"]


class Media(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    id: str
    src: str
    captions: str | None
    duration: float
    caption_status: Literal["source-draft", "source-reviewed", "human-reviewed", "review-pending"] = "source-draft"
    avatar_mode: Literal["timing-prototype"] = "timing-prototype"
    sign_language: Literal["Ethiopian Sign Language"] = "Ethiopian Sign Language"
    caption_tracks: tuple[CaptionTrack, ...] = ()
    described_src: str | None = None
    described_captions: str | None = None
    described_caption_status: Literal["review-pending", "source-reviewed", "human-reviewed"] = "review-pending"
    described_duration: float | None = None
    described_segments: tuple[Segment, ...] = ()
    offline_video_src: str | None = None
    offline_described_src: str | None = None
    audio_src: str | None = None
    described_audio_src: str | None = None
    sign_src: str | None = None
    sign_status: Literal["unavailable", "review-pending", "reviewed"] = "unavailable"
    download_bytes: dict[str, int] = Field(default_factory=dict)


class Lesson(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    schema_version: Literal["1.0"] = "1.0"
    lesson_id: str
    content_version: int = Field(ge=1)
    course_version_id: str
    title: str
    language: str
    access: Literal["public"] = "public"
    content_status: Literal["synthetic-demo", "source-draft", "review-pending"] = "synthetic-demo"
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
W3C_ID = "w3c-colors-with-good-contrast"
W3C_DIRECTORY = EXAMPLE_DIRECTORY / "w3c-contrast"
W3C_VIDEO = W3C_DIRECTORY / "standard.mp4"
W3C_DESCRIBED_VIDEO = W3C_DIRECTORY / "described.mp4"
W3C_CAPTIONS = W3C_DIRECTORY / "captions.en.vtt"
W3C_DURATION = 63.755556
W3C_DESCRIBED_DURATION = 98.469388
W3C_PDF = W3C_DIRECTORY / "accessibility-prototype.pdf"


def parse_vtt(text: str, duration: float) -> tuple[Segment, ...]:
    """Parse the allowlisted caption fixture into transcript segments."""
    clock = re.compile(r"(?P<h>\d{2}):(?P<m>\d{2}):(?P<s>\d{2}\.\d{3})")
    timing = re.compile(r"^(?P<start>\d{2}:\d{2}:\d{2}\.\d{3}) --> (?P<end>\d{2}:\d{2}:\d{2}\.\d{3})$")

    def seconds(value: str) -> float:
        match = clock.fullmatch(value)
        if not match:
            raise ValueError("Invalid WebVTT timestamp")
        return int(match["h"]) * 3600 + int(match["m"]) * 60 + float(match["s"])

    result: list[Segment] = []
    blocks = re.split(r"\r?\n\r?\n", text.strip())
    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines or lines[0] == "WEBVTT" or lines[0].startswith("NOTE"):
            continue
        match = timing.fullmatch(lines[0])
        if not match and len(lines) > 1:
            match = timing.fullmatch(lines[1])
            lines = lines[1:]
        if not match or len(lines) < 2:
            raise ValueError("Invalid WebVTT cue")
        start, end = seconds(match["start"]), seconds(match["end"])
        if start >= end or end > duration or (result and start < (result[-1].end or 0)):
            raise ValueError("WebVTT cues must be ordered within the media duration")
        result.append(Segment(id=f"cue-{len(result) + 1}", heading=f"{int(start) // 60}:{int(start) % 60:02d}", text=" ".join(lines[1:]), start=start, end=end))
    if not result:
        raise ValueError("WebVTT contains no cues")
    return tuple(result)


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


def w3c_lesson() -> Lesson:
    tracks = (
        CaptionTrack(language="en", label="English · W3C source", src=f"/api/v1/lessons/{W3C_ID}/media/captions?version=1", status="source-reviewed"),
        CaptionTrack(language="am", label="Amharic · review pending", src=f"/api/v1/lessons/{W3C_ID}/media/captions-am?version=1", status="machine-translated-review-pending"),
        CaptionTrack(language="ti", label="Tigrigna · review pending", src=f"/api/v1/lessons/{W3C_ID}/media/captions-ti?version=1", status="machine-translated-review-pending"),
    )
    return Lesson(
        lesson_id=W3C_ID, content_version=1, course_version_id="w3c-contrast-demo-v1",
        title="Colors with Good Contrast", language="en", content_status="review-pending",
        summary="A W3C WAI learning video used with attribution. English source captions are available; Hasab AI Amharic and Tigrigna translations await human review.",
        segments=parse_vtt(W3C_CAPTIONS.read_text(encoding="utf-8"), W3C_DURATION),
        unavailable=("Reviewed Ethiopian Sign Language interpretation", "Human-reviewed Amharic captions", "Human-reviewed Tigrigna captions", "Human-verified tagged PDF", "Human-verified Braille"),
        media=Media(
            id="w3c-contrast-v1", src=f"/api/v1/lessons/{W3C_ID}/media/video?version=1",
            captions=tracks[0].src, duration=W3C_DURATION, caption_status="source-reviewed",
            caption_tracks=tracks,
            described_src=f"/api/v1/lessons/{W3C_ID}/media/described-video?version=1",
            described_captions=f"/api/v1/lessons/{W3C_ID}/media/described-captions?version=1",
            audio_src=f"/api/v1/lessons/{W3C_ID}/media/audio?version=1",
            described_audio_src=f"/api/v1/lessons/{W3C_ID}/media/described-audio?version=1",
            described_duration=W3C_DESCRIBED_DURATION,
        ),
    )


def get_lesson(lesson_id: str, version: int) -> Lesson:
    # This allowlisted public repository never resolves arbitrary filesystem paths.
    if version == 1:
        if lesson_id == DEMO.lesson_id:
            return DEMO
        if lesson_id == EXAMPLE_ID and EXAMPLE_VIDEO.is_file() and EXAMPLE_CAPTIONS.is_file():
            return example_lesson()
        if lesson_id == W3C_ID and all(path.is_file() for path in (W3C_VIDEO, W3C_DESCRIBED_VIDEO, W3C_CAPTIONS)):
            return w3c_lesson()
    raise KeyError(lesson_id)


def captions_vtt(lesson: Lesson) -> str:
    def clock(seconds: float) -> str:
        total = int(seconds * 1000)
        return f"{total // 3600000:02d}:{total // 60000 % 60:02d}:{total // 1000 % 60:02d}.{total % 1000:03d}"
    cues = ["WEBVTT", "NOTE Source-draft captions. Human timing and wording review pending."]
    for segment in lesson.segments:
        if segment.start is not None and segment.end is not None:
            cues.append(f"{segment.id}\n{clock(segment.start)} --> {clock(segment.end)}\n{html.escape(segment.text, quote=False)}")
    return "\n\n".join(cues) + "\n"


def braille_ready_file(lesson: Lesson) -> bytes:
    """Return an explicitly unverified 40-cell English Braille-ready prototype."""
    # BRF uses the North American ASCII Braille encoding. This is deliberately
    # uncontracted and limited to the English source until a transcriber reviews it.
    letters = {character: character.upper() for character in "abcdefghijklmnopqrstuvwxyz"}
    punctuation = {" ": " ", ",": "1", ";": "2", ":": "3", ".": "4", "?": "8", "!": "6", "-": "-", "'": "'"}

    def encode(value: str) -> str:
        words: list[str] = []
        for source_word in value.split():
            alpha = [character for character in source_word if character.isalpha()]
            encoded = ",," if len(alpha) > 1 and all(character.isupper() for character in alpha) else ""
            for character in source_word:
                if character.isupper() and not encoded.startswith(",,"):
                    encoded += ","
                encoded += letters.get(character.lower(), punctuation.get(character, " "))
            words.append(encoded)
        lines: list[str] = []
        current = ""
        for word in words:
            if current and len(current) + 1 + len(word) > 40:
                lines.append(current)
                current = word
            else:
                current = f"{current} {word}".strip()
        if current:
            lines.append(current)
        return "\r\n".join(lines)

    source = "\n\n".join([lesson.title, "UNCONTRACTED ENGLISH BRF PROTOTYPE - TRANSCRIBER REVIEW PENDING", *[segment.text for segment in lesson.segments]])
    return encode(source).encode("ascii") + b"\r\n"


def export_lesson(lesson: Lesson, format: str) -> tuple[bytes, str, str]:
    from access_core.exports import export_lesson as portable_export

    return portable_export(lesson, format)
