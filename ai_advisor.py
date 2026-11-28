import os
import json
import urllib.request
import urllib.error
from db import get_db

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
)

def query_gemini(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or len(api_key) < 15:
        return None
    
    # Try current Gemini generative models via Google AI Studio API
    for model_name in ["gemini-1.5-flash", "gemini-2.0-flash"]:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = json.dumps({
                "contents": [{"parts": [{"text": prompt}]}]
            }).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()
        except urllib.error.HTTPError as e:
            try:
                err_data = json.loads(e.read().decode())
                err_msg = err_data.get("error", {}).get("message", "")
                print(f"Gemini notice ({model_name}): HTTP {e.code} — {err_msg}")
            except Exception:
                print(f"Gemini notice ({model_name}): HTTP {e.code}")
        except Exception as e:
            print(f"Gemini notice ({model_name}): {e}")
            
    return None

def generate_smart_solution(issue_text: str, place: str = '', category: str = ''):
    """
    Generates a high-quality, actionable solution proposal and reasoning for any campus grievance.
    Uses Gemini API if available, with intelligent domain heuristics as instant fallback.
    """
    clean_issue = (issue_text or '').strip()
    clean_place = (place or 'Campus').strip()
    clean_cat = (category or '').strip().lower()
    issue_lower = clean_issue.lower()
    combined = f"{clean_issue} {clean_place} {clean_cat}".lower()

    # 1. Try Gemini AI if available
    gemini_prompt = (
        f"You are the IRIS AI Campus Grievance Solution Engine. For the following campus issue, propose "
        f"a specific, actionable, 1-2 sentence solution plan for campus management and a 1-sentence reasoning:\n\n"
        f"Issue: \"{clean_issue}\"\nLocation: \"{clean_place}\"\nCategory: \"{category}\"\n\n"
        f"Respond ONLY in valid JSON:\n"
        f"{{\"solution\": \"...\", \"reason\": \"...\"}}"
    )
    res = query_gemini(gemini_prompt)
    if res:
        try:
            cleaned_json = res
            if '```json' in cleaned_json:
                cleaned_json = cleaned_json.split('```json')[1].split('```')[0].strip()
            elif '```' in cleaned_json:
                cleaned_json = cleaned_json.split('```')[1].split('```')[0].strip()
            parsed = json.loads(cleaned_json)
            if parsed.get('solution') and parsed.get('reason'):
                return parsed['solution'], parsed['reason']
        except Exception:
            pass

    # 2. Intelligent Domain Advisory Rules (Context-Aware Action Plans)
    # Priority 1: Match directly on issue description text
    if any(k in issue_lower for k in ['fan', 'fans', 'light', 'lights', 'switch', 'ac', 'cooler', 'electric', 'shock', 'wire', 'wires']):
        if any(k in issue_lower for k in ['shock', 'wire', 'hazard', 'spark']):
            return (
                f"Immediately cordon off the electrical area in {clean_place}, bundle exposed wiring inside heavy-duty PVC conduit casing, and replace compromised circuit breakers.",
                "Urgent electrical isolation neutralizes shock and fire hazards to safeguard student safety."
            )
        return (
            f"Dispatch facilities electrical technicians to replace faulty capacitors/bearings on fans and install energy-efficient LED fixtures in {clean_place}.",
            "Restoring proper ventilation and illumination prevents heat fatigue and restores classroom/canteen comfort."
        )

    if any(k in issue_lower for k in ['clean', 'cleaning', 'dirty', 'trash', 'dust', 'litter', 'littering', 'stink', 'smell', 'hygiene', 'washroom', 'toilet', 'floor']):
        return (
            f"Schedule dedicated housekeeping sanitization rounds every 30 minutes during peak hours at {clean_place}, and install touch-free disinfectant wipe stations.",
            "Immediate, recurring sanitation prevents microbial spread and maintains a clean, hygienic student environment."
        )

    if any(k in issue_lower for k in ['wifi', 'wi-fi', 'internet', 'network', 'signal', 'speed', 'router']):
        return (
            f"Install enterprise dual-band Wi-Fi access points with dynamic bandwidth load balancing in {clean_place}, and conduct weekly network health audits with the IT department.",
            "Enhanced wireless infrastructure guarantees uninterrupted access for student academic research and online classes."
        )

    if any(k in issue_lower for k in ['grass', 'lawn', 'garden', 'mud', 'turf']):
        return (
            f"Aerate the soil at {clean_place}, plant resilient Bermuda grass turf with an automated sprinkler system, and install modular all-weather benches for student leisure.",
            "Rejuvenating green landscaping prevents soil erosion and creates a pleasant, restorative campus retreat zone."
        )

    if any(k in issue_lower for k in ['parking', 'bike', 'bikes', 'vehicle', 'car', 'space for bikes']):
        return (
            f"Re-engineer parking layout in {clean_place} with painted diagonal bays, separate two-wheeler entry corridors, and station security marshals during morning arrival rush.",
            "Organized spatial demarcations increase parking capacity by 35% and eliminate entry bottlenecks."
        )

    if any(k in issue_lower for k in ['place', 'space', 'crowd', 'crowded', 'capacity', 'not enough place', 'too small', 'competitor', 'competitors']):
        return (
            f"Implement an active zone management system in {clean_place} with optimized modular seating arrangements and clear student circulation corridors.",
            "Dynamic space planning maximizes utilization capacity by 40% and relieves peak traffic congestion."
        )

    if any(k in issue_lower for k in ['price', 'prices', 'canteen', 'expensive', 'cost', 'costly']):
        return (
            f"Institute an administrative price cap audit on canteen vendors at {clean_place} and introduce student-subsidized meal vouchers.",
            "Regular tariff regulation prevents unauthorized markups and preserves student affordability."
        )

    # Priority 2: Fallback to category / location context
    if 'tech' in clean_cat:
        return (
            f"Dispatch IT systems specialists to diagnose hardware, peripheral connectors, and network ports in {clean_place}.",
            "Prompt technical recalibration ensures smooth academic operations and lab readiness."
        )
    if 'hygiene' in clean_cat:
        return (
            f"Deploy deep sanitization crews to steam-clean and sanitize all contact surfaces in {clean_place}.",
            "Thorough surface sanitation eliminates bacteria and upholds campus hygiene."
        )
    if 'infra' in clean_cat:
        return (
            f"Assign campus civil and facilities engineers to inspect structural integrity and repair defects in {clean_place}.",
            "Preventive structural maintenance extends asset longevity and guarantees student safety."
        )

    if any(k in combined for k in ['wifi', 'wi-fi', 'internet', 'network', 'speed', 'portal', 'pc', 'computer', 'lab']):
        return (
            f"Install enterprise dual-band Wi-Fi access points with load balancing in {clean_place}, and conduct weekly bandwidth health audits with the IT infrastructure team.",
            "Enhanced wireless bandwidth ensures uninterrupted access for student academic research and online coursework."
        )

    if any(k in combined for k in ['competitor', 'competitors', 'crowd', 'crowded', 'space', 'not enough place', 'capacity']):
        return (
            f"Implement an active zone management system in {clean_place} with staggered time slots, digital queueing tokens, and expandable seating layouts.",
            "Dynamic traffic scheduling optimizes facility throughput and ensures fair, uncrowded access for all students."
        )

    if any(k in combined for k in ['price', 'cost', 'expensive', 'food', 'canteen food', 'taste', 'quality', 'billing']):
        return (
            f"Institute an administrative price cap audit on canteen vendors and mandate daily food quality inspections by student welfare representatives.",
            "Transparent pricing oversight and quality checks guarantee affordable, nutritious meals for students."
        )

    # General campus maintenance fallback
    return (
        f"Deploy a specialized facilities maintenance taskforce to conduct a complete on-site inspection and execute targeted repairs within 48 hours.",
        "Targeted physical inspection ensures the issue is resolved comprehensively according to campus quality standards."
    )

def upgrade_all_issue_solutions():
    """
    Scans all accepted issues in the database and updates generic solutions with high-quality AI proposals.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, representative_issue, place, ai_category, ai_best_solution, ai_suggested_solution
        FROM accepted_issues
        ORDER BY id ASC;
    """)
    rows = cur.fetchall()
    updated_count = 0

    for issue_id, rep_issue, place, category, best_sol, sugg_sol in rows:
        needs_update = False
        if not sugg_sol or 'facilities management for immediate inspection' in sugg_sol.lower() or len(sugg_sol.strip()) < 10:
            needs_update = True
        
        if needs_update:
            sol, reason = generate_smart_solution(rep_issue, place, category)
            cur.execute("""
                UPDATE accepted_issues
                SET ai_suggested_solution = %s,
                    ai_reason = %s,
                    updated_at = NOW()
                WHERE id = %s;
            """, (sol, reason, issue_id))
            updated_count += 1

    conn.commit()
    conn.close()
    return updated_count

if __name__ == '__main__':
    count = upgrade_all_issue_solutions()
    print(f"Successfully upgraded AI solutions for {count} accepted issues in Supabase!")
