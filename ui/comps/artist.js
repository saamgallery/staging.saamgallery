/* ---- artist — the detail view: the hang, then the price list ---- */

function artistHang(work) {
    return '<div class="hang__work">' +
               '<div onclick="openLightbox(' + work.id + ')">' + frame(work, "330px", "zoom-in") + '</div>' +
               '<p class="hang__title">' + esc(work.title) + '</p>' +
               '<p class="hang__meta">' + workMeta(work) + '</p>' +
               '<p class="hang__price">' + priceLabel(work) + ' &middot; ' +
                   '<span class="accent">' +
                       (work.available ? "Available" : "In a private collection") +
                   '</span></p>' +
           '</div>';
}

function artistListRow(work) {
    return '<div class="list__row">' +
               '<p class="list__title">' + esc(work.title) + '</p>' +
               '<p class="list__meta">' + workMeta(work) + '</p>' +
               '<p class="list__price">' + priceLabel(work) + '</p>' +
               '<div class="list__actions">' +
                   '<span class="btn btn--ghost" onclick="openEnquiry(' + work.id + ')">Enquire</span>' +
                   addButton(work, "btn") +
               '</div>' +
           '</div>';
}

function artistTemplate(state) {
    if (!state.current) return "";

    var a = loadLocal("artists").filter(function (row) { return row.id === state.current; })[0];
    if (!a) return "";
    var works = worksOf(a.id);
    var handle = a.instagram.replace("@", "");

    return '<div class="fade">' +
               '<section class="artist__head">' +
                   '<span class="back" onclick="goHome()">&larr; All artists</span>' +
                   '<div class="artist__head-grid">' +
                       '<div>' +
                           '<h1 class="artist__name">' + esc(a.name) + '</h1>' +
                           '<p class="artist__medium">' + esc(a.medium) + ' &middot; ' + esc(a.based) + '</p>' +
                       '</div>' +
                       '<div>' +
                           '<p class="artist__bio">' + esc(a.bio) + '</p>' +
                           '<div class="artist__actions">' +
                               '<span class="btn btn--solid" onclick="openStudioEnquiry(' + a.id + ')">Enquire</span>' +
                               '<a class="btn btn--ghost" href="https://instagram.com/' + esc(handle) + '" ' +
                                  'target="_blank" rel="noopener">' + esc(a.instagram) + '</a>' +
                           '</div>' +
                       '</div>' +
                   '</div>' +
               '</section>' +

               '<section class="hang">' + works.map(artistHang).join("") + '</section>' +

               '<section class="list">' +
                   '<p class="eyebrow">Available works</p>' +
                   '<div class="list__table">' + works.map(artistListRow).join("") + '</div>' +
               '</section>' +
           '</div>';
}

var artist = mount(
    document.getElementById("artist"),
    { current: null },
    artistTemplate
);
