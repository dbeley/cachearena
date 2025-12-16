#!/usr/bin/env node

/**
 * Build script for CacheArena extension
 * Bundles TypeScript files into single JavaScript files for browser extension
 */

import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildOptions = {
  bundle: true,
  format: "iife",
  target: "es2020",
  sourcemap: false,
  minify: false,
  logLevel: "info",
};

async function build() {
  try {
    // Background script
    await esbuild.build({
      ...buildOptions,
      entryPoints: [join(__dirname, "src/background.ts")],
      outfile: join(__dirname, "cachearena/background.js"),
    });

    // Popup script
    await esbuild.build({
      ...buildOptions,
      entryPoints: [join(__dirname, "src/popup.ts")],
      outfile: join(__dirname, "cachearena/popup.js"),
    });

    // Content script
    await esbuild.build({
      ...buildOptions,
      entryPoints: [join(__dirname, "src/content/data-extract.ts")],
      outfile: join(__dirname, "cachearena/content/data-extract.js"),
    });

    console.log("✓ Build complete!");
  } catch (error) {
    console.error("✗ Build failed:", error);
    process.exit(1);
  }
}

build();
