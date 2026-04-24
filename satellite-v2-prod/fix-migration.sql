-- =====================================================================
-- SATELLITE V2 · MIGRACIÓN DE CORRECCIÓN
-- Ejecutar en Supabase SQL Editor
-- Renombra columnas del schema anterior y crea tablas faltantes
-- =====================================================================

-- ── 1. Si existe la tabla "recipes" (inglés), renombrarla a "recetas"
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='recipes') THEN
    ALTER TABLE public.recipes RENAME TO recetas;
  END IF;
END $$;

-- ── 2. Si la columna se llama "category", renombrarla a "categoria"
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recetas' AND column_name='category'
  ) THEN
    ALTER TABLE public.recetas RENAME COLUMN category TO categoria;
  END IF;
END $$;

-- ── 3. Si la columna se llama "name", renombrarla a "nombre"
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recetas' AND column_name='name'
  ) THEN
    ALTER TABLE public.recetas RENAME COLUMN name TO nombre;
  END IF;
END $$;

-- ── 4. Si la columna se llama "steps", renombrarla a "pasos"
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recetas' AND column_name='steps'
  ) THEN
    ALTER TABLE public.recetas RENAME COLUMN steps TO pasos;
  END IF;
END $$;

-- ── 5. Si existe tabla "inventory" con columna "ingredient" → "ingrediente"
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory' AND column_name='ingredient'
  ) THEN
    ALTER TABLE public.inventory RENAME COLUMN ingredient TO ingrediente;
  END IF;
END $$;

-- ── 6. Si existe tabla "users" (la vieja), eliminarla con cuidado
-- SOLO si ya existe "profiles" con datos
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='users')
  AND EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='profiles') THEN
    DROP TABLE IF EXISTS public.users CASCADE;
  END IF;
END $$;

-- ── 7. Crear profiles si no existe
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text UNIQUE NOT NULL,
  nombre     text,
  role       text NOT NULL DEFAULT 'empleado'
               CHECK (role IN ('raven','admin','empleado')),
  permisos   jsonb NOT NULL DEFAULT '{}',
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── 8. Crear recetas si no existe
CREATE TABLE IF NOT EXISTS public.recetas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL,
  categoria    text,
  ingredientes jsonb NOT NULL DEFAULT '[]',
  pasos        text,
  subrecetas   jsonb NOT NULL DEFAULT '[]',
  scale_min    float NOT NULL DEFAULT 0.25,
  scale_max    float NOT NULL DEFAULT 10,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

-- ── 9. Agregar columna "categoria" si falta
ALTER TABLE public.recetas
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS pasos     text,
  ADD COLUMN IF NOT EXISTS ingredientes jsonb NOT NULL DEFAULT '[]';

-- ── 10. Crear inventory si no existe
CREATE TABLE IF NOT EXISTS public.inventory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingrediente text NOT NULL,
  stock       numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit        text NOT NULL DEFAULT 'kg',
  updated_at  timestamptz DEFAULT now()
);

-- ── 11. Crear checkins si no existe
CREATE TABLE IF NOT EXISTS public.checkins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gps        text,
  status     text NOT NULL DEFAULT 'ok',
  created_at timestamptz DEFAULT now()
);

-- ── 12. Crear signatures si no existe
CREATE TABLE IF NOT EXISTS public.signatures (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image      text,
  status     text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected')),
  token      text UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  used       boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ── 13. Crear horarios si no existe
CREATE TABLE IF NOT EXISTS public.horarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start  date NOT NULL,
  day_index   int  NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  shift       text CHECK (shift IN ('Mañana','Tarde','Noche','Descanso')),
  observation text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start, day_index)
);

-- ── 14. RLS en todas las tablas
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios   ENABLE ROW LEVEL SECURITY;

-- ── 15. Helper rol
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── 16. Políticas (drop + recrear para evitar conflictos)
-- PROFILES
DROP POLICY IF EXISTS "profiles_read_own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_admin"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_write_admin" ON public.profiles;
CREATE POLICY "profiles_read_own"    ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_read_admin"  ON public.profiles FOR SELECT USING (get_my_role() IN ('admin','raven'));
CREATE POLICY "profiles_write_admin" ON public.profiles FOR ALL    USING (get_my_role() IN ('admin','raven'));

-- RECETAS
DROP POLICY IF EXISTS "recetas_read"  ON public.recetas;
DROP POLICY IF EXISTS "recetas_write" ON public.recetas;
CREATE POLICY "recetas_read"  ON public.recetas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "recetas_write" ON public.recetas FOR ALL    USING (get_my_role() IN ('admin','raven'));

-- INVENTORY
DROP POLICY IF EXISTS "inventory_read"  ON public.inventory;
DROP POLICY IF EXISTS "inventory_write" ON public.inventory;
CREATE POLICY "inventory_read"  ON public.inventory FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "inventory_write" ON public.inventory FOR ALL    USING (get_my_role() IN ('admin','raven'));

-- CHECKINS
DROP POLICY IF EXISTS "checkins_select_own"   ON public.checkins;
DROP POLICY IF EXISTS "checkins_select_admin" ON public.checkins;
DROP POLICY IF EXISTS "checkins_insert"       ON public.checkins;
CREATE POLICY "checkins_select_own"   ON public.checkins FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "checkins_select_admin" ON public.checkins FOR SELECT USING (get_my_role() IN ('admin','raven'));
CREATE POLICY "checkins_insert"       ON public.checkins FOR INSERT WITH CHECK (user_id = auth.uid());

-- SIGNATURES
DROP POLICY IF EXISTS "signatures_select_own"   ON public.signatures;
DROP POLICY IF EXISTS "signatures_select_admin" ON public.signatures;
DROP POLICY IF EXISTS "signatures_insert"       ON public.signatures;
DROP POLICY IF EXISTS "signatures_update_admin" ON public.signatures;
CREATE POLICY "signatures_select_own"   ON public.signatures FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "signatures_select_admin" ON public.signatures FOR SELECT USING (get_my_role() IN ('admin','raven'));
CREATE POLICY "signatures_insert"       ON public.signatures FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "signatures_update_admin" ON public.signatures FOR UPDATE USING (get_my_role() IN ('admin','raven'));

-- HORARIOS
DROP POLICY IF EXISTS "horarios_select_own"   ON public.horarios;
DROP POLICY IF EXISTS "horarios_select_admin" ON public.horarios;
DROP POLICY IF EXISTS "horarios_write_admin"  ON public.horarios;
CREATE POLICY "horarios_select_own"   ON public.horarios FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "horarios_select_admin" ON public.horarios FOR SELECT USING (get_my_role() IN ('admin','raven'));
CREATE POLICY "horarios_write_admin"  ON public.horarios FOR ALL    USING (get_my_role() IN ('admin','raven'));

-- ── 17. Trigger auto-crear perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'empleado')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 18. Índices
CREATE INDEX IF NOT EXISTS idx_checkins_user     ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date     ON public.checkins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signatures_user   ON public.signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_token  ON public.signatures(token);
CREATE INDEX IF NOT EXISTS idx_horarios_week     ON public.horarios(week_start);
CREATE INDEX IF NOT EXISTS idx_recetas_categoria ON public.recetas(categoria);
CREATE INDEX IF NOT EXISTS idx_profiles_role     ON public.profiles(role);

-- ✅ Migración completada
SELECT 'Migración completada correctamente' AS status;

-- ── Agregar columna photo a signatures si no existe
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS photo text;

-- ── Agregar columna photo a checkins si no existe
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS photo text;

-- ── Crear tabla validation_links si no existe
CREATE TABLE IF NOT EXISTS public.validation_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'),
  titulo      text NOT NULL,
  descripcion text,
  contenido   text,
  expires_at  timestamptz NOT NULL,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  used        boolean NOT NULL DEFAULT false,
  signed_by   text,
  signed_at   timestamptz,
  firma_image text,
  created_at  timestamptz DEFAULT now()
);

-- ── Crear tabla pedidos si no existe
CREATE TABLE IF NOT EXISTS public.pedidos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  items       jsonb NOT NULL DEFAULT '[]',
  notas       text,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.validation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vlinks_admin"   ON public.validation_links;
DROP POLICY IF EXISTS "vlinks_public"  ON public.validation_links;
DROP POLICY IF EXISTS "vlinks_sign"    ON public.validation_links;
CREATE POLICY "vlinks_admin"  ON public.validation_links FOR ALL    USING (get_my_role() IN ('admin','raven'));
CREATE POLICY "vlinks_public" ON public.validation_links FOR SELECT USING (true);
CREATE POLICY "vlinks_sign"   ON public.validation_links FOR UPDATE USING (true);

DROP POLICY IF EXISTS "pedidos_admin" ON public.pedidos;
CREATE POLICY "pedidos_admin" ON public.pedidos FOR ALL USING (get_my_role() IN ('admin','raven'));

CREATE INDEX IF NOT EXISTS idx_vlinks_token ON public.validation_links(token);
CREATE INDEX IF NOT EXISTS idx_pedidos_date ON public.pedidos(created_at DESC);

SELECT 'Migración v2.1 completada' AS status;
