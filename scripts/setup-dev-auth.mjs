import { randomBytes, scryptSync } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const terminal = createInterface({ input: stdin, output: stdout });
const student = await terminal.question('Shared student password: ');
const teacher = await terminal.question('Teacher password: ');
terminal.close();
if (!student || !teacher) throw new Error('Both passwords are required.');

function credential(secret) {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(secret, salt, 32).toString('hex') };
}

const config = { version: 1, credentials: { student: credential(student), teacher: credential(teacher) } };
await writeFile('.dev-auth.local.json', `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
console.log('Local development credentials created. Restart npm run dev.');
