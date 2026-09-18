/* ============================================================
   reactivity.js — the unframe reactive core.

   Two primitives, no framework, no dependencies:

     reactive(obj, onChange)   wrap an object (and its nested objects
                               and arrays) in a Proxy; any set/delete
                               calls onChange. The `_draft` key is
                               exempt — it holds in-flight edit text
                               that must not force a re-render.

     mount(root, state, tpl)   create a reactive state object, render
                               tpl(state) into root.innerHTML, and
                               re-render on every mutation. Returns the
                               reactive object; assigning to it *is*
                               how the UI updates.

   Templates are pure string builders: state in, HTML string out, never
   touching the DOM. render() owns innerHTML.
   ============================================================ */

function reactive(obj, onChange) {
    if (obj === null || typeof obj !== "object") return obj;

    // wrap nested objects/arrays up front so deep mutations notify too
    Object.keys(obj).forEach(function (key) {
        if (key !== "_draft" && obj[key] !== null && typeof obj[key] === "object") {
            obj[key] = reactive(obj[key], onChange);
        }
    });

    return new Proxy(obj, {
        set: function (target, key, value) {
            if (key !== "_draft" && value !== null && typeof value === "object") {
                value = reactive(value, onChange);
            }
            var previous = target[key];
            target[key] = value;
            // `length` fires alongside the element write on array pushes;
            // skipping it keeps one mutation to one render.
            if (key !== "_draft" && previous !== value && key !== "length") onChange();
            return true;
        },
        deleteProperty: function (target, key) {
            delete target[key];
            if (key !== "_draft") onChange();
            return true;
        }
    });
}

function mount(root, state, templateFn) {
    var scheduled = false;

    function render() {
        if (!root) return;
        root.innerHTML = templateFn(data);
    }

    // Coalesce a burst of mutations in one handler into a single render.
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        Promise.resolve().then(function () {
            scheduled = false;
            render();
        });
    }

    var data = reactive(state, schedule);
    render();
    return data;
}

/* HTML-escape anything that came from data, so a title with an
   ampersand or a quote can never break out of the markup. */
function esc(value) {
    return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
