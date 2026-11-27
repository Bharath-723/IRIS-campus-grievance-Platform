import { DashboardStats, Issue, ResolutionRecord, ResolvedIssue, Solution, TopSolution } from '../types';

const API_BASE = '/api';

export async function fetchIssues(): Promise<Issue[]> {
  const res = await fetch(`${API_BASE}/issues`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch issues');
  return data.issues;
}

export async function fetchResolvedIssues(): Promise<ResolvedIssue[]> {
  const res = await fetch(`${API_BASE}/resolved-issues`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch resolved issues');
  return data.issues;
}

export async function fetchTopIssues(): Promise<Issue[]> {
  const res = await fetch(`${API_BASE}/top-issues`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch top issues');
  return data.issues;
}

export async function fetchTopSolutions(): Promise<{ winner: TopSolution | null; solutions: TopSolution[] }> {
  const res = await fetch(`${API_BASE}/top-solutions`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch top solutions');
  return { winner: data.winner, solutions: data.solutions };
}

export async function fetchSolutions(issueId: number): Promise<Solution[]> {
  const res = await fetch(`${API_BASE}/issues/${issueId}/solutions`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch solutions');
  return data.solutions;
}

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/stats`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch stats');
  return data.stats;
}

export async function updateIssueStatus(issueId: number, status: string, note: string): Promise<void> {
  const res = await fetch(`${API_BASE}/issues/${issueId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note, action_by: 'club' }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to update status');
}

export async function submitResolutionProof(
  issueId: number,
  resolvedBy: string,
  resolutionNote: string,
  proofMediaUrl?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/issues/${issueId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resolved_by: resolvedBy,
      resolution_note: resolutionNote,
      proof_media_url: proofMediaUrl || '',
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to submit resolution');
}

export async function markSolutionUnique(solutionId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/solutions/${solutionId}/mark-unique`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to mark unique');
}

export async function fetchResolutionRecord(issueId: number): Promise<ResolutionRecord[]> {
  const res = await fetch(`${API_BASE}/issues/${issueId}/resolution`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch resolution records');
  return data.records;
}

export function getImageUrl(url?: string): string {
  if (!url) return '';
  const match = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return `${API_BASE}/image/${match[1]}`;
  }
  return url;
}
