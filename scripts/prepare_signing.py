"""Prepare a source-faithful recording manifest for local interpreter production."""
import argparse
from pathlib import Path

from access_core.lessons import EXAMPLE_ID, get_lesson
from access_core.signing import prepare_manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--language', choices=['ethsl', 'asl'], required=True)
    parser.add_argument('--output-dir', type=Path, default=Path('artifacts/signing'))
    args = parser.parse_args()
    lesson = get_lesson(EXAMPLE_ID, 1)
    manifest = prepare_manifest(lesson, args.language)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    path = args.output_dir / f'{lesson.lesson_id}-v1-{args.language}.json'
    with path.open('x', encoding='utf-8') as stream:
        stream.write(manifest.model_dump_json(indent=2))
    print(f'Prepared {len(manifest.segments)} source cues at {path}. Interpreter phrase regrouping and review remain pending.')


if __name__ == '__main__':
    main()
