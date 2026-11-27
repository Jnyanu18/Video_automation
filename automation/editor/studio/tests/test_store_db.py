import json

from studio.store import Store


def db_url(tmp_path):
    return f"sqlite:///{(tmp_path / 'studio.db').as_posix()}"


def test_json_backend_is_still_the_default(tmp_path):
    s = Store(tmp_path / "state.json", database_url="")
    s.put("storyboards", "sb_1", {"title": "hello"})
    assert s.db is None
    assert json.loads((tmp_path / "state.json").read_text(encoding="utf-8"))["storyboards"]["sb_1"]["title"] == "hello"


def test_records_survive_a_restart_on_the_database(tmp_path):
    url = db_url(tmp_path)
    s = Store(tmp_path / "state.json", database_url=url)
    s.put("storyboards", "sb_1", {"title": "first"})
    s.update("storyboards", "sb_1", lambda r: r.update(status="done"))
    s.log("render", "finished", id="sb_1")

    again = Store(tmp_path / "state.json", database_url=url)
    rec = again.get("storyboards", "sb_1")
    assert rec["title"] == "first" and rec["status"] == "done"
    assert again.events(5)[0]["message"] == "finished"


def test_delete_removes_the_row(tmp_path):
    url = db_url(tmp_path)
    s = Store(tmp_path / "state.json", database_url=url)
    s.put("series", "s_1", {"name": "x"})
    assert s.delete("series", "s_1") is True
    assert Store(tmp_path / "state.json", database_url=url).get("series", "s_1") is None


def test_first_start_imports_an_existing_json_file_once(tmp_path):
    (tmp_path / "state.json").write_text(json.dumps({"storyboards": {"sb_old": {"title": "from json"}}}), encoding="utf-8")
    url = db_url(tmp_path)
    s = Store(tmp_path / "state.json", database_url=url)
    assert s.get("storyboards", "sb_old")["title"] == "from json"
    # Later changes go to the database, not back into the JSON file.
    s.put("storyboards", "sb_new", {"title": "db only"})
    assert "sb_new" not in json.loads((tmp_path / "state.json").read_text(encoding="utf-8"))["storyboards"]


def test_accounts_are_isolated_on_one_database(tmp_path):
    url = db_url(tmp_path)
    a = Store(tmp_path / "alice" / "state.json", database_url=url)
    b = Store(tmp_path / "bob" / "state.json", database_url=url)
    a.put("storyboards", "sb_a", {"title": "alice's"})
    assert b.get("storyboards", "sb_a") is None
    assert Store(tmp_path / "alice" / "state.json", database_url=url).get("storyboards", "sb_a")["title"] == "alice's"


def test_crash_recovery_is_written_back_to_the_database(tmp_path):
    url = db_url(tmp_path)
    s = Store(tmp_path / "state.json", database_url=url)
    s.put("carousels", "c_1", {"status": "writing"})
    # Simulate a restart: the reload sweeps in-flight records and must persist the result.
    reloaded = Store(tmp_path / "state.json", database_url=url)
    assert reloaded.get("carousels", "c_1")["status"] == "failed"
    assert Store(tmp_path / "state.json", database_url=url).get("carousels", "c_1")["status"] == "failed"


def test_unknown_database_scheme_is_rejected(tmp_path):
    import pytest
    with pytest.raises(ValueError):
        Store(tmp_path / "state.json", database_url="mysql://nope")
