/* ---- enquiry — the form for a single work, or for an artist's studio ---- */

function enquiryTemplate(state) {
    if (!state.open) return "";

    var body = state.sent
        ? '<div>' +
              '<p class="enquiry__sent">Sent. You will hear from us within two working days.</p>' +
              '<span class="btn btn--ghost btn--block" onclick="closeEnquiry()">Close</span>' +
          '</div>'
        : '<form class="form" onsubmit="sendEnquiry(event)">' +
              '<input required name="name" placeholder="Name">' +
              '<input required name="email" type="email" placeholder="Email">' +
              '<textarea required name="message" rows="4" placeholder="Your message"></textarea>' +
              honeypot() +
              (state.error ? '<p class="form__error">' + esc(state.error) + '</p>' : '') +
              '<button class="btn btn--solid btn--block" type="submit"' + (state.busy ? ' disabled' : '') + '>' +
                  (state.busy ? 'Sending&hellip;' : 'Send enquiry') + '</button>' +
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
    { open: false, heading: "", sent: false, workId: null, artistId: null, error: "", busy: false },
    enquiryTemplate
);

function showEnquiry(heading, workId, artistId) {
    enquiry.heading = heading;
    enquiry.workId = workId;
    enquiry.artistId = artistId;
    enquiry.sent = false;
    enquiry.error = "";
    enquiry.busy = false;
    enquiry.open = true;
}

function openEnquiry(workId) {
    var work = workById(workId);
    if (!work) return;
    var a = artistOf(work);
    closeLightbox();
    showEnquiry(work.title + " — " + (a ? a.name : ""), work.id, null);
}

function openStudioEnquiry(artistId) {
    var a = loadLocal("artists").filter(function (row) { return row.id === artistId; })[0];
    if (!a) return;
    showEnquiry("Studio enquiry — " + a.name, null, a.id);
}

function sendEnquiry(event) {
    event.preventDefault();
    var f = event.target.elements;

    //online-start
    enquiry.error = "";
    enquiry.busy = true;
    callFunction("enquiry", {
        token: sessionToken(), env: DB_ENV,
        work_id: enquiry.workId, artist_id: enquiry.artistId,
        name: f.name.value, email: f.email.value, message: f.message.value,
        website: f.website.value
    }).then(function () {
        enquiry.busy = false;
        enquiry.sent = true;
    }).catch(function (err) {
        enquiry.busy = false;
        enquiry.error = err && err.status === 429
            ? "You have sent a few already. Please try again in a little while."
            : "That did not send. Check your connection and try again.";
    });
    return;
    //online-end

    // Offline build: the enquiry is acknowledged in the browser only.
    enquiry.sent = true;
}

function closeEnquiry() {
    enquiry.open = false;
    enquiry.sent = false;
}
