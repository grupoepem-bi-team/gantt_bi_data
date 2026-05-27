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

  async function clearSession() {
    await page.evaluate(() => { localStorage.removeItem('gantt_user'); localStorage.removeItem('gantt_token'); });
  }

  async function goToLogin() {
    await page.goto('http://localhost:8080/login');
    await clearSession();
    await page.reload();
    await page.waitForLoadState('networkidle');
  }

  async function doLogin(user, pass) {
    await page.fill('#usuario', user);
    await page.fill('#password', pass);
    await page.click('button[type=submit]');
    await page.waitForTimeout(3000);
  }

  async function isOnDashboard() {
    const gantt = await page.locator('.gantt-container').isVisible().catch(() => false);
    const cal = await page.locator('.calendar-container').isVisible().catch(() => false);
    return gantt || cal;
  }

  async function isOnLoginForm() {
    return await page.locator('#usuario').isVisible().catch(() => false);
  }

  async function isChangePasswordVisible() {
    return await page.locator('.modal-overlay:has-text("Cambiar Contrasena")').isVisible().catch(() => false);
  }

  console.log('========================================');
  console.log('  TEST: CHANGE PASSWORD MODAL');
  console.log('========================================');

  // ========== 1. CHANGE PASSWORD MODAL VISIBLE FOR debe_cambiar_password USER ==========
  console.log('\n=== 1. Force Show Change Password Modal ===');
  await goToLogin();
  await doLogin('emmanuel.villasanti', 'epem2023@@');
  check('Admin login success', await isOnDashboard());

  if (await isOnDashboard()) {
    const profileBtn = page.locator('.user-profile-btn');
    await profileBtn.click();
    await page.waitForTimeout(400);

    const menuDropdown = page.locator('.user-menu-dropdown');
    const menuVisible = await menuDropdown.isVisible().catch(() => false);
    check('Profile menu visible', menuVisible);

    // Close menu by clicking elsewhere
    await page.click('body');
    await page.waitForTimeout(300);
  }

  // ========== 2. TRIGGER CHANGE PASSWORD VIA STORE ==========
  console.log('\n=== 2. Trigger Change Password via Store ===');
  // Set debe_cambiar_password = true on current user
  await page.evaluate(() => {
    const user = JSON.parse(localStorage.getItem('gantt_user') || '{}');
    user.debe_cambiar_password = true;
    localStorage.setItem('gantt_user', JSON.stringify(user));
  });

  // Reload to trigger the watch on mustChangePassword
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const modalVisible = await isChangePasswordVisible();
  check('Change password modal appeared', modalVisible);

  // ========== 3. MODAL UI ELEMENTS ==========
  console.log('\n=== 3. Modal UI Elements ===');
  if (modalVisible) {
    const title = await page.locator('.modal-header h2').first().textContent().catch(() => '');
    check('Modal title correct', title?.includes('Cambiar'), `got: "${title?.trim()}"`);

    const subtitle = await page.locator('.subtitle').first().textContent().catch(() => '');
    check('Modal subtitle present', subtitle?.trim().length > 0, `got: "${subtitle?.trim().substring(0, 50)}"`);

    const currentInput = page.locator('#current');
    check('Current password input present', await currentInput.isVisible().catch(() => false));

    const newInput = page.locator('#new');
    check('New password input present', await newInput.isVisible().catch(() => false));

    const confirmInput = page.locator('#confirm');
    check('Confirm password input present', await confirmInput.isVisible().catch(() => false));

    const submitBtn = page.locator('button.btn-primary:has-text("Guardar")');
    check('Submit button present', await submitBtn.isVisible().catch(() => false));
    check('Submit button disabled initially', await submitBtn.isDisabled().catch(() => true));
  }

  // ========== 4. VALIDATION: EMPTY SUBMIT ==========
  console.log('\n=== 4. Validation - Empty Submit ===');
  if (await isChangePasswordVisible()) {
    const submitBtn = page.locator('button.btn-primary:has-text("Guardar")');
    check('Empty: submit disabled', await submitBtn.isDisabled().catch(() => true));
  }

  // ========== 5. VALIDATION: PASSWORDS DON'T MATCH ==========
  console.log('\n=== 5. Validation - Passwords Dont Match ===');
  if (await isChangePasswordVisible()) {
    await page.fill('#current', 'epem2023@@');
    await page.fill('#new', 'newpass123');
    await page.fill('#confirm', 'different123');
    await page.waitForTimeout(300);

    const mismatchHint = await page.locator('.field-hint.error:has-text("no coinciden")').isVisible().catch(() => false);
    check('Mismatch hint visible', mismatchHint);

    const submitBtn = page.locator('button.btn-primary:has-text("Guardar")');
    check('Mismatch: submit disabled', await submitBtn.isDisabled().catch(() => true));
  }

  // ========== 6. VALIDATION: PASSWORD TOO SHORT ==========
  console.log('\n=== 6. Validation - Password Too Short ===');
  if (await isChangePasswordVisible()) {
    await page.fill('#current', 'epem2023@@');
    await page.fill('#new', 'abc');
    await page.fill('#confirm', 'abc');
    await page.waitForTimeout(300);

    const shortHint = await page.locator('.field-hint:not(.error):has-text("6 caracteres")').isVisible().catch(() => false);
    check('Too short hint visible', shortHint);

    const submitBtn = page.locator('button.btn-primary:has-text("Guardar")');
    check('Short pass: submit disabled', await submitBtn.isDisabled().catch(() => true));
  }

  // ========== 7. VALIDATION: CORRECT FORMAT ENABLES SUBMIT ==========
  console.log('\n=== 7. Validation - Correct Format ===');
  if (await isChangePasswordVisible()) {
    await page.fill('#current', 'epem2023@@');
    await page.fill('#new', 'newpass123');
    await page.fill('#confirm', 'newpass123');
    await page.waitForTimeout(300);

    const submitBtn = page.locator('button.btn-primary:has-text("Guardar")');
    check('Correct format: submit enabled', !(await submitBtn.isDisabled().catch(() => true)));
  }

  // ========== 8. WRONG CURRENT PASSWORD ==========
  console.log('\n=== 8. Wrong Current Password ===');
  if (await isChangePasswordVisible()) {
    // Reset the form first
    await page.fill('#current', 'wrongpassword');
    await page.fill('#new', 'newpass123');
    await page.fill('#confirm', 'newpass123');

    // We need to intercept the API call to avoid actually changing password
    // Instead, let's just check the form validation is correct

    // Actually, let's test the real flow with the API
    // But we'll change back after, so let's try with the correct current password
    // First, test wrong password:
    await page.fill('#current', 'wrongpassword');
    await page.fill('#new', 'testpass123');
    await page.fill('#confirm', 'testpass123');

    const submitBtn = page.locator('button.btn-primary:has-text("Guardar")');
    if (!(await submitBtn.isDisabled().catch(() => true))) {
      await submitBtn.click();
      await page.waitForTimeout(2000);

      const errorMsg = await page.locator('.error-message').isVisible().catch(() => false);
      const errorText = await page.locator('.error-message').textContent().catch(() => '');
      check('Wrong password: error shown', errorMsg, `got: "${errorText?.trim().substring(0, 60)}"`);
    } else {
      check('Wrong password: submit disabled unexpectedly', false);
    }
  }

  // ========== 9. SUCCESSFUL PASSWORD CHANGE (then change back) ==========
  console.log('\n=== 9. Successful Password Change ===');
  if (await isChangePasswordVisible()) {
    await page.fill('#current', 'epem2023@@');
    await page.fill('#new', 'epem2023@@');
    await page.fill('#confirm', 'epem2023@@');

    const submitBtn = page.locator('button.btn-primary:has-text("Guardar")');
    if (!(await submitBtn.isDisabled().catch(() => true))) {
      await submitBtn.click();
      await page.waitForTimeout(3000);

      // Modal should close on success
      const modalGone = !(await isChangePasswordVisible());
      check('Success: modal closed', modalGone);

      // Dashboard should still be visible
      check('Success: still on dashboard', await isOnDashboard());
    } else {
      check('Success: submit disabled unexpectedly', false);
    }
  }

  // ========== 10. MANUAL TRIGGER - Open change password from profile ==========
  console.log('\n=== 10. Dashboard Still Works ===');
  // Verify the app is still functional after password change
  const ganttVisible = await page.locator('.gantt-container').isVisible().catch(() => false);
  check('Gantt still visible', ganttVisible);

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

  await page.screenshot({ path: 'C:/Desarrollos BI/vue-gantt/e2e/snap-change-password.png' });
  await browser.close();
  return failed;
}

run().then(failed => { process.exit(failed > 0 ? 1 : 0); }).catch(e => { console.error('FATAL:', e.message); process.exit(1); });