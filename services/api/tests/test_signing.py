import json

import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient

from access_api.main import app
from access_core.lessons import EXAMPLE_ID, get_lesson
from access_core.signing import Asset, SigningManifest, prepare_manifest, sha256, text_hash, validate_binding


def approved_manifest(tmp_path):
    lesson = get_lesson(EXAMPLE_ID, 1)
    manifest = prepare_manifest(lesson, 'ethsl')
    path = tmp_path / 'rig.glb'
    path.write_bytes(b'fixture-for-server-hash-tests')
    asset = Asset(filename=path.name, sha256=sha256(path), license='test-fixture')
    data = manifest.model_dump()
    data['rig'] = asset.model_dump()
    data['segments'][1].update(status='approved', motion=asset.model_dump(), clip_name='test', natural_duration=2,
                              review_ref='private-review-reference', consent_ref='private-consent-reference')
    return SigningManifest.model_validate(data), lesson


def test_default_manifest_is_source_faithful_and_language_scoped():
    client = TestClient(app)
    for language in ['ethsl', 'asl']:
        response = client.get(f'/api/v1/lessons/{EXAMPLE_ID}/signing-manifest?lang={language}')
        assert response.status_code == 200
        data = response.json()
        assert data['language'] == language
        assert len(data['segments']) == 16
        assert data['approved_count'] == 0
        assert 'opens doors' not in json.dumps(data)
    assert client.get(f'/api/v1/lessons/{EXAMPLE_ID}/signing-manifest?lang=other').status_code == 422
    assert client.get(f'/api/v1/lessons/{EXAMPLE_ID}/signing-manifest?version=2').status_code == 404


def test_binding_invalidates_caption_video_rig_motion_and_text_changes(tmp_path):
    original, lesson = approved_manifest(tmp_path)
    assert validate_binding(original, lesson, tmp_path).segments[1].status == 'approved'
    for field in ['video_sha256', 'captions_sha256']:
        changed = original.model_copy(deep=True)
        setattr(changed, field, '0' * 64)
        assert validate_binding(changed, lesson, tmp_path).segments[1].status == 'stale-needs-revalidation'
    changed = original.model_copy(deep=True)
    changed.segments[1].source_text += ' changed'
    assert validate_binding(changed, lesson, tmp_path).segments[1].status == 'stale-needs-revalidation'
    changed.segments[1].text_sha256 = text_hash(changed.segments[1].source_text)
    assert validate_binding(changed, lesson, tmp_path).segments[1].status == 'stale-needs-revalidation'
    (tmp_path / 'rig.glb').write_bytes(b'changed')
    assert validate_binding(original, lesson, tmp_path).segments[1].status == 'stale-needs-revalidation'
    assert original.segments[1].status == 'approved'


def test_review_and_timing_validation(tmp_path):
    manifest, _ = approved_manifest(tmp_path)
    data = manifest.model_dump()
    with pytest.raises(ValidationError):
        SigningManifest.model_validate(data)  # Public serialization excludes private approval references.
    segment = manifest.segments[1]
    values = segment.model_dump()
    values.update(review_ref='r', consent_ref='c', natural_duration=100)
    with pytest.raises(ValidationError):
        type(segment).model_validate(values)
    with pytest.raises(ValidationError):
        Asset(filename='../private.glb', sha256='0' * 64, license='test')


def test_api_keeps_review_references_private_and_blocks_stale_asset(tmp_path, monkeypatch):
    manifest, lesson = approved_manifest(tmp_path)
    data = manifest.model_dump()
    data['segments'][1].update(review_ref='private-review-reference', consent_ref='private-consent-reference')
    (tmp_path / f'{EXAMPLE_ID}-v1-ethsl.json').write_text(json.dumps(data))
    monkeypatch.setenv('ACCESS_SIGNING_DIR', str(tmp_path))
    client = TestClient(app)
    response = client.get(f'/api/v1/lessons/{EXAMPLE_ID}/signing-manifest')
    assert response.json()['approved_count'] == 1
    assert 'private-review-reference' not in response.text
    assert 'private-consent-reference' not in response.text
    url = response.json()['segments'][1]['motion']['url']
    assert client.get(url).status_code == 200
    (tmp_path / 'rig.glb').write_bytes(b'tampered')
    assert client.get(url).status_code == 404
    response = client.get(f'/api/v1/lessons/{EXAMPLE_ID}/signing-manifest')
    assert response.json()['approved_count'] == 0
    assert response.json()['segments'][1]['motion'] is None


def test_one_euro_filter_handles_irregular_timestamps_and_invalid_inputs():
    from access_worker.capture import OneEuroFilter
    filter = OneEuroFilter()
    assert filter.update(0, 0) == 0
    assert 0 < filter.update(1, .02) < 1
    assert 0 < filter.update(1, .05) < 1
    with pytest.raises(ValueError):
        filter.update(1, .05)
    with pytest.raises(ValueError):
        filter.update(float('nan'), .1)


def test_machine_draft_assets_remain_unavailable_to_learner_api(tmp_path, monkeypatch):
    manifest, _ = approved_manifest(tmp_path)
    data = manifest.model_dump()
    data['segments'][1]['status'] = 'machine-draft'
    (tmp_path / f'{EXAMPLE_ID}-v1-ethsl.json').write_text(json.dumps(data))
    monkeypatch.setenv('ACCESS_SIGNING_DIR', str(tmp_path))
    client = TestClient(app)
    response = client.get(f'/api/v1/lessons/{EXAMPLE_ID}/signing-manifest').json()
    assert response['approved_count'] == 0
    assert response['segments'][1]['motion'] is None
    assert client.get(f'/api/v1/lessons/{EXAMPLE_ID}/signing-assets/rig.glb').status_code == 404
