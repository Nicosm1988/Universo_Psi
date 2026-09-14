#!/usr/bin/env node
/** Fresh hosted sandbox only; no general seed and no corrective migration. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { splitSql } from './payment-migration.mjs';
const REF='gzsbndvaxdyuyhjidfqq';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const literal=(s)=>"'"+s.replaceAll("'","''")+"'";
async function request(path,body){
 const token=process.env.SUPABASE_ACCESS_TOKEN;
 if(!token) throw new Error('Provide SUPABASE_ACCESS_TOKEN securely in process environment');
 let response;
 try { response=await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`,{
  method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(90000),
 }); } catch { throw new Error('Request outcome unknown; inspect sandbox history read-only before any retry'); }
 if(!response.ok) throw new Error(`Management HTTP ${response.status}; no automatic retry`);
 return response.json();
}
const discover=`select json_build_object('read_only',current_setting('transaction_read_only'),
 'public_tables',(select count(*) from pg_catalog.pg_tables where schemaname='public'),
 'private_exists',to_regnamespace('private') is not null,
 'history_exists',to_regclass('supabase_migrations.schema_migrations') is not null) as state`;
async function main(){
 const {values}=parseArgs({options:{apply:{type:'boolean',default:false},'confirm-isolated':{type:'string'},'output-sql':{type:'string'}}});
 if(values.apply && values['confirm-isolated']!==REF) throw new Error('Apply requires exact --confirm-isolated sandbox project ref');
 const pinned=JSON.parse(await readFile(new URL('./payment-legacy-hashes.json',import.meta.url),'utf8'));
 const files=Object.keys(pinned).sort();
 if(files.length!==8 || files.at(-1).slice(0,14)!=='20260830030000') throw new Error('Expected eight reviewed legacy files only');
 let sql=`begin;\nset local statement_timeout='75s';\nselect pg_advisory_xact_lock(20260912,8);\ndo $bootstrap_guard$ begin
 if to_regnamespace('private') is not null or exists(select 1 from pg_catalog.pg_tables where schemaname='public') then
 raise exception 'Sandbox is not empty'; end if; end; $bootstrap_guard$;
 create schema if not exists supabase_migrations;
 create table if not exists supabase_migrations.schema_migrations(version text primary key,statements text[],name text);
 lock table supabase_migrations.schema_migrations in share row exclusive mode;
 do $history_guard$ begin if exists(select 1 from supabase_migrations.schema_migrations) then raise exception 'History is not empty'; end if; end; $history_guard$;\n`;
 for(const file of files){
  const source=await readFile(ROOT+'supabase/migrations/'+file,'utf8');
  if(createHash('sha256').update(source).digest('hex')!==pinned[file]) throw new Error('Legacy source hash changed: '+file);
  const all=splitSql(source);
  if(all[0].toLowerCase()!=='begin' || all.at(-1).toLowerCase()!=='commit') throw new Error('Unexpected transaction boundary');
  const statements=all.slice(1,-1);
  sql+=statements.map((s)=>s+';').join('\n')+'\ninsert into supabase_migrations.schema_migrations(version,statements,name) values ('+
   literal(file.slice(0,14))+',ARRAY['+statements.map(literal).join(',')+']::text[],'+literal(file.slice(15,-4))+');\n';
 }
 sql+='commit;\n';
 if(values['output-sql']) await writeFile(values['output-sql'],sql,{mode:0o600});
 const project=await request('');
 if(project.id!==REF || project.organization_id!=='qwxmgztzoidyzkelupdr' || project.name!=='universo-psi-mp-sandbox' || project.status!=='ACTIVE_HEALTHY') throw new Error('Sandbox identity or health mismatch');
 const before=(await request('/database/query',{query:discover,read_only:true}))[0]?.state;
 if(before?.read_only!=='on' || before.public_tables!==0 || before.private_exists) throw new Error('Target is not an empty sandbox; no changes sent');
 if(before.history_exists){
  const rows=await request('/database/query',{query:'select count(*) as count from supabase_migrations.schema_migrations',read_only:true});
  if(rows[0]?.count!==0) throw new Error('Sandbox history is not empty');
 }
 if(!values.apply){ console.log(JSON.stringify({result:'dry_run',project_ref:REF,migrations:8,corrective:false,catalog:false,seed:false,sql_bytes:Buffer.byteLength(sql)}));return; }
 await request('/database/query',{query:sql,read_only:false});
 const rows=await request('/database/query',{query:'select version from supabase_migrations.schema_migrations order by version',read_only:true});
 if(JSON.stringify(rows.map((r)=>r.version))!==JSON.stringify(files.map((f)=>f.slice(0,14)))) throw new Error('Unexpected post-bootstrap history; do not retry or repair automatically');
 console.log(JSON.stringify({result:'bootstrapped_and_verified',project_ref:REF,migrations:8,corrective:false,catalog:false,seed:false}));
}
main().catch((error)=>{console.error(error.message);process.exitCode=1;});
