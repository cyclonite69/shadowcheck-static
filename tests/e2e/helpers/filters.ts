import { type Page, type Request, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Filter panel interaction helpers
// ---------------------------------------------------------------------------

/**
 * Open the filter panel by clicking the "Toggle filters" button.
 * Waits until the SSID input (a reliable indicator the panel is open) is visible.
 */
export async function openFilterPanel(page: Page): Promise<void> {
  const toggle = page
    .locator('button')
    .filter({ hasText: /show filters/i })
    .or(page.locator('button[title="Toggle filters"]'))
    .first();
  await expect(toggle).toBeVisible({ timeout: 10000 });
  await toggle.click();
  // The panel is open once the Identity section label is visible
  await expect(page.locator('.filter-panel')).toBeVisible({ timeout: 5000 });
}

/**
 * Close the filter panel (same toggle button).
 */
export async function closeFilterPanel(page: Page): Promise<void> {
  const toggle = page
    .locator('button')
    .filter({ hasText: /hide filters/i })
    .or(page.locator('button[title="Toggle filters"]'))
    .first();
  await toggle.click();
}

// ---------------------------------------------------------------------------
// Filter enablement
// ---------------------------------------------------------------------------

/**
 * Ensure a specific filter section (collapsible panel) is open/expanded.
 *
 * @param page         Playwright page
 * @param sectionTitle Title of the section to open (e.g. "Identity", "Threat Intelligence")
 */
export async function ensureSectionOpen(page: Page, sectionTitle: string): Promise<void> {
  const container = page
    .locator('div.border-b.border-slate-700')
    .filter({ has: page.locator('.filter-panel__section-title').filter({ hasText: sectionTitle }) })
    .first();

  await expect(container).toBeVisible({ timeout: 5000 });

  const body = container.locator('.filter-panel__section-body');
  const isExpanded = await body.isVisible();
  if (!isExpanded) {
    const toggle = container.locator('.filter-panel__section-toggle');
    await toggle.click();
    await expect(body).toBeVisible({ timeout: 5000 });
  }
}

// ---------------------------------------------------------------------------
// Filter enablement
// ---------------------------------------------------------------------------

/**
 * Enable a filter by clicking its checkbox label.
 * Filters are disabled by default; the input only appears after the checkbox is checked.
 *
 * @param page         Playwright page
 * @param filterLabel  The label text shown next to the checkbox (e.g. "SSID", "Manufacturer / OUI")
 */
export async function enableFilter(page: Page, filterLabel: string): Promise<void> {
  const label = page.locator('.filter-panel__label').filter({ hasText: filterLabel }).first();
  await expect(label).toBeVisible({ timeout: 5000 });
  await label.click();
}

// ---------------------------------------------------------------------------
// Identity filter helpers
// ---------------------------------------------------------------------------

/**
 * Enable the SSID filter and type a value into its input.
 * Waits for the 500ms debounce to fire before returning so that
 * captureFilterRequest catches the correct outbound request.
 */
export async function setSSIDFilter(page: Page, value: string): Promise<void> {
  await ensureSectionOpen(page, 'Identity');
  await enableFilter(page, 'SSID');
  const input = page.getByPlaceholder('Network name or comma list...');
  await expect(input).toBeVisible({ timeout: 3000 });
  await input.fill(value);
  // Wait for debounce (500ms) + small margin so the API request fires
  // within the captureFilterRequest window
  await page.waitForTimeout(600);
}

/**
 * Enable the Manufacturer / OUI filter and type a value.
 * Waits for the 500ms debounce before returning.
 */
export async function setManufacturerFilter(page: Page, value: string): Promise<void> {
  await ensureSectionOpen(page, 'Identity');
  await enableFilter(page, 'Manufacturer / OUI');
  const input = page.getByPlaceholder('Apple, Samsung, 001A2B...');
  await expect(input).toBeVisible({ timeout: 3000 });
  await input.fill(value);
  await page.waitForTimeout(600);
}

// ---------------------------------------------------------------------------
// Threat filter helpers
// ---------------------------------------------------------------------------

/**
 * Enable the Threat Score range filter and set min/max values.
 * Fills both inputs before waiting for the debounce so a single request
 * carries both values.
 */
export async function setThreatScoreRange(page: Page, min?: number, max?: number): Promise<void> {
  await ensureSectionOpen(page, 'Threat Intelligence');
  await enableFilter(page, 'ML Threat Model');
  if (min !== undefined) {
    const minInput = page.getByPlaceholder('Min Score');
    await expect(minInput).toBeVisible({ timeout: 3000 });
    await minInput.fill(String(min));
  }
  if (max !== undefined) {
    const maxInput = page.getByPlaceholder('Max');
    await expect(maxInput.first()).toBeVisible({ timeout: 3000 });
    await maxInput.first().fill(String(max));
  }
  // Wait for debounce (500ms) + margin after all inputs are filled
  await page.waitForTimeout(600);
}

/**
 * Enable the BSSID filter and type a value.
 * Waits for the 500ms debounce before returning.
 */
export async function setBSSIDFilter(page: Page, value: string): Promise<void> {
  await ensureSectionOpen(page, 'Identity');
  await enableFilter(page, 'BSSID');
  const input = page.getByPlaceholder('AA:BB:CC:DD:EE:FF, AA:BB:CC...');
  await expect(input).toBeVisible({ timeout: 3000 });
  await input.fill(value);
  await page.waitForTimeout(600);
}

// ---------------------------------------------------------------------------
// Radio & Physical filter helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to the section body for a given section title.
 * Used internally to scope checkbox searches within a section.
 */
async function getSectionBody(page: Page, sectionTitle: string) {
  const container = page
    .locator('.border-b.border-slate-700')
    .filter({
      has: page.locator('.filter-panel__section-title').filter({ hasText: sectionTitle }),
    })
    .first();
  await expect(container).toBeVisible({ timeout: 5000 });
  // Ensure the section is open
  const body = container.locator('.filter-panel__section-body');
  const isExpanded = await body.isVisible();
  if (!isExpanded) {
    await container.locator('.filter-panel__section-toggle').click();
    await expect(body).toBeVisible({ timeout: 5000 });
  }
  return body;
}

/**
 * Enable the Radio Types filter and check one or more type checkboxes.
 * Checkbox labels: 'WiFi', 'BLE', 'Bluetooth', 'LTE', 'GSM', '5G NR', 'Unknown'
 */
export async function setRadioTypeFilter(page: Page, ...types: string[]): Promise<void> {
  await ensureSectionOpen(page, 'Radio & Physical');
  const body = await getSectionBody(page, 'Radio & Physical');
  // Enable the Radio Types FilterInput
  await body.locator('.filter-panel__label').filter({ hasText: 'Radio Types' }).click();
  for (const type of types) {
    await body
      .locator('label')
      .filter({ hasText: new RegExp(`^${type}$`) })
      .click();
  }
  await page.waitForTimeout(300);
}

/**
 * Enable the Frequency Band filter and check one or more band checkboxes.
 * Band labels: '2.4GHz', '5GHz', '6GHz', 'BLE', 'Cellular'
 */
export async function setFrequencyBandFilter(page: Page, ...bands: string[]): Promise<void> {
  await ensureSectionOpen(page, 'Radio & Physical');
  const body = await getSectionBody(page, 'Radio & Physical');
  await body.locator('.filter-panel__label').filter({ hasText: 'Frequency Band' }).click();
  for (const band of bands) {
    await body
      .locator('label')
      .filter({ hasText: new RegExp(`^${band}$`) })
      .click();
  }
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Security filter helpers
// ---------------------------------------------------------------------------

/**
 * Enable the Encryption Types filter and check one or more type checkboxes.
 * Type values: 'OPEN', 'WEP', 'WPA', 'WPA2-P', 'WPA2-E', 'WPA2', 'WPA3-P', 'WPA3-E', 'WPA3', 'OWE', 'WPS'
 *
 * Two-step flow:
 * 1. Enable the FilterInput (shows the checkbox body) and wait for its debounced
 *    empty-array request to fire and settle — so it doesn't interfere with step 2.
 * 2. Click the checkbox items (which auto-call onEnableFilter and set the array),
 *    then wait for the debounce again.
 *
 * callers using captureFilterRequest should wrap only step 2 in the capture window.
 */
export async function setEncryptionTypeFilter(page: Page, ...types: string[]): Promise<void> {
  await ensureSectionOpen(page, 'Security');
  const body = await getSectionBody(page, 'Security');

  // Step 1: enable the FilterInput so its body renders — wait for the empty-array
  // debounced request to settle before we click any checkbox items.
  const encLabel = body.locator('.filter-panel__label').filter({ hasText: 'Encryption Types' });
  await expect(encLabel).toBeVisible({ timeout: 5000 });
  await encLabel.click();
  // Wait > 500ms debounce so the empty-array request fires and clears
  await page.waitForTimeout(700);

  // Step 2: click the checkbox items — each auto-enables encryptionTypes and adds to the array
  for (const type of types) {
    const item = body
      .locator('.filter-panel__input-body label')
      .filter({ hasText: new RegExp(`^${type}$`) });
    await expect(item).toBeVisible({ timeout: 3000 });
    await item.click();
  }
  // Wait for the debounce to fire the real request with the array populated
  await page.waitForTimeout(600);
}

// ---------------------------------------------------------------------------
// Threat filter helpers
// ---------------------------------------------------------------------------

/**
 * Enable the Threat Level filter and check one or more category checkboxes.
 * Category values: 'critical', 'high', 'medium', 'low', 'none'
 */
export async function setThreatLevelFilter(page: Page, ...categories: string[]): Promise<void> {
  await ensureSectionOpen(page, 'Threat Intelligence');
  const body = await getSectionBody(page, 'Threat Intelligence');
  await body.locator('.filter-panel__label').filter({ hasText: 'Threat Level' }).click();
  for (const cat of categories) {
    await body
      .locator('label')
      .filter({ hasText: new RegExp(`^${cat}$`, 'i') })
      .click();
  }
  await page.waitForTimeout(300);
}

/**
 * Open the Security section and enable the Encryption Types FilterInput,
 * waiting for the empty-array debounced request to settle before returning.
 *
 * Returns the section body locator so the caller can click individual
 * checkbox items inside captureFilterRequest without catching the premature
 * empty-array request.
 */
export async function enableEncryptionTypesSection(page: Page) {
  await ensureSectionOpen(page, 'Security');
  const body = await getSectionBody(page, 'Security');
  const encLabel = body.locator('.filter-panel__label').filter({ hasText: 'Encryption Types' });
  await expect(encLabel).toBeVisible({ timeout: 5000 });
  await encLabel.click();
  // Wait >500ms so the empty-array debounced request fires and settles
  // before the caller enters a captureFilterRequest window
  await page.waitForTimeout(700);
  return body;
}

/**
 * Click a single encryption type checkbox item inside the already-enabled section body.
 * Must be called after enableEncryptionTypesSection().
 */
export async function clickEncryptionTypeItem(
  body: ReturnType<Page['locator']>,
  type: string
): Promise<void> {
  const item = body
    .locator('.filter-panel__input-body label')
    .filter({ hasText: new RegExp(`^${type}$`) });
  await expect(item).toBeVisible({ timeout: 3000 });
  await item.click();
  await (body.page() as Page).waitForTimeout(600);
}

/**
 * Enable the Timeframe filter and select a relative window.
 * Window values: '24h', '7d', '30d', '90d', 'all'
 * Scope values: 'observation_time' | 'first_seen' | 'last_seen' | 'network_lifetime' | 'threat_window'
 *
 * Note: enabling Timeframe co-enables temporalScope in the filter store.
 * Both keys must be enabled for the backend to apply the temporal filter.
 */
export async function setTimeframeFilter(
  page: Page,
  relativeWindow: string,
  scope?: string
): Promise<void> {
  await ensureSectionOpen(page, 'Time Range');
  await enableFilter(page, 'Timeframe');
  // Set temporal scope if requested (default is observation_time)
  if (scope) {
    const scopeSelect = page.locator('#temporal-scope-select');
    await expect(scopeSelect).toBeVisible({ timeout: 3000 });
    await scopeSelect.selectOption(scope);
  }
  const select = page.locator('#relative-window-select');
  await expect(select).toBeVisible({ timeout: 3000 });
  await select.selectOption(relativeWindow);
  await page.waitForTimeout(600);
}

// ---------------------------------------------------------------------------
// Quality filter helpers
// ---------------------------------------------------------------------------

/**
 * Enable the Min Observations filter and set a value.
 */
export async function setObservationCountMin(page: Page, value: number): Promise<void> {
  await ensureSectionOpen(page, 'Data Quality');
  await enableFilter(page, 'Min Observations');
  const input = page.getByPlaceholder('1');
  await expect(input).toBeVisible({ timeout: 3000 });
  await input.fill(String(value));
  await page.waitForTimeout(600);
}

// ---------------------------------------------------------------------------
// Geocoding filter helpers
// ---------------------------------------------------------------------------

/**
 * Enable the City filter and type a value.
 */
export async function setCityFilter(page: Page, value: string): Promise<void> {
  await ensureSectionOpen(page, 'Geocoding & Address');
  await enableFilter(page, 'City');
  const input = page.getByPlaceholder('City name (starts with)...');
  await expect(input).toBeVisible({ timeout: 3000 });
  await input.fill(value);
  await page.waitForTimeout(600);
}

/**
 * Enable the State / Region filter and type a value.
 */
export async function setStateFilter(page: Page, value: string): Promise<void> {
  await ensureSectionOpen(page, 'Geocoding & Address');
  await enableFilter(page, 'State / Region');
  const input = page.getByPlaceholder('e.g. MI, CA, NY...');
  await expect(input).toBeVisible({ timeout: 3000 });
  await input.fill(value);
  await page.waitForTimeout(600);
}

// ---------------------------------------------------------------------------
// Clear all filters
// ---------------------------------------------------------------------------

/**
 * Click the "Clear All" / reset button in the filter panel header.
 * Waits for the filter panel checkbox count to drop to 0.
 */
export async function clearAllFilters(page: Page): Promise<void> {
  // The FilterPanelHeader renders a "Clear All" or "Reset" button when filters are active
  const clearBtn = page
    .locator('.filter-panel')
    .getByRole('button', { name: 'Clear All', exact: true });
  await expect(clearBtn).toBeVisible({ timeout: 5000 });
  await clearBtn.click();
}

// ---------------------------------------------------------------------------
// Request assertion helpers
// ---------------------------------------------------------------------------

/**
 * Wait for the next `/v2/networks/filtered` API call and parse out the
 * `filters` and `enabled` JSON query parameters.
 *
 * Returns the parsed objects so tests can assert on specific keys.
 */
export async function captureFilterRequest(
  page: Page,
  triggerFn: () => Promise<void>,
  timeoutMs = 10000
): Promise<{ filters: Record<string, unknown>; enabled: Record<string, boolean> }> {
  const [req] = await Promise.all([
    page.waitForRequest(
      (r: Request) =>
        r.url().includes('/v2/networks/filtered') &&
        !r.url().includes('/matched-media') &&
        !r.url().includes('/unmatched-media') &&
        r.method() === 'GET',
      { timeout: timeoutMs }
    ),
    triggerFn(),
  ]);

  const url = new URL(req.url());
  const filtersRaw = url.searchParams.get('filters');
  const enabledRaw = url.searchParams.get('enabled');

  return {
    filters: filtersRaw ? (JSON.parse(filtersRaw) as Record<string, unknown>) : {},
    enabled: enabledRaw ? (JSON.parse(enabledRaw) as Record<string, boolean>) : {},
  };
}

/**
 * Wait for the next `/v2/networks/filtered` API call, parse the request params,
 * AND capture the response body.
 *
 * Returns request params + parsed response so tests can assert on both
 * the outgoing filter payload and the returned network rows.
 *
 * Response shape: { ok, data: NetworkRow[], pagination: { total, limit, offset } }
 */
export async function captureFilterRequestAndResponse(
  page: Page,
  triggerFn: () => Promise<void>,
  timeoutMs = 15000
): Promise<{
  filters: Record<string, unknown>;
  enabled: Record<string, boolean>;
  data: Record<string, unknown>[];
  total: number | null;
}> {
  // Use req.response() to guarantee the response is paired to the specific
  // request we captured — avoids matching an unrelated concurrent response.
  const [req] = await Promise.all([
    page.waitForRequest(
      (r: Request) =>
        r.url().includes('/v2/networks/filtered') &&
        !r.url().includes('/matched-media') &&
        !r.url().includes('/unmatched-media') &&
        r.method() === 'GET',
      { timeout: timeoutMs }
    ),
    triggerFn(),
  ]);

  const res = await req.response();
  if (!res) {
    throw new Error(`No response received for request: ${req.url()}`);
  }

  const url = new URL(req.url());
  const filtersRaw = url.searchParams.get('filters');
  const enabledRaw = url.searchParams.get('enabled');
  const body = (await res.json()) as {
    ok: boolean;
    data: Record<string, unknown>[];
    pagination: { total: number | null; limit: number; offset: number };
  };

  return {
    filters: filtersRaw ? (JSON.parse(filtersRaw) as Record<string, unknown>) : {},
    enabled: enabledRaw ? (JSON.parse(enabledRaw) as Record<string, boolean>) : {},
    data: body.data ?? [],
    total: body.pagination?.total ?? null,
  };
}
export function assertFilterEnabled(
  captured: { filters: Record<string, unknown>; enabled: Record<string, boolean> },
  key: string,
  expectedValue?: unknown
): void {
  expect(captured.enabled[key]).toBe(true);
  if (expectedValue !== undefined) {
    expect(captured.filters[key]).toEqual(expectedValue);
  }
}

/**
 * Assert that a given filter key is NOT enabled.
 */
export function assertFilterDisabled(
  captured: { filters: Record<string, unknown>; enabled: Record<string, boolean> },
  key: string
): void {
  expect(captured.enabled[key]).toBeFalsy();
}
