"""Validation service: validates candidates and returns valid/invalid/duplicate buckets."""
import re

EMAIL_RE = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w{2,}$")


def validate_candidates(candidates: list[dict], required_fields: list[str] = None) -> dict:
    if required_fields is None:
        required_fields = ["name", "email"]

    valid = []
    invalid = []
    seen_emails = set()
    duplicates = []

    for c in candidates:
        errors = []

        for field in required_fields:
            if not c.get(field):
                errors.append(f"Missing required field: {field}")

        if c.get("email"):
            if not EMAIL_RE.match(c["email"]):
                errors.append(f"Invalid email: {c['email']}")
            elif c["email"].lower() in seen_emails:
                duplicates.append({"candidate": c, "reason": "Duplicate email"})
                continue
            else:
                seen_emails.add(c["email"].lower())

        if errors:
            invalid.append({"candidate": c, "errors": errors})
        else:
            valid.append(c)

    return {"valid": valid, "invalid": invalid, "duplicates": duplicates}
