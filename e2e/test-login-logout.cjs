const { chromium } = require('@playwright/test');
const appErrors = [];
const results = {};

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  page.on('pageerror', err => {
    if (!err.message.includes('installHook') && !err.message.includes('message channel')) {
      appErrors.push(err.message);
    }
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('installHook') && !t.includes('message channel') && !t.includes('Failed to fetch')) {
        appErrors.push(t);
      }
    }
  });

  function check(name, ok, detail) {
    results[name] = ok;
    console.log(`  ${ok ? 'OK' : 'X '} ${name}${detail ? ' [' + detail + ']' : ''}`);
  }

  async function test(name, fn) {
    const before = appErrors.length;
    try { await Promise.race([fn(), new Promise((_, r) => setTimeout(() => r('timeout'), 10000))]); } catch {}
    const errs = appErrors.slice(before);
    check(name, errs.length === 0, errs.length > 0 ? `+${errs.length} err` : '');
  }

  async function clearSession() {
    await page.evaluate(() => { localStorage.removeItem('gantt_user'); localStorage.removeItem('gantt_token'); });
  }

  async function goToLogin() {
    await page.goto('http://localhost:8080/login');
    await clearSession();
    await page.reload();
    await page.waitForLoadState('networkidle');
  }

  async function isOnDashboard() {
    const gantt = await page.locator('.gantt-container').isVisible().catch(() => false);
    const cal = await page.locator('.calendar-container').isVisible().catch(() => false);
    return gantt || cal;
  }

  async function isOnLoginForm() {
    return await page.locator('#usuario').isVisible().catch(() => false);
  }

  async function doLogin(user, pass) {
    await page.fill('#usuario', user);
    await page.fill('#password', pass);
    await page.click('button[type=submit]');
    await page.waitForTimeout(3000);
  }

  console.log('========================================');
  console.log('  TEST: LOGIN + LOGOUT + RE-LOGIN');
  console.log('========================================');

  // ========== 1. BAD CREDENTIALS ==========
  console.log('\n=== 1. Bad Credentials ===');
  await goToLogin();
  check('Login form visible', await isOnLoginForm());

  await doLogin('emmanuel.villasanti', 'wrongpassword');
  await page.waitForTimeout(1000);

  check('Bad password: still on login', await isOnLoginForm());
  const errorEl = await page.locator('.error-message').textContent().catch(() => '');
  check('Error message shown', errorEl?.trim().length > 0, `"${errorEl?.trim().substring(0, 60)}"`);

  // ========== 2. EMPTY CREDENTIALS ==========
  console.log('\n=== 2. Empty Credentials ===');
  await goToLogin();
  await page.fill('#usuario', '');
  await page.fill('#password', '');
  await page.click('button[type=submit]');
  await page.waitForTimeout(1000);
  check('Empty creds: still on login', await isOnLoginForm());
  const emptyError = await page.locator('.error-message').textContent().catch(() => '');
  check('Empty error message', emptyError?.trim().length > 0);

  // ========== 3. ADMIN LOGIN -> LOGOUT -> RE-LOGIN ==========
  console.log('\n=== 3. Admin (Emmanuel) ===');
  await goToLogin();
  await doLogin('emmanuel.villasanti', 'epem2023@@');

  check('Admin login success', await isOnDashboard());
  check('Admin: login form hidden', !(await isOnLoginForm()));

  if (await isOnDashboard()) {
    const profileBtn = page.locator('.user-profile-btn');
    check('Admin: profile btn visible', await profileBtn.isVisible().catch(() => false));

    await test('Admin: click profile', async () => {
      await profileBtn.click();
      await page.waitForTimeout(400);
    });

    const menuVisible = await page.locator('.user-menu-dropdown').isVisible().catch(() => false);
    check('Admin: menu dropdown visible', menuVisible);

    if (menuVisible) {
      const menuName = await page.locator('.user-menu-name').textContent();
      check('Admin: menu name', menuName?.trim() === 'emmanuel.villasanti', `got: "${menuName?.trim()}"`);

      const menuRol = await page.locator('.user-menu-rol').textContent();
      check('Admin: menu rol = Admin', menuRol?.trim() === 'Admin', `got: "${menuRol?.trim()}"`);

      const logoutBtn = page.locator('.user-menu-item.logout');
      check('Admin: logout btn visible', await logoutBtn.isVisible().catch(() => false));

      await test('Admin: click logout', async () => {
        await logoutBtn.click();
        await page.waitForTimeout(3000);
      });

      check('Admin: on login form after logout', await isOnLoginForm());
      check('Admin: dashboard gone after logout', !(await isOnDashboard()));

      const storedUser = await page.evaluate(() => localStorage.getItem('gantt_user'));
      const storedToken = await page.evaluate(() => localStorage.getItem('gantt_token'));
      check('Admin: localStorage cleared', !storedUser && !storedToken, `user=${!!storedUser} token=${!!storedToken}`);
    }
  }

  // ========== 4. ADMIN RE-LOGIN ==========
  console.log('\n=== 4. Admin Re-login ===');
  await doLogin('emmanuel.villasanti', 'epem2023@@');
  check('Admin re-login success', await isOnDashboard());

  if (await isOnDashboard()) {
    const adminBtn = await page.locator('.admin-btn').isVisible().catch(() => false);
    check('Admin re-login: admin btn visible', adminBtn);
  }

  // Logout for next test
  await page.locator('.user-profile-btn').click();
  await page.waitForTimeout(400);
  await page.locator('.user-menu-item.logout').click();
  await page.waitForTimeout(3000);

  // ========== 5. USER LOGIN (Jean - email) ==========
  console.log('\n=== 5. User Jean (email) ===');
  await doLogin('jean.sandoval@epem.com', 'jean123');
  check('Jean login success', await isOnDashboard());

  if (await isOnDashboard()) {
    check('Jean: NO admin btn', !(await page.locator('.admin-btn').isVisible().catch(() => false)));
    check('Jean: profile btn visible', await page.locator('.user-profile-btn').isVisible().catch(() => false));

    await page.locator('.user-profile-btn').click();
    await page.waitForTimeout(400);

    const menuName = await page.locator('.user-menu-name').textContent();
    check('Jean: menu name', menuName?.trim() === 'Jean Sandoval', `got: "${menuName?.trim()}"`);

    const menuRol = await page.locator('.user-menu-rol').textContent();
    check('Jean: menu rol = Usuario', menuRol?.trim() === 'Usuario', `got: "${menuRol?.trim()}"`);

    await page.locator('.user-menu-item.logout').click();
    await page.waitForTimeout(3000);
    check('Jean: logout success', await isOnLoginForm());
  }

  // ========== 6. USER LOGIN (Jean - nombre) ==========
  console.log('\n=== 6. User Jean (nombre) ===');
  await doLogin('Jean Sandoval', 'jean123');
  check('Jean login with name', await isOnDashboard());

  if (await isOnDashboard()) {
    await page.locator('.user-profile-btn').click();
    await page.waitForTimeout(400);
    await page.locator('.user-menu-item.logout').click();
    await page.waitForTimeout(3000);
  }

  // ========== 7. USER LOGIN (Jesus - nombre) ==========
  console.log('\n=== 7. User Jesus (nombre) ===');
  await doLogin('Jesus Alvarenga', 'jesus123');
  check('Jesus login success', await isOnDashboard());

  if (await isOnDashboard()) {
    check('Jesus: NO admin btn', !(await page.locator('.admin-btn').isVisible().catch(() => false)));
    check('Jesus: profile btn visible', await page.locator('.user-profile-btn').isVisible().catch(() => false));

    await page.locator('.user-profile-btn').click();
    await page.waitForTimeout(400);

    const menuName = await page.locator('.user-menu-name').textContent();
    check('Jesus: menu name', menuName?.trim() === 'Jesus Alvarenga', `got: "${menuName?.trim()}"`);

    await page.locator('.user-menu-item.logout').click();
    await page.waitForTimeout(3000);
    check('Jesus: logout success', await isOnLoginForm());
  }

  // ========== 8. USER LOGIN (Jesus - email) ==========
  console.log('\n=== 8. User Jesus (email) ===');
  await doLogin('jesus.alvarenga@epem.com', 'jesus123');
  check('Jesus login with email', await isOnDashboard());

  if (await isOnDashboard()) {
    await page.locator('.user-profile-btn').click();
    await page.waitForTimeout(400);
    await page.locator('.user-menu-item.logout').click();
    await page.waitForTimeout(3000);
  }

  // ========== 9. AUTO-LOGIN (localStorage persistence) ==========
  console.log('\n=== 9. Auto-login (localStorage) ===');
  await doLogin('emmanuel.villasanti', 'epem2023@@');
  check('Login for auto-login test', await isOnDashboard());

  if (await isOnDashboard()) {
    await page.reload();
    await page.waitForTimeout(3000);

    check('Auto-login after page reload', await isOnDashboard());

    if (await isOnDashboard()) {
      await page.locator('.user-profile-btn').click();
      await page.waitForTimeout(400);
      const menuName = await page.locator('.user-menu-name').textContent();
      check('Auto-login: correct user', menuName?.trim() === 'emmanuel.villasanti', `got: "${menuName?.trim()}"`);
      await page.locator('.user-menu-item.logout').click();
      await page.waitForTimeout(3000);
    }
  }

  // ========== 10. PROTECTED ROUTE AFTER LOGOUT ==========
  console.log('\n=== 10. Protected route after logout ===');
  check('On login form', await isOnLoginForm());

  await page.goto('http://localhost:8080/');
  await page.waitForTimeout(2000);

  check('Going to / shows login', await isOnLoginForm());

  // ========== SUMMARY ==========
  console.log('\n========================================');
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(v => v).length;
  const failed = total - passed;
  console.log(`  PASARON: ${passed}/${total}`);
  if (failed > 0) console.log(`  FALLARON: ${failed}`);
  console.log(`  ERRORES APP: ${appErrors.length}`);
  console.log('========================================');

  if (failed > 0) {
    console.log('\nFallados:');
    Object.entries(results).filter(([, v]) => !v).forEach(([k]) => console.log(`  X ${k}`));
  }

  await page.screenshot({ path: 'C:/Desarrollos BI/vue-gantt/e2e/snap-login-logout.png' });
  await browser.close();
  return failed;
}

run().then(failed => { process.exit(failed > 0 ? 1 : 0); }).catch(e => { console.error('FATAL:', e.message); process.exit(1); });