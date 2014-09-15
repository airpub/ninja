#!/bin/bash

node_modules/.bin/uglifyjs \
  bower_components/codemirror/lib/codemirror.js \
  bower_components/codemirror/mode/markdown/markdown.js \
  bower_components/codemirror/mode/xml/xml.js \
  bower_components/codemirror/mode/css/css.js \
  bower_components/codemirror/mode/javascript/javascript.js \
  bower_components/codemirror/mode/htmlmixed/htmlmixed.js \
  bower_components/codemirror/addon/edit/continuelist.js \
  bower_components/codemirror/addon/edit/closebrackets.js \
  src/javascript/ninja.js \
  shuriken/upload.js \
  --mangle \
  --compress \
  -o dist/ninja.min.js \
  --source-map dist/ninja.min.js.map \
  --source-map-url ninja.min.js.map \
  --source-map-root ../src/ninja.js