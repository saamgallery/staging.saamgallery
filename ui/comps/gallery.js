/* ---- gallery — the home view: hero, one row per artist, about ---- */

/* Each artist row shows three works at staggered heights, the way the
   design hangs them: tall, short-and-dropped, middling. */
var ROW_SHAPE = [
    { height: 376, offset: 0 },
    { height: 238, offset: 104 },
    { height: 312, offset: 40 }
];

function galleryHero() {
    return '<section class="hero">' +
               '<p class="eyebrow">Cape Town &middot; est. 2019 &middot; together</p>' +
               '<h1 class="hero__title">A gallery held <em>together</em>.</h1>' +
               '<p class="hero__lede">Six artists, one room. Every work here hangs in the ' +
               'physical gallery and is available to acquire or enquire after.</p>' +
           '</section>';
}

function galleryRow(artist, index) {
    var works = worksOf(artist.id).slice(0, 3);

    var wall = works.map(function (work, i) {
        var shape = ROW_SHAPE[i] || ROW_SHAPE[0];
        return '<div class="wall__work" style="margin-top:' + shape.offset + 'px">' +
                   '<div onclick="openLightbox(' + work.id + ')">' +
                       frame(work, shape.height + "px", "pointer") +
                   '</div>' +
                   '<p class="caption"><em>' + esc(work.title) + '</em>, ' + esc(work.year) +
                       '<br>' + priceLabel(work) + '</p>' +
               '</div>';
    }).join("");

    return '<section class="row">' +
               '<div class="row__intro">' +
                   '<p class="row__number">' + esc(String(index + 1).padStart(2, "0")) + '</p>' +
                   '<h2 class="row__name">' + esc(artist.name) + '</h2>' +
                   '<p class="row__medium">' + esc(artist.medium) + '</p>' +
                   '<p class="row__short">' + esc(artist.short) + '</p>' +
                   '<span class="underlined" onclick="openArtist(' + artist.id + ')">View artist</span>' +
               '</div>' +
               '<div class="wall">' + wall + '</div>' +
           '</section>';
}

function galleryAbout() {
    return '<section class="about" id="saam-about">' +
               '<p class="eyebrow">About saam</p>' +
               '<div>' +
                   '<p class="about__lead">Saam means together. The gallery is a shared wall ' +
                   'rather than a roster.</p>' +
                   '<p class="about__body">Works are hung in rotation and shipped worldwide, ' +
                   'crated and insured. Enquiries are answered by the artist and the gallery ' +
                   'together, usually within two days.</p>' +
               '</div>' +
           '</section>';
}

function galleryTemplate(state) {
    if (!state.visible) return "";
    return galleryHero() + state.artists.map(galleryRow).join("") + galleryAbout();
}

var gallery = mount(
    document.getElementById("gallery"),
    { visible: true, artists: [] },
    galleryTemplate
);
