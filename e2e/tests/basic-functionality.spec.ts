import { test, expect } from '@playwright/test';

test.describe('Basic Application Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle(/Web Desktop/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show app launcher on Alt+Space', async ({ page }) => {
    await page.keyboard.press('Alt+Space');
    await expect(page.locator('[data-testid="app-launcher"]')).toBeVisible();
  });

  test('should open file manager window', async ({ page }) => {
    // Open app launcher
    await page.keyboard.press('Alt+Space');

    // Type to find file manager
    await page.locator('[data-testid="app-launcher-input"]').fill('File Manager');
    await page.keyboard.press('Enter');

    // Verify file manager window opens
    await expect(page.locator('[data-testid="window-file-manager"]')).toBeVisible();
  });

  test('should open terminal window', async ({ page }) => {
    // Open app launcher
    await page.keyboard.press('Alt+Space');

    // Type to find terminal
    await page.locator('[data-testid="app-launcher-input"]').fill('Terminal');
    await page.keyboard.press('Enter');

    // Verify terminal window opens
    await expect(page.locator('[data-testid="window-terminal"]')).toBeVisible();
    await expect(page.locator('.xterm')).toBeVisible();
  });

  test('should show taskbar', async ({ page }) => {
    await expect(page.locator('[data-testid="taskbar"]')).toBeVisible();
  });

  test('should be responsive to window resizing', async ({ page }) => {
    // Initial size
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('body')).toBeVisible();

    // Resize window
    await page.setViewportSize({ width: 800, height: 600 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab through interface elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should not crash and should be interactive
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/**', route => route.abort());

    await page.goto('/');

    // Should still show basic interface
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    // Inject a JavaScript error
    await page.evaluate(() => {
      throw new Error('Test error');
    });

    // Application should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});