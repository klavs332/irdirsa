import { getComments } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const postId = Number(params.postId);
  if (!postId) return json({ error: 'invalid' }, { status: 400 });
  const comments = await getComments(postId);
  return json(comments);
};
