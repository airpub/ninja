#!/bin/bash

# compile core style of ninja editor
node_modules/.bin/cleancss \
  bower_components/codemirror/lib/codemirror.css \
  dist/ninja.css \
  -o dist/ninja.min.css \
  --s0 \
  --debug