import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Single source of truth for the version: package.json (bumped with `npm run release:*`).
 * Resolves from both `src/` (tests) and `dist/` (production), since each sits one level
 * below the project root.
 */
export const APP_VERSION: string = (
  JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
    version: string;
  }
).version;
