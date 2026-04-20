import { fail, redirect } from '@sveltejs/kit';
import { verifyPassword, createSession } from '$lib/auth';
import db from '$lib/db';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const username = String(data.get('username') ?? '').trim();
    const password = String(data.get('password') ?? '');

    const result = await db.execute({ sql: `SELECT * FROM users WHERE username = ?`, args: [username] });
    const user = result.rows[0] as any;

    if (!user || !verifyPassword(password, String(user.password_hash))) {
      return fail(400, { error: 'Nepareizs lietotājvārds vai parole.' });
    }

    const sessionId = await createSession(Number(user.id));
    cookies.set('session', sessionId, { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax' });
    redirect(303, '/');
  }
};
