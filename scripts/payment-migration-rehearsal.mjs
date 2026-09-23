#!/usr/bin/env node
/** Runs destructive DDL only inside the runner's dedicated local fixture DB. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const runner=fileURLToPath(new URL('./payment-migration.mjs',import.meta.url));
const path=process.argv[2];
if(!path) throw new Error('Usage: node scripts/payment-migration-rehearsal.mjs local-target.json');
const target=JSON.parse(readFileSync(path,'utf8'));
assert.equal(target.transport,'local-docker','Rehearsal must never target Management API');
const folder=mkdtempSync(join(tmpdir(),'psi-payment-runner-check-'));
function run(args, success=true){
 const result=spawnSync(process.execPath,[runner,...args],{encoding:'utf8'});
 assert.equal(result.status===0,success, result.stderr || result.stdout);
 return result.stdout.trim() ? JSON.parse(result.stdout.trim()) : null;
}
try {
 for(const [label,change] of [
  ['production',{transport:'supabase-management',project_ref:'gwizdgboqwpzyiaqcxbb'}],
  ['hash',{migration_sha256:'0'.repeat(64)}],
  ['original-database',{database:'postgres'}],
  ['checkout-open',{checkout_enabled:true}],
 ]){
  const fixture=join(folder,label+'.json');
  writeFileSync(fixture,JSON.stringify({...target,...change}));
  run(['--target',fixture],false);
 }
 run(['--target',path,'--apply'],false);
 console.log('PASS: production, original DB, wrong hash, open checkout and missing confirmation rejected');
 assert.equal(run(['--target',path])?.result,'dry_run');
 run(['--target',path,'--apply','--confirm-isolated',target.database,'--rehearsal-fail-before-history'],false);
 assert.equal(run(['--target',path])?.result,'dry_run');
 console.log('PASS: intentional failure after DDL rolls back schema and history together');
 const applied=run(['--target',path,'--apply','--confirm-isolated',target.database]);
 assert.equal(applied?.result,'applied_and_verified');
 assert.equal(applied?.history_rows_added,1);
 assert.equal(applied?.catalog_migrations_applied,0);
 console.log('PASS: one corrective migration and one history row, no pending catalog migration');
 const retry=run(['--target',path,'--apply','--confirm-isolated',target.database]);
 assert.equal(retry?.result,'already_applied');
 assert.equal(retry?.wrote,false);
 console.log('PASS: duplicate apply is read-only and does not alter schema or history');
} finally { rmSync(folder,{recursive:true,force:true}); }
