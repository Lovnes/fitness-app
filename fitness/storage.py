"""Local JSON persistence (offline-first; no account or server needed)."""
import json
import os
import tempfile
from typing import List, Optional

from .models import UserProfile, WorkoutSummary


class StorageError(Exception):
    pass


class JsonRepository:
    def __init__(self, path: str) -> None:
        self.path = path

    def _read(self) -> dict:
        if not os.path.exists(self.path):
            return {"profile": None, "history": []}
        try:
            with open(self.path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            raise StorageError(f"Could not read saved data: {exc}") from exc
        if not isinstance(data, dict):
            raise StorageError("Saved data has an unexpected format")
        data.setdefault("profile", None)
        data.setdefault("history", [])
        return data

    def _write(self, data: dict) -> None:
        directory = os.path.dirname(os.path.abspath(self.path))
        os.makedirs(directory, exist_ok=True)
        # Write atomically so a crash mid-save never corrupts history.
        fd, tmp = tempfile.mkstemp(dir=directory, suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
        os.replace(tmp, self.path)

    def save_profile(self, profile: UserProfile) -> None:
        data = self._read()
        data["profile"] = profile.to_dict()
        self._write(data)

    def load_profile(self) -> Optional[UserProfile]:
        raw = self._read()["profile"]
        return UserProfile.from_dict(raw) if raw else None

    def add_workout(self, summary: WorkoutSummary) -> None:
        data = self._read()
        data["history"].append(summary.to_dict())
        self._write(data)

    def list_workouts(self) -> List[WorkoutSummary]:
        """Newest first."""
        items = [WorkoutSummary.from_dict(d) for d in self._read()["history"]]
        return sorted(items, key=lambda s: s.date_iso, reverse=True)
