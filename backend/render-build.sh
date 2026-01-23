#!/usr/bin/env bash
# Render build script for ACTA-AI backend with Puppeteer support

echo "Installing dependencies..."
npm install

echo "Installing Puppeteer browsers..."
npx puppeteer browsers install chrome

echo "Build complete!"
