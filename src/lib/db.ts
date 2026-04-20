import { createClient } from '@libsql/client';
import { join } from 'path';

const db = createClient({ url: `file:${join(process.cwd(), 'dirsa.db')}` });

export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      tag TEXT DEFAULT '',
      username TEXT DEFAULT 'anonīms',
      user_id INTEGER,
      media_url TEXT DEFAULT '',
      media_type TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
      voter_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, voter_key)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      username TEXT DEFAULT 'anonīms',
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS also_me (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      voter_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, voter_key)
    );
  `);
  try { await db.execute(`ALTER TABLE posts ADD COLUMN media_url TEXT DEFAULT ''`); } catch {}
  try { await db.execute(`ALTER TABLE posts ADD COLUMN media_type TEXT DEFAULT ''`); } catch {}
  try { await db.execute(`CREATE TABLE IF NOT EXISTS visitors (visitor_key TEXT PRIMARY KEY, first_seen DATETIME DEFAULT CURRENT_TIMESTAMP, last_seen DATETIME DEFAULT CURRENT_TIMESTAMP)`); } catch {}
}

export async function trackVisitor(visitorKey: string): Promise<void> {
  try {
    await db.execute({ sql: `INSERT INTO visitors (visitor_key) VALUES (?)`, args: [visitorKey] });
  } catch {
    await db.execute({ sql: `UPDATE visitors SET last_seen = CURRENT_TIMESTAMP WHERE visitor_key = ?`, args: [visitorKey] });
  }
}

export async function getVisitorCount(): Promise<number> {
  const r = await db.execute(`SELECT COUNT(*) as c FROM visitors`);
  return Number(r.rows[0].c);
}

export default db;

const POST_SELECT = `
  SELECT p.*,
    COUNT(DISTINCT v.id) as vote_count,
    COALESCE(ROUND(AVG(v.score), 1), 0) as avg_score,
    COUNT(DISTINCT c.id) as comment_count,
    COUNT(DISTINCT a.id) as also_me_count
  FROM posts p
  LEFT JOIN votes v ON p.id = v.post_id
  LEFT JOIN comments c ON p.id = c.post_id
  LEFT JOIN also_me a ON p.id = a.post_id
`;

export async function getPosts(limit = 100): Promise<Post[]> {
  const result = await db.execute({
    sql: `${POST_SELECT} GROUP BY p.id ORDER BY p.created_at DESC LIMIT ?`,
    args: [limit]
  });
  return result.rows as unknown as Post[];
}

export async function getTopPostToday(): Promise<Post | null> {
  const result = await db.execute({
    sql: `${POST_SELECT}
      WHERE p.created_at >= datetime('now', '-24 hours')
      GROUP BY p.id
      HAVING vote_count >= 2
      ORDER BY avg_score DESC, vote_count DESC
      LIMIT 1`,
    args: []
  });
  return (result.rows[0] as unknown as Post) ?? null;
}

export async function getDailyStats(): Promise<{ avg: number; count: number }> {
  const result = await db.execute(
    `SELECT COALESCE(ROUND(AVG(score),1),0) as avg, COUNT(*) as count FROM votes WHERE created_at >= datetime('now','-1 day')`
  );
  const r = result.rows[0];
  return { avg: Number(r?.avg ?? 0), count: Number(r?.count ?? 0) };
}

export async function createPost(
  content: string, tag: string, username: string,
  userId?: number, mediaUrl = '', mediaType = ''
) {
  return db.execute({
    sql: `INSERT INTO posts (content, tag, username, user_id, media_url, media_type) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [content, tag, username, userId ?? null, mediaUrl, mediaType]
  });
}

export async function castVote(postId: number, score: number, voterKey: string) {
  try {
    await db.execute({ sql: `INSERT INTO votes (post_id, score, voter_key) VALUES (?, ?, ?)`, args: [postId, score, voterKey] });
  } catch {
    await db.execute({ sql: `UPDATE votes SET score = ? WHERE post_id = ? AND voter_key = ?`, args: [score, postId, voterKey] });
  }
}

export async function getVoterVotes(voterKey: string): Promise<Record<number, number>> {
  const result = await db.execute({ sql: `SELECT post_id, score FROM votes WHERE voter_key = ?`, args: [voterKey] });
  return Object.fromEntries(result.rows.map(r => [Number(r.post_id), Number(r.score)]));
}

export async function toggleAlsoMe(postId: number, voterKey: string): Promise<{ active: boolean; count: number }> {
  const existing = await db.execute({ sql: `SELECT id FROM also_me WHERE post_id=? AND voter_key=?`, args: [postId, voterKey] });
  if (existing.rows.length > 0) {
    await db.execute({ sql: `DELETE FROM also_me WHERE post_id=? AND voter_key=?`, args: [postId, voterKey] });
  } else {
    await db.execute({ sql: `INSERT INTO also_me (post_id, voter_key) VALUES (?,?)`, args: [postId, voterKey] });
  }
  const cnt = await db.execute({ sql: `SELECT COUNT(*) as c FROM also_me WHERE post_id=?`, args: [postId] });
  return { active: existing.rows.length === 0, count: Number(cnt.rows[0].c) };
}

export async function getAlsoMeByVoter(voterKey: string): Promise<number[]> {
  const result = await db.execute({ sql: `SELECT post_id FROM also_me WHERE voter_key=?`, args: [voterKey] });
  return result.rows.map(r => Number(r.post_id));
}

export async function getComments(postId: number): Promise<Comment[]> {
  const result = await db.execute({ sql: `SELECT * FROM comments WHERE post_id=? ORDER BY created_at ASC`, args: [postId] });
  return result.rows as unknown as Comment[];
}

export async function addComment(postId: number, content: string, username: string, userId?: number) {
  return db.execute({
    sql: `INSERT INTO comments (post_id, content, username, user_id) VALUES (?,?,?,?)`,
    args: [postId, content, username, userId ?? null]
  });
}

export async function deletePost(postId: number, userId: number) {
  await db.execute({
    sql: `DELETE FROM posts WHERE id = ? AND user_id = ?`,
    args: [postId, userId]
  });
}

export async function updatePost(postId: number, userId: number, content: string, tag: string) {
  await db.execute({
    sql: `UPDATE posts SET content = ?, tag = ? WHERE id = ? AND user_id = ?`,
    args: [content, tag, postId, userId]
  });
}

export interface Post {
  id: number; content: string; tag: string; username: string;
  user_id: number | null; media_url: string; media_type: string;
  created_at: string; vote_count: number; avg_score: number;
  comment_count: number; also_me_count: number;
}
export interface Comment {
  id: number; post_id: number; content: string;
  username: string; user_id: number | null; created_at: string;
}
