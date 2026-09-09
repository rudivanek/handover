# Login and Signup Session/Error Handling

## Signup session branching

`app/login/page.tsx` previously treated every successful `supabase.auth.signUp` result as if email confirmation were required. That always showed the "Check your email" screen, including when email confirmation was disabled and Supabase returned a live session. In that case the screen was a dead end and offered a Resend action for an email that had never been sent.

The page now inspects the returned `data.session`:

- If `data.session` is present, the user is already signed in and the page routes to `/manuals` using the same route as the sign-in path. This lets `lib/auth-context.tsx` run its existing profile-row creation on the established session.
- If `data.session` is null, the existing confirmation state renders exactly as before, with the email address, expiry copy, Resend action, and 60-second client-side countdown.

The page does not inspect an auth setting or environment variable. It is correct whether email confirmation is currently off or turned on later.

## Sign-in and signup errors

Both authentication flows now log the real Supabase error object with `console.error` before showing a user-facing message.

### Rate limits

HTTP 429 responses and the known rate-limit codes `over_request_rate_limit` and `rate_limit_exceeded` show a specific message telling the user there have been too many attempts and to wait a few minutes. The message does not tell the user to immediately try again.

### Duplicate signup

Signup errors with the known duplicate-account codes `user_already_exists` or `email_exists` show a neutral message: the email may already have an account, so the user should try signing in. This does not confirm that the address exists. The page also switches back to the Sign in tab. If Supabase supplies no error code, the existing message fallback checks the error text for equivalent duplicate wording.

### All other errors

Other signup errors continue using the existing neutral `login.signupError` message. Other sign-in errors continue using the existing neutral `login.invalidCredentials` message that the email and password do not match.

## Locale strings

Added to both locale files:

- `login.rateLimited`: rate-limit message
- `login.alreadyRegistered`: neutral duplicate-account message

## Not changed

- No migration, SQL, schema, grant, or RLS policy was created or modified.
- `lib/supabase.ts` and its flow type were untouched.
- `lib/auth-context.tsx` and its idempotent profile-row creation were untouched.
- `app/reset-password/page.tsx` was untouched.
- The `redirectTo` URL, update-password flow, login page fields, agency name field, eight-character password hint, no-confirm-password design, and Resend countdown remain unchanged.
