import json
from pathlib import Path

from app import storage


def test_save_and_load(tmp_path, monkeypatch):
    # 把 storage 的数据目录指向临时目录，避免污染真实数据
    monkeypatch.setattr(storage, "DATA_DIR", tmp_path)
    monkeypatch.setattr(storage, "DATA_FILE", tmp_path / "conversations.json")

    storage.save_messages([{"role": "user", "content": "hi"}])
    loaded = storage.load_messages()
    assert loaded == [{"role": "user", "content": "hi"}]


def test_load_missing_returns_empty(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "DATA_DIR", tmp_path)
    monkeypatch.setattr(storage, "DATA_FILE", tmp_path / "conversations.json")
    assert storage.load_messages() == []
