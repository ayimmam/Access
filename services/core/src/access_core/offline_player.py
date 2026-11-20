"""Stream a self-contained player for the allowlisted public video fixtures."""

import base64
import hashlib
import html
import json
from collections.abc import Iterator
from pathlib import Path

from access_core.lessons import (
    EXAMPLE_DIRECTORY, EXAMPLE_ID, EXAMPLE_VIDEO, W3C_DIRECTORY, W3C_ID, Lesson, transcript_segments,
)

TEMPLATE = Path(__file__).with_name("offline_player.html")


def player_parts(lesson: Lesson) -> tuple[list[bytes | Path], int]:
    if not lesson.media or lesson.content_version != 1:
        raise KeyError(lesson.lesson_id)
    if lesson.lesson_id == EXAMPLE_ID:
        assets = {"standard": EXAMPLE_VIDEO}
    elif lesson.lesson_id == W3C_ID:
        assets = {key: W3C_DIRECTORY / name for key, name in (
            ("standard", "standard.mp4"), ("described", "described.mp4"),
            ("audio", "audio.mp3"), ("described-audio", "audio-described.mp3"),
        )}
    else:
        raise KeyError(lesson.lesson_id)

    tracks = [{
        "language": track.language, "label": track.label,
        "segments": [s.model_dump() for s in transcript_segments(lesson, track.language)],
    } for track in lesson.media.caption_tracks]
    timeline = {"standard": tracks}
    if lesson.described_segments:
        timeline["described"] = [{"language": "en", "label": "English · W3C source",
                                  "segments": [s.model_dump() for s in lesson.described_segments]}]
    metadata = {"lesson": lesson.lesson_id, "version": lesson.content_version,
                "courseVersion": lesson.course_version_id, "timeline": timeline, "assets": {}}
    parts: list[bytes | Path] = []
    if lesson.lesson_id == EXAMPLE_ID:
        root = EXAMPLE_DIRECTORY.parent
        bundle = root / "packages/lesson-component/dist/offline-signing.js"
        if bundle.is_file():
            for name in ("asl-demo/avatar.glb", "asl-demo/lesson-motion.glb", "ethsl-demo/lesson-motion.glb"):
                assets[name] = root / "examples/assets" / name
            parts.extend([b"<script>", bundle.read_bytes().replace(b"</script", b"<\\/script"), b"</script>"])

    for key, path in assets.items():
        with path.open("rb") as source:
            digest = hashlib.file_digest(source, "sha256").hexdigest()
        metadata["assets"][key] = {"sha256": digest, "bytes": path.stat().st_size}
        parts.extend([f'<script type="application/octet-stream" id="asset-{key}">'.encode(),
                      path, b"</script>"])
    template = TEMPLATE.read_text(encoding="utf-8").replace("{{title}}", html.escape(lesson.title))
    before, after = template.split("<!-- embedded media -->")
    # JSON in an HTML raw-text element must never contain a literal closing tag.
    before = before.replace("{{metadata}}", json.dumps(metadata, ensure_ascii=False).replace("<", r"\u003c"))
    parts = [before.encode(), *parts, after.encode()]
    size = sum(4 * ((p.stat().st_size + 2) // 3) if isinstance(p, Path) else len(p) for p in parts)
    return parts, size


def player_bytes(parts: list[bytes | Path]) -> Iterator[bytes]:
    for part in parts:
        if isinstance(part, bytes):
            yield part
        else:
            with part.open("rb") as source:
                # Divisible by three so only the last chunk receives base64 padding.
                while chunk := source.read(3 * 65536):
                    yield base64.b64encode(chunk)
