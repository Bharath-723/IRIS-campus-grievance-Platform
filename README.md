# IRIS — Issue Reporting  & Intelligence System

A student club dashboard platform for issue tracking with AI-powered solutions. Members raise issues, the system analyzes them using Google Gemini, and the community votes on the best solutions.

## Features

- **Issue Tracking Dashboard**: Comprehensive dashboard for viewing and managing reported issues
- **Severity-Based Prioritization**: Issues automatically sorted by severity (Critical, High, Medium, Low)
- **AI-Powered Analysis**: Google Gemini integration for automatic issue categorization and solution suggestions
- **Solution Management**: Community members can propose solutions with reward tracking
- **Real-Time Sync**: Automatic synchronization with Google Sheets for collaborative data management
- **SQL Server Integration**: Persistent data storage with SQL Server (SQLEXPRESS)
- **REST API**: Full-featured Flask API endpoints for dashboard operations
- **Responsive UI**: Modern dark-themed dashboard interface

## Tech Stack

- **Backend**: Python 3.10+ with Flask framework
- **Frontend**: HTML5, CSS3, JavaScript
- **Database**: SQL Server (SQLEXPRESS)
- **AI/ML**: Google Gemini API
- **Data Integration**: Google Sheets API (gspread)
- **Libraries**: Flask-CORS, pyodbc, gspread, google-auth

## Project Structure

```
Project-IRIS/
├── api.py                      # Flask API server with issue endpoints
├── sync.py                     # Google Sheets & Gemini AI sync service
├── club_dashboard_v4.html      # Interactive dashboard UI
├── credentials.json            # Google API credentials (⚠️ keep secret)
├── db_queries.txt              # Database query documentation
├── db_update.sql               # SQL Server schema updates
└── README.md                   # This file
```

## Getting Started

### Prerequisites

- Python 3.10+
- SQL Server (SQLEXPRESS)
- Google Cloud Project with Gemini API enabled
- Google Sheets API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Bharath-723/project-IRIS.git
   cd project-IRIS
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   source .venv/bin/activate  # Mac/Linux
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up database**
   - Update SQL Server connection string in `api.py` and `sync.py`
   - Run `db_update.sql` to create tables

5. **Configure Google APIs**
   - Place `credentials.json` in project root
   - Update `SHEET_ID` in `sync.py`

### Running the Application

**Start the API server:**
```bash
python api.py
```
Server runs on `http://localhost:5000`

**Start the sync service (in another terminal):**
```bash
python sync.py
```
Automatically syncs data every 30 seconds

**Open dashboard:**
```
http://localhost:5000/dashboard
```
(Open `club_dashboard_v4.html` in browser)

## API Endpoints

- `GET /api/issues` - Retrieve all issues with statistics
- `POST /api/issues` - Create new issue
- `GET /api/issues/<id>` - Get specific issue details
- `POST /api/solutions` - Submit solution for an issue
- `GET /api/stats` - Get dashboard statistics

## Database Schema

### accepted_issues
- `id`, `place`, `representative_issue`, `severity_level`, `issue_duration`, `frequency`
- `first_raiser_name`, `first_raiser_email`, `media_url`
- `status`, `created_at`, `ai_category`
- `ai_suggested_solution`, `ai_best_solution`, `ai_best_solution_id`, `ai_reason`

### solutions
- `id`, `issue_id`, `solution_text`, `proposed_by`
- `wants_reward`, `upvote_count`, `created_at`

## Configuration

Key settings in `sync.py`:
- `SYNC_INTERVAL = 30` — Data sync frequency (seconds)
- `MAJORITY_THRESHOLD = 3` — Votes needed to approve solution
- `GEMINI_API_KEY` — Add your API key

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/YourFeature`)
3. Commit changes (`git commit -m 'Add YourFeature'`)
4. Push to branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) file for details.

## Contact

**Project Lead:** Bharath-723

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Last Updated:** April 23, 2026
