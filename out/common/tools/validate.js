/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/import * as process from 'process';import { crawl } from './crawl.js';

function usage(rc) {
  console.error(`Usage: tools/validate [options] [SUITE_DIRS...]

For each suite in SUITE_DIRS, validate some properties about the file:
- It has a .description and .g
- That each test:
  - Has a test function (or is marked unimplemented)
  - Has no duplicate cases
  - Configures batching correctly, if used
- That each case query is not too long

Example:
  tools/validate src/unittests src/webgpu

Options:
  --help                     Print this message and exit.
  --print-metadata-warnings  Print non-fatal warnings about listing_meta.json files to stderr.
  --print-case-count-report  Print the case/subcase counts of every test to stdout.
`);
  process.exit(rc);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  usage(0);
}
if (args.indexOf('--help') !== -1) {
  usage(0);
}

let printMetadataWarnings = false;
let printCaseCountReport = false;
const suiteDirs = [];
for (const arg of args) {
  switch (arg) {
    case '--print-metadata-warnings':
      printMetadataWarnings = true;
      break;
    case '--print-case-count-report':
      printCaseCountReport = true;
      break;
    default:
      suiteDirs.push(arg);
      break;
  }
}

if (suiteDirs.length === 0) {
  usage(0);
}

for (const suiteDir of suiteDirs) {
  void crawl(suiteDir, {
    validate: true,
    printMetadataWarnings,
    printCaseCountReport
  });
}
//# sourceMappingURL=validate.js.map