# SAAM — Supabase back end

Project **`saamgallery`** (`dfetvuridflamauzmqoa`, eu-west-2 London), in the
`aleroux85` organisation. The online build (`make stg`) talks to it; `make dev`
strips every call to it.

- **Database** — the schema is `db/NNN_*.sql`, applied in order.
- **Auth** — email + password, for artists only. There is no sign-up: the
  gallery creates each account and links it to an artist row.
- **Edge functions** — `supabase/functions/<name>/index.ts`, with shared code in
  `supabase/functions/_shared/common.ts`. All five run with `verify_jwt = false`
  (see `config.toml`) because the browser calls them with only the publishable
  key; each does its own checking.

| function | does | limit |
| --- | --- | --- |
| `track-visit` | one `page_views` row per load; bots dropped | 60/min per IP |
| `enquiry` | stores an enquiry about a work or a studio | 5 per 10 min per IP and per session |
| `order` | prices the held works from the catalogue and stores the order | 5/hour per IP and per session |
| `studio` | the artist's own `artists` row and `works` (`me`, `update_artist`, `create_work`, `update_work`, `delete_work`) | 120/min per user (staging: per IP) |
| `work-image` | a work's photograph (multipart): decode, scale to 1600px long side, JPEG q82, store in `artworks`; or `remove=1` | shares `studio`'s limit |

`studio` and `work-image` decide who the caller is acting as in
`_shared/artist.ts`. `studio` reads the caller's access token, finds the artist whose `user_id`
matches in the caller's env, and only ever touches that artist's rows. A
request **without** a login is allowed for staging only: it names the artist
(`artist_id`), and only an env `0` row is accepted. Production rows always need
the artist's own login (401 otherwise).

## Setting it up from scratch

1. **Schema.** Run `db/001_shared.sql` … `db/005_seed_catalogue.sql` in order
   (SQL editor, or `supabase db` / the MCP `apply_migration`). `005` seeds the
   roster from `ui/demo.js` into staging (env 0, same ids as dev) and copies it
   to production (env 1, new ids); run it once only. `006` adds `works.image`
   and creates the public `artworks` storage bucket (JPEG only, 2 MB cap).
   Nothing writes to the bucket but `work-image`: `storage.objects` has no
   policies, so the publishable key can read the images but never upload.
2. **Functions.** Deploy each with JWT verification off:

   ```bash
   supabase functions deploy track-visit --no-verify-jwt
   supabase functions deploy enquiry     --no-verify-jwt
   supabase functions deploy order       --no-verify-jwt
   supabase functions deploy studio      --no-verify-jwt
   supabase functions deploy work-image  --no-verify-jwt
   ```

3. **`IP_HASH_SALT`.** Edge Functions → Secrets → add `IP_HASH_SALT`, a long
   random string (`openssl rand -hex 32`). Keep it the same for every function
   and never change it, or the same visitor hashes differently afterwards.
   Without it, IPs are hashed unsalted.
4. **Turn off sign-up.** Authentication → Sign In / Providers → untick
   **Allow new users to sign up**. Unlinked accounts can't change anything
   (`studio` answers 403), but nobody should be able to make one.
5. **Artist accounts.** For each artist: Authentication → Users → **Add user →
   Create new user**, with their email, a password, and **Auto Confirm User**
   ticked. Then link the login to the artist row:

   ```sql
   -- links the login to the artist's staging AND production rows
   UPDATE artists SET user_id = (SELECT id FROM auth.users WHERE email = 'artist@example.com')
   WHERE name = 'Thandi Mokoena';
   ```

   Add `AND env = 0` to link staging only (e.g. a test login).

   Send the artist their email and password. To reset one, edit the user in
   the dashboard.
6. **Frontend config.** `SUPABASE_URL` and `SUPABASE_KEY` (the publishable key)
   are at the top of the online block in `ui/layout.js`.

## Adding an origin

The functions only answer browsers on the origins in `ALLOWED_ORIGINS` in
`_shared/common.ts`: the github.io Pages origin, the future `saam.gallery`
domains, and `localhost:5500` / `127.0.0.1:5500` for testing the stg build with
Live Server. When the custom domains go live, check `ENV_BY_ORIGIN` there and
**redeploy all five functions**, since each one bundles its own copy of
`common.ts`.

## Staging and production in one database

Every table but `rate_limits` and `order_items` carries `env` (`0` staging, `1`
production), including the catalogue: each environment has its own artists and
works. The functions take env from the origin where it's a custom domain, and
otherwise from the `env` the build sends (`DB_ENV` in `ui/layout.js`, which
`make stg` sets to `0`), and scope every read and write to it.

## Reading the data

Everything except the catalogue is private (RLS on, no policies). Read it in the
dashboard, and filter by build: `WHERE env = 0` is staging, `env = 1` production.

```sql
SELECT created_at, subject, name, email, message FROM enquiries WHERE env = 1 ORDER BY created_at DESC;
SELECT o.created_at, o.name, o.email, o.total, string_agg(i.title, ', ')
  FROM orders o JOIN order_items i ON i.order_id = o.id
  WHERE o.env = 1 GROUP BY o.id ORDER BY o.created_at DESC;
```
