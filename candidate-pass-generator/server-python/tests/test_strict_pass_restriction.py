"""
Automated Test Suite: Strict Pass Content Restriction for Genora'26
Verifies that:
1. Pass presentation model strictly exposes only the 7 permitted fields.
2. PDF text extraction confirms presence of all authorized fields and headers.
3. PDF text extraction confirms ZERO leakage of prohibited fields:
   - candidate email
   - phone / mobile
   - registration number
   - team name
   - team leader name / email
   - team member list
   - payment status / UPI ID / transaction ID / screenshot URL
   - accommodation preference
   - WhatsApp status
   - timestamp
   - internal DB IDs / debug info
   - undefined / null / None
4. Deduplication of registered events functions properly.
5. Real data row from Genora'26 Registration Form (Responses).xlsx is tested and verified.
"""
import os
import sys
import unittest
import PyPDF2

# Add server-python to path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_PYTHON_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
ROOT_DIR = os.path.abspath(os.path.join(SERVER_PYTHON_DIR, ".."))
if SERVER_PYTHON_DIR not in sys.path:
    sys.path.insert(0, SERVER_PYTHON_DIR)

from services.pdf_generator import (
    create_pass_view_model,
    generate_pdf,
    PassViewModel,
    INSTITUTION_LINE_1,
    INSTITUTION_LINE_2,
    SYMPOSIUM_LINE_1,
    SYMPOSIUM_LINE_2,
    ENTRY_PASS_TITLE,
    LABEL_NAME,
    LABEL_COLLEGE,
    LABEL_EVENTS,
    LABEL_DIET,
    LABEL_DATE,
    LABEL_VENUE,
    DEFAULT_DATE,
    DEFAULT_VENUE,
)
from services.csv_parser import parse_csv


class TestStrictPassContentRestriction(unittest.TestCase):

    def setUp(self):
        self.sensitive_candidate = {
            "candidateId": "cand-uuid-12345-leakcheck",
            "name": "Aarav Kumar",
            "email": "aarav.leak_secret@example.com",
            "phone": "+91-9876543210",
            "college": "ABC Engineering College",
            "events": ["Reel & Rhythm", "Code Clash", "Reel & Rhythm"],  # Contains duplicate
            "food": "Veg",
            "registrationId": "REG-SECRET-998877",
            "teamName": "SecretCyberWarriors",
            "teamLeader": "Sneha Leader",
            "teamLeaderEmail": "leader.secret@example.com",
            "teamMembers": "Rohan, Priya, Vikram",
            "paymentStatus": "VERIFIED_PAID",
            "upiId": "aarav@oksbi_secret",
            "transactionId": "TXN_SECRET_987654321",
            "screenshotUrl": "https://drive.google.com/open?id=SECRET_SCREENSHOT_LINK",
            "accommodation": "Need Hostel AC Room",
            "whatsappJoined": "Yes Joined Genora Group",
            "timestamp": "2026-10-12 18:00:00",
            "internalDbId": "DB_REC_INTERNAL_0099",
            "debugInfo": "DEBUG_LEAK_CANARY_VALUE",
            "verificationUrl": "https://genora.edu/verify/secret_token_123",
            "rawData": {"raw_col_1": "raw_val_leak"},
        }
        self.event_config = {
            "date": "OCT-14-2026",
            "venue": "CSE Dept",
        }

    def test_01_view_model_fields_restriction(self):
        """PassViewModel must ONLY expose the 7 permitted fields."""
        vm = create_pass_view_model(self.sensitive_candidate, self.event_config, "GS-001")
        self.assertIsInstance(vm, PassViewModel)

        # Permitted fields
        self.assertEqual(vm.candidate_name, "Aarav Kumar")
        self.assertEqual(vm.gs_id, "GS-001")
        self.assertEqual(vm.college_name, "ABC Engineering College")
        self.assertEqual(vm.registered_events, "Reel & Rhythm, Code Clash")  # deduplicated
        self.assertEqual(vm.dietary_preference, "Veg")
        self.assertEqual(vm.date, "OCT-14-2026")
        self.assertEqual(vm.venue, "CSE Dept")

        # Assert no forbidden fields exist on the dataclass instance
        forbidden_attributes = [
            "email", "phone", "registrationId", "teamName", "teamLeader",
            "teamLeaderEmail", "teamMembers", "paymentStatus", "upiId",
            "transactionId", "screenshotUrl", "accommodation", "whatsappJoined",
            "timestamp", "internalDbId", "debugInfo", "verificationUrl", "rawData"
        ]
        for attr in forbidden_attributes:
            self.assertFalse(hasattr(vm, attr), f"PassViewModel illegally exposes attribute: {attr}")

    def test_02_pdf_contains_all_required_visible_content(self):
        """Generated pass PDF must contain institutional headers, event branding, and candidate details."""
        pdf_path = generate_pdf(self.sensitive_candidate, self.event_config, "test-pass-001")
        self.assertTrue(os.path.exists(pdf_path))

        reader = PyPDF2.PdfReader(pdf_path)
        extracted_text = " ".join(page.extract_text() for page in reader.pages)

        # 1. Institutional Header
        self.assertIn("GOVERNMENT COLLEGE OF ENGINEERING, TIRUNELVELI", extracted_text)
        self.assertIn("DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING", extracted_text)
        self.assertIn("NATIONAL LEVEL", extracted_text)
        self.assertIn("TECHNICAL SYMPOSIUM", extracted_text)

        # 2. Event Branding & Identification
        self.assertIn("ENTRY PASS", extracted_text)
        self.assertIn("test-pass-001", extracted_text)

        # 3. Candidate Details Labels & Values
        self.assertIn("NAME", extracted_text)
        self.assertIn("Aarav Kumar", extracted_text)

        self.assertIn("COLLEGE / INSTITUTION", extracted_text)
        self.assertIn("ABC Engineering College", extracted_text)

        self.assertIn("REGISTERED EVENTS", extracted_text)
        self.assertIn("Reel & Rhythm, Code Clash", extracted_text)

        self.assertIn("DIETARY PREFERENCE", extracted_text)
        self.assertIn("Veg", extracted_text)

        self.assertIn("DATE", extracted_text)
        self.assertIn("OCT-14-2026", extracted_text)

        self.assertIn("VENUE", extracted_text)
        self.assertIn("CSE Dept", extracted_text)

    def test_03_pdf_strictly_excludes_all_forbidden_content(self):
        """Generated pass PDF must have ZERO occurrences of prohibited candidate data."""
        pdf_path = generate_pdf(self.sensitive_candidate, self.event_config, "test-pass-leak")
        reader = PyPDF2.PdfReader(pdf_path)
        extracted_text = " ".join(page.extract_text() for page in reader.pages)

        forbidden_values = [
            "aarav.leak_secret@example.com",
            "+91-9876543210",
            "9876543210",
            "REG-SECRET-998877",
            "SecretCyberWarriors",
            "Sneha Leader",
            "leader.secret@example.com",
            "Rohan",
            "Priya",
            "Vikram",
            "VERIFIED_PAID",
            "aarav@oksbi_secret",
            "TXN_SECRET_987654321",
            "SECRET_SCREENSHOT_LINK",
            "Need Hostel AC Room",
            "Yes Joined Genora Group",
            "2026-10-12 18:00:00",
            "DB_REC_INTERNAL_0099",
            "DEBUG_LEAK_CANARY_VALUE",
            "secret_token_123",
            "raw_val_leak",
            "undefined",
            "null",
            "None",
        ]

        for forbidden in forbidden_values:
            self.assertNotIn(
                forbidden,
                extracted_text,
                f"LEAK DETECTED! Forbidden value '{forbidden}' was found in the generated pass text!"
            )

    def test_04_missing_optional_fields_cleanly_handled(self):
        """Missing or None fields must not render 'None', 'undefined', or 'null'."""
        minimal_candidate = {
            "name": "Jane Doe",
            "college": None,
            "food": None,
            "events": None,
        }
        pdf_path = generate_pdf(minimal_candidate, {}, "GS-002")
        reader = PyPDF2.PdfReader(pdf_path)
        extracted_text = " ".join(page.extract_text() for page in reader.pages)

        self.assertIn("Jane Doe", extracted_text)
        self.assertIn("OCT-14-2026", extracted_text)
        self.assertIn("CSE Dept", extracted_text)
        self.assertNotIn("None", extracted_text)
        self.assertNotIn("null", extracted_text)
        self.assertNotIn("undefined", extracted_text)

    def test_05_real_excel_registration_record_validation(self):
        """Test with an actual candidate record from the Genora'26 Excel workbook."""
        excel_path = os.path.join(ROOT_DIR, "Genora'26 Registration Form (Responses).xlsx")
        self.assertTrue(os.path.exists(excel_path), f"Excel file not found at: {excel_path}")

        rows = parse_csv(excel_path)
        self.assertGreater(len(rows), 0, "Excel file returned 0 rows")

        # Test first row
        row = rows[0]
        # Build normalized candidate representing this row
        events = []
        for key in ["Technical Event 1", "Technical Event 2", "Non Technical Event"]:
            val = row.get(key, "").strip()
            if val and val.lower() not in ("none", "null", "nil"):
                events.append(val)

        excel_candidate = {
            "candidateId": "cand-excel-001",
            "name": row.get("Name", ""),
            "email": row.get("Email Address") or row.get("Email ID", ""),
            "phone": row.get("Mobile No.", ""),
            "college": row.get("College Name", ""),
            "events": events,
            "food": row.get("Food Details", ""),
            "registrationId": row.get("Register No.", ""),
            "rawData": row,
        }

        pdf_path = generate_pdf(excel_candidate, self.event_config, "GS-001")
        reader = PyPDF2.PdfReader(pdf_path)
        extracted_text = " ".join(page.extract_text() for page in reader.pages)

        # Assert permitted fields are displayed
        self.assertIn(excel_candidate["name"], extracted_text)
        self.assertIn(excel_candidate["college"], extracted_text)
        self.assertIn(excel_candidate["food"], extracted_text)
        for ev in events:
            self.assertIn(ev, extracted_text)

        # Assert sensitive excel fields are strictly excluded
        self.assertNotIn(excel_candidate["email"], extracted_text)
        if excel_candidate["phone"]:
            self.assertNotIn(str(excel_candidate["phone"]), extracted_text)
        upi = row.get("Your UPI ID", "").strip()
        if upi and len(upi) > 4:
            self.assertNotIn(upi, extracted_text)
        txn = row.get("Transaction ID", "").strip()
        if txn and len(txn) > 4:
            self.assertNotIn(txn, extracted_text)
        screenshot = row.get("Upload your transaction Screenshot", "").strip()
        if screenshot and "drive.google.com" in screenshot:
            self.assertNotIn("drive.google.com", extracted_text)


if __name__ == "__main__":
    unittest.main()
