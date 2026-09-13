import { access, cp, mkdir } from 'node:fs/promises';

await mkdir('dist/api', { recursive: true });
await mkdir('dist/bin', { recursive: true });
await mkdir('dist/src', { recursive: true });
await cp('server/api/index.php', 'dist/api/index.php');
await cp('server/bin/provision_standard_accounts.php', 'dist/bin/provision_standard_accounts.php');
await cp('server/bin/create_user.php', 'dist/bin/create_user.php');
await cp('server/bin/create_test_student.php', 'dist/bin/create_test_student.php');
await cp('server/bin/check_reset.php', 'dist/bin/check_reset.php');
await cp('server/src/reset_mission.php', 'dist/src/reset_mission.php');
await cp('server/src/bootstrap.php', 'dist/src/bootstrap.php');
await cp('server/config.example.php', 'dist/config.example.php');
await cp('server/.htaccess', 'dist/.htaccess');

await mkdir('dist/shared', { recursive: true });
await cp('shared/economy.json', 'dist/shared/economy.json');
await cp('server/src/progression.php', 'dist/src/progression.php');
await cp('server/src/training.php', 'dist/src/training.php');
await cp('server/src/teacher_balances.php', 'dist/src/teacher_balances.php');
await cp('server/src/robot_training.php', 'dist/src/robot_training.php');
await cp('server/bin/check_economy.php', 'dist/bin/check_economy.php');

await access('dist/src/training.php');

console.log('Deployment package ready in dist/ (static frontend + PHP API).');
