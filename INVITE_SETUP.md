# Aquaverse Reports — Invite-only account setup

**Goal:** Sascha/admin enters an email in Supabase > Authentication > Users > Send invitation; the person receives an email, opens Set Password, chooses a password, then signs in on the existing dashboard.

This adds **no public Sign Up button** and does not change `index.html`, the existing login gate, report files, or n8n.

## 1. Deploy the Set Password page

Review and merge the draft PR only when ready. After GitHub Pages has published the change, verify that this URL opens the page (without an invitation, it should show an informational error):

https://sascha-gerteis.github.io/automated-reports/set-password.html

## 2. Configure the **Invite user** email template

In **Supabase Project Qrcode > Authentication > Emails > Templates > Invite user**, replace the invitation **link only** with this URL:

```html
<a href="https://sascha-gerteis.github.io/automated-reports/set-password.html#token_hash={{ .TokenHash }}&amp;type=invite">
  Accept invitation and set password
</a>
```

An example complete template:

```html
<h2>You've been invited to Aquaverse Reports</h2>
<p>An administrator has invited you to view the reports dashboard.</p>
<p><a href="https://sascha-gerteis.github.io/automated-reports/set-password.html#token_hash={{ .TokenHash }}&amp;type=invite">Accept invitation and set password</a></p>
<p>If you did not request access, you can ignore this email.</p>
```

The template uses `{{ .TokenHash }}`, a Supabase-defined template variable for invitation verification. The URL fragment keeps the token out of the initial HTTP request. The page also accepts Supabase's standard `?token_hash=...&type=invite` form.

**Important:** Qrcode is an existing production Supabase project. Its Invite user template is shared across its uses. Check with Sascha that changing invitation links for the entire Qrcode project will not affect its existing applications. **Do not change the project's Site URL** to Aquaverse unless its other uses have been reviewed.

## 3. Configure email delivery for external recipients

The warning in **Authentication > Emails > SMTP Settings** is real: Supabase's default mail service only sends to pre-authorized addresses belonging to the Supabase project team and has strict rate limits. To invite arbitrary external users, an administrator must configure **custom SMTP** from an approved email service. Keep SMTP credentials in Supabase only, not in GitHub or front-end JavaScript.

## 4. Invite and test

1. Choose a **new** test email address that the team owns and can read. Inviting an already confirmed user is not supported by this flow.
2. Sascha opens **Authentication > Users > Add user > Send invitation** and enters it.
3. Open the new email, select **Accept invitation and set password**.
4. The URL should open `set-password.html`. If it says invalid/expired/used, request a new invite and verify the email template.
5. Create and confirm an 8+ character password.
6. Select **Go to sign in**, sign in using the new email and password, verify dashboard and Logout.

**Do not publish or forward an actual invitation link:** it contains a one-use credential. Do not test real invitation URLs in browser previews or screenshots.

## Limitations

This is the same client-side login gate as version 1. Files such as `social.html` and `ads.html` remain publicly accessible by direct URL on GitHub Pages. The login gate currently accepts any successfully authenticated user in the existing Qrcode project; it does not separately enforce a dashboard-specific invited-users allowlist. This invitation flow adds onboarding, not server-side authorization.

Supabase docs:
- https://supabase.com/docs/guides/auth/users
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/reference/javascript/auth-verifyotp
- https://supabase.com/docs/reference/javascript/auth-updateuser
