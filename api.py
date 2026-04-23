from flask import Flask, jsonify, request
from flask_cors import CORS
import pyodbc

app = Flask(__name__)
CORS(app)

DB_CONFIG = (
    "DRIVER={SQL Server};"
    "SERVER=localhost\\SQLEXPRESS;"
    "DATABASE=studentdb;"
    "Trusted_Connection=yes;"
)

def get_db():
    return pyodbc.connect(DB_CONFIG)


@app.route('/api/issues', methods=['GET'])
def get_issues():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                ai.id, ai.place,
                CAST(ai.representative_issue  AS VARCHAR(500)) AS representative_issue,
                ai.severity_level, ai.issue_duration, ai.frequency,
                ai.first_raiser_name, ai.first_raiser_email, ai.media_url,
                ai.status, ai.created_at, ai.ai_category,
                CAST(ai.ai_suggested_solution AS VARCHAR(500)) AS ai_suggested_solution,
                CAST(ai.ai_best_solution      AS VARCHAR(500)) AS ai_best_solution,
                ai.ai_best_solution_id, ai.ai_reason,
                DATEDIFF(DAY, ai.created_at, GETDATE()) AS days_open,
                COUNT(s.id) AS total_solutions,
                SUM(CASE WHEN s.wants_reward=1 THEN 1 ELSE 0 END) AS reward_seekers
            FROM accepted_issues ai
            LEFT JOIN solutions s ON s.issue_id = ai.id
            GROUP BY
                ai.id, ai.place,
                CAST(ai.representative_issue  AS VARCHAR(500)),
                ai.severity_level, ai.issue_duration, ai.frequency,
                ai.first_raiser_name, ai.first_raiser_email, ai.media_url,
                ai.status, ai.created_at, ai.ai_category,
                CAST(ai.ai_suggested_solution AS VARCHAR(500)),
                CAST(ai.ai_best_solution      AS VARCHAR(500)),
                ai.ai_best_solution_id, ai.ai_reason
            ORDER BY
                CASE ai.severity_level
                    WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
                    WHEN 'Medium'   THEN 3 WHEN 'Low'  THEN 4
                END, ai.frequency DESC
        """)
        rows = cursor.fetchall()
        cols = [c[0] for c in cursor.description]
        issues = []
        for row in rows:
            d = dict(zip(cols, row))
            if d.get('created_at'): d['created_at'] = str(d['created_at'])
            issues.append(d)
        conn.close()
        return jsonify({'success': True, 'issues': issues})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/issues/<int:issue_id>/solutions', methods=['GET'])
def get_solutions(issue_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, submitter_name, submitter_email,
                   CAST(solution_text AS VARCHAR(MAX)) AS solution_text,
                   wants_reward, is_unique, reward_given,
                   ai_score, ai_selected, submitted_at
            FROM solutions WHERE issue_id = ?
            ORDER BY ai_score DESC, submitted_at ASC
        """, (issue_id,))
        rows = cursor.fetchall()
        cols = [c[0] for c in cursor.description]
        solutions = [dict(zip(cols, row)) for row in rows]
        for s in solutions:
            if s.get('submitted_at'): s['submitted_at'] = str(s['submitted_at'])
        conn.close()
        return jsonify({'success': True, 'solutions': solutions})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/issues/<int:issue_id>/status', methods=['POST'])
def update_status(issue_id):
    try:
        data      = request.get_json()
        status    = data.get('status')
        note      = data.get('note', '')
        action_by = data.get('action_by', 'club')
        conn = get_db(); cursor = conn.cursor()
        cursor.execute("UPDATE accepted_issues SET status=?, updated_at=GETDATE() WHERE id=?", (status, issue_id))
        cursor.execute("INSERT INTO resolution_log (issue_id,action_by,action_note,escalated) VALUES (?,?,?,0)", (issue_id, action_by, note))
        conn.commit(); conn.close()
        return jsonify({'success': True, 'message': 'Status updated'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/solutions/<int:solution_id>/mark-unique', methods=['POST'])
def mark_unique(solution_id):
    try:
        conn = get_db(); cursor = conn.cursor()
        cursor.execute("UPDATE solutions SET is_unique=1 WHERE id=?", (solution_id,))
        conn.commit(); conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/issues/<int:issue_id>/resolve', methods=['POST'])
def add_resolution_proof(issue_id):
    try:
        data = request.get_json()
        resolved_by     = data.get('resolved_by', 'Club Member')
        resolution_note = data.get('resolution_note', '')
        proof_media_url = data.get('proof_media_url', '')
        conn = get_db(); cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO resolved_issues (issue_id, resolved_by, resolution_note, proof_media_url)
            VALUES (?, ?, ?, ?)
        """, (issue_id, resolved_by, resolution_note, proof_media_url))
        cursor.execute("UPDATE accepted_issues SET status='resolved', updated_at=GETDATE() WHERE id=?", (issue_id,))
        cursor.execute("INSERT INTO resolution_log (issue_id,action_by,action_note,escalated) VALUES (?,?,?,0)",
                       (issue_id, resolved_by, f"Resolved: {resolution_note}"))
        conn.commit(); conn.close()
        return jsonify({'success': True, 'message': 'Resolution proof added'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/issues/<int:issue_id>/resolution', methods=['GET'])
def get_resolution(issue_id):
    try:
        conn = get_db(); cursor = conn.cursor()
        cursor.execute("""
            SELECT id, resolved_by, resolution_note, proof_media_url, resolved_at, verified
            FROM resolved_issues WHERE issue_id=? ORDER BY resolved_at DESC
        """, (issue_id,))
        rows = cursor.fetchall()
        cols = [c[0] for c in cursor.description]
        records = [dict(zip(cols, r)) for r in rows]
        for r in records:
            if r.get('resolved_at'): r['resolved_at'] = str(r['resolved_at'])
        conn.close()
        return jsonify({'success': True, 'records': records})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── FIXED: removed non-existent 'rewards' table ──
@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        conn = get_db(); cursor = conn.cursor()
        cursor.execute("""
            SELECT
                (SELECT COUNT(*) FROM accepted_issues)                              AS total,
                (SELECT COUNT(*) FROM accepted_issues WHERE status='open')          AS open,
                (SELECT COUNT(*) FROM accepted_issues WHERE status='in_progress')   AS in_progress,
                (SELECT COUNT(*) FROM accepted_issues WHERE status='resolved')      AS resolved,
                (SELECT COUNT(*) FROM raw_submissions)                              AS total_submissions,
                (SELECT COUNT(*) FROM raw_submissions WHERE is_duplicate=1)         AS duplicates_removed,
                (SELECT COUNT(*) FROM solutions WHERE reward_given=1)               AS rewards_given
        """)
        row = cursor.fetchone()
        cols = [c[0] for c in cursor.description]
        conn.close()
        return jsonify({'success': True, 'stats': dict(zip(cols, row))})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    print("API running at http://localhost:5000")
    print("Test it: http://localhost:5000/api/issues")
    app.run(debug=True, port=5000)
