import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["EDITOR_AGENT"] = "fake"
os.environ["EDITOR_RENDER"] = "fake"

import pytest
from fastapi.testclient import TestClient

from editor_api.main import create_app


@pytest.fixture
def client(tmp_path):
    app = create_app(tmp_path)
    with TestClient(app) as c:
        c.app_ = app
        yield c


def wait(c):
    c.app_.state.queue.join(timeout=10)


@pytest.fixture
def project(client):
    pid = client.post("/projects", json={"name": "t"}).json()["id"]
    return pid


@pytest.fixture
def uploaded(client, project):
    r = client.post(f"/projects/{project}/upload", files={"file": ("my clip.mp4", b"\x00" * 2048, "video/mp4")})
    assert r.status_code == 201
    return project
