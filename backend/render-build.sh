#!/usr/bin/env bash
# Render build script for ACTA-AI backend with Puppeteer support

echo "Installing dependencies..."
npm install

echo "Installing Chromium for Puppeteer..."
node node_modules/puppeteer/install.js

echo "Build complete!"
