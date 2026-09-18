/* ---- header — the sticky bar, and the held-works count ---- */

function headerTemplate(state) {
    return '<div class="brand" onclick="goHome()">' +
               '<svg width="34" height="34" viewBox="0 0 100 100" fill="currentColor" role="img" aria-label="SAAM">' +
                   '<circle cx="41" cy="16" r="9" /><rect x="33" y="29" width="16" height="13" />' +
                   '<circle cx="62" cy="21" r="8.5" /><rect x="55" y="33" width="15" height="12" />' +
                   '<circle cx="20" cy="31" r="14" /><rect x="8" y="50" width="24" height="42" />' +
                   '<circle cx="80" cy="31" r="14" /><rect x="68" y="52" width="24" height="40" />' +
                   '<circle cx="50" cy="52" r="16" /><rect x="38" y="74" width="24" height="26" />' +
                   '<rect x="26" y="70" width="9" height="20" /><rect x="65" y="68" width="9" height="22" />' +
               '</svg>' +
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
