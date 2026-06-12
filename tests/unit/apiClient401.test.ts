import { apiClient } from 'client/src/api/client';
import { authController } from '../../client/src/hooks/authController';

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
