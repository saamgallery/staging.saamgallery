# ============================================================
#  SAAM — single-file build (unframe method)
#
#  The composer (make/tpl.mk) streams ui/layout.html and inlines
#  the CSS and every JS file into one static ui/dist/index.html —
#  no bundler, no npm, just make + awk + sed. That single file plus
#  ui/img is what GitHub Pages serves.
#
#    dev  offline: the //online code is stripped, the site runs from
#         localStorage seeded by ui/demo.js. The local preview.
#    stg  online: Supabase behind every //online block, rows stamped
#         env=0, no demo seed, kept out of search. What staging serves.
#         The studio opens on the staging-only artist picker.
#    prd  online, env=1, indexable. //staging lines are stripped, so
#         the studio always asks the artist to sign in. For the
#         production repo, when there is one.
# ============================================================

BUILD_DIR := ui/dist
SRC       := ui/layout.html
MAP       := make/web.map
JS_MAP    := make/js.map
STG_MAP   := $(BUILD_DIR)/js.stg.map
COMPS     := $(wildcard ui/comps/*.js)
IMGS      := $(wildcard ui/img/*)
DEPS      := $(SRC) ui/layout.css ui/layout.js ui/reactivity.js ui/demo.js $(COMPS) $(MAP) $(JS_MAP)

# Where each build is served from — written into <base href>, which is
# what the router and every relative URL resolve against. dev assumes
# Live Server at the repo root; staging is the github.io project site.
# Override per run, e.g. `make stg BASE=/` once staging has its domain.
dev: BASE ?= /ui/dist/
stg: BASE ?= /staging.saamgallery/
prd: BASE ?= /

# The page is also published as 404.html: GitHub Pages serves that for
# any path it has no file for, so /<artist>/<work> loads the site and
# the router opens the right view.
define finish_html
	@sed -i 's#{{base}}#$(BASE)#' $(BUILD_DIR)/index.html
	@cp $(BUILD_DIR)/index.html $(BUILD_DIR)/404.html
endef

# the compose macro (vendored from the unframe kit; no submodule needed)
include make/tpl.mk

.PHONY: all dev stg prd clean

all: dev

## dev — offline single-file build, seeded from ui/demo.js
dev: $(DEPS)
	@mkdir -p $(BUILD_DIR)/img
	$(call compose,ui/layout.js,$(JS_MAP),$(BUILD_DIR)/index.js)
	@sed -i '/\/\/online-start/,/\/\/online-end/d; /\/\/online$$/d' $(BUILD_DIR)/index.js
	$(call compose,$(SRC),$(MAP),$(BUILD_DIR)/index.html)
	$(finish_html)
	@rm -f $(BUILD_DIR)/robots.txt
	@cp $(IMGS) $(BUILD_DIR)/img/
	@echo "dev: offline build → $(BUILD_DIR)/index.html"

## stg — online build against Supabase, for the staging site
stg: $(DEPS)
	@mkdir -p $(BUILD_DIR)/img
	@grep -v 'demo-js' $(JS_MAP) > $(STG_MAP)
	$(call compose,ui/layout.js,$(STG_MAP),$(BUILD_DIR)/index.js)
	@rm -f $(STG_MAP)
	@sed -i 's/^\(var DB_ENV *= *\)1;/\10;/' $(BUILD_DIR)/index.js
	$(call compose,$(SRC),$(MAP),$(BUILD_DIR)/index.html)
	$(finish_html)
	@sed -i 's#<meta name="robots" content="[^"]*">#<meta name="robots" content="noindex, nofollow">#' $(BUILD_DIR)/index.html $(BUILD_DIR)/404.html
	@printf 'User-agent: *\nDisallow: /\n' > $(BUILD_DIR)/robots.txt
	@cp $(IMGS) $(BUILD_DIR)/img/
	@echo "stg: online build (env=0) → $(BUILD_DIR)/index.html"

## prd — online build for production: sign-in only, no picker
prd: $(DEPS)
	@mkdir -p $(BUILD_DIR)/img
	@grep -v 'demo-js' $(JS_MAP) > $(STG_MAP)
	$(call compose,ui/layout.js,$(STG_MAP),$(BUILD_DIR)/index.js)
	@rm -f $(STG_MAP)
	@sed -i '/\/\/staging$$/d' $(BUILD_DIR)/index.js
	$(call compose,$(SRC),$(MAP),$(BUILD_DIR)/index.html)
	$(finish_html)
	@printf 'User-agent: *\nAllow: /\n' > $(BUILD_DIR)/robots.txt
	@cp $(IMGS) $(BUILD_DIR)/img/
	@echo "prd: online build (env=1) → $(BUILD_DIR)/index.html"

## clean — remove the generated output
clean:
	@rm -rf $(BUILD_DIR)
