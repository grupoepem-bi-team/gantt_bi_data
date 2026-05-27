const { chromium } = require('@playwright/test');
const results = {};

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  page.on('pageerror', err => {
    if (!err.message.includes('installHook') && !err.message.includes('message channel')) {
      console.error('PAGE ERROR:', err.message);
    }
  });

  async function dims(sel, label) {
    const loc = page.locator(sel).first();
    const visible = await loc.isVisible().catch(() => false);
    if (!visible) { console.log(`  -- ${label}: NO VISIBLE`); return null; }
    const b = await loc.boundingBox();
    if (!b) { console.log(`  -- ${label}: NO BBOX`); return null; }
    const w = Math.round(b.width), h = Math.round(b.height), x = Math.round(b.x), y = Math.round(b.y);
    console.log(`  ${w}x${h} @ (${x},${y}) | ${label}`);
    results[label] = { w, h, x, y };
    return { w, h, x, y };
  }

  async function login(user, pass) {
    await page.goto('http://localhost:8080/login');
    await page.evaluate(() => { localStorage.removeItem('gantt_user'); localStorage.removeItem('gantt_token'); });
    await page.reload(); await page.waitForLoadState('networkidle');
    await page.fill('#usuario', user); await page.fill('#password', pass);
    await page.click('button[type=submit]'); await page.waitForTimeout(3000);
  }

  async function snap(name) {
    await page.screenshot({ path: `C:/Desarrollos BI/vue-gantt/e2e/snap-dims-${name}.png` });
  }

  // ========== ADMIN VIEW ==========
  console.log('\n============================================================');
  console.log('  DIMENSION AUDIT - ADMIN (1440x900)');
  console.log('============================================================');

  await login('emmanuel.villasanti', 'epem2023@@');

  // --- HEADER ---
  console.log('\n--- HEADER ---');
  await dims('header.header', 'Header');
  await dims('.logo', 'Logo');
  await dims('.title-group', 'Title Group');
  await dims('.title-group h1', 'Title H1');
  await dims('.subtitle', 'Subtitle');
  await dims('.header-actions', 'Header Actions');
  await dims('.calendar-toggle-btn', 'Calendar Toggle Btn');
  await dims('.admin-btn', 'Admin Btn');
  await dims('.user-profile-btn', 'Profile Btn');
  await snap('01-header');

  // --- GANTT CONTAINER ---
  console.log('\n--- GANTT CONTAINER ---');
  await dims('.gantt-container', 'Gantt Container');
  await snap('02-gantt-container');

  // --- GANTT HEADER (toolbar) ---
  console.log('\n--- GANTT HEADER / TOOLBAR ---');
  await dims('.gantt-header', 'Gantt Header');
  await dims('.gantt-list-header', 'List Header');
  await dims('.add-btn', 'Add Btn (Nueva)');
  await dims('.export-btn', 'Export Btn');
  await dims('.shortcuts-hint', 'Shortcuts Hint');
  await dims('.shortcut-key >> nth=0', 'Shortcut Key N');
  await dims('.shortcut-key >> nth=1', 'Shortcut Key E');
  await dims('.gantt-search-input', 'Search Input');
  await dims('.search-filter-btn >> nth=0', 'Filter: Todos');
  await dims('.search-filter-btn >> nth=1', 'Filter: En Progreso');
  await dims('.search-filter-btn >> nth=2', 'Filter: Completadas');
  await dims('.theme-toggle', 'Theme Toggle');
  await dims('.gantt-date-cell >> nth=0', 'Date Cell #1');
  await snap('03-gantt-toolbar');

  // --- ZOOM ---
  console.log('\n--- ZOOM ---');
  await dims('.zoom-control', 'Zoom Control');
  await dims('.zoom-btn >> nth=0', 'Zoom Out Btn');
  await dims('.zoom-label', 'Zoom Label');
  await dims('.zoom-btn >> nth=1', 'Zoom In Btn');

  // --- GANTT BODY ---
  console.log('\n--- GANTT BODY ---');
  await dims('.gantt-body', 'Gantt Body');
  await snap('04-gantt-body');

  // --- LEFT PANEL (CATEGORIES) ---
  console.log('\n--- LEFT PANEL (CATEGORIES) ---');
  await dims('.gantt-list', 'List Panel');
  await dims('.gantt-list-table', 'List Table');
  await dims('.col-tasks', 'Col Header "Categorias"');
  await dims('.gantt-row-tr >> nth=0', 'Row 0');
  await dims('.cell-tasks >> nth=0', 'Cell 0');
  await dims('.row-label >> nth=0', 'Row Label 0');
  await dims('.row-label >> nth=1', 'Row Label 1');
  await dims('.row-label >> nth=2', 'Row Label 2');
  await dims('.row-label >> nth=3', 'Row Label 3');
  await dims('.row-label >> nth=4', 'Row Label 4');
  await dims('.row-label >> nth=5', 'Row Label 5');

  // Hover row to show action buttons
  await page.locator('.row-label-row').first().hover();
  await page.waitForTimeout(400);
  await dims('.row-actions >> nth=0', 'Row Actions');
  await dims('.row-action-btn.edit >> nth=0', 'Row Edit Btn');
  await dims('.row-action-btn.delete >> nth=0', 'Row Delete Btn');
  await snap('05-cat-hover');

  // Edit mode
  await page.locator('.row-action-btn.edit').first().click({ force: true });
  await page.waitForTimeout(500);
  await dims('.row-edit-row', 'Row Edit Row');
  await dims('.row-rename-input', 'Rename Input');
  await dims('.row-save-btn', 'Row Save Btn');
  await dims('.row-cancel-btn', 'Row Cancel Btn');
  await snap('06-cat-edit');
  await page.press('body', 'Escape');
  await page.waitForTimeout(300);

  // --- TIMELINE ---
  console.log('\n--- TIMELINE ---');
  await dims('.gantt-timeline', 'Timeline Panel');
  await dims('.gantt-header-row', 'Timeline Header Row');
  await dims('.gantt-header-cell >> nth=0', 'Header Cell #1');

  // --- TIMELINE ITEMS ---
  console.log('\n--- TIMELINE ITEMS ---');
  const items = page.locator('[class*="gantt-item"]');
  const itemCount = await items.count();
  console.log(`  Items count: ${itemCount}`);

  if (itemCount > 0) {
    await dims('.gantt-item >> nth=0', 'Item #0 (bar)');
    await dims('.gantt-item-bar >> nth=0', 'Item Bar #0');
    await dims('.gantt-item-label >> nth=0', 'Item Label #0');
    await dims('.gantt-item-progress >> nth=0', 'Item Progress #0');
    await dims('.gantt-resize-handle.gantt-resize-left >> nth=0', 'Resize Left #0');
    await dims('.gantt-resize-handle.gantt-resize-right >> nth=0', 'Resize Right #0');

    // Hover for overlay
    await items.first().hover();
    await page.waitForTimeout(400);
    await dims('.gantt-item-overlay >> nth=0', 'Item Overlay');
    await dims('.gantt-overlay-btn.edit >> nth=0', 'Overlay Edit');
    await dims('.gantt-overlay-btn.delete >> nth=0', 'Overlay Delete');
    await snap('07-item-hover');

    // Avatar on bar
    await dims('.gantt-item-avatars >> nth=0', 'Item Avatars #0');
  }

  // Second item
  if (itemCount > 1) {
    await items.nth(1).hover();
    await page.waitForTimeout(300);
    await dims('.gantt-item >> nth=1', 'Item #1 (bar)');
  }

  // Context menu
  console.log('\n--- CONTEXT MENU ---');
  if (itemCount > 0) {
    await items.first().click({ button: 'right' });
    await page.waitForTimeout(300);
    await dims('.gantt-context-menu', 'Context Menu');
    await dims('.context-menu-item >> nth=0', 'Ctx Item Edit');
    await dims('.context-menu-item >> nth=1', 'Ctx Item Delete');
    await snap('08-context-menu');
    await page.click('body');
    await page.waitForTimeout(200);
  }

  // ========== GANTT MODAL ==========
  console.log('\n--- GANTT MODAL (3 columnas) ---');
  await page.locator('.add-btn').click();
  await page.waitForTimeout(800);
  await snap('09-modal-gantt');

  await dims('.modal-overlay', 'Modal Overlay');
  await dims('.modal', 'Modal');
  await dims('.modal-header', 'Modal Header');
  await dims('.modal-title', 'Modal Title');
  await dims('.modal-title h2', 'Modal Title H2');
  await dims('.modal-actions-head', 'Modal Actions Head');
  await dims('.btn-cancel', 'Cancel Btn');
  await dims('.btn-save', 'Save Btn');
  await dims('.modal-body', 'Modal Body');

  // Panel Left (Datos)
  console.log('\n--- MODAL: PANEL DATOS ---');
  await dims('.panel-left', 'Panel Datos');
  await dims('.panel-left .panel-title >> nth=0', 'Datos Title');
  await dims('.panel-left .form-group >> nth=0', 'Form Group: Nombre');
  await dims('.panel-left .form-group >> nth=1', 'Form Group: Categoria');
  await dims('.panel-left .form-input >> nth=0', 'Input: Nombre');
  await dims('.panel-left select.form-input', 'Select: Categoria');
  await dims('.panel-left .form-group >> nth=2', 'Form Group: Descripcion');
  await dims('.panel-left .form-textarea', 'Textarea: Descripcion');

  // Panel Center (Usuarios)
  console.log('\n--- MODAL: PANEL USUARIOS ---');
  await dims('.panel-center', 'Panel Usuarios');
  await dims('.panel-center .panel-title >> nth=0', 'Usuarios Title');
  await dims('.modal .user-search', 'User Search');
  await dims('.modal .user-search-input', 'User Search Input');
  await dims('.user-grid', 'User Grid');

  const cardCount = await page.locator('.modal .user-card').count();
  console.log(`  User cards count: ${cardCount}`);
  for (let i = 0; i < Math.min(cardCount, 3); i++) {
    await dims(`.modal .user-card >> nth=${i}`, `User Card ${i}`);
    await dims(`.modal .user-card >> nth=${i} .card-avatar`, `Card Avatar ${i}`);
    await dims(`.modal .user-card >> nth=${i} .card-name`, `Card Name ${i}`);
    await dims(`.modal .user-card >> nth=${i} .card-check`, `Card Check ${i}`);
  }

  // Click 2 cards to get chips
  await page.locator('.modal .user-card').first().click();
  await page.waitForTimeout(200);
  await page.locator('.modal .user-card').nth(1).click();
  await page.waitForTimeout(200);

  console.log('\n--- MODAL: USER CHIPS ---');
  const chipCount = await page.locator('.modal .user-chip').count();
  console.log(`  Chips count: ${chipCount}`);
  for (let i = 0; i < chipCount; i++) {
    await dims(`.modal .user-chip >> nth=${i}`, `Chip ${i}`);
    await dims(`.modal .user-chip >> nth=${i} .chip-avatar`, `Chip Avatar ${i}`);
    await dims(`.modal .user-chip >> nth=${i} .chip-name`, `Chip Name ${i}`);
    await dims(`.modal .user-chip >> nth=${i} .chip-remove`, `Chip Remove ${i}`);
  }
  await snap('10-modal-chips');

  // Panel Right (Planificacion)
  console.log('\n--- MODAL: PANEL PLANIFICACION ---');
  await dims('.panel-right', 'Panel Planif');
  await dims('.panel-right .panel-title >> nth=0', 'Planif Title');
  await dims('.panel-right .form-group >> nth=0', 'Form Group: Fecha Inicio');
  await dims('.panel-right .form-group >> nth=1', 'Form Group: Fecha Fin');
  await dims('.panel-right .form-input >> nth=0', 'Input: Fecha Inicio');
  await dims('.panel-right .form-input >> nth=1', 'Input: Fecha Fin');
  await dims('.range-summary', 'Range Summary');
  await dims('.panel-right .form-group >> nth=2', 'Form Group: Hora Inicio');
  await dims('.panel-right .form-group >> nth=3', 'Form Group: Hora Fin');
  await dims('.panel-right .form-input >> nth=2', 'Input: Hora Inicio');
  await dims('.panel-right .form-input >> nth=3', 'Input: Hora Fin');
  await dims('.progress-section', 'Progress Section');
  await dims('.progress-bar-track', 'Progress Track');
  await dims('.progress-slider', 'Progress Slider');
  await dims('.progress-value', 'Progress Value');
  await snap('11-modal-planif');

  await page.locator('.btn-cancel').click();
  await page.waitForTimeout(500);

  // ========== CALENDAR VIEW ==========
  console.log('\n============================================================');
  console.log('  CALENDAR VIEW');
  console.log('============================================================');

  await page.locator('.calendar-toggle-btn').click();
  await page.waitForTimeout(800);
  await snap('12-calendar');

  await dims('.calendar-container', 'Calendar Container');
  await dims('.calendar-header', 'Calendar Header');
  await dims('.calendar-nav', 'Calendar Nav');
  await dims('.nav-btn >> nth=0', 'Nav Prev');
  await dims('.nav-btn >> nth=1', 'Nav Next');
  await dims('.calendar-title', 'Calendar Title');
  await dims('.view-switcher', 'View Switcher');
  await dims('.view-switcher button >> nth=0', 'View: Mes');
  await dims('.view-switcher button >> nth=1', 'View: Semana');
  await dims('.view-switcher button >> nth=2', 'View: Dia');
  await dims('.today-btn', 'Today Btn');
  await dims('.add-task-btn', 'Cal Add Task Btn');

  // Day grid
  console.log('\n--- CALENDAR: MONTH GRID ---');
  await dims('.calendar-grid', 'Calendar Grid');
  await dims('.calendar-weekday-header >> nth=0', 'Weekday Header 0');
  const dayCount = await page.locator('.calendar-day').count();
  console.log(`  Days visible: ${dayCount}`);
  if (dayCount > 0) {
    await dims('.calendar-day >> nth=0', 'Day Cell 0');
    await dims('.calendar-day >> nth=6', 'Day Cell 6');
  }

  // Week view
  console.log('\n--- CALENDAR: WEEK VIEW ---');
  await page.locator('.view-switcher button >> nth=1').click();
  await page.waitForTimeout(400);
  await snap('13-calendar-week');
  await dims('.calendar-grid', 'Week Grid');
  await dims('.time-slot >> nth=0', 'Time Slot 0');

  // Day view
  console.log('\n--- CALENDAR: DAY VIEW ---');
  await page.locator('.view-switcher button >> nth=2').click();
  await page.waitForTimeout(400);
  await snap('14-calendar-day');

  // Calendar Modal
  console.log('\n--- CALENDAR MODAL ---');
  await page.locator('.view-switcher button >> nth=0').click();
  await page.waitForTimeout(300);
  await page.locator('.add-task-btn').click();
  await page.waitForTimeout(800);
  await snap('15-calendar-modal');

  await dims('.modal', 'Cal Modal');
  await dims('.modal-header', 'Cal Modal Header');
  await dims('.panel-left', 'Cal Panel Datos');
  await dims('.panel-center', 'Cal Panel Usuarios');
  await dims('.panel-right', 'Cal Panel Planif');
  await dims('.btn-save', 'Cal Save');
  await dims('.btn-cancel', 'Cal Cancel');

  await page.locator('.btn-cancel').click();
  await page.waitForTimeout(500);

  // ========== ADMIN SIDEBAR ==========
  console.log('\n============================================================');
  console.log('  ADMIN SIDEBAR');
  console.log('============================================================');

  await page.locator('.calendar-toggle-btn').click();
  await page.waitForTimeout(500);
  await page.locator('.admin-btn').click();
  await page.waitForTimeout(600);
  await snap('16-admin-sidebar');

  await dims('.sidebar-overlay', 'Sidebar Overlay');
  await dims('.sidebar', 'Sidebar');
  await dims('.sidebar-header', 'Sidebar Header');
  await dims('.sidebar-header h2', 'Sidebar Title');
  await dims('.close-btn', 'Close Btn');
  await dims('.sidebar-tabs', 'Sidebar Tabs');
  await dims('.tab-btn >> nth=0', 'Tab: Usuarios');
  await dims('.tab-btn >> nth=1', 'Tab: Actividad');

  // User list in sidebar
  const sidebarUserItems = await page.locator('.sidebar-user-item, .user-list-item, .tab-btn.active ~ * .user-item').count();
  console.log(`  Sidebar user items: ${sidebarUserItems}`);
  const allSidebarBtns = await page.locator('.sidebar button, .sidebar .user-card').count();
  console.log(`  Sidebar interactive elements: ${allSidebarBtns}`);

  // Activity tab
  await page.locator('.tab-btn >> nth=1').click();
  await page.waitForTimeout(400);
  await snap('18-sidebar-activity');
  const logCount = await page.locator('.activity-log-item, .log-item').count();
  console.log(`  Activity logs: ${logCount}`);
  await snap('18-sidebar-activity');

  await page.press('body', 'Escape');
  await page.waitForTimeout(500);

  // Force close sidebar overlay if still visible
  await page.evaluate(() => {
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.remove();
  });
  await page.waitForTimeout(300);

  // ========== USER PROFILE MENU ==========
  console.log('\n============================================================');
  console.log('  USER PROFILE MENU (Logout)');
  console.log('============================================================');

  await page.locator('.user-profile-btn').click({ force: true });
  await page.waitForTimeout(400);
  await snap('19-profile-menu');

  await dims('.user-menu-overlay', 'User Menu Overlay');
  await dims('.user-menu-dropdown', 'User Menu Dropdown');
  await dims('.user-menu-header', 'User Menu Header');
  await dims('.user-avatar-md', 'Avatar MD');
  await dims('.user-menu-info', 'Menu Info');
  await dims('.user-menu-name', 'Menu Name');
  await dims('.user-menu-email', 'Menu Email');
  await dims('.user-menu-rol', 'Menu Rol');
  await dims('.user-menu-divider', 'Menu Divider');
  await dims('.user-menu-item.logout', 'Logout Item');
  await page.locator('.user-menu-overlay').click();
  await page.waitForTimeout(300);

  // ========== RESPONSIVE DIMENSIONS ==========
  console.log('\n============================================================');
  console.log('  RESPONSIVE: 1024x768');
  console.log('============================================================');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(1000);
  await snap('20-resp-1024');

  await dims('header.header', 'Resp Header');
  await dims('.logo', 'Resp Logo');
  await dims('.title-group', 'Resp Title');
  await dims('.gantt-container', 'Resp Gantt');
  await dims('.add-btn', 'Resp Add Btn');
  await dims('.export-btn', 'Resp Export');

  // Modal at 1024
  await page.locator('.add-btn').click();
  await page.waitForTimeout(800);
  await snap('21-resp-1024-modal');
  await dims('.modal', 'Resp Modal 1024');
  await dims('.panel-left', 'Resp Panel Left 1024');
  await dims('.panel-center', 'Resp Panel Center 1024');
  await dims('.panel-right', 'Resp Panel Right 1024');
  await page.locator('.btn-cancel').click();
  await page.waitForTimeout(500);

  console.log('\n============================================================');
  console.log('  RESPONSIVE: 768x900');
  console.log('============================================================');
  await page.setViewportSize({ width: 768, height: 900 });
  await page.waitForTimeout(1000);
  await snap('22-resp-768');

  await dims('header.header', 'Resp768 Header');
  await dims('.gantt-container', 'Resp768 Gantt');
  await dims('.add-btn', 'Resp768 Add Btn');
  await dims('.export-btn', 'Resp768 Export');

  await page.locator('.add-btn').click();
  await page.waitForTimeout(800);
  await snap('23-resp-768-modal');
  await dims('.modal', 'Resp768 Modal');
  await dims('.panel-left', 'Resp768 Panel Left');
  await dims('.panel-center', 'Resp768 Panel Center');
  await dims('.panel-right', 'Resp768 Panel Right');
  await page.locator('.btn-cancel').click();
  await page.waitForTimeout(500);

  console.log('\n============================================================');
  console.log('  RESPONSIVE: 375x812 (Mobile)');
  console.log('============================================================');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  await snap('24-mobile');

  await dims('header.header', 'Mobile Header');
  await dims('.logo', 'Mobile Logo');
  await dims('.title-group', 'Mobile Title');
  await dims('.gantt-container', 'Mobile Gantt');
  await dims('.add-btn', 'Mobile Add Btn');
  await dims('.export-btn', 'Mobile Export');
  await dims('.calendar-toggle-btn', 'Mobile Calendar Btn');
  await dims('.user-profile-btn', 'Mobile Profile Btn');

  // ========== JEAN USER DIMENSIONS ==========
  console.log('\n============================================================');
  console.log('  USER VIEW: JEAN (1440x900)');
  console.log('============================================================');
  await page.setViewportSize({ width: 1440, height: 900 });
  await login('jean.sandoval@epem.com', 'jean123');
  await snap('25-jean-view');

  await dims('header.header', 'Jean Header');
  await dims('.gantt-container', 'Jean Gantt');
  await dims('.add-btn', 'Jean Add Btn');
  await dims('.export-btn', 'Jean Export Btn');
  await dims('.calendar-toggle-btn', 'Jean Calendar Btn');
  await dims('.user-profile-btn', 'Jean Profile Btn');

  // Jean should NOT see admin btn or cat btns
  const jeanAdminBtn = await page.locator('.admin-btn').isVisible().catch(() => false);
  console.log(`  Jean admin btn visible: ${jeanAdminBtn}`);
  const jeanCatBtns = await page.locator('.row-action-btn').count();
  console.log(`  Jean cat action btns: ${jeanCatBtns}`);

  // Jean modal
  await page.locator('.add-btn').click();
  await page.waitForTimeout(800);
  await snap('26-jean-modal');
  await dims('.modal', 'Jean Modal');
  await dims('.panel-left', 'Jean Panel Datos');
  await dims('.panel-center', 'Jean Panel Usuarios');
  await dims('.panel-right', 'Jean Panel Planif');

  const jeanUserSearch = await page.locator('.modal .user-search').isVisible().catch(() => false);
  console.log(`  Jean user search visible: ${jeanUserSearch}`);
  await page.locator('.btn-cancel').click();
  await page.waitForTimeout(500);

  // ========== SUMMARY ==========
  console.log('\n============================================================');
  console.log('  DIMENSION SUMMARY');
  console.log('============================================================');

  const categories = {};
  Object.entries(results).forEach(([label, d]) => {
    const cat = label.split(' ').slice(0, 2).join(' ');
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ label, ...d });
  });

  Object.entries(categories).sort().forEach(([cat, items]) => {
    console.log(`\n  [${cat}]`);
    items.sort((a, b) => a.label.localeCompare(b.label)).forEach(d => {
      console.log(`    ${String(d.w + 'x' + d.h).padEnd(12)} @ (${String(d.x).padStart(4)},${String(d.y).padStart(4)}) | ${d.label}`);
    });
  });

  console.log(`\n  Total elements measured: ${Object.keys(results).length}`);
  console.log('  Screenshots: e2e/snap-dims-*.png');
  console.log('============================================================');

  await browser.close();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });