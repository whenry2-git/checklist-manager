# Checklist Manager — Cloud Version 1 (standard Supabase confirmation email)

This package uses the normal Supabase confirmation email. No custom SMTP and no email-template changes are required.

## Supabase URL Configuration

Site URL:

https://whenry2-git.github.io/checklist-manager/

Allowed Redirect URL:

https://whenry2-git.github.io/checklist-manager/

The app explicitly sends this same URL as `emailRedirectTo` during signup and resend.

Supabase documents that `emailRedirectTo` must match an allowed Redirect URL, and the Site URL is the default redirect when no redirect is supplied.

## Deploy

Replace the existing `index.html` in the root of your GitHub Pages repository:

`whenry2-git/checklist-manager`

Commit it to `main`.

Do not change the database SQL.

## Test

1. Wait until the current Supabase email rate limit has cleared.
2. Open the GitHub Pages site.
3. Use the existing unconfirmed account or create one if needed.
4. Request one confirmation email.
5. Click the confirmation link.
6. It should return to:
   https://whenry2-git.github.io/checklist-manager/
7. The app should recognize the authenticated session and show the checklist interface.

The login screen also includes "Resend confirmation email".

## Important

Do not put a Supabase secret/service_role key in the browser. The supplied publishable key is the browser key.
