const puppeteer = require('puppeteer');
const percySnapshot = require('@percy/puppeteer');

const projects = require('../config/projects');
const pages = require('../config/pages');

// Usage: npx percy exec -- node src/snapshots.js <project-name>
// Example: npx percy exec -- node src/snapshots.js royalmtLive

const projectName = process.argv[2];

if (!projectName) {
  console.log('\nUsage:');
  console.log('  npx percy exec -- node src/snapshots.js <project-name>\n');
  console.log('Available projects:');
  Object.keys(projects).forEach(p => console.log(`  - ${p}`));
  console.log('');
  process.exit(1);
}

const project = projects[projectName];
const projectPages = pages[projectName];

if (!project) {
  console.error(`\nError: Project "${projectName}" not found.`);
  console.error(`Available: ${Object.keys(projects).join(', ')}\n`);
  process.exit(1);
}

if (!projectPages) {
  console.error(`\nError: No pages defined for project "${projectName}".\n`);
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  console.log(`\n=== Running Percy snapshots for: ${project.name} ===\n`);

  for (const path of projectPages) {
    const url = `${project.baseUrl}${path}`;
    console.log(`Capturing: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle0' });
    await percySnapshot(page, `${projectName} - ${path}`);
  }

  await browser.close();

  console.log(`\n=== Done! Percy snapshots completed for ${project.name} ===\n`);
})();
