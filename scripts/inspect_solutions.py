import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api import app

client = app.test_client()
res = client.get('/api/issues')
data = res.get_json()
issues = data.get('issues', [])
print(f"Total issues returned: {len(issues)}")

for issue in issues[:6]:
    print(f"ID #{issue['id']} | {issue['representative_issue'][:30]} | Cat: {issue.get('ai_category')}")
    print(f"   People Solution (ai_best_solution): {issue.get('ai_best_solution')}")
    print(f"   AI Solution (ai_suggested_solution): {issue.get('ai_suggested_solution')}")
    print(f"   AI Reason: {issue.get('ai_reason')}")
    print("-" * 50)
