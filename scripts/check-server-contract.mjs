import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const api = await readFile('server/api/index.php', 'utf8');
const bootstrap = await readFile('server/src/bootstrap.php', 'utf8');
const schema = await readFile('server/migrations/001_initial.sql', 'utf8');
const migrationTwo = await readFile('server/migrations/002_three_missions.sql', 'utf8');
const provisioner = await readFile('server/bin/provision_standard_accounts.php', 'utf8');

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
assert.ok(provisioner.includes("['be_a_hacker', 'Teacher', 'teacher'"), 'Teacher profile must display as Teacher.');
const forbiddenStudentSecret = ['hack', '1', '.', '1'].join('');
const forbiddenTeacherSecret = ['hack', '159', '357'].join('');
assert.ok(!provisioner.includes(forbiddenStudentSecret), 'Student plaintext password must not be committed.');
assert.ok(!provisioner.includes(forbiddenTeacherSecret), 'Teacher plaintext password must not be committed.');
console.log('Server ownership, session, CSRF, password, event, and schema contracts present.');
