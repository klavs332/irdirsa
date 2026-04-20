import { addComment } from '$lib/db';
import { getSession } from '$lib/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const sessionId = cookies.get('session');
  const user = sessionId ? await getSession(sessionId) : null;
  if (!user) return json({ error: 'Nav autorizēts' }, { status: 401 });

  const { postId, content } = await request.json();
  if (!postId || !content?.trim() || content.trim().length < 2) {
    return json({ error: 'Per īss komentārs' }, { status: 400 });
  }
  if (content.trim().length > 300) {
    return json({ error: 'Max 300 simboli' }, { status: 400 });
  }

  await addComment(Number(postId), content.trim(), user.username, Number(user.user_id));
  return json({ ok: true });
};
