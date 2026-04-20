import { fail, redirect } from '@sveltejs/kit';
import { hashPassword, createSession } from '$lib/auth';
import db from '$lib/db';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const username = String(data.get('username') ?? '').trim();
    const password = String(data.get('password') ?? '');

    if (username.length < 3) return fail(400, { error: 'Lietotājvārds per īss.' });
    if (password.length < 6) return fail(400, { error: 'Parole per īsa.' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return fail(400, { error: 'Tikai burti, cipari un _.' });

    const exists = await db.execute({ sql: `SELECT id FROM users WHERE username = ?`, args: [username] });
    if (exists.rows.length > 0) return fail(400, { error: 'Šāds lietotājvārds jau eksistē.' });

    const result = await db.execute({ sql: `INSERT INTO users (username, password_hash) VALUES (?, ?)`, args: [username, hashPassword(password)] });
    const sessionId = await createSession(Number(result.lastInsertRowid));
    cookies.set('session', sessionId, { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax' });
    redirect(303, '/');
  }
};
