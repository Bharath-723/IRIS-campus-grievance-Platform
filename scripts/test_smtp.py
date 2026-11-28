import os
import smtplib
from dotenv import load_dotenv

load_dotenv()

smtp_host = os.getenv("SMTP_HOST") or "smtp.gmail.com"
smtp_port = int(os.getenv("SMTP_PORT", 587))
smtp_user = os.getenv("SMTP_USER") or os.getenv("SMTP_EMAIL")
smtp_pass = os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD")
smtp_from = os.getenv("SMTP_FROM") or smtp_user

print("SMTP Host:", smtp_host)
print("SMTP Port:", smtp_port)
print("SMTP User:", smtp_user)
print("SMTP From:", smtp_from)
print("Password length:", len(smtp_pass) if smtp_pass else 0)

if not smtp_user or not smtp_pass:
    print("ERROR: SMTP_USER or SMTP_PASS is missing in .env!")
    exit(1)

try:
    if smtp_port == 465:
        server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
    else:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
    
    server.login(smtp_user, smtp_pass)
    print("SUCCESS: SMTP Authentication succeeded! Connected as:", smtp_user)
    server.quit()
except Exception as e:
    print("FAILED to authenticate with SMTP server:", type(e).__name__, str(e))
