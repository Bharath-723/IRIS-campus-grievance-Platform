# IRIS — Campus Grievance & Crowd-Sourced Solution Platform

IRIS is an automated grievance intelligence platform for college campuses. It captures student complaints and innovative solutions via Google Forms, eliminates noise with a majority consensus filter, enriches issues using Google Gemini 2.0 Flash AI, persists everything in **Supabase (PostgreSQL)**, and provides an interactive Club Dashboard for tracking resolutions.

---

## 📁 Project Structure

```text
IRIS-extra/
│
├── api.py                 # Flask REST API server & web dashboard host
├── sync.py                # 30s Google Sheets → Supabase sync & Gemini AI worker
├── db.py                  # Supabase PostgreSQL database connector
├── index.html             # Administrative Club Dashboard (Single Page App)
│
├── supabase_schema.sql    # Complete PostgreSQL DDL for Supabase SQL Editor
├── requirements.txt       # Python dependencies (includes psycopg2-binary)
├── .env.example           # Environment template (Supabase DB URL, Gemini, etc.)
├── .gitignore             # Secrets & cache exclusions
└── README.md              # Project documentation and setup guide
```

---

## ⚡ Setup Guide

### 1. Supabase Database Setup
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. In your Supabase project dashboard, open the **SQL Editor** from the left sidebar.
3. Open `supabase_schema.sql` from this repository, copy its entire contents, paste it into the SQL Editor, and click **Run**.
4. Go to **Project Settings** &rarr; **Database** &rarr; **Connection string** &rarr; select **URI**.
5. Copy the connection string (format: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`).

### 2. Local Environment Setup
```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Secrets
Create a `.env` file based on `.env.example`:
```powershell
Copy-Item .env.example .env
```
Paste your Supabase database connection string into `SUPABASE_DB_URL` with your actual Supabase database password.

### 4. Running the Platform
Open two terminal windows:

**Terminal 1 — Background Sync Worker:**
```powershell
python sync.py
```
*Monitors student Google Form submissions every 30 seconds, runs deduplication, calls Gemini AI to categorize issues, and ranks student solutions in Supabase.*

**Terminal 2 — REST API & Dashboard:**
```powershell
python api.py
```
*Starts the web server at `http://localhost:5000`.*

**Access the Dashboard:**
Open `http://localhost:5000/` in your browser.

---

## 🌐 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the Club Dashboard |
| `GET` | `/api/stats` | Aggregated platform metrics (Total, Open, In Progress, Resolved) |
| `GET` | `/api/issues` | All accepted issues enriched with Gemini categorization & solutions |
| `GET` | `/api/issues/<id>/solutions` | Solutions for an issue, ranked by AI score |
| `POST` | `/api/issues/<id>/status` | Update issue status (`open`, `in_progress`, `resolved`) |
| `POST` | `/api/solutions/<id>/mark-unique` | Flag solution as unique for reward contests |
| `POST` | `/api/issues/<id>/resolve` | Record resolution note and proof image |
| `GET` | `/api/issues/<id>/resolution` | Fetch verification proof of resolved issues |
