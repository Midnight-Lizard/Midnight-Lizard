#!/bin/sh
set -e

ArchPath="../Resources/Releases/midnight-lizard-$1-$(cat ./manifest/$1/manifest.json | jq -r .version).zip";

rm -r -f $ArchPath;

7z a -tzip $ArchPath \
    ./manifest/$1/manifest.json \
    -i!LICENSE \
    -i!README.MD \
    -ir!css/* \
    -ir!img/* \
    -ir!js/* \
    -ir!ui/*