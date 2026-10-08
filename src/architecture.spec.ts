import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

/**
 * Executable version of the hexagonal rules in CLAUDE.md. If you add a feature and this
 * spec fails, the feature breaks the architecture: fix the code, not the spec.
 *
 *   domain          -> may import only other domain files and common/errors
 *   application     -> no infrastructure, controllers, DTOs, mongoose or express;
 *                      @nestjs/* limited to common and config
 *   infrastructure  -> no application, controllers or DTOs
 *   every Mongo repository has an in-memory twin (the degraded mode needs it)
 */
const SRC = __dirname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith('.ts') && !full.endsWith('.spec.ts') ? [full] : [];
  });
}

function importsOf(file: string): string[] {
  const code = readFileSync(file, 'utf8');
  return [...code.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map(
    (m) => m[1],
  );
}

const layerOf = (
  file: string,
): 'domain' | 'application' | 'infrastructure' | null => {
  const parts = relative(SRC, file).split(sep);
  return (
    (['domain', 'application', 'infrastructure'] as const).find((l) =>
      parts.includes(l),
    ) ?? null
  );
};

/** Resolves a relative import to a path relative to src, using forward slashes. */
const target = (file: string, spec: string): string =>
  relative(SRC, resolve(dirname(file), spec))
    .split(sep)
    .join('/');

const files = sourceFiles(SRC);
const inLayer = (layer: string) => files.filter((f) => layerOf(f) === layer);
const rel = (f: string) => relative(SRC, f).split(sep).join('/');

describe('hexagonal architecture', () => {
  it('finds the layers it is supposed to police', () => {
    expect(inLayer('domain').length).toBeGreaterThan(0);
    expect(inLayer('application').length).toBeGreaterThan(0);
    expect(inLayer('infrastructure').length).toBeGreaterThan(0);
  });

  it('domain depends on nothing but domain and domain errors', () => {
    const violations = inLayer('domain').flatMap((file) =>
      importsOf(file)
        .filter((spec) => {
          if (!spec.startsWith('.')) return true; // any package import is a leak
          const t = target(file, spec);
          return !(t.includes('/domain/') || t.startsWith('common/errors/'));
        })
        .map((spec) => `${rel(file)} imports "${spec}"`),
    );

    expect(violations).toEqual([]);
  });

  it('application never reaches into infrastructure, HTTP or the ORM', () => {
    const forbiddenPackages = [
      'mongoose',
      '@nestjs/mongoose',
      'express',
      '@nestjs/swagger',
    ];
    const allowedNest = ['@nestjs/common', '@nestjs/config'];

    const violations = inLayer('application').flatMap((file) =>
      importsOf(file).flatMap((spec) => {
        if (spec.startsWith('.')) {
          const t = target(file, spec);
          const bad =
            t.includes('/infrastructure/') ||
            t.includes('/dto/') ||
            t.endsWith('.controller');
          return bad ? [`${rel(file)} imports "${spec}"`] : [];
        }
        const bad =
          forbiddenPackages.includes(spec) ||
          (spec.startsWith('@nestjs/') && !allowedNest.includes(spec));
        return bad ? [`${rel(file)} imports "${spec}"`] : [];
      }),
    );

    expect(violations).toEqual([]);
  });

  it('infrastructure never depends on application, controllers or DTOs', () => {
    const violations = inLayer('infrastructure').flatMap((file) =>
      importsOf(file)
        .filter((spec) => {
          if (!spec.startsWith('.')) return false;
          const t = target(file, spec);
          return (
            t.includes('/application/') ||
            t.includes('/dto/') ||
            t.endsWith('.controller')
          );
        })
        .map((spec) => `${rel(file)} imports "${spec}"`),
    );

    expect(violations).toEqual([]);
  });

  it('every Mongo repository has an in-memory twin, so the degraded mode keeps working', () => {
    const mongoRepos = inLayer('infrastructure').filter(
      (f) =>
        f.endsWith('.repository.ts') && !f.endsWith('.memory.repository.ts'),
    );
    const names = new Set(files.map((f) => rel(f)));

    const missing = mongoRepos
      .map((f) => rel(f).replace(/\.repository\.ts$/, '.memory.repository.ts'))
      .filter((twin) => !names.has(twin));

    expect(mongoRepos.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  it('every port has its adapter named after it', () => {
    // movie.repository.port.ts -> a repository in the same module's infrastructure
    const ports = files.filter((f) => f.endsWith('.repository.port.ts'));

    const missing = ports
      .filter((port) => {
        const moduleDir = dirname(dirname(port));
        const stem = basename(port).replace('.repository.port.ts', '');
        return !files.some(
          (f) =>
            f.startsWith(join(moduleDir, 'infrastructure')) &&
            basename(f) === `${stem}.repository.ts`,
        );
      })
      .map(rel);

    expect(ports.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});
