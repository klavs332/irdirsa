<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  export let form: ActionData;
  let loading = false;
</script>

<svelte:head><title>Ieiet · ir dirsā?</title></svelte:head>

<div class="max-w-sm mx-auto mt-12">
  <h1 class="text-2xl font-black mb-8">Ieiet 💩</h1>

  <form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { await update(); loading = false; }; }} class="flex flex-col gap-3">
    <input name="username" class="input-field" placeholder="lietotājvārds" required />
    <input name="password" type="password" class="input-field" placeholder="parole" required />

    {#if form?.error}
      <p class="text-red-400 text-sm">{form.error}</p>
    {/if}

    <button type="submit" class="btn-primary" disabled={loading}>
      {loading ? '...' : 'ieiet'}
    </button>
  </form>

  <p class="text-white/30 text-sm mt-4 text-center">
    Nav konta? <a href="/register" class="text-orange-400 hover:underline">Reģistrēties</a>
  </p>
</div>
