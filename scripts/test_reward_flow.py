import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import io
from api import app

client = app.test_client()

# 1. Test File Upload
data = {'file': (io.BytesIO(b'fake image data'), 'test_proof.jpg')}
res = client.post('/api/upload', data=data, content_type='multipart/form-data')
print('UPLOAD TEST:', res.status_code, res.get_json())

# 2. Check Top Issues before reward
res_issues_before = client.get('/api/top-issues').get_json()['issues']
top_id = res_issues_before[0]['id']
print('TOP ISSUES BEFORE REWARD:', [i['id'] for i in res_issues_before[:3]])

# 3. Issue reward to top 1 ticket
r1 = client.post(f'/api/issues/{top_id}/issue-reward')
print('ISSUE TICKET REWARD:', r1.status_code, r1.get_json())

# 4. Check Top Issues after reward (top 1 ticket should be removed from top 10 list)
res_issues_after = client.get('/api/top-issues').get_json()['issues']
print('TOP ISSUES AFTER REWARD:', [i['id'] for i in res_issues_after[:3]])

# 5. Check Top Solutions before reward
res_sols_before = client.get('/api/top-solutions').get_json()
top_sol_id = res_sols_before['winner']['id']
print('TOP SOL WINNER BEFORE:', top_sol_id, res_sols_before['winner']['submitter_name'])

# 6. Issue reward to top 1 solution
r2 = client.post(f'/api/solutions/{top_sol_id}/issue-reward')
print('ISSUE SOL REWARD:', r2.status_code, r2.get_json())

# 7. Check Top Solutions after reward (top 1 solution should be removed from top 10 list)
res_sols_after = client.get('/api/top-solutions').get_json()
new_sol_winner = res_sols_after['winner']['id'] if res_sols_after['winner'] else None
print('TOP SOL WINNER AFTER:', new_sol_winner, res_sols_after['winner']['submitter_name'] if res_sols_after['winner'] else None)

# 8. Check Previous Winners page (should show top 1 ticket and top 1 solution)
winners = client.get('/api/winners').get_json()
print('PREVIOUS WINNERS TICKET:', [(t['id'], t['first_raiser_name'], t['representative_issue']) for t in winners['ticket_winners']])
print('PREVIOUS WINNERS SOL:', [(s['id'], s['submitter_name'], s['solution_text']) for s in winners['solution_winners']])
