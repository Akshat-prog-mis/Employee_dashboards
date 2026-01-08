<!-- src/routes/tasks/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fetchTasks, completeTask, CACHE } from '$lib/api.js';
	import { getAuthUser } from '$lib/auth.js';
	import './task.css';

	interface Task {
		id: string;
		name: string;
		planned: string;
	}

	let user_email: string | null = null;
	let tasks: Task[] = [];
	let loading = false;
	let error = '';
	let sortOrder = 'asc';
	let darkMode = false;
	let lastUpdated: Date | null = null;

	onMount(() => {
		user_email = getAuthUser();
		if (!user_email) {
			goto('/');
			return;
		}

		const savedDark = localStorage.getItem('darkMode');
		darkMode = savedDark === 'true';
		document.body.classList.toggle('dark', darkMode);

		const savedSort = localStorage.getItem('taskSortOrder');
		if (savedSort === 'asc' || savedSort === 'desc') {
			sortOrder = savedSort;
		}

		loadTasks();
		const interval = setInterval(() => {
			// Clear cache to force fresh data on next load
			const cacheKey = `tasks:${user_email}`;
			CACHE.delete(cacheKey);
			// Optional: visually indicate refresh
			lastUpdated = new Date();
		}, 120_000);

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

	function toggleDarkMode() {
		darkMode = !darkMode;
		localStorage.setItem('darkMode', darkMode.toString());
		document.body.classList.toggle('dark', darkMode);
	}

	function toggleSort() {
		sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		localStorage.setItem('taskSortOrder', sortOrder);
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
			const res = await fetchTasks(user_email);

			if (!res.ok) throw new Error('Failed');

			tasks = res.data;
			lastUpdated = new Date();
		} catch (err) {
			error = 'Failed to load tasks';
			tasks = [];
		} finally {
			loading = false;
		}
	}

	async function handleComplete(taskId: string) {
		const old = tasks;
		tasks = tasks.filter((t) => t.id !== taskId);

		try {
			await completeTask(taskId, user_email!);
		} catch (err) {
			alert('Failed. Reloading.');
			tasks = old;
		}
	}
</script>

<div class="dashboard">
	<header>
		<div class="header-left">
			<h1>My Due Tasks</h1>
			{#if !loading && tasks.length > 0}
				<span class="task-count">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
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
			<button
				class="icon-btn theme-toggle"
				on:click={toggleDarkMode}
				aria-label="Toggle dark mode"
				title="Switch theme"
			>
				{#if darkMode}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
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
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				{/if}
			</button>
		</div>
	</header>

	<p class="subtitle">
		Tasks due today or earlier
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
			<h2>All caught up</h2>
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
					<button class="btn primary" on:click={() => handleComplete(task.id)}> Complete </button>
				</div>
			{/each}
		</div>
	{/if}

	<p class="hint">Press <kbd>C</kbd> to complete the first task, <kbd>R</kbd> to refresh</p>
</div>
