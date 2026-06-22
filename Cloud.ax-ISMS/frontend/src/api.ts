// Small fetch wrapper. All requests send the session cookie. Errors surface the
// message from the API so the user interface can show it.

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json', ...(options.headers ?? {}) } : options.headers,
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // response had no JSON body
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('content-type') ?? '';
  return (contentType.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}

// Open a download URL. The browser sends the session cookie and the API streams the file.
export function downloadFile(path: string): void {
  window.open(path, '_blank', 'noopener');
}
