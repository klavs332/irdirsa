import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/auth';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ cookies }) => {
    const sessionId = cookies.get('session');
    if (sessionId) await deleteSession(sessionId);
    cookies.delete('session', { path: '/' });
    redirect(303, '/');
  }
};
