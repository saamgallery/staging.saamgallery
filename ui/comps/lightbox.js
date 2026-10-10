/* ---- lightbox — one work, large, over the page ---- */

function lightboxTemplate(state) {
    if (!state.work) return "";
    var work = workById(state.work);
    if (!work) return "";
    var a = artistOf(work);

    return '<div class="overlay overlay--light fade" onclick="closeLightbox()">' +
               '<div class="lightbox" onclick="stopClick(event)">' +
                   '<div class="lightbox__plate">' + frame(work, "min(64vh, 560px)", "default") + '</div>' +
                   '<div>' +
                       '<p class="eyebrow">' + esc(a ? a.name : "") + '</p>' +
                       '<p class="lightbox__title">' + esc(work.title) + '</p>' +
                       '<p class="lightbox__meta">' + workMeta(work) + '<br>' +
                           (work.available ? "Available" : "In a private collection") + '</p>' +
                       '<p class="lightbox__price">' + priceLabel(work) + '</p>' +
                       '<div class="lightbox__actions">' +
                           addButton(work, "btn btn--block") +
                           '<span class="btn btn--ghost btn--block" onclick="openEnquiry(' + work.id + ')">' +
                               'Enquire about this work</span>' +
                           '<span class="btn--quiet" onclick="closeLightbox()">Close</span>' +
                       '</div>' +
                   '</div>' +
               '</div>' +
           '</div>';
}

var lightbox = mount(
    document.getElementById("lightbox"),
    { work: null, pushed: false },
    lightboxTemplate
);

/* Opening a work gives it its own address (<artist>/<work>); closing
   goes back to the view underneath — by stepping back in history when
   this page opened it, so Back and Close agree. */
function openLightbox(workId) {
    var work = workById(workId);
    if (!work) return;
    lightbox.work = workId;
    lightbox.pushed = ROUTING;
    go(workPath(work));
}

function closeLightbox() {
    if (!lightbox.work) return;
    if (lightbox.pushed) {
        lightbox.pushed = false;
        history.back();                 // popstate → applyRoute shows what was underneath
        return;
    }
    lightbox.work = null;
    go(artist.current ? artistPath(artist.current) : "", true);
}
