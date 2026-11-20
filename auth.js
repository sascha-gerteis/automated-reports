"use strict";
// Simple client-side login gate for the existing GitHub Pages overview.
// This hides the overview until Supabase Auth succeeds. It DOES NOT protect
// direct public report URLs (social.html, inquiry.html, etc.) on GitHub Pages.
(function () {
  const screen = document.getElementById("auth-screen");
  const shell = document.querySelector(".app-shell");
  const form = document.getElementById("auth-login-form");
  const loading = document.getElementById("auth-loading");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const errorBox = document.getElementById("auth-error");
  const submit = document.getElementById("auth-submit");
  const logout = document.getElementById("auth-logout");
  const userLabel = document.getElementById("auth-user");

  let client = null;
  let dashboardLoaded = false;

  function errorMessage(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  function showLogin(message) {
    shell.hidden = true;
    screen.hidden = false;
    loading.hidden = true;
    form.hidden = false;
    errorMessage(message || "");
  }

  function showSetupError(message) {
    shell.hidden = true;
    screen.hidden = false;
    form.hidden = true;
    loading.hidden = false;
    loading.textContent = message;
  }

  function showDashboard(email) {
    userLabel.textContent = email || "";
    screen.hidden = true;
    shell.hidden = false;
    errorMessage("");
    // Do not fetch/render any dashboard data until a login succeeds.
    if (!dashboardLoaded) {
      dashboardLoaded = true;
      const script = document.createElement("script");
      script.src = "dashboard.js";
      script.onerror = function () {
        shell.hidden = true;
        showSetupError("Could not load the dashboard. Please refresh the page.");
      };
      document.body.appendChild(script);
    }
  }

  async function initialize() {
    const cfg = window.AQUAVERSE_AUTH_CONFIG;
    if (!cfg || typeof cfg.url !== "string" ||
        !cfg.url.startsWith("https://") ||
        cfg.url.includes("PASTE_") ||
        !cfg.publishableKey || cfg.publishableKey.includes("PASTE_")) {
      showSetupError("Login is not configured yet. Add the Supabase Project URL and Publishable Key to auth-config.js.");
      return;
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      showSetupError("The Supabase library could not load. Check your internet connection.");
      return;
    }
    try {
      client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
        // Keep the login across refreshes within this tab, but not after closing it.
        auth: {
          storage: window.sessionStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      // Hide the dashboard if Supabase reports that the user signed out.
      client.auth.onAuthStateChange(function (event) {
        if (event === "SIGNED_OUT" && screen.hidden) {
          window.location.reload();
        }
      });
      const result = await client.auth.getUser();
      if (result.error || !result.data || !result.data.user) {
        showLogin();
        return;
      }
      showDashboard(result.data.user.email);
    } catch (error) {
      showLogin("Unable to connect to Supabase. Check your connection and try again.");
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!client) return;
    errorMessage("");
    submit.disabled = true;
    submit.textContent = "Signing in…";
    try {
      const result = await client.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passwordInput.value
      });
      if (result.error) throw result.error;
      if (!result.data || !result.data.user || !result.data.session) {
        throw new Error("The account could not be signed in. Check your email confirmation.");
      }
      passwordInput.value = "";
      showDashboard(result.data.user.email);
    } catch (error) {
      errorMessage(error.message || "Unable to sign in. Please check your credentials.");
    } finally {
      submit.disabled = false;
      submit.textContent = "Sign in";
    }
  });

  logout.addEventListener("click", async function () {
    if (!client) return;
    logout.disabled = true;
    try {
      const result = await client.auth.signOut();
      if (result.error) throw result.error;
      // Reload to clear the previous report DOM and any in-memory dashboard data.
      window.location.reload();
    } catch (error) {
      logout.disabled = false;
      window.alert("Could not sign out. Please retry.");
    }
  });

  initialize();
})();
