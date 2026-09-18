/* ---- enquiry — the form for a single work, or for an artist's studio ---- */

function enquiryTemplate(state) {
    if (!state.open) return "";

    var body = state.sent
        ? '<div>' +
              '<p class="enquiry__sent">Sent. You will hear from us within two working days.</p>' +
              '<span class="btn btn--ghost btn--block" onclick="closeEnquiry()">Close</span>' +
          '</div>'
        : '<form class="form" onsubmit="sendEnquiry(event)">' +
              '<input required placeholder="Name">' +
              '<input required type="email" placeholder="Email">' +
              '<textarea required rows="4" placeholder="Your message"></textarea>' +
              '<button class="btn btn--solid btn--block" type="submit">Send enquiry</button>' +
              '<span class="btn--quiet" onclick="closeEnquiry()">Cancel</span>' +
          '</form>';

    return '<div class="overlay overlay--dark overlay--center" onclick="closeEnquiry()">' +
               '<div class="enquiry fade" onclick="stopClick(event)">' +
                   '<p class="eyebrow">Enquiry</p>' +
                   '<p class="enquiry__heading">' + esc(state.heading) + '</p>' +
                   body +
               '</div>' +
           '</div>';
}

var enquiry = mount(
    document.getElementById("enquiry"),
    { open: false, heading: "", sent: false },
    enquiryTemplate
);

function showEnquiry(heading) {
    enquiry.heading = heading;
    enquiry.sent = false;
    enquiry.open = true;
}

function openEnquiry(workId) {
    var work = workById(workId);
    if (!work) return;
    var a = artistOf(work);
    closeLightbox();
    showEnquiry(work.title + " — " + (a ? a.name : ""));
}

function openStudioEnquiry(artistId) {
    var a = loadLocal("artists").filter(function (row) { return row.id === artistId; })[0];
    if (!a) return;
    showEnquiry("Studio enquiry — " + a.name);
}

function sendEnquiry(event) {
    event.preventDefault();
    // Offline build: the enquiry is acknowledged in the browser only. The
    // online build will post it to the back end from here.
    enquiry.sent = true;
}

function closeEnquiry() {
    enquiry.open = false;
    enquiry.sent = false;
}
