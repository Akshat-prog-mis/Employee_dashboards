<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { authenticate, saveAuth, getAuthUser, getEmployeeName } from '$lib/auth.js';
	import { goto } from '$app/navigation';
	import { fetchSystems } from '$lib/api.js';
	import './page.css';

	interface SystemItem {
		name: string;
		url: string;
		description: string;
		associatedLink?: string;
	}

	let email: string = '';
	let password: string = '';
	let error: string = '';
	let loading: boolean = false;
	let authenticated: boolean = false;

	let launcherItems: SystemItem[] = [];
	let mySystemItems: SystemItem[] = [];
	let systemsLoading: boolean = false;
	let systemsError: string = '';

	onMount(() => {
		const user = getAuthUser();
		if (user) {
			authenticated = true;
			loadSystems();
		}
	});

	async function handleLogin() {
		if (!email || !password) {
			error = 'Please enter both email and password';
			return;
		}

		loading = true;
		error = '';
		try {
			if (authenticate(email, password)) {
				saveAuth(email);
				authenticated = true;
				loadSystems();
			} else {
				error = 'Invalid email or password';
			}
		} catch (err) {
			error = 'Login failed. Please try again.';
		} finally {
			loading = false;
		}
	}

	function handleLogout() {
		localStorage.removeItem('authenticated_user');
		authenticated = false;
		email = '';
		password = '';
		launcherItems = [];
		mySystemItems = [];
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleLogin();
	}

	async function loadSystems() {
		systemsLoading = true;
		systemsError = '';

		try {
			const res = await fetchSystems();

			if (!res || !res.ok) {
				throw new Error(res?.error || 'Failed to load systems');
			}

			const data = res.data || {};

			launcherItems = Array.isArray(data.launcher) ? data.launcher : [];
			mySystemItems = Array.isArray(data.mySystem) ? data.mySystem : [];
		} catch (err) {
			console.error('System load error:', err);
			systemsError = 'Failed to load systems';
			launcherItems = [];
			mySystemItems = [];
		} finally {
			systemsLoading = false;
		}
	}

	function openLink(url: string) {
		if (url) window.open(url, '_blank', 'noopener,noreferrer');
	}
</script>

{#if authenticated}
	<div class="dashboard-home">
		<div class="hero">
			<h1>Welcome Home</h1>
		</div>

		<div class="user-bar">
			<span>Hello, <strong>{getEmployeeName()}</strong></span>
			<button class="btn logout" on:click={handleLogout}>Sign out</button>
		</div>

		<!-- Core Navigation -->
		<div class="cards-grid">
			<a href="/tasks" class="dashboard-card">
				<div class="card-icon">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M5 12l5 5L20 7" />
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
				</div>
				<h2>My Due Tasks</h2>
				<p>Daily task management</p>
			</a>

			<a href="/bis-tasks" class="dashboard-card">
				<div class="card-icon">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<rect x="2" y="3" width="20" height="14" rx="2" />
						<path d="M8 13h8M8 17h4M8 9h8" />
						<line x1="12" y1="3" x2="12" y2="21" />
					</svg>
				</div>
				<h2>BIS Due Tasks</h2>
				<p>Complete your due tasks</p>
			</a>

			<a href="/internal-delegation" class="dashboard-card">
				<div class="card-icon">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						<line x1="12" y1="12" x2="12" y2="21" />
					</svg>
				</div>
				<h2>Internal Delegation</h2>
				<p>Assign or complete tasks</p>
			</a>
		</div>

		<!-- Systems Section with Skeleton Loading -->
		{#if systemsLoading && launcherItems.length === 0 && mySystemItems.length === 0}

			<!-- Launcher Skeleton -->
			<section class="systems-section">
				<div class="section-header">
					<h2>System Launcher</h2>
					<p>Start new company processes</p>
				</div>
				<div class="cards-grid compact">
					{#each Array(2) as _, i}
						<div class="dashboard-card skeleton-card">
							<div class="card-icon"></div>
							<div class="skeleton-line short"></div>
							<div class="skeleton-line long"></div>
						</div>
					{/each}
				</div>
			</section>

			<!-- My System Skeleton -->
			<section class="systems-section">
				<div class="section-header">
					<h2>My System</h2>
					<p>Tools and dashboards you're involved in</p>
				</div>
				<div class="cards-grid compact">
					{#each Array(2) as _, i}
						<div class="dashboard-card skeleton-card">
							<div class="card-icon"></div>
							<div class="skeleton-line short"></div>
							<div class="skeleton-line long"></div>
						</div>
					{/each}
				</div>
			</section>
		{:else}
						<!-- Launcher Real Content -->
			{#if launcherItems.length > 0}
				<section class="systems-section">
					<div class="section-header">
						<h2>System Launcher</h2>
						<p>Start new company processes</p>
					</div>
					<div class="cards-grid compact">
						{#each launcherItems as item}
							<button type="button" class="dashboard-card" on:click={() => openLink(item.url)}>
								<div class="card-icon">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3M8 7H5a5 5 0 0 0-5 5 5 5 0 0 0 5 5h3"
										/>
										<line x1="12" y1="7" x2="12" y2="17" />
									</svg>
								</div>
								<h3>{item.name}</h3>
								<p>{item.description}</p>
								{#if item.associatedLink}
									<span
										class="link-btn"
										role="button"
										tabindex="0"
										on:click|stopPropagation={() => openLink(item.associatedLink!)}
										on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLink(item.associatedLink!); } }}
									>
										Associated Link
									</span>
								{/if}
							</button>
						{/each}
					</div>
				</section>
			{/if}
			
			<!-- My System Real Content -->
			{#if mySystemItems.length > 0}
				<section class="systems-section">
					<div class="section-header">
						<h2>My System</h2>
						<p>Tools and dashboards you're involved in</p>
					</div>
					<div class="cards-grid compact">
						{#each mySystemItems as item}
							<a href={item.url} class="dashboard-card" target="_blank" rel="noopener">
								<div class="card-icon">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<rect x="2" y="3" width="20" height="14" rx="2" />
										<path d="M8 13h8M8 17h4M8 9h8" />
									</svg>
								</div>
								<h3>{item.name}</h3>
								<p>{item.description}</p>
								{#if item.associatedLink}
									<span
										class="link-btn"
										role="button"
										tabindex="0"
										on:click|stopPropagation={() => openLink(item.associatedLink!)}
										on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLink(item.associatedLink!); } }}
									>
										Associated Link
									</span>
								{/if}
							</a>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Final states (only when NOT loading) -->
			{#if !systemsLoading}
				{#if systemsError}
					<div class="status-text error">{systemsError}</div>
				{:else if launcherItems.length === 0 && mySystemItems.length === 0}
					<div class="empty-state">
						<div class="empty-icon">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="48"
								height="48"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="12" />
								<line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
						</div>
						<h2>No systems assigned</h2>
						<p>Contact your admin to get access to company systems.</p>
					</div>
				{/if}
			{/if}
		{/if}

		<footer class="footer">
			<p>© {new Date().getFullYear()} TaskHub • Secure internal dashboard</p>
		</footer>
	</div>
{:else}
	<!-- Login View -->
	<div class="login-container">
		<div class="login-card">
			<div class="logo">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V6" />
					<path d="M6 6v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
				</svg>
			</div>
			<h1>Employee Dashboard</h1>
			<p class="login-subtitle">Sign in to your operational dashboard</p>

			{#if error}
				<div class="error-alert" role="alert">
					{error}
				</div>
			{/if}

			<form on:submit|preventDefault={handleLogin}>
				<div class="input-group">
					<label for="email">Work Email</label>
					<input
						id="email"
						type="email"
						placeholder="name@company.com"
						autocomplete="username"
						bind:value={email}
						on:keydown={handleKeyDown}
					/>
				</div>

				<div class="input-group">
					<label for="password">Password</label>
					<input
						id="password"
						type="password"
						placeholder="••••••••"
						autocomplete="current-password"
						bind:value={password}
						on:keydown={handleKeyDown}
					/>
				</div>

				<button type="submit" disabled={loading}>
					{loading ? 'Signing in...' : 'Sign In'}
				</button>
			</form>

			<p class="help-text">Contact IT for credentials</p>
		</div>
	</div>
{/if}
