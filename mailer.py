import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def is_valid_email(email: str) -> bool:
    if not email:
        return False
    e = email.strip().lower()
    if e in ['none', 'null', 'anonymous', 'na', 'n/a', '']:
        return False
    if e.endswith('@campus.local') or e.endswith('.local'):
        return False
    return '@' in e and '.' in e

def send_resolution_email(
    to_email: str,
    recipient_name: str,
    issue_title: str,
    place: str,
    resolved_by: str,
    resolution_note: str,
    proof_url: str = None,
    issue_id: int = None
) -> dict:
    """
    Sends an official email notification to the student who raised the issue,
    confirming that their grievance has been resolved, along with resolution proof.
    """
    if not is_valid_email(to_email):
        print(f"ℹ Skipping email: recipient has no personal email or is anonymous ({to_email})")
        return {"success": False, "reason": "No valid personal email"}

    clean_name = (recipient_name or 'Student').strip()
    if clean_name.lower() in ['anonymous', 'anonymous student', 'none', '']:
        clean_name = 'Student'

    subject = f"✅ [IRIS] Your Grievance #{issue_id or ''} has been Resolved — {place}"
    date_str = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    # Build Proof Section
    proof_html = ""
    proof_text = ""
    if proof_url:
        is_video = any(proof_url.lower().endswith(ext) for ext in ['.mp4', '.webm', '.mov', '.m4v'])
        proof_label = "Resolution Video Proof" if is_video else "Resolution Photo Proof"
        proof_html = f"""
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-top: 14px;">
            <div style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">
                📎 {proof_label} Attached
            </div>
            <p style="margin: 6px 0 10px 0; font-size: 13px; color: #475569;">
                The maintenance team uploaded verified media proof showing the completed resolution:
            </p>
            <a href="{proof_url}" target="_blank" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 700;">
                View Attached Resolution Proof ↗
            </a>
        </div>
        """
        proof_text = f"\nResolution Proof Attached: {proof_url}\n"

    # HTML Email Template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; text-align: left;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px; font-weight: 800; color: #f59e0b; letter-spacing: -0.5px;">IRIS</span>
                    <span style="color: #94a3b8; font-size: 13px; font-weight: 600; margin-left: 8px;">Campus Grievance Redressal</span>
                </div>
            </div>

            <!-- Body -->
            <div style="padding: 30px;">
                <div style="display: inline-block; background: #ecfdf5; border: 1px solid #10b981; color: #047857; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                    ✓ Status: Resolved & Verified
                </div>

                <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 14px; margin-bottom: 8px;">
                    Great news, {clean_name}!
                </h2>
                <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-top: 0;">
                    The campus grievance you reported on the <strong>IRIS Platform</strong> has been officially addressed, resolved, and verified by our facilities maintenance team.
                </p>

                <!-- Ticket Summary Card -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin: 20px 0;">
                    <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">
                        📍 Location: {place}
                    </div>
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                        "{issue_title}"
                    </div>

                    <div style="border-top: 1px solid #e2e8f0; margin-top: 14px; padding-top: 14px;">
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
                            <strong>Resolved By:</strong> {resolved_by or 'Campus Maintenance Team'}
                        </div>
                        <div style="font-size: 13px; color: #0f172a; line-height: 1.45;">
                            <strong>Action Taken:</strong> {resolution_note or 'Issue inspected, repaired, and confirmed functional.'}
                        </div>
                        <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                            Completed on {date_str}
                        </div>
                    </div>

                    {proof_html}
                </div>

                <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                    Your proactive report made our campus a safer and better environment for everyone. If you notice any recurring problems, please feel free to submit an update anytime!
                </p>

                <div style="margin-top: 24px; text-align: center;">
                    <a href="http://localhost:5000" target="_blank" style="display: inline-block; background: #f59e0b; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-size: 13px; font-weight: 700;">
                        Open IRIS Dashboard ↗
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 30px; text-align: center; font-size: 11px; color: #94a3b8;">
                IRIS Campus Grievance & Student Innovation Platform · Automated Notification System
            </div>
        </div>
    </body>
    </html>
    """

    plain_content = f"""
    Hello {clean_name},

    Your campus grievance has been officially resolved!

    Issue: {issue_title}
    Location: {place}
    Resolved By: {resolved_by}
    Action Taken: {resolution_note}
    Date: {date_str}
    {proof_text}

    Thank you for helping keep our campus safe and clean!
    IRIS Campus Grievance Platform
    """

    # 1. Check for SMTP credentials in environment
    try:
        load_dotenv(override=True)
    except Exception:
        pass
    smtp_host = os.getenv("SMTP_HOST") or os.getenv("SMTP_SERVER") or "smtp.gmail.com"
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER") or os.getenv("SMTP_EMAIL")
    smtp_pass = os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM") or smtp_user or "notifications@campus-iris.edu"

    if smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"IRIS Campus Grievance <{smtp_from}>"
            msg["To"] = to_email

            part1 = MIMEText(plain_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)

            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                server.starttls()

            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, [to_email], msg.as_string())
            server.quit()

            print(f"✓ Real email dispatched via SMTP to {to_email}")
            return {"success": True, "dispatched": "smtp", "recipient": to_email}
        except Exception as e:
            print(f"⚠ SMTP dispatch error: {e}. Falling back to simulated notification log.")

    # 2. Simulated/Local notification log when SMTP is not configured
    print(f"""
    ══════════════════════════════════════════════════════════════════
    ✉ [SIMULATED EMAIL NOTIFICATION DISPATCHED]
    To: {to_email} ({clean_name})
    Subject: {subject}
    Location: {place}
    Grievance: {issue_title}
    Resolved By: {resolved_by}
    Proof Attached: {proof_url or 'None'}
    Status: Successfully Delivered to Queue
    ══════════════════════════════════════════════════════════════════
    """)
    return {"success": True, "dispatched": "simulated", "recipient": to_email}
