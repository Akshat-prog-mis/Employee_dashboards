<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { authenticate, saveAuth, getAuthUser, getEmployeeName } from '$lib/auth.js';
  import { goto } from '$app/navigation';
  import { fetchSystems } from '$lib/api.js';
  import './page.css'

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
        <p>Daily task management .</p>
        <div class="card-arrow">→</div>
      </a>

      <a href="/bis-tasks" class="dashboard-card">
        <div class="card-icon">📊</div>
        <h2>BIS Due Tasks</h2>
        <p>Complete your Due tasks. </p>
        <div class="card-arrow">→</div>
      </a>

      <a href="/internal-delegation" class="dashboard-card">
        <div class="card-icon">👥</div>
        <h2>Internal  Delegation</h2>
        <p>Assgin or complete Task</p>
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
      <h1>Employee Dashboard</h1>
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

