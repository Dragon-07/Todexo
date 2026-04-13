# 🚀 Todexo

Todexo es un gestor de tareas avanzado construido con **Next.js** y **Supabase**, con sistema de roles (owner/admin/standard), tareas recurrentes, recordatorios, gamificación y panel de administración.

## 📋 Requisitos Previos

- [Node.js](https://nodejs.org/) v18 o superior
- Una cuenta gratuita en [Supabase](https://supabase.com)

## ⚡ Setup Rápido (nuevo equipo / nueva cuenta de Supabase)

### Paso 1: Clonar el repositorio

```bash
git clone <url-del-repo>
cd todexo.2
```

### Paso 2: Crear un proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) e inicia sesión
2. Haz clic en **"New Project"**
3. Elige un nombre y región (recomendado: `us-east-1`)
4. Espera a que el proyecto esté activo (~2 minutos)

### Paso 3: Ejecutar el script de base de datos

1. En tu proyecto de Supabase, ve a **SQL Editor** (menú lateral izquierdo)
2. Haz clic en **"New query"**
3. Abre el archivo `supabase/setup.sql` de este repositorio
4. Copia **TODO** el contenido y pégalo en el editor SQL
5. Haz clic en **"Run"** (o Ctrl+Enter)
6. Deberías ver: `Success. No rows returned` — ¡eso es correcto!

### Paso 4: Configurar la autenticación

En el dashboard de Supabase:

1. Ve a **Authentication → Providers → Email**
   - ✅ Asegúrate de que "Enable Email Signup" esté activo
   - ❌ **DESACTIVA** "Confirm email" (el sistema lo confirma automáticamente)
2. Ve a **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`

### Paso 5: Configurar variables de entorno

1. En Supabase, ve a **Settings → API**
2. Copia el **Project URL** y la **anon key** (pública)
3. En la carpeta del proyecto, crea el archivo `.env.local`:

```bash
# Copia el template
cp .env.example .env.local
```

4. Edita `.env.local` con tus valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### Paso 6: Instalar y ejecutar

```bash
cd todexo-app
npm install
npm run dev
```

5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador 🎉

### Paso 7: Crear el primer usuario (Owner)

1. Regístrate normalmente en la app
2. Ve al dashboard de Supabase → **Table Editor → profiles**
3. Encuentra tu usuario y cambia el campo `role` de `standard` a `owner`
4. Esto te dará acceso completo al panel de administración

---

## 🏗️ Estructura del Proyecto

```
todexo.2/
├── .env.example            # Template de variables de entorno
├── supabase/
│   └── setup.sql           # Script para crear toda la BD
└── todexo-app/
    ├── src/
    │   ├── app/             # Páginas (Next.js App Router)
    │   ├── components/      # Componentes React
    │   ├── context/         # Contextos (Auth, Theme, etc.)
    │   ├── hooks/           # Custom hooks
    │   ├── lib/             # Supabase client + utilidades
    │   └── utils/           # Funciones auxiliares
    ├── package.json
    └── tailwind.config.ts
```

## 🔐 Sistema de Roles

| Rol | Permisos |
|-----|----------|
| **owner** | Control total. Gestiona admins y usuarios. No puede ser eliminado. |
| **admin** | Crea/edita/elimina usuarios standard. Ve tareas de sus subordinados. |
| **standard** | Gestiona sus propias tareas, proyectos y métricas. |

## 🛠️ Tecnologías

- **Frontend:** Next.js 14+ (App Router), React, TypeScript, TailwindCSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Autenticación:** Supabase Auth (email/password)
- **Almacenamiento:** Supabase Storage (avatares de usuario)
