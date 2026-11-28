import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import get_db
from ai_advisor import generate_smart_solution

def update_all():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, representative_issue, place, ai_category FROM accepted_issues ORDER BY id")
    rows = cur.fetchall()
    print(f"Total accepted issues to check/update: {len(rows)}")

    updated = 0
    for row in rows:
        issue_id, rep_issue, place, category = row
        sol, reason = generate_smart_solution(rep_issue, place, category)
        cur.execute("""
            UPDATE accepted_issues
            SET ai_suggested_solution = %s,
                ai_reason = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (sol, reason, issue_id))
        updated += 1
        print(f"Updated Issue #{issue_id} ({rep_issue[:25]}...): {sol[:50]}...")

    conn.commit()
    conn.close()
    print(f"Successfully updated AI solutions for all {updated} issues.")

if __name__ == '__main__':
    update_all()
