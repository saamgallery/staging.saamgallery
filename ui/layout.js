/* ============================================================
   SAAM — layout.js
   The shell the composer wraps around every component: the reactive
   core, the localStorage data layer, the demo seed, shared helpers,
   then the components themselves.
   ============================================================ */

/* {{reactivity-js}} */

/* ---- The data layer ----
   One localStorage key per model, holding that model's JSON array.
   Relations are ids (works.artist_id → artists.id), joined in the
   component code rather than in storage. Ids are local and monotonic,
   mirroring what a database auto-increment would hand back, so the
   same component code keeps working when a back end lands behind the
   //online markers. See the models table in the README. */

function loadLocal(model) {
    try {
        return JSON.parse(localStorage.getItem(model)) || [];
    } catch (e) {
        return [];                      // storage blocked or corrupt → empty
    }
}

function saveLocal(model, rows) {
    try {
        localStorage.setItem(model, JSON.stringify(rows));
    } catch (e) { /* storage blocked → the page still works, nothing persists */ }
}

function nextLocalId(model) {
    return loadLocal(model).reduce(function (max, row) {
        return row.id > max ? row.id : max;
    }, 0) + 1;
}

/* {{demo-js}} */

/* ---- The online back end ----
   Supabase: the catalogue is read straight from PostgREST (it is public
   content), and every write goes through an edge function. All of it
   sits between //online markers, so `make dev` strips it and leaves the
   localStorage site.
   The publishable key is meant to ship in the page; RLS does the
   guarding. `make stg` rewrites DB_ENV to 0 (staging). */

/* STAGING: the studio opens on a picker of artists, no sign-in needed.
   Lines ending //staging are deleted by `make prd`, so production
   always asks an artist to sign in and never shows the picker. */
var STAGING = false;
STAGING = true; //staging
//online-start
var SUPABASE_URL = "https://dfetvuridflamauzmqoa.supabase.co";
var SUPABASE_KEY = "sb_publishable_Rm7PfNJ3CqjlZ7EBLStp6g_CUMITDbH";
var DB_ENV = 1;

/* The browser's random session token, sent with every write. */
function sessionToken() {
    var token = null;
    try { token = localStorage.getItem("session_token"); } catch (e) { /* blocked */ }
    if (!token) {
        token = crypto.randomUUID();
        try { localStorage.setItem("session_token", token); } catch (e) { /* blocked */ }
    }
    return token;
}

/* POST to an edge function. Resolves with the parsed body; rejects
   with { status, body } so callers can tell a 409 from a 429. */
function callFunction(name, body, accessToken) {
    return fetch(SUPABASE_URL + "/functions/v1/" + name, {
        method: "POST",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + (accessToken || SUPABASE_KEY),
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw { status: res.status, body: data };
            return data;
        });
    });
}

/* Refresh the localStorage cache of the catalogue from the database —
   this build's rows only (staging and production keep separate
   catalogues, told apart by `env`). The components keep reading through
   loadLocal(), so the cache is the only thing that changes; if the
   fetch fails, the last copy stands. */
function loadCatalogue() {
    function get(path) {
        return fetch(SUPABASE_URL + "/rest/v1/" + path, { headers: { "apikey": SUPABASE_KEY } })
            .then(function (res) {
                if (!res.ok) throw new Error(path + " " + res.status);
                return res.json();
            });
    }
    return Promise.all([
        get("artists?select=id,name,medium,based,instagram,short,bio&env=eq." + DB_ENV + "&order=id"),
        get("works?select=id,artist_id,title,year,medium,size,price,available,image&env=eq." + DB_ENV + "&order=id")
    ]).then(function (rows) {
        saveLocal("artists", rows[0]);
        saveLocal("works", rows[1]);
    }).catch(function () { /* offline or down → keep the cached copy */ });
}

function trackVisit() {
    callFunction("track-visit", {
        token: sessionToken(), env: DB_ENV,
        page: location.pathname, referrer: document.referrer || null
    }).catch(function () {});   // never blocks or affects the page
}
//online-end

/* Replace one row (matched by id) in a model's cache, or append it. */
function putLocal(model, row) {
    var rows = loadLocal(model);
    var found = false;
    rows = rows.map(function (r) {
        if (r.id !== row.id) return r;
        found = true;
        return row;
    });
    if (!found) rows.push(row);
    saveLocal(model, rows);
}

/* ---- Shared helpers ---- */

/* Rands, thin-space grouped: R 186 000 — the gallery's price style. */
function rand(amount) {
    return "R " + Number(amount).toLocaleString("en-ZA").replace(/[,\s]/g, " ");
}

/* An artist's works, in the order they were seeded. */
function worksOf(artistId) {
    return loadLocal("works").filter(function (w) { return w.artist_id === artistId; });
}

function artistOf(work) {
    return loadLocal("artists").filter(function (a) { return a.id === work.artist_id; })[0];
}

function workById(id) {
    return loadLocal("works").filter(function (w) { return w.id === id; })[0];
}

/* A work's photograph URL, or "" when it has none. Online, `image` is
   a path in the public `artworks` bucket; in dev it is a small data
   URL kept in localStorage. */
function imageUrl(work) {
    if (!work.image) return "";
    if (work.image.indexOf("data:") === 0) return work.image;
    //online-start
    return SUPABASE_URL + "/storage/v1/object/public/artworks/" + work.image;
    //online-end
    return "";
}

/* A hung work: its photograph, or until there is one, a labelled
   placeholder at the frame's height. */
function frame(work, cssHeight, cursor) {
    var src = imageUrl(work);
    var inner = src
        ? '<div class="frame__slot frame__slot--image">' +
              '<img src="' + esc(src) + '" alt="' + esc(work.title) + '" loading="lazy">' +
          '</div>'
        : '<div class="frame__slot"><span>' + esc(work.title) + '</span></div>';
    return '<div class="frame" style="height:' + cssHeight + ';cursor:' + cursor + '">' + inner + '</div>';
}

/* Scale a picked photo down in the browser and re-encode it as JPEG.
   createImageBitmap applies the photo's EXIF rotation, so phone
   pictures arrive upright. */
function shrinkImage(file, maxEdge, quality) {
    return createImageBitmap(file).then(function (bitmap) {
        var scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (blob) resolve(blob); else reject(new Error("encode"));
            }, "image/jpeg", quality);
        });
    });
}

/* The SAAM mark: five figures, overlapping. The thin gap between them
   is drawn in --mark-gap, which must match whatever the mark sits on. */
function brandMark(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100" fill="currentColor" stroke="var(--mark-gap, var(--paper))" stroke-width="3.9" role="img" aria-label="SAAM">' +
        '<rect x="48.5" y="27.4" width="16.9" height="53.1" rx="3.2" /><circle cx="57.5" cy="17.3" r="11.5" />' +
        '<rect x="71.3" y="35.7" width="19.1" height="41" rx="4.6" /><circle cx="80.6" cy="24.4" r="13.7" />' +
        '<rect x="56.3" y="57.3" width="17.8" height="40.4" rx="3.4" /><circle cx="65.3" cy="45.8" r="12" />' +
        '<rect x="30.8" y="22.6" width="16.9" height="53.1" rx="3.6" /><circle cx="39.8" cy="12.5" r="10.5" />' +
        '<rect x="9" y="39.2" width="21" height="49.6" rx="4.4" /><rect x="38.1" y="61.9" width="18" height="36.1" rx="3.8" />' +
        '<circle cx="47.6" cy="49.1" r="14.2" /><circle cx="20" cy="25.9" r="14.4" />' +
    '</svg>';
}

function workMeta(work) {
    return esc(work.medium) + " &middot; " + esc(work.size) + " &middot; " + esc(work.year);
}

function priceLabel(work) {
    return work.available ? rand(work.price) : "Sold";
}

/* ---- Views ----
   Three mounts share the page: `gallery` renders the artist index,
   `artist` the detail view, `studio` the artist's own workspace. Each
   renders nothing when it is not the current view, so switching is a
   few assignments. */

function goHome() {
    artist.current = null;
    studio.visible = false;
    gallery.visible = true;
    lightbox.work = null;
    window.scrollTo({ top: 0 });
}

function openArtist(id) {
    gallery.visible = false;
    studio.visible = false;
    artist.current = id;
    window.scrollTo({ top: 0 });
}

/* The studio opens on sign-in (online) or the artist picker (dev), or
   straight back into the artist already working. */
function openStudio() {
    gallery.visible = false;
    artist.current = null;
    studio.visible = true;
    resumeStudio();
    window.scrollTo({ top: 0 });
}

function scrollAbout() {
    if (!gallery.visible) goHome();
    // the section only exists after the gallery has re-rendered
    Promise.resolve().then(function () {
        var el = document.getElementById("saam-about");
        if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
    });
}

function stopClick(event) { event.stopPropagation(); }

/* A field people never see; bots fill it, and the edge functions then
   quietly store nothing. */
function honeypot() {
    return '<input class="form__trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">';
}

/* {{header-js}} */
/* {{gallery-js}} */
/* {{artist-js}} */
/* {{lightbox-js}} */
/* {{cart-js}} */
/* {{enquiry-js}} */
/* {{studio-js}} */

/* ---- Start ---- */

function showSite() {
    gallery.artists = loadLocal("artists");
    // drop held works that have since gone from the catalogue
    cart.items = loadLocal("cart_items").filter(function (row) { return workById(row.work_id); });
    persistCart();
}

function start() {
    document.getElementById("footer-mark").innerHTML = brandMark(30);
    //online-start
    trackVisit();
    showSite();                         // the cached catalogue, at once
    loadCatalogue().then(showSite);     // then the database's
    return;
    //online-end
    seedDemo();
    showSite();
}

start();
