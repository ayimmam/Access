from fastapi.testclient import TestClient

from access_api.main import app


client = TestClient(app)


def test_jobs_are_explicitly_fictional_and_have_equivalent_summary_text():
    response = client.get("/api/v1/jobs")
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) == 4
    assert len({job["id"] for job in jobs}) == 4
    for job in jobs:
        assert job["demo"] is True
        assert "fictional" in job["summary"]
        assert job["support"] and job["responsibilities"]
        schema = client.get(f'/api/v1/jobs/{job["id"]}/structured-data').json()
        assert schema["@type"] == "JobPosting"
        assert schema["title"] == job["title"]
        assert schema["description"] == job["summary"]
        assert schema["hiringOrganization"]["name"] == job["organization"]
    assert client.get("/api/v1/jobs/unknown/structured-data").status_code == 404


def test_certificate_status_comes_from_server_record_without_personal_data():
    for identifier, expected in [("DEMO-LEARNING-001", "demo-valid"), ("DEMO-REVOKED-001", "demo-revoked"), ("unknown", "unknown")]:
        response = client.get(f"/api/v1/demo-certificates/{identifier}?status=demo-valid&name=untrusted")
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store"
        record = response.json()
        assert record["status"] == expected
        assert set(record) == {"status", "course_name", "issue_date"}


def test_career_and_second_provider_pages_use_reusable_components():
    career = client.get("/demo/careers")
    learning = client.get("/demo/ethioware")
    assert career.status_code == learning.status_code == 200
    assert '<access-career-gateway api-base="/api/v1">' in career.text
    assert '<alx-accessible-lesson api-base="/api/v1"' in learning.text
    assert "live Ethioware site is unchanged" in learning.text
    assert "NOT AN ALX-ISSUED CREDENTIAL" in client.get("/demo/certificates/unknown").text
