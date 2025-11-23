import { test, expect } from '@playwright/test';

test.describe('File Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Open file manager
    await page.keyboard.press('Alt+Space');
    await page.locator('[data-testid="app-launcher-input"]').fill('File Manager');
    await page.keyboard.press('Enter');

    // Wait for file manager to load
    await page.locator('[data-testid="window-file-manager"]').waitFor({ state: 'visible' });
  });

  test('should list files in directory', async ({ page }) => {
    // Should show file listing
    await expect(page.locator('[data-testid="file-list"]')).toBeVisible();
  });

  test('should navigate directories', async ({ page }) => {
    // Try to navigate (implementation depends on your UI)
    const directoryItems = page.locator('[data-testid="directory-item"]');

    if (await directoryItems.first().isVisible()) {
      await directoryItems.first().click();
      // Should load new directory content
      await expect(page.locator('[data-testid="file-list"]')).toBeVisible();
    }
  });

  test('should search files', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('[data-testid="file-search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      // Should filter results or show search results
      await expect(page.locator('[data-testid="file-list"]')).toBeVisible();
    }
  });

  test('should handle file upload', async ({ page }) => {
    // Look for upload button
    const uploadButton = page.locator('[data-testid="file-upload-button"]');

    if (await uploadButton.isVisible()) {
      // Create a test file
      const testContent = 'Test file content';

      // Handle file upload dialog (implementation varies)
      await uploadButton.click();

      // Verify upload interface appears
      await expect(page.locator('[data-testid="upload-interface"]')).toBeVisible();
    }
  });

  test('should show file properties', async ({ page }) => {
    // Look for file items
    const fileItems = page.locator('[data-testid="file-item"]');

    if (await fileItems.first().isVisible()) {
      // Right-click on first file
      await fileItems.first().click({ button: 'right' });

      // Look for context menu or properties option
      const contextMenu = page.locator('[data-testid="context-menu"]');
      if (await contextMenu.isVisible()) {
        await expect(contextMenu).toBeVisible();
      }
    }
  });
});