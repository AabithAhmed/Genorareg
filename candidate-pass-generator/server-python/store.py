"""In-memory stores for CSV data, candidates, jobs, and event config."""
from threading import Lock

_lock = Lock()

_csv_store: dict = {}
_candidate_store: dict = {}
_job_store: dict = {}

_event_config: dict = {
    "eventName": "GENORA'26",
    "organization": "Government College of Engineering, Tirunelveli",
    "department": "Department of CSE",
    "tagline": "National Level Technical Symposium",
    "date": "OCT-14-2026",
    "venue": "CSE Dept",
}


def csv_store_set(upload_id: str, rows: list):
    with _lock:
        _csv_store[upload_id] = rows


def csv_store_get(upload_id: str):
    with _lock:
        return _csv_store.get(upload_id)


def candidate_store_set(upload_id: str, candidates: list):
    with _lock:
        _candidate_store[upload_id] = candidates


def candidate_store_get(upload_id: str):
    with _lock:
        return _candidate_store.get(upload_id)


def job_store_set(job_id: str, job: dict):
    with _lock:
        _job_store[job_id] = job


def job_store_get(job_id: str):
    with _lock:
        return _job_store.get(job_id)


def get_event_config() -> dict:
    with _lock:
        return dict(_event_config)


def set_event_config(config: dict):
    with _lock:
        _event_config.update(config)


_offline_store: list = []


def add_offline_registration(record: dict) -> dict:
    with _lock:
        idx = len(_offline_store) + 1
        gs_id = f"GS-OFF-{str(idx).zfill(3)}"
        record["gsId"] = gs_id
        record["uniqueId"] = gs_id
        _offline_store.append(record)
        return record


def get_offline_registrations() -> list:
    with _lock:
        return list(_offline_store)


def get_offline_registration_by_id(gs_id: str) -> dict | None:
    with _lock:
        for r in _offline_store:
            if r.get("gsId") == gs_id or r.get("uniqueId") == gs_id:
                return r
        return None


