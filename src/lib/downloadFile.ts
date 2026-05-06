import { getAuthToken } from "@/lib/api";

/**
 * Downloads a file from the given URL to the user's machine.
 * Uses fetch + Blob so the browser triggers a real "Save As" download
 * even for cross-origin URLs served by the backend.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
