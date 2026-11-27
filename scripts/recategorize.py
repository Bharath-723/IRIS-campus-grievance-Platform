import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import get_db

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

def main():
    conn = get_db()
    cur = conn.cursor()

    # 1. Update accepted_issues categories
    cur.execute('SELECT id, representative_issue, place FROM accepted_issues;')
    issues = cur.fetchall()
    for issue_id, text, place in issues:
        cat, score, sol = categorize_by_rules(text, place)
        cur.execute('''
            UPDATE accepted_issues
            SET ai_category = %s,
                ai_priority_score = %s,
                ai_suggested_solution = COALESCE(ai_suggested_solution, %s)
            WHERE id = %s
        ''', (cat, score, sol, issue_id))

    # 2. Update raw_submissions categories
    cur.execute('SELECT id, issue, place FROM raw_submissions;')
    raw = cur.fetchall()
    for r_id, text, place in raw:
        cat, _, _ = categorize_by_rules(text, place)
        cur.execute('UPDATE raw_submissions SET ai_category = %s WHERE id = %s', (cat, r_id))

    # 3. Clean fake student_... emails from accepted_issues
    cur.execute('''
        UPDATE accepted_issues
        SET first_raiser_email = NULL
        WHERE first_raiser_email LIKE '%@campus.local';
    ''')

    # 4. Clean Anonymous Student name to NULL if no real name
    cur.execute('''
        UPDATE accepted_issues
        SET first_raiser_name = NULL
        WHERE first_raiser_name = 'Anonymous Student';
    ''')

    conn.commit()
    print(f"✓ Updated {len(issues)} accepted_issues and {len(raw)} raw_submissions!")

    cur.execute('SELECT id, representative_issue, ai_category, first_raiser_name, first_raiser_email FROM accepted_issues ORDER BY id ASC;')
    for r in cur.fetchall():
        name_str = r[3] or 'None'
        email_str = r[4] or 'None'
        print(f"ID {r[0]:2d}: [{r[2]:14s}] Issue: \"{r[1]:45s}\" | Name: {name_str:20s} | Email: {email_str}")

    conn.close()

if __name__ == '__main__':
    main()
