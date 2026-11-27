"""
Export existing responses from MS SQL Server (studentdb) to your new Google Sheet.
Run this script if you want all 25 previous student responses from MS SQL Server
to appear directly in your Google Sheet.
"""
import pyodbc
from sync import get_sheet

MSSQL_CONFIG = (
    "DRIVER={SQL Server};"
    "SERVER=.\\SQLEXPRESS;"
    "DATABASE=studentdb;"
    "Trusted_Connection=yes;"
)

def export_to_sheet():
    print("=" * 60)
    print("  Exporting MS SQL Server (studentdb) → Google Sheet")
    print("=" * 60)

    print("\n[1/3] Reading from MS SQL Server (.\\SQLEXPRESS)...")
    try:
        conn = pyodbc.connect(MSSQL_CONFIG, timeout=5)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT submitted_at, full_name, email, place, '' as others,
                   CAST(issue AS VARCHAR(MAX)) as issue,
                   severity_level, issue_duration, media_url,
                   CAST(solution AS VARCHAR(MAX)) as solution,
                   CASE WHEN wants_reward = 1 THEN 'Yes' ELSE 'No' END as reward
            FROM raw_submissions
            ORDER BY id ASC
        """)
        rows = cursor.fetchall()
        conn.close()
        print(f"  ✓ Found {len(rows)} responses in MS SQL Server.")
    except Exception as e:
        print(f"  ❌ Could not read MS SQL Server: {e}")
        return

    print("\n[2/3] Connecting to Google Sheet...")
    try:
        sheet = get_sheet()
        print(f"  ✓ Connected to sheet: '{sheet.title}'")
    except Exception as e:
        print(f"  ❌ Could not connect to Google Sheet: {e}")
        return

    print(f"\n[3/3] Appending {len(rows)} responses to Google Sheet...")
    formatted_rows = []
    for r in rows:
        formatted_rows.append([
            str(r[0]) if r[0] else "",
            r[1] or "",
            r[2] or "",
            r[3] or "",
            r[4] or "",
            r[5] or "",
            r[6] or "",
            r[7] or "",
            r[8] or "",
            r[9] or "",
            r[10] or ""
        ])

    try:
        sheet.append_rows(formatted_rows)
        print(f"\n🎉 SUCCESS: Added {len(formatted_rows)} responses to your Google Sheet!")
    except Exception as e:
        print(f"  ❌ Failed to append rows: {e}")

if __name__ == "__main__":
    export_to_sheet()
