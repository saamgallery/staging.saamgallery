/* ---- studio — where an artist keeps their details and works ----

   Production (`make prd`): an artist signs in with email and password
   (Supabase Auth; accounts are made by the gallery, there is no
   sign-up), the `studio` edge function says which artist the login
   belongs to, and they can change only that artist.

   Staging and dev (STAGING): no sign-in. A picker of every artist,
   clearly marked as staging-only, lets anyone testing work as any of
   them; online, the `studio` function accepts that only for staging
   rows (env 0). Everything past the picker or sign-in asks only for
   `studio.artistId`. */

function studioPicker() {
    var rows = loadLocal("artists").map(function (a) {
        return '<div class="list__row studio__pick">' +
                   '<p class="list__title">' + esc(a.name) + '</p>' +
                   '<p class="list__meta">' + esc(a.medium) + ' &middot; ' + esc(a.based) + '</p>' +
                   '<p class="list__price">' + worksOf(a.id).length + ' works</p>' +
                   '<div class="list__actions">' +
                       '<span class="btn btn--ghost" onclick="enterStudio(' + a.id + ')">Open studio</span>' +
                   '</div>' +
               '</div>';
    }).join("");

    return '<section class="artist__head">' +
               '<span class="back" onclick="goHome()">&larr; Gallery</span>' +
               '<div class="studio__staging">' +
                   '<p class="studio__staging-tag">Staging only</p>' +
                   '<p>This list lets you test the studio as any artist, without signing in. ' +
                   'It does not exist on the live site: there, each artist signs in and can ' +
                   'change only their own profile and works.</p>' +
               '</div>' +
               '<h1 class="artist__name studio__title">Studio</h1>' +
               '<p class="artist__medium">Choose an artist to work as.</p>' +
           '</section>' +
           '<section class="list"><div class="list__table">' + rows + '</div></section>';
}

/* One labelled field. `attrs` carries type/required/step etc. */
function studioField(label, name, value, attrs) {
    return '<label class="studio__field"><span class="eyebrow">' + label + '</span>' +
               '<input name="' + name + '" value="' + esc(value) + '" ' + (attrs || "") + '>' +
           '</label>';
}

function studioArea(label, name, value, rows) {
    return '<label class="studio__field"><span class="eyebrow">' + label + '</span>' +
               '<textarea name="' + name + '" rows="' + rows + '" required>' + esc(value) + '</textarea>' +
           '</label>';
}

function studioDetails(a, saved) {
    return '<form class="form" onsubmit="saveArtist(event)">' +
               '<div class="form__pair">' +
                   studioField("Name", "name", a.name, "required") +
                   studioField("Instagram", "instagram", a.instagram, 'required placeholder="@handle"') +
               '</div>' +
               '<div class="form__pair">' +
                   studioField("Medium", "medium", a.medium, "required") +
                   studioField("Based in", "based", a.based, "required") +
               '</div>' +
               studioArea("One line, for the home page", "short", a.short, 2) +
               studioArea("Biography", "bio", a.bio, 5) +
               '<div class="studio__actions">' +
                   '<button class="btn btn--solid" type="submit">Save details</button>' +
                   (saved ? '<span class="accent">Saved.</span>' : '') +
               '</div>' +
           '</form>';
}

/* The photograph: the current one (if any), a picker for a new one,
   and a way to take it down. It is sent after the work's fields save. */
function studioImageField(work) {
    var src = imageUrl(work);
    return '<div class="studio__field studio__image">' +
               '<span class="eyebrow">Photograph</span>' +
               (src ? '<img class="studio__image-current" src="' + esc(src) + '" alt="">' : '') +
               '<input type="file" name="image" accept="image/jpeg,image/png">' +
               '<span class="studio__hint">JPEG or PNG. It is scaled to 1600 pixels on its long side.</span>' +
               (src ? '<label class="studio__check"><input type="checkbox" name="remove_image"> Remove the photograph</label>' : '') +
           '</div>';
}

/* The add/edit form for a work; a blank `work` means a new one. */
function studioWorkForm(work) {
    var isNew = !work.id;
    return '<form class="form studio__work-form fade" onsubmit="saveWork(event)">' +
               '<p class="eyebrow">' + (isNew ? "New work" : "Editing") + '</p>' +
               studioField("Title", "title", work.title, "required") +
               '<div class="form__pair">' +
                   studioField("Medium", "medium", work.medium, "required") +
                   studioField("Size", "size", work.size, 'required placeholder="90 × 70 cm"') +
               '</div>' +
               '<div class="form__pair">' +
                   studioField("Year", "year", work.year, 'required inputmode="numeric"') +
                   studioField("Price (rands)", "price", work.price, 'required type="number" min="0" step="1"') +
               '</div>' +
               '<label class="studio__check">' +
                   '<input type="checkbox" name="available"' + (work.available ? " checked" : "") + '> ' +
                   'Available to acquire' +
               '</label>' +
               studioImageField(work) +
               '<div class="studio__actions">' +
                   '<button class="btn btn--solid" type="submit"' + (studio.busy ? " disabled" : "") + '>' +
                       (studio.busy ? "Saving&hellip;" : isNew ? "Add work" : "Save work") + '</button>' +
                   '<span class="btn btn--ghost" onclick="cancelWork()">Cancel</span>' +
               '</div>' +
           '</form>';
}

function studioWorkRow(work, state) {
    if (state.editing === work.id) return studioWorkForm(state.draft || work);

    var actions = state.deleting === work.id
        ? '<span class="list__meta">Delete this work?</span>' +
          '<span class="btn btn--solid" onclick="deleteWork(' + work.id + ')">Delete</span>' +
          '<span class="btn btn--ghost" onclick="studio.deleting = null">Keep</span>'
        : '<span class="btn btn--ghost" onclick="editWork(' + work.id + ')">Edit</span>' +
          '<span class="btn btn--ghost" onclick="studio.deleting = ' + work.id + '">Delete</span>';

    return '<div class="list__row">' +
               '<p class="list__title">' + esc(work.title) + '</p>' +
               '<p class="list__meta">' + workMeta(work) + '</p>' +
               '<p class="list__price">' + priceLabel(work) + '</p>' +
               '<div class="list__actions">' + actions + '</div>' +
           '</div>';
}

function studioSignIn(state) {
    return '<section class="artist__head studio__signin">' +
               '<span class="back" onclick="goHome()">&larr; Gallery</span>' +
               '<h1 class="artist__name studio__title">Studio</h1>' +
               '<p class="artist__medium">Sign in with the email and password the gallery gave you.</p>' +
               '<form class="form studio__signin-form" onsubmit="signIn(event)">' +
                   studioField("Email", "email", "", 'required type="email" autocomplete="username"') +
                   studioField("Password", "password", "", 'required type="password" autocomplete="current-password"') +
                   (state.error ? '<p class="studio__error">' + esc(state.error) + '</p>' : '') +
                   '<div class="studio__actions">' +
                       '<button class="btn btn--solid" type="submit"' + (state.busy ? " disabled" : "") + '>' +
                           (state.busy ? "Signing in&hellip;" : "Sign in") + '</button>' +
                   '</div>' +
               '</form>' +
           '</section>';
}

function studioTemplate(state) {
    if (!state.visible) return "";
    if (!state.artistId) {
        return '<div class="fade">' + (STAGING ? studioPicker() : studioSignIn(state)) + '</div>';
    }

    var a = loadLocal("artists").filter(function (row) { return row.id === state.artistId; })[0];
    if (!a) return "";
    var works = worksOf(a.id);

    return '<div class="fade studio">' +
               '<section class="artist__head">' +
                   '<span class="back" onclick="leaveStudio()">' +
                       (STAGING ? "&larr; Switch artist" : "Sign out") + '</span>' +
                   (state.error ? '<p class="studio__error">' + esc(state.error) + '</p>' : '') +
                   '<div class="artist__head-grid">' +
                       '<div>' +
                           '<p class="eyebrow studio__eyebrow">Studio</p>' +
                           '<h1 class="artist__name">' + esc(a.name) + '</h1>' +
                           '<p class="artist__medium">' + works.length + ' works &middot; ' +
                               '<span class="underlined" onclick="openArtist(' + a.id + ')">View public page</span></p>' +
                       '</div>' +
                       studioDetails(a, state.saved) +
                   '</div>' +
               '</section>' +

               '<section class="list">' +
                   '<div class="studio__list-head">' +
                       '<p class="eyebrow">Works</p>' +
                       (state.editing === "new" ? "" :
                           '<span class="btn btn--solid" onclick="newWork()">Add a work</span>') +
                   '</div>' +
                   (state.editing === "new" ? studioWorkForm(state.draft || { available: true }) : "") +
                   '<div class="list__table">' +
                       (works.length
                           ? works.map(function (w) { return studioWorkRow(w, state); }).join("")
                           : '<p class="cart__empty studio__empty">No works yet.</p>') +
                   '</div>' +
               '</section>' +
           '</div>';
}

var studio = mount(
    document.getElementById("studio"),
    { visible: false, artistId: null, editing: null, draft: null, deleting: null, saved: false, error: "", busy: false },
    studioTemplate
);

/* ---- Signing in (online) ----
   Supabase Auth over plain fetch: the password grant gives an access
   token (an hour) and a refresh token, kept in localStorage under
   `studio_auth` so a reload stays signed in. */

//online-start
function loadAuth() {
    try { return JSON.parse(localStorage.getItem("studio_auth")); } catch (e) { return null; }
}

function storeAuth(auth) {
    try {
        if (auth) localStorage.setItem("studio_auth", JSON.stringify(auth));
        else localStorage.removeItem("studio_auth");
    } catch (e) { /* blocked → signed in for this page only */ }
}

function authRequest(grant, body) {
    return fetch(SUPABASE_URL + "/auth/v1/token?grant_type=" + grant, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(body)
    }).then(function (res) {
        return res.json().then(function (data) {
            if (!res.ok) throw { status: res.status, body: data };
            var auth = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: Date.now() + data.expires_in * 1000
            };
            storeAuth(auth);
            return auth;
        });
    });
}

/* A usable access token, refreshed when it is within a minute of expiry. */
function accessToken() {
    var auth = loadAuth();
    if (!auth) return Promise.reject({ status: 401 });
    if (auth.expires_at - 60000 > Date.now()) return Promise.resolve(auth.access_token);
    return authRequest("refresh_token", { refresh_token: auth.refresh_token })
        .then(function (fresh) { return fresh.access_token; });
}

/* Send a work's photograph to the work-image function, which scales it
   down again and stores it; no file means remove it. The browser first
   brings it to 2400px so a phone photo isn't 10 MB on the wire. */
function workImageCall(workId, file) {
    var prepared = file ? shrinkImage(file, 2400, 0.9) : Promise.resolve(null);
    return Promise.all([prepared, STAGING ? null : accessToken()]).then(function (got) {
        var form = new FormData();
        form.append("work_id", workId);
        form.append("env", DB_ENV);
        if (STAGING) form.append("artist_id", studio.artistId);
        if (got[0]) form.append("file", got[0], "image.jpg");
        else form.append("remove", "1");
        return fetch(SUPABASE_URL + "/functions/v1/work-image", {
            method: "POST",
            headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + (got[1] || SUPABASE_KEY) },
            body: form
        });
    }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw { status: res.status, body: data };
            return data;
        });
    });
}

/* Call the studio function as the signed-in artist — or, on staging,
   as the picked artist, with no login (the function allows that for
   staging rows only). */
function studioCall(action, fields) {
    if (STAGING) {
        return callFunction("studio",
            Object.assign({ action: action, env: DB_ENV, artist_id: studio.artistId }, fields));
    }
    return accessToken().then(function (token) {
        return callFunction("studio", Object.assign({ action: action, env: DB_ENV }, fields), token);
    });
}
//online-end

/* Turn a failed call into words; a lost session goes back to sign-in. */
function studioFailed(err) {
    studio.busy = false;
    var status = err && err.status;
    if (status === 401 || status === 400 && err.body && err.body.error_code) {
        storeAuth(null); //online
        leaveStudio();
        studio.error = "Your session has ended. Please sign in again.";
        return;
    }
    studio.error = status === 403 ? "This login is not linked to an artist yet. Ask the gallery to link it."
                 : status === 429 ? "Too many changes at once. Wait a minute and try again."
                 : status === 415 || status === 413 ? "That photograph could not be used. Try a JPEG or PNG."
                 : "That did not save. Check your connection and try again.";
}

/* Opening the studio online: if a login is stored, find its artist. */
function resumeStudio() {
    //online-start
    if (STAGING || studio.artistId || !loadAuth()) return;
    studio.busy = true;
    studioCall("me", {}).then(function (data) {
        studio.busy = false;
        putLocal("artists", data.artist);
        enterStudio(data.artist.id);
    }).catch(studioFailed);
    //online-end
}

function signIn(event) {
    event.preventDefault();
    //online-start
    var v = formValues(event.target, ["email", "password"]);
    studio.error = "";
    studio.busy = true;
    authRequest("password", { email: v.email, password: event.target.elements.password.value })
        .then(function () { return studioCall("me", {}); })
        .then(function (data) {
            studio.busy = false;
            putLocal("artists", data.artist);
            enterStudio(data.artist.id);
        })
        .catch(function (err) {
            if (err && err.status === 400 && err.body && err.body.error_code === "invalid_credentials") {
                studio.busy = false;
                studio.error = "That email and password do not match.";
                return;
            }
            studioFailed(err);
        });
    //online-end
}

/* ---- Handlers ---- */

function enterStudio(id) {
    studio.artistId = id;
    studio.editing = null;
    studio.deleting = null;
    studio.saved = false;
    studio.error = "";
    window.scrollTo({ top: 0 });
}

function leaveStudio() {
    //online-start
    var auth = loadAuth();
    if (auth) {
        fetch(SUPABASE_URL + "/auth/v1/logout", {
            method: "POST",
            headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + auth.access_token }
        }).catch(function () {});
        storeAuth(null);
    }
    //online-end
    studio.artistId = null;
    studio.editing = null;
    studio.deleting = null;
    studio.saved = false;
    studio.error = "";
    studio.busy = false;
}

/* Trimmed text values from a submitted form, by input name. */
function formValues(form, names) {
    var out = {};
    names.forEach(function (name) { out[name] = form.elements[name].value.trim(); });
    return out;
}

function saveArtist(event) {
    event.preventDefault();
    var v = formValues(event.target, ["name", "instagram", "medium", "based", "short", "bio"]);
    if (v.instagram.charAt(0) !== "@") v.instagram = "@" + v.instagram;
    studio.error = "";

    //online-start
    studioCall("update_artist", { artist: v }).then(function (data) {
        putLocal("artists", data.artist);
        artistSaved();
    }).catch(studioFailed);
    return;
    //online-end

    saveLocal("artists", loadLocal("artists").map(function (a) {
        return a.id === studio.artistId ? Object.assign({}, a, v) : a;
    }));
    artistSaved();
}

function artistSaved() {
    gallery.artists = loadLocal("artists");
    studio.saved = Date.now();          // a fresh value each save, so it always re-renders
}

function newWork() {
    studio.draft = null;
    studio.deleting = null;
    studio.editing = "new";
}

function editWork(id) {
    studio.draft = null;
    studio.deleting = null;
    studio.editing = id;
}

function cancelWork() {
    studio.draft = null;
    studio.editing = null;
}

function saveWork(event) {
    event.preventDefault();
    var form = event.target;
    var v = formValues(form, ["title", "medium", "size", "year"]);
    v.price = Math.max(0, Math.round(Number(form.elements.price.value) || 0));
    v.available = form.elements.available.checked;
    var file = form.elements.image.files[0] || null;
    var remove = !!(form.elements.remove_image && form.elements.remove_image.checked);
    // the form re-renders while saving; keep what was typed so a failed
    // save doesn't throw it away (a picked file must be picked again)
    studio.draft = Object.assign({}, studio.editing === "new" ? {} : workById(studio.editing), v);
    studio.error = "";
    studio.busy = true;

    //online-start
    var call = studio.editing === "new"
        ? studioCall("create_work", { work: v })
        : studioCall("update_work", { id: studio.editing, work: v });
    call.then(function (data) {
        putLocal("works", data.work);
        if (!file && !remove) return;
        return workImageCall(data.work.id, file).then(function (img) { putLocal("works", img.work); });
    }).then(workSaved).catch(studioFailed);
    return;
    //online-end

    // Offline: the photo is kept as a small data URL in localStorage,
    // which holds only a few megabytes — hence the modest size.
    var id = studio.editing === "new" ? nextLocalId("works") : studio.editing;
    var image = file ? shrinkImage(file, 900, 0.75).then(blobToDataUrl)
              : Promise.resolve(remove ? null : undefined);
    image.then(function (src) {
        var works = loadLocal("works");
        if (studio.editing === "new") {
            works.push(Object.assign({ id: id, artist_id: studio.artistId }, v, { image: src || null }));
        } else {
            works = works.map(function (w) {
                if (w.id !== id) return w;
                var next = Object.assign({}, w, v);
                if (src !== undefined) next.image = src;
                return next;
            });
        }
        saveLocal("works", works);
        workSaved();
    }).catch(function () {
        studio.busy = false;
        studio.error = "That photograph could not be read. Try a JPEG or PNG.";
    });
}

function workSaved() {
    studio.busy = false;
    studio.draft = null;
    studio.editing = null;
    refreshAfterWorks();
}

function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function deleteWork(id) {
    studio.error = "";

    //online-start
    studioCall("delete_work", { id: id }).then(function () {
        workDeleted(id);
    }).catch(studioFailed);
    return;
    //online-end

    workDeleted(id);
}

/* Removing a work also lets go of it in this browser's held collection,
   so the cart never points at a work that no longer exists. */
function workDeleted(id) {
    saveLocal("works", loadLocal("works").filter(function (w) { return w.id !== id; }));
    cart.items = cart.items.filter(function (row) { return row.work_id !== id; });
    persistCart();
    studio.deleting = null;
    if (studio.editing === id) studio.editing = null;
    refreshAfterWorks();
}

/* Works are read from storage at render time, so a forced re-render is
   all the studio and the gallery need after a change. */
function refreshAfterWorks() {
    studio.saved = false;
    gallery.artists = loadLocal("artists");
}
