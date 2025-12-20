<!-- src/routes/tasks/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fetchTasks, completeTask } from '$lib/api.js';
  import { getAuthUser } from '$lib/auth.js';

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
      const allTasks = await fetchTasks(user_email);
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

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #f9f9f9;
    color: #1a1a1a;
    transition: background-color 0.3s, color 0.3s;
  }

  :global(body.dark) {
    background-color: #121212;
    color: #e0e0e0;
  }

  .dashboard {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h1 {
    font-size: 1.8rem;
    font-weight: 700;
    margin: 0;
  }

  .task-count {
    background: #e8f5e8;
    color: #2e7d32;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  :global(body.dark) .task-count {
    background: #2e4d2e;
    color: #a5d6a7;
  }

  .controls {
    display: flex;
    gap: 10px;
  }

  .sort-btn, .theme-toggle {
    padding: 6px 12px;
    border-radius: 6px;
    background: #f0f0f0;
    border: 1px solid #ddd;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  :global(body.dark) .sort-btn,
  :global(body.dark) .theme-toggle {
    background: #2a2a2a;
    border-color: #444;
    color: #e0e0e0;
  }

  .sort-btn:hover, .theme-toggle:hover {
    background: #e0e0e0;
  }

  :global(body.dark) .sort-btn:hover,
  :global(body.dark) .theme-toggle:hover {
    background: #3a3a3a;
  }

  .subtitle {
    color: #666;
    font-size: 1rem;
    margin: 0 0 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  :global(body.dark) .subtitle {
    color: #aaa;
  }

  .hint {
    text-align: center;
    color: #888;
    font-size: 0.85rem;
    margin-top: 16px;
  }

  :global(body.dark) .hint {
    color: #aaa;
  }

  kbd {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.85em;
  }

  :global(body.dark) kbd {
    background: #333;
  }

  .card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    padding: 24px;
    margin-bottom: 24px;
  }

  :global(body.dark) .card {
    background: #1e1e1e;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #333;
  }

  .empty {
    text-align: center;
    padding: 40px 24px;
  }

  .checkmark {
    font-size: 3rem;
    margin-bottom: 16px;
    color: #4CAF50;
  }

  :global(body.dark) .checkmark {
    color: #66bb6a;
  }

  .empty h2 {
    font-size: 1.5rem;
    margin: 0 0 12px;
  }

  .empty p {
    font-size: 1rem;
  }

  :global(body.dark) .empty p {
    color: #bbb;
  }

  .loading {
    text-align: center;
    color: #555;
    font-style: italic;
  }

  :global(body.dark) .loading {
    color: #aaa;
  }

  .error {
    border-left: 4px solid #f44336;
  }

  :global(body.dark) .error {
    border-left: 4px solid #ff6b6b;
  }

  .error p {
    margin: 0 0 16px;
    color: #d32f2f;
  }

  :global(body.dark) .error p {
    color: #ff6b6b;
  }

  .task-list {
    padding: 16px 0;
  }

  .task-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid #f0f0f0;
  }

  :global(body.dark) .task-row {
    border-bottom: 1px solid #333;
  }

  .task-row:last-child {
    border-bottom: none;
  }

  .task-info {
    flex: 1;
    min-width: 0;
    margin-right: 16px;
  }

  .task-name {
    font-weight: 600;
    font-size: 1.05rem;
    margin-bottom: 4px;
    word-break: break-word;
    margin-left: 12px;
  }

  :global(body.dark) .task-name {
    color: #fff;
  }

  .task-date {
    font-size: 0.9rem;
    color: #666;
    margin-left: 12px;
  }

  :global(body.dark) .task-date {
    color: #aaa;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    font-size: 0.95rem;
  }

  .btn.primary {
    background: #4CAF50;
    color: white;
  }

  .btn.primary:hover {
    background: #45a049;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
  }

  :global(body.dark) .btn.primary {
    background: #388e3c;
  }

  :global(body.dark) .btn.primary:hover {
    background: #2e7d32;
    box-shadow: 0 2px 6px rgba(56, 142, 60, 0.4);
  }

  .btn.secondary {
    background: #f1f1f1;
    color: #333;
  }

  :global(body.dark) .btn.secondary {
    background: #2a2a2a;
    color: #ddd;
  }

  @media (max-width: 600px) {
    header {
      flex-direction: column;
      align-items: stretch;
    }

    .controls {
      justify-content: center;
    }

    .task-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .btn {
      align-self: flex-end;
      width: 100%;
      max-width: 120px;
    }
  }
</style>