"""Email service: sends the PDF pass to the candidate via SMTP."""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders


def send_pass_email(candidate: dict, pdf_path: str, event_config: dict) -> None:
    """Send pass PDF to candidate's email. Raises on failure."""
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user)

    if not smtp_user or not smtp_pass:
        raise ValueError("SMTP credentials not configured in .env")

    event_name = event_config.get("eventName", "The Event")
    candidate_name = candidate.get("name", "Participant")
    to_email = candidate["email"]

    # Build email
    msg = MIMEMultipart()
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg["Subject"] = f"Your Entry Pass for {event_name} 🎟️"

    body = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">{event_name}</h1>
  </div>
  <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
    <p>Dear <strong>{candidate_name}</strong>,</p>
    <p>Thank you for registering! Your personalized entry pass is attached to this email as a PDF.</p>
    <p>Please present this pass at the event entrance. The QR code will be scanned for verification.</p>
    <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>📅 Date:</strong> {event_config.get('date', 'TBD')}</p>
      <p style="margin: 8px 0 0;"><strong>📍 Venue:</strong> {event_config.get('venue', 'TBD')}</p>
    </div>
    <p>See you there!</p>
  </div>
  <div style="background: #1e3a8a; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
    <p style="color: #93c5fd; font-size: 12px; margin: 0;">{event_config.get('organization', '')}</p>
  </div>
</body>
</html>
"""
    msg.attach(MIMEText(body, "html"))

    # Attach PDF
    with open(pdf_path, "rb") as f:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(f.read())
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", f'attachment; filename="pass-{candidate_name}.pdf"')
    msg.attach(part)

    # Send
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, to_email, msg.as_string())
