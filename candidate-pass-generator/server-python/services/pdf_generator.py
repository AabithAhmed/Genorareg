"""
PDF Generator — Genora'26 Entry Pass
Strict Content Restriction Implementation:
- Strong separation of internal candidate record and pass presentation model
- Dedicated PassViewModel containing ONLY the 7 permitted candidate fields
- Static presentation constants for institutional header & event branding
- Strictly excludes emails, phone numbers, reg nos, team info, payment details, QR codes, debug data
- Left vertical barcode preserved with zero additional metadata
- Existing visual design, dark blurred grunge background, red & gold typography preserved
"""
import os
import random
import re
import html
from dataclasses import dataclass
from fpdf import FPDF
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter

_ROOT = os.path.abspath(os.getcwd())
FONT_DIR = os.path.join(_ROOT, "storage", "fonts")
ASSETS_DIR = os.path.join(_ROOT, "storage", "assets")
TEMPLATE_PATH = os.path.join(ASSETS_DIR, "pass_template.png")

# Ticket Dimensions (mm)
W, H = 240, 120

# Colors
C_BG = (10, 8, 12)
C_RED = (200, 20, 20)
C_DARK_RED = (140, 10, 10)
C_WHITE = (255, 255, 255)
C_GREY = (180, 180, 180)
C_DGREY = (80, 80, 80)
C_BARCODE_BG = (245, 245, 245)
C_TRUE_GOLD = (212, 175, 55)

# Static Presentation Constants (Non-negotiable pass contents)
INSTITUTION_LINE_1 = "GOVERNMENT COLLEGE OF ENGINEERING, TIRUNELVELI"
INSTITUTION_LINE_2 = "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING"
SYMPOSIUM_LINE_1 = "NATIONAL LEVEL"
SYMPOSIUM_LINE_2 = "TECHNICAL SYMPOSIUM"
EVENT_BRANDING = "GENORA'26"
ENTRY_PASS_TITLE = "ENTRY PASS"

LABEL_NAME = "NAME"
LABEL_COLLEGE = "COLLEGE / INSTITUTION"
LABEL_EVENTS = "REGISTERED EVENTS"
LABEL_DIET = "DIETARY PREFERENCE"
LABEL_DATE = "DATE"
LABEL_VENUE = "VENUE"

DEFAULT_DATE = "OCT-14-2026"
DEFAULT_VENUE = "CSE Dept"


@dataclass(frozen=True)
class PassViewModel:
    """
    Dedicated, strongly typed pass presentation view model.
    Contains ONLY the 7 permitted dynamic fields.
    Forbidden fields (email, phone, payment, team, db IDs, etc.) are strictly excluded.
    """
    candidate_name: str
    gs_id: str
    college_name: str
    registered_events: str
    dietary_preference: str
    date: str = DEFAULT_DATE
    venue: str = DEFAULT_VENUE

    # CamelCase property aliases for compatibility
    @property
    def candidateName(self) -> str:
        return self.candidate_name

    @property
    def gsId(self) -> str:
        return self.gs_id

    @property
    def collegeName(self) -> str:
        return self.college_name

    @property
    def registeredEvents(self) -> str:
        return self.registered_events

    @property
    def dietaryPreference(self) -> str:
        return self.dietary_preference


def _clean_text(val) -> str:
    """Clean, sanitize, and strip strings; handle null/undefined cleanly."""
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in ("undefined", "null", "none", "nan", "nil", "n/a"):
        return ""
    # Safe character filtering for FPDF utf-8
    return "".join(c if ord(c) < 65536 else "?" for c in s)


def create_pass_view_model(candidate: dict, event_config: dict = None, pass_id: str = "") -> PassViewModel:
    """
    Transform raw internal candidate data into the strictly restricted PassViewModel.
    Any non-approved candidate fields (email, phone, team, payment, screenshots, etc.)
    are dropped here and will never reach the PDF renderer.
    """
    cfg = event_config or {}

    # 1. Candidate Name (only from permitted candidate record)
    raw_name = candidate.get("candidateName") or candidate.get("name") or candidate.get("full_name") or ""
    candidate_name = _clean_text(raw_name)

    # 2. Unique GS-ID (Sequential GS-XXX or GS-001 for preview)
    raw_id = pass_id or candidate.get("gsId") or candidate.get("uniqueId") or ""
    if str(raw_id).startswith("preview-"):
        gs_id = "GS-001"
    elif raw_id:
        gs_id = _clean_text(str(raw_id))
    else:
        gs_id = "GS-001"

    # 3. College / Institution
    raw_college = candidate.get("collegeName") or candidate.get("college") or candidate.get("institution") or ""
    college_name = _clean_text(raw_college)

    # 4. Registered Events (clean, deduplicated list preserving order)
    raw_events = candidate.get("registeredEvents") or candidate.get("events") or []
    if isinstance(raw_events, str):
        parts = re.split(r"[|,;]", raw_events)
    elif isinstance(raw_events, (list, tuple)):
        parts = []
        for item in raw_events:
            if isinstance(item, str):
                parts.extend(re.split(r"[|,;]", item))
            elif item is not None:
                parts.append(str(item))
    else:
        parts = []

    seen = set()
    unique_events = []
    for p in parts:
        clean_p = _clean_text(p)
        if clean_p and clean_p.lower() not in ("none", "null", "nil", "n/a", "nan"):
            if clean_p.lower() not in seen:
                seen.add(clean_p.lower())
                unique_events.append(clean_p)

    registered_events = ", ".join(unique_events)

    # 5. Dietary Preference
    raw_food = candidate.get("dietaryPreference") or candidate.get("food") or candidate.get("diet") or ""
    food_clean = _clean_text(raw_food)
    dietary_preference = "" if food_clean.lower() in ("none", "null", "nil", "n/a", "nan") else food_clean

    # 6. Date (defaults to OCT-14-2026)
    raw_date = cfg.get("date") or candidate.get("date") or DEFAULT_DATE
    date = _clean_text(str(raw_date)) if raw_date else DEFAULT_DATE

    # 7. Venue (defaults to CSE Dept)
    raw_venue = cfg.get("venue") or candidate.get("venue") or DEFAULT_VENUE
    venue = _clean_text(str(raw_venue)) if raw_venue else DEFAULT_VENUE

    return PassViewModel(
        candidate_name=candidate_name,
        gs_id=gs_id,
        college_name=college_name,
        registered_events=registered_events,
        dietary_preference=dietary_preference,
        date=date,
        venue=venue
    )


class GenoraPass(FPDF):
    def __init__(self):
        super().__init__(orientation="L", unit="mm", format=(H, W))
        reg = os.path.join(FONT_DIR, "DejaVuSans.ttf")
        bold = os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")
        mono_bold = os.path.join(FONT_DIR, "DejaVuSansMono-Bold.ttf")
        if os.path.exists(reg):
            self.add_font("DV", style="", fname=reg)
            self.add_font("DV", style="B", fname=bold)
            self.add_font("DV_MONO", style="B", fname=mono_bold)
            self._fn = "DV"
        else:
            self._fn = "Helvetica"


def _safe(t):
    return _clean_text(t)

def _fill(pdf, x, y, w, h, rgb):
    pdf.set_fill_color(*rgb)
    pdf.rect(x, y, w, h, "F")

def _text(pdf, x, y, w, h, text, fn, sz, rgb, style="B", align="L"):
    pdf.set_font(fn, style, sz)
    pdf.set_text_color(*rgb)
    pdf.set_xy(x, y)
    pdf.cell(w, h, _safe(text), align=align)

def _hline(pdf, x, y, w, rgb, lw=0.3):
    pdf.set_draw_color(*rgb)
    pdf.set_line_width(lw)
    pdf.line(x, y, x + w, y)


def _build_bg() -> str:
    tmp = os.path.join(_ROOT, "storage", "tmp")
    os.makedirs(tmp, exist_ok=True)
    out = os.path.join(tmp, "bg_final_target_blur.png")
    if os.path.exists(out):
        return out

    base = Image.open(TEMPLATE_PATH).convert("RGBA")
    pw, ph = base.size

    # Keep artwork bright and add blur
    bright = ImageEnhance.Brightness(base.convert("RGB")).enhance(0.9)
    bright = bright.filter(ImageFilter.GaussianBlur(radius=3))
    canvas = bright.convert("RGBA")

    # Only a very subtle fade at the very bottom for text readability
    fade_start = int(ph * 0.6)
    overlay = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for row in range(fade_start, ph):
        t = (row - fade_start) / max(ph - fade_start, 1)
        draw.line([(0, row), (pw, row)], fill=(0, 0, 0, int(t * 180)))

    result = Image.alpha_composite(canvas, overlay).convert("RGB")
    result.save(out, quality=98)
    return out


def _render_barcode(pdf, display_id):
    """Draw the left vertical barcode area without additional text or metadata."""
    BARCODE_W = 18
    # White background for barcode area
    _fill(pdf, 0, 0, BARCODE_W, H, C_BARCODE_BG)
    
    # Left edge small red notches (ticket tear aesthetic)
    for i in range(2, H, 6):
        pdf.set_fill_color(*C_DARK_RED)
        pdf.ellipse(-1.5, i, 3, 3, "F")

    # Draw vertical black bars (purely decorative barcode)
    rng = random.Random(display_id)
    pdf.set_fill_color(0, 0, 0)
    cy = 5
    while cy < H - 5:
        bh = rng.choice([0.6, 1.0, 1.5, 2.0, 2.5])
        if cy + bh > H - 5:
            bh = H - 5 - cy
        if rng.random() > 0.3:
            pdf.rect(3, cy, BARCODE_W - 6, bh, "F")
        cy += bh + 0.5


def generate_pdf(candidate_or_vm, event_config: dict = None, pass_id: str = "") -> str:
    """
    Render the official Genora'26 candidate entry pass PDF.
    Strictly consumes only PassViewModel containing authorized fields.
    """
    if isinstance(candidate_or_vm, PassViewModel):
        vm = candidate_or_vm
    else:
        vm = create_pass_view_model(candidate_or_vm, event_config, pass_id)

    # Use pass_id if provided (e.g. for preview UUIDs), otherwise fall back to gs_id
    effective_pass_id = pass_id if pass_id else vm.gs_id
    generated_dir = os.path.join(_ROOT, "storage", "generated")
    os.makedirs(generated_dir, exist_ok=True)
    pdf_path = os.path.join(generated_dir, f"{effective_pass_id}.pdf")

    pdf = GenoraPass()
    pdf.set_auto_page_break(False)
    pdf.add_page()
    FN = pdf._fn

    # 1. Background Artwork
    _fill(pdf, 0, 0, W, H, C_BG)
    if os.path.exists(TEMPLATE_PATH):
        pdf.image(_build_bg(), x=0, y=0, w=W, h=H)

    # 2. Left Barcode Area (strictly barcode graphic, no numbers/metadata)
    _render_barcode(pdf, vm.gs_id)

    # Content starting X coordinate (clears barcode area)
    MX = 22

    # 3. Institutional Header
    # GCE emblem circle
    pdf.set_fill_color(*C_RED)
    pdf.ellipse(MX - 2, 4.5, 12, 12, "F")
    _text(pdf, MX - 2, 8.5, 12, 4.5, "GCE", FN, 4.5, C_WHITE, "B", "C")
    
    _text(pdf, MX + 14, 6, 150, 4, INSTITUTION_LINE_1, FN, 7, C_WHITE, "B")
    _text(pdf, MX + 14, 11, 150, 3, INSTITUTION_LINE_2, FN, 5, C_GREY, "")

    _text(pdf, W - 60, 6, 50, 4, SYMPOSIUM_LINE_1, FN, 5, C_WHITE, "", "R")
    _text(pdf, W - 60, 10, 50, 4, SYMPOSIUM_LINE_2, FN, 5, C_WHITE, "", "R")

    # 4. ENTRY PASS & GS-ID
    RY = 70
    RH = 9
    _text(pdf, MX, RY + 1.5, 60, RH - 2, ENTRY_PASS_TITLE, FN, 11, C_RED, "B")
    
    # GS-ID: stylish metallic gold monospace, prominently displayed
    pdf.set_font("DV_MONO", "B", 18)
    pdf.set_text_color(*C_TRUE_GOLD)
    pdf.set_xy(W - 90, RY - 2)
    pdf.cell(80, 15, vm.gs_id, align="R")

    # 5. Candidate Name (with adaptive sizing for long names)
    NY = RY + RH + 3
    _text(pdf, MX, NY, 150, 4, LABEL_NAME, FN, 5, C_RED, "B")
    
    name_sz = 18
    pdf.set_font(FN, "B", name_sz)
    max_name_w = W - MX - 15
    while name_sz > 10 and pdf.get_string_width(vm.candidate_name) > max_name_w:
        name_sz -= 1
        pdf.set_font(FN, "B", name_sz)
    _text(pdf, MX, NY + 4, max_name_w, 9, vm.candidate_name, FN, name_sz, C_WHITE, "B")

    # 6. Divider Line
    SY = NY + 15
    _hline(pdf, MX, SY, W - MX - 10, C_DGREY, 0.4)

    # 7. Candidate Information Grid (Grid Columns)
    GY = SY + 3
    C1 = MX
    C2 = MX + 105
    C3 = MX + 155

    # COLLEGE / INSTITUTION (adaptive fitting)
    _text(pdf, C1, GY, 95, 4, LABEL_COLLEGE, FN, 5, C_RED, "B")
    col_txt = vm.college_name
    col_sz = 8
    pdf.set_font(FN, "B", col_sz)
    while col_sz > 6 and pdf.get_string_width(col_txt) > 95:
        col_sz -= 0.5
        pdf.set_font(FN, "B", col_sz)
    if pdf.get_string_width(col_txt) > 95:
        while len(col_txt) > 3 and pdf.get_string_width(col_txt + "...") > 95:
            col_txt = col_txt[:-1]
        col_txt += "..."
    _text(pdf, C1, GY + 4, 95, 5, col_txt, FN, col_sz, C_WHITE, "B")

    # REGISTERED EVENTS (safe font scaling & overflow prevention)
    _text(pdf, C2, GY, 100, 4, LABEL_EVENTS, FN, 5, C_RED, "B")
    events_txt = vm.registered_events
    ev_sz = 8
    pdf.set_font(FN, "B", ev_sz)
    while ev_sz > 5.5 and pdf.get_string_width(events_txt) > 100:
        ev_sz -= 0.5
        pdf.set_font(FN, "B", ev_sz)
    if pdf.get_string_width(events_txt) > 100:
        while len(events_txt) > 3 and pdf.get_string_width(events_txt + "...") > 100:
            events_txt = events_txt[:-1]
        events_txt += "..."
    _text(pdf, C2, GY + 4, 100, 5, events_txt, FN, ev_sz, C_WHITE, "B")

    # Row 2
    GY2 = GY + 11
    # DIETARY PREFERENCE
    _text(pdf, C1, GY2, 95, 4, LABEL_DIET, FN, 5, C_RED, "B")
    _text(pdf, C1, GY2 + 4, 95, 5, vm.dietary_preference, FN, 8, C_WHITE, "B")

    # DATE
    _text(pdf, C2, GY2, 45, 4, LABEL_DATE, FN, 5, C_RED, "B")
    _text(pdf, C2, GY2 + 4, 45, 5, vm.date, FN, 8, C_WHITE, "B")

    # VENUE
    _text(pdf, C3, GY2, 45, 4, LABEL_VENUE, FN, 5, C_RED, "B")
    _text(pdf, C3, GY2 + 4, 45, 5, vm.venue, FN, 8, C_WHITE, "B")

    pdf.output(pdf_path)
    return pdf_path

