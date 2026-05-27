const { chromium } = require('@playwright/test');
const issues = [];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const dims = async (sel) => {
    const loc = page.locator(sel).first();
    if (!(await loc.isVisible().catch(() => false))) return null;
    return await loc.boundingBox();
  };

  const checkOverflow = async (label) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector('.app');
      if (!el) return null;
      return { scrollW: el.scrollWidth, clientW: el.clientWidth };
    });
    if (result && result.scrollW > result.clientW + 2) {
      issues.push(`${label}: .app overflow scrollW=${result.scrollW} > clientW=${result.clientW}`);
    }
  };

  const checkOverlap = async (sel1, sel2, label) => {
    const a = await dims(sel1);
    const b = await dims(sel2);
    if (a && b) {
      const overlap = !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
      if (overlap && !(Math.abs(a.y - b.y) > 5)) {
        issues.push(`${label}: ${sel1} overlaps ${sel2}`);
      }
    }
  };

  const snap = async (name) => {
    await page.screenshot({ path: `C:/Desarrollos BI/vue-gantt/e2e/snap-responsive-${name}.png` });
  };

  const login = async (user, pass) => {
    await page.goto('http://localhost:8080/login');
    await page.evaluate(() => { localStorage.removeItem('gantt_user'); localStorage.removeItem('gantt_token'); });
    await page.reload(); await page.waitForLoadState('networkidle');
    await page.fill('#usuario', user); await page.fill('#password', pass);
    await page.click('button[type=submit]'); await page.waitForTimeout(3000);
  };

  const breakpoints = [
    { w: 1440, h: 900, name: 'desktop' },
    { w: 1280, h: 800, name: 'laptop' },
    { w: 1024, h: 768, name: 'tablet-landscape' },
    { w: 768, h: 1024, name: 'tablet-portrait' },
    { w: 480, h: 800, name: 'mobile-large' },
    { w: 375, h: 812, name: 'mobile' },
    { w: 320, h: 568, name: 'mobile-small' },
  ];

  await login('emmanuel.villasanti', 'epem2023@@');

  for (const bp of breakpoints) {
    console.log(`\n===== ${bp.name.toUpperCase()} (${bp.w}x${bp.h}) =====`);

    await page.setViewportSize({ width: bp.w, height: bp.h });
    await page.waitForTimeout(1000);

    // 1. .app level overflow (the main page should never scroll horizontally)
    await checkOverflow(bp.name);

    // 2. Header overlaps
    const logoB = await dims('.logo');
    const titleB = await dims('.title-group h1');
    const actionsB = await dims('.header-actions');
    if (logoB && actionsB) await checkOverlap('.logo', '.header-actions', `${bp.name} logo<->actions`);
    if (titleB && actionsB) await checkOverlap('.title-group h1', '.header-actions', `${bp.name} title<->actions`);

    // 3. Modal overflow check
    await page.locator('.add-btn').click();
    await page.waitForTimeout(800);
    const modalB = await dims('.modal');
    if (modalB) {
      if (modalB.x < -5) issues.push(`${bp.name}: modal overflows left (${modalB.x})`);
      if (modalB.x + modalB.width > bp.w + 5) issues.push(`${bp.name}: modal overflows right (${Math.round(modalB.x + modalB.width)} > ${bp.w})`);
    }
    const pL = await dims('.panel-left');
    const pC = await dims('.panel-center');
    const pR = await dims('.panel-right');
    if (pL && pR) {
      const sameX = Math.abs(pL.x - pR.x) < 10;
      const stacked = sameX && Math.abs(pL.width - pR.width) < 20;
      console.log(`  Modal ${Math.round(modalB?.width || 0)}x${Math.round(modalB?.height || 0)} panels=${stacked ? 'STACKED' : 'COLUMNS'}`);
    }
    await page.locator('.btn-cancel').click();
    await page.waitForTimeout(500);

    // 4. Calendar overflow
    await page.locator('.calendar-toggle-btn').click();
    await page.waitForTimeout(800);
    const calOverflow = await page.evaluate(() => {
      const cal = document.querySelector('.calendar-container');
      if (!cal) return null;
      return { scrollW: cal.scrollWidth, clientW: cal.clientWidth };
    });
    if (calOverflow && calOverflow.scrollW > calOverflow.clientWidth + 5) {
      issues.push(`${bp.name}: calendar overflow scrollW=${calOverflow.scrollW} > clientW=${calOverflow.clientWidth}`);
    }
    await page.locator('.calendar-toggle-btn').click();
    await page.waitForTimeout(500);

    await snap(bp.name);
  }

  console.log(`\n===== RESPONSIVE ISSUES =====`);
  if (issues.length === 0) console.log('  No issues found!');
  else issues.forEach(i => console.log(`  ! ${i}`));
  console.log(`\n  Total: ${issues.length}`);

  await browser.close();
  return issues.length;
}

run().then(n => { process.exit(n > 0 ? 1 : 0); }).catch(e => { console.error('FATAL:', e.message); process.exit(1); });