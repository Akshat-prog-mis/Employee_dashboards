<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { getAuthUser, clearAuth } from '$lib/auth.js';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import './layout.css';

	let user_email: string | null = null;
	let currentTime: string = '';
	let darkMode = false;

	$: currentPath = $page.url.pathname;

	// Update current time every minute
	function updateTime() {
		const now = new Date();
		currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// Dark mode utilities
	function applyDarkMode(isDark: boolean) {
		darkMode = isDark;
		if (isDark) {
			document.body.classList.add('dark');
		} else {
			document.body.classList.remove('dark');
		}
		localStorage.setItem('darkMode', isDark.toString());
	}

	onMount(() => {
		user_email = getAuthUser();

		// Initialize dark mode
		const savedDark = localStorage.getItem('darkMode') === 'true';
		const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
		const initialDark = localStorage.getItem('darkMode') !== null ? savedDark : prefersDark;
		applyDarkMode(initialDark);

		// Set initial time and start timer
		updateTime();
		const timeInterval = setInterval(updateTime, 60_000);

		return () => clearInterval(timeInterval);
	});

	function toggleDarkMode() {
		applyDarkMode(!darkMode);
	}

	function handleLogout() {
		clearAuth();
		goto('/');
	}

	const getPageTitle = (path: string) => {
		if (path === '/tasks') return 'My Due Tasks';
		if (path === '/bis-tasks') return 'BIS Due Tasks';
		const parts = path.split('/').filter(Boolean);
		return parts.map((p) => p.replace(/-/g, ' ')).join(' / ') || 'Dashboard';
	};

	$: showLogout = user_email && currentPath !== '/';
	const notificationCount = 0;
</script>

{#if user_email}
	<header class="global-header">
		<div class="header-content">
			<div class="app-brand">
				<h1>Employee Dashboard</h1>
			</div>

			<div class="center-section">
				{#if currentPath !== '/'}
					<div class="breadcrumbs">
						<button
							type="button"
							class="breadcrumb-home"
							on:click={() => goto('/')}
							aria-label="Go to home"
						>
							Home
						</button>
						<span class="breadcrumb-separator">/</span>
						<span class="breadcrumb-current">{getPageTitle(currentPath)}</span>
					</div>
				{/if}

				<div class="time-display">
					{currentTime}
				</div>
			</div>

			<div class="user-actions">
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

				<!-- Notification (hidden for now, but reserved) -->
				<!--
        <button 
          type="button"
          class="icon-btn notification-btn"
          on:click={() => alert('Notifications (stub)')}
          aria-label={notificationCount > 0 ? `Notifications: ${notificationCount} new` : 'Notifications'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {#if notificationCount > 0}
            <span class="badge-count">{notificationCount}</span>
          {/if}
        </button>
        -->

				<span class="user-email" title={user_email}>{user_email}</span>

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
