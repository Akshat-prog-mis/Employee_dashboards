<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authenticate, saveAuth, getAuthUser, getEmployeeName } from '$lib/auth.js';
  import { goto } from '$app/navigation';
  import { fetchSystems } from '$lib/api.js';

  interface SystemItem {
    name: string;
    url: string;
    description: string;
    associatedLink?: string;
  }

  let email: string = "";
  let password: string = "";
  let error: string = "";
  let loading: boolean = false;
  let authenticated: boolean = false;

  let launcherItems: SystemItem[] = [];
  let mySystemItems: SystemItem[] = [];
  let systemsLoading: boolean = false;
  let systemsError: string = "";

  onMount(() => {
    const user = getAuthUser();
    if (user) {
      authenticated = true;
      loadSystems();
    }
  });

  async function handleLogin() {
    if (!email || !password) {
      error = "Please enter both email and password";
      return;
    }

    loading = true;
    error = "";
    try {
      if (authenticate(email, password)) {
        saveAuth(email);
        authenticated = true;
        loadSystems();
      } else {
        error = "Invalid email or password";
      }
    } catch (err) {
      error = "Login failed. Please try again.";
    } finally {
      loading = false;
    }
  }

  function handleLogout() {
    localStorage.removeItem("authenticated_user");
    authenticated = false;
    email = "";
    password = "";
    launcherItems = [];
    mySystemItems = [];
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleLogin();
  }

  async function loadSystems() {
    systemsLoading = true;
    systemsError = "";
    try {
      const { launcher, mySystem } = await fetchSystems();
      launcherItems = launcher;
      mySystemItems = mySystem;
    } catch (err) {
      systemsError = "Failed to load systems";
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
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

    {:else}
      <!-- My System Real Content -->
      {#if mySystemItems.length > 0}
        <section class="systems-section">
          <div class="section-header">
            <h2>My System</h2>
            <p>Tools and dashboards you're involved in</p>
          </div>
          <div class="cards-grid compact">
            {#each mySystemItems as item}
              <a 
                href={item.url} 
                class="dashboard-card"
                target="_blank"
                rel="noopener"
              >
                <div class="card-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 13h8M8 17h4M8 9h8" />
                  </svg>
                </div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                {#if item.associatedLink}
                  <button 
                    type="button"
                    class="link-btn"
                    on:click|stopPropagation={() => openLink(item.associatedLink!)}
                  >
                    Associated Link
                  </button>
                {/if}
              </a>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Launcher Real Content -->
      {#if launcherItems.length > 0}
        <section class="systems-section">
          <div class="section-header">
            <h2>System Launcher</h2>
            <p>Start new company processes</p>
          </div>
          <div class="cards-grid compact">
            {#each launcherItems as item}
              <button 
                type="button"
                class="dashboard-card"
                on:click={() => openLink(item.url)}
              >
                <div class="card-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3M8 7H5a5 5 0 0 0-5 5 5 5 0 0 0 5 5h3" />
                    <line x1="12" y1="7" x2="12" y2="17" />
                  </svg>
                </div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                {#if item.associatedLink}
                  <button 
                    type="button"
                    class="link-btn"
                    on:click|stopPropagation={() => openLink(item.associatedLink!)}
                  >
                    Associated Link
                  </button>
                {/if}
              </button>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
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
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
  /* ===== SKELETON LOADER ===== */
.skeleton-card {
  background: #f5f5f5 !important;
  cursor: default !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05) !important;
}

:global(body.dark) .skeleton-card {
  background: #2a2a2a !important;
}

.skeleton-card .card-icon {
  background: #e0e0e0;
  border-radius: 4px;
  width: 18px;
  height: 18px;
}

:global(body.dark) .skeleton-card .card-icon {
  background: #444;
}

.skeleton-line {
  background: #e0e0e0;
  border-radius: 4px;
  margin: 8px 0;
  height: 14px;
  animation: pulse 1.5s infinite ease-in-out;
}

:global(body.dark) .skeleton-line {
  background: #444;
}

.skeleton-line.short { width: 60%; }
.skeleton-line.long { width: 100%; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
  /* ===== LOGIN VIEW ===== */
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
    background: linear-gradient(135deg, #f8f9fa 0%, #edf2ff 100%);
  }

  .login-card {
    background: white;
    border-radius: 16px;
    padding: 32px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    text-align: center;
    position: relative;
  }

  :global(body.dark) .login-card {
    background: #1e1e1e;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .login-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #4caf50, #2196f3);
    border-radius: 16px 16px 0 0;
  }

  .logo {
    margin-bottom: 20px;
    color: #4caf50;
  }

  :global(body.dark) .logo {
    color: #66bb6a;
  }

  .login-card h1 {
    font-size: 1.75rem;
    font-weight: 600;
    margin: 0 0 8px;
  }

  .login-subtitle {
    color: #666;
    margin: 0 0 24px;
    font-size: 1rem;
  }

  :global(body.dark) .login-subtitle {
    color: #aaa;
  }

  .input-group {
    text-align: left;
    margin-bottom: 18px;
  }

  .input-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    font-size: 0.9rem;
    color: #333;
  }

  :global(body.dark) .input-group label {
    color: #ccc;
  }

  .login-card input {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    background: #fafafa;
    color: #1f1f1f;
  }

  :global(body.dark) .login-card input {
    background: #2a2a2a;
    border-color: #444;
    color: #e0e0e0;
  }

  .login-card input:focus {
    outline: none;
    border-color: #4caf50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }

  .error-alert {
    background: #ffebee;
    color: #c62828;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 0.95rem;
  }

  :global(body.dark) .error-alert {
    background: #421c1c;
    color: #ffcdd2;
  }

  .login-card button {
    width: 100%;
    padding: 12px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 8px;
  }

  .login-card button:hover:not(:disabled) {
    background: #45a049;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
  }

  .login-card button:disabled {
    opacity: 0.8;
    cursor: not-allowed;
  }

  .help-text {
    margin-top: 20px;
    color: #888;
    font-size: 0.85rem;
  }

  :global(body.dark) .help-text {
    color: #999;
  }

  /* ===== DASHBOARD VIEW ===== */
  .dashboard-home {
    max-width: 900px;
    margin: 0 auto;
    padding: 32px 16px;
  }

  .hero {
    text-align: center;
    margin-bottom: 28px;
  }

  .hero h1 {
    font-size: 2rem;
    font-weight: 600;
    margin: 0 0 10px;
    letter-spacing: -0.02em;
  }

  .subtitle {
    color: #666;
    font-size: 1rem;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.5;
  }

  :global(body.dark) .subtitle {
    color: #aaa;
  }

  .user-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px;
    background: #f8f9fa;
    border-radius: 12px;
    margin-bottom: 32px;
    font-size: 0.95rem;
  }

  :global(body.dark) .user-bar {
    background: #2a2a2a;
  }

  .btn.logout {
    background: #f8f9fa;
    color: #d32f2f;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }

  .btn.logout:hover {
    background: #e9ecef;
  }

  :global(body.dark) .btn.logout {
    background: #2a2a2a;
    color: #ff6b6b;
  }

  :global(body.dark) .btn.logout:hover {
    background: #333;
  }

  .systems-section {
    margin-bottom: 36px;
  }

  .section-header {
    margin-bottom: 20px;
  }

  .section-header h2 {
    font-size: 1.35rem;
    font-weight: 600;
    margin: 0 0 6px;
  }

  .section-header p {
    color: #666;
    margin: 0;
    font-size: 0.95rem;
  }

  :global(body.dark) .section-header p {
    color: #aaa;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
  }

  .cards-grid.compact {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }

  .dashboard-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.2s ease;
    position: relative;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    min-height: 140px;
  }

  .dashboard-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  :global(body.dark) .dashboard-card {
    background: #1e1e1e;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  :global(body.dark) .dashboard-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .card-icon {
    color: #4caf50;
    margin-bottom: 14px;
    display: flex;
  }

  :global(body.dark) .card-icon {
    color: #66bb6a;
  }

  .dashboard-card h2,
  .dashboard-card h3 {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 10px;
  }

  .dashboard-card p {
    color: #666;
    font-size: 0.95rem;
    line-height: 1.5;
    margin: 0 0 14px;
    flex: 1;
  }

  :global(body.dark) .dashboard-card p {
    color: #aaa;
  }

  .link-btn {
    background: #f8f9fa;
    color: #444;
    border: none;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s;
    width: 100%;
    text-align: center;
    font-weight: 500;
  }

  .link-btn:hover {
    background: #e9ecef;
  }

  :global(body.dark) .link-btn {
    background: #2a2a2a;
    color: #ddd;
  }

  :global(body.dark) .link-btn:hover {
    background: #333;
  }

  .status-text,
  .empty-state {
    text-align: center;
    padding: 32px 20px;
    color: #666;
    font-size: 0.95rem;
  }

  :global(body.dark) .status-text,
  :global(body.dark) .empty-state {
    color: #aaa;
  }

  .status-text.error {
    color: #f44336;
  }

  :global(body.dark) .status-text.error {
    color: #ff6b6b;
  }

  .empty-state {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    margin: 32px 0;
  }

  :global(body.dark) .empty-state {
    background: #1e1e1e;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }

  .empty-icon {
    margin-bottom: 18px;
    color: #666;
  }

  :global(body.dark) .empty-icon {
    color: #888;
  }

  .empty-state h2 {
    font-size: 1.35rem;
    margin: 0 0 12px;
    font-weight: 600;
  }

  .footer {
    text-align: center;
    color: #888;
    font-size: 0.85rem;
    padding-top: 20px;
    margin-top: 20px;
    border-top: 1px solid #eee;
  }

  :global(body.dark) .footer {
    border-top-color: #333;
    color: #aaa;
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 600px) {
    .dashboard-home {
      padding: 24px 12px;
    }

    .hero h1 {
      font-size: 1.75rem;
    }

    .user-bar {
      flex-direction: column;
      gap: 10px;
      text-align: center;
    }

    .cards-grid,
    .cards-grid.compact {
      grid-template-columns: 1fr;
    }
  }
</style>