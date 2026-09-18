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

/* Where a photograph of the work will go. Until the gallery supplies
   images, this is a labelled frame at the right proportions; swapping
   it for <img src="img/<slug>.jpg"> is the whole change. */
function frame(work, cssHeight, cursor) {
    return '<div class="frame" style="height:' + cssHeight + ';cursor:' + cursor + '">' +
               '<div class="frame__slot"><span>' + esc(work.title) + '</span></div>' +
           '</div>';
}

function workMeta(work) {
    return esc(work.medium) + " &middot; " + esc(work.size) + " &middot; " + esc(work.year);
}

function priceLabel(work) {
    return work.available ? rand(work.price) : "Sold";
}

/* ---- Views ----
   Two mounts share the page: `gallery` renders the artist index,
   `artist` the detail view. Each renders nothing when it is not the
   current view, so switching is a pair of assignments. */

function goHome() {
    artist.current = null;
    gallery.visible = true;
    lightbox.work = null;
    window.scrollTo({ top: 0 });
}

function openArtist(id) {
    gallery.visible = false;
    artist.current = id;
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

/* {{header-js}} */
/* {{gallery-js}} */
/* {{artist-js}} */
/* {{lightbox-js}} */
/* {{cart-js}} */
/* {{enquiry-js}} */

/* ---- Start ---- */
seedDemo();
gallery.artists = loadLocal("artists");
cart.items = loadLocal("cart_items");
header.count = cart.items.length;
