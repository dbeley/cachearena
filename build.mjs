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

const watchMode = process.argv.includes("--watch");

const buildOptions = {
  bundle: true,
  format: "iife",
  target: "es2020",
  sourcemap: false,
  minify: false,
  logLevel: "info",
};

const entryPoints = [
  {
    in: join(__dirname, "src/background.ts"),
    out: join(__dirname, "cachearena/background"),
  },
  {
    in: join(__dirname, "src/popup.ts"),
    out: join(__dirname, "cachearena/popup"),
  },
  {
    in: join(__dirname, "src/content/data-extract.ts"),
    out: join(__dirname, "cachearena/content/data-extract"),
  },
];

async function build() {
  try {
    if (watchMode) {
      console.log("👀 Watch mode enabled...");
      const contexts = [];

      for (const entry of entryPoints) {
        const ctx = await esbuild.context({
          ...buildOptions,
          entryPoints: [entry.in],
          outfile: entry.out + ".js",
        });
        contexts.push(ctx);
        await ctx.watch();
      }

      console.log("✓ Watching for changes...");

      // Keep process running
      await new Promise(() => {});
    } else {
      for (const entry of entryPoints) {
        await esbuild.build({
          ...buildOptions,
          entryPoints: [entry.in],
          outfile: entry.out + ".js",
        });
      }

      console.log("✓ Build complete!");
    }
  } catch (error) {
    console.error("✗ Build failed:", error);
    process.exit(1);
  }
}

build();
