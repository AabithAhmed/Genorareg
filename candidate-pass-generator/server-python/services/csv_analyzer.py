"""CSV structure analyzer: infers which column maps to which candidate field."""
import re

FIELD_RULES = {
    "college": {
        "keywords": ["college", "institution", "university", "school", "institute", "campus"],
        "negative": [],
        "pattern": None,
        "base_score": 75,
    },
    "food": {
        "keywords": ["food", "meal", "diet", "dietary", "preference", "veg", "non-veg"],
        "negative": ["screenshot", "transaction"],
        "pattern": None,
        "base_score": 70,
    },
    "events": {
        "keywords": ["technical event", "non technical event", "event 1", "event 2", "event", "events", "competition", "registered event"],
        "negative": ["team", "leader", "screenshot", "transaction", "member"],
        "pattern": None,
        "base_score": 70,
    },
    "email": {
        "keywords": ["email address", "email id", "candidate email", "email", "mail"],
        "negative": ["leader", "team", "screenshot"],
        "pattern": re.compile(r"^[\w\.-]+@[\w\.-]+\.\w{2,}$"),
        "base_score": 70,
    },
    "phone": {
        "keywords": ["mobile", "phone", "contact", "cell"],
        "negative": ["register", "roll", "transaction", "leader", "upi"],
        "pattern": re.compile(r"^\+?[\d\s\-\(\)]{7,15}$"),
        "base_score": 65,
    },
    "registrationId": {
        "keywords": ["register no", "reg no", "registration no", "roll no", "regno"],
        "negative": ["upi", "transaction", "payment", "screenshot", "phone", "mobile"],
        "pattern": None,
        "base_score": 65,
    },
    "name": {
        "keywords": ["candidate name", "student name", "participant name", "full name", "fullname", "name"],
        "negative": ["college", "institution", "team", "leader", "member", "department", "food", "screenshot", "transaction", "upi", "whatsapp"],
        "pattern": re.compile(r"^[a-zA-Z\s\-'\.]{2,60}$"),
        "base_score": 60,
    },
}


def _score_field(header: str, sample_values: list[str]) -> tuple[str | None, int]:
    header_lower = header.lower().strip()
    best_field = None
    best_score = 0

    for field, rules in FIELD_RULES.items():
        # Check negative keywords first
        if any(neg in header_lower for neg in rules.get("negative", [])):
            continue

        score = 0
        matched_kw = False
        # Exact match or substring match
        for kw in rules["keywords"]:
            if kw == header_lower:
                score += rules.get("base_score", 60) + 25
                matched_kw = True
                break
            elif kw in header_lower:
                score += rules.get("base_score", 60)
                matched_kw = True
                break

        if not matched_kw:
            continue

        # Check sample values against regex pattern
        if rules["pattern"] and sample_values:
            matches = sum(1 for v in sample_values if v and rules["pattern"].match(str(v)))
            score += int((matches / len(sample_values)) * 30)

        if score > best_score:
            best_score = score
            best_field = field

    # Clamp to max 100
    best_score = min(best_score, 100)
    return (best_field if best_score >= 40 else None, best_score)



def analyze_csv_structure(rows: list[dict]) -> list[dict]:
    if not rows:
        return []

    headers = list(rows[0].keys())
    analysis = []

    for header in headers:
        sample_values = [str(row.get(header, "")) for row in rows[:5] if row.get(header)]
        inferred_field, confidence = _score_field(header, sample_values)
        analysis.append({
            "originalHeader": header,
            "inferredField": inferred_field,
            "confidence": confidence,
            "sampleValues": sample_values[:3],
        })

    return analysis
