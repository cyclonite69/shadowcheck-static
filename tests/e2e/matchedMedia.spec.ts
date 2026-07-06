import { test, expect } from '@playwright/test';

test.describe('Geospatial Explorer — auth & navigation', () => {
  test('should authenticate and reach the Geospatial Explorer page', async ({ page }) => {
    await page.goto('/geospatial-explorer');

    // Page title confirms the app shell loaded
    await expect(page).toHaveTitle(/ShadowCheck/i);

    // The map toolbar "Media" button is the key indicator the explorer mounted
    const mediaBtn = page.getByRole('button', { name: 'Media' });
    await expect(mediaBtn).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Matched Media — toolbar and API smoke', () => {
  test('Mapbox canvas renders and map toolbar is fully present', async ({ page }) => {
    await page.goto('/geospatial-explorer');
    await expect(page).toHaveTitle(/ShadowCheck/i);

    // With a real Mapbox token the canvas must initialize
    await expect(page.locator('.mapboxgl-canvas')).toBeVisible({ timeout: 20000 });

    // All toolbar controls present
    await expect(page.getByRole('button', { name: 'Media' })).toBeVisible();
    await expect(page.getByRole('button', { name: /markers/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /layers/i })).toBeVisible();
  });

  test('clicking Media button triggers the matched-media API fetch and shows status', async ({
    page,
  }) => {
    await page.goto('/geospatial-explorer');

    // Wait for map canvas to be ready
    await expect(page.locator('.mapboxgl-canvas')).toBeVisible({ timeout: 20000 });

    const mediaBtn = page.getByRole('button', { name: 'Media' });
    await expect(mediaBtn).toBeVisible();

    // Arm the request intercept before clicking
    const apiRequestPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/api/') &&
        (req.url().includes('matched-media') || req.url().includes('media')),
      { timeout: 15000 }
    );

    await mediaBtn.click();

    // The hook fires a fetch once mapReady is true
    const req = await apiRequestPromise;
    expect(req.url()).toMatch(/\/api\//);

    // Status span should appear with loading or active text
    const statusSpan = page.locator('span[role="status"]');
    await expect(statusSpan).toBeVisible({ timeout: 10000 });
    const statusText = await statusSpan.innerText();
    expect(statusText).toMatch(/media/i);

    // Button remains visible (no crash/unmount)
    await expect(mediaBtn).toBeVisible();
  });
});
