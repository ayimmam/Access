import hashlib
import json
import os
import subprocess
from fastapi.testclient import TestClient

from access_api.main import ROOT, app


def test_old_frozen_release_keeps_all_entry_points_and_chunks_after_new_build(tmp_path):
    directory = tmp_path / "dist"
    directory.mkdir()
    names = ["lesson.js", "jobs.js", "avatar-review.js", "timing-avatar-TEST.js"]
    for name in names:
        (directory / name).write_text(f"export const fixture = {json.dumps(name)};")
    (directory / "build-meta.json").write_text(json.dumps({"outputs": {f"dist/{name}": {} for name in names}}))
    (directory / "stale-chunk.js").write_text("export const obsolete = true;")
    environment = {**os.environ, "ACCESS_COMPONENT_DIST": str(directory), "ACCESS_COMPONENT_RELEASE_DIR": str(tmp_path / "retained")}
    script = str(ROOT / "scripts/write-component-integrity.mjs")
    subprocess.run(["node", script], env=environment, cwd=ROOT, check=True, capture_output=True)
    first = json.loads((directory / "release.json").read_text())
    frozen = tmp_path / "retained" / first["release_id"]
    snapshots = {name: (frozen / name).read_bytes() for name in [*names, "release.json", "integrity.json"]}
    (directory / "lesson.js").write_text("export const changed = true;")
    subprocess.run(["node", script], env=environment, cwd=ROOT, check=True, capture_output=True)
    second = json.loads((directory / "release.json").read_text())
    assert first["release_id"] != second["release_id"]
    assert all((frozen / name).read_bytes() == data for name, data in snapshots.items())
    assert set(item["path"] for item in first["files"]) == set(names)
    assert not (frozen / "stale-chunk.js").exists()
    for item in first["files"]:
        assert hashlib.sha256(snapshots[item["path"]]).hexdigest() == item["sha256"]
    (frozen / "lesson.js").write_text("tampered")
    (directory / "lesson.js").write_bytes(snapshots["lesson.js"])
    assert subprocess.run(["node", script], env=environment, cwd=ROOT, capture_output=True).returncode != 0


def test_build_metadata_matches_frozen_bytes_and_never_claims_a_clean_dirty_tree():
    client = TestClient(app)
    response = client.get("/api/v1/release")
    assert response.status_code == 200
    release = response.json()
    assert release["base_path"] == f'/components/releases/{release["release_id"]}/'
    assert isinstance(release["working_tree_dirty"], bool)
    for item in release["files"]:
        asset = client.get(release["base_path"] + item["path"])
        assert asset.status_code == 200
        assert hashlib.sha256(asset.content).hexdigest() == item["sha256"]
        assert "immutable" in asset.headers["cache-control"]
    assert client.get("/components/0.1.0/integrity.json").headers["cache-control"] == "no-store"
