// Older interaction regressions start from the original small fixture in their own
// fresh browser context. The sample suite separately exercises the populated default.
exports.minimalFixture = async (page, base) => {
  await page.goto(base+'#/p/spearhead');
  await page.locator('.project-workspace').waitFor();
  await page.evaluate(() => {
    const key='arrow-spec-threads-demo-v2', state=JSON.parse(localStorage.getItem(key));
    for(const collection of ['threads','positions','comments','drafts','decisions','grants','specifications']) {
      state[collection]=(state[collection]??[]).filter(row=>!(row.id??row.threadId).startsWith('sample-delivery-'));
    }
    // Keep the installed marker: fixture removal is an intentional local edit.
    localStorage.setItem(key,JSON.stringify(state));
  });
  await page.reload();
  await page.locator('.project-workspace').waitFor();
};
