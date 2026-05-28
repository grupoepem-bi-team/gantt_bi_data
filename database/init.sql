-- Schema for Gantt BI Application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar VARCHAR(2) DEFAULT '',
    color VARCHAR(20) DEFAULT '#6366f1',
    rol VARCHAR(50) DEFAULT 'Usuario',
    password VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    debe_cambiar_password BOOLEAN DEFAULT TRUE
);

-- Rows (categories/sprints)
CREATE TABLE IF NOT EXISTS gantt_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(255) NOT NULL,
    orden INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks/Items
CREATE TABLE IF NOT EXISTS gantt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(255) NOT NULL,
    row_id UUID REFERENCES gantt_rows(id) ON DELETE CASCADE,
    time_start TIMESTAMP WITH TIME ZONE NOT NULL,
    time_end TIMESTAMP WITH TIME ZONE NOT NULL,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Multi-user assignments junction table
CREATE TABLE IF NOT EXISTS gantt_item_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES gantt_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(item_id, user_id)
);

-- Dependencies between tasks
CREATE TABLE IF NOT EXISTS gantt_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_item_id UUID REFERENCES gantt_items(id) ON DELETE CASCADE,
    to_item_id UUID REFERENCES gantt_items(id) ON DELETE CASCADE,
    UNIQUE(from_item_id, to_item_id)
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
    usuario_nombre VARCHAR(255),
    accion VARCHAR(50) NOT NULL,
    descripcion TEXT,
    target_id VARCHAR(255),
    target_nombre VARCHAR(255),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password set via ADMIN_INITIAL_PASSWORD env var)
INSERT INTO users (id, nombre, email, avatar, color, rol, password, debe_cambiar_password)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'emmanuel.villasanti',
    'emmanuel.villasanti@epem.com',
    'EV',
    '#dc2626',
    'Admin',
    '$2b$10$1vqOZLt0f11LZ9KFtNjF9uuY4sWk8slNYRkg4jKJq9fYo/rQbq3SC',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert default rows
INSERT INTO gantt_rows (id, label, orden) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Investigacion', 1),
    ('22222222-2222-2222-2222-222222222222', 'Desarrollo', 2),
    ('33333333-3333-3333-3333-333333333333', 'Pruebas', 3),
    ('44444444-4444-4444-4444-444444444444', 'Despliegue', 4),
    ('55555555-5555-5555-5555-555555555555', 'Documentacion', 5),
    ('66666666-6666-6666-6666-666666666666', 'Revision', 6)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_items_row_id ON gantt_items(row_id);
CREATE INDEX IF NOT EXISTS idx_items_assigned_user ON gantt_items(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_items_created_by ON gantt_items(created_by);
CREATE INDEX IF NOT EXISTS idx_items_time_start ON gantt_items(time_start);
CREATE INDEX IF NOT EXISTS idx_item_assignments_item ON gantt_item_assignments(item_id);
CREATE INDEX IF NOT EXISTS idx_item_assignments_user ON gantt_item_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_usuario ON activity_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_fecha ON activity_logs(fecha);