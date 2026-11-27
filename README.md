# IRIS — Campus Grievance & Crowd-Sourced Solution Platform

IRIS is an automated grievance intelligence platform for college campuses. It captures student complaints and innovative solutions via Google Forms, eliminates noise with a majority consensus filter, enriches issues using Google Gemini 2.0 Flash AI, persists everything in **Supabase (PostgreSQL)**, and provides an interactive Club Dashboard built with **React, TypeScript & Vite**.

---

## 📁 Clean Architecture

```text
IRIS-extra/
│
├── api.py                    # Flask REST API server & production dashboard host
├── sync.py                   # 30s Google Sheets → Supabase sync & Gemini AI worker
├── db.py                     # Supabase PostgreSQL database connector
│
├── frontend/                 # React + TypeScript + Vite Dashboard
│   ├── src/
│   │   ├── components/       # Reusable UI components (Navbar, Cards, Modals, Lightbox)
│   │   ├── services/         # Strongly typed API client
│   │   ├── types/            # TypeScript interfaces & domain types
│   │   ├── App.tsx           # App state, theme & filter logic
│   │   ├── main.tsx          # React DOM entry
│   │   └── index.css         # Dark & Light design system tokens
│   ├── dist/                 # Production compiled frontend bundle
│   └── package.json          # Node dependencies
│
├── scripts/                  # Database schemas & one-time migration tools
│   ├── supabase_schema.sql          # PostgreSQL DDL for Supabase SQL Editor
│   ├── migrate_mssql_to_supabase.py # MSSQL to Supabase data migration
│   └── export_mssql_to_sheet.py     # MSSQL to Google Sheets export utility
│
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variables template
├── .gitignore                # Production exclusions
└── README.md                 # Project documentation
```

---

## ⚡ Quick Start

### 1. Backend Setup (Python)
```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Ensure your `SUPABASE_DB_URL`, `GEMINI_API_KEY`, and `SPREADSHEET_ID` are configured in `.env`.

### 3. Frontend Setup (React + TypeScript)
```powershell
cd frontend
npm install
npm run build
cd ..
```

---

## 🚀 Running the Platform

### Terminal 1 — Sync Worker (Sheets $\rightarrow$ Supabase)
```powershell
python sync.py
```
*Monitors student Google Form submissions every 30 seconds, runs deduplication, calls Gemini AI to categorize issues, and ranks student solutions in Supabase.*

### Terminal 2 — REST API & Dashboard
```powershell
python api.py
```
*Starts the server at `http://localhost:5000` serving both the REST API and the compiled React TypeScript dashboard.*

### (Optional) Frontend Hot-Reload Development
If you are developing frontend components with live reload:
```powershell
cd frontend
npm run dev
```
*Available at `http://localhost:3000` with automatic API proxy to port 5000.*

---

## 📷 Google Drive Evidence Photos

When students upload photos in Google Forms:
1. Open [Google Drive](https://drive.google.com).
2. Right-click the folder where form responses are uploaded (`Upload Photo Evidence (File responses)`).
3. Select **Share** $\rightarrow$ change General Access from **Restricted** to **"Anyone with the link"** (Viewer).
4. All evidence images will render directly in the dashboard cards.

---

## 🌐 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the React + TypeScript Club Dashboard |
| `GET` | `/api/stats` | Aggregated platform metrics (Total, Open, In Progress, Resolved) |
| `GET` | `/api/issues` | All accepted issues enriched with Gemini categorization & solutions |
| `GET` | `/api/issues/<id>/solutions` | Solutions for an issue, ranked by AI score |
| `POST` | `/api/issues/<id>/status` | Update issue status (`open`, `in_progress`, `resolved`) |
| `POST` | `/api/solutions/<id>/mark-unique` | Flag solution as unique for reward contests |
| `POST` | `/api/issues/<id>/resolve` | Record resolution note and proof image |
| `GET` | `/api/issues/<id>/resolution` | Fetch verification proof of resolved issues |
| `GET` | `/api/image/<file_id>` | Proxies and caches Google Drive photos with instant delivery |
