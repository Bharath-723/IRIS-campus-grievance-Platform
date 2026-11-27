import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import get_db

def evaluate_solution(solution_text, issue_text, category):
    text = (solution_text or '').lower().strip()
    score = 5
    reason = "Practical proposal."
    
    if text in ['no solution', 'none', 'no', 'n/a', 'na', 'idk', '']:
        return 1, "No actionable recommendation provided."
        
    words = text.split()
    if len(words) < 3:
        score -= 1
        reason = "Brief suggestion."
    else:
        score += 1
        
    cat = (category or '').lower()
    if cat == 'safety':
        score += 3
        reason = "Critical safety priority: directly protects students from hazards."
    elif cat == 'hygiene':
        score += 2
        reason = "High hygiene priority: improves campus sanitation and student well-being."
    elif cat == 'technology':
        score += 2
        reason = "High tech priority: restores vital academic and digital connectivity."
    elif cat == 'admin':
        score += 1
        reason = "Administrative improvement for student welfare."
        
    action_words = ['arrange', 'store', 'repair', 'replace', 'clean', 'sanitize', 'install', 'inspect', 'organize', 'remove', 'connect', 'expand', 'provide']
    if any(w in text for w in action_words):
        score += 1
        reason += " Provides a specific, actionable physical implementation."
        
    final_score = min(10, max(1, score))
    return final_score, reason

def main():
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute('''
        SELECT s.id, s.solution_text, ai.representative_issue, ai.ai_category, s.wants_reward
        FROM solutions s
        JOIN accepted_issues ai ON s.issue_id = ai.id
        ORDER BY s.id ASC;
    ''')
    rows = cur.fetchall()
    
    scored = []
    for sol_id, sol_text, issue_text, category, wants_reward in rows:
        score, reason = evaluate_solution(sol_text, issue_text, category)
        scored.append((sol_id, score, reason, sol_text))
        cur.execute('''
            UPDATE solutions
            SET ai_score = %s, ai_selected = FALSE
            WHERE id = %s;
        ''', (score, sol_id))
        
    # Sort to pick the best valid solution
    # Exclude empty / "no solution"
    valid_scored = [
        item for item in scored 
        if item[3].strip().lower() not in ['no solution', 'none', 'no', 'n/a', '']
    ]
    valid_scored.sort(key=lambda x: x[1], reverse=True)
    
    if valid_scored:
        winner_id = valid_scored[0][0]
        cur.execute('UPDATE solutions SET ai_selected = TRUE WHERE id = %s;', (winner_id,))
        print(f"👑 Best Solution Contribution Winner: ID {winner_id} (Score: {valid_scored[0][1]}/10) - '{valid_scored[0][3]}'")
        
    conn.commit()
    print(f"✓ Evaluated and updated {len(scored)} solutions in Supabase!")
    
    cur.execute('''
        SELECT s.id, s.solution_text, s.submitter_name, s.submitter_email, s.ai_score, s.ai_selected, ai.representative_issue
        FROM solutions s
        JOIN accepted_issues ai ON s.issue_id = ai.id
        WHERE LOWER(TRIM(s.solution_text)) NOT IN ('no solution', 'none', 'no', 'n/a', '')
        ORDER BY s.ai_score DESC, s.id ASC
        LIMIT 10;
    ''')
    for r in cur.fetchall():
        winner_badge = "👑 WINNER" if r[5] else "        "
        print(f"{winner_badge} | Score: {r[4]}/10 | Submitter: {r[2]} ({r[3]}) | Sol: '{r[1]}' for '{r[6]}'")
        
    conn.close()

if __name__ == '__main__':
    main()
