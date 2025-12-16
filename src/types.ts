/**
 * Common types used across the CacheArena extension
 */

export interface PhoneRecord {
  mediaType: string;
  sourceId: string;
  slug: string;
  brand: string;
  model: string;
  announced: string;
  status: string;
  dimensions: string;
  weight: string;
  build: string;
  sim: string;
  displayType: string;
  displaySize: string;
  displayResolution: string;
  os: string;
  chipset: string;
  memory: string;
  mainCamera: string;
  selfieCamera: string;
  battery: string;
  charging: string;
  colors: string;
  price: string;
  image: string;
  url: string;
  updatedAt: string;
  firstSeen: string;
}

export interface Cache {
  entries: PhoneRecord[];
  index: Record<string, PhoneRecord>;
  lastSync: number;
  source: string;
}

export interface Settings {
  sources: Record<string, boolean>;
}

export interface MessageBase {
  type: string;
}

export interface CacheUpdateMessage extends MessageBase {
  type: "gsmarena-cache-update";
  records: PhoneRecord[];
  source: string;
  mediaType: string;
}

export interface CacheRequestMessage extends MessageBase {
  type: "gsmarena-cache-request";
}

export interface SettingsGetMessage extends MessageBase {
  type: "gsmarena-settings-get";
}

export interface SettingsSetMessage extends MessageBase {
  type: "gsmarena-settings-set";
  settings: Settings;
}

export interface CacheExportMessage extends MessageBase {
  type: "gsmarena-cache-export";
}

export interface CacheClearMessage extends MessageBase {
  type: "gsmarena-cache-clear";
}

export type Message =
  | CacheUpdateMessage
  | CacheRequestMessage
  | SettingsGetMessage
  | SettingsSetMessage
  | CacheExportMessage
  | CacheClearMessage;

export interface ExportResult {
  ok: boolean;
  mode?: "downloads" | "inline";
  downloadId?: number;
  filename?: string;
  csv?: string;
  count: number;
  lastSync: number | null;
  reason?: string;
  error?: string;
}

export interface UpdateResult {
  ok: boolean;
  count?: number;
  skipped?: boolean;
}

export interface ClearResult {
  ok: boolean;
  error?: string;
}
