# BI GANTT — Guía de Usuario

## Tabla de Contenidos

1. [¿Qué es BI GANTT?](#1-qué-es-bi-gantt)
2. [Primeros Pasos](#2-primeros-pasos)
3. [Iniciar Sesión](#3-iniciar-sesión)
4. [Cambiar Contraseña](#4-cambiar-contraseña)
5. [La Pantalla Principal](#5-la-pantalla-principal)
6. [Crear una Tarea](#6-crear-una-tarea)
7. [Editar una Tarea](#7-editar-una-tarea)
8. [Eliminar una Tarea](#8-eliminar-una-tarea)
9. [Mover y Redimensionar Tareas](#9-mover-y-redimensionar-tareas)
10. [Buscar Tareas](#10-buscar-tareas)
11. [Filtros](#11-filtros)
12. [Vista Calendario](#12-vista-calendario)
13. [Exportar a Excel](#13-exportar-a-excel)
14. [Modo Oscuro / Modo Claro](#14-modo-oscuro--modo-claro)
15. [Atajos de Teclado](#15-atajos-de-teclado)
16. [Panel de Administración](#16-panel-de-administración)
17. [Gestión de Usuarios (Solo Admin)](#17-gestión-de-usuarios-solo-admin)
18. [Registro de Actividad (Solo Admin)](#18-registro-de-actividad-solo-admin)
19. [Resetear Contraseña de un Usuario (Solo Admin)](#19-resetear-contraseña-de-un-usuario-solo-admin)
20. [Categorías (Filas)](#20-categorías-filas)
21. [Preguntas Frecuentes](#21-preguntas-frecuentes)

---

## 1. ¿Qué es BI GANTT?

BI GANTT es una herramienta web para planificar y visualizar proyectos usando **diagramas de Gantt**. Permite:

- Crear, editar y eliminar tareas
- Asignar tareas a personas del equipo
- Ver el progreso de cada tarea
- Organizar tareas por categorías
- Exportar datos a Excel
- Alternar entre vista Gantt y vista Calendario
- Cambiar entre modo oscuro y modo claro

---

## 2. Primeros Pasos

### Requisitos

Necesitas un navegador web moderno (Chrome, Firefox, Edge). No necesitas instalar nada en tu computadora.

### Acceder a la aplicación

Abre tu navegador y ve a la dirección que te dio el administrador (ejemplo: `http://localhost:8080`).

---

## 3. Iniciar Sesión

1. Abre la aplicación en tu navegador
2. Verás la pantalla de inicio de sesión:

   ![Login](img/login.png)

3. Escribe tu **usuario** en el campo "Usuario"
4. Escribe tu **contraseña** en el campo "Contraseña"
5. Haz clic en **Iniciar Sesión**

> **Nota**: Puedes usar tu nombre de usuario (ej: `emmanuel.villasanti`) o tu email (ej: `emmanuel.villasanti@epem.com`).

### ¿Olvidaste tu contraseña?

Contacta al administrador del sistema. Pueden resetear tu contraseña y se te pedirá que cambies al iniciar sesión.

---

## 4. Cambiar Contraseña

Si es tu primera vez o un administrador reseteó tu contraseña, verás una ventana emergente pidiendo que cambies tu contraseña:

1. Escribe tu **contraseña actual**
2. Escribe tu **nueva contraseña** (mínimo 8 caracteres)
3. Confirma tu **nueva contraseña**
4. Haz clic en **Guardar**

> La contraseña debe tener al menos 8 caracteres.

---

## 5. La Pantalla Principal

Después de iniciar sesión, verás la pantalla principal del Gantt:

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍 Buscar...   [Filtros ▼]   📊 Exportar   🌙 Oscuro   👤 Admin  │
├─────────────┬────────────────────────────────────────────────────────┤
│             │                                                        │
│ Categorías  │              Línea de Tiempo                         │
│             │                                                        │
│ ▸ Investig. │  ████████████                                          │
│ ▸ Desarrollo│          ██████████████████                            │
│ ▸ Pruebas   │                    ████████████                      │
│ ▸ Despliegue│                              ████████                │
│ ▸ Document. │          ██████████████████████████                   │
│ ▸ Revisión  │                                  ████████            │
│             │                                                        │
└─────────────┴────────────────────────────────────────────────────────┘
```

### Elementos principales

| Elemento | Descripción |
|----------|-------------|
| **Barra superior** | Búsqueda, filtros, exportar, tema, usuario |
| **Panel izquierdo** | Lista de categorías con nombre y cantidad de tareas |
| **Timeline** | Barras de tareas con fechas, progreso y colores |
| **Línea roja** | Día actual (hoy) en el timeline |
| **Menú contextual** | Clic derecho sobre una tarea para editar/eliminar |

---

## 6. Crear una Tarea

### Desde la barra de herramientas

1. Haz clic en el botón **+ Nueva Tarea** en la barra superior (o presiona `N`)
2. Se abre el modal de crear tarea:

   ```
   ┌─────────────────────────────────────┐
   │  Nueva Tarea               ✕        │
   ├─────────────────────────────────────┤
   │  [Datos] [Usuarios] [Programación]   │
   ├─────────────────────────────────────┤
   │                                      │
   │  Nombre de la tarea:                 │
   │  ┌─────────────────────────────┐     │
   │  │ Tarea nueva                 │     │
   │  └─────────────────────────────┘     │
   │                                      │
   │  Categoría:                          │
   │  ┌──────────────────────┐ ▼          │
   │  │ Desarrollo           │            │
   │  └──────────────────────┘            │
   │                                      │
   │  Progreso: ████████░░░░ 65%          │
   │                                      │
   │  Fecha inicio: 15/01/2026            │
   │  Fecha fin:    28/01/2026            │
   │                                      │
   │          [Cancelar] [Guardar]        │
   └─────────────────────────────────────┘
   ```

3. Completa los campos:
   - **Nombre**: descripción breve de la tarea
   - **Categoría**: selecciona en qué fila aparece
   - **Progreso**: porcentaje de avance (0% a 100%)
   - **Fecha inicio**: cuándo empieza la tarea
   - **Fecha fin**: cuándo termina la tarea
4. En la pestaña **Usuarios** puedes asignar personas a la tarea
5. Haz clic en **Guardar**

### Desde el calendario

1. Cambia a la vista Calendario (botón en la barra superior)
2. Haz clic en un día específico
3. Se abre el modal para crear una tarea con la fecha pre-seleccionada

---

## 7. Editar una Tarea

1. **Haz doble clic** en la barra de la tarea en el timeline, o
2. **Clic derecho** → selecciona **Editar**
3. Se abre el modal de edición con los datos actuales
4. Modifica los campos que necesites
5. Haz clic en **Guardar**

Los cambios se guardan inmediatamente.

---

## 8. Eliminar una Tarea

1. **Clic derecho** en la barra de la tarea en el timeline
2. Selecciona **Eliminar**
3. Confirma la eliminación

> Solo puedes eliminar tareas que tú creaste (a menos que seas administrador).

---

## 9. Mover y Redimensionar Tareas

### Mover una tarea

1. **Arrastra** la barra de la tarea hacia la izquierda o derecha en el timeline
2. La tarea se mueve manteniendo la misma duración

### Cambiar la duración

1. **Arrastra** el borde izquierdo o derecho de la barra de la tarea
2. El extremo se extiende o contrae según arrastres

### Mover a otra categoría

1. **Arrastra** la barra de la tarea hacia arriba o abajo
2. La tarea se mueve a la categoría donde la sueltes

---

## 10. Buscar y Filtrar Tareas

### Búsqueda por texto

1. Escribe en el campo **Buscar** en la barra superior (o presiona `Ctrl+F`)
2. Las tareas se filtran automáticamente mientras escribes
3. Para limpiar la búsqueda, borra el texto del campo

### Modos de filtrado

Junto al campo de búsqueda hay un selector de modo:

| Modo | Descripción |
|------|-------------|
| **Todos** | Muestra todas las tareas (sin filtro) |
| **Texto** | Filtra por nombre de tarea (lo que escribas en el buscador) |
| **En progreso** | Muestra solo tareas con avance entre 1% y 99% |
| **Completados** | Muestra solo tareas con avance del 100% |

---

## 11. Filtros Avanzados

Los filtros avanzados se aplican desde la URL o la API directamente. Los disponibles son:

| Filtro | En la API | Descripción |
|--------|-----------|-------------|
| **Progreso mínimo** | `progress_min` | Tareas con avance mayor a este porcentaje |
| **Progreso máximo** | `progress_max` | Tareas con avance menor a este porcentaje |
| **Fecha desde** | `date_from` | Tareas que **inician** después de esta fecha |
| **Fecha hasta** | `date_to` | Tareas que **terminan** antes de esta fecha |
| **Por categoría** | `row_id` | Tareas de una categoría específica |
| **Por usuario** | `assigned_user_id` | Tareas asignadas a un usuario específico |
| **Por texto** | `search` | Búsqueda por nombre (máximo 100 caracteres) |

Ejemplo de uso desde la API:
```
GET /api/items?progress_min=20&progress_max=80&date_from=2026-01-01&date_to=2026-12-31
```

---

## 12. Vista Calendario

1. Haz clic en el botón **Calendario** en la barra superior
2. Puedes alternar entre:
   - **Vista Mensual**: muestra todo el mes
   - **Vista Semanal**: muestra una semana con más detalle
   - **Vista Diaria**: muestra un día con todas sus tareas
3. Las tareas aparecen como eventos en el calendario
4. Haz clic en una tarea para navegar a ella en el Gantt

---

## 13. Exportar a Excel

1. Haz clic en el botón **Exportar Excel** en la barra superior
2. Se descargará automáticamente un archivo `.xlsx` con:
   - Nombre de cada tarea
   - Categoría
   - Fecha de inicio y fin
   - Progreso
   - Usuario asignado
3. Abre el archivo con Microsoft Excel, Google Sheets o LibreOffice Calc

---

## 14. Modo Oscuro / Modo Claro

1. Haz clic en el botón **oscuro/claro** en la barra superior
2. La preferencia se guarda automáticamente
3. La próxima vez que entres, se cargará tu última preferencia

---

## 15. Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| `N` | Crear nueva tarea |
| `E` | Editar tarea seleccionada |
| `Delete` | Eliminar tarea seleccionada |
| `Ctrl+F` | Ir al campo de búsqueda |
| `←` `→` | Navegar entre tareas |
| `+` / `-` | Zoom in / Zoom out en el timeline |

---

## 16. Panel de Administración

Si tu rol es **Admin**, verás un botón adicional en la barra superior con un icono de usuario.

Al hacer clic se abre un panel lateral con dos pestañas:

1. **Usuarios**: gestión de usuarios del sistema
2. **Actividad**: registro de todas las acciones realizadas

---

## 17. Gestión de Usuarios (Solo Admin)

### Crear un usuario

1. Abre el panel de administración
2. En la pestaña **Usuarios**, haz clic en **+ Nuevo Usuario**
3. Completa:
   - **Nombre**: nombre completo
   - **Email**: correo electrónico (debe ser único)
   - **Rol**: `Admin` o `Usuario`
   - **Contraseña**: mínimo 8 caracteres
4. Haz clic en **Guardar**

### Editar un usuario

1. Haz clic en el icono de lápiz junto al usuario
2. Modifica los campos necesarios
3. Haz clic en **Guardar**

### Eliminar un usuario

1. Haz clic en el icono de papelera junto al usuario
2. Confirma la eliminación

> No puedes eliminar tu propia cuenta.

---

## 18. Registro de Actividad (Solo Admin)

La pestaña **Actividad** muestra un registro de todas las acciones:

| Columna | Descripción |
|---------|-------------|
| **Fecha** | Cuándo se realizó la acción |
| **Usuario** | Quién la realizó |
| **Acción** | Tipo de acción (create, update, delete, login, etc.) |
| **Descripción** | Detalle de lo que se hizo |
| **Target** | En qué elemento se actuó |

Puedes filtrar por usuario usando el selector en la parte superior.

---

## 19. Resetear Contraseña de un Usuario (Solo Admin)

Si un usuario olvidó su contraseña:

1. Abre el panel de administración
2. En la pestaña **Usuarios**, busca el usuario
3. Haz clic en el icono de **candado** junto al usuario
4. Escribe la nueva contraseña (mínimo 8 caracteres)
5. Haz clic en **Guardar**

El usuario tendrá que cambiar su contraseña la próxima vez que inicie sesión.

---

## 20. Categorías (Filas)

Las categorías organizan las tareas en filas visuales. Ejemplos: "Investigación", "Desarrollo", "Pruebas".

### Crear categoría (Solo Admin)

1. Haz clic en **+** encima de la lista de categorías
2. Escribe el nombre de la categoría
3. Presiona Enter

### Editar categoría (Solo Admin)

1. Haz clic en el icono de lápiz junto a la categoría
2. Modifica el nombre
3. Presiona Enter

### Eliminar categoría (Solo Admin)

1. Haz clic en el icono de papelera junto a la categoría
2. Solo se pueden eliminar categorías que **no tengan tareas**

---

## 21. Preguntas Frecuentes

### No puedo iniciar sesión

- Verifica que tu usuario y contraseña sean correctos
- Si fallaste múltiples veces, espera 15 minutos (el sistema bloquea después de 10 intentos)
- Contacta al administrador para resetear tu contraseña

### Se me pide cambiar la contraseña cada vez

Esto ocurre si un administrador reseteó tu contraseña. Cámbiala una vez y no se te pedirá de nuevo.

### No puedo ver ciertas opciones

Algunas opciones solo están disponibles para administradores:
- Gestión de usuarios
- Registro de actividad
- Crear/editar/eliminar categorías
- Eliminar tareas de otros usuarios

### La página se ve lenta

- Intenta reducir el rango de fechas usando filtros
- Usa el zoom para ver menos tareas a la vez
- Cierra otras pestañas del navegador que consuman memoria

### ¿Puedo usar la aplicación en el celular?

La aplicación funciona en navegadores de celular, pero está optimizada para pantallas de computadora. La experiencia puede ser limitada en pantallas pequeñas.

### ¿Mis datos se guardan automáticamente?

Sí. Cada vez que creas, editas o eliminas una tarea, los cambios se guardan inmediatamente en el servidor.

### ¿Puedo exportar solo algunas tareas?

Actualmente la exportación a Excel incluye todas las tareas visibles. Usa los filtros para mostrar solo las tareas que quieres exportar, luego exporta.

---

> **Versión**: 1.0.0
> **Soporte**: Contacta al administrador del sistema en tu organización