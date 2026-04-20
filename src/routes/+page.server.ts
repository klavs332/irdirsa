import { getPosts, createPost, deletePost, updatePost, getVoterVotes, getAlsoMeByVoter, getTopPostToday, trackVisitor, getVisitorCount } from '$lib/db';
import { getSession } from '$lib/auth';
import { generateAnonName } from '$lib/names';
import { fail } from '@sveltejs/kit';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const sessionId = cookies.get('session');
  const user = sessionId ? await getSession(sessionId) : null;

  let voterKey = cookies.get('voter_key');
  if (!voterKey) {
    const { randomBytes } = await import('crypto');
    voterKey = randomBytes(16).toString('hex');
    cookies.set('voter_key', voterKey, { path: '/', maxAge: 60*60*24*365, httpOnly: true, sameSite: 'lax' });
  }

  const [posts, myVotes, myAlsoMe, champion, visitorCount] = await Promise.all([
    getPosts(),
    getVoterVotes(voterKey),
    getAlsoMeByVoter(voterKey),
    getTopPostToday(),
    trackVisitor(voterKey).then(() => getVisitorCount())
  ]);

  return { posts, myVotes, myAlsoMe, champion, user, visitorCount };
};

export const actions: Actions = {
  post: async ({ request, cookies }) => {
    const data = await request.formData();
    const content = String(data.get('content') ?? '').trim();
    const tag = String(data.get('tag') ?? '').trim();

    if (!content || content.length < 5) return fail(400, { error: 'Per īss teksts!' });
    if (content.length > 500) return fail(400, { error: 'Max 500 simboli!' });

    let mediaUrl = '', mediaType = '';
    const mediaFile = data.get('media') as File | null;
    if (mediaFile && mediaFile.size > 0) {
      const isImage = mediaFile.type.startsWith('image/');
      const isVideo = mediaFile.type.startsWith('video/');
      if (!isImage && !isVideo) return fail(400, { error: 'Tikai attēli un video!' });
      if (isImage && mediaFile.size > 15*1024*1024) return fail(400, { error: 'Attēls max 15MB.' });
      if (isVideo && mediaFile.size > 80*1024*1024) return fail(400, { error: 'Video max 80MB.' });
      const ext = (mediaFile.name.split('.').pop() ?? 'bin').toLowerCase();
      const filename = `${randomUUID()}.${ext}`;
      const dir = join(process.cwd(), 'static', 'uploads');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, filename), Buffer.from(await mediaFile.arrayBuffer()));
      mediaUrl = `/uploads/${filename}`;
      mediaType = isImage ? 'image' : 'video';
    }

    const sessionId = cookies.get('session');
    const user = sessionId ? await getSession(sessionId) : null;

    let username: string;
    if (user) {
      username = user.username;
    } else {
      let voterKey = cookies.get('voter_key');
      if (!voterKey) {
        const { randomBytes } = await import('crypto');
        voterKey = randomBytes(16).toString('hex');
        cookies.set('voter_key', voterKey, { path: '/', maxAge: 60*60*24*365, httpOnly: true, sameSite: 'lax' });
      }
      username = generateAnonName(voterKey);
    }

    await createPost(content, tag, username, user?.user_id ? Number(user.user_id) : undefined, mediaUrl, mediaType);
    return { success: true };
  },

  delete: async ({ request, cookies }) => {
    const sessionId = cookies.get('session');
    const user = sessionId ? await getSession(sessionId) : null;
    if (!user) return fail(401, { error: 'Nav autorizēts!' });

    const data = await request.formData();
    const postId = Number(data.get('postId'));
    if (!postId) return fail(400, { error: 'Nav post ID!' });

    await deletePost(postId, Number(user.user_id));
    return { success: true };
  },

  edit: async ({ request, cookies }) => {
    const sessionId = cookies.get('session');
    const user = sessionId ? await getSession(sessionId) : null;
    if (!user) return fail(401, { error: 'Nav autorizēts!' });

    const data = await request.formData();
    const postId = Number(data.get('postId'));
    const content = String(data.get('content') ?? '').trim();
    const tag = String(data.get('tag') ?? '').trim();

    if (!content || content.length < 5) return fail(400, { error: 'Per īss teksts!' });
    if (content.length > 500) return fail(400, { error: 'Max 500 simboli!' });

    await updatePost(postId, Number(user.user_id), content, tag);
    return { success: true };
  }
};
