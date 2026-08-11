import { cp, mkdir } from 'node:fs/promises';

await mkdir('dist/api', { recursive: true });
await mkdir('dist/bin', { recursive: true });
await mkdir('dist/src', { recursive: true });
await cp('server/api/index.php', 'dist/api/index.php');
await cp('server/bin/provision_standard_accounts.php', 'dist/bin/provision_standard_accounts.php');
await cp('server/src/bootstrap.php', 'dist/src/bootstrap.php');
await cp('server/config.example.php', 'dist/config.example.php');
await cp('server/.htaccess', 'dist/.htaccess');

console.log('Deployment package ready in dist/ (static frontend + PHP API).');
