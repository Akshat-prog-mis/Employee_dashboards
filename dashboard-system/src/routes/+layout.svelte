<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';
  
  let user_email = "";
  let isSettingEmail = false;

  onMount(() => {
    user_email = localStorage.getItem("user_email") || "";
  });

  function saveEmail() {
    const input = document.getElementById("email-input");
    const email = input?.value.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      alert("❌ Please enter a valid work email.");
      return;
    }
    localStorage.setItem("user_email", email);
    user_email = email;
    isSettingEmail = false;
  }
</script>

<main style="max-width: 1000px; margin: 0 auto; padding: 20px;">
  {#if !user_email}
    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <strong>🔐 Enter your work email to continue:</strong>
      <input
        id="email-input"
        type="email"
        placeholder="name@company.com"
        style="margin: 8px 8px 8px 0; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px;"
      />
      <button
        on:click={saveEmail}
        style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;"
      >
        Save
      </button>
    </div>
  {:else}
    <div style="background: #e8f5e8; padding: 12px; border-radius: 6px; margin-bottom: 24px; font-size: 0.9em;">
      ✅ Logged in as: <strong>{user_email}</strong>
      <button
        on:click={() => {
          localStorage.removeItem("user_email");
          user_email = "";
        }}
        style="margin-left: 12px; font-size: 0.85em; color: #d32f2f; background: none; border: none; cursor: pointer;"
      >
        Logout
      </button>
    </div>
  {/if}

  <slot />
</main>