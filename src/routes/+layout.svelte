<script lang="ts">
  import '../app.css';
  import type { LayoutData } from './$types';
  export let data: LayoutData;

  const LEVELS = [
    { max: 1.5, emoji: '😐', label: 'Mierīgi', color: '#22c55e' },
    { max: 2.5, emoji: '😬', label: 'Čakars',  color: '#eab308' },
    { max: 3.5, emoji: '😣', label: 'Sūdīgi',  color: '#f97316' },
    { max: 4.5, emoji: '💩', label: 'Dirsā',   color: '#ef4444' },
    { max: 5,   emoji: '💀', label: 'Pilnīgi dirsā', color: '#991b1b' },
  ];

  $: stats = data.dailyStats;
  $: level = stats.avg > 0 ? LEVELS.find(l => stats.avg <= l.max) ?? LEVELS[4] : null;

  function avatarColor(n: string) {
    return ['#f97316','#8b5cf6','#06b6d4','#10b981','#f43f5e','#3b82f6'][n.charCodeAt(0)%6];
  }
</script>

<!-- Header ir ĀRPUS page-wrap, lai tas var būt full-width -->
<header class="site-header">
  <div class="header-inner">

    <a href="/" class="logo-link">
      <span class="logo-emoji">💩</span>
      <div class="logo-text">
        <div class="logo-title">
          <span class="logo-white">ir </span><span class="logo-orange">dirsā?</span>
        </div>
        <div class="logo-sub">dalies · vērtē · raudi kopā</div>
      </div>
    </a>

    <div class="meter-wrap">
      {#if level && stats.count > 0}
        <div class="meter-badge" style="border-color:{level.color}30;">
          <span class="meter-emoji">{level.emoji}</span>
          <div class="meter-info">
            <div class="meter-label" style="color:{level.color};">{level.label}</div>
            <div class="meter-score">šodien {stats.avg}/5 · {stats.count} ieraksti</div>
          </div>
        </div>
      {:else}
        <div class="meter-badge meter-empty">
          <span class="meter-emoji">🌡️</span>
          <span class="meter-score">nav datu šodien</span>
        </div>
      {/if}
    </div>

    <nav class="site-nav">
      {#if data.user}
        <div class="user-pill">
          <div class="user-avatar"
            style="background:{avatarColor(data.user.username)}22;border-color:{avatarColor(data.user.username)}55;color:{avatarColor(data.user.username)};">
            {data.user.username[0].toUpperCase()}
          </div>
          <span class="user-name">{data.user.username}</span>
        </div>
        <form method="POST" action="/logout">
          <button class="btn-ghost nav-btn">iziet</button>
        </form>
      {:else}
        <a href="/login" class="btn-ghost nav-btn" style="text-decoration:none;display:inline-flex;align-items:center;">ieiet</a>
        <a href="/register" class="btn-primary nav-btn" style="text-decoration:none;display:inline-flex;align-items:center;">reģistrēties</a>
      {/if}
    </nav>

  </div>
</header>

<div class="page-wrap">
  <main class="page-main">
    <slot />
  </main>
</div>

<style>
  /* ── Header – full width ── */
  .site-header {
    position: sticky;
    top: 0;
    z-index: 10;
    width: 100%;
    background: rgba(8,8,8,0.92);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  .header-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 68px;
    gap: 24px;
  }

  /* Logo */
  .logo-link {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    flex-shrink: 0;
  }
  .logo-emoji { font-size: 28px; line-height: 1; }
  .logo-text { display: flex; flex-direction: column; }
  .logo-title { line-height: 1.15; }
  .logo-white { font-weight: 900; font-size: 22px; letter-spacing: -0.04em; color: white; }
  .logo-orange { font-weight: 900; font-size: 22px; letter-spacing: -0.04em; color: #fb923c; }
  .logo-sub { font-size: 10px; color: rgba(255,255,255,0.22); font-weight: 500; letter-spacing: 0.03em; margin-top: 2px; }

  /* Meter */
  .meter-wrap { flex: 1; display: flex; justify-content: center; }
  .meter-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 999px;
    padding: 8px 18px;
  }
  .meter-empty { border-color: rgba(255,255,255,0.06) !important; }
  .meter-emoji { font-size: 18px; line-height: 1; }
  .meter-info { display: flex; flex-direction: column; gap: 1px; }
  .meter-label { font-size: 12px; font-weight: 700; line-height: 1.2; }
  .meter-score { font-size: 10.5px; color: rgba(255,255,255,0.3); line-height: 1.2; }

  /* Nav */
  .site-nav {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .nav-btn { font-size: 13px !important; padding: 9px 18px !important; }

  .user-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 999px;
    padding: 4px 14px 4px 5px;
  }
  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .user-name {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.6);
  }

  /* ── Content wrapper ── */
  .page-wrap {
    max-width: 680px;
    margin: 0 auto;
    padding: 28px 20px 80px;
  }

  .page-main { min-height: 60vh; }

  :global(body) { background: #080808; }
  :global(.flash-highlight) { animation: flash 1.6s ease-out; }
  @keyframes flash {
    0%   { box-shadow: 0 0 0 3px rgba(249,115,22,0.7), 0 0 40px rgba(249,115,22,0.3); border-color: rgba(249,115,22,0.6); }
    100% { box-shadow: none; }
  }

  /* Mobile */
  @media (max-width: 600px) {
    .header-inner { padding: 0 16px; height: 56px; gap: 12px; }
    .logo-emoji { font-size: 22px; }
    .logo-white, .logo-orange { font-size: 18px; }
    .logo-sub { display: none; }
    .meter-badge { padding: 6px 12px; gap: 7px; }
    .meter-score { display: none; }
    .meter-emoji { font-size: 15px; }
    .meter-label { font-size: 11px; }
    .user-name { display: none; }
    .user-pill { padding: 4px 8px 4px 5px; }
    .nav-btn { padding: 8px 12px !important; }
  }
  @media (max-width: 380px) {
    .meter-wrap { display: none; }
  }
</style>
