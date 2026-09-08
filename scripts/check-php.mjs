import { spawnSync } from 'node:child_process';
import { readdirSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const php = process.env.PHP_BINARY || 'php';
function run(args) {
  const result = spawnSync(php, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
function lint(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) lint(file);
    else if (file.endsWith('.php')) run(['-l', file]);
  }
}
lint('server');
run(['server/tests/progression_policy.php']);
run(['server/tests/training_policy.php']);
run(['server/tests/security_contract.php']);
// Test the flattened deployment layout outside the repo, so a repository-relative
// catalog fallback cannot hide a broken packaged path.
const packageRoot = mkdtempSync(join(tmpdir(), 'hacker-package-check-'));
mkdirSync(join(packageRoot, 'src')); mkdirSync(join(packageRoot, 'shared'));
copyFileSync('server/src/progression.php', join(packageRoot, 'src/progression.php'));
copyFileSync('shared/economy.json', join(packageRoot, 'shared/economy.json'));
writeFileSync(join(packageRoot, 'check.php'), "<?php require __DIR__ . '/src/progression.php'; if (count(economy_catalog()['items']) < 3) throw new RuntimeException('Missing catalog'); echo \"Packaged economy catalog check passed.\\n\";");
run([join(packageRoot, 'check.php')]);
