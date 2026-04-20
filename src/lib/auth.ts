import db from './db';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const attempt = scryptSync(password, salt, 64);
  return timingSafeEqual(Buffer.from(hash, 'hex'), attempt);
}

export async function createSession(userId: number): Promise<string> {
  const id = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.execute({ sql: `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`, args: [id, userId, expires] });
  return id;
}

export async function getSession(sessionId: string): Promise<SessionUser | undefined> {
  const result = await db.execute({
    sql: `SELECT s.id, u.id as user_id, u.username
          FROM sessions s JOIN users u ON s.user_id = u.id
          WHERE s.id = ? AND s.expires_at > datetime('now')`,
    args: [sessionId]
  });
  return result.rows[0] as unknown as SessionUser | undefined;
}

export async function deleteSession(sessionId: string) {
  await db.execute({ sql: `DELETE FROM sessions WHERE id = ?`, args: [sessionId] });
}

export interface SessionUser {
  id: string;
  user_id: number;
  username: string;
}
