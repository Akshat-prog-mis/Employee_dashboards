<!-- src/routes/internal-delegation/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getAuthUser, getEmployeeName } from '$lib/auth.js';
  import { 
    fetchDelegationData, 
    createDelegationTask, 
    updateDelegationTask 
  } from '$lib/api.js';

  interface User {
    name: string;
    email: string;
    department: string;
  }

  interface Task {
    task_id: string;
    title: string;
    requester_email: string;
    assignee_email: string;
    due_date?: string;
    description?: string;
    status: string;
  }

  interface FormData {
    title: string;
    assignee: string;
    dueDate: string;
    description: string;
    status: string;
  }

  let user_email: string | null = null;
  let tasks: Task[] = [];
  let users: User[] = [];
  let loading: boolean = false;
  let error: string = "";
  let stats = { total: 0, pending: 0, inProgress: 0, completed: 0, blocked: 0 };
  let lastUpdated: Date | null = null;
  let sortOrder = 'asc'; // 'asc' or 'desc'
  let refreshIndicator = false;
  const CACHE = new Map();

  let showModal: string | null = null;
  let selectedTask: Task | null = null;
  let formData: FormData = {
    title: "",
    assignee: "",
    dueDate: new Date().toISOString().split('T')[0],
    description: "",
    status: "Assigned"
  };

  const STATUS_MAP: Record<string, { colorClass: string; label: string }> = {
    "Assigned": { colorClass: "status-assigned", label: "Assigned" },
    "In Progress": { colorClass: "status-in-progress", label: "In Progress" },
    "Blocked": { colorClass: "status-blocked", label: "Blocked" },
    "Completed": { colorClass: "status-completed", label: "Completed" },
    "Revise Requested": { colorClass: "status-revise", label: "Revise Requested" },
    "Cancelled": { colorClass: "status-cancelled", label: "Cancelled" }
  };

  onMount(() => {
  user_email = getAuthUser();
  if (!user_email) {
    goto('/');
    return;
  }

  // Load data immediately
  loadAllData().catch(err => {
    console.error("Initial load failed:", err);
  });

  // ✅ Auto-refresh: Clear cache every 2 minutes for fresh data
  const interval = setInterval(() => {
  const cacheKey = `delegation:${user_email}`;
  CACHE.delete(cacheKey);
  lastUpdated = new Date();
  
  // Optional: show brief refresh indicator
  refreshIndicator = true;
  setTimeout(() => refreshIndicator = false, 1000);
}, 120000);

  const handleKey = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement).isContentEditable
    ) return;

    if (e.key === 'r' || e.key === 'R') {
      // Manual refresh: clear cache AND reload
      const cacheKey = `delegation:${user_email}`;
      CACHE.delete(cacheKey);
      loadAllData().catch(err => {
        console.error("Refresh failed:", err);
      });
    }
  };

  window.addEventListener('keydown', handleKey);

  return () => {
    window.removeEventListener('keydown', handleKey);
    clearInterval(interval); // ✅ Clean up interval
  };
});

  async function loadAllData() {
    loading = true;
    error = "";
    try {
      const { tasks: t, users: u } = await fetchDelegationData();
      const sorted = [...t].sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
      tasks = sorted;
      users = u;

      stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === "Assigned").length,
        inProgress: tasks.filter(t => t.status === "In Progress").length,
        completed: tasks.filter(t => t.status === "Completed").length,
        blocked: tasks.filter(t => t.status === "Blocked").length
      };
      lastUpdated = new Date();
    } catch (err) {
      error = (err as Error).message || "Failed to load data";
    } finally {
      loading = false;
    }
  }

  function toggleSort() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    tasks = [...tasks].sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }

  function calculateDaysUntil(dueDateStr: string | undefined): { text: string; variant: 'overdue' | 'urgent' | 'normal' | 'none' } {
    if (!dueDateStr) return { text: "—", variant: 'none' };
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    due.setHours(0,0,0,0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, variant: 'overdue' };
    if (diffDays === 0) return { text: "Due today", variant: 'urgent' };
    if (diffDays <= 3) return { text: `${diffDays} days left`, variant: 'urgent' };
    return { text: `${diffDays} days left`, variant: 'normal' };
  }

  function getUserByEmail(email: string): User {
    return users.find(u => u.email === email) || { name: email, email, department: "—" };
  }

  function openAddModal() {
    formData = {
      title: "",
      assignee: "",
      dueDate: new Date().toISOString().split('T')[0],
      description: "",
      status: "Assigned"
    };
    showModal = 'add';
  }

  function openUpdateModal(task: Task) {
    selectedTask = task;
    formData = {
      title: task.title,
      assignee: getUserByEmail(task.assignee_email).name,
      dueDate: task.due_date || new Date().toISOString().split('T')[0],
      description: task.description || "",
      status: task.status
    };
    showModal = 'update';
  }

  function openDeleteModal(task: Task) {
    selectedTask = task;
    showModal = 'delete';
  }

  async function handleAddSubmit() {
  if (!formData.title.trim()) {
    alert("Please enter a task title.");
    return;
  }
  if (!formData.assignee) {
    alert("Please select an assignee.");
    return;
  }

  const assignee = users.find(u => u.name === formData.assignee);
  if (!assignee) return;

  try {
    // ✅ Remove requester_email - backend sets it automatically
    await createDelegationTask({
      title: formData.title,
      assignee_email: assignee.email,
      due_date: formData.dueDate,
      description: formData.description
      // status is auto-set to "Assigned" in backend
    });
    showModal = null;
    loadAllData();
  } catch (err) {
    alert("Failed to create task: " + (err as Error).message);
  }
}

  async function handleUpdateSubmit() {
    const assignee = users.find(u => u.name === formData.assignee);
    if (!assignee) return;

    const payload: any = {
      task_id: selectedTask!.task_id,
      status: formData.status,
      assignee_email: assignee.email,
      description: formData.description
    };

    if (formData.status === "Revise Requested" && formData.dueDate) {
      payload.due_date = formData.dueDate;
    }

    try {
      await updateDelegationTask(payload);
      showModal = null;
      selectedTask = null;
      loadAllData();
    } catch (err) {
      alert("Update failed: " + (err as Error).message);
    }
  }

  async function handleDeleteConfirm() {
    try {
      await updateDelegationTask({
        task_id: selectedTask!.task_id,
        status: "Cancelled"
      });
      showModal = null;
      selectedTask = null;
      loadAllData();
    } catch (err) {
      alert("Failed to cancel task: " + (err as Error).message);
    }
  }

  function closeModal() {
    showModal = null;
    selectedTask = null;
  }
</script>

<div class="delegation-dashboard">
  <!-- Header -->
  <div class="app-header">
    <div class="header-top">
      <div class="header-title-group">
        <h1>Internal Delegation</h1>
        {#if !loading && tasks.length > 0}
          <span class="task-count-badge">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
        {/if}
      </div>

      <div class="controls">
        {#if !loading && tasks.length > 0}
          <button
            class="icon-btn sort-btn"
            on:click={toggleSort}
            aria-label="Toggle sort by due date"
            title="Sort by due date"
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
      </div>
    </div>
    <p>Delegate and track tasks across your team</p>
    {#if lastUpdated}
      <p class="last-updated">Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
    {/if}
  </div>

  <!-- Stats -->
  {#if tasks.length > 0}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{stats.total}</div>
        <div class="stat-label">Total Tasks</div>
      </div>
      <div class="stat-card status-assigned">
        <div class="stat-value">{stats.pending}</div>
        <div class="stat-label">Assigned</div>
      </div>
      <div class="stat-card status-in-progress">
        <div class="stat-value">{stats.inProgress}</div>
        <div class="stat-label">In Progress</div>
      </div>
      <div class="stat-card status-completed">
        <div class="stat-value">{stats.completed}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card status-blocked">
        <div class="stat-value">{stats.blocked}</div>
        <div class="stat-label">Blocked</div>
      </div>
    </div>
  {/if}

  <!-- Create Task Button -->
  <div class="action-center">
    <button class="big-action-btn" on:click={openAddModal}>
      Create New Task
    </button>
  </div>

  <!-- Task List -->
  {#if loading}
    <div class="loading">Loading tasks...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if tasks.length === 0}
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M8 6h8M8 12h8M8 18h8" />
        <circle cx="12" cy="12" r="10" />
      </svg>
      <h2>No tasks yet</h2>
      <p>Click “Create New Task” to delegate work to your team.</p>
    </div>
  {:else}
    <div class="task-list">
      {#each tasks as task}
        <div class="task-card">
          <div class="task-header">
            <div class="task-title">{task.title}</div>
            <div class="task-id">#{task.task_id}</div>
          </div>
          
          <div class="task-badges">
            <span class={`status-badge ${STATUS_MAP[task.status]?.colorClass || 'status-assigned'}`}>
              {STATUS_MAP[task.status]?.label || task.status}
            </span>
          </div>
          
          <div class="task-meta">
            <div class="meta-row">
              <span class="meta-label">Requested by</span>
              <span class="meta-value">{getUserByEmail(task.requester_email).name}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Assigned to</span>
              <span class="meta-value">{getUserByEmail(task.assignee_email).name}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Department</span>
              <span class="meta-value">{getUserByEmail(task.assignee_email).department}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Due date</span>
              <span class={`meta-value due-${calculateDaysUntil(task.due_date).variant}`}>
                {calculateDaysUntil(task.due_date).text}
              </span>
            </div>
          </div>
          
          {#if task.description}
            <div class="description-box">
              {task.description}
            </div>
          {/if}
          
          <div class="task-actions">
            <button class="btn secondary" on:click={() => openUpdateModal(task)}>Update</button>
            <button class="btn danger" on:click={() => openDeleteModal(task)}>Cancel</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Keyboard hint -->
  <p class="hint">Press <kbd>R</kbd> to refresh</p>

  <!-- MODALS -->
  {#if showModal}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-overlay" on:click={closeModal} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="modal-content" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation>
        {#if showModal === 'add'}
          <h2>Create New Task</h2>
          <div class="form-group">
            <label for="task-title">Task Title *</label>
            <input id="task-title" type="text" bind:value={formData.title} placeholder="e.g., Review Q3 budget" />
          </div>
          <div class="form-group">
            <label for="assignee">Assign to *</label>
            <select id="assignee" bind:value={formData.assignee}>
              <option value="">— Select —</option>
              {#each users.map(u => u.name).sort() as name}
                <option value={name}>{name}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <div>Due Date</div>
            <div class="form-hint">Auto-set to today</div>
          </div>
          <div class="form-group">
            <label for="task-description">Description (optional)</label>
            <textarea id="task-description" bind:value={formData.description} placeholder="Add details..." rows="3"></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn secondary" on:click={closeModal}>Cancel</button>
            <button class="btn primary" on:click={handleAddSubmit}>Create Task</button>
          </div>

        {:else if showModal === 'update'}
          <h2>Update Task #{selectedTask?.task_id}</h2>
          <div class="form-group">
            <label for="update-status">Status *</label>
            <select id="update-status" bind:value={formData.status}>
              {#each Object.keys(STATUS_MAP) as status}
                <option value={status}>{STATUS_MAP[status].label}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="reassign">Reassign To</label>
            <select id="reassign" bind:value={formData.assignee}>
              <option value="">— Keep current —</option>
              {#each users.map(u => u.name).sort() as name}
                <option value={name}>{name}</option>
              {/each}
            </select>
          </div>
          {#if formData.status === "Revise Requested"}
            <div class="form-group">
              <label for="revise-due-date">New Due Date *</label>
              <input id="revise-due-date" type="date" bind:value={formData.dueDate} min={new Date().toISOString().split('T')[0]} />
            </div>
          {/if}
          <div class="form-group">
            <label for="update-description">Description (optional)</label>
            <textarea id="update-description" bind:value={formData.description} placeholder="Add notes..." rows="3"></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn secondary" on:click={closeModal}>Cancel</button>
            <button class="btn primary" on:click={handleUpdateSubmit}>Save Changes</button>
          </div>

        {:else if showModal === 'delete'}
          <h2>Cancel Task?</h2>
          <p>Are you sure you want to cancel this task? This cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn secondary" on:click={closeModal}>Go Back</button>
            <button class="btn danger" on:click={handleDeleteConfirm}>Confirm Cancellation</button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background-color: #fafafa;
    color: #1f1f1f;
    transition: background-color 0.3s, color 0.3s;
  }

  :global(body.dark) {
    background-color: #121212;
    color: #e0e0e0;
  }

  .delegation-dashboard {
    max-width: 900px;
    margin: 0 auto;
    padding: 24px 16px 32px;
  }

  .app-header {
    text-align: left;
    margin-bottom: 28px;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 8px;
  }

  .header-title-group {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .app-header h1 {
    font-size: 1.8rem;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .task-count-badge {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  :global(body.dark) .task-count-badge {
    background: #1b2b1b;
    color: #81c784;
  }

  .controls {
    display: flex;
    gap: 8px;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: transparent;
    border: 1px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s;
    color: #555;
  }

  :global(body.dark) .icon-btn {
    color: #bbb;
  }

  .icon-btn:hover {
    background: #f0f0f0;
  }

  :global(body.dark) .icon-btn:hover {
    background: #2a2a2a;
  }

  .app-header p {
    color: #666;
    margin: 4px 0 12px;
    font-size: 1rem;
  }

  :global(body.dark) .app-header p {
    color: #aaa;
  }

  .last-updated {
    font-size: 0.85rem;
    color: #777;
    margin: 0;
  }

  :global(body.dark) .last-updated {
    color: #bbb;
  }

  .hint {
    text-align: center;
    color: #888;
    font-size: 0.8rem;
    margin-top: 20px;
  }

  :global(body.dark) .hint {
    color: #999;
  }

  kbd {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 0.75em;
    box-shadow: inset 0 -1px 0 rgba(0,0,0,0.1);
  }

  :global(body.dark) kbd {
    background: #333;
    box-shadow: inset 0 -1px 0 rgba(255,255,255,0.05);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 28px;
  }

  .stat-card {
    background: white;
    padding: 16px;
    border-radius: 10px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    text-align: center;
  }

  :global(body.dark) .stat-card {
    background: #1e1e1e;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 4px;
    color: #1f1f1f;
  }

  :global(body.dark) .stat-value {
    color: #e0e0e0;
  }

  .stat-label {
    font-size: 0.85rem;
    color: #666;
  }

  :global(body.dark) .stat-label {
    color: #aaa;
  }

  .status-assigned { --status-color: #6b7280; }
  .status-in-progress { --status-color: #3b82f6; }
  .status-blocked { --status-color: #ef4444; }
  .status-completed { --status-color: #10b981; }
  .status-revise { --status-color: #f59e0b; }
  .status-cancelled { --status-color: #8b5cf6; }

  .stat-card.status-assigned { border-left: 3px solid var(--status-color); }
  .stat-card.status-in-progress { border-left: 3px solid var(--status-color); }
  .stat-card.status-blocked { border-left: 3px solid var(--status-color); }
  .stat-card.status-completed { border-left: 3px solid var(--status-color); }
  .stat-card.status-revise { border-left: 3px solid var(--status-color); }

  .status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    color: white;
    background-color: var(--status-color);
  }

  .action-center {
    display: flex;
    justify-content: center;
    margin: 24px 0;
  }

  .big-action-btn {
    background: #4caf50;
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 8px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 6px rgba(76, 175, 80, 0.2);
  }

  .big-action-btn:hover {
    background: #45a049;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(76, 175, 80, 0.3);
  }

  .task-list {
    margin-top: 8px;
  }

  .task-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    transition: all 0.2s;
  }

  :global(body.dark) .task-card {
    background: #1e1e1e;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  }

  .task-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }

  .task-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .task-title {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0;
    flex: 1;
    min-width: 0;
  }

  .task-id {
    font-family: ui-monospace, monospace;
    background: #f0f0f0;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.85rem;
    color: #666;
    font-weight: 600;
  }

  :global(body.dark) .task-id {
    background: #333;
    color: #aaa;
  }

  .task-meta {
    margin: 16px 0;
    padding: 16px;
    background: #f9f9f9;
    border-radius: 8px;
    font-size: 0.95rem;
  }

  :global(body.dark) .task-meta {
    background: #2a2a2a;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .meta-row:last-child {
    margin-bottom: 0;
  }

  .meta-label {
    color: #666;
    font-weight: 500;
  }

  :global(body.dark) .meta-label {
    color: #aaa;
  }

  .meta-value {
    color: #1f1f1f;
    font-weight: 500;
  }

  :global(body.dark) .meta-value {
    color: #e0e0e0;
  }

  .due-overdue { color: #ef4444; }
  .due-urgent { color: #f59e0b; }
  .due-normal { color: #10b981; }

  .description-box {
    background: #f9f9f9;
    padding: 14px;
    border-radius: 8px;
    margin: 16px 0;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  :global(body.dark) .description-box {
    background: #2a2a2a;
  }

  .task-actions {
    display: flex;
    gap: 12px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #eee;
  }

  :global(body.dark) .task-actions {
    border-top-color: #333;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    min-height: 32px;
  }

  .btn.primary {
    background: #4caf50;
    color: white;
  }

  .btn.secondary {
    background: #f1f1f1;
    color: #333;
  }

  .btn.danger {
    background: #ef4444;
    color: white;
  }

  :global(body.dark) .btn.secondary {
    background: #2a2a2a;
    color: #ddd;
  }

  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }

  .empty-state {
    text-align: center;
    padding: 40px 24px;
    color: #666;
  }

  :global(body.dark) .empty-state {
    color: #aaa;
  }

  .empty-state svg {
    margin-bottom: 16px;
    color: #666;
  }

  :global(body.dark) .empty-state svg {
    color: #888;
  }

  .empty-state h2 {
    font-size: 1.4rem;
    margin: 0 0 10px;
    font-weight: 600;
  }

  .empty-state p {
    margin: 0;
    font-size: 1rem;
  }

  .loading, .error {
    text-align: center;
    padding: 24px;
    color: #666;
  }

  .error {
    color: #ef4444;
  }

  :global(body.dark) .error {
    color: #ff6b6b;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 550px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }

  :global(body.dark) .modal-content {
    background: #1e1e1e;
  }

  .modal-content h2 {
    font-size: 1.4rem;
    margin: 0 0 20px;
    font-weight: 600;
  }

  .form-group {
    margin-bottom: 18px;
  }

  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #333;
  }

  :global(body.dark) .form-group label {
    color: #ccc;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    background: #fafafa;
    color: #1f1f1f;
  }

  :global(body.dark) .form-group input,
  :global(body.dark) .form-group select,
  :global(body.dark) .form-group textarea {
    background: #2a2a2a;
    border-color: #444;
    color: #e0e0e0;
  }

  .form-hint {
    font-size: 0.85rem;
    color: #888;
    margin-top: 4px;
  }

  :global(body.dark) .form-hint {
    color: #999;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    justify-content: flex-end;
  }

  @media (max-width: 600px) {
    .modal-actions {
      flex-direction: column;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .task-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .task-actions {
      flex-direction: column;
    }

    .header-top {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>