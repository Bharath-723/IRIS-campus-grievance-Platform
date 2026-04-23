-- ── Step 1: Add AI columns to existing tables ────────────────────────────────
ALTER TABLE raw_submissions  ADD ai_category VARCHAR(50);
ALTER TABLE accepted_issues  ADD ai_category      VARCHAR(50);
ALTER TABLE accepted_issues  ADD ai_best_solution TEXT;
ALTER TABLE accepted_issues  ADD ai_best_solution_id INT;
ALTER TABLE accepted_issues  ADD ai_reason       VARCHAR(500);
ALTER TABLE solutions        ADD ai_score        INT DEFAULT 0;
ALTER TABLE solutions        ADD ai_selected     BIT DEFAULT 0;

-- ── Step 2: Create resolved_issues table ──────────────────────────────────────
CREATE TABLE resolved_issues (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    issue_id        INT NOT NULL FOREIGN KEY REFERENCES accepted_issues(id),
    resolved_by     VARCHAR(100),
    resolution_note VARCHAR(500),
    proof_media_url VARCHAR(500),
    resolved_at     DATETIME DEFAULT GETDATE(),
    verified        BIT DEFAULT 0
);

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'accepted_issues';
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'solutions';
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'resolved_issues';
