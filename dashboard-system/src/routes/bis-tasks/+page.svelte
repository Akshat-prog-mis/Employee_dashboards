<!-- src/routes/bis-tasks/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getAuthUser } from '$lib/auth.js';
  import { fetchBisTasks } from '$lib/api.js';

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

  onMount(() => {
    user_email = getAuthUser();
    if (!user_email) {
      goto('/');
      return;
    }
    loadTasks();
// const autoRefresh = setTimeout(() => {
//     loadAllData();
//   }, 4 * 60 * 60 * 1000);

//   return () => clearTimeout(autoRefresh);
  });

  async function loadTasks() {
    if (!user_email) return;
    loading = true;
    error = "";
    try {
      tasks = await fetchBisTasks();
      lastUpdated = new Date();
    } catch (err) {
      error = "⚠️ " + (err instanceof Error ? err.message : String(err));
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
    <div class="header-content">
      <div>
        <h1>📊 BIS Due Tasks</h1>
        {#if !loading && tasks.length > 0}
          <span class="task-count-badge">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
        {/if}
      </div>
      {#if lastUpdated}
        <p class="last-updated">Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      {/if}
    </div>
    <p class="page-subtitle">Complete FMS-linked tasks via Google Forms</p>
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
      <button class="btn retry-btn" on:click={loadTasks}>Retry</button>
    </div>

  {:else if tasks.length === 0}
    <div class="card empty-state">
      <div class="empty-icon">✅</div>
      <h2>All caught up!</h2>
      <p>No BIS tasks are due today or earlier.</p>
    </div>

  {:else}
    <div class="tasks-list">
      {#each tasks as task}
        <div class="task-card">
          <div class="task-header">
            <h3 class="task-title">📌 {task.step}</h3>
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
                ✅ Mark Done via Form
              </button>
            {/if}
            {#if task.fmsLink}
              <button 
                class="btn secondary"
                on:click={() => openLink(task.fmsLink)}
              >
                ➡️ Open FMS Sheet
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dashboard-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 20px 40px;
  }

  /* ===== HEADER ===== */
  .page-header {
    margin-bottom: 32px;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 12px;
  }

  h1 {
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0;
    color: #1a1a1a;
  }

  :global(body.dark) h1 {
    color: #e0e0e0;
  }

  .task-count-badge {
    background: #e8f5e8;
    color: #2e7d32;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    margin-left: 12px;
  }

  :global(body.dark) .task-count-badge {
    background: #2e4d2e;
    color: #a5d6a7;
  }

  .last-updated {
    font-size: 0.9rem;
    color: #666;
  }

  :global(body.dark) .last-updated {
    color: #aaa;
  }

  .page-subtitle {
    color: #666;
    font-size: 1.05rem;
    margin: 0;
  }

  :global(body.dark) .page-subtitle {
    color: #bbb;
  }

  /* ===== CARDS ===== */
  .card {
    background: white;
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  }

  :global(body.dark) .card {
    background: #1e1e1e;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  /* Loading */
  .loading-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #4CAF50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Error */
  .error-card {
    text-align: center;
    padding: 40px 28px;
  }

  .error-icon {
    font-size: 2.5rem;
    margin-bottom: 16px;
    color: #f44336;
  }

  .retry-btn {
    margin-top: 16px;
    background: #f1f1f1;
    color: #333;
  }

  :global(body.dark) .retry-btn {
    background: #2a2a2a;
    color: #ddd;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 48px 28px;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 20px;
    color: #4CAF50;
  }

  :global(body.dark) .empty-icon {
    color: #66bb6a;
  }

  .empty-state h2 {
    font-size: 1.6rem;
    margin: 0 0 16px;
    color: #222;
  }

  :global(body.dark) .empty-state h2 {
    color: #fff;
  }

  .empty-state p {
    color: #666;
    font-size: 1.05rem;
  }

  :global(body.dark) .empty-state p {
    color: #bbb;
  }

  /* ===== TASK LIST ===== */
  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .task-card {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  :global(body.dark) .task-card {
    background: #1e1e1e;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
  }

  .task-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }

  :global(body.dark) .task-card:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  /* Task Header */
  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .task-title {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0;
    color: #1a1a1a;
    max-width: calc(100% - 120px);
  }

  :global(body.dark) .task-title {
    color: #e0e0e0;
  }

  .delay-badge {
    background: #ffebee;
    color: #c62828;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
  }

  :global(body.dark) .delay-badge {
    background: #421c1c;
    color: #ffcdd2;
  }

  /* Description */
  .task-description {
    color: #555;
    line-height: 1.6;
    margin: 0 0 18px;
    white-space: pre-wrap;
    font-size: 0.95rem;
  }

  :global(body.dark) .task-description {
    color: #bbb;
  }

  /* Details Row */
  .task-details {
    display: flex;
    gap: 24px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .task-datetime,
  .task-fms {
    display: flex;
    gap: 6px;
    font-size: 0.9rem;
  }

  .datetime-label,
  .fms-label {
    font-weight: 600;
    color: #444;
  }

  :global(body.dark) .datetime-label,
  :global(body.dark) .fms-label {
    color: #ccc;
  }

  .datetime-value,
  .fms-name {
    color: #666;
  }

  :global(body.dark) .datetime-value,
  :global(body.dark) .fms-name {
    color: #aaa;
  }

  /* Actions */
  .task-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .btn {
    padding: 10px 18px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn.primary {
    background: linear-gradient(to right, #4CAF50, #388E3C);
    color: white;
  }

  .btn.primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(76, 175, 80, 0.3);
  }

  .btn.secondary {
    background: #f8f9fa;
    color: #333;
  }

  :global(body.dark) .btn.secondary {
    background: #2a2a2a;
    color: #ddd;
  }

  .btn.secondary:hover {
    background: #e9ecef;
  }

  :global(body.dark) .btn.secondary:hover {
    background: #333;
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }

    .task-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .delay-badge {
      align-self: flex-start;
      margin-top: 6px;
    }

    .task-details {
      flex-direction: column;
      gap: 10px;
    }

    .task-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>