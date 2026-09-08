# XServer publishing implementation plan

Goal: Publish the existing game through the configured SSH account with one local command, preserving live credentials and database records.

Architecture: A PowerShell command tests and builds locally, archives only an explicit list of deployable files, stages the archive outside public_html, checks PHP syntax, backs up the current app outside public_html, and copies assets before index.html. SSH prompts for the existing key passphrase. No database scripts execute automatically. This is a maintenance-time update, not an atomic release.

Tasks:
- Add the existing create_user.php CLI to the deployment package.
- Add deploy and deploy:preview commands; preview performs local validation without network changes.
- Exclude the user's SSH key directory from Git.
- Verify frontend tests, build, server contract, archive contents and PowerShell parsing.
- Document manual migrations and remote student creation.

Live deployment verification requires the user's interactive SSH passphrase and a subsequent browser check. Do not claim remote deployment from local validation.
