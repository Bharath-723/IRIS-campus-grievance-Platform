import os
import gspread
from google.oauth2.service_account import Credentials
import hashlib
import time
import re
import json
import urllib.request
from datetime import datetime
from db import get_db

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SHEET_ID           = os.getenv("SHEET_ID", "1eyaSoucDJrBlCnwFtg0Q7gjD42Azu5cQ-DvsfGN_rlk")
CREDENTIALS        = os.getenv("CREDENTIALS_FILE", "credentials.json")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "AIzaSyBcUymkQ5u5iNY8Tk6Wk3Up0ju8TA-f_DU")
GEMINI_URL         = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
)

SYNC_INTERVAL      = int(os.getenv("SYNC_INTERVAL", "30"))
MAJORITY_THRESHOLD = int(os.getenv("MAJORITY_THRESHOLD", "3"))   # minimum reports to elevate an issue
# ──────────────────────────────────────────────────────────────────────────────


# ─── GEMINI HELPER ────────────────────────────────────────────────────────────
def gemini_ask(prompt):
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
    except Exception as e:
        print(f"  ⚠ Gemini error: {e}")
        return None


def categorize_by_rules(text, place=''):
    t = f"{text} {place}".lower()
    
    # 1. Hygiene & Cleanliness
    hygiene_kw = ['clean', 'cleaning', 'cleanliness', 'dirty', 'dust', 'dusty', 'floor', 'sweep', 'trash', 'garbage', 'litter', 'waste', 'washroom', 'toilet', 'restroom', 'smell', 'stink', 'hygiene', 'sanitize', 'mop', 'pest', 'cockroach', 'rat', 'bins', 'dustbin']
    if any(k in t for k in hygiene_kw):
        return 'Hygiene', 7, 'Dispatch housekeeping staff immediately for thorough cleaning and sanitation.'
        
    # 2. Safety & Electrical Hazards
    safety_kw = ['shock', 'electric', 'electricity', 'wire', 'wires', 'fire', 'hazard', 'hazardous', 'spark', 'broken glass', 'danger', 'dangerous', 'injury', 'emergency', 'security', 'guard', 'lock', 'theft', 'stolen', 'cctv', 'ragging', 'harass', 'dark', 'lighting']
    if any(k in t for k in safety_kw):
        return 'Safety', 9, 'Urgently dispatch maintenance/electrician to inspect and neutralize safety hazards.'
        
    # 3. Technology & IT
    tech_kw = ['wifi', 'wi-fi', 'internet', 'network', 'computer', 'pc', 'system', 'lab', 'projector', 'speaker', 'speakers', 'mic', 'microphone', 'audio', 'software', 'screen', 'monitor', 'mouse', 'keyboard', 'login', 'portal', 'server', 'tech', 'printer', 'broadband']
    if any(k in t for k in tech_kw):
        return 'Technology', 7, 'Assign to IT Support / lab technician to repair hardware or restore connectivity.'
        
    # 4. Admin, Fees & Canteen / College Policies
    admin_kw = ['price', 'prices', 'cost', 'expensive', 'canteen food', 'food quality', 'taste', 'fee', 'fees', 'billing', 'tokens', 'receipt', 'id card', 'timing', 'timings', 'library', 'schedule', 'exam', 'faculty', 'staff', 'professor', 'teacher', 'attendance', 'rule', 'rules', 'policy', 'admin', 'administration', 'competitor', 'competitors', 'good college', 'college']
    if any(k in t for k in admin_kw):
        return 'Admin', 5, 'Forward grievance to administrative committee / campus management for policy review.'
        
    # 5. Infrastructure & Facilities (Default fallback)
    return 'Infrastructure', 6, 'Schedule physical inspection and repair with the facilities maintenance team.'


def ai_analyze_issue(issue_text, place):
    """
    Returns: category, priority_score, ai_suggested_solution
    Uses Gemini AI if available; otherwise falls back to smart rule-based categorizer.
    """
    cat_rule, score_rule, sol_rule = categorize_by_rules(issue_text, place)

    prompt = f"""You are an AI assistant for a college campus issue management system.

Analyze this campus issue and respond ONLY with a valid JSON object, no markdown, no extra text:

Issue: "{issue_text}"
Location: "{place}"

JSON format (strictly follow this):
{{
  "category": "{cat_rule}",
  "priority_score": {score_rule},
  "ai_suggested_solution": "{sol_rule}"
}}

Rules:
- category: MUST be exactly one of: Infrastructure, Hygiene, Technology, Safety, Admin
- priority_score: integer 1 to 10 (10 = most critical)
- ai_suggested_solution: AI's own practical solution in 1 clear sentence, max 20 words, actionable and specific to the issue
- Return ONLY the JSON object, absolutely nothing else"""

    response = gemini_ask(prompt)
    if not response:
        print(f"     → [Rule Categorizer] [{cat_rule}] Priority:{score_rule}/10 | Solution: {sol_rule[:60]}...")
        return cat_rule, score_rule, sol_rule
    try:
        clean = response.replace("```json", "").replace("```", "").strip()
        start = clean.find("{")
        end   = clean.rfind("}") + 1
        if start >= 0 and end > start:
            clean = clean[start:end]
        data  = json.loads(clean)
        cat   = data.get("category", cat_rule)
        if cat not in ["Infrastructure", "Hygiene", "Technology", "Safety", "Admin"]:
            cat = cat_rule
        score = min(10, max(1, int(data.get("priority_score", score_rule))))
        sol   = data.get("ai_suggested_solution", sol_rule)
        print(f"     → [{cat}] Priority:{score}/10 | AI solution: {sol[:60]}...")
        return cat, score, sol
    except Exception as e:
        print(f"  ⚠ Gemini parse error: {e} | using rule-based categorization")
        return cat_rule, score_rule, sol_rule


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


# ─── GOOGLE SHEETS HELPER ─────────────────────────────────────────────────────
def get_sheet():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]
    raw_creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if raw_creds_json:
        creds_info = json.loads(raw_creds_json)
        creds = Credentials.from_service_account_info(creds_info, scopes=scopes)
    else:
        creds = Credentials.from_service_account_file(CREDENTIALS, scopes=scopes)
    client = gspread.authorize(creds)
    doc = client.open_by_key(SHEET_ID)

    # 1. Custom tab from .env if defined
    target_tab = os.getenv("SHEET_TAB_NAME")
    if target_tab:
        try:
            return doc.worksheet(target_tab)
        except Exception:
            pass

    # 2. Look for Google Form responses tab automatically
    for ws in doc.worksheets():
        t = ws.title.lower()
        if "form response" in t or "form_response" in t or "responses" in t:
            return ws

    # 3. Fallback to default first sheet
    return doc.sheet1


def normalize(text):
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text


def make_hash(text):
    return hashlib.sha256(normalize(text).encode()).hexdigest()


def already_synced(cursor, submitted_at, text_hash):
    cursor.execute("""
        SELECT COUNT(*) FROM raw_submissions
        WHERE submitted_at = %s AND text_hash = %s
    """, (submitted_at, text_hash))
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


def map_headers(header_row):
    """
    Dynamically maps Google Form / Sheet header column titles to field keys
    regardless of question order or exact wording.
    """
    mapping = {}
    for idx, col in enumerate(header_row):
        c = col.strip().lower()
        if "time" in c or c == "column 1":
            mapping["timestamp"] = idx
        elif "email" in c:
            mapping["email"] = idx
        elif "name" in c and "submit" not in c:
            mapping["name"] = idx
        elif "how long" in c or "duration" in c:
            mapping["duration"] = idx
        elif "describe" in c or c == "issue" or ("issue" in c and "how long" not in c):
            mapping["issue"] = idx
        elif ("location" in c or "place" in c) and "other" not in c:
            mapping["location"] = idx
        elif "other" in c:
            mapping["others"] = idx
        elif "severity" in c or "priority" in c:
            mapping["severity"] = idx
        elif "photo" in c or "evidence" in c or "proof" in c or "image" in c or "upload" in c:
            mapping["proof"] = idx
        elif "proposed" in c or "your solution" in c:
            mapping["solution"] = idx
        elif "enter" in c or "reward" in c or "contest" in c:
            mapping["reward"] = idx
        elif "solution" in c:
            mapping["solution"] = idx
    return mapping


# ─── CORE SYNC FUNCTIONS ──────────────────────────────────────────────────────
def insert_submission(cursor, row, col_map=None):
    if col_map is None:
        col_map = {}

    def val(key, default_pos=None):
        pos = col_map.get(key, default_pos)
        if pos is not None and len(row) > pos:
            v = row[pos].strip()
            return v if v else None
        return None

    timestamp  = val("timestamp", 0)
    name       = val("name", 1)
    email      = val("email", 2)
    location   = val("location", 3)
    others     = val("others", 4)
    issue      = val("issue", 5)
    severity   = val("severity", 6) or "Medium"
    duration   = val("duration", 7) or "Recent"
    proof      = val("proof", 8)
    reward_raw = val("reward", 9)
    solution   = val("solution", 10)

    if not issue:
        print("  ⚠ Skipping row — missing issue description.")
        return False

    place        = others if (not location or location.lower() == 'other') and others else (location or "Campus")
    wants_reward = (str(reward_raw or "").strip().lower() == "yes")
    media_url    = convert_drive_url(proof)
    submitted_at = parse_timestamp(timestamp) if timestamp else datetime.now()
    text_hash    = make_hash(issue)

    if already_synced(cursor, submitted_at, text_hash):
        print(f"  ~ Already synced: {issue[:40]}")
        return False

    # Call Gemini AI
    print(f"  🤖 AI analyzing: {issue[:50]}...")
    category, priority, ai_solution = ai_analyze_issue(
        issue, place or "Campus"
    )

    cursor.execute("""
        INSERT INTO raw_submissions
            (full_name, email, place, issue, severity_level,
             issue_duration, media_url, solution, wants_reward,
             text_hash, submitted_at, ai_category)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (name, email, place, issue, severity,
          duration, media_url, solution, wants_reward,
          text_hash, submitted_at, category))

    print(f"  + Inserted: [{severity}|{category}] {issue[:40]}... by {email}")
    return True


def mark_duplicates(cursor):
    cursor.execute("UPDATE raw_submissions SET is_duplicate = FALSE")
    cursor.execute("""
        UPDATE raw_submissions SET is_duplicate = TRUE
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
            rs.issue,
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
        WHERE rs.is_duplicate = FALSE
        GROUP BY rs.text_hash, rs.place, rs.issue,
                 first_rs.full_name, first_rs.email,
                 first_rs.media_url, first_rs.ai_category
        HAVING COUNT(*) >= %s
        AND NOT EXISTS (
            SELECT 1 FROM accepted_issues ai
            WHERE ai.representative_issue = rs.issue
        )
    """, (MAJORITY_THRESHOLD,))


def sync_solutions(cursor):
    cursor.execute("""
        INSERT INTO solutions
            (issue_id, submitter_name, submitter_email, solution_text, wants_reward)
        SELECT
            ai.id, rs.full_name, rs.email,
            rs.solution, rs.wants_reward
        FROM raw_submissions rs
        JOIN accepted_issues ai
            ON ai.representative_issue = rs.issue
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
        SELECT id, representative_issue AS issue, place, ai_category
        FROM accepted_issues
        WHERE ai_suggested_solution IS NULL
           OR ai_category IS NULL
           OR ai_category = 'Uncategorized'
        LIMIT 10
    """)
    issues_to_enrich = cursor.fetchall()

    enriched = 0
    for issue_id, issue_text, place, existing_cat in issues_to_enrich:
        if enriched >= MAX_PER_CYCLE:
            print("  ⏸ Rate limit pause — will continue next sync cycle.")
            break
        print(f"  🤖 AI enriching issue #{issue_id}: {issue_text[:40]}...")
        category, priority, ai_solution = ai_analyze_issue(
            issue_text, place or "Campus"
        )
        cursor.execute("""
            UPDATE accepted_issues
            SET ai_category           = %s,
                ai_priority_score     = %s,
                ai_suggested_solution = %s
            WHERE id = %s
        """, (category, priority, ai_solution, issue_id))
        enriched += 1
        time.sleep(AI_DELAY)   # wait 5s between calls

    # ── Step 2: Pick best student solution for issues not yet evaluated ──
    cursor.execute("""
        SELECT id, representative_issue AS issue
        FROM accepted_issues
        WHERE ai_best_solution_id IS NULL
        LIMIT 5
    """)
    issues_for_picker = cursor.fetchall()

    for issue_id, issue_text in issues_for_picker:
        cursor.execute("""
            SELECT id, submitter_name, solution_text
            FROM solutions
            WHERE issue_id = %s
              AND solution_text IS NOT NULL
              AND solution_text != ''
        """, (issue_id,))
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
                "UPDATE solutions SET ai_score = %s, ai_selected = FALSE WHERE id = %s",
                (score, sol["id"])
            )

        # Mark the AI-selected best solution
        cursor.execute(
            "UPDATE solutions SET ai_selected = TRUE, is_unique = TRUE WHERE id = %s",
            (best_id,)
        )

        # Get best solution text
        cursor.execute(
            "SELECT solution_text FROM solutions WHERE id = %s",
            (best_id,)
        )
        row = cursor.fetchone()
        best_text = row[0] if row else ""

        # Save to accepted_issues
        cursor.execute("""
            UPDATE accepted_issues
            SET ai_best_solution    = %s,
                ai_best_solution_id = %s,
                ai_reason           = %s
            WHERE id = %s
        """, (best_text, best_id, reason, issue_id))
        time.sleep(AI_DELAY)


# ─── MAIN SYNC LOOP ───────────────────────────────────────────────────────────
def sync():
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Syncing Google Sheet → Supabase...")

    try:
        sheet = get_sheet()
        print(f"  Connected tab: '{sheet.title}'")
        rows  = sheet.get_all_values()
    except Exception as e:
        print(f"  ✗ Could not read Google Sheet: {e}")
        return

    if len(rows) < 2:
        print("  No responses yet.")
        return

    col_map = map_headers(rows[0])
    data = rows[1:]
    print(f"  Found {len(data)} response(s) in tab '{sheet.title}'.")

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
            if insert_submission(cursor, row, col_map):
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

    # AI enrichment
    try:
        run_ai_enrichment(cursor)
        print("  ✓ AI enrichment complete.")
    except Exception as e:
        print(f"  ⚠ AI enrichment error: {e}")

    conn.commit()
    conn.close()
    print("  ✓ All done — commit successful.")


if __name__ == "__main__":
    print("=" * 50)
    print("  IRIS — Supabase Sync + Gemini AI Engine")
    print(f"  Syncing every {SYNC_INTERVAL} seconds")
    print("  Press Ctrl+C to stop")
    print("=" * 50)
    while True:
        try:
            sync()
        except Exception as e:
            print(f"  ✗ Unexpected error: {e}")
        time.sleep(SYNC_INTERVAL)
