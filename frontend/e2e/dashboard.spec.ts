import { test, expect } from '@playwright/test';

test.describe('SkyOps Dashboard E2E', () => {
  test('should display dashboard with fleet overview and drone list', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'SkyOps Mission Control' }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Fleet Overview' }),
    ).toBeVisible();

    const totalDronesCard = page.getByText('Total Drones').locator('..');
    await expect(totalDronesCard).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Drone Fleet' }),
    ).toBeVisible();

    const droneTable = page.locator('table').first();
    await expect(droneTable).toBeVisible();

    const droneTableHeaders = droneTable.locator('thead th');
    await expect(droneTableHeaders).toHaveCount(6);

    await expect(droneTableHeaders.nth(0)).toContainText('Serial Number');
    await expect(droneTableHeaders.nth(1)).toContainText('Model');
    await expect(droneTableHeaders.nth(2)).toContainText('Status');
    await expect(droneTableHeaders.nth(5)).toContainText('Actions');

    const tableRows = droneTable.locator('tbody tr');
    await expect(tableRows.first()).toBeVisible();

    const firstDroneSerial = tableRows.first().locator('td').first();
    await expect(firstDroneSerial).toContainText(/^SKY-/);
  });

  test('should display mission view section', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Mission View' }),
    ).toBeVisible();

    const missionTable = page.locator('table').nth(1);
    await expect(missionTable).toBeVisible();

    const missionHeaders = missionTable.locator('thead th');
    await expect(missionHeaders.nth(0)).toContainText('Mission Name');
    await expect(missionHeaders.nth(1)).toContainText('Drone');
    await expect(missionHeaders.nth(2)).toContainText('Status');
  });

  test('should navigate to drone detail page', async ({ page }) => {
    await page.goto('/');

    const firstViewDetailsLink = page.getByRole('link', {
      name: 'View Details',
    }).first();
    await expect(firstViewDetailsLink).toBeVisible();
    await firstViewDetailsLink.click();

    await expect(page).toHaveURL(/\/drones\/.+/);

    await expect(
      page.getByRole('heading', { name: /^SKY-/ }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Drone Information' }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Mission History' }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Maintenance History' }),
    ).toBeVisible();

    const backLink = page.getByRole('link', { name: /Back to Dashboard/ });
    await expect(backLink).toBeVisible();
  });

  test('should show maintenance alerts if there are overdue drones', async ({
    page,
  }) => {
    await page.goto('/');

    const maintenanceAlert = page.locator('text=Maintenance Alerts');
    if (await maintenanceAlert.isVisible()) {
      await expect(maintenanceAlert).toContainText(/\(\d+\)/);
    }
  });
});
