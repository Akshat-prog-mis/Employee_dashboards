<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  onMount(() => {
    window.location.href = '/tasks';
  });
</script>
<p>Redirecting to tasks...</p>