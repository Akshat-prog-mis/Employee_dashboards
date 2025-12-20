<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { authenticate, saveAuth, getAuthUser, getEmployeeName } from '$lib/auth.js';
  import { goto } from '$app/navigation';
  import { fetchSystems } from '$lib/api.js';

  // Auth state
  let email = "";
  let password = "";
  let error = "";
  let loading = false;
  let authenticated = false;

  // Systems state
  let launcherItems = [];
  let mySystemItems = [];
  let systemsLoading = false;
  let systemsError = "";

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

  function handleKeyDown(e) {
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
      systemsError = "⚠️ Failed to load systems";
    } finally {
      systemsLoading = false;
    }
  }

  function openLink(url) {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }
</script>

{#if authenticated}
  <div class="dashboard-home">
    <div class="hero">
      <h1>🎯 Welcome Home</h1>
      <p class="subtitle">Your centralized workspace for all company systems</p>
    </div>

    <div class="user-bar">
      <span>👋 Hello, <strong>{getEmployeeName()}</strong></span>
      <button class="btn logout" on:click={handleLogout}>Sign out</button>
    </div>

    <div class="cards-grid">
      <a href="/tasks" class="dashboard-card">
        <div class="card-icon">🧾</div>
        <h2>My Due Tasks</h2>
        <p>Internal task management with instant completion.</p>
        <div class="card-arrow">→</div>
      </a>

      <a href="/bis-tasks" class="dashboard-card">
        <div class="card-icon">📊</div>
        <h2>BIS Due Tasks</h2>
        <p>Complete FMS-linked tasks via Google Forms.</p>
        <div class="card-arrow">→</div>
      </a>
    </div>

    <!-- My System Section -->
    {#if mySystemItems.length > 0}
      <section class="systems-section">
        <div class="section-header">
          <h2>🖥️ My System</h2>
          <p>Tools and dashboards you're involved in</p>
        </div>
        <div class="cards-grid">
          {#each mySystemItems as item}
            <a 
              href={item.url} 
              class="dashboard-card system-card"
              target="_blank"
              rel="noopener"
            >
              <div class="card-icon">📊</div>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              {#if item.associatedLink}
                <span 
                  role="button"
                  tabindex="0"
                  class="associated-link-btn"
                  on:click|stopPropagation={(e) => openLink(item.associatedLink)}
                  on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openLink(item.associatedLink);
                    }
                  }}
                >
                  Associated Link
                </span>
              {/if}
              <div class="card-arrow">→</div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- System Launcher Section -->
    {#if launcherItems.length > 0}
      <section class="systems-section">
        <div class="section-header">
          <h2>🚀 System Launcher</h2>
          <p>Start new company processes</p>
        </div>
        <div class="cards-grid">
          {#each launcherItems as item}
            <button 
              type="button"
              class="dashboard-card system-card launcher"
              on:click={() => openLink(item.url)}
              aria-label={`Start ${item.name}`}
            >
              <div class="card-icon">📝</div>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              {#if item.associatedLink}
                <span 
                  role="button"
                  tabindex="0"
                  class="associated-link-btn"
                  on:click|stopPropagation={(e) => openLink(item.associatedLink)}
                  on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openLink(item.associatedLink);
                    }
                  }}
                >
                  Associated Link
                </span>
              {/if}
              <div class="card-arrow">→</div>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    {#if systemsLoading}
      <div class="loading-state">Loading your systems...</div>
    {:else if systemsError}
      <div class="error-state systems-error">{systemsError}</div>
    {:else if launcherItems.length === 0 && mySystemItems.length === 0}
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h2>No systems assigned</h2>
        <p>Contact your admin to get access to company systems.</p>
      </div>
    {/if}

    <footer class="footer">
      <p>© {new Date().getFullYear()} TaskHub • Secure internal dashboard</p>
    </footer>
  </div>
{:else}
  <!-- Login View (unchanged) -->
  <div class="login-container">
    <div class="login-card">
      <div class="logo-badge">🔐</div>
      <h1>TaskHub</h1>
      <p class="login-subtitle">Sign in to your operational dashboard</p>

      {#if error}
        <div class="error-alert" role="alert">
          <span>⚠️</span> {error}
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
            class="input-field"
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
            class="input-field"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          class="btn-login"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p class="help-text">
        ℹ️ Contact IT for credentials
      </p>
    </div>
  </div>
{/if}

<style>
  /* ===== EXISTING LOGIN STYLES (unchanged) ===== */
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4edf9 100%);
    padding: 20px;
  }

  .login-card {
    background: white;
    border-radius: 20px;
    padding: 40px;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .login-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #4CAF50, #2196F3);
  }

  /* ✅ FIXED: Button reset for launcher cards */
  .dashboard-card.system-card {
    /* Reset button styles */
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    font: inherit;
    color: inherit;
    cursor: pointer;
    width: 100%;
    /* Keep your existing styles */
    background: white;
    border-radius: 18px;
    padding: 28px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  :global(body.dark) .dashboard-card.system-card {
    background: #1e1e1e;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  .logo-badge {
    font-size: 2.8rem;
    margin-bottom: 16px;
  }

  .login-card h1 {
    font-size: 2.1rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 8px;
  }

  .login-subtitle {
    color: #666;
    margin: 0 0 28px;
    font-size: 1.05rem;
  }

  .input-group {
    text-align: left;
    margin-bottom: 20px;
  }

  .input-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
    font-size: 0.95rem;
  }

  .input-field {
    width: 100%;
    padding: 14px 16px;
    border: 1px solid #ddd;
    border-radius: 10px;
    font-size: 1rem;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .input-field:focus {
    outline: none;
    border-color: #4CAF50;
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.15);
  }

  .error-alert {
    background: #fff8f8;
    border: 1px solid #ffd2d2;
    color: #d32f2f;
    padding: 14px;
    border-radius: 10px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
  }

  .btn-login {
    width: 100%;
    padding: 14px;
    background: linear-gradient(to right, #4CAF50, #2E7D32);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s ease;
    margin-top: 8px;
  }

  .btn-login:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }

  .btn-login:disabled {
    opacity: 0.8;
    cursor: not-allowed;
  }

  .help-text {
    margin-top: 24px;
    color: #888;
    font-size: 0.9rem;
  }

  /* ===== DASHBOARD VIEW ===== */
  .dashboard-home {
    max-width: 1000px;
    margin: 0 auto;
    padding: 40px 24px;
  }

  .hero {
    text-align: center;
    margin-bottom: 32px;
  }

  .hero h1 {
    font-size: 2.5rem;
    font-weight: 800;
    background: linear-gradient(90deg, #1a1a1a, #444);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 12px;
  }

  .subtitle {
    color: #666;
    font-size: 1.2rem;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.5;
  }

  .user-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: #f8f9fa;
    border-radius: 16px;
    margin-bottom: 32px;
    font-size: 1.05rem;
  }

  :global(body.dark) .user-bar {
    background: #2a2a2a;
  }

  .logout {
    background: #f1f1f1;
    color: #d32f2f;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .logout:hover {
    background: #e0e0e0;
  }

  :global(body.dark) .logout {
    background: #3a3a3a;
    color: #ff6b6b;
  }

  :global(body.dark) .logout:hover {
    background: #444;
  }

  .systems-section {
    margin-bottom: 48px;
  }

  .section-header {
    margin-bottom: 24px;
  }

  .section-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 8px;
    color: #1a1a1a;
  }

  :global(body.dark) .section-header h2 {
    color: #e0e0e0;
  }

  .section-header p {
    color: #666;
    margin: 0;
  }

  :global(body.dark) .section-header p {
    color: #aaa;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 28px;
    margin-bottom: 40px;
  }

  .dashboard-card {
    background: white;
    border-radius: 18px;
    padding: 32px;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    cursor: pointer;
  }

  .dashboard-card.system-card {
    padding: 28px;
  }

  .dashboard-card.launcher {
    border-left: 4px solid #2196F3;
  }

  .dashboard-card:not(.launcher) {
    border-left: 4px solid #4CAF50;
  }

  :global(body.dark) .dashboard-card {
    background: #1e1e1e;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  .dashboard-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  }

  .card-icon {
    font-size: 2.4rem;
    margin-bottom: 20px;
  }

  .dashboard-card h2 {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0 0 14px;
    color: #1a1a1a;
  }

  :global(body.dark) .dashboard-card h2 {
    color: #e0e0e0;
  }

  .dashboard-card p {
    color: #666;
    line-height: 1.6;
    margin: 0 0 20px;
    font-size: 1.02rem;
  }

  :global(body.dark) .dashboard-card p {
    color: #bbb;
  }

  /* ✅ FIXED: Associated Link as span with button role */
  .associated-link-btn {
    display: inline-block;
    background: #f8f9fa;
    color: #333;
    border: none;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    cursor: pointer;
    width: 100%;
    margin-top: 8px;
    transition: all 0.2s;
    text-align: center;
  }

  .associated-link-btn:hover {
    background: #e9ecef;
  }

  :global(body.dark) .associated-link-btn {
    background: #2a2a2a;
    color: #ddd;
  }

  :global(body.dark) .associated-link-btn:hover {
    background: #333;
  }

  .card-arrow {
    position: absolute;
    bottom: 24px;
    right: 24px;
    font-size: 1.5rem;
    color: #4CAF50;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .dashboard-card:hover .card-arrow {
    opacity: 1;
  }

  .loading-state,
  .error-state,
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #666;
  }

  :global(body.dark) .loading-state,
  :global(body.dark) .error-state,
  :global(body.dark) .empty-state {
    color: #aaa;
  }

  .systems-error {
    margin-bottom: 32px;
  }

  .empty-state {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    margin-bottom: 40px;
  }

  :global(body.dark) .empty-state {
    background: #1e1e1e;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 20px;
    color: #666;
  }

  :global(body.dark) .empty-icon {
    color: #aaa;
  }

  .empty-state h2 {
    font-size: 1.6rem;
    margin: 0 0 16px;
    color: #222;
  }

  :global(body.dark) .empty-state h2 {
    color: #fff;
  }

  .footer {
    text-align: center;
    color: #888;
    font-size: 0.95rem;
    padding-top: 20px;
    border-top: 1px solid #eee;
  }

  :global(body.dark) .footer {
    border-top-color: #333;
    color: #aaa;
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .login-card {
      padding: 30px 24px;
    }

    .dashboard-home {
      padding: 24px 16px;
    }

    .hero h1 {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1.05rem;
    }

    .user-bar {
      flex-direction: column;
      gap: 12px;
      text-align: center;
    }

    .cards-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .login-card {
      padding: 24px 20px;
    }

    .hero h1 {
      font-size: 1.8rem;
    }
  }
</style>