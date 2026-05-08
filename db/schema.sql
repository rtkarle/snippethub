-- ============================================
-- Online Code Snippet Manager - Advanced Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS snippet_manager;
USE snippet_manager;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(10) DEFAULT '👤',
  bio VARCHAR(200) DEFAULT '',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags Table
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE
);

-- Snippets Table
CREATE TABLE IF NOT EXISTS snippets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  language VARCHAR(30) NOT NULL,
  code LONGTEXT NOT NULL,
  description VARCHAR(500) DEFAULT '',
  is_public TINYINT(1) DEFAULT 0,
  share_token VARCHAR(64) UNIQUE,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Snippet Tags (Many-to-Many)
CREATE TABLE IF NOT EXISTS snippet_tags (
  snippet_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (snippet_id, tag_id),
  FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Snippet Versions (History)
CREATE TABLE IF NOT EXISTS snippet_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  snippet_id INT NOT NULL,
  code LONGTEXT NOT NULL,
  version INT NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  snippet_id INT NOT NULL,
  user_id INT NOT NULL,
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Likes Table (track who liked what)
CREATE TABLE IF NOT EXISTS snippet_likes (
  user_id INT NOT NULL,
  snippet_id INT NOT NULL,
  PRIMARY KEY (user_id, snippet_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
);

-- Collections (Folders)
CREATE TABLE IF NOT EXISTS collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(10) DEFAULT '#0d6efd',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Collection Items
CREATE TABLE IF NOT EXISTS collection_items (
  collection_id INT NOT NULL,
  snippet_id INT NOT NULL,
  PRIMARY KEY (collection_id, snippet_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  snippet_id INT,
  detail VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_snippets_language ON snippets(language);
CREATE INDEX idx_snippets_user ON snippets(user_id);
CREATE INDEX idx_snippets_public ON snippets(is_public);
CREATE INDEX idx_snippets_views ON snippets(views DESC);
CREATE INDEX idx_comments_snippet ON comments(snippet_id);
CREATE INDEX idx_activity_user ON activity_log(user_id);
