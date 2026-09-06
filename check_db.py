import sqlite3

con = sqlite3.connect('backend/creatoriq.db')
cur = con.cursor()
tables = [t[0] for t in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print('Tables in creatoriq.db:', tables)
for t in tables:
    count = cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"  {t}: {count} rows")

cur.execute("SELECT id, email, full_name FROM users")
print('Users:', cur.fetchall())

cur.execute("SELECT id, user_id, platform, channel_name, platform_username, is_connected FROM social_accounts")
print('Social Accounts:', cur.fetchall())
