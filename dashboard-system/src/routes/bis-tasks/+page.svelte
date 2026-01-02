<!-- src/routes/bis-tasks/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getAuthUser } from '$lib/auth.js';
  import { fetchBisTasks } from '$lib/api.js';
  import './bis.css';

  interface BisTask {
    id: string;
    planned: string;
    step: string;
    description: string;
    markDoneUrl: string;
    fmsLink: string;
    fmsName: string;
    timeDelayHrs: number;
  }

  let user_email: string | null = null;
  let tasks: BisTask[] = [];
  let loading: boolean = false;
  let error: string = "";
  let lastUpdated: Date | null = null;
  let sortOrder = 'asc';
  let darkMode = false;

  function applyDarkMode(isDark: boolean) {
    darkMode = isDark;
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.  body.classList.remove('dark');
    }
    localStorage.setItem("darkMode", isDark.toString());
  }

  onMount(() => {
    user_email = getAuthUser();
    if (!user_email) {
      goto('/');
      return;
    }

    // ✅ Robust dark mode initialization
    const savedDark = localStorage.getItem("darkMode") === "true";
    // Also respect system preference if no saved choice (optional, but safe)
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initialDark = localStorage.getItem("darkMode") !== null 
      ? savedDark 
      : prefersDark;

    applyDarkMode(initialDark);

    const savedSort = localStorage.getItem("bisTaskSortOrder");
    if (savedSort === 'asc' || savedSort === 'desc') {
      sortOrder = savedSort;
    }

    loadTasks();
    
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === 'c' || e.key === 'C') && tasks.length > 0 && tasks[0].markDoneUrl) {
        openLink(tasks[0].markDoneUrl);
      }
      if (e.key === 'r' || e.key === 'R') {
        loadTasks();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  });

  // ✅ Use applyDarkMode here too
  function toggleDarkMode() {
    applyDarkMode(!darkMode);
  }

  function toggleSort() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    localStorage.setItem("bisTaskSortOrder", sortOrder);
    tasks = [...tasks].sort((a, b) => {
      const dateA = new Date(a.planned.split('/').reverse().join('-'));
      const dateB = new Date(b.planned.split('/').reverse().join('-'));
      return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });
  }

  async function loadTasks() {
    if (!user_email) return;
    loading = true;
    error = "";
    try {
      const allTasks = await fetchBisTasks();
      tasks = [...allTasks].sort((a, b) => {
        const dateA = new Date(a.planned.split('/').reverse().join('-'));
        const dateB = new Date(b.planned.split('/').reverse().join('-'));
        return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      });
      lastUpdated = new Date();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function openLink(url: string) {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }
</script>

<div class="dashboard-container">
  <!-- Header -->
  <div class="page-header">
    <div class="header-top">
      <div class="header-title-group">
        <h1>BIS Due Tasks</h1>
        {#if !loading && tasks.length > 0}
          <span class="task-count-badge">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
        {/if}
      </div>

      <div class="controls">
        {#if !loading && tasks.length > 0}
          <button
            class="icon-btn sort-btn"
            on:click={toggleSort}
            aria-label="Toggle sort order"
            title="Sort by planned date"
          >
            {#if sortOrder === 'asc'}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            {/if}
          </button>
        {/if}
        <button
          class="icon-btn theme-toggle"
          on:click={toggleDarkMode}
          aria-label="Toggle dark mode"
          title="Switch theme"
        >
          {#if darkMode}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          {/if}
        </button>
      </div>
    </div>

    <p class="page-subtitle">Complete FMS-linked tasks via Google Forms</p>

    {#if lastUpdated}
      <p class="last-updated">Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
    {/if}
  </div>

  <!-- Main Content -->
  {#if loading}
    <div class="card loading-card">
      <div class="spinner"></div>
      <p>Loading your BIS tasks...</p>
    </div>

  {:else if error}
    <div class="card error-card">
      <div class="error-icon">⚠️</div>
      <p>{error}</p>
      <button class="btn secondary" on:click={loadTasks}>Retry</button>
    </div>

  {:else if tasks.length === 0}
    <div class="card empty-state">
      <div class="empty-icon">✅</div>
      <h2>All caught up</h2>
      <p>No BIS tasks are due today or earlier.</p>
    </div>

  {:else}
    <div class="tasks-list">
      {#each tasks as task}
        <div class="task-card">
          <div class="task-header">
            <h3 class="task-title">{task.step}</h3>
            {#if task.timeDelayHrs > 0}
              <span class="delay-badge">Delayed: {task.timeDelayHrs}h</span>
            {/if}
          </div>

          {#if task.description}
            <p class="task-description">{task.description}</p>
          {/if}

          <div class="task-details">
            <div class="task-datetime">
              <span class="datetime-label">Planned:</span>
              <span class="datetime-value">{task.planned}</span>
            </div>
            {#if task.fmsName}
              <div class="task-fms">
                <span class="fms-label">FMS:</span>
                <span class="fms-name">{task.fmsName}</span>
              </div>
            {/if}
          </div>

          <div class="task-actions">
            {#if task.markDoneUrl}
              <button 
                class="btn primary"
                on:click={() => openLink(task.markDoneUrl)}
              >
                Mark Done
              </button>
            {/if}
            {#if task.fmsLink}
              <button 
                class="btn secondary"
                on:click={() => openLink(task.fmsLink)}
              >
                Open FMS Sheet
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <p class="hint">Press <kbd>C</kbd> to open the first task’s form, <kbd>R</kbd> to refresh</p>
</div>
