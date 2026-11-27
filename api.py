import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from db import get_db

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
CORS(app)


# ── Serve Dashboard ──
@app.route('/', methods=['GET'])
@app.route('/dashboard', methods=['GET'])
def serve_dashboard():
    return send_from_directory('.', 'index.html')


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
                ai.ai_category, ai.ai_best_solution,
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


# ── ADD resolution proof ──
@app.route('/api/issues/<int:issue_id>/resolve', methods=['POST'])
def add_resolution_proof(issue_id):
    try:
        data            = request.get_json()
        resolved_by     = data.get('resolved_by', 'Club Member')
        resolution_note = data.get('resolution_note', '')
        proof_media_url = data.get('proof_media_url', '')

        conn   = get_db()
        cursor = conn.cursor()

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
        return jsonify({'success': True, 'message': 'Resolution proof added'})
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


if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "True").lower() in ("true", "1")
    print(f"API running at http://localhost:{port}")
    print(f"Dashboard available at http://localhost:{port}/")
    print(f"Test API: http://localhost:{port}/api/issues")
    app.run(host=host, port=port, debug=debug)
