# ============================================================
#  SAAM — single-file build (unframe method)
#
#  The composer (make/tpl.mk) streams ui/layout.html and inlines
#  the CSS and every JS file into one static ui/dist/index.html —
#  no bundler, no npm, just make + awk. That single file plus
#  ui/img is what GitHub Pages serves.
#
#  There is one target because there is one build: `dev`, the
#  in-browser offline site backed by localStorage. When the gallery
#  needs a real back end, the online paths go behind //online
#  markers and `stg`/`prd` targets join it — not before. See README.
# ============================================================

BUILD_DIR := ui/dist
SRC       := ui/layout.html
MAP       := make/web.map
JS_MAP    := make/js.map
COMPS     := $(wildcard ui/comps/*.js)
IMGS      := $(wildcard ui/img/*)

# the compose macro (vendored from the unframe kit; no submodule needed)
include make/tpl.mk

.PHONY: all dev clean

all: dev

## dev — offline single-file build, seeded from ui/demo.js
dev: $(SRC) ui/layout.css ui/layout.js ui/reactivity.js ui/demo.js $(COMPS) $(MAP) $(JS_MAP)
	@mkdir -p $(BUILD_DIR)/img
	$(call compose,ui/layout.js,$(JS_MAP),$(BUILD_DIR)/index.js)
	$(call compose,$(SRC),$(MAP),$(BUILD_DIR)/index.html)
	@cp $(IMGS) $(BUILD_DIR)/img/
	@echo "dev: offline build → $(BUILD_DIR)/index.html"

## clean — remove the generated output
clean:
	@rm -rf $(BUILD_DIR)
