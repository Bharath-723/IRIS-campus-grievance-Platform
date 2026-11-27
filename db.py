import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def get_db():
    """
    Connects to Supabase PostgreSQL using SUPABASE_DB_URL or DATABASE_URL.
    Falls back to SQL Server via pyodbc if DB_CONFIG is explicitly specified.
    """
    db_url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
    if db_url:
        import psycopg2
        return psycopg2.connect(db_url)
    
    # Fallback to local SQL Server if DB_CONFIG exists
    sql_server_config = os.getenv("DB_CONFIG")
    if sql_server_config:
        import pyodbc
        return pyodbc.connect(sql_server_config)

    raise ValueError(
        "No database configuration found!\n"
        "Please set SUPABASE_DB_URL in your .env file:\n"
        "SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres\n"
        "You can find your connection string in your Supabase project settings -> Database."
    )
