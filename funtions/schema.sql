-- schema.sql

-- 1. Timeline Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  media TEXT,          -- JSON string array: ["url1", "url2"]
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  isPinned INTEGER DEFAULT 0, -- 0 = false, 1 = true
  deviceSignature TEXT
);

-- 2. Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  postId TEXT NOT NULL,
  author TEXT NOT NULL,
  avatarSeed TEXT NOT NULL,
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  isPinned INTEGER DEFAULT 0,
  isApproved INTEGER DEFAULT 0, -- Moderation check (0 = pending/hidden, 1 = approved)
  isReported INTEGER DEFAULT 0,
  parentId TEXT, -- For nested comment replies
  deviceSignature TEXT
);

-- 3. Banned Moderation Words Table
CREATE TABLE IF NOT EXISTS banned_words (
  word TEXT PRIMARY KEY
);

-- 4. System Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'success' | 'warning' | 'info' | 'comment'
  date TEXT NOT NULL,
  isRead INTEGER DEFAULT 0
);

-- Seed initial records (Optional)
INSERT OR IGNORE INTO banned_words (word) VALUES ('spam'), ('scam'), ('offensive');
