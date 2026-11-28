import os
import uuid
import requests
from flask import Flask, jsonify, request, send_from_directory, Response
from werkzeug.utils import secure_filename
from flask_cors import CORS
from db import get_db
from mailer import send_resolution_email
from ai_advisor import generate_smart_solution

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
CORS(app)

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'drive_cache')
os.makedirs(CACHE_DIR, exist_ok=True)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'resolutions')
os.makedirs(UPLOAD_DIR, exist_ok=True)

_drive_creds = None
def get_drive_token():
    global _drive_creds
    cred_file = 'Credentials.json' if os.path.exists('Credentials.json') else 'credentials.json'
    if not os.path.exists(cred_file):
        return None
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
        if _drive_creds is None or not _drive_creds.valid:
            _drive_creds = service_account.Credentials.from_service_account_file(
                cred_file,
                scopes=['https://www.googleapis.com/auth/drive.readonly']
            )
            _drive_creds.refresh(Request())
        return _drive_creds.token
    except Exception as e:
        return None

def get_svg_placeholder(text="Evidence Attached"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14171f"/>
          <stop offset="100%" stop-color="#1c212c"/>
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#g)"/>
      <circle cx="300" cy="145" r="44" fill="#252b3a" stroke="#293040" stroke-width="2"/>
      <path d="M280 138h40v24h-40z M286 132h28v6h-28z" fill="#f59e0b" opacity="0.95"/>
      <circle cx="300" cy="150" r="7" fill="#14171f"/>
      <text x="300" y="224" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="16" font-weight="600" fill="#f3f5f9" text-anchor="middle">{text}</text>
      <text x="300" y="250" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" fill="#8b95a8" text-anchor="middle">Campus Grievance Evidence</text>
    </svg>"""


FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')

# ── Serve Dashboard ──
@app.route('/', methods=['GET'])
@app.route('/dashboard', methods=['GET'])
def serve_dashboard():
    if os.path.exists(os.path.join(FRONTEND_DIST, 'index.html')):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return jsonify({
        'status': 'IRIS API running',
        'dashboard': 'Frontend not built. Run: cd frontend && npm run build'
    }), 200

@app.route('/assets/<path:path>', methods=['GET'])
def serve_assets(path):
    if os.path.exists(os.path.join(FRONTEND_DIST, 'assets')):
        return send_from_directory(os.path.join(FRONTEND_DIST, 'assets'), path)
    return ('Not found', 404)


# ── Proxy Google Drive Images ──
@app.route('/api/image/<file_id>', methods=['GET'])
def proxy_drive_image(file_id):
    if file_id == 'placeholder':
        return Response(get_svg_placeholder("No Media Attached"), mimetype='image/svg+xml')

    clean_id = "".join(c for c in file_id if c.isalnum() or c in "-_")
    if not clean_id:
        return Response(get_svg_placeholder("Invalid Image"), mimetype='image/svg+xml')

    cached_path = os.path.join(CACHE_DIR, f"{clean_id}.jpg")
    if os.path.exists(cached_path):
        try:
            with open(cached_path, 'rb') as f:
                return Response(f.read(), mimetype='image/jpeg', headers={'Cache-Control': 'public, max-age=86400'})
        except Exception:
            pass

    # 1. Try Google Drive API via Service Account
    token = get_drive_token()
    if token:
        try:
            drive_url = f"https://www.googleapis.com/drive/v3/files/{clean_id}?alt=media"
            r = requests.get(drive_url, headers={'Authorization': f'Bearer {token}'}, timeout=6)
            if r.status_code == 200 and 'json' not in r.headers.get('Content-Type', '').lower():
                with open(cached_path, 'wb') as f:
                    f.write(r.content)
                ctype = r.headers.get('Content-Type', 'image/jpeg')
                return Response(r.content, mimetype=ctype, headers={'Cache-Control': 'public, max-age=86400'})
        except Exception:
            pass

    # 2. Try direct thumbnail / uc endpoints
    for candidate_url in [
        f"https://lh3.googleusercontent.com/d/{clean_id}",
        f"https://drive.google.com/thumbnail?id={clean_id}&sz=w1000",
        f"https://drive.google.com/uc?id={clean_id}&export=download"
    ]:
        try:
            r = requests.get(candidate_url, timeout=5, allow_redirects=True)
            ctype = r.headers.get('Content-Type', '')
            if r.status_code == 200 and 'image' in ctype.lower():
                with open(cached_path, 'wb') as f:
                    f.write(r.content)
                return Response(r.content, mimetype=ctype, headers={'Cache-Control': 'public, max-age=86400'})
        except Exception:
            pass

    # 3. Fallback placeholder SVG
    return Response(get_svg_placeholder("Photo Evidence"), mimetype='image/svg+xml', headers={'Cache-Control': 'public, max-age=60'})


# ── Upload Proof Media (Image or Video) ──
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part in request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        original_name = secure_filename(file.filename) or 'proof'
        ext = original_name.rsplit('.', 1)[-1].lower() if '.' in original_name else ''
        unique_id = uuid.uuid4().hex[:10]
        saved_filename = f"{unique_id}_{original_name}"
        save_path = os.path.join(UPLOAD_DIR, saved_filename)
        file.save(save_path)
        is_video = ext in {'mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'}
        return jsonify({
            'success': True,
            'url': f"/api/uploads/{saved_filename}",
            'filename': original_name,
            'media_type': 'video' if is_video else 'image'
        })
    return jsonify({'success': False, 'error': 'File type not allowed'}), 400

@app.route('/api/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)


# ── GET all accepted issues ──
@app.route('/api/issues', methods=['GET'])
def get_issues():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                ai.id,
                ai.place,
                ai.representative_issue,
                ai.severity_level,
                ai.issue_duration,
                ai.frequency,
                ai.first_raiser_name,
                ai.first_raiser_email,
                ai.media_url,
                ai.status,
                ai.created_at,
                ai.ai_category,
                ai.ai_suggested_solution,
                ai.ai_best_solution,
                ai.ai_best_solution_id,
                ai.ai_reason,
                COALESCE(EXTRACT(DAY FROM (NOW() - ai.created_at))::INT, 0)   AS days_open,
                COUNT(s.id)                                                   AS total_solutions,
                COALESCE(SUM(CASE WHEN s.wants_reward THEN 1 ELSE 0 END), 0) AS reward_seekers
            FROM accepted_issues ai
            LEFT JOIN solutions s ON s.issue_id = ai.id
            GROUP BY
                ai.id, ai.place, ai.representative_issue,
                ai.severity_level, ai.issue_duration,
                ai.frequency, ai.first_raiser_name,
                ai.first_raiser_email, ai.media_url,
                ai.status, ai.created_at,
                ai.ai_category, ai.ai_suggested_solution,
                ai.ai_best_solution,
                ai.ai_best_solution_id, ai.ai_reason
            ORDER BY
                CASE ai.severity_level
                    WHEN 'Critical' THEN 1
                    WHEN 'High'     THEN 2
                    WHEN 'Medium'   THEN 3
                    WHEN 'Low'      THEN 4
                    ELSE 5
                END,
                ai.frequency DESC
        """)
        rows = cursor.fetchall()
        cols = [c[0] for c in cursor.description]
        issues = []
        for row in rows:
            d = dict(zip(cols, row))
            if d.get('created_at'):
                d['created_at'] = str(d['created_at'])
            issues.append(d)
        conn.close()
        return jsonify({'success': True, 'issues': issues})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── GET solutions for one issue ──
@app.route('/api/issues/<int:issue_id>/solutions', methods=['GET'])
def get_solutions(issue_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, submitter_name, submitter_email,
                   solution_text, wants_reward, is_unique, reward_given,
                   ai_score, ai_selected, submitted_at
            FROM solutions
            WHERE issue_id = %s
            ORDER BY ai_score DESC NULLS LAST, submitted_at ASC
        """, (issue_id,))
        rows = cursor.fetchall()
        cols = [c[0] for c in cursor.description]
        solutions = [dict(zip(cols, row)) for row in rows]
        for s in solutions:
            if s.get('submitted_at'):
                s['submitted_at'] = str(s['submitted_at'])
        conn.close()
        return jsonify({'success': True, 'solutions': solutions})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── UPDATE issue status ──
@app.route('/api/issues/<int:issue_id>/status', methods=['POST'])
def update_status(issue_id):
    try:
        data       = request.get_json()
        new_status = data.get('status')
        note       = data.get('note', '')
        action_by  = data.get('action_by', 'club')

        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE accepted_issues SET status = %s, updated_at = NOW() WHERE id = %s",
            (new_status, issue_id)
        )
        cursor.execute("""
            INSERT INTO resolution_log (issue_id, action_by, action_note, escalated)
            VALUES (%s, %s, %s, FALSE)
        """, (issue_id, action_by, note))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Status updated'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── MARK solution as unique ──
@app.route('/api/solutions/<int:solution_id>/mark-unique', methods=['POST'])
def mark_unique(solution_id):
    try:
        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE solutions SET is_unique = TRUE WHERE id = %s", (solution_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Marked as unique solution'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── ADD resolution proof & notify reporter via email ──
@app.route('/api/issues/<int:issue_id>/resolve', methods=['POST'])
def add_resolution_proof(issue_id):
    try:
        data            = request.get_json()
        resolved_by     = data.get('resolved_by', 'Club Member')
        resolution_note = data.get('resolution_note', '')
        proof_media_url = data.get('proof_media_url', '')

        conn   = get_db()
        cursor = conn.cursor()

        # Fetch issue details for email notification
        cursor.execute("""
            SELECT representative_issue, place, first_raiser_name, first_raiser_email
            FROM accepted_issues
            WHERE id = %s
        """, (issue_id,))
        issue_info = cursor.fetchone()

        # Insert into resolved_issues
        cursor.execute("""
            INSERT INTO resolved_issues
                (issue_id, resolved_by, resolution_note, proof_media_url)
            VALUES (%s, %s, %s, %s)
        """, (issue_id, resolved_by, resolution_note, proof_media_url))

        # Update status to resolved
        cursor.execute("""
            UPDATE accepted_issues
            SET status = 'resolved', updated_at = NOW()
            WHERE id = %s
        """, (issue_id,))

        # Log it
        cursor.execute("""
            INSERT INTO resolution_log (issue_id, action_by, action_note, escalated)
            VALUES (%s, %s, %s, FALSE)
        """, (issue_id, resolved_by, f"Resolved: {resolution_note}"))

        conn.commit()
        conn.close()

        # Dispatch email notification with proof to the student who raised the ticket
        if issue_info:
            rep_issue, place, raiser_name, raiser_email = issue_info
            try:
                send_resolution_email(
                    to_email=raiser_email,
                    recipient_name=raiser_name,
                    issue_title=rep_issue,
                    place=place,
                    resolved_by=resolved_by,
                    resolution_note=resolution_note,
                    proof_url=proof_media_url,
                    issue_id=issue_id
                )
            except Exception as mail_err:
                print(f"Notification error: {mail_err}")

        return jsonify({'success': True, 'message': 'Resolution proof added and student notified'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── GENERATE / REFRESH AI SOLUTION RECOMMENDATION ──
@app.route('/api/issues/<int:issue_id>/ai-recommend', methods=['POST'])
def ai_recommend_solution(issue_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT representative_issue, place, ai_category
            FROM accepted_issues
            WHERE id = %s
        """, (issue_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({'success': False, 'error': 'Issue not found'}), 404

        rep_issue, place, category = row
        sol, reason = generate_smart_solution(rep_issue, place, category)

        cursor.execute("""
            UPDATE accepted_issues
            SET ai_suggested_solution = %s,
                ai_reason = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (sol, reason, issue_id))
        conn.commit()
        conn.close()
        return jsonify({
            'success': True,
            'ai_suggested_solution': sol,
            'ai_reason': reason
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── GET resolution proof for an issue ──
@app.route('/api/issues/<int:issue_id>/resolution', methods=['GET'])
def get_resolution(issue_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, resolved_by, resolution_note,
                   proof_media_url, resolved_at, verified
            FROM resolved_issues
            WHERE issue_id = %s
            ORDER BY resolved_at DESC
        """, (issue_id,))
        rows = cursor.fetchall()
        cols = [c[0] for c in cursor.description]
        records = [dict(zip(cols, row)) for row in rows]
        for r in records:
            if r.get('resolved_at'):
                r['resolved_at'] = str(r['resolved_at'])
        conn.close()
        return jsonify({'success': True, 'records': records})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── GET summary stats ──
@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                (SELECT COUNT(*) FROM accepted_issues)                              AS total,
                (SELECT COUNT(*) FROM accepted_issues WHERE status = 'open')        AS open,
                (SELECT COUNT(*) FROM accepted_issues WHERE status = 'in_progress') AS in_progress,
                (SELECT COUNT(*) FROM accepted_issues WHERE status = 'resolved')    AS resolved,
                (SELECT COUNT(*) FROM raw_submissions)                              AS total_submissions,
                (SELECT COUNT(*) FROM raw_submissions WHERE is_duplicate = TRUE)    AS duplicates_removed,
                (SELECT COUNT(*) FROM solutions WHERE reward_given = TRUE)          AS rewards_given
        """)
        row  = cursor.fetchone()
        cols = [c[0] for c in cursor.description]
        conn.close()
        return jsonify({'success': True, 'stats': dict(zip(cols, row))})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── GET Top 10 Repeated Tickets & First Raisers (Excludes Rewarded) ──
@app.route('/api/top-issues', methods=['GET'])
def get_top_issues():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                ai.id,
                ai.place,
                ai.representative_issue,
                ai.severity_level,
                ai.issue_duration,
                ai.frequency,
                ai.first_raiser_name,
                ai.first_raiser_email,
                ai.media_url,
                ai.status,
                ai.created_at,
                ai.ai_category,
                ai.ai_suggested_solution,
                ai.ai_best_solution,
                ai.ai_reason,
                COALESCE(ai.reward_given, FALSE) AS reward_given,
                COALESCE(EXTRACT(DAY FROM (NOW() - ai.created_at))::INT, 0) AS days_open,
                COUNT(s.id) AS total_solutions
            FROM accepted_issues ai
            LEFT JOIN solutions s ON s.issue_id = ai.id
            WHERE COALESCE(ai.reward_given, FALSE) = FALSE
            GROUP BY
                ai.id, ai.place, ai.representative_issue,
                ai.severity_level, ai.issue_duration,
                ai.frequency, ai.first_raiser_name,
                ai.first_raiser_email, ai.media_url,
                ai.status, ai.created_at,
                ai.ai_category, ai.ai_suggested_solution,
                ai.ai_best_solution, ai.ai_reason,
                ai.reward_given
            ORDER BY ai.frequency DESC, ai.id ASC
            LIMIT 10;
        """)
        rows = cursor.fetchall()
        cols = [c[0] for c in cursor.description]
        top_issues = []
        for row in rows:
            d = dict(zip(cols, row))
            if d.get('created_at'):
                d['created_at'] = str(d['created_at'])
            top_issues.append(d)
        conn.close()
        return jsonify({'success': True, 'issues': top_issues})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── GET Top 10 Solutions & AI Chosen Winner (Excludes Rewarded) ──
@app.route('/api/top-solutions', methods=['GET'])
def get_top_solutions():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                s.id,
                s.issue_id,
                s.solution_text,
                s.submitter_name,
                s.submitter_email,
                COALESCE(s.ai_score, 0) AS ai_score,
                s.ai_selected,
                s.wants_reward,
                s.is_unique,
                s.reward_given,
                s.submitted_at,
                ai.representative_issue,
                ai.place,
                ai.severity_level,
                ai.ai_category
            FROM solutions s
            JOIN accepted_issues ai ON s.issue_id = ai.id
            WHERE LOWER(TRIM(s.solution_text)) NOT IN ('no solution', 'none', 'no', 'n/a', '')
              AND COALESCE(s.reward_given, FALSE) = FALSE
            ORDER BY
                (CASE WHEN s.ai_selected THEN 1 ELSE 0 END) DESC,
                s.ai_score DESC,
                LENGTH(s.solution_text) DESC,
                s.id ASC
            LIMIT 10;
        """)
        rows = cursor.fetchall()
        cols = [c[0] for c in cursor.description]
        solutions = []
        winner = None
        for row in rows:
            d = dict(zip(cols, row))
            if d.get('submitted_at'):
                d['submitted_at'] = str(d['submitted_at'])
            if d.get('ai_selected') and not winner:
                winner = d
            solutions.append(d)
        if not winner and solutions:
            winner = solutions[0]
        conn.close()
        return jsonify({'success': True, 'winner': winner, 'solutions': solutions})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── ISSUE REWARD for Top Ticket Raiser ──
@app.route('/api/issues/<int:issue_id>/issue-reward', methods=['POST'])
def issue_ticket_reward(issue_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE accepted_issues
            SET reward_given = TRUE, reward_given_at = NOW(), updated_at = NOW()
            WHERE id = %s
        """, (issue_id,))
        cursor.execute("""
            INSERT INTO resolution_log (issue_id, action_by, action_note, escalated)
            VALUES (%s, 'admin', 'Admin issued First-Raiser Consensus Reward to student', FALSE)
        """, (issue_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Ticket reward successfully issued!'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── ISSUE REWARD for Top Solution Contributor ──
@app.route('/api/solutions/<int:solution_id>/issue-reward', methods=['POST'])
def issue_solution_reward(solution_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE solutions
            SET reward_given = TRUE, reward_given_at = NOW()
            WHERE id = %s
        """, (solution_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Solution reward successfully issued!'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── GET all resolved issues with resolution proof ──
@app.route('/api/resolved-issues', methods=['GET'])
def get_resolved_issues():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                ai.id,
                ai.place,
                ai.representative_issue,
                ai.severity_level,
                ai.issue_duration,
                ai.frequency,
                ai.first_raiser_name,
                ai.first_raiser_email,
                ai.ai_category,
                ai.media_url,
                ai.status,
                ai.created_at,
                COALESCE(EXTRACT(DAY FROM (NOW() - ai.created_at))::INT, 0) AS days_open,
                r.resolved_by,
                r.resolution_note,
                r.proof_media_url,
                r.resolved_at
            FROM accepted_issues ai
            LEFT JOIN (
                SELECT DISTINCT ON (issue_id)
                    issue_id, resolved_by, resolution_note, proof_media_url, resolved_at
                FROM resolved_issues
                ORDER BY issue_id, resolved_at DESC
            ) r ON r.issue_id = ai.id
            WHERE ai.status = 'resolved'
            ORDER BY COALESCE(r.resolved_at, ai.updated_at, ai.created_at) DESC;
        """)
        rows = cursor.fetchall()
        cols = [c[0] for c in cursor.description]
        records = []
        for row in rows:
            d = dict(zip(cols, row))
            if d.get('created_at'): d['created_at'] = str(d['created_at'])
            if d.get('resolved_at'): d['resolved_at'] = str(d['resolved_at'])
            records.append(d)
        conn.close()
        return jsonify({'success': True, 'issues': records})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── GET single issue with details ──
@app.route('/api/issues/<int:issue_id>', methods=['GET'])
def get_single_issue(issue_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                ai.id,
                ai.place,
                ai.representative_issue,
                ai.severity_level,
                ai.issue_duration,
                ai.frequency,
                ai.first_raiser_name,
                ai.first_raiser_email,
                ai.media_url,
                ai.status,
                ai.created_at,
                ai.ai_category,
                ai.ai_suggested_solution,
                ai.ai_best_solution,
                ai.ai_best_solution_id,
                ai.ai_reason,
                COALESCE(EXTRACT(DAY FROM (NOW() - ai.created_at))::INT, 0)   AS days_open,
                COUNT(s.id)                                                   AS total_solutions,
                COALESCE(SUM(CASE WHEN s.wants_reward THEN 1 ELSE 0 END), 0) AS reward_seekers
            FROM accepted_issues ai
            LEFT JOIN solutions s ON s.issue_id = ai.id
            WHERE ai.id = %s
            GROUP BY
                ai.id, ai.place, ai.representative_issue,
                ai.severity_level, ai.issue_duration,
                ai.frequency, ai.first_raiser_name,
                ai.first_raiser_email, ai.media_url,
                ai.status, ai.created_at,
                ai.ai_category, ai.ai_suggested_solution, ai.ai_best_solution,
                ai.ai_best_solution_id, ai.ai_reason
        """, (issue_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({'success': False, 'error': 'Issue not found'}), 404
        cols = [c[0] for c in cursor.description]
        d = dict(zip(cols, row))
        if d.get('created_at'):
            d['created_at'] = str(d['created_at'])
        conn.close()
        return jsonify({'success': True, 'issue': d})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── GET Previous Winners (Ticket Raisers + Solution Winners) ──
# Keeps only the top 1 awarded ticket winner and top 1 awarded solution winner
@app.route('/api/winners', methods=['GET'])
def get_previous_winners():
    try:
        conn = get_db()
        cursor = conn.cursor()

        # 1. Top 1 Awarded Ticket Raiser Winner
        cursor.execute("""
            SELECT
                ai.id,
                ai.place,
                ai.representative_issue,
                ai.severity_level,
                ai.issue_duration,
                ai.frequency,
                ai.first_raiser_name,
                ai.first_raiser_email,
                ai.media_url,
                ai.status,
                ai.created_at,
                ai.ai_category,
                ai.ai_suggested_solution,
                ai.reward_given,
                ai.reward_given_at,
                COALESCE(EXTRACT(DAY FROM (NOW() - ai.created_at))::INT, 0) AS days_open,
                COUNT(s.id) AS total_solutions
            FROM accepted_issues ai
            LEFT JOIN solutions s ON s.issue_id = ai.id
            WHERE ai.reward_given = TRUE
            GROUP BY
                ai.id, ai.place, ai.representative_issue,
                ai.severity_level, ai.issue_duration,
                ai.frequency, ai.first_raiser_name,
                ai.first_raiser_email, ai.media_url,
                ai.status, ai.created_at,
                ai.ai_category, ai.ai_suggested_solution,
                ai.ai_best_solution, ai.ai_reason,
                ai.reward_given, ai.reward_given_at
            ORDER BY ai.reward_given_at DESC NULLS LAST, ai.frequency DESC
            LIMIT 1;
        """)
        ticket_rows = cursor.fetchall()
        t_cols = [c[0] for c in cursor.description]
        ticket_winners = []
        for row in ticket_rows:
            d = dict(zip(t_cols, row))
            if d.get('created_at'):
                d['created_at'] = str(d['created_at'])
            if d.get('reward_given_at'):
                d['reward_given_at'] = str(d['reward_given_at'])
            ticket_winners.append(d)

        # 2. Top 1 Awarded Solution Contribution Winner
        cursor.execute("""
            SELECT
                s.id,
                s.issue_id,
                s.solution_text,
                s.submitter_name,
                s.submitter_email,
                COALESCE(s.ai_score, 0) AS ai_score,
                s.ai_selected,
                s.wants_reward,
                s.is_unique,
                s.reward_given,
                s.reward_given_at,
                s.submitted_at,
                ai.representative_issue,
                ai.place,
                ai.severity_level,
                ai.ai_category,
                ai.media_url,
                ai.first_raiser_name,
                ai.first_raiser_email,
                ai.created_at AS issue_created_at
            FROM solutions s
            JOIN accepted_issues ai ON s.issue_id = ai.id
            WHERE s.reward_given = TRUE
            ORDER BY s.reward_given_at DESC NULLS LAST, s.ai_score DESC
            LIMIT 1;
        """)
        solution_rows = cursor.fetchall()
        s_cols = [c[0] for c in cursor.description]
        solution_winners = []
        for row in solution_rows:
            d = dict(zip(s_cols, row))
            if d.get('submitted_at'):
                d['submitted_at'] = str(d['submitted_at'])
            if d.get('reward_given_at'):
                d['reward_given_at'] = str(d['reward_given_at'])
            if d.get('issue_created_at'):
                d['issue_created_at'] = str(d['issue_created_at'])
            solution_winners.append(d)

        conn.close()
        return jsonify({
            'success': True,
            'ticket_winners': ticket_winners,
            'solution_winners': solution_winners
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "True").lower() in ("true", "1")
    print(f"API running at http://localhost:{port}")
    print(f"Dashboard available at http://localhost:{port}/")
    print(f"Test API: http://localhost:{port}/api/issues")
    app.run(host=host, port=port, debug=debug)
