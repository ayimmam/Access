"""Bounded public-demo speech contracts; no free-form synthesis endpoint."""

import base64
import binascii
import struct
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from access_core.career_amharic import HELP, PRIVACY, SPEECH_HELP, UI, localized_jobs
from access_core.jobs import JOBS

MAX_AUDIO_BYTES = 480044
MAX_BODY_BYTES = 641024
MAX_RESPONSE_BYTES = 2 * 1024 * 1024
WELCOME_PROMPT = "Welcome to the Access Career Gateway. Voice navigation is ready."
ROLE_PROMPT = "What role would you like? Say or type a role, or “all jobs” to clear filters and explore every fictional listing."
RESULT_HELP = "Use Next, Previous, Repeat, Details with a result number, Save with result numbers, Shortlist, or Stop. Press Listen for a command or use the typed controls."
EMPTY_RESULTS = "0 jobs found. No results. Try Search followed by another role, or Search all jobs."
LESSON_GUIDE = "Say or type Play video, Pause video, English captions, Amharic captions, Captions off, Open transcript, Offline formats, Open Career Gateway, or Stop."
AMHARIC_JOBS = localized_jobs(JOBS)


def catalog(enabled: bool):
    return {"language": "am", "ui": UI, "jobs": AMHARIC_JOBS, "privacy": PRIVACY,
            "help": HELP, "speech_help": SPEECH_HELP, "speech_enabled": enabled}


class ConsentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    consent: Literal[True]

    @field_validator("consent", mode="before")
    @classmethod
    def explicit_consent(cls, value):
        if value is not True:
            raise ValueError("Explicit consent is required")
        return value


class SpeechPrompt(ConsentRequest):
    kind: Literal["welcome", "role", "results", "details", "saved", "shortlist", "changed", "lesson-guide"]
    job_ids: list[str] = Field(default_factory=list, max_length=5)
    total: int = Field(default=0, ge=0, le=len(JOBS))
    start: int = Field(default=1, ge=1, le=len(JOBS))

    @model_validator(mode="after")
    def valid_prompt(self):
        if len(set(self.job_ids)) != len(self.job_ids) or any(identifier not in AMHARIC_JOBS for identifier in self.job_ids):
            raise ValueError("Unknown or duplicate fictional job")
        if self.kind in {"welcome", "role", "changed", "lesson-guide"} and self.job_ids:
            raise ValueError("This prompt has no jobs")
        if self.kind in {"welcome", "role", "saved", "details", "lesson-guide"} and self.total != 0:
            raise ValueError("This prompt has no total")
        if self.kind not in {"results", "shortlist"} and self.start != 1:
            raise ValueError("This prompt has no position")
        if self.kind == "details" and len(self.job_ids) != 1:
            raise ValueError("Choose one job")
        if self.kind == "saved" and not self.job_ids:
            raise ValueError("Choose saved jobs")
        if self.kind == "results":
            expected = min(5, max(0, self.total - self.start + 1))
            if (self.start - 1) % 5 or len(self.job_ids) != expected or (self.total == 0 and self.start != 1) or (self.total and not expected):
                raise ValueError("Invalid result page")
        if self.kind == "shortlist" and (len(self.job_ids) != min(1, self.total) or self.start > max(1, self.total)):
            raise ValueError("Invalid shortlist position")
        return self


def text(key: str, **values) -> str:
    return UI[key].format(**values)


def prompt_messages(prompt: SpeechPrompt) -> list[str]:
    if prompt.kind == "lesson-guide":
        return [text(LESSON_GUIDE)]
    jobs = [AMHARIC_JOBS[identifier] for identifier in prompt.job_ids]
    if prompt.kind == "welcome":
        return [text(WELCOME_PROMPT), text(ROLE_PROMPT)]
    if prompt.kind == "role":
        return [text(ROLE_PROMPT)]
    if prompt.kind == "changed":
        return [text("{count} jobs found. Search or filters changed. Result numbers have been refreshed; use Repeat before a numbered command.", count=prompt.total)]
    if prompt.kind == "results":
        count = text("{count} jobs found. Results {first} to {last}.", count=prompt.total, first=prompt.start, last=prompt.start + len(jobs) - 1) if jobs else text(EMPTY_RESULTS)
        results = [text("Result {number}. {title}, at {organization}. {summary}", number=prompt.start + index, **job) for index, job in enumerate(jobs)]
        return [count, *results, text(RESULT_HELP)]
    if prompt.kind == "saved":
        return [text("Saved for this session: {titles}. Use Shortlist to review saved jobs.", titles="፤ ".join(job["title"] for job in jobs))]
    if prompt.kind == "details":
        job = jobs[0]
        return [text("Details for {title}. Use Save, Back to results, or Shortlist.", **job), job["summary"], *job["responsibilities"], text("Support: {support}.", support="፣ ".join(job["support"]))]
    if not jobs:
        return [text("No jobs saved yet. Go back to results and save a job by its number.")]
    job = jobs[0]
    heading = text("Shortlist {position} of {count} — {title}", position=prompt.start, count=prompt.total, **job)
    return [text("{heading}. {summary} Use Next or Previous to review one job at a time, or Prepare draft. Nothing will be submitted.", heading=heading, **job)]


class TranscriptionRequest(ConsentRequest):
    content_type: Literal["audio/wav"]
    audio: str = Field(min_length=64, max_length=640060)

    def decoded_audio(self) -> bytes:
        try:
            audio = base64.b64decode(self.audio, validate=True)
        except (ValueError, binascii.Error):
            raise ValueError("Invalid audio") from None
        if not 46 <= len(audio) <= MAX_AUDIO_BYTES:
            raise ValueError("Invalid recording length")
        if audio[:4] != b"RIFF" or audio[8:16] != b"WAVEfmt " or audio[36:40] != b"data":
            raise ValueError("Only canonical PCM WAV recordings are supported")
        size, format_size, encoding, channels, rate, byte_rate, align, bits, data_size = struct.unpack_from("<I8xIHHIIHH4xI", audio, 4)
        if (size != len(audio) - 8 or format_size != 16 or encoding != 1 or channels != 1 or rate != 16000 or
                byte_rate != 32000 or align != 2 or bits != 16 or data_size != len(audio) - 44 or data_size % 2):
            raise ValueError("Only up to 15 seconds of mono 16 kHz PCM16 audio is supported")
        return audio
