#!/usr/bin/env node
/** Directed sandbox rehearsal: one reviewed migration, one atomic history row. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const VERSION = '20260911224302';
const NAME = 'harden_payment_persistence';
const FILE = `supabase/migrations/${VERSION}_${NAME}.sql`;
const HASH = '10b29b93ea002e68ab8657797b6a650b0346e53f1187792189c4051fcf105e19';
const PRODUCTION = 'gwizdgboqwpzyiaqcxbb';
const ISOLATED_PROJECT = 'gzsbndvaxdyuyhjidfqq';
const REQUIRED = ['20260815161322', '20260815174429', '20260815210300', '20260815233718', '20260819120000', '20260830000000', '20260830020000', '20260830030000'];
const CATALOG = ['20260830040000', '20260830050000', '20260830060000'];
const LEGACY = [
  'attach_subscription_checkout(uuid,text,text,text)',
  'apply_subscription_webhook_event(text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb,timestamptz)',
  'apply_subscription_payment_event(text,text,text,timestamptz,jsonb,timestamptz)',
].flatMap((signature) => ['public.', 'private.'].map((schema) => schema + signature));
const NEW = [
  'begin_subscription_checkout(uuid,text,jsonb)',
  'attach_subscription_checkout(uuid,text,text,text,jsonb)',
  'apply_subscription_webhook_event(text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb,timestamptz,text,uuid,numeric,text)',
  'apply_subscription_payment_event(text,text,text,timestamptz,jsonb,timestamptz,text,uuid,numeric,text,text,text)',
].flatMap((signature) => ['public.', 'private.'].map((schema) => schema + signature));
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const array = (values) => `ARRAY[${values.map(literal).join(',')}]::text[]`;

// Preserve exact statements, including PL/pgSQL dollar quotes, for CLI history.
export function splitSql(source) {
  const statements = [];
  let start = 0, state = '', tag = '', depth = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source[i], next = source[i + 1];
    if (state === 'line') { if (char === '\n') state = ''; continue; }
    if (state === 'block') {
      if (char === '/' && next === '*') { depth++; i++; }
      else if (char === '*' && next === '/') { i++; if (--depth === 0) state = ''; }
      continue;
    }
    if (state === 'dollar') { if (source.startsWith(tag, i)) { i += tag.length - 1; state = ''; } continue; }
    if (state === "'" || state === '"') {
      if (char === state) { if (next === state) i++; else state = ''; }
      continue;
    }
    if (char === '-' && next === '-') { state = 'line'; i++; }
    else if (char === '/' && next === '*') { state = 'block'; depth = 1; i++; }
    else if (char === "'" || char === '"') state = char;
    else if (char === '$') {
      const match = source.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/);
      if (match) { tag = match[0]; state = 'dollar'; i += tag.length - 1; }
    } else if (char === ';') { statements.push(source.slice(start, i).trim()); start = i + 1; }
  }
  if (state && state !== 'line') throw new Error('SQL literal or comment is incomplete');
  if (source.slice(start).trim()) throw new Error('SQL contains an unterminated statement');
  return statements.filter(Boolean);
}

const STATE_SQL = `select json_build_object(
 'database', current_database(),
 'read_only', current_setting('transaction_read_only'),
 'history_columns', (select json_agg(json_build_object('name',column_name,'type',udt_name,'nullable',is_nullable,'has_default',column_default is not null) order by ordinal_position)
   from information_schema.columns where table_schema='supabase_migrations' and table_name='schema_migrations'),
 'versions', (select coalesce(json_agg(version order by version),'[]') from supabase_migrations.schema_migrations),
 'applied_history', (select json_build_object('name',name,'statements_md5',md5(array_to_string(statements,E'\\n'))) from supabase_migrations.schema_migrations where version=${literal(VERSION)}),
 'legacy_count', (select count(*) from unnest(${array(LEGACY)}) signature where to_regprocedure(signature) is not null),
 'new_count', (select count(*) from unnest(${array(NEW)}) signature where to_regprocedure(signature) is not null),
 'state_table', to_regclass('private.subscription_payment_state') is not null,
 'receipts_table', to_regclass('private.subscription_payment_receipts') is not null,
 'legacy_event_constraint', exists(select 1 from pg_constraint where conrelid='private.subscription_events'::regclass and conname='subscription_events_provider_external_event_id_key'),
 'legacy_customer_key', exists(select 1 from pg_constraint where conrelid='private.payment_customers'::regclass and conname='payment_customers_provider_external_customer_id_key'),
 'provider_index', to_regclass('public.subscriptions_provider_subscription_idx') is not null
) as state`;

function validateTarget(target) {
  if (target.environment !== 'sandbox' || target.checkout_enabled !== false) throw new Error('Manifest must declare sandbox and checkout_enabled=false');
  if (target.migration_sha256 !== HASH) throw new Error('Manifest migration hash differs from the reviewed artifact');
  if (target.transport === 'local-docker') {
    if (target.container !== 'supabase_db_psi_payments_20260911' || !/^psi_payments_legacy_[0-9]{8}(?:_[a-z0-9]+)?$/.test(target.database)) {
      throw new Error('Local target must be a dedicated legacy fixture DB in the approved test container; postgres is prohibited');
    }
    return target.database;
  }
  if (target.transport !== 'supabase-management' || target.project_ref !== ISOLATED_PROJECT || target.project_ref === PRODUCTION) {
    throw new Error('Remote target must be an explicit isolated project; production is prohibited even for dry-run');
  }
  if (target.organization_id !== 'qwxmgztzoidyzkelupdr' || target.project_name !== 'universo-psi-mp-sandbox') throw new Error('Expected isolated project name and organization are required');
  return target.project_ref;
}

function localSql(target, query, readOnly) {
  const sql = readOnly ? `begin read only; ${query}; rollback;` : query;
  const result = spawnSync('docker', ['exec', '-i', target.container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', target.database], { input: sql, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error('Local SQL failed; the transaction was not confirmed. Inspect the isolated database with dry-run before retrying.');
  const line = result.stdout.trim().split('\n').filter(Boolean).at(-1);
  return line ? [{ state: JSON.parse(line) }] : [];
}

async function management(target, path, body) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN must be supplied securely in the process environment');
  let response;
  try {
    response = await fetch(`https://api.supabase.com/v1/projects/${target.project_ref}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
    });
  } catch { throw new Error('Management request failed or timed out. Outcome may be unknown; use dry-run to inspect history, never replay blindly.'); }
  if (!response.ok) throw new Error(`Management request returned HTTP ${response.status}; no automatic retry was attempted`);
  return response.json();
}

async function state(target) {
  const rows = target.transport === 'local-docker'
    ? localSql(target, STATE_SQL, true)
    : await management(target, '/database/query', { query: STATE_SQL, read_only: true });
  const result = rows[0]?.state;
  if (!result || result.read_only !== 'on') throw new Error('Read-only preflight was not confirmed by the database');
  if (target.transport === 'local-docker' && result.database !== target.database) throw new Error('Connected to an unexpected database');
  return result;
}

function validateHistory(current) {
  const requiredColumns = { version: 'text', statements: '_text', name: 'text' };
  for (const [name, type] of Object.entries(requiredColumns)) {
    if (!current.history_columns?.some((column) => column.name === name && column.type === type)) throw new Error(`Migration history contract differs for ${name}; review before applying`);
  }
  if (current.history_columns.some((column) => !(column.name in requiredColumns) && column.nullable === 'NO' && !column.has_default)) throw new Error('History has an extra required column without a default');
  if (REQUIRED.some((version) => !current.versions.includes(version))) throw new Error('A required legacy migration is missing');
  if (current.versions.some((version) => ![...REQUIRED, ...CATALOG, VERSION].includes(version))) throw new Error('Unreviewed migration history detected');
}

export function buildTransaction(statements, before, failBeforeHistory = false) {
  return `begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';
select pg_advisory_xact_lock(20260911, 224302);
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $payment_guard$
begin
  if (select array_agg(version order by version) from supabase_migrations.schema_migrations) is distinct from ${array(before.versions)} then
    raise exception 'Migration history changed since preflight';
  end if;
  if exists(select 1 from unnest(${array(LEGACY)}) signature where to_regprocedure(signature) is null)
     or exists(select 1 from unnest(${array(NEW)}) signature where to_regprocedure(signature) is not null)
     or to_regclass('private.subscription_payment_state') is not null
     or to_regclass('private.subscription_payment_receipts') is not null then
    raise exception 'Legacy contract changed since preflight';
  end if;
end;
$payment_guard$;
${statements.map((statement) => `${statement};`).join('\n')}
${failBeforeHistory ? "do $payment_failure$ begin raise exception 'Intentional local atomicity rehearsal failure'; end; $payment_failure$;" : ''}
insert into supabase_migrations.schema_migrations(version, statements, name)
values (${literal(VERSION)}, ${array(statements)}, ${literal(NAME)});
commit;
`;
}

async function main() {
  const { values } = parseArgs({ options: {
    target: { type: 'string' }, apply: { type: 'boolean', default: false },
    'confirm-isolated': { type: 'string' }, 'output-sql': { type: 'string' },
    'rehearsal-fail-before-history': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  } });
  if (values.help) {
    console.log('node scripts/payment-migration.mjs --target manifest.json [--output-sql reviewed.sql] [--apply --confirm-isolated <exact-target>]\nDefault: read-only dry-run. Production is prohibited. Never enables checkout or applies catalog migrations.');
    return;
  }
  if (!values.target) throw new Error('--target manifest.json is required');
  const target = JSON.parse(await readFile(values.target, 'utf8'));
  const identity = validateTarget(target);
  if (values.apply && values['confirm-isolated'] !== identity) throw new Error('--apply requires --confirm-isolated matching the exact target');
  if (values['rehearsal-fail-before-history'] && target.transport !== 'local-docker') throw new Error('Intentional failure is available only for isolated local fixtures');
  const source = await readFile(ROOT + FILE, 'utf8');
  if (createHash('sha256').update(source).digest('hex') !== HASH) throw new Error('Migration file changed; stop and review the pinned hash');
  const allStatements = splitSql(source);
  if (allStatements[0].toLowerCase() !== 'begin' || allStatements.at(-1).toLowerCase() !== 'commit') throw new Error('Unexpected migration transaction boundaries');
  const statements = allStatements.slice(1, -1);
  const historyHash = createHash('md5').update(statements.join('\n')).digest('hex');
  if (target.transport === 'supabase-management') {
    const project = await management(target, '', undefined);
    if (project.id !== target.project_ref || project.organization_id !== target.organization_id || project.name !== target.project_name || project.status !== 'ACTIVE_HEALTHY') throw new Error('Remote project identity, name, organization or health differs from the manifest');
  }
  const before = await state(target);
  validateHistory(before);
  if (before.versions.includes(VERSION)) {
    if (before.new_count !== NEW.length || before.legacy_count !== 0 || !before.state_table || !before.receipts_table || before.applied_history?.name !== NAME || before.applied_history?.statements_md5 !== historyHash) throw new Error('Version recorded but the new contract or exact history differs');
    console.log(JSON.stringify({ result: 'already_applied', target: identity, version: VERSION, wrote: false }));
    return;
  }
  if (before.legacy_count !== LEGACY.length || before.new_count !== 0 || before.state_table || before.receipts_table || !before.legacy_event_constraint || !before.legacy_customer_key || !before.provider_index) throw new Error('Target is not the reviewed complete legacy contract');
  const transaction = buildTransaction(statements, before, values['rehearsal-fail-before-history']);
  if (values['output-sql']) await writeFile(values['output-sql'], transaction, { mode: 0o600 });
  if (!values.apply) {
    console.log(JSON.stringify({ result: 'dry_run', target: identity, version: VERSION, migration_sha256: HASH, statements: statements.length, pending_catalog: CATALOG.filter((version) => !before.versions.includes(version)), wrote: false }));
    return;
  }
  if (target.transport === 'local-docker') localSql(target, transaction, false);
  else await management(target, '/database/query', { query: transaction, read_only: false });
  const after = await state(target);
  if (JSON.stringify(after.versions) !== JSON.stringify([...before.versions, VERSION].sort()) || after.new_count !== NEW.length || after.legacy_count !== 0 || !after.state_table || !after.receipts_table || after.applied_history?.name !== NAME || after.applied_history?.statements_md5 !== historyHash) throw new Error('Post-apply verification failed; preserve evidence and inspect, do not replay or repair history');
  console.log(JSON.stringify({ result: 'applied_and_verified', target: identity, version: VERSION, migration_sha256: HASH, history_rows_added: 1, catalog_migrations_applied: 0 }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
