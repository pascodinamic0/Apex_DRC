# Supabase Auth — redirect URLs for password reset

Add these URLs in **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**:

- `http://localhost:5173/reset-password` (local dev)
- Your production origin + `/reset-password` (e.g. `https://your-app.workers.dev/reset-password`)

Site URL should match your primary app origin.

Customize the **Reset password** email template (FR/EN) as needed.
