#!/bin/bash

# compile stand-alone bundle css with `font-awesome` lib
node_modules/.bin/concat \
  bower_components/fontawesome/css/font-awesome.min.css \
  dist/codemirror.min.css \
  dist/ninja.css \
  -o dist/ninja.bundle.min.css