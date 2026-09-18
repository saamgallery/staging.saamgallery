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
make clean  # remove the output
```

No dependencies to install — `make`, `awk` and `sed` are all it needs. Open
`ui/dist/index.html` in a browser.

There is **one target because there is one build**. `dev` is the in-browser site:
all state lives in `localStorage`, seeded from `ui/demo.js`. There is no back end
yet, so there is nothing for a `stg`/`prd` pair to be online against; those
targets arrive with the back end, not before.

## How the build works

The unframe composer (`make/tpl.mk`) is an `awk` macro that streams a source
file and, wherever a line contains a token, splices in the mapped file's contents
at that line's indentation. It runs twice:

```
ui/layout.js   + make/js.map   →  ui/dist/index.js     (core, seed, components)
ui/layout.html + make/web.map  →  ui/dist/index.html   (CSS + that JS, inlined)
```

`ui/dist/index.html` is the whole site — one file, plus `ui/dist/img`.

## Structure

```
Makefile                  build targets (dev, clean)
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

One `localStorage` key per model, holding that model's JSON array. Relations are
ids, joined in the component code rather than in storage. Ids are local and
monotonic via `nextLocalId()`, mirroring what a database auto-increment would
hand back — so the same component code keeps working when a back end lands.

### `artists`

| field | type | notes |
| --- | --- | --- |
| `id` | integer | primary key |
| `name` | text | e.g. "Thandi Mokoena" |
| `medium` | text | the artist's medium, e.g. "Oil on linen" |
| `based` | text | city |
| `instagram` | text | handle, stored with the leading `@` |
| `short` | text | one line, shown on the home row |
| `bio` | text | paragraph, shown on the artist page |

### `works`

| field | type | notes |
| --- | --- | --- |
| `id` | integer | primary key |
| `artist_id` | integer | → `artists.id` |
| `title` | text | |
| `year` | text | year made |
| `medium` | text | this work's medium, which may differ from the artist's |
| `size` | text | free text: "140 × 110 cm", "52 cm high" |
| `price` | integer | rands, unformatted |
| `available` | boolean | `false` renders as Sold / In a private collection |

Order within an artist is the seeded order; the home row shows the first three.

### `cart_items`

The visitor's held works. One row per held work.

| field | type | notes |
| --- | --- | --- |
| `id` | integer | primary key |
| `work_id` | integer | → `works.id`, unique in practice (a work is held once) |

Written on every add and remove, and cleared when a confirmed order is dismissed.

## The demo seed

`ui/demo.js` populates each model's key **only when that key is missing**, so a
visitor lands on a populated gallery and nothing they have already done is
overwritten. Its rows are the gallery's current roster and are the offline
build's data. When an online build exists it reads the real back end instead and
`{{demo-js}}` stays out of its map.

## Images

The artworks are placeholder frames — labelled, correctly proportioned, ready for
photographs. `frame()` in `ui/layout.js` is the single place that renders one;
swapping its inner `div` for an `<img src="img/…">` is the whole change once the
gallery supplies the files.

## Deployment

`.github/workflows/pages.yml` builds `make dev` and publishes `ui/dist` to GitHub
Pages on **every push, on every branch**. A repo has one Pages deployment, so the
most recent push is what is live on staging.

**One-time repo setup, done by hand: Settings → Pages → Source: GitHub
Actions.** The workflow cannot do this for itself — `configure-pages` with
`enablement: true` was tried and the Actions `GITHUB_TOKEN` is refused
("Resource not accessible by integration"), because creating a Pages site
needs repo admin. Until that switch is flipped, every run fails at
`configure-pages`; after it, they deploy unattended.

## Where this goes next

In rough order, each step earning its place before it is taken:

1. **Photographs** of the works, replacing the placeholder frames.
2. **A back end** — enquiries and orders currently resolve in the browser only.
   That is where the `//online` markers, the `stg`/`prd` targets and the `env`
   column arrive.
3. **A production repo**, with this workflow grown to deploy production from its
   `main` and promote to it from this repo's — committed identically to both.
4. **Custom domains** — `saam.gallery` on production, `staging.saam.gallery`
   here, each written into the build output as a `CNAME`.

See `.claude/skills/unframe/SKILL.md` for how each of those is done.

## The design source

`design/` holds the design files this rebuild works from — `Saam Gallery.dc.html`
and its two runtime scripts. They are the reference, not part of the build: the
copy, the roster, the palette and the layout in `ui/` all come from there.
