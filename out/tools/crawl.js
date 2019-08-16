/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/

// Node can look at the filesystem, but JS in the browser can't.
// This crawls the file tree under src/suites/${suite} to generate a (non-hierarchical) static
// listing file that can then be used in the browser to load the modules containing the tests.
import fg from 'fast-glob';
import * as fs from 'fs';
import * as path from 'path';
const specSuffix = '.spec.ts';
export async function crawl(suite) {
  const specDir = 'src/suites/' + suite;

  if (!fs.existsSync(specDir)) {
    console.error(`Could not find ${specDir}`);
    process.exit(1);
  }

  const specFiles = await fg(specDir + '/**/*' + specSuffix, {
    onlyFiles: true
  });
  specFiles.sort();
  const groups = [];

  for (const file of specFiles) {
    const f = file.substring((specDir + '/').length);

    if (f.endsWith(specSuffix)) {
      const testPath = f.substring(0, f.length - specSuffix.length);
      const filename = `../../${specDir}/${testPath}.spec.js`;
      const mod = await import(filename);

      if (mod.description === undefined) {
        throw new Error('Test spec file missing description: ' + filename);
      }

      if (mod.g === undefined) {
        throw new Error('Test spec file missing TestGroup definition: ' + filename);
      }

      groups.push({
        path: testPath,
        description: mod.description.trim()
      });
    } else if (path.basename(file) === 'README.txt') {
      const group = f.substring(0, f.length - 'README.txt'.length);
      const description = fs.readFileSync(file, 'utf8').trim();
      groups.push({
        path: group,
        description
      });
    } else {
      console.error('Unrecognized file: ' + file);
      process.exit(1);
    }
  }

  return groups;
}
export function makeListing(filename) {
  const suite = path.basename(path.dirname(filename));
  return crawl(suite);
}
//# sourceMappingURL=crawl.js.map