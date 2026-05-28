import { pool } from './connection.js'
import bcrypt from 'bcryptjs'

export async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        avatar VARCHAR(2) DEFAULT '',
        color VARCHAR(20) DEFAULT '#6366f1',
        rol VARCHAR(50) DEFAULT 'Usuario',
        password VARCHAR(255) NOT NULL,
        debe_cambiar_password BOOLEAN DEFAULT TRUE,
        fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ultimo_acceso TIMESTAMP WITH TIME ZONE
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gantt_rows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label VARCHAR(255) NOT NULL,
        orden INTEGER DEFAULT 0,
        fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gantt_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label VARCHAR(255) NOT NULL,
        row_id UUID REFERENCES gantt_rows(id) ON DELETE RESTRICT,
        time_start TIMESTAMP WITH TIME ZONE NOT NULL,
        time_end TIMESTAMP WITH TIME ZONE NOT NULL,
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`ALTER TABLE gantt_items DROP CONSTRAINT IF EXISTS chk_time_range`)
    await pool.query(`ALTER TABLE gantt_items ADD CONSTRAINT chk_time_range CHECK (time_end > time_start)`)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gantt_dependencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_item_id UUID REFERENCES gantt_items(id) ON DELETE CASCADE,
        to_item_id UUID REFERENCES gantt_items(id) ON DELETE CASCADE,
        UNIQUE(from_item_id, to_item_id)
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gantt_item_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID REFERENCES gantt_items(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(item_id, user_id)
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
        usuario_nombre VARCHAR(255),
        accion VARCHAR(50) NOT NULL,
        descripcion TEXT,
        target_id VARCHAR(255),
        target_nombre VARCHAR(255),
        fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        token_jti VARCHAR(255) NOT NULL,
        fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_token_blacklist_user ON token_blacklist(user_id)`)

    await pool.query(`DELETE FROM token_blacklist WHERE fecha_creacion < NOW() - INTERVAL '8 days'`)

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_row_id ON gantt_items(row_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_assigned_user ON gantt_items(assigned_user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_time_start ON gantt_items(time_start)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_created_by ON gantt_items(created_by)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_usuario ON activity_logs(usuario_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_fecha ON activity_logs(fecha)`)

    // Migrate existing items: set created_by to admin if null
    const adminId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    await pool.query(`UPDATE gantt_items SET created_by = $1 WHERE created_by IS NULL`, [adminId])

    // Migrate existing assigned_user_id to gantt_item_assignments
    await pool.query(`
      INSERT INTO gantt_item_assignments (item_id, user_id)
      SELECT id, assigned_user_id FROM gantt_items
      WHERE assigned_user_id IS NOT NULL
      ON CONFLICT (item_id, user_id) DO NOTHING
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_item_assignments_item ON gantt_item_assignments(item_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_item_assignments_user ON gantt_item_assignments(user_id)`)

    // Check if admin exists
    const adminCheck = await pool.query(`SELECT id FROM users WHERE email = 'emmanuel.villasanti@epem.com'`)
    
    if (adminCheck.rows.length === 0) {
      const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Epem1234'
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 12)
      await pool.query(`
        INSERT INTO users (id, nombre, email, avatar, color, rol, password, debe_cambiar_password)
        VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'emmanuel.villasanti', 'emmanuel.villasanti@epem.com', 'EV', '#dc2626', 'Admin', $1, TRUE)
      `, [hashedAdminPassword])
      console.log('Admin user created (must change password on first login)')
    }

    // Seed regular users if they don't exist
    const jeanCheck = await pool.query(`SELECT id FROM users WHERE email = 'jean.sandoval@epem.com'`)
    if (jeanCheck.rows.length === 0) {
      const jeanPassword = process.env.JEAN_INITIAL_PASSWORD || crypto.randomUUID()
      const hashedJeanPassword = await bcrypt.hash(jeanPassword, 12)
      await pool.query(`
        INSERT INTO users (id, nombre, email, avatar, color, rol, password, debe_cambiar_password)
        VALUES ('e9c97244-73f2-4d53-8139-8a6b63e1abe0', 'Jean Sandoval', 'jean.sandoval@epem.com', 'JS', '#4f46e5', 'Usuario', $1, TRUE)
      `, [hashedJeanPassword])
      console.log('User created: jean.sandoval@epem.com (must change password on first login)')
    }

    const jesusCheck = await pool.query(`SELECT id FROM users WHERE email = 'jesus.alvarenga@epem.com'`)
    if (jesusCheck.rows.length === 0) {
      const jesusPassword = process.env.JESUS_INITIAL_PASSWORD || crypto.randomUUID()
      const hashedJesusPassword = await bcrypt.hash(jesusPassword, 12)
      await pool.query(`
        INSERT INTO users (id, nombre, email, avatar, color, rol, password, debe_cambiar_password)
        VALUES ('a60a15fd-41ad-4bb7-9984-a09b21c5be9f', 'Jesus Alvarenga', 'jesus.alvarenga@epem.com', 'JA', '#06b6d4', 'Usuario', $1, TRUE)
      `, [hashedJesusPassword])
      console.log('User created: jesus.alvarenga@epem.com (must change password on first login)')
    }

    // Insert default rows if empty
    const rowsCheck = await pool.query(`SELECT id FROM gantt_rows LIMIT 1`)
    if (rowsCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO gantt_rows (id, label, orden) VALUES
        ('11111111-1111-1111-1111-111111111111', 'Investigacion', 1),
        ('22222222-2222-2222-2222-222222222222', 'Desarrollo', 2),
        ('33333333-3333-3333-3333-333333333333', 'Pruebas', 3),
        ('44444444-4444-4444-4444-444444444444', 'Despliegue', 4),
        ('55555555-5555-5555-5555-555555555555', 'Documentacion', 5),
        ('66666666-6666-6666-6666-666666666666', 'Revision', 6)
      `)
      console.log('Default rows created')
    }

    // Insert default items if empty
    const itemsCheck = await pool.query(`SELECT id FROM gantt_items LIMIT 1`)
    if (itemsCheck.rows.length === 0) {
      const adminId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      const jeanId = 'e9c97244-73f2-4d53-8139-8a6b63e1abe0'
      const jesusId = 'a60a15fd-41ad-4bb7-9984-a09b21c5be9f'

      const devRow = '22222222-2222-2222-2222-222222222222'
      const testRow = '33333333-3333-3333-3333-333333333333'
      const deployRow = '44444444-4444-4444-4444-444444444444'
      const docRow = '55555555-5555-5555-5555-555555555555'
      const revRow = '66666666-6666-6666-6666-666666666666'

      await pool.query(`
        INSERT INTO gantt_items (id, label, row_id, time_start, time_end, progress, assigned_user_id, created_by) VALUES
        ('642a79d1-abc7-48ec-be9f-b5647ce19629', 'ThinkChat Reporte', '${devRow}', '2026-02-02T11:00:00Z', '2026-02-25T20:00:00Z', 100, '${jesusId}', '${adminId}'),
        ('b2cb1cbc-a269-4112-9b37-7b991b4b6020', 'Integracion con ThinkChat - Bootmaker', '${devRow}', '2026-03-01T12:00:00Z', '2026-04-25T20:00:00Z', 50, '${jesusId}', '${adminId}'),
        ('0219a6a3-5246-477c-b461-80b2a8b40d85', 'Reporte ThinkChat - Bootmaker', '${testRow}', '2026-04-01T12:00:00Z', '2026-06-01T20:00:00Z', 40, '${jesusId}', '${adminId}'),
        ('4d54d54d-0ea1-4e7c-9a08-06e7c0b80567', 'Tablero de Servicio Estetica', '${docRow}', '2026-02-15T09:00:00Z', '2026-04-20T18:00:00Z', 75, '${jeanId}', '${adminId}'),
        ('e9c97244-73f2-4d53-8139-8a6b63e1abe1', 'Agregar la sucursal Caacupe', '${deployRow}', '2026-03-10T09:00:00Z', '2026-05-15T18:00:00Z', 30, '${jeanId}', '${adminId}'),
        ('c8d1e2f3-4567-89ab-cdef-012345678901', 'Tablero Reporte Ventas', '${devRow}', '2026-05-01T09:00:00Z', '2026-06-30T18:00:00Z', 10, '${adminId}', '${adminId}'),
        ('d9e2f3a4-5678-9abc-def0-123456789012', 'Revision del servidor 241', '${revRow}', '2026-04-15T09:00:00Z', '2026-05-10T18:00:00Z', 60, '${adminId}', '${adminId}')
      `)

      await pool.query(`
        INSERT INTO gantt_item_assignments (item_id, user_id) VALUES
        ('642a79d1-abc7-48ec-be9f-b5647ce19629', '${jesusId}'),
        ('642a79d1-abc7-48ec-be9f-b5647ce19629', '${adminId}'),
        ('b2cb1cbc-a269-4112-9b37-7b991b4b6020', '${jesusId}'),
        ('b2cb1cbc-a269-4112-9b37-7b991b4b6020', '${adminId}'),
        ('0219a6a3-5246-477c-b461-80b2a8b40d85', '${jesusId}'),
        ('4d54d54d-0ea1-4e7c-9a08-06e7c0b80567', '${jeanId}'),
        ('4d54d54d-0ea1-4e7c-9a08-06e7c0b80567', '${adminId}'),
        ('e9c97244-73f2-4d53-8139-8a6b63e1abe1', '${jeanId}'),
        ('e9c97244-73f2-4d53-8139-8a6b63e1abe1', '${adminId}'),
        ('c8d1e2f3-4567-89ab-cdef-012345678901', '${adminId}'),
        ('d9e2f3a4-5678-9abc-def0-123456789012', '${adminId}')
      `)

      console.log('Default items created')
    }

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}