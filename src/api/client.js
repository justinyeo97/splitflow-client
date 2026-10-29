const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);
let unauthorizedHandler;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  constructor(message, { status, details, cause } = {}) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, { token, headers, ...options } = {}) {
  if (!API_BASE_URL)
    throw new ApiError(
      "API is not configured. Set VITE_API_BASE_URL to your Express API base URL.",
    );
  const requestHeaders = new Headers(headers);
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    typeof options.body !== "string"
  ) {
    requestHeaders.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.body);
  }
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/${path.replace(/^\//, "")}`, {
      ...options,
      headers: requestHeaders,
    });
  } catch (cause) {
    throw new ApiError(
      "Unable to reach the API. Check your network connection and try again.",
      { cause },
    );
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    if (response.status === 401) unauthorizedHandler?.();
    const message =
      typeof body === "object" && body
        ? body.message || body.error?.message || body.error
        : body;
    const issues = body?.error?.details;
    const validation = Array.isArray(issues)
      ? issues
          .map((issue) => `${issue.path || "Request"}: ${issue.message}`)
          .join("; ")
      : "";
    throw new ApiError(
      validation
        ? `${message}. ${validation}`
        : message || `Request failed (${response.status}).`,
      { status: response.status, details: body },
    );
  }
  return body;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
