/**
 * dist/ is what the build produced, not what somebody nudged.
 *
 * The whole point of parameters is that no file is drawn twice. A hand edit in
 * dist/ is a fork of the artwork that nothing else knows about, so it is caught
 * here rather than discovered on a business card.
 */
import { execFileSync } from 'node:child_process';
import { report } from './lib.mjs';

export default function check() {
  const root = new URL('../', import.meta.url).pathname;
  let out = '';
  try {
    execFileSync('node', ['src/build.mjs'], { cwd: root, stdio: 'pipe' });
    out = execFileSync('git', ['status', '--porcelain', '--', 'dist'], { cwd: root, encoding: 'utf8' });
  } catch (e) {
    return report('dist/ matches the build', [`build failed: ${e.message}`]);
  }
  const dirty = out.trim().split('\n').filter(Boolean);
  return report('dist/ matches the build', dirty.map((l) => `${l.trim()} differs from a fresh build`));
}
