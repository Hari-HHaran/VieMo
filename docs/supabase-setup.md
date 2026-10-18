# Connecting Supabase

Accounts, collections, Movie Night rooms and SceneAtlas data all live in one Supabase project. Until it is connected, VieMo keeps working on this device only and the account pages say so.

You need a Supabase project and access to the VieMo project in Vercel. Supabase's dashboard moves things around now and then, so a menu name below may differ slightly.

## 1. Create the tables

In Supabase, open **SQL Editor**. Paste each file below into a new query and run it, one at a time, in this order:

1. `supabase/migrations/20261018000001_foundation.sql` (films, profiles, follows)
2. `supabase/migrations/20261018000002_library.sql` (watchlist, diary, collections)
3. `supabase/migrations/20261018000003_sceneatlas.sql` (filming locations and their sources)
4. `supabase/migrations/20261019000004_screening_activity.sql` (Screening Activity: daily totals and who can see them)
5. `supabase/migrations/20261020000005_community.sql` (demo labels, review visibility, Explore, and the demo importer's functions)
6. `supabase/migrations/20261021000006_wheelmo.sql` (WheelMo spins: the winner is chosen in the database)
7. `supabase/migrations/20261022000007_movie_nights.sql` (Movie Night rooms, private votes, and live updates)

Each one should end with "Success. No rows returned". Run each file once only. If one fails, stop and send the error text, not the keys.

If you use the Supabase CLI instead, `supabase db push` runs them in order.

Every table has row level security switched on, and the default access Supabase gives the public API is removed. Each policy in those files is the only way in. The same files pass 220 checks locally (`supabase/tests/local/run.sh`), signed in as three different accounts and signed out.

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

8. **Movie Night.** A opens `/match/night`, makes a room and copies the invite link. C opens the link without joining and sees only "You're invited", nothing inside. B joins. Both add films. During voting, B sees how many films A has voted on, never how. After A shows the results, both see totals and the films everyone said yes to. A spins Match Decider; B's screen turns at the same time and lands on the same film. C joins late and sees the same result straight away. B reloads and still sees it. Only A can confirm tonight's film.

9. **Screening Activity.** It starts on "Only me", so B opening A's profile (`/u/<username>`) sees "keeps their Screening Activity private". When A switches to Friends, B still sees nothing until they follow each other. When A switches to Anyone, a private window that isn't signed in sees A's seats. Switching back to Only me hides them straight away.

All nine steps work once migrations 1 to 7 have run. Collections are managed in My Cinema Library (`/library`). Screening Activity seats fill from diaries stored in accounts; your own Profile tab also draws on the diary on your device.

## 6. The demo community (optional)

Ten fictional accounts with collections, watch history, reviews and follows, for trying Explore, profiles and WheelMo. Everything they make is labelled **Demo**. They can't be signed into, and their `example.com` addresses can't receive mail. One button removes them all without touching real accounts.

1. Run migration 5 (above).
2. In Vercel, add `SUPABASE_SERVICE_ROLE_KEY` (tick **Sensitive**) and `DEMO_SEED_ENABLED` = `true`. Redeploy.
3. Make your own account an editor. In the SQL Editor, run (with your username):
   ```sql
   update public.profiles set is_editor = true where username = 'your_username';
   ```
4. Sign in and open `/admin/demo`. Everyone else gets "not found" there.
5. Press **Dry run** first. It looks up all 100 films on TMDB and writes nothing. Check the report:
   - Films with no confident TMDB match are listed and left out, never guessed.
   - Four films are accepted with a one-year difference, because TMDB dates them by a later release.
6. Press **Import the demo community**. On the live site, first tick the approval box. Running it again updates the community without making duplicates.
7. When you no longer need it, tick the removal box and press **Remove the demo community**. Then set `DEMO_SEED_ENABLED` back to `false`.

The importer applies four fixes to the fixture and lists each one in its report:
- twelve extra watches, so some films are rated differently by different people;
- already-watched films taken off watchlists;
- six reviews reworded to match their star rating;
- six follows made mutual, so "friends only" can be tried.

## 7. Live updates for Movie Night (Realtime)

Movie Night rooms update live through Supabase Realtime. Migration 7 adds one table, `movie_nights`, to Realtime's `supabase_realtime` publication. It carries no votes or films; it only tells each screen "this room changed", and each screen then asks the database for what that person may see. Realtime applies the same row level security, so only people in a room hear about it.

To check it: in Supabase, open **Database → Publications → supabase_realtime**. `movie_nights` should be listed, and nothing else from Movie Night. If you ran migration 7 on a project without that publication, it skipped this step; run the migration again after enabling Realtime.

A room shows **Live** when Realtime is connected. Otherwise it says **Updating every few seconds** and checks every 4 seconds, so rooms still work, just with a short delay. To turn Realtime off on purpose, set `NIGHT_REALTIME` = `off` in Vercel.

## Troubleshooting

- **Unsure what the site can see?** Open `/status`. It lists which variables were found (names only, never values), whether Supabase accepts the key, and which migrations have run.

- **"Accounts aren't switched on here yet."** The server can't see the URL or the public key. Check the names above, then redeploy.
- **"Your account has no profile yet."** The first migration hasn't run, so new accounts don't get a profile. Run step 1, then sign up again or ask for help adding the missing profile.
- **Email links go to the wrong place, or say the address isn't allowed.** Check the Site URL and Redirect URLs in step 3.
- **"Too many attempts"** right after signing up. That's the built-in email sender's hourly limit. Set up SMTP (step 4).
