CREATE TABLE admin_accounts(username TEXT PRIMARY KEY,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE admin_sessions(hash TEXT PRIMARY KEY,username TEXT NOT NULL REFERENCES admin_accounts(username) ON DELETE CASCADE,csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX admin_sessions_expiry ON admin_sessions(expires_at);
