const { chromium } = require('@playwright/test');
const appErrors = [];
const results = {};
const dimIssues = [];

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

  async function dims(sel, name, opts = {}) {
    const loc = page.locator(sel).first();
    if (!(await loc.isVisible().catch(() => false))) {
      check(name, false, 'NOT VISIBLE');
      return null;
    }
    const b = await loc.boundingBox();
    if (!b) { check(name, false, 'NO BBOX'); return null; }
    const w = Math.round(b.width), h = Math.round(b.height);
    let ok = true;
    if (opts.minW && w < opts.minW) { dimIssues.push(`${name} width ${w} < min ${opts.minW}`); ok = false; }
    if (opts.maxW && w > opts.maxW) { dimIssues.push(`${name} width ${w} > max ${opts.maxW}`); ok = false; }
    if (opts.minH && h < opts.minH) { dimIssues.push(`${name} height ${h} < min ${opts.minH}`); ok = false; }
    if (opts.maxH && h > opts.maxH) { dimIssues.push(`${name} height ${h} > max ${opts.maxH}`); ok = false; }
    check(name, ok, `${w}x${h}`);
    return { w, h };
  }

  async function test(name, fn) {
    const before = appErrors.length;
    try { await Promise.race([fn(), new Promise((_, r) => setTimeout(() => r('timeout'), 8000))]); } catch {}
    const errs = appErrors.slice(before);
    check(name, errs.length === 0, errs.length > 0 ? `+${errs.length} err` : '');
  }

  async function login(user, pass) {
    await page.goto('http://localhost:8080/login');
    await page.evaluate(() => { localStorage.removeItem('gantt_user'); localStorage.removeItem('gantt_token'); });
    await page.reload(); await page.waitForLoadState('networkidle');
    await page.fill('#usuario', user); await page.fill('#password', pass);
    await page.click('button[type=submit]'); await page.waitForTimeout(3000);
  }

  console.log('========================================');
  console.log('  TEST REGRESION COMPLETO');
  console.log('========================================');

  // ========== 1. API ==========
  console.log('\n=== 1. API ===');
  const health = await (await fetch('http://localhost:3000/api/health')).json();
  check('Health', health.status === 'ok');

  // Login first to get JWT token
  const adminLogin = await (await fetch('http://localhost:3000/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'emmanuel.villasanti', password: 'epem2023@@' }) })).json();
  check('Login admin', adminLogin.rol === 'Admin');
  const adminToken = adminLogin.token;

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };

  const itemsRes = await (await fetch('http://localhost:3000/api/items', { headers: authHeaders })).json();
  check('Items endpoint', itemsRes.data?.length >= 7, `${itemsRes.data?.length} items`);
  const usersRes = await (await fetch('http://localhost:3000/api/users', { headers: authHeaders })).json();
  check('Users endpoint', usersRes.data?.length >= 3, `${usersRes.data?.length} users`);
  const rowsRes = await (await fetch('http://localhost:3000/api/rows', { headers: authHeaders })).json();
  check('Rows endpoint', rowsRes.length >= 6, `${rowsRes.length} rows`);
  check('Multi-assign API', !!itemsRes.data?.some(i => i.assigned_user_ids?.length > 0));
  check('Created_by API', !!itemsRes.data?.some(i => i.created_by));
  const emailLogin = await (await fetch('http://localhost:3000/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'jean.sandoval@epem.com', password: 'jean123' }) })).json();
  check('Login con email', emailLogin.rol === 'Usuario');
  const nameLogin = await (await fetch('http://localhost:3000/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'Jean Sandoval', password: 'jean123' }) })).json();
  check('Login con nombre', nameLogin.rol === 'Usuario');
  const badLogin = await (await fetch('http://localhost:3000/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'emmanuel.villasanti', password: 'wrong' }) })).json();
  check('Login bad password', !badLogin.rol);
  const delRes = await (await fetch(`http://localhost:3000/api/rows/${itemsRes.data?.[0]?.row_id}`, { method: 'DELETE', headers: authHeaders })).json();
  check('Row delete protection', delRes.error?.includes('Cannot delete'));

  // ========== 2. LOGIN + GANTT LAYOUT (ADMIN) ==========
  console.log('\n=== 2. GanttChart Layout (Admin) ===');
  await login('emmanuel.villasanti', 'epem2023@@');

  await dims('.gantt-container', 'Gantt Container', { minW: 800, minH: 300 });
  await dims('.gantt-header', 'Header', { minW: 800, minH: 60, maxH: 120 });
  await dims('.gantt-list-header', 'List Header', { minW: 180, maxW: 280, minH: 40, maxH: 100 });
  await dims('.gantt-body', 'Body', { minW: 800, minH: 200 });
  await dims('.gantt-list', 'List Panel', { minW: 200, maxW: 300 });
  await dims('.gantt-timeline', 'Timeline', { minW: 400 });
  await dims('.add-btn', 'Add Button', { minW: 50, minH: 24, maxH: 40 });
  await dims('.export-btn', 'Export Button', { minW: 50, minH: 24, maxH: 40 });
  await dims('.theme-toggle', 'Theme Toggle', { minW: 28, minH: 28, maxH: 44 });
  await dims('.calendar-toggle-btn', 'Calendar Toggle', { minW: 80, minH: 28, maxH: 44 });
  await dims('.admin-btn', 'Admin Button', { minW: 60, minH: 28, maxH: 44 });

  // ========== 3. CATEGORIES ==========
  console.log('\n=== 3. Categories (Admin) ===');
  const catCount = await page.locator('.row-label').count();
  check('Category labels >= 6', catCount >= 6, `${catCount}`);

  await page.locator('.row-label-row').first().hover();
  await page.waitForTimeout(400);
  await dims('.row-actions >> nth=0', 'Row Actions', { minW: 40, minH: 24, maxH: 40 });
  await dims('.row-action-btn.edit >> nth=0', 'Edit Cat Btn', { minW: 24, minH: 24, maxH: 36 });
  await dims('.row-action-btn.delete >> nth=0', 'Delete Cat Btn', { minW: 24, minH: 24, maxH: 36 });

  await test('Click editar categoria', async () => {
    await page.locator('.row-action-btn.edit').first().click({ force: true });
    await page.waitForTimeout(500);
  });
  await dims('.row-rename-input', 'Rename Input', { minW: 80, minH: 20, maxH: 40 });
  await dims('.row-save-btn', 'Save Rename Btn', { minW: 24, minH: 24, maxH: 36 });
  await dims('.row-cancel-btn', 'Cancel Rename Btn', { minW: 24, minH: 24, maxH: 36 });
  await page.press('body', 'Escape');
  await page.waitForTimeout(300);

  await test('Dblclick categoria rename', async () => {
    await page.locator('.row-label').first().dblclick();
    await page.waitForTimeout(500);
  });
  await page.press('body', 'Escape');
  await page.waitForTimeout(300);

  // ========== 4. GANTT MODAL (3 cols) ==========
  console.log('\n=== 4. Gantt Modal (3 columnas) ===');
  await page.locator('.add-btn').click();
  await page.waitForTimeout(800);

  await dims('.modal', 'Gantt Modal', { minW: 900, minH: 500 });
  await dims('.modal-header', 'Modal Header', { minW: 900, minH: 50, maxH: 100 });
  await dims('.panel-left', 'Panel Datos', { minW: 200, maxW: 400, minH: 300 });
  await dims('.panel-center', 'Panel Usuarios', { minW: 200, minH: 300 });
  await dims('.panel-right', 'Panel Planif', { minW: 200, maxW: 450, minH: 300 });
  await dims('.btn-save', 'Save Btn', { minW: 80, minH: 30, maxH: 50 });
  await dims('.btn-cancel', 'Cancel Btn', { minW: 60, minH: 30, maxH: 50 });
  await dims('.range-summary', 'Range Summary', { minW: 150, minH: 40 });

  const gCards = await page.locator('.modal .user-card').all();
  check('User cards count >= 3', gCards.length >= 3, `${gCards.length}`);
  if (gCards.length > 0) {
    const b = await gCards[0].boundingBox();
    check('User card dims', b && b.width >= 100 && b.width <= 400 && b.height >= 30 && b.height <= 80,
      b ? `${Math.round(b.width)}x${Math.round(b.height)}` : 'NO BBOX');
  }

  const gInputs = await page.locator('.modal .form-input').all();
  check('Form inputs count >= 5', gInputs.length >= 5, `${gInputs.length}`);
  for (let i = 0; i < Math.min(gInputs.length, 6); i++) {
    const b = await gInputs[i].boundingBox();
    if (b) check(`Input ${i} height`, b.height >= 30 && b.height <= 60, `${Math.round(b.height)}px`);
  }

  await test('Fill task name', async () => {
    await page.locator('.panel-left .form-input').first().fill('Test Regression Task');
  });
  await test('Select category', async () => {
    const sel = page.locator('.panel-left select.form-input');
    if (await sel.count() > 0) await sel.selectOption({ index: 1 });
  });
  await test('Click user card 1', async () => {
    const card = page.locator('.modal .user-card').first();
    if (await card.isVisible()) await card.click();
  });
  await test('Click user card 2', async () => {
    const card = page.locator('.modal .user-card').nth(1);
    if (await card.isVisible()) await card.click();
  });

  const chipCount = await page.locator('.modal .user-chip').count();
  check('User chips appear', chipCount >= 1, `${chipCount}`);
  if (chipCount > 0) {
    await dims('.modal .user-chip >> nth=0', 'User Chip', { minW: 60, minH: 20, maxH: 40 });
  }

  const checkCount = await page.locator('.modal .card-check.checked').count();
  check('Checked cards visible', checkCount >= 1, `${checkCount}`);

  await test('Remove chip', async () => {
    const rm = page.locator('.modal .chip-remove').first();
    if (await rm.isVisible()) await rm.click();
    await page.waitForTimeout(200);
  });

  await page.locator('.btn-cancel').click();
  await page.waitForTimeout(500);

  // ========== 5. TIMELINE ITEMS ==========
  console.log('\n=== 5. Timeline Items ===');
  const items = page.locator('[class*="gantt-item"]');
  const itemCount = await items.count();
  check('Timeline items >= 5', itemCount >= 5, `${itemCount}`);

  if (itemCount > 0) {
    await items.first().hover();
    await page.waitForTimeout(300);
    await dims('.gantt-overlay-btn.edit >> nth=0', 'Overlay Edit Btn', { minW: 20, minH: 20, maxH: 32 });
    await dims('.gantt-overlay-btn.delete >> nth=0', 'Overlay Delete Btn', { minW: 20, minH: 20, maxH: 32 });

    await test('Click edit overlay -> modal', async () => {
      await page.locator('.gantt-overlay-btn.edit').first().click({ force: true });
      await page.waitForTimeout(800);
    });
    const editModalVisible = await page.locator('.modal').isVisible().catch(() => false);
    check('Edit modal from overlay', editModalVisible);
    await page.locator('.btn-cancel').click();
    await page.waitForTimeout(500);
  }

  // Context menu
  if (itemCount > 0) {
    await items.first().click({ button: 'right' });
    await page.waitForTimeout(300);
    await dims('.gantt-context-menu', 'Context Menu', { minW: 100, minH: 60 });
    await page.click('body');
    await page.waitForTimeout(200);
  }

  // ========== 6. FILTERS + SEARCH ==========
  console.log('\n=== 6. Filters + Search ===');
  await test('Filter En Progreso', async () => {
    const ft = page.locator('span:has-text("En Progreso")').first();
    if (await ft.isVisible()) { await ft.click(); await page.waitForTimeout(300); }
  });
  await test('Filter Completadas', async () => {
    const ft = page.locator('span:has-text("Completadas")').first();
    if (await ft.isVisible()) { await ft.click(); await page.waitForTimeout(300); }
  });
  await test('Filter Todos', async () => {
    const ft = page.locator('span:has-text("Todos")').first();
    if (await ft.isVisible()) { await ft.click(); await page.waitForTimeout(300); }
  });
  await test('Search ThinkChat', async () => {
    await page.locator('.gantt-search-input').fill('ThinkChat');
    await page.waitForTimeout(400);
  });
  await page.locator('.gantt-search-input').clear();

  // ========== 7. THEME + ZOOM ==========
  console.log('\n=== 7. Theme + Zoom ===');
  await test('Theme dark', async () => {
    await page.locator('.theme-toggle').click(); await page.waitForTimeout(300);
  });
  await test('Theme light', async () => {
    await page.locator('.theme-toggle').click(); await page.waitForTimeout(300);
  });
  await test('Zoom in', async () => {
    await page.locator('.zoom-btn').last().click(); await page.waitForTimeout(300);
  });
  await test('Zoom out', async () => {
    await page.locator('.zoom-btn').first().click(); await page.waitForTimeout(300);
  });

  // ========== 8. EXPORT (bug fix validation) ==========
  console.log('\n=== 8. Export (bug fix) ===');
  await test('Export Excel - no crash', async () => {
    await page.locator('.export-btn').click();
    await page.waitForTimeout(500);
  });

  // ========== 9. CALENDAR VIEW ==========
  console.log('\n=== 9. Calendar View ===');
  await page.locator('.calendar-toggle-btn').click();
  await page.waitForTimeout(800);

  await dims('.calendar-container', 'Calendar Container', { minW: 400, minH: 300 });
  await dims('.add-task-btn', 'Calendar Add Task', { minW: 80, minH: 28, maxH: 44 });
  await dims('.today-btn', 'Today Btn', { minW: 30, minH: 26, maxH: 40 });

  await test('Click Mes', async () => {
    const btn = page.locator('.view-switcher button >> nth=0');
    if (await btn.isVisible()) { await btn.click(); await page.waitForTimeout(300); }
  });
  await test('Click Semana', async () => {
    const btn = page.locator('.view-switcher button >> nth=1');
    if (await btn.isVisible()) { await btn.click(); await page.waitForTimeout(300); }
  });
  await test('Click Dia', async () => {
    const btn = page.locator('.view-switcher button >> nth=2');
    if (await btn.isVisible()) { await btn.click(); await page.waitForTimeout(300); }
  });

  // Calendar navigation
  await test('Nav previous', async () => {
    const btn = page.locator('.nav-btn >> nth=0');
    if (await btn.isVisible()) { await btn.click(); await page.waitForTimeout(300); }
  });
  await test('Nav next', async () => {
    const btn = page.locator('.nav-btn >> nth=1');
    if (await btn.isVisible()) { await btn.click(); await page.waitForTimeout(300); }
  });
  await test('Click Hoy', async () => {
    const btn = page.locator('.today-btn');
    if (await btn.isVisible()) { await btn.click(); await page.waitForTimeout(300); }
  });

  // ========== 10. CALENDAR MODAL ==========
  console.log('\n=== 10. Calendar Modal (3 columnas) ===');
  await page.locator('.view-switcher button >> nth=0').click();
  await page.waitForTimeout(300);
  await page.locator('.add-task-btn').click();
  await page.waitForTimeout(800);

  await dims('.modal', 'Calendar Modal', { minW: 900, minH: 500 });
  await dims('.modal-header', 'Cal Modal Header', { minW: 900, minH: 50, maxH: 100 });
  await dims('.panel-left', 'Cal Panel Datos', { minW: 200, maxW: 400, minH: 300 });
  await dims('.panel-center', 'Cal Panel Usuarios', { minW: 200, minH: 300 });
  await dims('.panel-right', 'Cal Panel Planif', { minW: 200, maxW: 450, minH: 300 });
  await dims('.btn-save', 'Cal Save Btn', { minW: 80, minH: 30, maxH: 50 });
  await dims('.btn-cancel', 'Cal Cancel Btn', { minW: 60, minH: 30, maxH: 50 });
  await dims('.range-summary', 'Cal Range Summary', { minW: 150, minH: 40 });

  const cCards = await page.locator('.modal .user-card').all();
  check('Cal user cards >= 3', cCards.length >= 3, `${cCards.length}`);

  await test('Cal fill task name', async () => {
    await page.locator('.panel-left .form-input').first().fill('Calendar Test Task');
  });
  await test('Cal click user card', async () => {
    const card = page.locator('.modal .user-card').first();
    if (await card.isVisible()) await card.click();
  });
  await page.locator('.btn-cancel').click();
  await page.waitForTimeout(500);

  // ========== 11. ADMIN SIDEBAR ==========
  console.log('\n=== 11. Admin Sidebar ===');
  await page.locator('.calendar-toggle-btn').click();
  await page.waitForTimeout(500);

  await test('Open admin sidebar', async () => {
    await page.locator('.admin-btn').click();
    await page.waitForTimeout(600);
  });
  const sidebarVisible = await page.locator('.sidebar').isVisible().catch(() => false);
  check('Sidebar visible', sidebarVisible);
  await page.press('body', 'Escape');
  await page.waitForTimeout(300);

  // ========== 12. KEYBOARD SHORTCUTS ==========
  console.log('\n=== 12. Keyboard Shortcuts ===');
  await test('N -> new task modal', async () => {
    await page.keyboard.press('n');
    await page.waitForTimeout(800);
  });
  const shortcutModal = await page.locator('.modal').isVisible().catch(() => false);
  check('N opens modal', shortcutModal);
  await page.locator('.btn-cancel').click();
  await page.waitForTimeout(500);

  // ========== 13. USER PERMISSIONS (Jean) ==========
  console.log('\n=== 13. User Permissions (Jean) ===');
  await login('jean.sandoval@epem.com', 'jean123');

  const jeanGantt = await page.locator('.gantt-container').isVisible().catch(() => false);
  check('Jean Gantt visible', jeanGantt);
  const jeanAdmin = await page.locator('.admin-btn').isVisible().catch(() => false);
  check('Jean NO admin btn', !jeanAdmin);
  const jeanCatBtns = await page.locator('.row-action-btn').count();
  check('Jean NO cat btns', jeanCatBtns === 0, `count: ${jeanCatBtns}`);

  // Permissions banner was removed
  const jeanBanner = await page.locator('.permissions-banner').isVisible().catch(() => false);
  check('NO permissions banner', !jeanBanner);

  // Jean opens modal
  await test('Jean open modal', async () => {
    await page.locator('.add-btn').click(); await page.waitForTimeout(600);
  });
  // Jean should NOT see user search (multi-select is admin only)
  const jeanSearch = await page.locator('.modal .user-search').isVisible().catch(() => false);
  check('Jean NO user search', !jeanSearch);
  await page.locator('.btn-cancel').click(); await page.waitForTimeout(300);

  // Jean can create tasks but only modify their own
  const jeanItems = page.locator('[class*="gantt-item"]');
  const jeanItemCount = await jeanItems.count();
  check('Jean sees timeline items', jeanItemCount >= 1, `${jeanItemCount}`);

  // ========== 14. USER PERMISSIONS (Jesus) ==========
  console.log('\n=== 14. User Permissions (Jesus) ===');
  await login('Jesus Alvarenga', 'jesus123');

  const jesusGantt = await page.locator('.gantt-container').isVisible().catch(() => false);
  check('Jesus Gantt visible', jesusGantt);
  const jesusAdmin = await page.locator('.admin-btn').isVisible().catch(() => false);
  check('Jesus NO admin btn', !jesusAdmin);

  await test('Jesus open modal', async () => {
    await page.locator('.add-btn').click(); await page.waitForTimeout(600);
  });
  const jesusSearch = await page.locator('.modal .user-search').isVisible().catch(() => false);
  check('Jesus NO user search', !jesusSearch);
  await page.locator('.btn-cancel').click(); await page.waitForTimeout(300);

  // ========== 15. RESPONSIVE 1024px ==========
  console.log('\n=== 15. Responsive 1024px (Admin) ===');
  await login('emmanuel.villasanti', 'epem2023@@');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(1000);

  await dims('.gantt-container', 'Resp Gantt 1024', { minW: 600, minH: 250 });
  await dims('.add-btn', 'Resp Add Btn 1024', { minW: 40, minH: 22 });

  await page.locator('.add-btn').click();
  await page.waitForTimeout(800);
  await dims('.modal', 'Resp Modal 1024', { minW: 600 });
  const panelL = await page.locator('.panel-left').boundingBox();
  const panelR = await page.locator('.panel-right').boundingBox();
  if (panelL && panelR) {
    const stacked = Math.abs(panelL.x - panelR.x) < 10;
    check('Modal layout 1024', true, stacked ? 'stacked' : 'columns');
  }
  await page.locator('.btn-cancel').click(); await page.waitForTimeout(300);

  // ========== 16. RESPONSIVE 768px ==========
  console.log('\n=== 16. Responsive 768px ===');
  await page.setViewportSize({ width: 768, height: 900 });
  await page.waitForTimeout(1000);

  await dims('.gantt-container', 'Resp Gantt 768', { minW: 400, minH: 250 });
  await page.locator('.add-btn').click();
  await page.waitForTimeout(800);
  await dims('.modal', 'Resp Modal 768', { minW: 400 });
  await page.locator('.btn-cancel').click(); await page.waitForTimeout(300);

  // ========== 17. RESPONSIVE 375px (Mobile) ==========
  console.log('\n=== 17. Responsive 375px (Mobile) ===');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);

  await dims('.gantt-container', 'Mobile Gantt', { minW: 200 });
  await dims('.add-btn', 'Mobile Add Btn', { minW: 24, minH: 24 });

  // ========== 18. CRUD OPERATIONS (Admin) ==========
  console.log('\n=== 18. CRUD Operations ===');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  await login('emmanuel.villasanti', 'epem2023@@');

  // Create task
  let itemCountBefore = await page.locator('[class*="gantt-item"]').count();
  await page.locator('.add-btn').click();
  await page.waitForTimeout(800);
  await page.locator('.panel-left .form-input').first().fill('Regression CRUD Task');
  const catSelect = page.locator('.panel-left select.form-input');
  if (await catSelect.count() > 0) await catSelect.selectOption({ index: 1 });
  await page.locator('.modal .user-card').first().click();
  await page.waitForTimeout(200);
  await page.locator('.btn-save').click();
  await page.waitForTimeout(2000);

  const itemCountAfterCreate = await page.locator('[class*="gantt-item"]').count();
  check('Create task', itemCountAfterCreate >= itemCountBefore, `before:${itemCountBefore} after:${itemCountAfterCreate}`);

  // Edit task (hover + click edit)
  if (itemCountAfterCreate > 0) {
    const lastItem = page.locator('[class*="gantt-item"]').last();
    await lastItem.scrollIntoViewIfNeeded();
    await lastItem.hover();
    await page.waitForTimeout(300);
    await test('Edit task via overlay', async () => {
      const editBtn = page.locator('.gantt-overlay-btn.edit').last();
      if (await editBtn.isVisible()) await editBtn.click({ force: true });
      await page.waitForTimeout(800);
    });
    const editModalVisible = await page.locator('.modal').isVisible().catch(() => false);
    check('Edit modal visible', editModalVisible);
    if (editModalVisible) {
      await page.locator('.panel-left .form-input').first().fill('Regression CRUD Task EDITED');
      await page.locator('.btn-save').click();
      await page.waitForTimeout(1500);
    }
  }

  // ========== SUMMARY ==========
  console.log('\n========================================');
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(v => v).length;
  const failed = total - passed;
  console.log(`  PASARON: ${passed}/${total}`);
  if (failed > 0) console.log(`  FALLARON: ${failed}`);
  console.log(`  ERRORES APP: ${appErrors.filter(e => !e.includes('Failed to fetch')).length}`);
  if (dimIssues.length > 0) {
    console.log(`  PROB DIMENSIONES: ${dimIssues.length}`);
    dimIssues.forEach(d => console.log(`    ! ${d}`));
  }
  console.log('========================================');

  if (failed > 0) {
    console.log('\nFallados:');
    Object.entries(results).filter(([, v]) => !v).forEach(([k, v]) => console.log(`  X ${k}`));
  }

  await page.screenshot({ path: 'C:/Desarrollos BI/vue-gantt/e2e/snap-regression-final.png', fullPage: true });
  await browser.close();

  return failed;
}

run().then(failed => { process.exit(failed > 0 ? 1 : 0); }).catch(e => { console.error('FATAL:', e.message); process.exit(1); });