// Walk the review controls, never write approved state directly into browser storage.
async function approveBrief(page) {
  const ids = await page.locator('.brief-item:has(.brief-decision)').evaluateAll(nodes => nodes.map(n => n.dataset.itemId));
  for (const id of ids) {
    const item = page.locator(`[data-item-id="${id}"]`);
    await item.locator('.brief-decision input').fill('For this illustrative bench scope only. Actual aircraft values require validation.');
    await item.locator('.brief-decision button').first().click();
    await item.locator('.brief-decision').waitFor({ state: 'detached' });
  }
  const sources = page.locator('.brief-source-review');
  if (!(await sources.getAttribute('open')) && !(await sources.evaluate(n => n.open))) await sources.locator('> summary').click();
  for (const card of await page.locator('.brief-source-card').all()) {
    if (!(await card.evaluate(n => n.open))) await card.locator('> summary').click();
    const mark = card.getByRole('button', { name: 'Mark considered' });
    if (await mark.count()) { await mark.click(); await mark.waitFor({ state: 'detached' }); }
  }
  await page.getByRole('button', { name: 'Approve this brief', exact: true }).click();
  await page.waitForSelector('.brief-readiness:has-text("Reviewed specification")');
}
module.exports = { approveBrief };
