-- ============================================================
-- TODEXO - Script de Setup Completo para Supabase
-- ============================================================
-- Este script crea toda la infraestructura necesaria en un
-- proyecto de Supabase nuevo y vacío.
--
-- INSTRUCCIONES:
-- 1. Crea un proyecto nuevo en https://supabase.com
-- 2. Ve al SQL Editor del proyecto
-- 3. Pega y ejecuta este archivo completo
-- 4. ¡Listo! Tu base de datos está configurada.
-- ============================================================


-- ============================================================
-- PARTE 1: TABLAS
-- ============================================================

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  role text DEFAULT 'standard'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  avatar_url text,
  settings jsonb DEFAULT '{"sound_enabled": true, "notifications_enabled": true}'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'standard'::text]))
);

-- Tabla de proyectos
CREATE TABLE public.projects (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

-- Tabla de tareas
CREATE TABLE public.tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  project_id uuid,
  status text DEFAULT 'pending'::text NOT NULL,
  priority text DEFAULT 'medium'::text NOT NULL,
  due_date date,
  due_time time without time zone,
  tags text[] DEFAULT ARRAY[]::text[],
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  repeat_type text,
  reminder_at timestamp with time zone,
  is_reminder boolean DEFAULT false NOT NULL,
  reminder_for_task_id uuid,
  assigned_by uuid,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT tasks_reminder_for_task_id_fkey FOREIGN KEY (reminder_for_task_id) REFERENCES public.tasks(id)
);

-- Tabla de métricas de usuario
CREATE TABLE public.user_metrics (
  user_id uuid NOT NULL,
  current_streak integer DEFAULT 0,
  last_completed_date date,
  daily_goal integer DEFAULT 12,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT user_metrics_pkey PRIMARY KEY (user_id)
);

-- Catálogo de logros
CREATE TABLE public.achievements (
  id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text,
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);

-- Logros desbloqueados por usuario
CREATE TABLE public.user_achievements (
  user_id uuid NOT NULL,
  achievement_id text NOT NULL,
  unlocked_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT user_achievements_pkey PRIMARY KEY (user_id, achievement_id),
  CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id)
);

-- Miembros de equipo (relación admin → usuario)
CREATE TABLE public.team_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  admin_id uuid,
  user_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_user_id_key UNIQUE (user_id),
  CONSTRAINT team_members_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);


-- ============================================================
-- PARTE 2: FUNCIONES
-- ============================================================

-- Función auxiliar: obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_auth_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

-- Trigger: crear perfil y métricas al registrar un usuario nuevo
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'standard'
  );

  insert into public.user_metrics (user_id) values (new.id);
  
  return new;
end;
$function$;

-- Trigger: confirmar email automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.confirm_email_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  new.email_confirmed_at = now();
  return new;
end;
$function$;

-- RPC: listar usuarios con sus emails (solo admin/owner)
CREATE OR REPLACE FUNCTION public.get_users_with_emails()
 RETURNS TABLE(id uuid, full_name text, role text, email text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Verificar si el que llama es admin u owner
  IF NOT (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
    AND public.profiles.role IN ('owner', 'admin')
  )) THEN
    RAISE EXCEPTION 'Solo administradores pueden ver correos';
  END IF;

  RETURN QUERY
  SELECT 
    p.id, 
    p.full_name, 
    p.role, 
    u.email::text, 
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at ASC;
END;
$function$;

-- RPC: crear usuario desde panel de administración
CREATE OR REPLACE FUNCTION public.admin_create_user(target_email text, target_password text, target_full_name text, target_role text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_user_id uuid;
  current_user_role text;
BEGIN
  -- 1. Verificar que el usuario actual sea admin u owner
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role IS NULL OR current_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden crear usuarios';
  END IF;

  -- 2. Validar rol
  IF target_role NOT IN ('admin', 'standard') THEN
     RAISE EXCEPTION 'Rol inválido';
  END IF;

  -- 3. Crear el usuario en auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    target_email,
    extensions.crypt(target_password, extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', target_full_name),
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  ) RETURNING id INTO new_user_id;

  -- 4. Crear el perfil (puede que el trigger ya lo haga, ON CONFLICT para evitar error)
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new_user_id, target_full_name, target_role)
  ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  RETURN json_build_object('success', true, 'user_id', new_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- RPC: actualizar usuario desde panel de administración
CREATE OR REPLACE FUNCTION public.admin_update_user(target_user_id uuid, new_email text DEFAULT NULL::text, new_password text DEFAULT NULL::text, new_full_name text DEFAULT NULL::text, new_role text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_user_role text;
BEGIN
  -- 1. Verificar permisos del que llama
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role IS NULL OR current_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- 2. No permitir que un admin cambie el rol de un owner
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id AND role = 'owner') AND current_user_role != 'owner' THEN
     RAISE EXCEPTION 'No puedes modificar al dueño';
  END IF;

  -- 3. Actualizar auth.users
  IF new_email IS NOT NULL THEN
    UPDATE auth.users SET email = new_email, email_confirmed_at = now() WHERE id = target_user_id;
  END IF;

  IF new_password IS NOT NULL THEN
    UPDATE auth.users SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')) WHERE id = target_user_id;
  END IF;

  -- 4. Actualizar public.profiles
  UPDATE public.profiles SET
    full_name = COALESCE(new_full_name, full_name),
    role = COALESCE(new_role, role),
    updated_at = now()
  WHERE id = target_user_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- RPC: eliminar usuario desde panel de administración
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_user_role text;
BEGIN
  -- 1. Verificar permisos del que llama
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role IS NULL OR current_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- 2. No permitir que un admin elimine a un owner, ni que alguien se elimine a sí mismo
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id AND role = 'owner') AND current_user_role != 'owner' THEN
     RAISE EXCEPTION 'No puedes eliminar al dueño';
  END IF;

  IF auth.uid() = target_user_id THEN
     RAISE EXCEPTION 'No puedes eliminarte a ti mismo';
  END IF;

  -- 3. Eliminar usuario en auth.users (cascada elimina profile, metrics, etc.)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;


-- ============================================================
-- PARTE 3: TRIGGERS
-- ============================================================

-- Trigger: al crear un usuario nuevo, crear su perfil y métricas
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: confirmar email automáticamente al registrarse
CREATE TRIGGER tr_confirm_email_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.confirm_email_on_signup();


-- ============================================================
-- PARTE 4: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en las tablas que lo necesitan
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- --- TASKS ---
CREATE POLICY "Admin supervisor read tasks" ON public.tasks
  FOR SELECT USING (
    (auth.uid() = user_id) OR 
    (get_auth_role() = 'owner') OR 
    ((get_auth_role() = 'admin') AND ((SELECT profiles.role FROM profiles WHERE profiles.id = tasks.user_id) <> 'owner'))
  );

CREATE POLICY "Admin supervisor insert tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id) OR 
    (get_auth_role() = 'owner') OR 
    ((get_auth_role() = 'admin') AND ((SELECT profiles.role FROM profiles WHERE profiles.id = tasks.user_id) <> 'owner'))
  );

CREATE POLICY "Admin supervisor update tasks" ON public.tasks
  FOR UPDATE USING (
    (auth.uid() = user_id) OR 
    (get_auth_role() = 'owner') OR 
    ((get_auth_role() = 'admin') AND ((SELECT profiles.role FROM profiles WHERE profiles.id = tasks.user_id) <> 'owner'))
  );

CREATE POLICY "Admin supervisor delete tasks" ON public.tasks
  FOR DELETE USING (
    (auth.uid() = user_id) OR 
    (get_auth_role() = 'owner') OR 
    ((get_auth_role() = 'admin') AND ((SELECT profiles.role FROM profiles WHERE profiles.id = tasks.user_id) <> 'owner'))
  );

-- --- PROJECTS ---
CREATE POLICY "Users can read own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin supervisor manage projects" ON public.projects
  FOR ALL USING (
    (auth.uid() = user_id) OR 
    (get_auth_role() = 'owner') OR 
    ((get_auth_role() = 'admin') AND ((SELECT profiles.role FROM profiles WHERE profiles.id = projects.user_id) <> 'owner'))
  );

-- --- USER METRICS ---
CREATE POLICY "Admin supervisor read metrics" ON public.user_metrics
  FOR SELECT USING (
    (auth.uid() = user_id) OR 
    (get_auth_role() = 'owner') OR 
    ((get_auth_role() = 'admin') AND ((SELECT profiles.role FROM profiles WHERE profiles.id = user_metrics.user_id) <> 'owner'))
  );

CREATE POLICY "Users can update own metrics" ON public.user_metrics
  FOR UPDATE USING (auth.uid() = user_id);

-- --- ACHIEVEMENTS ---
CREATE POLICY "Anyone can read achievements catalog" ON public.achievements
  FOR SELECT USING (true);

-- --- USER ACHIEVEMENTS ---
CREATE POLICY "Users can read own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- PARTE 5: STORAGE (Bucket de Avatars)
-- ============================================================

-- Crear el bucket de avatares (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Política: cualquiera puede ver los avatares
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Política: usuarios autenticados pueden subir avatares
CREATE POLICY "Authenticated Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
  );

-- Política: solo el dueño puede actualizar su avatar
CREATE POLICY "Owner Access" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid() = owner
  );

-- Política: solo el dueño puede eliminar su avatar
CREATE POLICY "Owner Delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND auth.uid() = owner
  );


-- ============================================================
-- PARTE 6: CONFIGURACIÓN DE AUTENTICACIÓN
-- ============================================================
-- NOTA: Estas configuraciones se hacen desde el Dashboard de Supabase,
-- NO se pueden configurar por SQL. Asegúrate de:
--
-- 1. Ir a Authentication > Providers > Email
--    - Habilitar "Enable Email Signup"
--    - DESACTIVAR "Confirm email" (el trigger lo hace automáticamente)
--
-- 2. Ir a Authentication > URL Configuration
--    - Site URL: http://localhost:3000 (o tu dominio)
--    - Redirect URLs: http://localhost:3000/**
--
-- ============================================================

-- ✅ ¡SETUP COMPLETO! Tu base de datos está lista para Todexo.
