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
	let error: string = '';
	let lastUpdated: Date | null = null;
	let sortOrder = 'asc';

	onMount(() => {
		user_email = getAuthUser();
		if (!user_email) {
			goto('/');
			return;
		}

		// ✅ Robust dark mode initialization
		const savedSort = localStorage.getItem('bisTaskSortOrder');
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

	function toggleSort() {
		sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		localStorage.setItem('bisTaskSortOrder', sortOrder);
		tasks = [...tasks].sort((a, b) => {
			const dateA = new Date(a.planned.split('/').reverse().join('-'));
			const dateB = new Date(b.planned.split('/').reverse().join('-'));
			return sortOrder === 'asc'
				? dateA.getTime() - dateB.getTime()
				: dateB.getTime() - dateA.getTime();
		});
	}

	async function loadTasks() {
		if (!user_email) return;
		loading = true;
		error = '';
		try {
			const res = await fetchBisTasks();
			if (!res.ok) throw new Error(res.error || 'Failed to load BIS tasks');

			const allTasks = res.data || [];
			tasks = [...allTasks].sort((a, b) => {
				const dateA = new Date(a.planned.split('/').reverse().join('-'));
				const dateB = new Date(b.planned.split('/').reverse().join('-'));
				return sortOrder === 'asc'
					? dateA.getTime() - dateB.getTime()
					: dateB.getTime() - dateA.getTime();
			});
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
					<span class="task-count-badge"
						>{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span
					>
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
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M12 5v14M19 12l-7 7-7-7" />
							</svg>
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M12 19V5M5 12l7-7 7 7" />
							</svg>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<p class="page-subtitle">Complete FMS-linked tasks via Google Forms</p>

		{#if lastUpdated}
			<p class="last-updated">
				Updated: {(lastUpdated as Date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
			</p>
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
							<button class="btn primary" on:click={() => openLink(task.markDoneUrl)}>
								Mark Done
							</button>
						{/if}
						{#if task.fmsLink}
							<button class="btn secondary" on:click={() => openLink(task.fmsLink)}>
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
