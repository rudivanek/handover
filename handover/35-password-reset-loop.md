# Password Reset Loop

## The bug

The password reset page (`app/reset-password/page.tsx`) had two forms gated on `hasRecoverySession`: the email-request form and the set-new-password form. The gate was wrong.

It called `supabase.auth.getSession()` and then required:

```js
new URL(window.location.href).searchParams.get('type') === 'recovery'
```

That was never true. The Supabase client in `lib/supabase.ts` uses the implicit flow, so Supabase returns the recovery result in the URL hash (`#access_token=…&type=recovery`), not the query string. And `detectSessionInUrl: true` — set on the client at module import — consumes and strips that hash before this component mounts. Reading `window.location` from the component cannot work.

The page always fell through to the email-request form, even after clicking a valid recovery link. The user looped back to "enter your email" instead of seeing "Set a new password."

This is the same family as the sectionNumber 0 bug: a state the page couldn't determine, defaulting silently to a plausible-looking wrong screen.

## The fix

All changes are in `app/reset-password/page.tsx` and the two locale files. No migration, no schema change, no grants, no RLS.

### Primary detection — auth event

The component's first effect now subscribes to `supabase.auth.onAuthStateChange` and sets `hasRecoverySession` to true when the event is `PASSWORD_RECOVERY`. The subscription is unsubscribed on unmount. The auth event is the reliable signal with the implicit flow — the hash is gone, but the event still fires.

### Fallback — existing session

The effect also calls `getSession()` and, if a session exists, shows the set-password form. This covers two cases:

1. The recovery event fired before the subscription existed (the client was created on module import, the event may have already been dispatched).
2. A signed-in user visits `/reset-password` to change their password. This is intended — the app has no other way to change a password.

### Error state — expired or used link

An expired or already-used link comes back as `#error=…&error_description=…`. The hash is captured once at module scope, at import time, before the Supabase client strips it:

```js
const initialHash = typeof window !== 'undefined' ? window.location.hash : '';
function parseHashError(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.get('error');
}
const linkError = parseHashError(initialHash);
```

If `linkError` is set, the page renders a third state: a short message that the link has expired or has already been used, and a button to request a new one. The button clears `expiredLink`, `sent`, and `error`, returning the page to its normal email-request form.

### What was removed

The `searchParams.get('type')` check and the `recovery_sent_at` / `aud === 'authenticated'` condition. The `searchParams` check was the root cause; the session conditions were redundant with the new fallback.

## Locale keys added

Added to both `locales/en.json` and `locales/es.json` alongside the existing `reset.*` keys:

| Key | English | Spanish |
|-----|---------|---------|
| `reset.expiredTitle` | This link has expired | Este enlace ha expirado |
| `reset.expiredDescription` | This password reset link is no longer valid. | Este enlace de restablecimiento ya no es válido. |
| `reset.expiredMessage` | This link has expired or has already been used. Request a new one and we'll send a fresh link to your email. | Este enlace ha expirado o ya fue usado. Solicita uno nuevo y te enviaremos un enlace fresco a tu correo. |
| `reset.requestNewLink` | Request a new link | Solicitar un nuevo enlace |

## Not changed

- `lib/supabase.ts` — flow type, `detectSessionInUrl`, everything.
- The `redirectTo` in `handleRequest` (`https://app.handover.agency/reset-password`).
- The existing `reset.*` keys.
- The `updateUser` call.
- The redirect to `/manuals` after a successful update.
- The login page.
- Anything outside `app/reset-password/page.tsx` and the two locale files.

## Verification

Requested as a real user, not from the build:

1. Request a reset from the login page.
2. Click the emailed link.
3. Confirm the page shows "Set a new password" (not the email-request form).
4. Set a new password, land on `/manuals`.
5. Sign out, sign back in with the new password — confirm it works.
6. Click the same recovery link again.
7. Confirm the expired/used message appears rather than the email form.

I could not run the in-browser verification (the dev server was unavailable in this session). The code changes match the spec and the production build compiles cleanly.
