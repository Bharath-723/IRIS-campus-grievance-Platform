"""
Migration Script: Local MS SQL Server (studentdb) → Supabase (PostgreSQL)

This script migrates all existing student responses, issues, and solutions
from your local Microsoft SQL Server into your new Supabase database.
"""

import os
import pyodbc
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

# MS SQL Server Configuration
MSSQL_CONFIG = (
    "DRIVER={SQL Server};"
    "SERVER=.\\SQLEXPRESS;"
    "DATABASE=studentdb;"
    "Trusted_Connection=yes;"
)

# Supabase PostgreSQL Configuration
SUPABASE_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")

def check_config():
    if not SUPABASE_URL:
        print("❌ Error: SUPABASE_DB_URL is not set in your .env file.")
        return False
    if "[YOUR-DATABASE-PASSWORD]" in SUPABASE_URL:
        print("❌ Error: You still have '[YOUR-DATABASE-PASSWORD]' in your .env file.")
        print("   Please replace it with your real Supabase database password first.")
        return False
    return True

def migrate():
    if not check_config():
        return

    print("=" * 60)
    print("  IRIS — Migrating MS SQL Server (studentdb) → Supabase")
    print("=" * 60)

    # 1. Connect to MS SQL Server
    print("\n[1/5] Connecting to local MS SQL Server (.\\SQLEXPRESS)...")
    try:
        ms_conn = pyodbc.connect(MSSQL_CONFIG, timeout=5)
        ms_cursor = ms_conn.cursor()
        print("  ✓ Connected to MS SQL Server!")
    except Exception as e:
        print(f"  ❌ Failed to connect to MS SQL Server: {e}")
        return

    # 2. Connect to Supabase
    print("\n[2/5] Connecting to Supabase PostgreSQL...")
    try:
        pg_conn = psycopg2.connect(SUPABASE_URL)
        pg_cursor = pg_conn.cursor()
        print("  ✓ Connected to Supabase!")
    except Exception as e:
        print(f"  ❌ Failed to connect to Supabase: {e}")
        print("  Check your SUPABASE_DB_URL and ensure your database password is correct.")
        ms_conn.close()
        return

    try:
        # 3. Migrate raw_submissions
        print("\n[3/5] Migrating raw_submissions...")
        ms_cursor.execute("""
            SELECT id, full_name, email, place,
                   CAST(issue AS VARCHAR(MAX)) as issue,
                   severity_level, issue_duration, media_url,
                   CAST(solution AS VARCHAR(MAX)) as solution,
                   wants_reward, text_hash, submitted_at,
                   is_duplicate, ai_category
            FROM raw_submissions
            ORDER BY id ASC
        """)
        raw_rows = ms_cursor.fetchall()
        print(f"  Found {len(raw_rows)} rows in MS SQL Server.")

        for r in raw_rows:
            wants_rew = bool(r[9]) if r[9] is not None else False
            is_dup = bool(r[12]) if r[12] is not None else False
            pg_cursor.execute("""
                INSERT INTO raw_submissions
                    (id, full_name, email, place, issue, severity_level,
                     issue_duration, media_url, solution, wants_reward,
                     text_hash, submitted_at, is_duplicate, ai_category)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                r[0], r[1], r[2], r[3], r[4], r[5],
                r[6], r[7], r[8], wants_rew,
                r[10], r[11], is_dup, r[13]
            ))
        pg_conn.commit()
        print(f"  ✓ Migrated {len(raw_rows)} raw_submissions into Supabase.")

        # 4. Migrate accepted_issues
        print("\n[4/5] Migrating accepted_issues...")
        ms_cursor.execute("""
            SELECT id, place,
                   CAST(representative_issue AS VARCHAR(MAX)) as representative_issue,
                   severity_level, issue_duration, frequency,
                   first_raiser_name, first_raiser_email, media_url,
                   status, created_at, updated_at, ai_category,
                   ai_priority_score,
                   CAST(ai_suggested_solution AS VARCHAR(MAX)) as ai_suggested_solution,
                   CAST(ai_best_solution AS VARCHAR(MAX)) as ai_best_solution,
                   ai_best_solution_id, ai_reason
            FROM accepted_issues
            ORDER BY id ASC
        """)
        accepted_rows = ms_cursor.fetchall()
        print(f"  Found {len(accepted_rows)} rows in MS SQL Server.")

        for r in accepted_rows:
            pg_cursor.execute("""
                INSERT INTO accepted_issues
                    (id, place, representative_issue, severity_level,
                     issue_duration, frequency, first_raiser_name,
                     first_raiser_email, media_url, status, created_at,
                     updated_at, ai_category, ai_priority_score,
                     ai_suggested_solution, ai_best_solution,
                     ai_best_solution_id, ai_reason)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, tuple(r))
        pg_conn.commit()
        print(f"  ✓ Migrated {len(accepted_rows)} accepted_issues into Supabase.")

        # 5. Migrate solutions
        print("\n[5/5] Migrating solutions...")
        ms_cursor.execute("""
            SELECT id, issue_id, submitter_name, submitter_email,
                   CAST(solution_text AS VARCHAR(MAX)) as solution_text,
                   wants_reward, is_unique, reward_given,
                   ai_score, ai_selected, submitted_at
            FROM solutions
            ORDER BY id ASC
        """)
        solution_rows = ms_cursor.fetchall()
        print(f"  Found {len(solution_rows)} rows in MS SQL Server.")

        for r in solution_rows:
            wants_rew = bool(r[5]) if r[5] is not None else False
            is_uniq   = bool(r[6]) if r[6] is not None else False
            rew_given = bool(r[7]) if r[7] is not None else False
            ai_sel    = bool(r[9]) if r[9] is not None else False
            pg_cursor.execute("""
                INSERT INTO solutions
                    (id, issue_id, submitter_name, submitter_email,
                     solution_text, wants_reward, is_unique, reward_given,
                     ai_score, ai_selected, submitted_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                r[0], r[1], r[2], r[3], r[4],
                wants_rew, is_uniq, rew_given,
                r[8], ai_sel, r[10]
            ))
        pg_conn.commit()
        print(f"  ✓ Migrated {len(solution_rows)} solutions into Supabase.")

        # Reset Postgres sequences so future inserts get valid incremented IDs
        print("\nResetting PostgreSQL auto-increment sequences...")
        for table in ['raw_submissions', 'accepted_issues', 'solutions']:
            pg_cursor.execute(f"""
                SELECT setval(
                    pg_get_serial_sequence('{table}', 'id'),
                    COALESCE((SELECT MAX(id) FROM {table}), 1)
                );
            """)
        pg_conn.commit()
        print("  ✓ Sequence counters updated successfully.")

        print("\n" + "=" * 60)
        print("🎉 SUCCESS: All data migrated from MS SQL Server to Supabase!")
        print(f"  - raw_submissions: {len(raw_rows)}")
        print(f"  - accepted_issues: {len(accepted_rows)}")
        print(f"  - solutions:       {len(solution_rows)}")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        pg_conn.rollback()
    finally:
        ms_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate()
