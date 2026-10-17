# Connecting Supabase

Accounts, collections, Movie Night rooms and SceneAtlas data all live in one Supabase project. Until it is connected, VieMo keeps working on this device only and the account pages say so.

You need a Supabase project and access to the VieMo project in Vercel. Supabase's dashboard moves things around now and then, so a menu name below may differ slightly.

## 1. Create the tables

In Supabase, open **SQL Editor**. Paste each file below into a new query and run it, one at a time, in this order:

1. `supabase/migrations/20261018000001_foundation.sql` (films, profiles, follows)
2. `supabase/migrations/20261018000002_library.sql` (watchlist, diary, collections)
3. `supabase/migrations/20261018000003_sceneatlas.sql` (filming locations and their sources)
4. `supabase/migrations/20261019000004_screening_activity.sql` (Screening Activity: daily totals and who can see them)

Each one should end with "Success. No rows returned". Run each file once only. If one fails, stop and send the error text, not the keys.

If you use the Supabase CLI instead, `supabase db push` runs them in order.

Every table has row level security switched on, and the default access Supabase gives the public API is removed. Each policy in those files is the only way in. The same files pass 93 checks locally (`supabase/tests/local/run.sh`), signed in as three different accounts and signed out.

## 2. Add the keys in Vercel

In Supabase, open **Project Settings → API** (or **API Keys**). In Vercel, open the project's **Settings → Environment Variables**. Add these for Production and Preview:

| What | Name in Vercel | Notes |
| --- | --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | `SUPABASE_URL` also works |
| Public key ("anon" or "publishable") | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY` also work. It is safe in browsers, because row level security decides what it can reach |
| Service role key ("secret") | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` also works. Tick **Sensitive**. Never give it a `NEXT_PUBLIC_` name: it bypasses row level security and must stay on the server |
| Your site's address (optional) | `SITE_URL` | For example `https://viemo.vercel.app`. Used in email links. Without it, the address of the current request is used |

If you connected Supabase through Vercel's Supabase integration, it has already added variables with these names. Nothing else is needed.

Then **redeploy**, because Vercel only reads new variables when it builds.

## 3. Tell Supabase where your site is

In Supabase, open **Authentication → URL Configuration**:

- **Site URL**: your production address, for example `https://viemo.vercel.app`.
- **Redirect URLs**: add
  - `https://<your production domain>/auth/callback`
  - `https://*-<your-vercel-team>.vercel.app/auth/callback` (preview deployments)
  - `http://localhost:3000/auth/callback` (local development)

Supabase only sends email links to addresses on this list. That stops anyone from using a forged address to send someone elsewhere.

## 4. Email sign-in settings

In **Authentication → Sign In / Providers → Email**:

- Keep **Confirm email** on.
- Set the **minimum password length** to 8, to match the form.

Supabase's built-in email sender is for testing. It sends only a few emails an hour. Before inviting people, set up your own sender under **Authentication → Emails → SMTP Settings**. Resend, Postmark and Amazon SES all work.

### Optional: email links that work in any browser

By default, the link in a confirmation email only signs you in on the browser you signed up on. If you open it elsewhere, the email is still confirmed and VieMo asks you to sign in. To make links work everywhere, open **Authentication → Emails → Templates** and change the link in two templates.

Confirm signup:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=%2Faccount%3Fwelcome%3D1">Confirm your email</a>
```

Reset password:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a>
```

## 5. Check it on the live site with three accounts

Use three email addresses you can open (A, B and C), and a private window for each.

1. **Sign-up.** Create A. You see "Check your inbox". Open the link and you land on "Set up your profile". The watchlist choice starts on "Only me". Save.
2. **Wrong password.** Sign out, then sign in with a wrong password. The message is under the password field. Sign in properly from `/wall`; you come back to `/wall`.
3. **Password reset.** "Forgot your password?" gives the same message for an unknown address as for A. A's email link opens "Choose a new password", and the new password works.
4. **Profiles.** Create B and C. B tries to take A's username and is told it's taken. Each person can edit only their own profile.
5. **Private by default.** Once the library arrives in the next step: A makes a private collection. B and C can't find it, open it by link, or see it in search.
6. **Unlisted.** A switches the collection to unlisted and sends B the link. B can open it. C still can't find it in search or Explore.
7. **Editing.** A adds B as an editor. B can add and reorder films, but can't rename it, change who sees it, or delete it. C saving a copy gets a private copy C owns, with no edit rights on A's.

8. **Screening Activity.** It starts on "Only me", so B opening A's profile (`/u/<username>`) sees "keeps their Screening Activity private". When A switches to Friends, B still sees nothing until they follow each other. When A switches to Anyone, a private window that isn't signed in sees A's seats. Switching back to Only me hides them straight away.

Steps 1 to 4 work now. Steps 5 to 7 come with the next update (My Cinema Library). Their database rules are already in place and tested. Step 8 works now, but the seats only fill once diaries are stored in accounts, which also comes with My Cinema Library. Until then, your own Profile tab draws Screening Activity from the diary on your device.

## Troubleshooting

- **"Accounts aren't switched on here yet."** The server can't see the URL or the public key. Check the names above, then redeploy.
- **"Your account has no profile yet."** The first migration hasn't run, so new accounts don't get a profile. Run step 1, then sign up again or ask for help adding the missing profile.
- **Email links go to the wrong place, or say the address isn't allowed.** Check the Site URL and Redirect URLs in step 3.
- **"Too many attempts"** right after signing up. That's the built-in email sender's hourly limit. Set up SMTP (step 4).
