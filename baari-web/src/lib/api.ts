import { useSession } from "@/store/session";

/**
 * API_BASE_URL is intentionally empty — all /api/* requests are relative
 * and hit baari-web's own domain, which Next.js rewrites proxies to the
 * backend server-side. This makes cookies same-origin (fixes Safari ITP).
 */
export const API_BASE_URL = "";

/**
 * Socket.io still needs a direct connection to the backend (WebSocket
 * proxying through Next.js rewrites has limitations). This URL is only
 * used by socket.ts for the io() connection, not for cookie-bearing
 * HTTP requests.
 */
export const SOCKET_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://baari-wkqq.onrender.com"
).replace(/\/+$/, "");

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...customConfig } = options;

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let url = `${API_BASE_URL}${cleanEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const token = useSession.getState().token;
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  const docCookie = typeof document !== "undefined" ? document.cookie : "N/A (SSR)";
  const hasSessionCookie = docCookie.includes("better-auth.session_token");

  console.log(`[Cookie Proxy Request] ${options.method || 'GET'} ${url}`, {
    credentials: "include",
    browserHasCookieHeader: hasSessionCookie,
    cookieSnippet: docCookie ? (docCookie.length > 50 ? `${docCookie.substring(0, 50)}...` : docCookie) : "NONE",
    hasAuthToken: !!token,
  });

  try {
    response = await fetch(url, {
      credentials: "include",
      ...customConfig,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });
  } catch (err: any) {
    const isNetworkError =
      err?.name === "TypeError" ||
      err?.message?.includes("Failed to fetch") ||
      err?.message?.includes("NetworkError") ||
      err?.message?.includes("network") ||
      (typeof navigator !== "undefined" && !navigator.onLine);

    if (isNetworkError) {
      throw new ApiError("Check your connection and try again", 0, { networkError: true });
    }
    throw err;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  console.log(`[Cookie Proxy Response] ${options.method || 'GET'} ${url}`, {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    setCookieHeader: response.headers.get("set-cookie") ? "present" : "none/hidden",
  });

  if (!response.ok) {
    if (response.status === 401) {
      useSession.getState().logout().catch(() => {});
    }
    const errorMessage =
      data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T = any>(
    endpoint: string,
    params?: Record<string, any>,
    options?: RequestOptions
  ) => apiRequest<T>(endpoint, { method: "GET", params, ...options }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: "DELETE", ...options }),
};
