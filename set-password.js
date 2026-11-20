"use strict";
/*
 * Aquaverse invite-only registration.
 * Supabase Dashboard > Authentication > Users > Send invitation.
 * The Invite user email template links to:
 * https://sascha-gerteis.github.io/automated-reports/set-password.html#token_hash={{ .TokenHash }}&type=invite
 *
 * IMPORTANT: This page never offers public signUp and never uses a secret key.
 */
(function () {
  const status = document.getElementById("setup-status");
  const errorBox = document.getElementById("setup-error");
  const form = document.getElementById("auth-login-form");
  const emailLabel = document.getElementById("setup-email");
  const passwordInput = document.getElementById("setup-password");
  const confirmInput = document.getElementById("setup-confirm");
  const submitButton = document.getElementById("auth-submit");
  const completed = document.getElementById("setup-success");
  let client;

  function fail(message) {
    status.hidden = true;
    form.hidden = true;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  async function initialize() {
    const config = window.AQUAVERSE_AUTH_CONFIG;
    if (!config || !/^https:\/\//.test(config.url || "") ||
        !config.publishableKey || config.url.includes("PASTE_") ||
        config.publishableKey.includes("PASTE_")) {
      fail("The password page is not configured yet. Please contact the administrator.");
      return;
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      fail("Unable to load the authentication service. Please try again later.");
      return;
    }

    // Invitation links can use a URL fragment (preferred, keeps the token out of
    // the server request) or a query string as in Supabase's examples.
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(location.search);
    const tokenHash = hash.get("token_hash") || query.get("token_hash");
    const type = hash.get("type") || query.get("type");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const hasInvite = type === "invite" && (tokenHash || (accessToken && refreshToken));
    if (!hasInvite) {
      fail("This page requires a valid invitation link. Open the invitation email sent by your administrator.");
      return;
    }

    // Clear the one-time token from browser history immediately.
    history.replaceState(null, "", location.pathname);

    try {
      client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          storage: window.sessionStorage,
          storageKey: "aquaverse-invite-session",
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      });

      // Custom invitation template: verify the invite token on this page.
      // Standard Supabase redirect: accept a short-lived invite session.
      const result = tokenHash
        ? await client.auth.verifyOtp({ token_hash: tokenHash, type: "invite" })
        : await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

      if (result.error || !result.data || !result.data.user || !result.data.session) {
        throw new Error("This invitation is invalid, expired, or has already been used. Ask your administrator for a new invitation.");
      }

      emailLabel.textContent = "Account: " + (result.data.user.email || "Invited user");
      status.hidden = true;
      form.hidden = false;
      passwordInput.focus();
    } catch (error) {
      fail(error.message || "Could not verify the invitation. Please request another invitation.");
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!client) return;
    errorBox.hidden = true;
    const password = passwordInput.value;
    if (password.length < 8) {
      errorBox.textContent = "Please use a password with at least 8 characters.";
      errorBox.hidden = false;
      return;
    }
    if (password !== confirmInput.value) {
      errorBox.textContent = "The passwords do not match. Please try again.";
      errorBox.hidden = false;
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Saving password…";
    try {
      const result = await client.auth.updateUser({ password });
      if (result.error) throw result.error;
      passwordInput.value = "";
      confirmInput.value = "";

      // Clear the invitation session so the user must sign in normally.
      const out = await client.auth.signOut({ scope: "local" });
      if (out.error) throw out.error;

      form.hidden = true;
      status.hidden = true;
      completed.hidden = false;
    } catch (error) {
      errorBox.textContent = error.message || "Could not save the password. Please try again.";
      errorBox.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Create password";
    }
  });

  initialize();
})();
