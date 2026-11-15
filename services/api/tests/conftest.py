import os

import pytest

from access_core.exports import build_exports
from access_core.lessons import DEMO, EXAMPLE_ID, W3C_ID, get_lesson


@pytest.fixture(scope="session", autouse=True)
def published_fixture_exports(tmp_path_factory):
    directory = tmp_path_factory.mktemp("published-fixtures")
    previous = {name: os.environ.get(name) for name in ("ACCESS_EXPORT_DIR", "ACCESS_REVIEW_DIR")}
    os.environ["ACCESS_EXPORT_DIR"] = str(directory / "exports")
    os.environ["ACCESS_REVIEW_DIR"] = str(directory / "reviews")
    for lesson_id in (DEMO.lesson_id, EXAMPLE_ID, W3C_ID):
        build_exports(get_lesson(lesson_id, 1))
    yield
    for name, value in previous.items():
        if value is None:
            os.environ.pop(name, None)
        else:
            os.environ[name] = value
