#!/bin/bash

node_modules/.bin/uglifyjs \
  dist/codemirror.min.js \
  src/ninja.js \
  --mangle \
  --compress \
  -o dist/ninja.min.js \
  --source-map dist/ninja.min.js.map \
  --source-map-url ninja.min.js.map \
  --source-map-root ../src/ninja.js