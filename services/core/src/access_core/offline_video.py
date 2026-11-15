"""Prepare downloadable public fixtures with selectable MP4 subtitle tracks."""

import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Literal

from access_core.lessons import (
    EXAMPLE_ID, W3C_ID, get_lesson,
)
from access_core.review import approved_caption, file_hash, source_files
from access_core.exports import publication_binding

Edition = Literal["standard", "described"]
OUTPUT = Path(__file__).resolve().parents[4] / "artifacts/offline-video"
EDITIONS: dict[str, tuple[Edition, ...]] = {EXAMPLE_ID: ("standard",), W3C_ID: ("standard", "described")}


def offline_video_path(lesson_id: str, version: int, edition: Edition) -> Path | None:
    if version != 1 or edition not in EDITIONS.get(lesson_id, ()):
        return None
    path = OUTPUT / f"{lesson_id}-v{version}-{edition}.mp4"
    try:
        record = json.loads(path.with_suffix(".json").read_bytes())
        if record["binding"] != publication_binding(get_lesson(lesson_id, version)) or record["sha256"] != file_hash(path):
            return None
    except (OSError, ValueError, KeyError):
        return None
    return path


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
    for lesson_id, editions in EDITIONS.items():
        lesson = get_lesson(lesson_id, 1)
        for edition in editions:
            tracks = []
            for language, code, label in (("en", "eng", "English"), ("am", "amh", "Amharic"), ("ti", "tir", "Tigrigna")):
                asset = approved_caption(lesson, language, edition)
                if asset:
                    tracks.append((asset.path, code, label))
            if not tracks:
                continue
            output = OUTPUT / f"{lesson_id}-v1-{edition}.mp4"
            mux(source_files(lesson, edition)[0], tracks, output)
            output.with_suffix(".json").write_text(json.dumps({"binding": publication_binding(lesson), "sha256": file_hash(output)}))


if __name__ == "__main__":
    main()
