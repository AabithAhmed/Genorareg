"""
Candidate Pass Generator — Python/Flask Backend
Replaces the Node.js/Puppeteer backend with a fast, browser-free implementation.
"""
import os
import sys
import uuid

from dotenv import load_dotenv

# Load .env from parent directory (same location as before)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from flask import Flask, request, jsonify, send_file, abort
from flask_cors import CORS

# Ensure services are importable
sys.path.insert(0, os.path.dirname(__file__))

import store
from services.csv_parser import parse_csv
from services.csv_analyzer import analyze_csv_structure
from services.normalization import normalize_candidates
from services.validation import validate_candidates
from services.pdf_generator import generate_pdf
from services.queue_service import create_job, start_job
from services.email_service import send_pass_email

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return response


STORAGE_DIR = os.environ.get("STORAGE_DIR", "storage")
# Resolve it relative to the root directory
STORAGE_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), "..", "storage")
UPLOAD_DIR = os.path.join(STORAGE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Upload CSV / Excel ────────────────────────────────────────────────────────
@app.route("/api/uploads/csv", methods=["POST"])
def upload_csv():
    if "file" not in request.files:
        return jsonify({"success": False, "error": {"code": "MISSING_FILE", "message": "No file uploaded"}}), 400

    file = request.files["file"]
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in (".csv", ".xlsx", ".xls"):
        return jsonify({"success": False, "error": {"code": "INVALID_FILE_TYPE", "message": "Only CSV or XLSX files are allowed"}}), 400

    upload_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{upload_id}{ext}")
    file.save(save_path)

    try:
        rows = parse_csv(save_path)
    finally:
        try:
            os.remove(save_path)
        except Exception:
            pass

    if not rows:
        return jsonify({"success": False, "error": {"code": "EMPTY_FILE", "message": "File is empty"}}), 400

    store.csv_store_set(upload_id, rows)
    return jsonify({"success": True, "data": {"uploadId": upload_id, "rowCount": len(rows)}})


# ── Analyze CSV Structure ─────────────────────────────────────────────────────
@app.route("/api/uploads/<upload_id>/analysis", methods=["GET"])
def get_csv_analysis(upload_id):
    rows = store.csv_store_get(upload_id)
    if rows is None:
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Upload not found or expired"}}), 404

    analysis = analyze_csv_structure(rows)
    return jsonify({"success": True, "data": {"analysis": analysis, "rowCount": len(rows)}})


# ── Event Config ──────────────────────────────────────────────────────────────
@app.route("/api/events/config", methods=["GET"])
def get_event_config():
    return jsonify({"success": True, "data": store.get_event_config()})


@app.route("/api/events/config", methods=["POST"])
def update_event_config():
    data = request.get_json() or {}
    store.set_event_config(data)
    return jsonify({"success": True, "data": store.get_event_config()})


# ── Preview Passes ────────────────────────────────────────────────────────────
@app.route("/api/passes/preview", methods=["POST"])
def preview_passes():
    body = request.get_json() or {}
    upload_id = body.get("uploadId")
    mappings = body.get("mappings", [])

    rows = store.csv_store_get(upload_id)
    if rows is None:
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Upload not found"}}), 404

    candidates = normalize_candidates(rows, mappings)
    validation = validate_candidates(candidates, required_fields=["name", "email"])

    store.candidate_store_set(upload_id, validation["valid"])

    # Generate a sample pass for the first valid candidate (instant with fpdf2)
    sample_pass_id = None
    if validation["valid"]:
        sample_candidate = validation["valid"][0]
        sample_pass_id = f"preview-{uuid.uuid4()}"
        generate_pdf(sample_candidate, store.get_event_config(), sample_pass_id)

    return jsonify({
        "success": True,
        "data": {
            "total": len(candidates),
            "validCount": len(validation["valid"]),
            "invalidCount": len(validation["invalid"]),
            "duplicateCount": len(validation["duplicates"]),
            "errors": validation["invalid"],
            "duplicates": validation["duplicates"],
            "samplePassId": sample_pass_id,
        }
    })


# ── Preview PDF ───────────────────────────────────────────────────────────────
@app.route("/api/passes/preview-pdf/<pass_id>", methods=["GET"])
def preview_pdf(pass_id):
    pdf_path = os.path.join(STORAGE_DIR, "generated", f"{pass_id}.pdf")
    if not os.path.exists(pdf_path):
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "PDF not found"}}), 404
    return send_file(os.path.abspath(pdf_path), mimetype="application/pdf")


# ── Send Passes ───────────────────────────────────────────────────────────────
@app.route("/api/passes/send", methods=["POST"])
def send_passes():
    body = request.get_json() or {}
    upload_id = body.get("uploadId")

    candidates = store.candidate_store_get(upload_id)
    if not candidates:
        return jsonify({"success": False, "error": {"code": "NO_CANDIDATES", "message": "No valid candidates found"}}), 400

    event_config = store.get_event_config()
    job_id = create_job(candidates, event_config)
    start_job(job_id, candidates)

    return jsonify({"success": True, "data": {"jobId": job_id}})


# ── Job Status ────────────────────────────────────────────────────────────────
@app.route("/api/jobs/<job_id>", methods=["GET"])
def get_job_state(job_id):
    job = store.job_store_get(job_id)
    if not job:
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Job not found"}}), 404
    return jsonify({"success": True, "data": job})


@app.route("/api/jobs/<job_id>/retry-failed", methods=["POST"])
def retry_failed(job_id):
    job = store.job_store_get(job_id)
    if not job:
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Job not found"}}), 404
    if job["status"] == "running":
        return jsonify({"success": False, "error": {"code": "JOB_RUNNING", "message": "Job is currently running"}}), 400

    failed_ids = {r["candidateId"] for r in job["results"] if r["status"] == "failed"}
    if not failed_ids:
        return jsonify({"success": False, "error": {"code": "NO_FAILED", "message": "No failed candidates"}}), 400

    for r in job["results"]:
        if r["candidateId"] in failed_ids:
            r["status"] = "pending"
            r["attempts"] = 0

    retry_candidates = [c for c in job["candidates"] if c["candidateId"] in failed_ids]
    start_job(job_id, retry_candidates)

    return jsonify({"success": True, "data": {"jobId": job_id}})


# ── Job Report ────────────────────────────────────────────────────────────────
@app.route("/api/jobs/<job_id>/report", methods=["GET"])
def get_job_report(job_id):
    import csv
    import io
    job = store.job_store_get(job_id)
    if not job:
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Job not found"}}), 404

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Unique ID", "Candidate Name", "Email", "Status", "Pass ID", "Attempts", "Error"])
    for r in job["results"]:
        writer.writerow([
            r.get("uniqueId", ""),
            r.get("candidateName", ""),
            r.get("recipient", ""),
            r.get("status", ""),
            r.get("passId", ""),
            r.get("attempts", 0),
            r.get("error", "") or "",
        ])

    from flask import Response
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=report-{job_id}.csv"}
    )


# ── Verification CSV (Name + Unique GS-ID) ────────────────────────────────────
@app.route("/api/jobs/<job_id>/verification-csv", methods=["GET"])
def get_verification_csv(job_id):
    job = store.job_store_get(job_id)
    if not job:
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Job not found"}}), 404

    csv_path = job.get("verificationCsvPath")
    if not csv_path or not os.path.exists(csv_path):
        return jsonify({"success": False, "error": {"code": "NOT_READY", "message": "Verification CSV not ready yet"}}), 404

    return send_file(
        os.path.abspath(csv_path),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"genora26_verification_{job_id[:8]}.csv"
    )


# ── Offline / Spot Registration ───────────────────────────────────────────────
@app.route("/api/passes/offline-register", methods=["POST"])
def offline_register():
    body = request.get_json() or {}
    name = (body.get("name") or "").strip()
    college = (body.get("college") or "").strip()

    if not name:
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Candidate name is required"}}), 400
    if not college:
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "College / Institution is required"}}), 400

    raw_events = body.get("events") or []
    if isinstance(raw_events, str):
        import re
        events = [e.strip() for e in re.split(r"[|,;]", raw_events) if e.strip()]
    elif isinstance(raw_events, list):
        events = [str(e).strip() for e in raw_events if str(e).strip()]
    else:
        events = []

    candidate_record = {
        "candidateId": str(uuid.uuid4()),
        "name": name,
        "college": college,
        "events": events,
        "food": body.get("food", "Veg"),
        "email": body.get("email", ""),
        "phone": body.get("phone", ""),
        "paymentMode": body.get("paymentMode", "Cash"),
        "paymentRef": body.get("paymentRef", ""),
        "registeredAt": store.get_event_config().get("date", "OCT-14-2026"),
    }

    # Store candidate and assign sequential GS-OFF-XXX
    saved_record = store.add_offline_registration(candidate_record)
    gs_id = saved_record["gsId"]

    # Generate restricted PDF pass using identical template
    event_config = store.get_event_config()
    pdf_path = generate_pdf(saved_record, event_config, pass_id=gs_id)

    return jsonify({
        "success": True,
        "data": {
            "passId": gs_id,
            "gsId": gs_id,
            "pdfUrl": f"/api/passes/preview-pdf/{gs_id}",
            "candidate": saved_record,
        }
    })


@app.route("/api/passes/offline-registrations", methods=["GET"])
def get_offline_registrations():
    return jsonify({"success": True, "data": store.get_offline_registrations()})


@app.route("/api/passes/offline-send-email", methods=["POST"])
def offline_send_email():
    body = request.get_json() or {}
    pass_id = (body.get("passId") or "").strip()
    target_email = (body.get("email") or "").strip()

    if not pass_id:
        return jsonify({"success": False, "error": {"code": "MISSING_PASS_ID", "message": "Pass ID is required"}}), 400

    record = store.get_offline_registration_by_id(pass_id)
    recipient = target_email or (record.get("email") if record else "")
    if not recipient:
        return jsonify({"success": False, "error": {"code": "MISSING_EMAIL", "message": "Please provide an email address for the candidate"}}), 400

    pdf_path = os.path.join(STORAGE_DIR, "generated", f"{pass_id}.pdf")
    event_config = store.get_event_config()

    if not os.path.exists(pdf_path):
        if not record:
            return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Pass file not found"}}), 404
        pdf_path = generate_pdf(record, event_config, pass_id=pass_id)

    email_candidate = {
        "name": record.get("name") if record else body.get("name", "Participant"),
        "email": recipient,
    }

    try:
        send_pass_email(email_candidate, pdf_path, event_config)
        if record:
            record["emailSent"] = True
            record["emailSentTo"] = recipient
        return jsonify({
            "success": True,
            "data": {
                "message": f"Pass successfully sent to {recipient}",
                "recipient": recipient,
                "passId": pass_id,
            }
        })
    except Exception as exc:
        return jsonify({
            "success": False,
            "error": {"code": "EMAIL_FAILED", "message": str(exc)}
        }), 500




if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[SERVER] Python/Flask backend running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
