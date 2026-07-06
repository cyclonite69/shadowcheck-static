import type { APIRequestContext, BrowserContext } from '@playwright/test';

/**
 * Authenticate as admin via the API and plant the session cookie into the
 * browser context so every subsequent page.goto() is already logged in.
 *
 * Call this in test.beforeEach or at the top of a test that needs auth.
 */
export async function loginAsAdmin(
  request: APIRequestContext,
  context: BrowserContext
): Promise<void> {
  const e2ePassword = process.env.E2E_ADMIN_PASSWORD;
  if (!e2ePassword) {
    throw new Error(
      'E2E_ADMIN_PASSWORD env var is required. See tests/e2e/README.md for setup instructions.'
    );
  }

  const response = await request.post('http://127.0.0.1:3001/api/auth/login', {
    data: {
      username: process.env.E2E_ADMIN_USER ?? 'admin',
      password: e2ePassword,
    },
  });

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
  }

  const body = await response.json();
  if (!body.success) {
    throw new Error(`Login rejected: ${JSON.stringify(body)}`);
  }

  const setCookie = response.headers()['set-cookie'];
  if (setCookie) {
    const match = setCookie.match(/([^=]+)=([^;]+)/);
    if (match) {
      const [, name, value] = match;
      await context.addCookies([{ name, value, domain: '127.0.0.1', path: '/' }]);
    }
  }
}
