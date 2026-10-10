/* ---- header — the sticky bar, and the held-works count ---- */

function headerTemplate(state) {
    return '<div class="brand" onclick="goHome()">' +
               brandMark(34) +
               '<span class="brand__word">SAAM</span>' +
           '</div>' +
           '<nav class="nav">' +
               '<span class="nav__link" onclick="goHome()">Artists</span>' +
               '<span class="nav__link" onclick="scrollAbout()">About</span>' +
               '<span class="nav__link" onclick="openCart()">Collection' +
                   '<span class="nav__count">' + esc(state.count) + '</span>' +
               '</span>' +
           '</nav>';
}

var header = mount(
    document.getElementById("site-header"),
    { count: 0 },
    headerTemplate
);
