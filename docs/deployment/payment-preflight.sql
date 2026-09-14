-- Universo Psi: preflight de pagos, exclusivamente consultas SELECT.
-- Destino esperado, a verificar FUERA de SQL con el recurso autenticado:
-- gwizdgboqwpzyiaqcxbb. No usar el enlace/cache supabase/.temp del repositorio.
-- current_database() suele ser "postgres" y NO demuestra la identidad del proyecto.
-- No invoca RPC de aplicación, no crea fixtures, no obtiene payloads, identificadores
-- de clientes/recursos, emails, claves, cuerpos de funciones ni SQL histórico.
-- Ejecutar con conexión explícita de sólo lectura al proyecto previamente verificado.
-- Secciones 1-5 funcionan aunque falten RPC/tablas nuevas. Las secciones 6-9
-- requieren el esquema BASE: public.plans, public.subscriptions,
-- private.subscription_events y supabase_migrations.schema_migrations.
-- Si alguno falta en sección 2, detenerse: no aplicar la correctiva aisladamente.

-- 1. Contexto de conexión (evidencia complementaria, no identidad del proyecto).
select current_database() as database_name,
       current_user as database_role,
       current_setting('server_version') as postgres_version,
       current_setting('transaction_read_only') as connection_read_only;

-- 2. Existencia, RLS y permisos de tablas; no se consulta contenido sensible.
with expected(schema_name, table_name, stage) as (
  values
    ('public', 'plans', 'base'),
    ('public', 'subscriptions', 'base'),
    ('private', 'payment_customers', 'base'),
    ('private', 'subscription_events', 'base'),
    ('private', 'plan_provider_mappings', 'mercadopago_20260830020000'),
    ('private', 'subscription_payment_state', 'correctiva_20260911224302'),
    ('private', 'subscription_payment_receipts', 'correctiva_20260911224302'),
    ('supabase_migrations', 'schema_migrations', 'historial')
)
select e.schema_name, e.table_name, e.stage, c.oid is not null as exists,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
       case when c.oid is not null then has_table_privilege('anon', c.oid, 'SELECT') end as anon_select,
       case when c.oid is not null then has_table_privilege('authenticated', c.oid, 'SELECT') end as authenticated_select
from expected e
left join pg_namespace n on n.nspname = e.schema_name
left join pg_class c on c.relnamespace = n.oid and c.relname = e.table_name and c.relkind in ('r', 'p')
order by e.stage, e.schema_name, e.table_name;

-- 3. Firmas exactas viejas/nuevas. NULL en permisos significa que no existe.
-- En el estado previo deben existir las legacy y faltar las nuevas; después,
-- deben desaparecer legacy y aparecer nuevas en public Y private. Las RPC de
-- backend no admiten anon/authenticated; select_professional_plan sí authenticated.
with signatures(function_name, argument_types, contract) as (
  values
    ('select_professional_plan', 'uuid,text', 'estable'),
    ('attach_subscription_checkout', 'uuid,text,text,text', 'legacy'),
    ('apply_subscription_webhook_event', 'text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb,timestamptz', 'legacy'),
    ('apply_subscription_payment_event', 'text,text,text,timestamptz,jsonb,timestamptz', 'legacy'),
    ('begin_subscription_checkout', 'uuid,text,jsonb', 'nuevo'),
    ('attach_subscription_checkout', 'uuid,text,text,text,jsonb', 'nuevo'),
    ('apply_subscription_webhook_event', 'text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb,timestamptz,text,uuid,numeric,text', 'nuevo'),
    ('apply_subscription_payment_event', 'text,text,text,timestamptz,jsonb,timestamptz,text,uuid,numeric,text,text,text', 'nuevo'),
    ('lookup_plan_provider_id', 'text,text', 'estable'),
    ('upsert_plan_provider_mapping', 'text,text,text', 'estable'),
    ('expire_past_due_subscriptions', '', 'estable')
), resolved as (
  select n.schema_name, s.function_name, s.argument_types, s.contract,
         to_regprocedure(format('%I.%I(%s)', n.schema_name, s.function_name, s.argument_types)) as function_oid
  from signatures s cross join (values ('public'), ('private')) n(schema_name)
)
select r.schema_name, r.function_name, r.argument_types, r.contract,
       r.function_oid is not null as exists,
       p.prosecdef as security_definer,
       case when p.oid is not null then coalesce('search_path=""' = any(p.proconfig), false) end as empty_search_path,
       case when p.oid is not null then has_function_privilege('anon', p.oid, 'EXECUTE') end as anon_execute,
       case when p.oid is not null then has_function_privilege('authenticated', p.oid, 'EXECUTE') end as authenticated_execute,
       case when p.oid is not null then has_function_privilege('service_role', p.oid, 'EXECUTE') end as service_role_execute
from resolved r left join pg_proc p on p.oid = r.function_oid
order by r.function_name, r.contract, r.schema_name;

-- 4. Columnas y constraints que toca la correctiva. Detecta estados parciales
-- o drift aunque la versión del historial parezca correcta. Antes: faltan las
-- columnas nuevas; existen constraints legacy. No se muestran defaults.
select n.nspname as schema_name, c.relname as table_name, a.attname as column_name,
       format_type(a.atttypid, a.atttypmod) as data_type, a.attnotnull as not_null
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
where a.attnum > 0 and not a.attisdropped
  and ((n.nspname = 'public' and c.relname = 'subscriptions'
        and a.attname in ('provider', 'provider_account', 'provider_subscription_id', 'provider_plan_id', 'plan_snapshot', 'last_payment_at', 'commitment_cycles'))
    or (n.nspname = 'public' and c.relname = 'plans'
        and a.attname in ('pricing_status', 'payment_model', 'commitment_cycles', 'grace_period_days'))
    or (n.nspname = 'private' and c.relname = 'subscription_events'
        and a.attname in ('provider_account', 'provider_resource_id'))
    or (n.nspname = 'private' and c.relname = 'payment_customers'
        and a.attname in ('id', 'provider_account')))
order by n.nspname, c.relname, a.attnum;

select n.nspname as schema_name, c.relname as table_name, con.conname as constraint_name,
       con.contype as constraint_type, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'private' and c.relname in ('payment_customers', 'subscription_events') and con.contype in ('p','u'))
   or (con.contype = 'f' and con.confrelid = to_regclass('private.payment_customers'))
order by n.nspname, c.relname, con.conname;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where (schemaname = 'public' and indexname in ('subscriptions_provider_subscription_idx', 'subscriptions_one_current_idx'))
   or (schemaname = 'private' and indexname = 'subscription_events_provider_identity_idx')
order by schemaname, indexname;

-- 5. Dependencias externas de las RPC legacy: un DROP sin CASCADE debe poder
-- ejecutarse. Cualquier fila requiere revisar la dependencia antes del release.
with legacy(function_oid) as (
  select to_regprocedure(format('%I.%s', n.schema_name, f.signature))
  from (values ('public'), ('private')) n(schema_name)
  cross join (values
    ('attach_subscription_checkout(uuid,text,text,text)'),
    ('apply_subscription_webhook_event(text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb,timestamptz)'),
    ('apply_subscription_payment_event(text,text,text,timestamptz,jsonb,timestamptz)')
  ) f(signature)
)
select l.function_oid::text as referenced_function, d.deptype as dependency_type,
       pg_describe_object(d.classid, d.objid, d.objsubid) as dependent_object
from legacy l join pg_depend d on d.refclassid = 'pg_proc'::regclass and d.refobjid = l.function_oid
where l.function_oid is not null
order by referenced_function, dependent_object;

-- 6. Historial completo de versiones, sin nombre libre ni statements SQL.
-- Debe cotejarse también con el estado real de objetos; el historial solo no
-- prueba que el cuerpo de una función coincida con la migración revisada.
select version from supabase_migrations.schema_migrations order by version;

with expected(version) as (
  values ('20260815161322'), ('20260815174429'), ('20260815210300'), ('20260815233718'),
         ('20260819120000'), ('20260830000000'), ('20260830020000'), ('20260830030000'),
         ('20260830040000'), ('20260830050000'), ('20260830060000'), ('20260911224302')
)
select e.version, m.version is not null as recorded,
       case when e.version = '20260911224302' then 'correctiva' else 'predecesora' end as stage
from expected e left join supabase_migrations.schema_migrations m on m.version = e.version
order by e.version;

-- 7. Plan habilitable. El único precio aprobado es ARS 120000/MONTH recurring.
-- to_jsonb permite leer payment_model aunque la migración MP base aún falte;
-- NULL significa columna ausente/no informada, nunca un valor por defecto inferido.
select p.code, p.is_active, p.pricing_status, p.price_amount, p.currency, p.billing_interval,
       to_jsonb(p)->>'payment_model' as payment_model,
       to_jsonb(p)->>'commitment_cycles' as commitment_cycles,
       to_jsonb(p)->>'grace_period_days' as grace_period_days,
       (p.is_active and p.pricing_status = 'PUBLISHED' and p.price_amount = 120000
         and p.currency = 'ARS' and p.billing_interval = 'MONTH'
         and to_jsonb(p)->>'payment_model' = 'RECURRING') is true as matches_approved_monthly_plan
from public.plans p where p.code = 'PROFESSIONAL_MONTHLY';

-- 8. Agregados de suscripciones; nunca devuelve IDs, snapshots completos o PII.
-- Los indicadores cuentan estado legado que requiere reconciliación individual
-- restringida antes de habilitar, no autorizan modificarlo automáticamente.
with rows as (select to_jsonb(s) as row_data from public.subscriptions s)
select count(*) as subscriptions_total,
       count(*) filter (where row_data->>'status' = 'PENDING_PAYMENT') as pending_payment,
       count(*) filter (where row_data->>'status' in ('ACTIVE','TRIALING','PAST_DUE','PAUSED')) as current_with_possible_benefits,
       count(*) filter (where row_data->>'status' in ('CANCELED','EXPIRED')) as terminal,
       count(*) filter (where row_data->>'provider_subscription_id' is not null) as provider_linked,
       count(*) filter (where row_data->>'provider_subscription_id' is not null and row_data->>'provider_account' is null) as linked_without_account,
       count(*) filter (where row_data->>'provider_subscription_id' is not null and row_data->>'provider' is distinct from 'MERCADO_PAGO') as linked_without_expected_provider,
       count(*) filter (where row_data->>'provider' = 'MERCADO_PAGO' and row_data->>'provider_subscription_id' is null) as provider_without_resource,
       count(*) filter (where row_data->>'status' = 'PENDING_PAYMENT' and row_data->'plan_snapshot'->>'pricing_status' is distinct from 'PUBLISHED') as pending_without_published_snapshot,
       count(*) filter (where row_data->>'provider_subscription_id' is not null
         and (row_data->'plan_snapshot'->>'price_amount' is null or row_data->'plan_snapshot'->>'currency' is null
           or row_data->'plan_snapshot'->>'payment_model' is null)) as linked_with_incomplete_commercial_snapshot,
       count(*) filter (where row_data->>'status' = 'ACTIVE' and row_data->>'last_payment_at' is null) as active_without_recorded_payment,
       count(*) filter (where row_data->>'status' = 'ACTIVE' and row_data->>'current_period_end' is null) as active_without_period_end
from rows;

-- Colisiones de la nueva llave de recursos; devuelve sólo número de grupos.
with rows as (select to_jsonb(s) as row_data from public.subscriptions s), duplicates as (
  select 1 from rows where row_data->>'provider_subscription_id' is not null
  group by row_data->>'provider', row_data->>'provider_account', row_data->>'provider_subscription_id'
  having count(*) > 1
)
select count(*) as duplicate_provider_resource_groups from duplicates;

-- 9. Agregados de eventos. Legacy sin cuenta queda retenido; la migración sólo
-- rellena account a partir de su suscripción asociada, nunca adivina la cuenta.
with rows as (select to_jsonb(e) as row_data from private.subscription_events e)
select count(*) as events_total,
       count(*) filter (where row_data->>'provider' = 'MERCADO_PAGO') as mercado_pago_events,
       count(*) filter (where row_data->>'processed_at' is null) as unprocessed_events,
       count(*) filter (where row_data->>'processing_error' is not null) as events_with_processing_error,
       count(*) filter (where row_data->>'subscription_id' is null) as unlinked_events,
       count(*) filter (where row_data->>'subscription_id' is null and row_data->>'processed_at' is not null) as processed_without_subscription,
       count(*) filter (where row_data->>'provider' = 'MERCADO_PAGO' and row_data->>'provider_account' is null) as mercado_pago_without_recorded_account
from rows;

select count(*) as mercado_pago_events_without_resolvable_account
from private.subscription_events e left join public.subscriptions s on s.id = e.subscription_id
where e.provider = 'MERCADO_PAGO'
  and coalesce(to_jsonb(e)->>'provider_account', to_jsonb(s)->>'provider_account') is null;

-- Interpretación de release (no ejecuta acciones):
-- * Falta una predecesora o existe estado parcial: NO correr la correctiva sola;
--   revisar diferencias contra migraciones remotas inmutables antes de decidir.
-- * Correctiva registrada y contrato nuevo completo: NO volver a aplicarla.
-- * Legacy completo, correctiva ausente y sin dependencias bloqueantes: candidato
--   para app nueva CHECKOUT_ENABLED=false -> migración -> reconciliación/smoke.
-- * Firmas/permisos correctos no habilitan cobros: sandbox y aprobación siguen
--   siendo requisitos separados. Rollback a app legacy es incompatible.
-- * Eventos consumidos sin suscripción, vínculos sin cuenta o ACTIVE sin pago
--   requieren revisar evidencia autoritativa; no borrarlos ni inventar snapshots.
