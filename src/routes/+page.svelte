<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { PageData, ActionData } from './$types';
  import type { Post, Comment } from '$lib/db';

  export let data: PageData;
  export let form: ActionData;

  const LEVELS = [
    { score: 1, label: 'Nav traki',     emoji: '😐', color: '#22c55e' },
    { score: 2, label: 'Čakars',        emoji: '😬', color: '#eab308' },
    { score: 3, label: 'Sūdīgi',        emoji: '😣', color: '#f97316' },
    { score: 4, label: 'Dirsā',         emoji: '💩', color: '#ef4444' },
    { score: 5, label: 'Pilnīgi dirsā', emoji: '💀', color: '#991b1b' },
  ];
  const TAGS = [
    { key: 'darbs',       label: 'Darbs',       emoji: '💼' },
    { key: 'attiecības',  label: 'Attiecības',  emoji: '💔' },
    { key: 'nauda',       label: 'Nauda',       emoji: '💸' },
    { key: 'veselība',    label: 'Veselība',    emoji: '🏥' },
    { key: 'birokrātija', label: 'Birokrātija', emoji: '📋' },
    { key: 'Latvija™',   label: 'Latvija™',    emoji: '🇱🇻' },
    { key: 'transports',  label: 'Transports',  emoji: '🚗' },
    { key: 'cits',        label: 'Cits',        emoji: '🤷' },
  ];
  const COMMENT_GUEST_LIMIT = 3;

  let activeFilter = '';
  let showForm = false;
  let content = '';
  let selectedTag = '';
  let posting = false;
  let mediaInput: HTMLInputElement;
  let mediaPreview: { url: string; type: string } | null = null;
  let mediaError = '';

  let expandedPosts = new Set<number>();
  let commentsMap: Record<number, Comment[]> = {};
  let loadingComments = new Set<number>();
  let commentTexts: Record<number, string> = {};
  let submittingComment = new Set<number>();

  let flashPostId: number | null = null;

  let editingPostId: number | null = null;
  let editContent = '';
  let editTag = '';
  let saving = false;
  let deletingPostId: number | null = null;
  let deleting = false;

  function startEdit(post: Post) {
    editingPostId = post.id;
    editContent = post.content;
    editTag = post.tag;
  }
  function cancelEdit() { editingPostId = null; }
  function startDelete(postId: number) { deletingPostId = postId; }
  function cancelDelete() { deletingPostId = null; }

  let liveViewers = 1;
  $: visitorCount = data.visitorCount ?? 0;

  onMount(() => {
    const es = new EventSource('/api/live');
    es.onmessage = (e) => { liveViewers = Number(e.data); };
    return () => es.close();
  });

  $: user = data.user;
  $: champion = data.champion ?? null;

  let myVotes: Record<number, number> = data.myVotes ?? {};
  let myAlsoMe: Set<number> = new Set(data.myAlsoMe ?? []);
  let posts: Post[] = data.posts ?? [];
  $: { posts = data.posts ?? []; myVotes = data.myVotes ?? {}; myAlsoMe = new Set(data.myAlsoMe ?? []); }
  $: filtered = activeFilter ? posts.filter(p => p.tag === activeFilter) : posts;
  $: tagCounts = TAGS.reduce((a,t) => { a[t.key]=posts.filter(p=>p.tag===t.key).length; return a; }, {} as Record<string,number>);

  function scoreLevel(avg: number) {
    if (!avg) return null;
    return LEVELS[Math.round(avg)-1] ?? LEVELS[4];
  }
  function timeAgo(d: string) {
    const m = Math.floor((Date.now()-new Date(d).getTime())/60000);
    if (m<1) return 'tikko'; if (m<60) return `${m} min`;
    const h=Math.floor(m/60); if (h<24) return `${h}h`;
    return `${Math.floor(h/24)}d`;
  }
  function avatarColor(n: string) {
    return ['#f97316','#8b5cf6','#06b6d4','#10b981','#f43f5e','#3b82f6'][n.charCodeAt(0)%6];
  }

  async function handleMediaPick(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    mediaError = '';
    if (mediaPreview) { URL.revokeObjectURL(mediaPreview.url); mediaPreview=null; }
    if (!file) return;
    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.src = url;
      await new Promise<void>(r => vid.addEventListener('loadedmetadata',()=>r(),{once:true}));
      if (vid.duration>10) { mediaError='Video max 10 sekundes!'; URL.revokeObjectURL(url); input.value=''; return; }
      URL.revokeObjectURL(url);
      mediaPreview = { url: URL.createObjectURL(file), type: 'video' };
    } else { mediaPreview = { url: URL.createObjectURL(file), type: 'image' }; }
  }
  function removeMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview.url);
    mediaPreview=null; if (mediaInput) mediaInput.value='';
  }

  async function vote(postId: number, score: number) {
    const prev = myVotes[postId];
    myVotes = { ...myVotes, [postId]: score };
    posts = posts.map(p => {
      if (p.id!==postId) return p;
      const wasVoted=prev!=null, count=wasVoted?p.vote_count:p.vote_count+1;
      const total=wasVoted?p.avg_score*p.vote_count-prev+score:p.avg_score*p.vote_count+score;
      return {...p, vote_count:count, avg_score:Math.round((total/count)*10)/10};
    });
    await fetch('/api/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId,score})});
    await invalidateAll();
  }

  async function toggleAlsoMe(postId: number) {
    const was = myAlsoMe.has(postId);
    if (was) myAlsoMe.delete(postId); else myAlsoMe.add(postId);
    myAlsoMe = new Set(myAlsoMe);
    posts = posts.map(p => p.id===postId ? {...p, also_me_count: p.also_me_count+(was?-1:1)} : p);
    await fetch('/api/alsome',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId})});
  }

  async function toggleComments(postId: number) {
    if (expandedPosts.has(postId)) { expandedPosts.delete(postId); expandedPosts=new Set(expandedPosts); return; }
    expandedPosts.add(postId); expandedPosts=new Set(expandedPosts);
    if (commentsMap[postId]) return;
    loadingComments.add(postId); loadingComments=new Set(loadingComments);
    const res = await fetch(`/api/comments/${postId}`);
    commentsMap[postId] = await res.json();
    loadingComments.delete(postId); loadingComments=new Set(loadingComments);
  }

  async function submitComment(postId: number) {
    const text = commentTexts[postId]?.trim();
    if (!text||submittingComment.has(postId)) return;
    submittingComment.add(postId); submittingComment=new Set(submittingComment);
    const res = await fetch('/api/comment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId,content:text})});
    submittingComment.delete(postId); submittingComment=new Set(submittingComment);
    if (res.ok) {
      commentTexts[postId]='';
      const r2 = await fetch(`/api/comments/${postId}`);
      commentsMap[postId]=await r2.json();
      posts=posts.map(p=>p.id===postId?{...p,comment_count:p.comment_count+1}:p);
    }
  }
  function handleCommentKey(e: KeyboardEvent, postId: number) {
    if (e.key==='Enter'&&(e.ctrlKey||e.metaKey)) submitComment(postId);
  }

  function surprise() {
    const pool = filtered.length > 0 ? filtered : posts;
    if (pool.length===0) return;
    const post = pool[Math.floor(Math.random()*pool.length)];
    flashPostId = post.id;
    setTimeout(()=>{ document.getElementById(`post-${post.id}`)?.scrollIntoView({behavior:'smooth',block:'center'}); }, 50);
    setTimeout(()=>{ flashPostId=null; }, 1800);
    if (!expandedPosts.has(post.id) && post.comment_count>0) toggleComments(post.id);
  }
</script>

<svelte:head><title>ir dirsā?</title></svelte:head>

<!-- Post form trigger / form -->
<div class="form-wrap">
  {#if !showForm}
    <button class="new-post-trigger" on:click={()=>showForm=true}>
      <span class="trigger-icon">💩</span>
      <span class="trigger-text">Kas notika? Pastāsti pasaulei...</span>
      <span class="trigger-cta">Postot</span>
    </button>
  {:else}
    <div class="card">
      <form method="POST" action="?/post" enctype="multipart/form-data"
        use:enhance={()=>{posting=true;return async({update})=>{await update();posting=false;if(!form?.error){showForm=false;content='';selectedTag='';removeMedia();}}}}>
        <textarea name="content" bind:value={content} class="input-field"
          style="resize:none;height:110px;margin-bottom:16px;display:block;"
          placeholder="Apraksti situāciju... (max 500 simboli)" maxlength="500" autofocus></textarea>

        {#if mediaPreview}
          <div class="media-preview-wrap">
            {#if mediaPreview.type==='image'}<img src={mediaPreview.url} alt="preview" class="media-preview-img"/>
            {:else}<video src={mediaPreview.url} controls class="media-preview-img"/>{/if}
            <button type="button" on:click={removeMedia} class="media-remove-btn">×</button>
          </div>
        {/if}

        <p class="section-label">Kategorija</p>
        <div class="tag-grid">
          {#each TAGS as tag}
            <button type="button" on:click={()=>selectedTag=selectedTag===tag.key?'':tag.key}
              class="tag-pick-btn {selectedTag===tag.key?'active':''}">
              <span class="tag-pick-emoji">{tag.emoji}</span>
              <span class="tag-pick-label">{tag.label}</span>
            </button>
          {/each}
        </div>
        <input type="hidden" name="tag" value={selectedTag}/>

        {#if form?.error||mediaError}
          <p class="form-error">{form?.error??mediaError}</p>
        {/if}

        <div class="form-footer">
          <label class="media-label">
            <span class="media-label-icon">{mediaPreview?.type==='video'?'🎥':'🖼️'}</span>
            <span class="media-label-text">{mediaPreview?'mainīt':'media'}</span>
            <input bind:this={mediaInput} type="file" name="media" accept="image/*,video/*" style="display:none;" on:change={handleMediaPick}/>
          </label>
          <div class="form-actions">
            <button type="button" class="btn-ghost" on:click={()=>{showForm=false;removeMedia();}}>atcelt</button>
            <button type="submit" class="btn-primary" disabled={posting||content.length<5}>{posting?'...':'postot 💩'}</button>
          </div>
        </div>
      </form>
    </div>
  {/if}
</div>

<!-- Champion -->
{#if champion}
  {@const cl = scoreLevel(champion.avg_score)}
  <div class="champion-card">
    <div class="champion-header">
      <span class="champion-trophy">🏆</span>
      <span class="champion-label">Dienas dirsā</span>
      <span class="champion-votes">{champion.vote_count} balsis</span>
    </div>
    <p class="champion-content">{champion.content}</p>
    <div class="champion-footer">
      <span class="champion-emoji">{cl?.emoji}</span>
      <span class="champion-score-label" style="color:{cl?.color};">{cl?.label}</span>
      <span class="champion-score-num">{champion.avg_score}/5</span>
      {#if TAGS.find(t=>t.key===champion.tag)}
        <span class="champion-tag">{TAGS.find(t=>t.key===champion.tag)?.emoji} {champion.tag}</span>
      {/if}
    </div>
  </div>
{/if}

<!-- Live stats -->
<div class="live-stats">
  <span class="live-dot"></span>
  <span class="live-label">{liveViewers} {liveViewers === 1 ? 'skatās' : 'skatās'}</span>
  <span class="live-sep">·</span>
  <span class="live-label">👥 {visitorCount.toLocaleString('lv')} apmeklētāji</span>
</div>

<!-- Filter bar -->
<div class="filter-row">
  <div class="filter-scroll">
    <button class="filter-btn {activeFilter===''?'active':''}" on:click={()=>activeFilter=''}>
      Visi <span class="filter-count">({posts.length})</span>
    </button>
    {#each TAGS as tag}
      <button class="filter-btn {activeFilter===tag.key?'active':''}" on:click={()=>activeFilter=activeFilter===tag.key?'':tag.key}>
        <span>{tag.emoji}</span>{tag.label}
        {#if tagCounts[tag.key]>0}<span class="filter-count">({tagCounts[tag.key]})</span>{/if}
      </button>
    {/each}
  </div>
  <button class="surprise-btn" on:click={surprise} disabled={posts.length===0}>
    🎲
  </button>
</div>

<!-- Feed -->
<div class="feed">
  {#each filtered as post (post.id)}
    {@const level=scoreLevel(post.avg_score)}
    {@const pct=post.vote_count>0?((post.avg_score-1)/4)*100:0}
    {@const tagInfo=TAGS.find(t=>t.key===post.tag)}
    {@const comments=commentsMap[post.id]??[]}
    {@const visibleComments=user?comments:comments.slice(0,COMMENT_GUEST_LIMIT)}
    {@const hasMore=!user&&comments.length>COMMENT_GUEST_LIMIT}

    <article id="post-{post.id}" class="card {flashPostId===post.id?'flash-highlight':''}">
      <!-- Header -->
      <div class="post-header">
        <div class="post-avatar" style="background:{avatarColor(post.username)}1a;border-color:{avatarColor(post.username)}44;color:{avatarColor(post.username)};">
          {post.username[0].toUpperCase()}
        </div>
        <div class="post-meta">
          <span class="post-username">{post.username}</span>
          {#if tagInfo}
            <button on:click={()=>activeFilter=activeFilter===tagInfo.key?'':tagInfo.key}
              class="post-tag-btn {activeFilter===tagInfo.key?'active':''}">
              {tagInfo.emoji} {tagInfo.label}
            </button>
          {/if}
        </div>
        <span class="post-time">{timeAgo(post.created_at)}</span>
        {#if user && Number(user.user_id) === post.user_id && editingPostId !== post.id}
          <div class="post-actions">
            <button class="post-action-btn" title="Rediģēt" on:click={()=>startEdit(post)}>✏️</button>
            <button class="post-action-btn delete-btn" title="Dzēst" on:click={()=>startDelete(post.id)}>🗑️</button>
          </div>
        {/if}
      </div>

      {#if deletingPostId === post.id}
        <div class="delete-confirm">
          <span>Dzēst šo postu?</span>
          <form method="POST" action="?/delete" use:enhance={()=>{deleting=true;return async({update})=>{await update();deleting=false;deletingPostId=null;}}}>
            <input type="hidden" name="postId" value={post.id}/>
            <button type="submit" class="btn-danger" disabled={deleting}>{deleting?'...':'Dzēst'}</button>
          </form>
          <button class="btn-ghost" on:click={cancelDelete}>Atcelt</button>
        </div>
      {/if}

      {#if editingPostId === post.id}
        <form method="POST" action="?/edit"
          use:enhance={()=>{saving=true;return async({update})=>{await update();saving=false;editingPostId=null;}}}>
          <input type="hidden" name="postId" value={post.id}/>
          <textarea name="content" bind:value={editContent} class="input-field edit-textarea"
            maxlength="500" autofocus></textarea>
          <p class="section-label" style="margin-top:14px;">Kategorija</p>
          <div class="tag-grid" style="margin-bottom:14px;">
            {#each TAGS as tag}
              <button type="button" on:click={()=>editTag=editTag===tag.key?'':tag.key}
                class="tag-pick-btn {editTag===tag.key?'active':''}">
                <span class="tag-pick-emoji">{tag.emoji}</span>
                <span class="tag-pick-label">{tag.label}</span>
              </button>
            {/each}
          </div>
          <input type="hidden" name="tag" value={editTag}/>
          <div class="edit-actions">
            <button type="button" class="btn-ghost" on:click={cancelEdit}>Atcelt</button>
            <button type="submit" class="btn-primary" disabled={saving||editContent.length<5}>{saving?'...':'Saglabāt'}</button>
          </div>
        </form>
      {:else}
        <p class="post-content" style="margin-bottom:{post.media_url?'16px':'20px'}">{post.content}</p>
      {/if}

      {#if post.media_url}
        <div class="post-media-wrap">
          {#if post.media_type==='image'}<img src={post.media_url} alt="" class="post-media" loading="lazy"/>
          {:else if post.media_type==='video'}<video src={post.media_url} controls playsinline class="post-media"/>{/if}
        </div>
      {/if}

      <!-- Score display -->
      {#if post.vote_count>0}
        <div class="score-display">
          <div class="score-display-top">
            <span class="score-big-emoji">{level?.emoji}</span>
            <div>
              <div class="score-big-label" style="color:{level?.color};">{level?.label}</div>
              <div class="score-meta">{post.avg_score}/5 · {post.vote_count} {post.vote_count===1?'balss':'balsis'}</div>
            </div>
          </div>
          <div class="score-bar"><div class="score-bar-fill" style="width:{pct}%;"></div></div>
        </div>
      {/if}

      <!-- Vote buttons -->
      <div class="vote-row">
        {#each LEVELS as lvl}
          <button class="vote-btn {myVotes[post.id]===lvl.score?'active':''}" on:click={()=>vote(post.id,lvl.score)} title={lvl.label}>
            <span class="vote-emoji">{lvl.emoji}</span>
            <span class="vote-label">{lvl.label}</span>
          </button>
        {/each}
      </div>

      <!-- Engage row -->
      <div class="engage-row">
        <button class="engage-btn {myAlsoMe.has(post.id)?'active-green':''}" on:click={()=>toggleAlsoMe(post.id)}>
          <span style="font-size:15px;">{myAlsoMe.has(post.id)?'🤝':'🤜'}</span>
          <span>Arī man{post.also_me_count>0?` · ${post.also_me_count}`:''}</span>
        </button>

        <button class="engage-btn {expandedPosts.has(post.id)?'active-orange':''}" on:click={()=>toggleComments(post.id)}>
          <span style="font-size:15px;">💬</span>
          <span>{post.comment_count} {post.comment_count===1?'komentārs':'komentāri'}</span>
          <span class="engage-arrow">{expandedPosts.has(post.id)?'▲':'▼'}</span>
        </button>
      </div>

      <!-- Comments section -->
      {#if expandedPosts.has(post.id)}
        <div class="comments-section">
          {#if loadingComments.has(post.id)}
            <div class="comments-loading">Ielādē...</div>
          {:else}
            {#each visibleComments as comment (comment.id)}
              <div class="comment-row">
                <div class="comment-avatar" style="background:{avatarColor(comment.username)}1a;border-color:{avatarColor(comment.username)}33;color:{avatarColor(comment.username)};">
                  {comment.username[0].toUpperCase()}
                </div>
                <div class="comment-body">
                  <div class="comment-meta">
                    <span class="comment-username">{comment.username}</span>
                    <span class="comment-time">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p class="comment-text">{comment.content}</p>
                </div>
              </div>
            {/each}

            {#if hasMore}
              <div class="comments-blur-wrap">
                {#each comments.slice(COMMENT_GUEST_LIMIT,COMMENT_GUEST_LIMIT+2) as _c}
                  <div style="filter:blur(5px);opacity:0.3;display:flex;gap:10px;margin-bottom:12px;pointer-events:none;user-select:none;">
                    <div style="width:30px;height:30px;border-radius:10px;background:rgba(255,255,255,0.06);flex-shrink:0;"></div>
                    <div style="flex:1;"><div style="height:10px;background:rgba(255,255,255,0.1);border-radius:4px;width:80px;margin-bottom:6px;"></div><div style="height:13px;background:rgba(255,255,255,0.07);border-radius:4px;"></div></div>
                  </div>
                {/each}
                <div class="comments-blur-overlay">
                  <p class="comments-blur-text">Vēl {comments.length-COMMENT_GUEST_LIMIT} komentāri</p>
                  <a href="/register" class="btn-primary" style="text-decoration:none;font-size:13px;padding:10px 22px;">Reģistrējies, lai redzētu</a>
                </div>
              </div>
            {/if}

            {#if comments.length===0}
              <p class="no-comments">Nav komentāru. Esi pirmais!</p>
            {/if}

            {#if user}
              <div class="comment-compose">
                <div class="comment-avatar compose-avatar" style="background:{avatarColor(user.username)}1a;border-color:{avatarColor(user.username)}33;color:{avatarColor(user.username)};">
                  {user.username[0].toUpperCase()}
                </div>
                <div class="compose-input-wrap">
                  <textarea bind:value={commentTexts[post.id]} on:keydown={e=>handleCommentKey(e,post.id)}
                    placeholder="Raksti komentāru... (Ctrl+Enter)" maxlength="300"
                    class="compose-textarea"
                    on:focus={e=>e.currentTarget.style.borderColor='rgba(249,115,22,0.4)'}
                    on:blur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'}></textarea>
                </div>
                <button on:click={()=>submitComment(post.id)} disabled={!commentTexts[post.id]?.trim()||submittingComment.has(post.id)}
                  class="btn-primary compose-send">
                  {submittingComment.has(post.id)?'...':'↑'}
                </button>
              </div>
            {:else}
              <a href="/login" class="login-prompt">
                Ieiet, lai komentētu →
              </a>
            {/if}
          {/if}
        </div>
      {/if}
    </article>
  {/each}

  {#if filtered.length===0&&posts.length>0}
    <div class="empty-state">
      <div class="empty-icon">{TAGS.find(t=>t.key===activeFilter)?.emoji??'🔍'}</div>
      <p class="empty-title">Nav postu šajā kategorijā</p>
    </div>
  {:else if posts.length===0}
    <div class="empty-state">
      <div class="empty-icon" style="font-size:64px;">💩</div>
      <p class="empty-title">Pagaidām nekas nav dirsā</p>
      <p class="empty-sub">Esi pirmais, kas dalās ar savām ciešanām</p>
    </div>
  {/if}
</div>

<style>
  /* Form */
  .form-wrap { margin-bottom: 24px; }

  .new-post-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 20px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .new-post-trigger:hover {
    background: rgba(255,255,255,0.055);
    border-color: rgba(249,115,22,0.25);
  }
  .trigger-icon { font-size: 22px; flex-shrink: 0; opacity: 0.5; }
  .trigger-text { flex: 1; text-align: left; font-size: 15px; color: rgba(255,255,255,0.25); }
  .trigger-cta {
    font-size: 13px;
    font-weight: 700;
    padding: 7px 16px;
    background: linear-gradient(135deg, #f97316, #e55b00);
    color: white;
    border-radius: 10px;
    flex-shrink: 0;
    box-shadow: 0 2px 10px rgba(249,115,22,0.22);
  }

  .media-preview-wrap {
    position: relative;
    margin-bottom: 16px;
    border-radius: 14px;
    overflow: hidden;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.07);
  }
  .media-preview-img { width: 100%; max-height: 300px; object-fit: cover; display: block; }
  .media-remove-btn {
    position: absolute; top: 10px; right: 10px;
    background: rgba(0,0,0,0.8); border: none; color: white;
    border-radius: 999px; width: 30px; height: 30px;
    font-size: 18px; cursor: pointer; display: flex;
    align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .media-remove-btn:hover { background: rgba(0,0,0,0.95); }

  .section-label {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em; color: rgba(255,255,255,0.22);
    text-transform: uppercase; margin-bottom: 10px;
  }

  .tag-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 7px;
    margin-bottom: 18px;
  }
  .tag-pick-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 9px 10px; border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.45);
    font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
    font-family: inherit;
  }
  .tag-pick-btn.active {
    border-color: rgba(249,115,22,0.45);
    background: rgba(249,115,22,0.1);
    color: rgb(253,186,116);
  }
  .tag-pick-emoji { font-size: 15px; flex-shrink: 0; }
  .tag-pick-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .form-error { color: #f87171; font-size: 14px; margin-bottom: 12px; }

  .form-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .media-label {
    cursor: pointer; display: flex; align-items: center; gap: 7px;
    color: rgba(255,255,255,0.35); font-size: 13px; font-weight: 500;
    padding: 9px 13px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    flex-shrink: 0; transition: all 0.15s;
  }
  .media-label:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); }
  .media-label-icon { font-size: 16px; }
  .media-label-text { font-size: 13px; }
  .form-actions { display: flex; gap: 8px; }

  /* Champion */
  .champion-card {
    margin-bottom: 20px;
    background: linear-gradient(145deg, rgba(234,179,8,0.07) 0%, rgba(249,115,22,0.04) 100%);
    border: 1px solid rgba(234,179,8,0.2);
    border-radius: 22px;
    padding: 20px 22px;
  }
  .champion-header {
    display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
  }
  .champion-trophy { font-size: 16px; }
  .champion-label {
    font-size: 11px; font-weight: 800; letter-spacing: 0.06em;
    color: rgb(234,179,8); text-transform: uppercase; flex: 1;
  }
  .champion-votes { font-size: 11px; color: rgba(255,255,255,0.25); }
  .champion-content {
    font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.85); margin-bottom: 12px;
  }
  .champion-footer { display: flex; align-items: center; gap: 10px; }
  .champion-emoji { font-size: 26px; }
  .champion-score-label { font-size: 16px; font-weight: 800; }
  .champion-score-num { font-size: 12px; color: rgba(255,255,255,0.3); }
  .champion-tag { font-size: 12px; color: rgba(255,255,255,0.28); margin-left: auto; }

  /* Live stats */
  .live-stats {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 14px;
    font-size: 12px; color: rgba(255,255,255,0.28);
  }
  .live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 6px #22c55e;
    animation: pulse-dot 2s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .live-label { font-size: 12px; color: rgba(255,255,255,0.32); }
  .live-sep { color: rgba(255,255,255,0.15); }

  /* Filter bar */
  .filter-row {
    display: flex; gap: 8px; align-items: center; margin-bottom: 20px;
  }
  .filter-scroll {
    flex: 1; overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; padding-bottom: 2px;
  }
  .filter-scroll::-webkit-scrollbar { display: none; }
  .filter-scroll { display: flex; gap: 7px; min-width: 0; }

  .filter-count { font-size: 11px; opacity: 0.55; }

  .surprise-btn {
    flex-shrink: 0;
    width: 38px; height: 38px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 999px;
    border: 1px solid rgba(139,92,246,0.35);
    background: rgba(139,92,246,0.09);
    font-size: 17px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .surprise-btn:hover { background: rgba(139,92,246,0.18); border-color: rgba(139,92,246,0.5); }
  .surprise-btn:disabled { opacity: 0.35; cursor: default; }

  /* Feed */
  .feed { display: flex; flex-direction: column; gap: 14px; }

  /* Post */
  .post-header {
    display: flex; align-items: center; gap: 11px; margin-bottom: 16px;
  }
  .post-avatar {
    width: 36px; height: 36px; border-radius: 11px; border: 1px solid;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; flex-shrink: 0;
  }
  .post-meta { flex: 1; min-width: 0; display: flex; align-items: center; flex-wrap: wrap; gap: 0; }
  .post-username { font-weight: 600; font-size: 14px; color: rgba(255,255,255,0.82); }
  .post-tag-btn {
    margin-left: 8px;
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600;
    padding: 3px 9px; border-radius: 999px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.38);
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .post-tag-btn.active {
    background: rgba(249,115,22,0.14); border-color: rgba(249,115,22,0.4); color: rgb(253,186,116);
  }
  .post-time { font-size: 12px; color: rgba(255,255,255,0.2); flex-shrink: 0; }

  .post-actions { display: flex; gap: 4px; margin-left: 4px; }
  .post-action-btn {
    background: none; border: none; cursor: pointer;
    font-size: 14px; padding: 4px 6px; border-radius: 8px;
    opacity: 0.35; transition: all 0.15s;
  }
  .post-action-btn:hover { opacity: 1; background: rgba(255,255,255,0.07); }
  .post-action-btn.delete-btn:hover { background: rgba(239,68,68,0.12); }

  .delete-confirm {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
    border-radius: 12px; padding: 12px 16px; margin-bottom: 14px;
    font-size: 14px; color: rgba(255,255,255,0.7);
  }
  .delete-confirm form { display: contents; }
  .btn-danger {
    background: #ef4444; color: white; border: none;
    padding: 7px 16px; border-radius: 9px; font-size: 13px;
    font-weight: 700; cursor: pointer; transition: background 0.15s;
    font-family: inherit;
  }
  .btn-danger:hover { background: #dc2626; }
  .btn-danger:disabled { opacity: 0.5; cursor: default; }

  .edit-textarea { resize: none; height: 110px; margin-bottom: 4px; display: block; }
  .edit-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

  .post-content { font-size: 16px; line-height: 1.65; color: rgba(255,255,255,0.88); word-break: break-word; }

  .post-media-wrap {
    border-radius: 14px; overflow: hidden; margin-bottom: 18px;
    background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06);
  }
  .post-media { width: 100%; max-height: 380px; object-fit: cover; display: block; }

  /* Score */
  .score-display {
    margin-bottom: 16px; padding: 16px 18px;
    background: rgba(255,255,255,0.025); border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .score-display-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .score-big-emoji { font-size: 38px; line-height: 1; }
  .score-big-label { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
  .score-meta { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 2px; }

  /* Vote row */
  .vote-row { display: flex; gap: 6px; margin-bottom: 14px; }

  /* Engage row */
  .engage-row {
    display: flex; align-items: center; gap: 8px;
    border-top: 1px solid rgba(255,255,255,0.06); padding-top: 13px;
  }
  .engage-arrow { font-size: 9px; opacity: 0.45; }

  /* Comments */
  .comments-section {
    margin-top: 14px; padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,0.05);
  }
  .comments-loading { color: rgba(255,255,255,0.22); font-size: 13px; padding: 6px 0; }
  .no-comments { color: rgba(255,255,255,0.2); font-size: 13px; padding: 4px 0 6px; }

  .comment-row { display: flex; gap: 10px; margin-bottom: 13px; }
  .comment-avatar {
    width: 28px; height: 28px; border-radius: 9px; border: 1px solid;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 1px;
  }
  .comment-body { flex: 1; min-width: 0; }
  .comment-meta { display: flex; align-items: baseline; gap: 7px; margin-bottom: 3px; }
  .comment-username { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.75); }
  .comment-time { font-size: 11px; color: rgba(255,255,255,0.2); }
  .comment-text { font-size: 14px; line-height: 1.55; color: rgba(255,255,255,0.68); margin: 0; word-break: break-word; }

  .comments-blur-wrap { position: relative; border-radius: 14px; overflow: hidden; min-height: 80px; }
  .comments-blur-overlay {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
    background: linear-gradient(to bottom, transparent, rgba(8,8,8,0.96) 35%);
  }
  .comments-blur-text { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; }

  .comment-compose {
    display: flex; gap: 9px; margin-top: 12px; align-items: flex-end;
  }
  .compose-avatar { width: 28px !important; height: 28px !important; border-radius: 9px !important; }
  .compose-input-wrap { flex: 1; }
  .compose-textarea {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 12px;
    padding: 10px 13px;
    font-size: 13px; color: white; outline: none;
    resize: none; height: 64px;
    font-family: inherit; transition: border-color 0.2s;
    display: block;
  }
  .compose-textarea::placeholder { color: rgba(255,255,255,0.22); }
  .compose-send {
    font-size: 16px !important;
    padding: 10px 14px !important;
    flex-shrink: 0;
    align-self: flex-end;
    border-radius: 10px !important;
  }

  .login-prompt {
    display: block; text-align: center; margin-top: 10px;
    font-size: 13px; color: rgba(249,115,22,0.75); text-decoration: none;
    padding: 10px; border: 1px solid rgba(249,115,22,0.18); border-radius: 10px;
    background: rgba(249,115,22,0.05); transition: all 0.15s;
  }
  .login-prompt:hover { background: rgba(249,115,22,0.1); color: rgb(249,115,22); }

  /* Empty states */
  .empty-state { text-align: center; padding: 70px 20px; color: rgba(255,255,255,0.18); }
  .empty-icon { font-size: 52px; margin-bottom: 16px; }
  .empty-title { font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.22); margin-bottom: 6px; }
  .empty-sub { font-size: 14px; color: rgba(255,255,255,0.14); }

  @media (max-width: 500px) {
    .tag-grid { grid-template-columns: repeat(2, 1fr); }
    .trigger-cta { display: none; }
    .new-post-trigger { padding: 14px 16px; }
    .score-big-emoji { font-size: 32px; }
    .score-big-label { font-size: 17px; }
  }
</style>
