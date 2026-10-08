// Promotes the "[Unreleased]" section of CHANGELOG.md to the version in package.json.
// Runs from the npm `version` lifecycle hook (see the release:* scripts), so the
// updated changelog lands inside the release commit.
const fs = require('node:fs');
const path = require('node:path');

const UNRELEASED = '## [Unreleased]';

/** Locates the [Unreleased] section and fails if there is nothing to release. */
function readUnreleased(text) {
  const start = text.indexOf(UNRELEASED);
  if (start === -1) {
    throw new Error('CHANGELOG.md has no "## [Unreleased]" section');
  }

  const bodyStart = start + UNRELEASED.length;
  const nextSection = text.indexOf('\n## [', bodyStart);
  const bodyEnd = nextSection === -1 ? text.length : nextSection + 1;
  const body = text.slice(bodyStart, bodyEnd).trim();

  if (!/^\s*[-*] /m.test(body)) {
    throw new Error('Nothing under [Unreleased]: describe the changes before releasing');
  }
  return { start, bodyEnd, body };
}

function promoteUnreleased(text, version, date) {
  const { start, bodyEnd, body } = readUnreleased(text);
  if (text.includes(`## [${version}]`)) {
    throw new Error(`Version ${version} is already in CHANGELOG.md`);
  }

  const promoted =
    text.slice(0, start) +
    `${UNRELEASED}\n\n## [${version}] - ${date}\n\n${body}\n\n` +
    text.slice(bodyEnd);
  return promoted.replace(/\n+$/, '\n');
}

module.exports = { promoteUnreleased, readUnreleased, UNRELEASED };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const file = path.join(root, 'CHANGELOG.md');
  const date = new Date().toISOString().slice(0, 10);

  try {
    // `--check` runs in `preversion`, i.e. BEFORE npm bumps package.json, so a
    // release that cannot succeed never leaves a half-bumped working tree behind.
    if (process.argv.includes('--check')) {
      readUnreleased(fs.readFileSync(file, 'utf8'));
      console.log('CHANGELOG.md: [Unreleased] has entries, ready to release');
      process.exit(0);
    }
    fs.writeFileSync(file, promoteUnreleased(fs.readFileSync(file, 'utf8'), version, date));
    console.log(`CHANGELOG.md: [Unreleased] -> [${version}] - ${date}`);
  } catch (error) {
    console.error(`Release aborted: ${error.message}`);
    process.exit(1);
  }
}
