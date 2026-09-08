import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const api = await readFile('server/api/index.php', 'utf8');
const bootstrap = await readFile('server/src/bootstrap.php', 'utf8');
const schema = await readFile('server/migrations/001_initial.sql', 'utf8');
const migrationTwo = await readFile('server/migrations/002_three_missions.sql', 'utf8');
const training = await readFile('server/src/training.php', 'utf8');
const phase22 = await readFile('server/migrations/005_mission_4_data_transfer.sql', 'utf8');
const provisioner = await readFile('server/bin/provision_standard_accounts.php', 'utf8');
const resetCase = api.split("case 'teacher.resetMission':")[1]?.split("case 'teacher.students':")[0];
assert.ok(resetCase && resetCase.indexOf('require_teacher()') < resetCase.indexOf('reset_student_mission('), 'Reset must authorize Teacher before any mutation.');
assert.ok(api.includes("if (!in_array($action, ['auth.login', 'auth.session'], true)) require_csrf();"), 'Reset must remain protected by CSRF.');
const reset = await readFile('server/src/reset_mission.php', 'utf8');
const resetCheck = await readFile('server/bin/check_reset.php', 'utf8');
const deploy = await readFile('scripts/deploy.ps1', 'utf8');
for (const file of ['shared/economy.json', 'src/progression.php']) assert.ok(deploy.includes(file), `Deployment must include ${file}`);
for (const table of ['player_economy', 'reward_ledger', 'reward_counters', 'player_inventory']) assert.ok(resetCheck.includes(table), `Deployment preflight must require economy schema ${table}`);
assert.ok(!resetCheck.includes('CREATE TEMPORARY TABLE `{$table}` LIKE `{$table}`'), 'Reset check must not copy a table onto the same SQL name (MariaDB error 1066).');
for (const token of ['beginTransaction()', 'FOR UPDATE', 'rollBack()', 'user_id = ? AND mission_id = ?']) assert.ok(reset.includes(token), `Reset contract missing ${token}`);

for (const token of ['password_verify(', 'require_csrf()', 'require_teacher()', 'assert_owned_attempt(', "'mission_completed'"]) {
  assert.ok(api.includes(token), `API security contract missing ${token}`);
}
for (const token of ['PDO::ATTR_EMULATE_PREPARES => false', "'httponly' => true", "'samesite' => 'Lax'", 'hash_equals(']) {
  assert.ok(bootstrap.includes(token), `PHP bootstrap security contract missing ${token}`);
}
for (const table of ['users', 'missions', 'user_progress', 'attempts', 'attempt_events', 'achievements', 'user_achievements']) {
  assert.match(schema, new RegExp(`CREATE TABLE ${table} \\(`), `Schema missing ${table}`);
}
assert.ok(!api.includes('SELECT * FROM users WHERE id = ? AND role'), 'Teacher student reads should use an explicit projection.');
for (const username of ['himari.hacker', 'kotone.hacker', 'mirko.hacker', 'cloe.hacker', 'be_a_hacker']) {
  assert.ok(provisioner.includes(username), `Standard profile provisioner missing ${username}`);
}
assert.ok(provisioner.includes('password_hash('), 'Standard profile provisioner must hash passwords.');
for (const token of ["'mission-2'", "'mission-3'", "'pathfinder'", "'file-detective'"]) {
  assert.ok(migrationTwo.includes(token), `Mission migration missing ${token}`);
}
for (const token of ['mission_locked', 'FOR UPDATE', 'nextMissionId', "'missions'"]) {
  assert.ok(api.includes(token), `Progression API missing ${token}`);
}
for (const token of ["case 'training.start':", "case 'training.finish':"]) {
  assert.ok(api.includes(token), `Training API missing ${token}`);
}
for (const token of ["'mission-4'", "'communication-node-secured'"]) {
  assert.ok(phase22.includes(token), `Phase 2.2 migration missing ${token}`);
}
assert.ok(training.includes("'data-transfer'"), 'Training policy missing data-transfer');
for (const token of ["'text_selected'", "'copy_used'", "'paste_used'", "'code_submitted'"]) {
  assert.ok(api.includes(token), `Mission 4 event allowlist missing ${token}`);
}
for (const token of ['FOR UPDATE', 'economy_award(', "'training:' . $definition['id']"]) {
  assert.ok(training.includes(token), `Training policy missing ${token}`);
}
for (const token of ["$input['credits']", "$input['xp']"]) {
  assert.ok(!api.includes(token), `Training API must not trust client reward field ${token}`);
}
assert.ok(provisioner.includes("['be_a_hacker', 'Teacher', 'teacher'"), 'Teacher profile must display as Teacher.');
const forbiddenStudentSecret = ['hack', '1', '.', '1'].join('');
const forbiddenTeacherSecret = ['hack', '159', '357'].join('');
assert.ok(!provisioner.includes(forbiddenStudentSecret), 'Student plaintext password must not be committed.');
assert.ok(!provisioner.includes(forbiddenTeacherSecret), 'Teacher plaintext password must not be committed.');
console.log('Server ownership, session, CSRF, password, event, and schema contracts present.');
