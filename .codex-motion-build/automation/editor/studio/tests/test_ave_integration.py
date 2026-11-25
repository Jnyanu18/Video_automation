import pytest
from fastapi.testclient import TestClient
from api_server import create_app
from studio import ave_integration

def test_ave_availability():
    assert ave_integration.is_ave_available() is True

def test_ave_manifests_discovery():
    pipelines = ave_integration.list_pipelines()
    assert len(pipelines) >= 1
    ids = [p["id"] for p in pipelines]
    assert "ugc-ad" in ids

    styles = ave_integration.list_styles()
    assert len(styles) >= 1
    style_ids = [s["id"] for s in styles]
    assert "dtc-testimonial" in style_ids

def test_ave_status_endpoint():
    app = create_app()
    client = TestClient(app)
    resp = client.get("/api/editor/ave/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["available"] is True
    assert any(p["id"] == "ugc-ad" for p in data["pipelines"])
    assert any(s["id"] == "dtc-testimonial" for s in data["styles"])
