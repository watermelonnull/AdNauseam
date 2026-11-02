#!/usr/bin/env bash
#
# This script assumes a linux environment

set -e

DES=dist/build/uAssets

echo "*** Pull assets from remote into $DES"

# Check if the main repository exists
if [ -d "$DES/main/.git" ]; then
    echo "Main repository already exists. Pulling latest changes..."
    git -C "$DES/main" pull
else
    echo "Main repository does not exist. Cloning..."
    git clone --depth 1 --branch master https://github.com/uBlockOrigin/uAssets "$DES/main"
fi

# Check if the prod repository exists
if [ -d "$DES/prod/.git" ]; then
    echo "Prod repository already exists. Pulling latest changes..."
    git -C "$DES/prod" pull
else
    echo "Prod repository does not exist. Cloning..."
    git clone --depth 1 --branch gh-pages https://github.com/uBlockOrigin/uAssets "$DES/prod"
fi