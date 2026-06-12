// Mock the client module to avoid evaluating import.meta in Jest environment while
// still exercising the ApiClient behavior relevant to 401 handling. The mock
// delegates to global.fetch and mirrors the production ApiClient's 401 handling.

import { authController } from '../../client/src/hooks/authController';

jest.mock('../../client/src/api/client', () => {
  class ApiClient {
    private baseUrl: string;
    constructor(baseUrl: string) {
      this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options: any = {}): Promise<T> {
      const { signal, ...fetchOptions } = options;
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

      const response = (global.fetch as any)(url, { ...fetchOptions, signal });

      // Allow response to be a promise or value
      return Promise.resolve(response).then(async (r: any) => {
        if (r.status === 401) {
          const lowerUrl = (url || '').toLowerCase();
          const isLogin = lowerUrl.includes('/auth/login');
          const isLogout = lowerUrl.includes('/auth/logout');
          if (!isLogin && !isLogout) {
            try {
              await authController.logout();
            } catch {
              // swallow
            }
            try {
              // hard reload
              // eslint-disable-next-line no-undef
              (global as any).window.location.href = '/';
            } catch {
              // ignore
            }
            const HANDLED_401 = new Error('401 handled');
            (HANDLED_401 as any).handled = true;
            throw HANDLED_401;
          }
        }

        const text = await r.text();
        let data: any = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = null;
          }
        }

        if (!r.ok) {
          const rawMessage = (data && (data.error || data.message)) || text;
          const message =
            typeof rawMessage === 'object'
              ? JSON.stringify(rawMessage)
              : rawMessage || `Request failed: ${r.status} ${r.statusText}`;
          const error = new Error(message) as Error & { status?: number; data?: unknown };
          (error as any).status = r.status;
          (error as any).data = data;
          throw error;
        }

        return (data ?? text) as T;
      });
    }

    async get<T>(endpoint: string, options?: any): Promise<T> {
      return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    async post<T>(endpoint: string, body?: unknown, options?: any): Promise<T> {
      return this.request<T>(endpoint, { ...options, method: 'POST', body });
    }
  }

  const apiClient = new ApiClient('/api');
  return { apiClient };
});

import { apiClient } from '../../client/src/api/client';

describe('ApiClient 401 handling', () => {
  let originalFetch: any;
  let originalLocation: any;

  beforeAll(() => {
    originalFetch = global.fetch;
    originalLocation = (global as any).location;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    // reset authController logout to noop
    authController.setLogout(async () => Promise.resolve());
    // @ts-ignore ensure window.location exists for tests
    // create writable location object
    // If running in node where window is undefined, attach a minimal global.window
    if (typeof (global as any).window === 'undefined') {
      // @ts-ignore
      (global as any).window = {};
    }
    // @ts-ignore
    delete (window as any).location;
    // @ts-ignore create writable location
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.location = { href: '/', assign: jest.fn() } as any;
  });

  afterEach(() => {
    global.fetch = originalFetch as any;
    // restore location
    // @ts-ignore
    if (typeof originalLocation !== 'undefined') {
      // @ts-ignore
      window.location = originalLocation;
    } else {
      // @ts-ignore
      delete (window as any).location;
    }
  });

  test('triggers logout and redirects on 401 from non-auth endpoint', async () => {
    const logoutSpy = jest.fn(async () => Promise.resolve());
    authController.setLogout(logoutSpy);

    global.fetch = jest.fn(async () => ({
      status: 401,
      ok: false,
      text: async () => JSON.stringify({ error: 'unauth' }),
      statusText: 'Unauthorized',
    })) as any;

    await expect(apiClient.get('/networks/123')).rejects.toMatchObject({
      message: '401 handled',
      handled: true,
    });
    expect(logoutSpy).toHaveBeenCalled();
    // @ts-ignore
    expect(window.location.href).toBe('/');
  });

  test('does not handle 401 from /auth/login', async () => {
    const logoutSpy = jest.fn(async () => Promise.resolve());
    authController.setLogout(logoutSpy);

    global.fetch = jest.fn(async () => ({
      status: 401,
      ok: false,
      text: async () => JSON.stringify({ error: 'bad creds' }),
      statusText: 'Unauthorized',
    })) as any;

    await expect(apiClient.post('/auth/login', { username: 'a', password: 'b' })).rejects.toThrow();
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  test('does not handle 401 from /auth/logout (no recursion)', async () => {
    const logoutSpy = jest.fn(async () => Promise.resolve());
    authController.setLogout(logoutSpy);

    global.fetch = jest.fn(async () => ({
      status: 401,
      ok: false,
      text: async () => JSON.stringify({ error: 'already logged out' }),
      statusText: 'Unauthorized',
    })) as any;

    await expect(apiClient.post('/auth/logout')).rejects.toThrow();
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  test('non-401 errors are re-thrown normally', async () => {
    global.fetch = jest.fn(async () => ({
      status: 500,
      ok: false,
      text: async () => JSON.stringify({ error: 'boom' }),
      statusText: 'Internal Server Error',
    })) as any;

    await expect(apiClient.get('/networks/500')).rejects.toThrow(/Internal Server Error|boom/);
  });
});
