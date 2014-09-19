#!/bin/bash

node_modules/.bin/cleancss \
  bower_components/codemirror/lib/codemirror.css \
  -o dist/codemirror.min.css \
  --s0 \
  --debug