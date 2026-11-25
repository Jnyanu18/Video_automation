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
    # The timeout is only a deadlock guard, so it is generous: a drained queue returns at once.
    # It used to be 10s and returned silently on expiry, which under full-suite CPU load turned
    # into assertions failing on a half-finished job list - a flake that never reproduced alone.
    assert c.app_.state.queue.join(timeout=120), "jobs did not finish within 120s"


@pytest.fixture
def project(client):
    pid = client.post("/projects", json={"name": "t"}).json()["id"]
    return pid


@pytest.fixture
def uploaded(client, project):
    r = client.post(f"/projects/{project}/upload", files={"file": ("my clip.mp4", b"\x00" * 2048, "video/mp4")})
    assert r.status_code == 201
    return project
