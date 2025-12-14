# CacheArena

**CacheArena** is a browser extension that caches phone specifications from GSMArena.

⚠️ This is an unofficial extension. Use at your own risk.

## Features

- **Automatic caching**: Extracts and caches phone specifications from GSMArena while you browse
- **Local storage**: All data is stored locally in your browser using the WebExtensions Storage API
- **CSV export**: Export your cached phone data as CSV for analysis

## Installation

Download the latest release from the [releases page](https://github.com/dbeley/cachearena/releases).

## How It Works

### Data Collection

Visit phone specification pages on [GSMArena](https://www.gsmarena.com) and the extension will automatically extract and cache phone data including:

- Brand and model
- Dimensions, weight, and build materials
- Display specifications
- Operating system and chipset
- Memory and storage
- Camera specifications
- Battery capacity and charging
- Colors and pricing

### Data Storage

All data is stored locally in your browser. Nothing is sent to external servers.

### Data Export

The extension provides functionality to export your cached data as CSV (accessible via browser's extension storage API).

## Development

### Build

```bash
npm install
npm run build
```

This creates `.xpi` (Firefox) and `.zip` (Chrome) packages in the `build/` directory.

### Development Mode

Load the extension temporarily in Firefox:

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `cachearena/manifest.json`
