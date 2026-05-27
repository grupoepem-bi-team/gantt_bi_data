const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const appErrors = [];
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

  const snap = async (name) => {
    await page.screenshot({ path: `C:/Desarrollos BI/vue-gantt/e2e/snap-admin-${name}.png`, fullPage: false });
  };

  const dims = async (sel, label) => {
    const loc = page.locator(sel).first();
    if (!(await loc.isVisible().catch(() => false))) { console.log(`  X ${label}: NOT VISIBLE`); return; }
    const b = await loc.boundingBox();
    if (!b) { console.log(`  X ${label}: NO BBOX`); return; }
    console.log(`  OK ${label}: ${Math.round(b.width)}x${Math.round(b.height)} @ (${Math.round(b.x)},${Math.round(b.y)})`);
  };

  const testAction = async (name, fn) => {
    const before = appErrors.length;
    try { await Promise.race([fn(), new Promise((_, r) => setTimeout(() => r('timeout'), 8000))]); } catch {}
    const errs = appErrors.slice(before);
    console.log(`  ${errs.length === 0 ? 'OK' : 'X '} ${name}${errs.length > 0 ? ` [+${errs.length} err]` : ''}`);
    if (errs.length > 0) errs.slice(0, 2).forEach(e => console.log(`     -> ${e.substring(0, 120)}`));
  };

  // LOGIN
  console.log('=== LOGIN ADMIN ===');
  await page.goto('http://localhost:8080/login');
  await page.evaluate(() => { localStorage.removeItem('gantt_user'); localStorage.removeItem('gantt_token'); });
  await page.reload(); await page.waitForLoadState('networkidle');
  await snap('01-login');

  await page.fill('#usuario', 'emmanuel.villasanti');
  await page.fill('#password', 'epem2023@@');
  await page.click('button[type=submit]');
  await page.waitForTimeout(3000);
  await snap('02-dashboard');

  // DASHBOARD
  console.log('\n=== DASHBOARD ===');
  await dims('.gantt-container', 'Gantt Container');
  await dims('.gantt-list', 'Panel Categorias');
  await dims('.gantt-timeline', 'Timeline');
  await dims('.add-btn', 'Nueva Tarea');
  await dims('.export-btn', 'Exportar');
  await dims('.theme-toggle', 'Tema');
  await dims('.calendar-toggle-btn', 'Calendario');
  await dims('.admin-btn', 'Admin');

  // CATEGORIAS
  console.log('\n=== CATEGORIAS ===');
  const catCount = await page.locator('.row-label').count();
  console.log(`  OK Labels: ${catCount}`);

  await testAction('Hover cat row 1', async () => {
    await page.locator('.row-label-row').first().hover();
    await page.waitForTimeout(400);
  });
  await snap('03-cat-hover');
  await dims('.row-action-btn.edit >> nth=0', 'Editar cat');
  await dims('.row-action-btn.delete >> nth=0', 'Eliminar cat');

  await testAction('Click editar cat', async () => {
    await page.locator('.row-action-btn.edit').first().click({ force: true });
    await page.waitForTimeout(500);
  });
  await snap('04-cat-edit-mode');
  await dims('.row-rename-input', 'Rename input');
  await dims('.row-save-btn', 'Guardar');
  await dims('.row-cancel-btn', 'Cancelar');
  await page.press('body', 'Escape');
  await page.waitForTimeout(300);

  await testAction('Dblclick cat label', async () => {
    await page.locator('.row-label').first().dblclick();
    await page.waitForTimeout(500);
  });
  await snap('05-cat-dblclick');
  await page.press('body', 'Escape');
  await page.waitForTimeout(300);

  // FILTROS
  console.log('\n=== FILTROS ===');
  await testAction('Filtro En Progreso', async () => {
    await page.locator('span:has-text("En Progreso")').first().click();
    await page.waitForTimeout(400);
  });
  await snap('06-filter-progress');

  await testAction('Filtro Completadas', async () => {
    await page.locator('span:has-text("Completadas")').first().click();
    await page.waitForTimeout(400);
  });
  await snap('07-filter-completed');

  await testAction('Filtro Todos', async () => {
    await page.locator('span:has-text("Todos")').first().click();
    await page.waitForTimeout(400);
  });

  // BUSCAR
  console.log('\n=== BUSCAR ===');
  await testAction('Buscar ThinkChat', async () => {
    await page.locator('.gantt-search-input').fill('ThinkChat');
    await page.waitForTimeout(400);
  });
  await snap('08-search');
  await page.locator('.gantt-search-input').clear();

  // TEMA
  console.log('\n=== TEMA ===');
  await testAction('Toggle tema dark', async () => {
    await page.locator('.theme-toggle').click();
    await page.waitForTimeout(400);
  });
  await snap('09-dark-theme');
  await testAction('Toggle tema light', async () => {
    await page.locator('.theme-toggle').click();
    await page.waitForTimeout(400);
  });

  // ZOOM
  console.log('\n=== ZOOM ===');
  await testAction('Zoom in', async () => {
    await page.locator('.zoom-btn').last().click();
    await page.waitForTimeout(300);
  });
  await snap('10-zoom-in');
  await testAction('Zoom out', async () => {
    await page.locator('.zoom-btn').first().click();
    await page.waitForTimeout(300);
  });

  // EXPORT
  console.log('\n=== EXPORT ===');
  await testAction('Export Excel', async () => {
    await page.locator('.export-btn').click();
    await page.waitForTimeout(500);
  });

  // TIMELINE HOVER + OVERLAY
  console.log('\n=== TIMELINE BARRAS ===');
  const items = page.locator('[class*="gantt-item"]');
  const itemCount = await items.count();
  console.log(`  OK Items visibles: ${itemCount}`);

  if (itemCount > 0) {
    await items.first().hover();
    await page.waitForTimeout(400);
    await snap('11-task-hover');
    await dims('.gantt-overlay-btn.edit >> nth=0', 'Edit overlay');
    await dims('.gantt-overlay-btn.delete >> nth=0', 'Delete overlay');

    await testAction('Click edit overlay', async () => {
      await page.locator('.gantt-overlay-btn.edit').first().click({ force: true });
      await page.waitForTimeout(800);
    });
    await snap('12-edit-modal-from-bar');
    await page.locator('.btn-cancel').click();
    await page.waitForTimeout(500);
  }

  // CONTEXT MENU
  console.log('\n=== CONTEXT MENU ===');
  if (itemCount > 0) {
    await items.first().click({ button: 'right' });
    await page.waitForTimeout(300);
    await snap('13-context-menu');
    await dims('.gantt-context-menu', 'Context menu');
    await page.click('body');
    await page.waitForTimeout(200);
  }

  // MODAL NUEVA TAREA
  console.log('\n=== MODAL NUEVA TAREA (GANTT) ===');
  await page.locator('.add-btn').click();
  await page.waitForTimeout(800);
  await snap('14-modal-gantt');

  await dims('.modal', 'Modal');
  await dims('.modal-header', 'Header');
  await dims('.btn-cancel', 'Cancelar');
  await dims('.btn-save', 'Crear Tarea');
  await dims('.panel-left', 'Panel Datos');
  await dims('.panel-center', 'Panel Usuarios');
  await dims('.panel-right', 'Panel Planif');

  // Fill form
  await testAction('Fill nombre', async () => {
    await page.locator('.panel-left .form-input').first().fill('Test Regression Task');
  });

  await testAction('Select categoria', async () => {
    const sel = page.locator('.panel-left select.form-input');
    if (await sel.count() > 0) await sel.selectOption({ index: 1 });
  });

  await testAction('Click user card 1', async () => {
    await page.locator('.modal .user-card').first().click();
    await page.waitForTimeout(200);
  });
  await testAction('Click user card 2', async () => {
    await page.locator('.modal .user-card').nth(1).click();
    await page.waitForTimeout(200);
  });

  await snap('15-modal-filled');
  await dims('.user-chip >> nth=0', 'Chip 1');
  await dims('.user-chip >> nth=1', 'Chip 2');
  await dims('.card-check.checked >> nth=0', 'Check 1');
  await dims('.card-check.checked >> nth=1', 'Check 2');
  await dims('.range-summary', 'Range summary');

  // Remove chip
  await testAction('Remove chip 1', async () => {
    const rm = page.locator('.modal .chip-remove').first();
    if (await rm.isVisible()) await rm.click();
    await page.waitForTimeout(200);
  });
  await snap('16-chip-removed');

  // Close modal
  await page.locator('.btn-cancel').click();
  await page.waitForTimeout(500);

  // CALENDAR VIEW
  console.log('\n=== CALENDAR VIEW ===');
  await page.locator('.calendar-toggle-btn').click();
  await page.waitForTimeout(800);
  await snap('17-calendar');
  await dims('.calendar-container', 'Calendar');
  await dims('.add-task-btn', 'Nueva Tarea Cal');
  await dims('.nav-btn >> nth=0', 'Nav <');
  await dims('.nav-btn >> nth=1', 'Nav >');
  await dims('.today-btn', 'Hoy');

  await testAction('Click Mes', async () => {
    await page.locator('.view-switcher button >> nth=0').click();
    await page.waitForTimeout(300);
  });
  await snap('18-calendar-month');

  await testAction('Click Semana', async () => {
    await page.locator('.view-switcher button >> nth=1').click();
    await page.waitForTimeout(300);
  });
  await snap('19-calendar-week');

  await testAction('Click Dia', async () => {
    await page.locator('.view-switcher button >> nth=2').click();
    await page.waitForTimeout(300);
  });
  await snap('20-calendar-day');

  // Calendar modal
  console.log('\n=== MODAL CALENDARIO ===');
  await page.locator('.view-switcher button >> nth=0').click();
  await page.waitForTimeout(300);
  await page.locator('.add-task-btn').click();
  await page.waitForTimeout(800);
  await snap('21-calendar-modal');
  await dims('.modal', 'Cal Modal');
  await dims('.panel-left', 'Cal Panel Datos');
  await dims('.panel-center', 'Cal Panel Usuarios');
  await dims('.panel-right', 'Cal Panel Planif');

  await testAction('Fill cal task name', async () => {
    await page.locator('.panel-left .form-input').first().fill('Calendar Test Task');
  });
  await testAction('Click cal user card', async () => {
    const card = page.locator('.modal .user-card').first();
    if (await card.isVisible()) await card.click();
  });
  await snap('22-calendar-modal-filled');
  await page.locator('.btn-cancel').click();
  await page.waitForTimeout(500);

  // ADMIN SIDEBAR
  console.log('\n=== ADMIN SIDEBAR ===');
  await page.locator('.calendar-toggle-btn').click();
  await page.waitForTimeout(500);
  await testAction('Open admin sidebar', async () => {
    await page.locator('.admin-btn').click();
    await page.waitForTimeout(600);
  });
  await snap('23-admin-sidebar');
  await page.press('body', 'Escape');
  await page.waitForTimeout(300);

  // KEYBOARD SHORTCUTS
  console.log('\n=== KEYBOARD SHORTCUTS ===');
  await testAction('N - nueva tarea', async () => {
    await page.keyboard.press('n');
    await page.waitForTimeout(800);
  });
  await snap('24-shortcut-n');
  await page.locator('.btn-cancel').click();
  await page.waitForTimeout(500);

  // SUMMARY
  console.log('\n========================================');
  console.log(`  ERRORES APP: ${appErrors.length}`);
  if (appErrors.length > 0) {
    appErrors.forEach(e => console.log(`    -> ${e.substring(0, 150)}`));
  }
  console.log('  SCREENSHOTS: e2e/snap-admin-*.png');
  console.log('========================================');

  await browser.close();
})();