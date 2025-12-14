#!/usr/bin/env bash

# Build script for CacheArena browser extension
# Creates installable packages for Firefox (.xpi) and Chrome (.zip)

set -e

# Check for required tools
if ! command -v zip &> /dev/null; then
    echo "Error: 'zip' command not found."
    echo ""
    echo "Please install zip:"
    echo "  - Debian/Ubuntu: sudo apt-get install zip"
    echo "  - Fedora/RHEL:   sudo dnf install zip"
    echo "  - macOS:         brew install zip"
    echo "  - NixOS:         nix-shell -p zip"
    echo "  - Arch Linux:    sudo pacman -S zip"
    exit 1
fi

EXTENSION_DIR="cachearena"
BUILD_DIR="build"
TEMP_BUILD_DIR="$BUILD_DIR/temp"
VERSION=$(grep -oP '"version":\s*"\K[^"]+' "$EXTENSION_DIR/manifest.json")

echo "Building CacheArena v$VERSION..."

# Create build directories
mkdir -p "$BUILD_DIR"
mkdir -p "$TEMP_BUILD_DIR"

# Clean previous builds
rm -f "$BUILD_DIR"/*.xpi "$BUILD_DIR"/*.zip
rm -rf "$TEMP_BUILD_DIR"/*

# Copy extension files to temp build directory
echo "Copying extension files..."
cp -r "$EXTENSION_DIR"/* "$TEMP_BUILD_DIR/"

# Firefox .xpi (signed package)
echo "Creating Firefox .xpi package..."
cd "$TEMP_BUILD_DIR"
zip -r -FS "../cachearena-$VERSION.xpi" . \
  -x "web-ext-artifacts/*" "*.git*" "*.DS_Store" "*~"
cd ../..

# Chrome .zip (for manual installation in developer mode)
echo "Creating Chrome .zip package..."
cd "$TEMP_BUILD_DIR"
zip -r -FS "../cachearena-$VERSION-chrome.zip" . \
  -x "web-ext-artifacts/*" "*.git*" "*.DS_Store" "*~"
cd ../..

# Clean up temp directory
echo "Cleaning up..."
rm -rf "$TEMP_BUILD_DIR"

echo ""
echo "Build complete!"
echo "  Firefox package: $BUILD_DIR/cachearena-$VERSION.xpi"
echo "  Chrome package:  $BUILD_DIR/cachearena-$VERSION-chrome.zip"
