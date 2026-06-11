const requiredMajor = 22;
const currentVersion = process.versions.node;
const currentMajor = Number.parseInt(currentVersion.split('.')[0] ?? '', 10);

if (currentMajor !== requiredMajor) {
  console.error(
    [
      `Node.js ${requiredMajor} is required for this workspace.`,
      `Current Node.js version: ${currentVersion}`,
      '',
      'Use one of:',
      '  nvm use',
      '  nvm install 22 && nvm use 22',
      '',
      'Then rerun the command.',
    ].join('\n'),
  );
  process.exit(1);
}
