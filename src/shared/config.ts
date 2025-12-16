/**
 * Configuration constants for the extension
 */

import type { Settings } from "../types";

export interface SourceConfig {
  id: string;
  label: string;
  storageKey: string;
  mediaType: string;
  hosts: string[];
}

export const SOURCES: Record<string, SourceConfig> = {
  phones: {
    id: "phones",
    label: "GSMArena phones",
    storageKey: "gsmarena-phones::records",
    mediaType: "phone",
    hosts: ["gsmarena.com", "www.gsmarena.com"],
  },
};

export const DEFAULT_SETTINGS: Settings = {
  sources: Object.fromEntries(Object.values(SOURCES).map((src) => [src.mediaType, true])),
};
