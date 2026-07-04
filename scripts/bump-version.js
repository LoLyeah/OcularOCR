const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionFilePath = path.join(__dirname, '..', 'version.json');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const envLocalPath = path.join(__dirname, '..', '.env.local');

// Helper to run shell commands
function runCmd(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    console.error(`Failed to run command: ${cmd}`, err);
    return null;
  }
}

function main() {
  if (!fs.existsSync(versionFilePath)) {
    console.error('version.json not found. Creating a default one.');
    fs.writeFileSync(versionFilePath, JSON.stringify({ major: 0, minor: 1, patch: 0, lastCommit: '' }, null, 2));
  }

  const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
  let currentCommit = runCmd('git rev-parse HEAD');

  if (!currentCommit) {
    console.warn('Could not retrieve current git commit hash. Skipping auto-version bump.');
    writeEnvFile(versionData);
    return;
  }

  const lastCommit = versionData.lastCommit;

  // If there is no last commit recorded, initialize it and don't bump yet.
  if (!lastCommit) {
    console.log('No lastCommit found in version.json. Setting current commit and keeping version.');
    versionData.lastCommit = currentCommit;
    fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
    writeEnvFile(versionData);
    syncPackageJson(versionData);
    return;
  }

  if (lastCommit === currentCommit) {
    console.log('No new commits detected. Version remains:', getVersionString(versionData));
    writeEnvFile(versionData);
    return;
  }

  // Get files changed between last bump commit and current commit
  const diffOutput = runCmd(`git diff --name-only ${lastCommit} ${currentCommit}`);
  if (!diffOutput) {
    console.log('No file changes detected between commits. Version remains:', getVersionString(versionData));
    versionData.lastCommit = currentCommit;
    fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
    writeEnvFile(versionData);
    return;
  }

  const changedFiles = diffOutput.split('\n').filter(Boolean);
  console.log(`Changed files since last build (${lastCommit.substring(0, 7)} -> ${currentCommit.substring(0, 7)}):`, changedFiles);

  let coreChanged = false;
  let otherChanged = false;

  for (const file of changedFiles) {
    if (
      file.startsWith('components/') ||
      file.startsWith('lib/') ||
      file.startsWith('hooks/') ||
      file === 'app/page.tsx' ||
      file === 'app/layout.tsx'
    ) {
      coreChanged = true;
      break;
    } else {
      // Ignore version.json, package.json, package-lock.json, .env.local changes to prevent infinite loops
      if (
        file !== 'version.json' &&
        file !== 'package.json' &&
        file !== 'package-lock.json' &&
        file !== '.env.local'
      ) {
        otherChanged = true;
      }
    }
  }

  let bumped = false;
  if (coreChanged) {
    versionData.patch += 1;
    bumped = true;
    console.log('Core files changed. Bumped patch version.');
  } else if (otherChanged) {
    versionData.patch += 1;
    bumped = true;
    console.log('Non-core files changed. Bumped patch (y) version.');
  }

  versionData.lastCommit = currentCommit;
  fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));

  const newVersion = getVersionString(versionData);
  if (bumped) {
    console.log(`Version bumped to: ${newVersion}`);
    syncPackageJson(versionData);
  } else {
    console.log(`No relevant file changes. Version remains: ${newVersion}`);
  }

  writeEnvFile(versionData);
}

function getVersionString(data) {
  return `${data.major}.${data.minor}.${data.patch}`;
}

function writeEnvFile(data) {
  const versionStr = getVersionString(data);
  let envContent = '';

  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf8');
  }

  const varName = 'NEXT_PUBLIC_APP_VERSION';
  const lineToAdd = `${varName}=${versionStr}`;

  if (envContent.includes(varName)) {
    // Replace existing value
    const regex = new RegExp(`^${varName}=.*$`, 'm');
    envContent = envContent.replace(regex, lineToAdd);
  } else {
    // Append to file
    envContent += (envContent.endsWith('\n') || envContent === '' ? '' : '\n') + lineToAdd + '\n';
  }

  fs.writeFileSync(envLocalPath, envContent);
  console.log(`Updated ${envLocalPath} with version ${versionStr}`);
}

function syncPackageJson(data) {
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const versionStr = getVersionString(data);
      if (packageJson.version !== versionStr) {
        packageJson.version = versionStr;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        console.log(`Synced package.json version to ${versionStr}`);
      }
    } catch (err) {
      console.error('Failed to sync version with package.json:', err);
    }
  }
}

main();
