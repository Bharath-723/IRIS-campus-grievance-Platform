import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import get_db

conn = get_db()
cur = conn.cursor()

cur.execute("SELECT id, issue, place, full_name, email, is_duplicate FROM raw_submissions WHERE issue ILIKE '%dustbin%'")
raw_rows = cur.fetchall()
print("RAW SUBMISSIONS:")
for r in raw_rows:
    print(r)

cur.execute("SELECT id, representative_issue, place, frequency, status, first_raiser_name, first_raiser_email FROM accepted_issues WHERE representative_issue ILIKE '%dustbin%' OR place ILIKE '%parking%'")
acc_rows = cur.fetchall()
print("ACCEPTED ISSUES:")
for r in acc_rows:
    print(r)

conn.close()
