-- ══════════════════════════════════════════════════════════════
-- Salón Eventos · esquema inicial (Supabase, plan gratis)
-- Un mismo proyecto de Supabase puede servir a varios salones:
-- cada fila lleva salon_id (= variable de entorno SALON_ID).
--
-- Seguridad (RLS):
--   - fechas_ocupadas: lectura pública (anon/authenticated); escritura solo service role.
--   - consultas y senas: sin políticas → solo el service role (funciones de Netlify).
-- ══════════════════════════════════════════════════════════════

-- ── Fechas ocupadas ──
-- turno = id del turno en config.js, o 'todo' cuando se bloquea el día entero.
create table if not exists public.fechas_ocupadas (
  salon_id  text        not null,
  fecha     date        not null,
  turno     text        not null default 'todo',
  motivo    text,
  creado_en timestamptz not null default now()
);

create unique index if not exists fechas_ocupadas_salon_fecha_turno_uk
  on public.fechas_ocupadas (salon_id, fecha, turno);

-- ── Consultas (cada "Enviar por WhatsApp" y cada intento de seña) ──
create table if not exists public.consultas (
  id        uuid        primary key default gen_random_uuid(),
  salon_id  text        not null,
  seleccion jsonb       not null,
  total     integer     not null check (total >= 0),
  canal     text        not null check (canal in ('whatsapp', 'sena')),
  creado_en timestamptz not null default now()
);

create index if not exists consultas_salon_creado_idx
  on public.consultas (salon_id, creado_en desc);

-- ── Señas con Mercado Pago ──
-- id viaja a Mercado Pago como external_reference, así el webhook encuentra la fila.
create table if not exists public.senas (
  id               uuid        primary key default gen_random_uuid(),
  salon_id         text        not null,
  mp_preference_id text,
  mp_payment_id    text,
  estado           text        not null default 'pendiente'
                   check (estado in ('pendiente', 'aprobada', 'rechazada', 'devuelta')),
  monto            integer     not null check (monto >= 0),
  seleccion        jsonb       not null,
  creado_en        timestamptz not null default now()
);

create index if not exists senas_salon_creado_idx on public.senas (salon_id, creado_en desc);
create index if not exists senas_mp_preference_idx on public.senas (mp_preference_id);

-- ── RLS ──
alter table public.fechas_ocupadas enable row level security;
alter table public.consultas       enable row level security;
alter table public.senas           enable row level security;

drop policy if exists "fechas_ocupadas lectura publica" on public.fechas_ocupadas;
create policy "fechas_ocupadas lectura publica"
  on public.fechas_ocupadas
  for select
  to anon, authenticated
  using (true);

-- consultas y senas no tienen políticas: con RLS activo, anon y authenticated
-- no pueden leer ni escribir. El service role ignora RLS.
-- Además se quitan los permisos de tabla por las dudas:
revoke all on public.consultas from anon, authenticated;
revoke all on public.senas     from anon, authenticated;
revoke insert, update, delete on public.fechas_ocupadas from anon, authenticated;
