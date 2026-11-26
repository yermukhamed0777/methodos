#!/usr/bin/env node
// Static audit of Supabase ownership controls in the reviewed migrations.
//
//   node scripts/audit-ownership.js
//
// This is source inspection, not a live cross-account attempt. A live test
// needs owner-supplied Supabase credentials and isolated identities, which are
// deliberately outside the agent boundary. The transaction-only SQL fixtures
// in tests/*.sql remain the owner's live procedure.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const migrations = resolve(root, 'supabase/migrations');

const PRIVATE_TABLES = [
  'profiles',
  'trackers',
  'activities',
  'preferences',
  'documents',
  'profile_records',
  'user_skills',
  'course_progress',
  'plans',
  'plan_items',
  'saved_searches',
  'recent_views',
  'admissions_folders',
  'admissions_items',
  'folder_documents',
  'saved_resources',
  'evidence_links',
  'notification_states',
];

export function auditOwnership(directory = migrations) {
  const sql = readdirSync(directory)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readFileSync(resolve(directory, name), 'utf8'))
    .join('\n');
  const findings = [];
  const check = (ok, message) => {
    if (!ok) findings.push(message);
  };

  for (const table of PRIVATE_TABLES) {
    const ownerPolicy = new RegExp(
      `create policy "[^"]+" on public\\.${table}[\\s\\S]{0,400}?using \\(\\(select auth\\.uid\\(\\)\\)\\s*=\\s*user_id\\)`,
      'i',
    );
    if (!ownerPolicy.test(sql)) {
      // Tables created in a DO loop use format('...%I...', t), so accept the
      // shared owner-policy template when the table is in that loop's array.
      const inLoop = new RegExp(`'${table}'`).test(sql);
      check(inLoop, `${table}: no owner policy or shared owner-policy loop`);
    }
    const anonGrant = new RegExp(
      `grant[^(;]*on public\\.${table}[^;]*to anon`,
      'i',
    );
    check(!anonGrant.test(sql), `${table}: anon grant found`);
    check(
      new RegExp(
        `alter table public\\.${table} enable row level security`,
        'i',
      ).test(sql) || new RegExp(`'${table}'`).test(sql),
      `${table}: RLS not enabled`,
    );
  }

  check(
    /create function public\.check_evidence_owner/.test(sql),
    'evidence owner guard missing',
  );
  check(
    /create function public\.check_profile_document_owner/.test(sql),
    'profile document owner guard missing',
  );
  check(
    /bucket_id='profile-documents' and \(storage\.foldername\(name\)\)\[1\]=\(select auth\.uid\(\)\)::text/.test(
      sql,
    ),
    'private Storage folder ownership predicate missing',
  );
  check(
    (sql.match(/create policy "Private document /g) || []).length >= 4,
    'fewer than four private Storage policies',
  );
  check(
    /values\('profile-documents','profile-documents',false/.test(sql),
    'profile-documents bucket is not private',
  );
  check(
    /create function public\.is_content_admin[\s\S]{0,300}auth\.uid\(\)/.test(
      sql,
    ),
    'content admin gate missing',
  );
  check(
    !/grant execute on function public\.publish_intelligence[\s\S]{0,100}to anon/i.test(
      sql,
    ),
    'publish function granted to anon',
  );
  check(
    /revoke all on private\.content_admins from public,anon,authenticated/.test(
      sql,
    ),
    'admin table is exposed',
  );

  return { tables: PRIVATE_TABLES.length, findings };
}

function main() {
  const { tables, findings } = auditOwnership();
  if (findings.length) {
    console.error(`Ownership audit: FAIL (${findings.length})`);
    for (const finding of findings) console.error('  ' + finding);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Ownership audit: PASS · ${tables} private tables · owner policies, no anon grants, private Storage and admin gates present (static review only)`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
