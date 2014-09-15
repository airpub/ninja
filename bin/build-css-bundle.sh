#!/bin/bash

# compile stand-alone bundle css with `font-awesome` lib
node_modules/.bin/cleancss \
  bower_components/fontawesome/css/font-awesome.min.css \
  bower_components/codemirror/lib/codemirror.css \
  dist/ninja.css \
  -o dist/ninja.bundle.min.css \
  --s0 \
  --debug