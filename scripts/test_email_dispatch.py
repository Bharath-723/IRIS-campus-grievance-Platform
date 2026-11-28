import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from mailer import send_resolution_email

print("Testing live email dispatch...")
result = send_resolution_email(
    to_email="bharathbalu7231@gmail.com",
    recipient_name="Bharath",
    issue_title="Canteen fan repair test",
    place="CANTEEN",
    resolved_by="Facilities Maintenance Club",
    resolution_note="Replaced capacitor and blades. All fans tested and functioning properly.",
    proof_url="/api/uploads/sample_proof.jpg",
    issue_id=999
)
print("RESULT:", result)
