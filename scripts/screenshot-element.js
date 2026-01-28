const { chromium } = require('playwright');
const path = require('path');

async function takeElementScreenshot(htmlFile, outputFile, selector = 'body > div') {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Load the HTML file
  const htmlPath = path.resolve(__dirname, htmlFile);
  await page.goto(`file://${htmlPath}`);

  // Wait for any images to load
  await page.waitForLoadState('networkidle');

  // Wait for the element to be visible
  await page.waitForSelector(selector);

  // Take screenshot of the specific element
  const element = await page.$(selector);
  const screenshotPath = path.resolve(__dirname, outputFile);
  await element.screenshot({
    path: screenshotPath,
  });

  console.log(`✓ Element screenshot saved to: ${screenshotPath}`);

  await browser.close();
}

// Get arguments from command line
const args = process.argv.slice(2);
const htmlFile = args[0] || 'banner-standard-hover.html';
const outputFile = args[1] || 'screenshots/banner-rendered.png';
const selector = args[2] || 'body > div';

takeElementScreenshot(htmlFile, outputFile, selector).catch(error => {
  console.error('Error taking screenshot:', error);
  process.exit(1);
});
