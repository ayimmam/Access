"""Prepare downloadable public fixtures with selectable MP4 subtitle tracks."""

import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Literal

from access_core.lessons import (
    EXAMPLE_ID, EXAMPLE_VIDEO, W3C_DIRECTORY, W3C_ID, captions_vtt, get_lesson,
)

Edition = Literal["standard", "described"]
OUTPUT = Path(__file__).resolve().parents[4] / "artifacts/offline-video"
EDITIONS: dict[str, tuple[Edition, ...]] = {EXAMPLE_ID: ("standard",), W3C_ID: ("standard", "described")}


def offline_video_path(lesson_id: str, version: int, edition: Edition) -> Path | None:
    if version != 1 or edition not in EDITIONS.get(lesson_id, ()):
        return None
    return OUTPUT / f"{lesson_id}-v{version}-{edition}.mp4"


def mux(video: Path, tracks: list[tuple[Path, str, str]], output: Path) -> None:
    command = ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-i", str(video)]
    for path, _, _ in tracks:
        command.extend(("-i", str(path)))
    command.extend(("-map", "0:v:0", "-map", "0:a:0?", "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text"))
    for index, (_, language, label) in enumerate(tracks):
        command.extend((
            "-map", f"{index + 1}:s:0",
            f"-metadata:s:s:{index}", f"language={language}",
            f"-metadata:s:s:{index}", f"handler_name={label}",
            f"-disposition:s:{index}", "0",
        ))
    with TemporaryDirectory(dir=output.parent) as directory:
        temporary = Path(directory) / "video.mp4"
        subprocess.run([*command, "-movflags", "+faststart", str(temporary)], check=True, timeout=120)
        temporary.replace(output)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory() as directory:
        captions = Path(directory) / "captions.en.vtt"
        captions.write_text(captions_vtt(get_lesson(EXAMPLE_ID, 1)), encoding="utf-8")
        mux(EXAMPLE_VIDEO, [(captions, "eng", "English (source draft)")],
            OUTPUT / f"{EXAMPLE_ID}-v1-standard.mp4")
    mux(W3C_DIRECTORY / "standard.mp4", [
        (W3C_DIRECTORY / "captions.en.vtt", "eng", "English"),
        (W3C_DIRECTORY / "captions.am.vtt", "amh", "Amharic (review pending)"),
        (W3C_DIRECTORY / "captions.ti.vtt", "tir", "Tigrigna (review pending)"),
    ], OUTPUT / f"{W3C_ID}-v1-standard.mp4")
    mux(W3C_DIRECTORY / "described.mp4", [
        (W3C_DIRECTORY / "captions-described.en.vtt", "eng", "English (audio-described edition)"),
    ], OUTPUT / f"{W3C_ID}-v1-described.mp4")


if __name__ == "__main__":
    main()
