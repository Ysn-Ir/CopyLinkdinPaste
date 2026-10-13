import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def init_postgres():
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="root",
        host="localhost",
        port=5432
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname='pfe_hunter'")
    if not cur.fetchone():
        cur.execute("CREATE DATABASE pfe_hunter")
        print("Database pfe_hunter created successfully in PostgreSQL!")
    else:
        print("Database pfe_hunter already exists in PostgreSQL!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    init_postgres()
