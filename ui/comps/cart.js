/* ---- cart — the held collection, checkout and confirmation ---- */

function inCart(workId) {
    return cart.items.some(function (row) { return row.work_id === workId; });
}

/* The add-to-collection button, shared with the artist list and the
   lightbox: three states — sold, already held, addable. */
function addButton(work, classes) {
    if (!work.available) {
        return '<span class="' + classes + ' btn--ghost btn--muted">Sold</span>';
    }
    if (inCart(work.id)) {
        return '<span class="' + classes + ' btn--held">In collection</span>';
    }
    return '<span class="' + classes + ' btn--solid" onclick="addToCart(' + work.id + ')">' +
               'Add to collection</span>';
}

function cartLine(row) {
    var work = workById(row.work_id);
    if (!work) return "";
    var a = artistOf(work);
    return '<div class="cart__line">' +
               '<div class="cart__thumb">' + frame(work, "64px", "default") + '</div>' +
               '<div>' +
                   '<p class="cart__title">' + esc(work.title) + '</p>' +
                   '<p class="cart__sub">' + esc(a ? a.name : "") + ' &middot; ' + priceLabel(work) + '</p>' +
               '</div>' +
               '<span class="cart__remove" onclick="removeFromCart(' + row.id + ')">Remove</span>' +
           '</div>';
}

function cartBody(state) {
    if (state.stage === "cart" && state.items.length === 0) {
        return '<p class="cart__empty">Nothing held yet. Add a work from any artist page ' +
               'and it is reserved for 48 hours.</p>';
    }

    if (state.stage === "cart") {
        return '<div>' +
                   state.items.map(cartLine).join("") +
                   '<div class="cart__total"><span>Subtotal</span><span>' + cartTotal() + '</span></div>' +
                   '<p class="cart__note">Crating, insured freight and duties quoted at checkout.</p>' +
                   '<span class="btn btn--solid btn--block" onclick="toCheckout()">Checkout</span>' +
               '</div>';
    }

    if (state.stage === "checkout") {
        return '<form class="form" onsubmit="placeOrder(event)">' +
                   '<p class="cart__sub">' + state.items.length + ' work(s) &middot; ' + cartTotal() + '</p>' +
                   '<input required placeholder="Full name">' +
                   '<input required type="email" placeholder="Email">' +
                   '<input required placeholder="Shipping address">' +
                   '<div class="form__pair">' +
                       '<input required placeholder="City">' +
                       '<input required placeholder="Country">' +
                   '</div>' +
                   '<input required placeholder="Card number" inputmode="numeric">' +
                   '<button class="btn btn--solid btn--block" type="submit">Place order</button>' +
                   '<span class="btn--quiet" onclick="backToCart()">Back to collection</span>' +
               '</form>';
    }

    return '<div>' +
               '<p class="cart__done">Thank you. The works are marked as held.</p>' +
               '<p class="cart__note">A confirmation and freight quote follow by email. ' +
               'The gallery and the artist will both be in touch.</p>' +
               '<span class="btn btn--ghost btn--block" onclick="closeCart()">Back to the gallery</span>' +
           '</div>';
}

function cartTemplate(state) {
    if (!state.open) return "";
    var heading = state.stage === "checkout" ? "Checkout"
                : state.stage === "done"     ? "Confirmed"
                : "Your collection";

    return '<div class="overlay overlay--dark" onclick="closeCart()">' +
               '<aside class="cart" onclick="stopClick(event)">' +
                   '<div class="cart__head">' +
                       '<p class="cart__heading">' + heading + '</p>' +
                       '<span class="btn--quiet" onclick="closeCart()">Close</span>' +
                   '</div>' +
                   cartBody(state) +
               '</aside>' +
           '</div>';
}

var cart = mount(
    document.getElementById("cart"),
    { open: false, stage: "cart", items: [] },
    cartTemplate
);

function cartTotal() {
    return rand(cart.items.reduce(function (sum, row) {
        var work = workById(row.work_id);
        return sum + (work ? work.price : 0);
    }, 0));
}

/* Every mutation writes the model back to its localStorage key, then
   nudges the header — the two mounts stay in step through the data. */
function persistCart() {
    saveLocal("cart_items", cart.items);
    header.count = cart.items.length;
}

function addToCart(workId) {
    var work = workById(workId);
    if (!work || !work.available || inCart(workId)) return;
    cart.items = cart.items.concat([{ id: nextLocalId("cart_items"), work_id: workId }]);
    persistCart();
    cart.stage = "cart";
    cart.open = true;
}

function removeFromCart(rowId) {
    cart.items = cart.items.filter(function (row) { return row.id !== rowId; });
    persistCart();
}

function openCart() {
    if (cart.stage === "done") cart.stage = "cart";
    cart.open = true;
}

function closeCart() {
    // leaving a confirmed order clears the held works and starts over
    if (cart.stage === "done") {
        cart.items = [];
        persistCart();
        cart.stage = "cart";
    }
    cart.open = false;
}

function toCheckout() { cart.stage = "checkout"; }
function backToCart() { cart.stage = "cart"; }

function placeOrder(event) {
    event.preventDefault();
    // Offline build: the order is acknowledged in the browser only. The
    // online build will post it to the back end from here.
    cart.stage = "done";
}
