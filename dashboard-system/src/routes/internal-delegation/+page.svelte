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

  // State
  let user_email: string | null = null;
  let tasks: Task[] = [];
  let users: User[] = [];
  let loading: boolean = false;
  let error: string = "";
  let stats = { total: 0, pending: 0, inProgress: 0, completed: 0, blocked: 0 };

  // Modals
  let showModal: string | null = null; // 'add', 'update', 'delete'
  let selectedTask: Task | null = null;
  let formData: FormData = {
    title: "",
    assignee: "",
    dueDate: new Date().toISOString().split('T')[0],
    description: "",
    status: "Assigned"
  };

  // Config
  const STATUS_CONFIG: Record<string, { color: string; icon: string; desc: string }> = {
    "Assigned": { color: "#6B7280", icon: "📋", desc: "Newly assigned" },
    "In Progress": { color: "#3B82F6", icon: "⚡", desc: "Being worked on" },
    "Blocked": { color: "#EF4444", icon: "🚫", desc: "Needs attention" },
    "Completed": { color: "#10B981", icon: "✅", desc: "Finished" },
    "Revise Requested": { color: "#F59E0B", icon: "🔄", desc: "Needs revision" },
    "Cancelled": { color: "#8B5CF6", icon: "❌", desc: "Cancelled" }
  };


  onMount(() => {
    user_email = getAuthUser();
    if (!user_email) {
      goto('/');
      return;
    }
    loadAllData();
  //   const autoRefresh = setTimeout(() => {
  //   loadAllData();
  // }, 4 * 60 * 60 * 1000);

  // return () => clearTimeout(autoRefresh);
  });

  async function loadAllData() {
    loading = true;
    error = "";
    try {
      const { tasks: t, users: u } = await fetchDelegationData();
      tasks = t;
      users = u;

      // Calculate stats
      stats = {
        total: tasks.length,
        pending: tasks.filter((t: Task) => t.status === "Assigned").length,
        inProgress: tasks.filter((t: Task) => t.status === "In Progress").length,
        completed: tasks.filter((t: Task) => t.status === "Completed").length,
        blocked: tasks.filter((t: Task) => t.status === "Blocked").length
      };
    } catch (err) {
      error = (err as Error).message || "Failed to load data";
    } finally {
      loading = false;
    }
  }

  // Helper functions
  function calculateDaysUntil(dueDateStr: string | undefined): { text: string; color: string } {
    if (!dueDateStr) return { text: "—", color: "gray" };
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    due.setHours(0,0,0,0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `⚠️ ${Math.abs(diffDays)} days overdue`, color: "red" };
    if (diffDays === 0) return { text: "📅 Due today", color: "orange" };
    if (diffDays <= 3) return { text: `📅 ${diffDays} days left`, color: "orange" };
    return { text: `📅 ${diffDays} days left`, color: "green" };
  }

  function getUserByEmail(email: string): { name: string; email: string; department: string } {
    return users.find((u: User) => u.email === email) || { name: email, email, department: "—" };
  }

  // Modal handlers
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
      alert("Please enter a task title!");
      return;
    }
    if (!formData.assignee) { // ✅ Only check assignee (requester is auto)
      alert("Please select assignee.");
      return;
    }

    const payload = {
      title: formData.title,
      requester_email: user_email!, // ✅ Auto: current user
      assignee_email: users.find((u: User) => u.name === formData.assignee)?.email,
      // ❌ category: ... → REMOVED
      // ❌ priority: ...  → REMOVED
      due_date: formData.dueDate,
      description: formData.description,
      status: "Assigned"
    };

    try {
      await createDelegationTask(payload);
      showModal = null;
      loadAllData();
    } catch (err) {
      alert("Failed to create task: " + (err as Error).message);
    }
  } 

  async function handleUpdateSubmit() {
    const payload: any = {
      task_id: selectedTask!.task_id,
      status: formData.status,
      assignee_email: users.find((u: User) => u.name === formData.assignee)?.email,
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
    <h1>📋 Internal Delegation</h1>
    <p>Simple and easy task management for your team</p>
  </div>

  <!-- Stats -->
  {#if tasks.length > 0}
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">{stats.total}</div><div class="stat-label">📊 Total Tasks</div></div>
      <div class="stat-card" style="border-left-color: #6B7280;"><div class="stat-value">{stats.pending}</div><div class="stat-label">📋 Pending</div></div>
      <div class="stat-card" style="border-left-color: #3B82F6;"><div class="stat-value">{stats.inProgress}</div><div class="stat-label">⚡ In Progress</div></div>
      <div class="stat-card" style="border-left-color: #10B981;"><div class="stat-value">{stats.completed}</div><div class="stat-label">✅ Completed</div></div>
      <div class="stat-card" style="border-left-color: #EF4444;"><div class="stat-value">{stats.blocked}</div><div class="stat-label">🚫 Blocked</div></div>
    </div>
  {/if}

  <!-- Create Task Button -->
  <div class="action-center">
    <button class="big-action-btn primary" on:click={openAddModal}>
      <div class="icon">➕</div>
      <div class="title">Create New Task</div>
    </button>
  </div>

  <!-- Task List -->
  {#if loading}
    <div class="loading">Loading tasks...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if tasks.length === 0}
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">No tasks yet!</div>
      <div class="empty-state-subtext">Click "Create New Task" above to get started</div>
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
            <span class="status-badge" style="background-color: {STATUS_CONFIG[task.status]?.color || '#6B7280'}">
              {STATUS_CONFIG[task.status]?.icon || '📋'} {task.status}
            </span>
          </div>
          
          <div class="task-meta">
            <div class="meta-item"><div class="meta-label">Requested By</div><div class="meta-value">👤 {getUserByEmail(task.requester_email).name}</div></div>
            <div class="meta-item"><div class="meta-label">Assigned To</div><div class="meta-value">👥 {getUserByEmail(task.assignee_email).name}</div></div>
            <div class="meta-item"><div class="meta-label">Department</div><div class="meta-value">🏢 {getUserByEmail(task.assignee_email).department}</div></div>
            <div class="meta-item"><div class="meta-label">Due Date</div><div class="meta-value" style="color: {calculateDaysUntil(task.due_date).color === 'red' ? '#EF4444' : calculateDaysUntil(task.due_date).color === 'orange' ? '#F59E0B' : '#1F2937'}">{calculateDaysUntil(task.due_date).text}</div></div>
          </div>
          
          {#if task.description}
            <div class="description-box">
              <strong>📝 Description:</strong><br>
              {task.description}
            </div>
          {/if}
          
          <div class="task-actions">
            <button class="btn secondary" on:click={() => openUpdateModal(task)}>✏️ Update</button>
            <button class="btn danger" on:click={() => openDeleteModal(task)}>🗑️ Cancel</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- MODALS -->
{#if showModal === 'add'}
  <div class="modal-overlay" role="dialog" aria-modal="true" tabindex="-1" on:click={closeModal} on:keydown={(e) => { if (e.key === 'Escape') closeModal(); }}>
    <div role="presentation" on:click|stopPropagation on:keydown={() => {}}>
      <div class="modal-content" role="document">
        <h2>➕ Create New Task</h2>
      
      <div class="form-group">
        <label for="task-title">Task Title *</label>
        <input 
          id="task-title"
          type="text"
          bind:value={formData.title}
          placeholder="e.g., Update client presentation slides"
        />
      </div>
      
      <div class="form-group">
        <label for="assignee">Assign to *</label>
        <select id="assignee" bind:value={formData.assignee}>
          {#each users.map(u => u.name).sort() as name}
            <option value={name}>{name}</option>
          {/each}
        </select>
      </div>
      
      <div class="form-group">
        <label for="due-date">Due Date</label>
        <input 
          id="due-date"
          type="date"
          bind:value={formData.dueDate}
          disabled
        />
        <div class="form-hint">Auto-set to today</div>
      </div>
      
      <div class="form-group">
        <label for="task-description">Task Description</label>
        <textarea 
          id="task-description"
          bind:value={formData.description}
          placeholder="Provide detailed information about what needs to be done..."
          rows="4"
        ></textarea>
      </div>
      
      <div class="modal-actions">
        <button class="btn secondary" on:click={closeModal}>❌ Cancel</button>
        <button class="btn primary" on:click={handleAddSubmit}>✅ Create Task</button>
      </div>
      </div>
    </div>
  </div>
{/if}

  {#if showModal === 'update' && selectedTask}
  <div class="modal-overlay" role="dialog" aria-modal="true" tabindex="-1" on:click={closeModal} on:keydown={(e) => { if (e.key === 'Escape') closeModal(); }}>
    <div role="presentation" on:click|stopPropagation on:keydown={() => {}}>
      <div class="modal-content" role="document">
        <h2>✏️ Update Task: {selectedTask.task_id}</h2>
      
      <div class="form-group">
        <label for="update-status">Update Status *</label>
        <select id="update-status" bind:value={formData.status}>
          {#each Object.keys(STATUS_CONFIG) as status}
            <option value={status}>{status}</option>
          {/each}
        </select>
      </div>
      
      <div class="form-group">
        <label for="reassign">Reassign To</label>
        <select id="reassign" bind:value={formData.assignee}>
          {#each users.map(u => u.name).sort() as name}
            <option value={name}>{name}</option>
          {/each}
        </select>
      </div>
      
      {#if formData.status === "Revise Requested"}
        <div class="form-group">
          <label for="revise-due-date">New Due Date for Revision *</label>
          <input 
            id="revise-due-date"
            type="date"
            bind:value={formData.dueDate}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      {/if}
      
      <div class="form-group">
        <label for="update-description">Update Description (optional)</label>
        <textarea 
          id="update-description"
          bind:value={formData.description}
          placeholder="Add notes or update task details..."
          rows="3"
        >{selectedTask!.description}</textarea>
      </div>
      
      <div class="modal-actions">
        <button class="btn secondary" on:click={closeModal}>❌ Cancel</button>
        <button class="btn primary" on:click={handleUpdateSubmit}>💾 Save Changes</button>
      </div>
      </div>
    </div>
  </div>
{/if}
</div>

<style>
  .delegation-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px 40px;
  }

  /* Header */
  .app-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2.5rem;
    border-radius: 16px;
    margin-bottom: 2rem;
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
    color: white;
  }

  .app-header h1 {
    margin: 0;
    font-size: 2.8rem;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .app-header p {
    margin: 0.5rem 0 0 0;
    font-size: 1.15rem;
    opacity: 0.95;
  }

  /* Stats */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border-left: 4px solid #667eea;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    transition: transform 0.2s;
  }

  .stat-card:hover {
    transform: translateY(-2px);
  }

  .stat-value {
    font-size: 2.2rem;
    font-weight: 700;
    color: #1F2937;
    margin: 0;
  }

  .stat-label {
    color: #6B7280;
    font-size: 0.95rem;
    margin-top: 0.25rem;
  }

  /* Action Button */
  .action-center {
    display: flex;
    justify-content: center;
    margin: 2rem 0;
  }

  .big-action-btn {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid #E5E7EB;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    width: 100%;
    max-width: 400px;
  }

  .big-action-btn:hover {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  }

  .big-action-btn.primary {
    background: linear-gradient(to right, #4CAF50, #2E7D32);
    color: white;
    border: none;
  }

  .icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .title {
    font-size: 1.2rem;
    font-weight: 600;
  }

  /* Task List */
  .task-list {
    margin-top: 1rem;
  }

  .task-card {
    background: white;
    border-radius: 12px;
    padding: 1.75rem;
    margin-bottom: 1rem;
    border: 2px solid #E5E7EB;
    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    transition: all 0.2s;
  }

  .task-card:hover {
    box-shadow: 0 6px 16px rgba(0,0,0,0.1);
    transform: translateY(-2px);
    border-color: #667eea;
  }

  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }

  .task-title {
    font-size: 1.35rem;
    font-weight: 600;
    color: #1F2937;
    margin: 0;
    flex: 1;
  }

  .task-id {
    font-family: 'Courier New', monospace;
    background: #F3F4F6;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
    color: #6B7280;
    font-weight: 600;
    margin-left: 1rem;
  }

  .task-badges {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1.25rem;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.9rem;
    color: white;
  }

  .task-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.25rem;
    margin: 1.25rem 0;
    padding: 1.25rem;
    background: #F9FAFB;
    border-radius: 10px;
    border: 1px solid #E5E7EB;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .meta-label {
    font-size: 0.75rem;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  .meta-value {
    font-weight: 600;
    color: #1F2937;
    font-size: 0.95rem;
  }

  .description-box {
    background: #F9FAFB;
    padding: 1rem;
    border-radius: 8px;
    border-left: 3px solid #667eea;
    margin: 1rem 0;
    color: #374151;
    line-height: 1.6;
  }

  .task-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid #E5E7EB;
  }

  .btn {
    padding: 0.65rem 1.5rem;
    border-radius: 10px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn.primary {
    background: #4CAF50;
    color: white;
  }

  .btn.secondary {
    background: #f1f1f1;
    color: #333;
  }

  .btn.danger {
    background: #EF4444;
    color: white;
  }

  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
    border-radius: 16px;
    border: 2px dashed #D1D5DB;
  }

  .empty-state-icon {
    font-size: 5rem;
    margin-bottom: 1.5rem;
    opacity: 0.7;
  }

  .empty-state-text {
    color: #6B7280;
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
  }

  .empty-state-subtext {
    color: #9CA3AF;
    font-size: 1rem;
  }

  /* Loading / Error */
  .loading, .error {
    text-align: center;
    padding: 2rem;
    color: #666;
  }

  .error {
    color: #EF4444;
  }

  /* MODALS */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  }

  .modal-content h2 {
    margin-top: 0;
    color: #1F2937;
    font-size: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #374151;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #E5E7EB;
    border-radius: 10px;
    font-size: 1rem;
    font-family: inherit;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    justify-content: flex-end;
  }

  @media (max-width: 768px) {
    .modal-actions {
      flex-direction: column;
    }
    
    .big-action-btn {
      max-width: 100%;
    }
    
    .stats-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>