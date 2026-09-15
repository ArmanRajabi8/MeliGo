// The production container serves the Angular app and API from the same origin.
export const API_BASE_URL = "";

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
