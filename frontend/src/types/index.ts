export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface Issue {
  id: number;
  place: string;
  representative_issue: string;
  severity_level: SeverityLevel;
  issue_duration?: string;
  frequency: number;
  first_raiser_name?: string;
  first_raiser_email?: string;
  media_url?: string;
  status: IssueStatus;
  created_at?: string;
  ai_category?: string;
  ai_best_solution?: string;
  ai_best_solution_id?: number;
  ai_reason?: string;
  days_open: number;
  total_solutions: number;
  reward_seekers: number;
}

export interface Solution {
  id: number;
  submitter_name?: string;
  submitter_email?: string;
  solution_text: string;
  wants_reward: boolean;
  is_unique: boolean;
  reward_given: boolean;
  ai_score?: number;
  ai_selected?: boolean;
  submitted_at?: string;
}

export interface ResolutionRecord {
  id: number;
  resolved_by: string;
  resolution_note: string;
  proof_media_url?: string;
  resolved_at?: string;
  verified?: boolean;
}

export interface DashboardStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  total_submissions?: number;
  duplicates_removed?: number;
  rewards_given?: number;
}
