import gspread
from google.oauth2.service_account import Credentials
import pyodbc
import hashlib
import time
import re
import json
import urllib.request
from datetime import datetime

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SHEET_ID           = "1eyaSoucDJrBlCnwFtg0Q7gjD42Azu5cQ-DvsfGN_rlk"
CREDENTIALS        = "credentials.json"
GEMINI_API_KEY     = "AIzaSyADagnWrlJsYpd5UfMuvEIUWc6buKzIjpM"
GEMINI_URL         = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
)

DB_CONFIG = (
    "DRIVER={SQL Server};"
    "SERVER=.\\SQLEXPRESS;"
    "DATABASE=studentdb;"
    "Trusted_Connection=yes;"
)

SYNC_INTERVAL      = 30
MAJORITY_THRESHOLD = 3   # change to 3 for production
# ──────────────────────────────────────────────────────────────────────────────


# ─── GEMINI HELPER ────────────────────────────────────────────────────────────
GEMINI_AVAILABLE = True  # flips False on 429, resets each sync cycle

def gemini_ask(prompt):
    global GEMINI_AVAILABLE
    if not GEMINI_AVAILABLE:
        return None
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}]
    }).encode("utf-8")
    req = urllib.request.Request(
        GEMINI_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print(f"  ⚠ Gemini rate limit hit — skipping AI this cycle, will retry next cycle.")
            GEMINI_AVAILABLE = False
        else:
            print(f"  ⚠ Gemini HTTP error: {e.code}")
        return None
    except Exception as e:
        print(f"  ⚠ Gemini error: {e}")
        return None


def ai_analyze_issue(issue_text, place):
    """
    Returns: category, priority_score, ai_suggested_solution
    AI generates its OWN solution + picks category + scores priority.
    """
    prompt = f"""You are an AI assistant for a college campus issue management system.

Analyze this campus issue and respond ONLY with a valid JSON object, no markdown, no extra text:

Issue: "{issue_text}"
Location: "{place}"

JSON format (strictly follow this):
{{
  "category": "Infrastructure",
  "priority_score": 8,
  "ai_suggested_solution": "Contact the electrical department to inspect and replace faulty wiring within 24 hours."
}}

Rules:
- category: MUST be exactly one of: Infrastructure, Hygiene, Technology, Safety, Admin
- priority_score: integer 1 to 10 (10 = most critical)
- ai_suggested_solution: AI's own practical solution in 1 clear sentence, max 20 words, actionable and specific to the issue
- Return ONLY the JSON object, absolutely nothing else"""

    response = gemini_ask(prompt)
    if not response:
        return "Infrastructure", 5, "Refer to facilities management for immediate inspection."
    try:
        clean = response.replace("```json", "").replace("```", "").strip()
        # Handle cases where Gemini adds extra text
        start = clean.find("{")
        end   = clean.rfind("}") + 1
        if start >= 0 and end > start:
            clean = clean[start:end]
        data  = json.loads(clean)
        cat   = data.get("category", "Infrastructure")
        if cat not in ["Infrastructure", "Hygiene", "Technology", "Safety", "Admin"]:
            cat = "Infrastructure"
        score = min(10, max(1, int(data.get("priority_score", 5))))
        sol   = data.get("ai_suggested_solution", "Refer to facilities management for inspection.")
        print(f"     → [{cat}] Priority:{score}/10 | AI solution: {sol[:60]}...")
        return cat, score, sol
    except Exception as e:
        print(f"  ⚠ Gemini parse error: {e} | raw: {response[:100]}")
        return "Infrastructure", 5, "Refer to facilities management for immediate inspection."


def ai_pick_best_solution(issue_text, solutions):
    """
    AI evaluates all student solutions and picks the best one.
    Returns: best_solution_id, reason, score_dict
    """
    if not solutions:
        return None, None, {}

    sol_list = "\n".join([
        f"{i+1}. [ID:{s['id']}] {s['submitter_name'] or 'Anonymous'}: {s['solution_text']}"
        for i, s in enumerate(solutions)
    ])

    prompt = f"""You are evaluating student-submitted solutions for a college campus issue.

Issue: "{issue_text}"

Student solutions:
{sol_list}

Pick the BEST solution. Respond ONLY with valid JSON, no extra text:
{{
  "best_solution_id": 2,
  "reason": "Most practical and achievable within college resources.",
  "scores": {{
    "1": 6,
    "2": 9,
    "3": 4
  }}
}}

Rules:
- best_solution_id: must be the exact ID number shown in [ID:X]
- reason: under 12 words explaining why it is best
- scores: map each solution ID (as string) to a score 1-10
- Return ONLY the JSON, nothing else"""

    response = gemini_ask(prompt)
    if not response:
        return solutions[0]["id"], "First submitted solution selected as default.", {str(s["id"]): 5 for s in solutions}
    try:
        clean = response.replace("```json", "").replace("```", "").strip()
        start = clean.find("{")
        end   = clean.rfind("}") + 1
        if start >= 0 and end > start:
            clean = clean[start:end]
        data    = json.loads(clean)
        best_id = int(data.get("best_solution_id", solutions[0]["id"]))
        reason  = data.get("reason", "Best available solution.")
        scores  = data.get("scores", {})
        print(f"     → Best solution ID:{best_id} | {reason}")
        return best_id, reason, scores
    except Exception as e:
        print(f"  ⚠ Gemini solution parse error: {e} | raw: {response[:100]}")
        return solutions[0]["id"], "First submitted solution selected.", {}


# ─── DB HELPERS ───────────────────────────────────────────────────────────────
def get_sheet():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly"
    ]
    creds  = Credentials.from_service_account_file(CREDENTIALS, scopes=scopes)
    client = gspread.authorize(creds)
    return client.open_by_key(SHEET_ID).sheet1


def get_db():
    return pyodbc.connect(DB_CONFIG)


def normalize(text):
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text


def make_hash(text):
    return hashlib.sha256(normalize(text).encode()).hexdigest()


def already_synced(cursor, submitted_at, email):
    cursor.execute("""
        SELECT COUNT(*) FROM raw_submissions
        WHERE submitted_at = ? AND email = ?
    """, submitted_at, email)
    return cursor.fetchone()[0] > 0


def parse_timestamp(ts):
    formats = ["%m/%d/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S"]
    for fmt in formats:
        try:
            return datetime.strptime(ts, fmt)
        except Exception:
            continue
    return datetime.now()


def convert_drive_url(url):
    if not url:
        return None
    if "drive.google.com" in url:
        match = re.search(r'id=([a-zA-Z0-9_-]+)', url)
        if match:
            return f"https://drive.google.com/thumbnail?id={match.group(1)}&sz=w800"
    return url


# ─── CORE SYNC FUNCTIONS ──────────────────────────────────────────────────────
def insert_submission(cursor, row):
    def safe(pos):
        val = row[pos].strip() if len(row) > pos else ""
        return val if val else None

    timestamp  = safe(0)
    name       = safe(1)
    email      = safe(2)
    location   = safe(3)
    others     = safe(4)
    issue      = safe(5)
    severity   = safe(6)
    duration   = safe(7)
    proof      = safe(8)
    solution   = safe(9)
    reward_raw = safe(10)

    if not issue or not email:
        print("  ⚠ Skipping row — missing required issue or email.")
        return False

    place        = others if not location else location
    wants_reward = 1 if str(reward_raw or "").strip().lower() == "yes" else 0
    media_url    = convert_drive_url(proof)
    submitted_at = parse_timestamp(timestamp) if timestamp else datetime.now()

    if already_synced(cursor, submitted_at, email):
        print(f"  ~ Already synced: {email}")
        return False

    text_hash = make_hash(issue)

    # ── Call Gemini AI ──
    print(f"  🤖 AI analyzing: {issue[:50]}...")
    category, priority, ai_solution = ai_analyze_issue(
        issue, place or "Campus"
    )

    cursor.execute("""
        INSERT INTO raw_submissions
            (full_name, email, place, issue, severity_level,
             issue_duration, media_url, solution, wants_reward,
             text_hash, submitted_at, ai_category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, name, email, place, issue, severity,
         duration, media_url, solution, wants_reward,
         text_hash, submitted_at, category)

    print(f"  + Inserted: [{severity}|{category}] {issue[:40]}... by {email}")
    return True


def mark_duplicates(cursor):
    cursor.execute("UPDATE raw_submissions SET is_duplicate = 0")
    cursor.execute("""
        UPDATE raw_submissions SET is_duplicate = 1
        WHERE id NOT IN (
            SELECT MIN(id) FROM raw_submissions GROUP BY text_hash
        )
    """)


def run_majority_filter(cursor):
    cursor.execute("""
        INSERT INTO accepted_issues
            (place, representative_issue, severity_level,
             issue_duration, frequency,
             first_raiser_name, first_raiser_email,
             media_url, ai_category)
        SELECT
            rs.place,
            CAST(rs.issue AS VARCHAR(MAX)),
            MAX(rs.severity_level),
            MAX(rs.issue_duration),
            COUNT(*),
            first_rs.full_name,
            first_rs.email,
            first_rs.media_url,
            first_rs.ai_category
        FROM raw_submissions rs
        JOIN (
            SELECT text_hash, MIN(id) AS min_id
            FROM raw_submissions GROUP BY text_hash
        ) first_row ON rs.text_hash = first_row.text_hash
        JOIN raw_submissions first_rs ON first_rs.id = first_row.min_id
        WHERE rs.is_duplicate = 0
        GROUP BY rs.text_hash, rs.place,
                 CAST(rs.issue AS VARCHAR(MAX)),
                 first_rs.full_name, first_rs.email,
                 first_rs.media_url, first_rs.ai_category
        HAVING COUNT(*) >= ?
        AND NOT EXISTS (
            SELECT 1 FROM accepted_issues ai
            WHERE CAST(ai.representative_issue AS VARCHAR(MAX))
                = CAST(rs.issue AS VARCHAR(MAX))
        )
    """, MAJORITY_THRESHOLD)


def sync_solutions(cursor):
    cursor.execute("""
        INSERT INTO solutions
            (issue_id, submitter_name, submitter_email, solution_text, wants_reward)
        SELECT
            ai.id, rs.full_name, rs.email,
            CAST(rs.solution AS VARCHAR(MAX)), rs.wants_reward
        FROM raw_submissions rs
        JOIN accepted_issues ai
            ON CAST(ai.representative_issue AS VARCHAR(MAX))
             = CAST(rs.issue AS VARCHAR(MAX))
        WHERE rs.solution IS NOT NULL AND rs.solution != ''
          AND NOT EXISTS (
              SELECT 1 FROM solutions s
              WHERE s.submitter_email = rs.email AND s.issue_id = ai.id
          )
    """)


def run_ai_enrichment(cursor):
    """
    For each accepted issue:
    1. Generate AI suggested solution + category + priority (if missing)
    2. Pick best student solution from submissions
    Processes max 10 issues per sync cycle to avoid Gemini 429 rate limit.
    """
    AI_DELAY       = 5    # seconds between each Gemini call
    MAX_PER_CYCLE  = 10   # max issues to process per 30s sync cycle

    # ── Step 1: AI enrichment for issues missing ai_suggested_solution ──
    cursor.execute("""
        SELECT TOP 10 id,
               CAST(representative_issue AS VARCHAR(MAX)) AS issue,
               place, ai_category
        FROM accepted_issues
        WHERE ai_suggested_solution IS NULL
           OR ai_category IS NULL
           OR ai_category = 'Uncategorized'
    """)
    issues_to_enrich = cursor.fetchall()

    enriched = 0
    for issue_id, issue_text, place, existing_cat in issues_to_enrich:
        if enriched >= MAX_PER_CYCLE:
            print(f"  ⏸ Rate limit pause — will continue next sync cycle.")
            break
        print(f"  🤖 AI enriching issue #{issue_id}: {issue_text[:40]}...")
        category, priority, ai_solution = ai_analyze_issue(
            issue_text, place or "Campus"
        )
        cursor.execute("""
            UPDATE accepted_issues
            SET ai_category           = ?,
                ai_priority_score     = ?,
                ai_suggested_solution = ?
            WHERE id = ?
        """, category, priority, ai_solution, issue_id)
        enriched += 1
        time.sleep(AI_DELAY)   # wait 5s between calls → max 12/min safely

    # ── Step 2: Pick best student solution for issues not yet evaluated ──
    cursor.execute("""
        SELECT TOP 5 id, CAST(representative_issue AS VARCHAR(MAX)) AS issue
        FROM accepted_issues
        WHERE ai_best_solution_id IS NULL
    """)
    issues_for_picker = cursor.fetchall()

    for issue_id, issue_text in issues_for_picker:
        cursor.execute("""
            SELECT id, submitter_name,
                   CAST(solution_text AS VARCHAR(MAX)) AS solution_text
            FROM solutions
            WHERE issue_id = ?
              AND solution_text IS NOT NULL
              AND solution_text != ''
        """, issue_id)
        rows = cursor.fetchall()
        if not rows:
            continue

        solutions = [
            {"id": r[0], "submitter_name": r[1], "solution_text": r[2]}
            for r in rows
        ]

        print(f"  🤖 AI picking best solution for issue #{issue_id}...")
        best_id, reason, scores = ai_pick_best_solution(issue_text, solutions)

        # Update scores on all solutions
        for sol in solutions:
            score = int(scores.get(str(sol["id"]), scores.get(sol["id"], 5)))
            cursor.execute(
                "UPDATE solutions SET ai_score = ?, ai_selected = 0 WHERE id = ?",
                score, sol["id"]
            )

        # Mark the AI-selected best solution
        cursor.execute(
            "UPDATE solutions SET ai_selected = 1, is_unique = 1 WHERE id = ?",
            best_id
        )

        # Get best solution text
        cursor.execute(
            "SELECT CAST(solution_text AS VARCHAR(MAX)) FROM solutions WHERE id = ?",
            best_id
        )
        row = cursor.fetchone()
        best_text = row[0] if row else ""

        # Save to accepted_issues
        cursor.execute("""
            UPDATE accepted_issues
            SET ai_best_solution    = ?,
                ai_best_solution_id = ?,
                ai_reason           = ?
            WHERE id = ?
        """, best_text, best_id, reason, issue_id)
        time.sleep(AI_DELAY)  # wait between calls


# ─── MAIN SYNC LOOP ───────────────────────────────────────────────────────────
def sync():
    global GEMINI_AVAILABLE
    GEMINI_AVAILABLE = True  # reset each cycle
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Syncing Google Sheet → SQL Server...")

    try:
        sheet = get_sheet()
        rows  = sheet.get_all_values()
    except Exception as e:
        print(f"  ✗ Could not read Google Sheet: {e}")
        return

    if len(rows) < 2:
        print("  No responses yet.")
        return

    data = rows[1:]
    print(f"  Found {len(data)} response(s) in sheet.")

    try:
        conn   = get_db()
        cursor = conn.cursor()
    except Exception as e:
        print(f"  ✗ DB connection failed: {e}")
        return

    # Insert new submissions
    new_count = 0
    for i, row in enumerate(data):
        try:
            if insert_submission(cursor, row):
                new_count += 1
        except Exception as e:
            print(f"  ⚠ Row {i+2} error: {e}")
    print(f"  ✓ {new_count} new submission(s) inserted.")

    # Dedup
    try:
        mark_duplicates(cursor)
        print("  ✓ Duplicates marked.")
    except Exception as e:
        print(f"  ⚠ Dedup error: {e}")

    # Majority filter
    try:
        run_majority_filter(cursor)
        print("  ✓ Majority filter applied.")
    except Exception as e:
        print(f"  ⚠ Majority filter error: {e}")

    # Sync solutions
    try:
        sync_solutions(cursor)
        print("  ✓ Solutions synced.")
    except Exception as e:
        print(f"  ⚠ Solutions sync error: {e}")

    # AI enrichment (category + AI solution + best student solution picker)
    try:
        run_ai_enrichment(cursor)
        print("  ✓ AI enrichment complete.")
    except Exception as e:
        print(f"  ⚠ AI enrichment error: {e}")

    conn.commit()
    conn.close()
    print(f"  ✓ All done — commit successful.")


if __name__ == "__main__":
    print("=" * 50)
    print("  IRIS — Issue Reporting & Intelligence System")
    print("  Sync + Gemini AI Engine")
    print(f"  Syncing every {SYNC_INTERVAL} seconds")
    print("  Press Ctrl+C to stop")
    print("=" * 50)
    while True:
        try:
            sync()
        except Exception as e:
            print(f"  ✗ Unexpected error: {e}")
        time.sleep(SYNC_INTERVAL)
