<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { getAuthUser, clearAuth } from '$lib/auth.js';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

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

<style>
  .global-header {
    background: white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 0 20px;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  :global(body.dark) .global-header {
    background: #1e1e1e;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 0;
    gap: 24px;
  }

  .app-brand h1 {
    font-size: 1.4rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
  }

  :global(body.dark) .app-brand h1 {
    color: #e0e0e0;
  }

  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
    color: #666;
  }

  :global(body.dark) .breadcrumbs {
    color: #aaa;
  }

  /* ✅ FIXED: Button-specific styles */
  .breadcrumb-home {
    background: none;
    border: none;
    color: #4CAF50;
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    margin: 0;
  }

  .breadcrumb-home:hover {
    opacity: 0.8;
  }

  :global(body.dark) .breadcrumb-home {
    color: #66bb6a;
  }

  .breadcrumb-separator {
    color: #ccc;
  }

  :global(body.dark) .breadcrumb-separator {
    color: #555;
  }

  .breadcrumb-current {
    font-weight: 500;
    color: #222;
  }

  :global(body.dark) .breadcrumb-current {
    color: #fff;
  }

  .user-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* ✅ FIXED: Notification as button */
  .notification-badge {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: #555;
    position: relative;
    padding: 0;
    margin: 0;
  }

  :global(body.dark) .notification-badge {
    color: #ccc;
  }

  .badge-count {
    position: absolute;
    top: -6px;
    right: -8px;
    background: #f44336;
    color: white;
    font-size: 0.7rem;
    font-weight: bold;
    min-width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 2px;
  }

  .user-email {
    font-size: 0.95rem;
    color: #444;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(body.dark) .user-email {
    color: #ccc;
  }

  .btn.logout {
    background: #f1f1f1;
    color: #d32f2f;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn.logout:hover {
    background: #e0e0e0;
  }

  :global(body.dark) .btn.logout {
    background: #2a2a2a;
    color: #ff6b6b;
  }

  :global(body.dark) .btn.logout:hover {
    background: #3a3a3a;
  }

  .main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 20px;
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .breadcrumbs {
      order: 3;
      margin-top: 8px;
    }

    .user-actions {
      align-self: flex-end;
      margin-top: 4px;
    }
  }
</style>