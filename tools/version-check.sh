#!/bin/bash

# Make sure you have jq installed AND be on the folder where 'adnauseam.chromium' is located

# Path to the adnauseam.chromium directory
EXTENSION_DIR="adnauseam.chromium"

# Path to the manifest.json file
MANIFEST_FILE="$EXTENSION_DIR/manifest.json"

# Check if the directory exists
if [ -d "$EXTENSION_DIR" ]; then
    # Get the current version from the manifest file
    CURRENT_VERSION=$(jq -r .version "$MANIFEST_FILE")
    CURRENT_VERSION="v$CURRENT_VERSION"
    echo "Current version: $CURRENT_VERSION"

    # Replace URL with the actual URL you want to use
    URL="https://api.github.com/repos/dhowe/AdNauseam/releases/latest"

    # Get the latest release information using curl and jq
    LATEST_RELEASE=$(curl -s "$URL" | jq -r '.tag_name')

    # Check if the latest version is different from the current version
    if [ "$LATEST_RELEASE" != "$CURRENT_VERSION" ]; then
        echo "Updating AdNauseam extension..."

        # Download and extract the latest release
        curl -L -o "$EXTENSION_DIR.zip" "https://github.com/dhowe/AdNauseam/releases/download/$LATEST_RELEASE/adnauseam.chromium.zip"
        unzip -q "$EXTENSION_DIR.zip" -d "./"
        rm "$EXTENSION_DIR.zip"

        echo "Update complete. Installed version: $LATEST_RELEASE"
    else
        echo "AdNauseam is already up to date. Installed version: $CURRENT_VERSION"
    fi
else
    echo "AdNauseam extension directory not found. Please make sure it is installed."
fi