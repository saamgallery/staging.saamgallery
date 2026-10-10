# SAAM — staging

The SAAM Gallery website, rebuilt on the **unframe** stack — plain HTML/CSS/JS
composed into a single static `index.html`, no framework, no npm, no bundler,
deployed to **GitHub Pages**.

SAAM is a Cape Town gallery of six artists sharing one wall. Every work hangs in
the physical gallery and is available to acquire or enquire after.

This is the **staging** repo: every branch pushed here becomes the staging site.
A production repo comes later (see [Where this goes next](#where-this-goes-next)).

## Build

```bash
make dev    # offline build → ui/dist/index.html (+ ui/dist/img)
make stg    # online build against Supabase, for the staging site
make prd    # online build for production (the future production repo)
make clean  # remove the output
```

No dependencies to install — `make`, `awk` and `sed` are all it needs. Open
`ui/dist/index.html` in a browser (the stg build must be served over http from
an allowed origin — Live Server on `:5500` works; see `supabase/README.md`).

| | `dev` | `stg` | `prd` |
| --- | --- | --- | --- |
| Back end | none — `//online` code stripped | Supabase | Supabase |
| Data | `localStorage`, seeded from `ui/demo.js` | the database (env `0`); `localStorage` is a cache | the database (env `1`) |
| Studio | staging-only artist picker, no login | staging-only artist picker, no login | artist signs in; own profile only |
| Search engines | — | `noindex` meta + `robots.txt` `Disallow: /` | indexable, `robots.txt` `Allow: /` |

`prd` deletes every line ending `//staging`, which is what turns the picker off.

### Online and offline in one codebase

Code that talks to the back end sits between `//online-start` and
`//online-end` (or on a line ending `//online`). `make dev` deletes those lines,
leaving the pure `localStorage` site. Where a handler has both paths, the
online one comes first and ends in `return;`, and the offline fallback follows:

```js
function saveWork(event) {
    //online-start
    studioCall("update_work", …).then(…);
    return;
    //online-end
    saveLocal("works", …);                 // dev only
}
```

Staging-only behaviour hangs off `STAGING`, set by a line ending `//staging`
that `make prd` deletes. The publishable key in
`ui/layout.js` is meant to ship in the page; RLS and the edge functions do the
guarding.

## How the build works

The unframe composer (`make/tpl.mk`) is an `awk` macro that streams a source
file and, wherever a line contains a token, splices in the mapped file's contents
at that line's indentation. It runs twice:

```
ui/layout.js   + make/js.map   →  ui/dist/index.js     (core, seed, components)
ui/layout.html + make/web.map  →  ui/dist/index.html   (CSS + that JS, inlined)
```

`stg` composes the JS with `make/js.map` minus the `{{demo-js}}` line, so the
seed never reaches staging, then `sed`s `DB_ENV` to `0` and the robots meta to
`noindex`.

`ui/dist/index.html` is the whole site — one file, plus `ui/dist/img`.

## Structure

```
Makefile                  build targets (dev, stg, clean)
make/tpl.mk               the awk compose macro (vendored from the unframe kit)
make/js.map               token → file map for ui/layout.js
make/web.map              token → file map for ui/layout.html
ui/layout.html            page shell: head, mount points, the two tokens
ui/layout.css             the whole stylesheet
ui/layout.js              JS shell: data layer, shared helpers, view switching
ui/reactivity.js          the reactive core — reactive() + mount()
ui/demo.js                the localStorage seed (the gallery's current roster)
ui/comps/header.js        sticky bar, brand mark, held-works count
ui/comps/gallery.js       home: hero, a row per artist, about
ui/comps/artist.js        artist detail: the hang, then the price list
ui/comps/lightbox.js      one work, large, over the page
ui/comps/cart.js          held collection → checkout → confirmation
ui/comps/enquiry.js       enquiry form, for a work or an artist's studio
ui/comps/studio.js        artist studio: sign-in, an artist's details, add/edit/delete their works
db/NNN_*.sql              the Supabase schema and catalogue seed, applied in order
supabase/functions/       edge functions: track-visit, enquiry, order, studio, work-image (+ _shared)
supabase/config.toml      verify_jwt per function
supabase/README.md        back-end setup: schema, functions, secrets, artist accounts
ui/img/                   static assets, copied into the build
design/                   the design files this rebuild works from
```

## Components

Each component is one `.js` file holding a **pure template** (state in, HTML
string out), a single `mount()` into a global named after the component, and its
handlers. Handlers mutate the global; the mutation re-renders it.

```js
function galleryTemplate(state) { … }                 // pure: no DOM access
var gallery = mount(document.getElementById("gallery"),
                    { visible: true, artists: [] }, galleryTemplate);
function openArtist(id) { gallery.visible = false; artist.current = id; }
```

To add a component `foo`: create `ui/comps/foo.js`, add a mount point to
`ui/layout.html`, add `/* {{foo-js}} */` to `ui/layout.js` in load order, and
`{{foo-js}}:ui/comps/foo.js` to `make/js.map`.

## Data models

In the browser: one `localStorage` key per model, holding that model's JSON
array. Relations are ids, joined in the component code rather than in storage.
In `dev`, ids are local and monotonic via `nextLocalId()`; in `stg`, `artists`
and `works` are a cache of the database (refreshed on every load, updated from
what the `studio` function returns), and their ids are the database's.

In Supabase (`db/*.sql`): every table has a `BIGSERIAL id`. `artists` and
`works` are public content, readable with the publishable key; everything else
is private (RLS on, no policies) and written only by the edge functions.

**Staging and production share one database, separated by `env`** —
`SMALLINT`, `0` staging, `1` production — on every table except
`rate_limits` and `order_items` (which belongs to an env-stamped order). Each
build reads and writes only its own rows: the catalogue fetch filters
`env=eq.<DB_ENV>`, and the edge functions scope every lookup and insert to the
caller's env, taken from the origin (custom domains) or the build's `DB_ENV`
stamp (on github.io, where both builds share an origin). So the two
environments have **separate catalogues**: an artist's edit on staging never
reaches the live site, and an order or enquiry can only name its own env's
works. Production's catalogue started as a copy of staging's, with new ids.

### `artists`

| field | type | notes |
| --- | --- | --- |
| `id` | integer | primary key |
| `env` | smallint | DB only: `0` staging, `1` production |
| `name` | text | e.g. "Thandi Mokoena" |
| `medium` | text | the artist's medium, e.g. "Oil on linen" |
| `based` | text | city |
| `instagram` | text | handle, stored with the leading `@` |
| `short` | text | one line, shown on the home row |
| `bio` | text | paragraph, shown on the artist page |
| `user_id` | uuid, nullable | DB only, **private** → `auth.users.id`, the artist's login; unique per `env` (one login can own the artist's staging and production rows). Not in the public column grant |
| `created_at`, `updated_at` | timestamptz | DB only |

### `works`

| field | type | notes |
| --- | --- | --- |
| `id` | integer | primary key |
| `env` | smallint | DB only: `0` staging, `1` production — always its artist's |
| `artist_id` | integer | → `artists.id` |
| `title` | text | |
| `year` | text | year made |
| `medium` | text | this work's medium, which may differ from the artist's |
| `size` | text | free text: "140 × 110 cm", "52 cm high" |
| `price` | integer | rands, unformatted |
| `available` | boolean | `false` renders as Sold / In a private collection |
| `image` | text, nullable | the photograph: a path in the `artworks` storage bucket (`<env>/<work id>/<uuid>.jpg`) online, or a small JPEG data URL in `dev`. Null → the labelled placeholder frame |
| `created_at`, `updated_at` | timestamptz | DB only |

Order within an artist is the seeded order (new works are appended); the home
row shows the first three.

### `cart_items`

The visitor's held works. One row per held work.

| field | type | notes |
| --- | --- | --- |
| `id` | integer | primary key |
| `work_id` | integer | → `works.id`, unique in practice (a work is held once) |

Written on every add and remove, and cleared when a confirmed order is dismissed.
Deleting a work in the studio also removes any `cart_items` row pointing at it,
and on load any row whose work has left the catalogue is dropped. Browser only —
the database never sees a cart, only the `orders` it becomes.

### `enquiries` (DB only)

| field | type | notes |
| --- | --- | --- |
| `id` | bigint | primary key |
| `env` | smallint | `0` staging, `1` production |
| `session_id` | bigint | → `sessions.id`, cascade |
| `work_id` | bigint, nullable | → `works.id`; set for a work enquiry |
| `artist_id` | bigint, nullable | → `artists.id`; the work's artist, or the studio's |
| `subject` | text | built by the function: "Title — Artist" or "Studio enquiry — Artist" |
| `name`, `email`, `message` | text | from the form |
| `created_at` | timestamptz | |

### `orders` and `order_items` (DB only)

| `orders` field | type | notes |
| --- | --- | --- |
| `id` | bigint | primary key |
| `env` | smallint | `0` staging, `1` production |
| `session_id` | bigint | → `sessions.id`, cascade |
| `name`, `email`, `address`, `city`, `country` | text | from checkout |
| `total` | integer | rands, summed by the function from `works.price` |
| `created_at` | timestamptz | |

| `order_items` field | type | notes |
| --- | --- | --- |
| `id` | bigint | primary key |
| `order_id` | bigint | → `orders.id`, cascade |
| `work_id` | bigint, nullable | → `works.id`, set null if the work is deleted |
| `title`, `price` | text, integer | snapshot at order time |

No payment details are taken or stored; the gallery invoices by email. Placing
an order does not change `works.available` — the gallery marks works sold.

### `sessions`, `page_views`, `rate_limits` (DB only)

The unframe kit's shared tables, unchanged: one `sessions` row per browser
(`token` uuid from `localStorage`, `env`, salted `ip_hash`, coarse geo, user
agent, `first_seen`/`last_seen`), one `page_views` row per load
(`env`, `session_id`, `page`, `referrer`, `created_at`), and the fixed-window
`rate_limits` counter behind `rate_limit_hit()`. See `db/001_shared.sql`.

## The artist studio

`ui/comps/studio.js`, reached from **Artist studio** in the footer, is where an
artist maintains their own record: their `artists` row (name, Instagram,
medium, city, the home-page line, the bio) and full create/edit/delete of their
`works` rows. Changes show on the public pages straight away.

- **prd** — the artist must sign in with email and password (Supabase Auth
  over plain `fetch`; tokens in `localStorage["studio_auth"]`, refreshed before
  they expire). The `studio` edge function says which artist the login belongs
  to and makes every change, only ever to that artist's rows. There is no
  sign-up; the gallery creates accounts (see `supabase/README.md`).
- **stg and dev** — no sign-in. The studio opens on a picker of every artist,
  marked **Staging only**, so anyone testing can work as any artist. Online, the
  `studio` function allows a login-free request only for staging rows (env `0`);
  production rows always need the artist's own login. Staging is `noindex`, but
  anyone who finds it can edit the staging catalogue — that is the trade.

Everything past the picker or sign-in works from `studio.artistId` alone.

## The demo seed

`ui/demo.js` populates each model's key **only when that key is missing**, so a
visitor lands on a populated gallery and nothing they have already done is
overwritten. Its rows are the gallery's current roster and are the offline
build's data. When an online build exists it reads the real back end instead and
`{{demo-js}}` stays out of its map.

## Images

Artists add a photograph to a work from the studio's work form. `frame()` in
`ui/layout.js` shows it, or the labelled placeholder frame when there is none.

- **stg / prd** — the browser first scales the photo to 2400px (applying its
  EXIF rotation, so phone pictures stand upright) to keep the upload small,
  then posts it to the `work-image` edge function. The function decodes it,
  scales it to **1600px on the long side**, re-encodes it as **JPEG (quality
  82)**, and stores it in the public `artworks` bucket under a fresh name
  (so no cache serves an old picture). It deletes the image it replaces, and
  deleting a work deletes its image.
- **dev** — no back end, so the photo is scaled to 900px in the browser and kept
  as a data URL in `localStorage` (which holds only a few MB in all).

## Deployment

`.github/workflows/pages.yml` builds `make stg` — the online build — and
publishes `ui/dist` to GitHub Pages on **every push, on every branch**. It needs
no secrets: the Supabase URL and publishable key are in `ui/layout.js`. A repo has one Pages deployment, so the
most recent push is what is live on staging.

### One-time repo setup, done by hand

Two settings, both needing repo admin. The workflow cannot apply either
itself: `configure-pages` with `enablement: true` was tried and the Actions
`GITHUB_TOKEN` is refused ("Resource not accessible by integration").

1. **Settings → Pages → Source: GitHub Actions.** Without it every run fails
   at `configure-pages` with "Get Pages site failed".
2. **Settings → Environments → `github-pages` → Deployment branches and
   tags → No restriction.** Enabling Pages creates this environment limited
   to the default branch, which is the opposite of what a staging repo wants:
   the `deploy-staging` job names that environment, so on any other branch it
   is refused before its first step — a job that fails in about a second with
   no logs at all. Allowing every branch is what makes "every branch deploys
   to staging" true. (Narrowing it to a pattern works too, but then a branch
   outside the pattern silently stops deploying.)

After both, pushes deploy unattended.

## Where this goes next

In rough order, each step earning its place before it is taken:

1. **Photographs** of the works, replacing the placeholder frames.
2. **A production repo** and a `prd` target (env `1`) — the database side is
   ready: production's rows already exist alongside staging's.
3. **Custom domains** (below) — until then both builds share the github.io
   origin, so env comes from the build stamp, and the browser's
   `localStorage` (catalogue cache, held works) is shared between them., with this workflow grown to deploy production from its
   `main` and promote to it from this repo's — committed identically to both.
4. **Custom domains** — `saam.gallery` on production, `staging.saam.gallery`
   here, each written into the build output as a `CNAME`. The edge functions
   then take env from the origin, which the browser can't spoof.

See `.claude/skills/unframe/SKILL.md` for how each of those is done.

## The design source

`design/` holds the design files this rebuild works from — `Saam Gallery.dc.html`
and its two runtime scripts. They are the reference, not part of the build: the
copy, the roster, the palette and the layout in `ui/` all come from there.
