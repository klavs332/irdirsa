<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  export let form: ActionData;
  let loading = false;
</script>

<svelte:head><title>Reģistrēties · ir dirsā?</title></svelte:head>

<div class="max-w-sm mx-auto mt-12">
  <h1 class="text-2xl font-black mb-8">Reģistrēties 💩</h1>

  <form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { await update(); loading = false; }; }} class="flex flex-col gap-3">
    <input name="username" class="input-field" placeholder="lietotājvārds" minlength="3" maxlength="20" required />
    <input name="password" type="password" class="input-field" placeholder="parole (min 6 simboli)" minlength="6" required />

    {#if form?.error}
      <p class="text-red-400 text-sm">{form.error}</p>
    {/if}

    <button type="submit" class="btn-primary" disabled={loading}>
      {loading ? '...' : 'izveidot kontu'}
    </button>
  </form>

  <p class="text-white/30 text-sm mt-4 text-center">
    Jau ir konts? <a href="/login" class="text-orange-400 hover:underline">Ieiet</a>
  </p>
</div>
