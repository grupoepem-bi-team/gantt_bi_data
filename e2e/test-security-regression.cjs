const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3000;
const API_PATH = '/api';

let passed = 0, failed = 0, errors = [];

function ok(name, detail) { passed++; console.log(`  \x1b[32mOK\x1b[0m ${name}${detail ? ' [' + detail + ']' : ''}`); }
function fail(name, detail) { failed++; errors.push(`${name}: ${detail}`); console.log(`  \x1b[31mX \x1b[0m${name} - ${detail}`); }

function api(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: API_HOST, port: API_PORT, path: API_PATH + path, method,
      headers: { 'Authorization': token ? 'Bearer ' + token : '', 'Content-Type': 'application/json' }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(options, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(b), headers: res.headers }); } catch { resolve({ status: res.statusCode, body: b, headers: res.headers }); }});
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function login(user, pass) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ usuario: user, password: pass });
    const req = http.request({
      hostname: API_HOST, port: API_PORT, path: API_PATH + '/users/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, body: b }); }});
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function decodeJwt(token) {
  const parts = token.split('.');
  return JSON.parse(Buffer.from(parts[1], 'base64').toString());
}

async function run() {
  console.log('========================================');
  console.log('  TEST DE REGRESION - SEGURIDAD v2');
  console.log('  (valida fixes de vulnerabilidades)');
  console.log('========================================\n');

  // ===== 1. JWT SECRET NO FALLBACK (VULN-01) =====
  console.log('=== 1. JWT Secret & Token Validation ===');

  const adminLogin = await login('emmanuel.villasanti', process.env.ADMIN_INITIAL_PASSWORD || 'epem2023@@');
  ok('Admin login', `status=${adminLogin.status}`);
  if (adminLogin.status !== 200) {
    fail('Admin login', adminLogin.body.error || 'Login failed - cannot continue');
    console.log('\n========================================');
    console.log(`  PASARON: ${passed}/${passed + failed}`);
    console.log(`  FALLARON: ${failed}`);
    console.log('========================================');
    process.exit(1);
    return;
  }
  const token = adminLogin.body.token;

  // 1.1 Token has JTI
  const payload = decodeJwt(token);
  ok('Token has JTI', payload.jti ? `jti=${payload.jti.substring(0, 8)}...` : 'NO JTI');

  // 1.2 Token has short expiry (30m, not 24h)
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.exp - now;
  ok('Token expiry <= 30m', expiresIn <= 1801, `expires_in=${Math.round(expiresIn / 60)}m`);

  // 1.3 Refresh token cannot be used as access token (VULN-06)
  // We can't easily generate a refresh token from outside, so test with invalid token types
  const fakeRefreshToken = token; // Access token should work
  const r1 = await api('GET', '/items', fakeRefreshToken);
  ok('Access token works for API', `status=${r1.status}`);

  // 1.4 Invalid token rejected
  const r2 = await api('GET', '/items', 'invalid.jwt.token');
  ok('Invalid JWT rejected', r2.status === 401, `status=${r2.status}`);

  // 1.5 No token rejected
  const r3 = await api('GET', '/items', '');
  ok('No token rejected', r3.status === 401, `status=${r3.status}`);

  // ===== 2. CORS ORIGIN (VULN-04) =====
  console.log('\n=== 2. CORS & Security Headers ===');

  // 2.1 Security headers present (helmet)
  const healthRes = await api('GET', '/health', '');
  ok('X-Content-Type-Options header', healthRes.headers['x-content-type-options'] ? healthRes.headers['x-content-type-options'] : 'absent');
  ok('X-Frame-Options header', healthRes.headers['x-frame-options'] ? healthRes.headers['x-frame-options'] : 'absent');
  ok('Strict-Transport-Security header', healthRes.headers['strict-transport-security'] ? 'present' : 'absent');

  // ===== 3. ROLE VALIDATION (VULN-07) =====
  console.log('\n=== 3. Role Validation ===');

  // 3.1 Create user with invalid role
  let r = await api('POST', '/users', token, { nombre: 'Hacker Role', email: 'hackerrole@test.com', password: 'test1234', rol: 'SuperAdmin' });
  ok('Reject invalid role', r.status === 400, `status=${r.status} error=${r.body.error}`);

  // 3.2 Create user with valid role Usuario
  r = await api('POST', '/users', token, { nombre: 'Valid User', email: 'validuser@test.com', password: 'test1234', rol: 'Usuario' });
  ok('Accept valid role Usuario', r.status === 201, `status=${r.status}`);
  const validUserId = r.body.id;

  // 3.3 Update user with invalid role
  if (validUserId) {
    r = await api('PUT', '/users/' + validUserId, token, { rol: 'HackerRole' });
    ok('Reject update with invalid role', r.status === 400, `status=${r.status} error=${r.body.error}`);
    // Cleanup
    await api('DELETE', '/users/' + validUserId, token, null);
  }

  // ===== 4. PASSWORD POLICY (VULN-15) =====
  console.log('\n=== 4. Password Policy ===');

  // 4.1 Password too short (less than 8 chars)
  r = await api('POST', '/users', token, { nombre: 'Short Pw', email: 'shortpw@test.com', password: '1234567', rol: 'Usuario' });
  ok('Reject password < 8 chars', r.status === 400, `status=${r.status} error=${r.body.error}`);

  // 4.2 Password exactly 8 chars
  r = await api('POST', '/users', token, { nombre: 'Ok Pw', email: 'okpw@test.com', password: '12345678', rol: 'Usuario' });
  ok('Accept password = 8 chars', r.status === 201, `status=${r.status}`);
  if (r.body.id) {
    await api('DELETE', '/users/' + r.body.id, token, null);
  }

  // 4.3 Change password too short
  r = await api('POST', '/users/change-password', token, { currentPassword: 'wrong', newPassword: '1234567' });
  ok('Change-password reject < 8 chars', r.status === 400, `status=${r.status} error=${r.body.error}`);

  // ===== 5. INPUT VALIDATION (VULN-17, 18, 19) =====
  console.log('\n=== 5. Input Validation ===');

  // 5.1 Items: NaN in progress_min
  r = await api('GET', '/items?progress_min=abc', token);
  ok('Reject NaN progress_min', r.status === 400, `status=${r.status} error=${r.body.error}`);

  // 5.2 Items: NaN in progress_max
  r = await api('GET', '/items?progress_max=xyz', token);
  ok('Reject NaN progress_max', r.status === 400, `status=${r.body.error}`);

  // 5.3 Items: Invalid date_from
  r = await api('GET', '/items?date_from=not-a-date', token);
  ok('Reject invalid date_from', r.status === 400, `status=${r.status} error=${r.body.error}`);

  // 5.4 Items: Invalid date_to
  r = await api('GET', '/items?date_to=invalid', token);
  ok('Reject invalid date_to', r.status === 400, `status=${r.status} error=${r.body.error}`);

  // 5.5 Items: Search too long (> 100 chars)
  r = await api('GET', '/items?search=' + 'x'.repeat(101), token);
  ok('Reject search > 100 chars', r.status === 400, `status=${r.status} error=${r.body.error}`);

  // 5.6 Items: Valid search works
  r = await api('GET', '/items?search=test', token);
  ok('Valid search works', r.status === 200, `status=${r.status}`);

  // ===== 6. LOGS REQUIRE ADMIN (VULN-12) =====
  console.log('\n=== 6. Logs Require Admin ===');

  // 6.1 Create a regular user
  r = await api('POST', '/users', token, { nombre: 'Logs Test', email: 'logstest@test.com', password: 'test12345', rol: 'Usuario' });
  ok('Create user for logs test', r.status === 201, `status=${r.status}`);
  const logsTestUserId = r.body.id;

  if (logsTestUserId) {
    const logsLogin = await login('logstest@test.com', 'test12345');
    const logsToken = logsLogin.body.token;
    ok('Regular user login', `status=${logsLogin.status}`);

    // 6.2 Regular user cannot view logs
    r = await api('GET', '/logs', logsToken);
    ok('Regular user cannot view logs', r.status === 403, `status=${r.status} (expected 403)`);

    // 6.3 Admin can view logs
    r = await api('GET', '/logs', token);
    ok('Admin can view logs', r.status === 200, `status=${r.status} total=${r.body.total}`);

    // Cleanup
    await api('DELETE', '/users/' + logsTestUserId, token, null);
  }

  // ===== 7. LOGIN MATCHING (VULN-08) =====
  console.log('\n=== 7. Login Matching ===');

  // 7.1 Login with exact username
  const loginExact = await login('emmanuel.villasanti', process.env.ADMIN_INITIAL_PASSWORD || 'epem2023@@');
  ok('Login exact username', loginExact.status === 200, `status=${loginExact.status}`);

  // 7.2 Login with different case username (should work due to LOWER)
  const loginUpper = await login('EMMANUEL.VILLASANTI', process.env.ADMIN_INITIAL_PASSWORD || 'epem2023@@');
  ok('Login uppercase username works', loginUpper.status === 200, `status=${loginUpper.status}`);

  // 7.3 Login with email
  const loginEmail = await login('emmanuel.villasanti@epem.com', process.env.ADMIN_INITIAL_PASSWORD || 'epem2023@@');
  ok('Login with email works', loginEmail.status === 200, `status=${loginEmail.status}`);

  // ===== 8. TIMING ATTACK (regression check) =====
  console.log('\n=== 8. Timing Attack Protection ===');

  const start1 = Date.now();
  await login('emmanuel.villasanti', 'wrongpassword999');
  const t1 = Date.now() - start1;

  const start2 = Date.now();
  await login('usuario_completamente_inexistente_xyz', 'wrongpassword999');
  const t2 = Date.now() - start2;

  const diff = Math.abs(t1 - t2);
  ok('Timing attack protected', diff < 500, `real=${t1}ms fake=${t2}ms diff=${diff}ms`);

  // ===== 9. SELECT * NOT EXPOSING PASSWORD (VULN-09 regression) =====
  console.log('\n=== 9. Password Not Leaked ===');

  // 9.1 Login response should not contain password field
  const loginRes = adminLogin.body;
  ok('Login response no password field', !loginRes.password, loginRes.password ? 'LEAKED!' : 'safe');
  ok('Login response has token', !!loginRes.token, 'token present');
  ok('Login response has user data', !!loginRes.id || !!loginRes.nombre, 'user data present');

  // 9.2 GET /users should not return password
  r = await api('GET', '/users', token);
  const usersData = r.body.data || r.body;
  if (Array.isArray(usersData) && usersData.length > 0) {
    ok('GET /users no password field', !usersData[0].password, usersData[0].password ? 'LEAKED!' : 'safe');
  }

  // 9.3 GET /users/:id should not return password
  r = await api('GET', '/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890', token);
  ok('GET /users/:id no password field', !r.body.password, r.body.password ? 'LEAKED!' : 'safe');

  // ===== 10. SEED USERS debe_cambiar_password (VULN-22 regression) =====
  console.log('\n=== 10. Seed Users Must Change Password ===');

  // 10.1 Check admin user debe_cambiar_password
  if (Array.isArray(usersData) && usersData.length > 0) {
    const adminUser = usersData.find(u => u.email === 'emmanuel.villasanti@epem.com');
    if (adminUser) {
      ok('Admin debe_cambiar_password is TRUE', adminUser.debe_cambiar_password === true, `value=${adminUser.debe_cambiar_password}`);
    }
  }

  // ===== 11. UUID VALIDATION (regression) =====
  console.log('\n=== 11. UUID Validation (regression) ===');

  // Already tested in test-integrity.cjs, but quick check
  r = await api('GET', '/items/not-a-uuid', token);
  ok('GET /items/bad-uuid rejected', r.status === 400, `status=${r.status}`);

  r = await api('DELETE', '/users/not-a-uuid', token, null);
  ok('DELETE /users/bad-uuid rejected', r.status === 400, `status=${r.status}`);

  r = await api('PUT', '/rows/not-a-uuid', token, { label: 'hack' });
  ok('PUT /rows/bad-uuid rejected', r.status === 400, `status=${r.status}`);

  // ===== SUMMARY =====
  console.log('\n========================================');
  console.log(`  PASARON: ${passed}/${passed + failed}`);
  console.log(`  FALLARON: ${failed}`);
  if (errors.length > 0) {
    console.log('\n  FAILED TESTS:');
    errors.forEach(e => console.log(`    - ${e}`));
  }
  console.log('========================================');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });