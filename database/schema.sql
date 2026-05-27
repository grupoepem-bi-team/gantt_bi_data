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

-- Sessions table for token tracking
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP WITH TIME ZONE,
    fecha_ultimo_acceso TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Projects table for grouping rows
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#6366f1',
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    estado VARCHAR(50) DEFAULT 'activo',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Rows (categories/sprints)
CREATE TABLE IF NOT EXISTS gantt_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    label VARCHAR(255) NOT NULL,
    orden INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gantt_rows_project_id ON gantt_rows(project_id);

-- Tasks/Items
CREATE TABLE IF NOT EXISTS gantt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(255) NOT NULL CHECK (length(trim(label)) > 0),
    row_id UUID REFERENCES gantt_rows(id) ON DELETE RESTRICT,
    time_start TIMESTAMP WITH TIME ZONE NOT NULL,
    time_end TIMESTAMP WITH TIME ZONE NOT NULL,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_time_range CHECK (time_end > time_start)
);

-- Multi-user assignments junction table
CREATE TABLE IF NOT EXISTS gantt_item_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES gantt_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(item_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_item_assignments_item ON gantt_item_assignments(item_id);
CREATE INDEX IF NOT EXISTS idx_item_assignments_user ON gantt_item_assignments(user_id);

-- Tags for filtering tasks
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(20) DEFAULT '#6366f1',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Item Tags junction table
CREATE TABLE IF NOT EXISTS item_tags (
    item_id UUID REFERENCES gantt_items(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);

-- Comments on tasks
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES gantt_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contenido TEXT NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_comments_item_id ON comments(item_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Attachments for tasks
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES gantt_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),
    url TEXT NOT NULL,
    tamano_bytes BIGINT DEFAULT 0,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_attachments_item_id ON attachments(item_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);

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

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT,
    leida BOOLEAN DEFAULT FALSE,
    link VARCHAR(500),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_leida TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_leida ON notifications(leida);

-- Items history for audit trail
CREATE TABLE IF NOT EXISTS gantt_items_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES gantt_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    accion VARCHAR(50) NOT NULL,
    cambios JSONB,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gantt_items_history_item_id ON gantt_items_history(item_id);
CREATE INDEX IF NOT EXISTS idx_gantt_items_history_fecha ON gantt_items_history(fecha);

-- Create indexes for better performance (composite indexes)
CREATE INDEX IF NOT EXISTS idx_items_row_id ON gantt_items(row_id);
CREATE INDEX IF NOT EXISTS idx_items_assigned_user ON gantt_items(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_items_created_by ON gantt_items(created_by);
CREATE INDEX IF NOT EXISTS idx_items_time_start ON gantt_items(time_start);
CREATE INDEX IF NOT EXISTS idx_item_assignments_item ON gantt_item_assignments(item_id);
CREATE INDEX IF NOT EXISTS idx_item_assignments_user ON gantt_item_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_usuario ON activity_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_fecha ON activity_logs(fecha);

-- Composite indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_items_row_assigned ON gantt_items(row_id, assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_items_progress ON gantt_items(progress) WHERE progress > 0 AND progress < 100;
CREATE INDEX IF NOT EXISTS idx_items_date_range ON gantt_items(time_start, time_end);
CREATE INDEX IF NOT EXISTS idx_comments_item_fecha ON comments(item_id, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_leida ON notifications(user_id, leida) WHERE leida = FALSE;

-- Token blacklist for invalidating JWT sessions
-- No FK on user_id: entries must survive user deletion so tokens stay invalidated
CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_jti VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user ON token_blacklist(user_id);

-- Insert default admin user emmanuel.villasanti (password: epem2023@@)
-- Note: API init.ts also handles seed data, this is just for fresh DB initialization
INSERT INTO users (id, nombre, email, avatar, color, rol, password, debe_cambiar_password)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'emmanuel.villasanti',
    'emmanuel.villasanti@epem.com',
    'EV',
    '#dc2626',
    'Admin',
    '$2b$10$1vqOZLt0f11LZ9KFtNjF9uuY4sWk8slNYRkg4jKJq9fYo/rQbq3SC',
    FALSE
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