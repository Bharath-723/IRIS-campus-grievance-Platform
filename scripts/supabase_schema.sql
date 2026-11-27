-- ========================================================
-- IRIS Database Schema for Supabase (PostgreSQL)
-- Paste and run this script in the Supabase SQL Editor
-- ========================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Raw Submissions from Google Form
CREATE TABLE IF NOT EXISTS raw_submissions (
    id BIGSERIAL PRIMARY KEY,
    full_name TEXT,
    email TEXT NOT NULL,
    place TEXT,
    issue TEXT NOT NULL,
    severity_level TEXT,
    issue_duration TEXT,
    media_url TEXT,
    solution TEXT,
    wants_reward BOOLEAN DEFAULT FALSE,
    text_hash VARCHAR(64),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    is_duplicate BOOLEAN DEFAULT FALSE,
    ai_category TEXT
);

-- 2. Accepted Issues (Elevated via Majority Consensus)
CREATE TABLE IF NOT EXISTS accepted_issues (
    id BIGSERIAL PRIMARY KEY,
    place TEXT,
    representative_issue TEXT NOT NULL,
    severity_level TEXT,
    issue_duration TEXT,
    frequency INT DEFAULT 1,
    first_raiser_name TEXT,
    first_raiser_email TEXT,
    media_url TEXT,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ai_category TEXT,
    ai_priority_score INT,
    ai_suggested_solution TEXT,
    ai_best_solution TEXT,
    ai_best_solution_id BIGINT,
    ai_reason TEXT
);

-- 3. Student Proposed Solutions
CREATE TABLE IF NOT EXISTS solutions (
    id BIGSERIAL PRIMARY KEY,
    issue_id BIGINT REFERENCES accepted_issues(id) ON DELETE CASCADE,
    submitter_name TEXT,
    submitter_email TEXT,
    solution_text TEXT NOT NULL,
    wants_reward BOOLEAN DEFAULT FALSE,
    is_unique BOOLEAN DEFAULT FALSE,
    reward_given BOOLEAN DEFAULT FALSE,
    ai_score INT,
    ai_selected BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Resolved Issues Proof
CREATE TABLE IF NOT EXISTS resolved_issues (
    id BIGSERIAL PRIMARY KEY,
    issue_id BIGINT REFERENCES accepted_issues(id) ON DELETE CASCADE,
    resolved_by TEXT,
    resolution_note TEXT,
    proof_media_url TEXT,
    resolved_at TIMESTAMPTZ DEFAULT NOW(),
    verified BOOLEAN DEFAULT FALSE
);

-- 5. Audit & Resolution Log
CREATE TABLE IF NOT EXISTS resolution_log (
    id BIGSERIAL PRIMARY KEY,
    issue_id BIGINT REFERENCES accepted_issues(id) ON DELETE CASCADE,
    action_by TEXT,
    action_note TEXT,
    escalated BOOLEAN DEFAULT FALSE,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- Indexes for Performance
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_raw_submissions_hash ON raw_submissions(text_hash);
CREATE INDEX IF NOT EXISTS idx_raw_submissions_email_time ON raw_submissions(submitted_at, email);
CREATE INDEX IF NOT EXISTS idx_accepted_issues_status ON accepted_issues(status);
CREATE INDEX IF NOT EXISTS idx_accepted_issues_category ON accepted_issues(ai_category);
CREATE INDEX IF NOT EXISTS idx_solutions_issue_id ON solutions(issue_id);
CREATE INDEX IF NOT EXISTS idx_resolved_issues_issue_id ON resolved_issues(issue_id);

-- ========================================================
-- Optional: Enable Row Level Security (RLS)
-- If enabled, add policies as needed. Note: Backend connection
-- via postgres / service_role automatically bypasses RLS.
-- ========================================================
ALTER TABLE raw_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accepted_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolved_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_log ENABLE ROW LEVEL SECURITY;

-- Allow anon read access to accepted issues & solutions (useful if connecting directly from frontend)
CREATE POLICY "Public read accepted issues" ON accepted_issues FOR SELECT USING (true);
CREATE POLICY "Public read solutions" ON solutions FOR SELECT USING (true);
CREATE POLICY "Public read resolved proof" ON resolved_issues FOR SELECT USING (true);
