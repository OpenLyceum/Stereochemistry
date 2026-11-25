import { expect, type Locator, type Page, test } from "@playwright/test";

/** Reach a control through the simulation's actual Tab order. */
async function tabTo(page: Page, target: Locator): Promise<void> {
  await expect(target).toBeVisible();
  for (let step = 0; step < 60; step++) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

async function openScreen(page: Page, index: number): Promise<void> {
  await page.goto(`/?ea&initialScreen=${index}&locale=en&randomSeed=67&logInteractiveDescriptionResponses`);
}

function announced(page: Page, text: string) {
  return page.waitForEvent(
    "console",
    (message) => message.text().startsWith("[ARIA-LIVE]") && message.text().includes(text),
  );
}

test("rotates the R/S molecule, answers, and announces the result", async ({ page }) => {
  await openScreen(page, 2);
  const viewer = page.getByRole("application", { name: "3D molecule viewer" });
  await tabTo(page, viewer);
  // Home restores the canonical view. Keyboard rotation should change the canvas from that view.
  await page.keyboard.press("Home");
  const before = await page
    .locator("canvas")
    .first()
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .first()
        .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()),
    )
    .not.toBe(before);
  await tabTo(page, page.getByRole("button", { name: "R", exact: true }));
  await Promise.all([announced(page, "Correct: (R)-2-butanol"), page.keyboard.press("Enter")]);
});

test("sets the Conformations dihedral to 180 degrees and reads anti", async ({ page }) => {
  await openScreen(page, 3);
  const angle = page.getByRole("slider", { name: "Dihedral angle" });
  await tabTo(page, angle);
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await expect(angle).not.toHaveAttribute("aria-valuetext", "180 degrees, anti");
  await page.keyboard.press("End");
  await expect(angle).toHaveAttribute("aria-valuetext", "180 degrees, anti");
});

test("flips cyclohexane and announces the result", async ({ page }) => {
  await openScreen(page, 4);
  await tabTo(page, page.getByRole("button", { name: "Ring flip", exact: true }));
  await Promise.all([announced(page, "Ring flipped."), page.keyboard.press("Enter")]);
  await expect(page.getByRole("slider", { name: "Flip progress" })).toHaveAttribute(
    "aria-valuetext",
    /^100 percent through the flip path\s*$/,
  );
});

test("plays one Challenge problem and advances using the keyboard", async ({ page }) => {
  await openScreen(page, 5);
  await tabTo(page, page.getByRole("button", { name: /Chiral or achiral/ }));
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByRole("button", { name: "Chiral", exact: true }));
  const [firstResponse] = await Promise.all([announced(page, ""), page.keyboard.press("Enter")]);
  const next = page.getByRole("button", { name: "Next problem", exact: true });
  if (!(await next.isVisible())) {
    expect(firstResponse.text()).toContain("Try again.");
    await tabTo(page, page.getByRole("button", { name: "Achiral", exact: true }));
    await Promise.all([announced(page, "Correct. You earned"), page.keyboard.press("Enter")]);
  } else {
    expect(firstResponse.text()).toContain("Correct. You earned");
  }
  await tabTo(page, next);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("application", { name: "3D molecule", exact: true })).toBeFocused();
  await expect(next).toBeHidden();
});
