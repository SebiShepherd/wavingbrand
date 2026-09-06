/**
 * A workflow that does not parse runs nothing, and says so quietly.
 *
 * `pull_request` was written without its colon. GitHub accepted the push, made
 * a run, and failed it in the same second with no job and no log worth reading;
 * the run's name fell back to the file path, which is the only visible symptom.
 * Every gate in this repository was skipped and the branch looked checked.
 *
 * That is the worst failure mode a file can have here, because it disables the
 * things that would otherwise catch a mistake. So the workflows are parsed
 * before they are pushed.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse } from 'yaml';
import { report } from './lib.mjs';

const dir = fileURLToPath(new URL('../.github/workflows/', import.meta.url));

export default function check() {
  const fail = [];
  const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
  if (files.length === 0) fail.push('no workflows found, which is not a state this repository should be in');
  for (const file of files) {
    let doc;
    try {
      doc = parse(readFileSync(join(dir, file), 'utf8'));
    } catch (error) {
      fail.push(`${file}: ${error.message.split('\n')[0]}`);
      continue;
    }
    // `on` is the YAML 1.1 boolean true, which is why it is read both ways.
    const on = doc?.on ?? doc?.[true];
    if (!doc || typeof doc !== 'object') fail.push(`${file}: parses to ${typeof doc}, not a workflow`);
    else if (!on) fail.push(`${file}: has no triggers, so it never runs`);
    else if (!doc.jobs || Object.keys(doc.jobs).length === 0) fail.push(`${file}: has no jobs`);
    else
      for (const [name, job] of Object.entries(doc.jobs))
        if (!job?.['runs-on']) fail.push(`${file}: job "${name}" has no runs-on`);
  }
  return report(`every workflow parses and has a trigger and a job (${files.length})`, fail);
}
