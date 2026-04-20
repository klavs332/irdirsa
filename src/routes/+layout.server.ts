import { getSession } from '$lib/auth';
import { getDailyStats } from '$lib/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const sessionId = cookies.get('session');
  const user = sessionId ? await getSession(sessionId) : null;
  const dailyStats = await getDailyStats();
  return { user: user ?? null, dailyStats };
};
