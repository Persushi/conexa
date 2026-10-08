import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_VERSION } from './version';

/* eslint-disable @typescript-eslint/no-require-imports */
const { promoteUnreleased } = require('../scripts/changelog.cjs') as {
  promoteUnreleased: (text: string, version: string, date: string) => string;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const sample = `# Changelog

## [Unreleased]

### Agregado
- Nueva cosa.

## [1.0.0] - 2026-01-01

### Agregado
- Primera versión.
`;

describe('changelog tooling', () => {
  describe('promoteUnreleased', () => {
    it('moves the pending entries under the new version and leaves [Unreleased] empty', () => {
      const result = promoteUnreleased(sample, '1.1.0', '2026-02-02');

      expect(result).toContain(
        '## [Unreleased]\n\n## [1.1.0] - 2026-02-02\n\n### Agregado\n- Nueva cosa.',
      );
      expect(result.indexOf('## [1.1.0]')).toBeLessThan(
        result.indexOf('## [1.0.0]'),
      );
      expect(result).toContain('- Primera versión.');
      expect(result.endsWith('\n')).toBe(true);
    });

    it('refuses to release when [Unreleased] has no entries', () => {
      const empty = sample.replace('### Agregado\n- Nueva cosa.\n\n', '');

      expect(() => promoteUnreleased(empty, '1.1.0', '2026-02-02')).toThrow(
        'Nothing under [Unreleased]',
      );
    });

    it('refuses to release a version that is already listed', () => {
      expect(() => promoteUnreleased(sample, '1.0.0', '2026-02-02')).toThrow(
        'already in CHANGELOG.md',
      );
    });

    it('fails clearly when the [Unreleased] section is missing', () => {
      expect(() =>
        promoteUnreleased('# Changelog\n', '1.1.0', '2026-02-02'),
      ).toThrow('no "## [Unreleased]"');
    });
  });

  describe('repository changelog', () => {
    const changelog = readFileSync(
      join(__dirname, '..', 'CHANGELOG.md'),
      'utf8',
    );

    it('keeps an [Unreleased] section', () => {
      expect(changelog).toContain('## [Unreleased]');
    });

    it('has an entry for the version in package.json, so version and changelog never drift apart', () => {
      expect(changelog).toMatch(
        new RegExp(
          `^## \\[${APP_VERSION.replace(/\./g, '\\.')}\\] - \\d{4}-\\d{2}-\\d{2}$`,
          'm',
        ),
      );
    });
  });
});
