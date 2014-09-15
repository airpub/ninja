#!/bin/bash

# compile core style of ninja editor
node_modules/.bin/concat \
  dist/codemirror.min.css \
  dist/ninja.css \
  -o dist/ninja.min.css