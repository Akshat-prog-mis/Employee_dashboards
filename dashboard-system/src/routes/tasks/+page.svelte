<!-- src/routes/tasks/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fetchTasks, completeTask } from '$lib/api.js';
  import { getAuthUser } from '$lib/auth.js';
  import './task.css'

  interface Task {
    id: string;
    name: string;
    planned: string;
  }

  // State
  let user_email: string | null = null;
  let tasks: Task[] = [];
  let loading = false;
  let error = "";
  let sortOrder = 'asc'; // 'asc' or 'desc'
  let darkMode = false;
  let lastUpdated: Date | null = null;

  // Initialize
  onMount(() => {
    // 🔐 Get authenticated user
    user_email = getAuthUser();
    if (!user_email) {
      goto('/'); // Redirect to login if not authenticated
      return;
    }

    // Load UI preferences
    const savedDark = localStorage.getItem("darkMode");
    darkMode = savedDark === "true";
    document.body.classList.toggle("dark", darkMode);

    const savedSort = localStorage.getItem("taskSortOrder");
    if (savedSort === 'asc' || savedSort === 'desc') {
      sortOrder = savedSort;
    }

    // Load tasks
    loadTasks();
    const interval = setInterval(loadTasks, 120_000);
    
    // Keyboard shortcuts
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === 'c' || e.key === 'C') && tasks.length > 0) {
        handleComplete(tasks[0].id);
      }
      if (e.key === 'r' || e.key === 'R') {
        loadTasks();
      }
    };
    window.addEventListener('keydown', handleKey);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKey);
    };
  });

  // Toggle dark mode
  function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem("darkMode", darkMode.toString());
    document.body.classList.toggle("dark", darkMode);
  }

  // Toggle sort order
  function toggleSort() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    localStorage.setItem("taskSortOrder", sortOrder);
    // Re-sort without re-fetching
    tasks = [...tasks].sort((a, b) => {
      const dateA = new Date(a.planned.split('/').reverse().join('-'));
      const dateB = new Date(b.planned.split('/').reverse().join('-'));
      return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });
  }

  // Fetch & filter tasks
  async function loadTasks() {
    if (!user_email) return; // Safety check
    
    loading = true;
    error = "";
    try {
      const allTasks = await fetchTasks();
      tasks = [...allTasks].sort((a, b) => {
        const dateA = new Date(a.planned.split('/').reverse().join('-'));
        const dateB = new Date(b.planned.split('/').reverse().join('-'));
        return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      });
      lastUpdated = new Date();
    } catch (err) {
      error = "⚠️ " + (err instanceof Error ? err.message : String(err));
    } finally {
      loading = false;
    }
  }

  // Complete task (optimistic)
  async function handleComplete(taskId: string) {
    tasks = tasks.filter(t => t.id !== taskId);
    try {
      await completeTask(taskId);
    } catch (err) {
      alert("❌ Failed to complete task. Reverting...");
      loadTasks();
    }
  }
</script>

<div class="dashboard">
  <!-- Header with controls -->
  <header>
    <div class="header-left">
      <h1>🧾 My Due Tasks</h1>
      {#if !loading && tasks.length > 0}
        <span class="task-count">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
      {/if}
    </div>

    <div class="controls">
      {#if !loading && tasks.length > 0}
        <button class="sort-btn" on:click={toggleSort} aria-label="Toggle sort order">
          Planned {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      {/if}
      <button class="theme-toggle" on:click={toggleDarkMode} aria-label="Toggle dark mode">
        {#if darkMode}
          ☀️ Light
        {:else}
          🌙 Dark
        {/if}
      </button>
    </div>
  </header>

  <p class="subtitle">
    Tasks planned for today or earlier
    {#if lastUpdated}
      • Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    {/if}
  </p>

  {#if loading}
    <div class="card">
      <p class="loading">Loading your tasks...</p>
    </div>
  {:else if error}
    <div class="card error">
      <p>{error}</p>
      <button class="btn secondary" on:click={loadTasks}>Retry</button>
    </div>
  {:else if tasks.length === 0}
    <div class="card empty">
      <div class="checkmark">✅</div>
      <h2>All caught up!</h2>
      <p>No pending tasks due today or earlier.</p>
    </div>
  {:else}
    <div class="card task-list">
      {#each tasks as task}
        <div class="task-row">
          <div class="task-info">
            <div class="task-name">{task.name}</div>
            <div class="task-date">📅 {task.planned}</div>
          </div>
          <button
            class="btn primary"
            on:click={() => handleComplete(task.id)}
          >
            Complete
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Keyboard shortcut hint -->
  <p class="hint">💡 Press <kbd>C</kbd> to complete first task, <kbd>R</kbd> to refresh</p>
</div>
