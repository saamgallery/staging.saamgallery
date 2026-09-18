/* ============================================================
   demo.js — the offline seed.

   Populates each model's localStorage key with the gallery's current
   roster when the key is missing, so a visitor lands on a populated
   site. It only ever seeds *missing* keys — anything already in the
   browser (a started collection, say) is left alone.

   This is the dev/offline build's data. Once an online build exists it
   reads the real back end instead and this file stays out of its map.
   ============================================================ */

function seedDemo() {
    if (!localStorage.getItem("artists")) {
        saveLocal("artists", [
            { id: 1, name: "Thandi Mokoena", medium: "Oil on linen", based: "Johannesburg",
              instagram: "@thandimokoena",
              short: "Interiors emptied of their people, painted from the light that stays behind.",
              bio: "Mokoena paints rooms after the fact — a chair pushed out, curtains still moving. Her surfaces are built in thin, slow layers so the wall behind the canvas seems to carry on through it." },
            { id: 2, name: "Pieter van Wyk", medium: "Charcoal on paper", based: "Stellenbosch",
              instagram: "@pvw.studio",
              short: "Portraits worked until the paper bruises, then lifted back out with an eraser.",
              bio: "Van Wyk draws one sitter over many weeks. The finished sheets hold every previous attempt beneath them, which is why his faces read as though they are still deciding something." },
            { id: 3, name: "Lerato Nkosi", medium: "Ceramic and glaze", based: "Durban",
              instagram: "@leratomakes",
              short: "Vessels thrown thin enough to lean, glazed in salt and ash.",
              bio: "Nkosi throws forms that sit just past their balance point. The glazes are mixed from river silt and wood ash, so no two firings agree with each other." },
            { id: 4, name: "Ruan Basson", medium: "Cyanotype on cotton", based: "Cape Town",
              instagram: "@ruan.cyan",
              short: "Sunlight printed directly onto cloth on the roof of the gallery.",
              bio: "Basson exposes coated cotton on the gallery roof, sometimes for a full day. Wind, shade and passing gulls all leave their record in the blue." },
            { id: 5, name: "Zanele Mahlangu", medium: "Textile assemblage", based: "Pretoria",
              instagram: "@zanele.assembles",
              short: "Inherited cloth cut down and rebuilt into low, quiet reliefs.",
              bio: "Mahlangu works with cloth from her family and from markets she can name. Cut, stacked and stitched flat, the pieces sit a few centimetres off the wall and cast their own shadow." },
            { id: 6, name: "Kim Oosthuizen", medium: "Pigment on board", based: "Knysna",
              instagram: "@kimoosthuizen",
              short: "Flat fields of hand-ground pigment that change as you walk past them.",
              bio: "Oosthuizen grinds her own pigment and lays it down in single passes on gessoed board. Read straight on, the panels are almost nothing; at an angle they turn." }
        ]);
    }

    if (!localStorage.getItem("works")) {
        saveLocal("works", [
            { id: 1,  artist_id: 1, title: "Afternoon, Held",          year: "2025", medium: "Oil on linen",        size: "140 × 110 cm",   price: 186000, available: true },
            { id: 2,  artist_id: 1, title: "Doorway (Yeoville)",       year: "2024", medium: "Oil on linen",        size: "90 × 70 cm",     price: 124000, available: true },
            { id: 3,  artist_id: 1, title: "Two Chairs",               year: "2024", medium: "Oil on board",        size: "60 × 45 cm",     price: 68000,  available: false },
            { id: 4,  artist_id: 1, title: "Late Sun",                 year: "2023", medium: "Oil on linen",        size: "110 × 110 cm",   price: 142000, available: true },

            { id: 5,  artist_id: 2, title: "Sitter VII",               year: "2025", medium: "Charcoal on paper",   size: "150 × 100 cm",   price: 92000,  available: true },
            { id: 6,  artist_id: 2, title: "Sitter III",               year: "2024", medium: "Charcoal and chalk",  size: "100 × 70 cm",    price: 64000,  available: true },
            { id: 7,  artist_id: 2, title: "Study, Hands",             year: "2024", medium: "Charcoal on paper",   size: "40 × 30 cm",     price: 28000,  available: true },
            { id: 8,  artist_id: 2, title: "Nightwatch",               year: "2023", medium: "Charcoal on paper",   size: "120 × 90 cm",    price: 78000,  available: false },

            { id: 9,  artist_id: 3, title: "Leaning Vessel No. 9",     year: "2025", medium: "Stoneware, ash glaze", size: "52 cm high",    price: 46000,  available: true },
            { id: 10, artist_id: 3, title: "Salt Pair",                year: "2025", medium: "Porcelain, salt glaze", size: "28 cm high",   price: 32000,  available: true },
            { id: 11, artist_id: 3, title: "River Bowl",               year: "2024", medium: "Stoneware",           size: "44 cm diameter", price: 38000,  available: false },
            { id: 12, artist_id: 3, title: "Ash Column",               year: "2024", medium: "Stoneware, ash glaze", size: "68 cm high",    price: 58000,  available: true },

            { id: 13, artist_id: 4, title: "Roof Exposure, 11 Hours",  year: "2025", medium: "Cyanotype on cotton", size: "200 × 150 cm",   price: 74000,  available: true },
            { id: 14, artist_id: 4, title: "Gull",                     year: "2025", medium: "Cyanotype on cotton", size: "80 × 60 cm",     price: 34000,  available: true },
            { id: 15, artist_id: 4, title: "Wind Study",               year: "2024", medium: "Cyanotype on paper",  size: "70 × 50 cm",     price: 26000,  available: true },
            { id: 16, artist_id: 4, title: "Blue Field",               year: "2023", medium: "Cyanotype on cotton", size: "160 × 120 cm",   price: 62000,  available: false },

            { id: 17, artist_id: 5, title: "Household I",              year: "2025", medium: "Cotton, wool, thread", size: "180 × 140 cm",  price: 158000, available: true },
            { id: 18, artist_id: 5, title: "Household II",             year: "2025", medium: "Cotton, linen, thread", size: "180 × 140 cm", price: 158000, available: true },
            { id: 19, artist_id: 5, title: "Small Inheritance",        year: "2024", medium: "Cloth on board",      size: "50 × 40 cm",     price: 42000,  available: true },
            { id: 20, artist_id: 5, title: "Fold",                     year: "2023", medium: "Wool, thread",        size: "120 × 90 cm",    price: 96000,  available: false },

            { id: 21, artist_id: 6, title: "Panel (Ochre)",            year: "2025", medium: "Pigment on board",    size: "120 × 120 cm",   price: 112000, available: true },
            { id: 22, artist_id: 6, title: "Panel (Slate)",            year: "2025", medium: "Pigment on board",    size: "120 × 120 cm",   price: 112000, available: true },
            { id: 23, artist_id: 6, title: "Turn",                     year: "2024", medium: "Pigment on board",    size: "70 × 70 cm",     price: 58000,  available: false },
            { id: 24, artist_id: 6, title: "Quiet Ground",             year: "2024", medium: "Pigment on board",    size: "90 × 90 cm",     price: 74000,  available: true }
        ]);
    }

    // A visitor's held works start empty; the key exists so the model is
    // present from the first load like the others.
    if (!localStorage.getItem("cart_items")) saveLocal("cart_items", []);
}
