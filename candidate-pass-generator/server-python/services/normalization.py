"""Normalization service: maps raw CSV rows to NormalizedCandidate dicts."""
import uuid


def normalize_candidates(rows: list[dict], mappings: list[dict]) -> list[dict]:
    """
    mappings = [{"originalHeader": "Name", "mappedField": "name"}, ...]
    Returns list of normalized candidate dicts.
    """
    # Build a lookup: original_header -> mapped_field
    mapping_lookup = {}
    for m in mappings:
        if m.get("mappedField"):
            mapping_lookup[m["originalHeader"]] = m["mappedField"]

    candidates = []
    for row in rows:
        candidate = {
            "candidateId": str(uuid.uuid4()),
            "name": None,
            "email": None,
            "college": None,
            "events": [],
            "food": None,
            "phone": None,
            "registrationId": None,
            "rawData": dict(row),
        }

        for orig_header, mapped_field in mapping_lookup.items():
            raw_val = row.get(orig_header, "")
            value = str(raw_val).strip() if raw_val is not None else ""
            if not value or value.lower() in ("none", "null", "nil", "n/a", "nan"):
                continue

            if mapped_field == "events":
                # Split on | or , or ; and accumulate without duplicates
                import re
                parts = re.split(r"[|,;]", value)
                for p in parts:
                    clean_p = p.strip()
                    if clean_p and clean_p.lower() not in ("none", "null", "nil", "n/a", "nan"):
                        if clean_p not in candidate["events"]:
                            candidate["events"].append(clean_p)
            elif mapped_field in candidate:
                if not candidate[mapped_field]:
                    candidate[mapped_field] = value

        candidates.append(candidate)

    return candidates
