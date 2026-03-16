/**
 * Tauri bridge utilities for the ShortcutGenius desktop app.
 *
 * When running inside Tauri the global `window.__TAURI__` object is
 * injected by the Rust shell (`withGlobalTauri: true` in tauri.conf.json).
 * These helpers degrade gracefully when running as a plain web app.
 */

import { invoke } from "@tauri-apps/api/core";

/** True when the app is running inside the Tauri desktop shell. */
export function isTauriApp(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Returns the base URL of the backend API server.
 *
 * - Inside the Tauri shell: calls the Rust `get_api_base_url` command so the
 *   frontend always uses the correct address even if the port is overridden.
 * - In a normal browser: returns an empty string so all fetch calls use
 *   relative URLs (e.g. `/api/process`).
 */
export async function getApiBaseUrl(): Promise<string> {
  if (!isTauriApp()) return "";
  try {
    return await invoke<string>("get_api_base_url");
  } catch {
    // Graceful fallback – the server should always be on the default port.
    return "http://localhost:4321";
  }
}
