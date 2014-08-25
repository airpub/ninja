#!/bin/bash

node_modules/.bin/uglifyjs \
  bower_components/codemirror/lib/codemirror.js \
  --mangle \
  --compress \
  -o dist/codemirror.min.js \
  --source-map dist/codemirror.min.js.map \
  --source-map-url codemirror.min.js.map \
  --source-map-root ../bower_components/codemirror/lib/codemirror.js