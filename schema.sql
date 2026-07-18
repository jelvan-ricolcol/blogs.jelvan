CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  media TEXT,
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  isPinned INTEGER DEFAULT 0,
  deviceSignature TEXT
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  postId TEXT NOT NULL,
  author TEXT NOT NULL,
  avatarSeed TEXT NOT NULL,
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  isPinned INTEGER DEFAULT 0,
  isApproved INTEGER DEFAULT 0,
  isReported INTEGER DEFAULT 0,
  parentId TEXT,
  deviceSignature TEXT
);

CREATE TABLE IF NOT EXISTS banned_words (
  word TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  isRead INTEGER DEFAULT 0
);

INSERT OR IGNORE INTO banned_words (word) VALUES ("spam"), ("scam"), ("offensive");
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- null for google auth
  name TEXT,
  google_id TEXT UNIQUE,
  is_verified INTEGER DEFAULT 0,
  two_factor_secret TEXT,
  two_factor_enabled INTEGER DEFAULT 0,
  notification_comments INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL, -- 'signup', 'login', 'forgot_password'
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
