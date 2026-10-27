export class ServiceError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    this.code = code;
  }
}

export async function request<T>(base: string, path: string, init: RequestInit = {}): Promise<{ data: T; headers: Headers }> {
  if (!base) throw new ServiceError('Service base URL is not configured.');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers: { Accept: 'application/json', ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...init.headers },
    });
    const text = await response.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) {
      const message = body?.error?.message ?? body?.detail ?? body?.error ?? `The service returned HTTP ${response.status}.`;
      throw new ServiceError(String(message), response.status, body?.error?.code);
    }
    return { data: body as T, headers: response.headers };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new ServiceError('The request timed out. Try again.');
    throw new ServiceError('Service is unavailable. Check the connection and try again.');
  } finally {
    window.clearTimeout(timeout);
  }
}
