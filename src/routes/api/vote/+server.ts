import { castVote } from '$lib/db';
import { json } from '@sveltejs/kit';
import { randomBytes } from 'crypto';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { postId, score } = await request.json();

  if (!postId || score < 1 || score > 5) {
    return json({ error: 'invalid' }, { status: 400 });
  }

  let voterKey = cookies.get('voter_key');
  if (!voterKey) {
    voterKey = randomBytes(16).toString('hex');
    cookies.set('voter_key', voterKey, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: 'lax'
    });
  }

  await castVote(Number(postId), Number(score), voterKey);
  return json({ ok: true });
};
