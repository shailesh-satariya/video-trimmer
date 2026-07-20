import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
): string {
  return violations
    .map((violation) => {
      const targets = violation.nodes.flatMap((node) => node.target).join(', ');
      return `${violation.id}: ${violation.help} (${targets})`;
    })
    .join('\n');
}

async function expectNoAccessibilityViolations(
  page: Page,
  include?: string,
): Promise<void> {
  const builder = new AxeBuilder({ page });
  const results = await (
    include ? builder.include(include) : builder
  ).analyze();

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

test('landing page has no detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: 'Cut the moment. Keep the quality.',
      exact: true,
    }),
  ).toBeVisible();

  await expectNoAccessibilityViolations(page);
});

test('editing workflow has no detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#import-panel').evaluate((element) => {
    element.setAttribute('hidden', '');
  });
  await page
    .locator('#preview-panel, #trim-section, #result-panel')
    .evaluateAll((elements) => {
      elements.forEach((element) => element.removeAttribute('hidden'));
    });
  await page.locator('#preview-loading').evaluate((element) => {
    element.setAttribute('hidden', '');
  });
  await expect(
    page.getByRole('heading', { name: 'Choose the moment', exact: true }),
  ).toBeVisible();

  await expectNoAccessibilityViolations(page);
});

test('filename dialog has no detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Name your video' });

  await page.locator('#filename-dialog').evaluate((element) => {
    (element as HTMLDialogElement).showModal();
  });
  await expect(dialog).toBeVisible();

  await expectNoAccessibilityViolations(page, '#filename-dialog');
});
