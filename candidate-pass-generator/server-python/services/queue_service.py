"""Queue service: manages background job execution for sending passes.

Sequential unique IDs are assigned as GS-001, GS-002, … for every candidate.
After all emails are processed a verification CSV is written to storage/reports/.
"""
import os
import csv
import threading
from datetime import datetime
from store import job_store_set, job_store_get
from services.pdf_generator import generate_pdf
from services.email_service import send_pass_email

_ROOT = os.path.abspath(os.getcwd())


def _assign_pass_ids(candidates: list) -> dict:
    """Return a mapping candidateId -> GS-XXX id (1-indexed, zero-padded to 3)."""
    return {
        c["candidateId"]: f"GS-{str(i + 1).zfill(3)}"
        for i, c in enumerate(candidates)
    }


def create_job(candidates: list, event_config: dict) -> str:
    import uuid
    job_id = str(uuid.uuid4())

    # Assign sequential IDs once, at job creation time
    id_map = _assign_pass_ids(candidates)

    results = [
        {
            "candidateId":   c["candidateId"],
            "candidateName": c.get("name", ""),
            "recipient":     c.get("email", ""),
            "uniqueId":      id_map[c["candidateId"]],  # GS-001 …
            "status":        "pending",
            "passId":        None,
            "attempts":      0,
            "error":         None,
        }
        for c in candidates
    ]

    job = {
        "jobId":       job_id,
        "status":      "pending",
        "createdAt":   datetime.utcnow().isoformat(),
        "total":       len(candidates),
        "processed":   0,
        "successCount": 0,
        "failedCount":  0,
        "results":     results,
        "candidates":  candidates,
        "eventConfig": event_config,
        "idMap":       id_map,
    }
    job_store_set(job_id, job)
    return job_id


def start_job(job_id: str, candidates: list) -> None:
    """Start processing a job in a background thread."""
    thread = threading.Thread(target=_run_job, args=(job_id, candidates), daemon=True)
    thread.start()


def _run_job(job_id: str, candidates: list) -> None:
    job = job_store_get(job_id)
    if not job:
        return

    job["status"] = "running"
    event_config = job["eventConfig"]
    id_map       = job.get("idMap", {})
    max_retries  = 3

    for result in job["results"]:
        if result["status"] != "pending":
            continue

        # Find matching candidate
        candidate = next(
            (c for c in candidates if c["candidateId"] == result["candidateId"]),
            None,
        )
        if not candidate:
            continue

        # Use the pre-assigned GS-XXX id
        pass_id = id_map.get(candidate["candidateId"], result["uniqueId"])

        for attempt in range(max_retries):
            result["attempts"] = attempt + 1
            try:
                pdf_path = generate_pdf(candidate, event_config, pass_id)
                send_pass_email(candidate, pdf_path, event_config)
                result["status"] = "success"
                result["passId"] = pass_id
                job["successCount"] += 1
                break
            except Exception as exc:
                result["error"] = str(exc)
                if attempt == max_retries - 1:
                    result["status"] = "failed"
                    job["failedCount"] += 1

        job["processed"] += 1

    final_status = "completed" if job["failedCount"] == 0 else "completed_with_errors"
    job["status"] = final_status
    job_store_set(job_id, job)

    # ── Write verification CSV ───────────────────────────────────────────────
    _write_verification_csv(job)


def _write_verification_csv(job: dict) -> None:
    """
    Write a CSV of all candidates with their GS-XXX unique ID and send status.
    Saved to storage/reports/<job_id>_verification.csv
    """
    reports_dir = os.path.join(_ROOT, "storage", "reports")
    os.makedirs(reports_dir, exist_ok=True)

    csv_path = os.path.join(reports_dir, f"{job['jobId']}_verification.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Unique ID", "Candidate Name", "Email", "Status", "Error"])
        for r in job["results"]:
            writer.writerow([
                r.get("uniqueId", ""),
                r.get("candidateName", ""),
                r.get("recipient", ""),
                r.get("status", ""),
                r.get("error", "") or "",
            ])

    job["verificationCsvPath"] = csv_path
    job_store_set(job["jobId"], job)
