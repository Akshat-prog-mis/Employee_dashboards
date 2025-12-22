<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { getAuthUser, clearAuth } from '$lib/auth.js';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import './layout.css'  

  let user_email: string | null = null;
  $: currentPath = $page.url.pathname;

  onMount(() => {
    user_email = getAuthUser();
  });

  function handleLogout() {
    clearAuth();
    goto('/');
  }

  const getPageTitle = (path: string) => {
    if (path === '/tasks') return 'My Due Tasks';
    if (path === '/bis-tasks') return 'BIS Due Tasks';
    const parts = path.split('/').filter(Boolean);
    return parts.map((p: string) => p.replace(/-/g, ' ')).join(' / ') || 'Dashboard';
  };

  $: showLogout = user_email && currentPath !== '/';
  const notificationCount = 0;
</script>

{#if user_email}
  <header class="global-header">
    <div class="header-content">
      <div class="app-brand">
        <h1>📊 Employee Dashboard </h1>
      </div>

      <div class="breadcrumbs">
        {#if currentPath !== '/'}
          <button 
            type="button"
            class="breadcrumb-home"
            on:click={() => goto('/')}
          >
            Home
          </button>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">{getPageTitle(currentPath)}</span>
        {/if}
      </div>

      <div class="user-actions">
        <!-- Notification Badge -->
        <button 
          type="button"
          class="notification-badge"
          on:click={() => alert("Notifications clicked (stub)")}
          aria-label={notificationCount > 0 ? `Notifications: ${notificationCount} new` : "Notifications"}
        >
          🔔
          {#if notificationCount > 0}
            <span class="badge-count">{notificationCount}</span>
          {/if}
        </button>

        <!-- User Email -->
        <span class="user-email">👋 {user_email}</span>

        <!-- Logout -->
        {#if showLogout}
          <button class="btn logout" on:click={handleLogout}>Logout</button>
        {/if}
      </div>
    </div>
  </header>
{/if}

<main class="main-content">
  <slot />
</main>
