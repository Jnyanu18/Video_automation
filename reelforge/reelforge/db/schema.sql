-- ReelForge SQLite Schema
PRAGMA foreign_keys = ON;


CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    path TEXT UNIQUE NOT NULL,
    active INTEGER DEFAULT 1,
    settings_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reference_reels (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    source_url TEXT,
    local_path TEXT NOT NULL,
    title TEXT,
    duration REAL,
    status TEXT NOT NULL, -- 'pending', 'downloading', 'extracting', 'analyzing', 'completed', 'failed'
    progress REAL DEFAULT 0.0,
    analysis_json TEXT,   -- Cached metrics (cuts, palette, audio, transcript, vision)
    error_message TEXT,
    weight REAL DEFAULT 1.0,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS style_sheets (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL,
    rules_json TEXT NOT NULL,
    source_reel_count INTEGER NOT NULL,
    diff_json TEXT,
    approved INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS storyboards (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    raw_video_path TEXT NOT NULL,
    style_sheet_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    scenes_json TEXT NOT NULL,
    approved INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(style_sheet_id) REFERENCES style_sheets(id)
);

CREATE TABLE IF NOT EXISTS renders (
    id TEXT PRIMARY KEY,
    storyboard_id TEXT NOT NULL,
    quality TEXT NOT NULL, -- 'draft', 'final'
    status TEXT NOT NULL,  -- 'queued', 'rendering', 'completed', 'failed'
    progress REAL DEFAULT 0.0,
    output_path TEXT,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(storyboard_id) REFERENCES storyboards(id)
);

CREATE TABLE IF NOT EXISTS job_queue (
    id TEXT PRIMARY KEY,
    queue_name TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'queued', 'running', 'completed', 'failed'
    retries INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
