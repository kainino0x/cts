import * as fs from 'fs';
import * as process from 'process';

import { DefaultTestFileLoader } from '../framework/file_loader.js';
import { Ordering, compareQueries } from '../framework/query/compare.js';
import { parseQuery } from '../framework/query/parseQuery.js';
import { TestQuery, TestQueryMultiFile } from '../framework/query/query.js';

function usage(rc: number): void {
  console.error('Usage:');
  console.error('  tools/checklist FILE');
  console.error('  tools/checklist my/list.txt');
  process.exit(rc);
}

if (process.argv.length !== 3) {
  usage(process.argv.length === 2 ? 0 : 1);
}

function die(message: string): void {
  console.log(message);
  process.exit(1);
}

(async () => {
  console.log('Loading queries...');

  const filename = process.argv[2];
  const lines = (await fs.promises.readFile(filename, 'utf8')).split('\n');
  const allQueries = lines.filter(l => l).map(l => parseQuery(l.trim()));

  const queriesBySuite = new Map<string, Array<{ query: TestQuery; count: number }>>();
  for (const query of allQueries) {
    let suiteQueries = queriesBySuite.get(query.suite);
    if (suiteQueries === undefined) {
      suiteQueries = [];
      queriesBySuite.set(query.suite, suiteQueries);
    }

    suiteQueries.push({ query, count: 0 });
  }

  console.log('  Found suites: ' + Array.from(queriesBySuite.keys()).join(' '));

  const loader = new DefaultTestFileLoader();
  for (const [suite, queries] of queriesBySuite.entries()) {
    console.log(`Suite "${suite}"...`);
    const testcases = Array.from(await loader.loadCases(new TestQueryMultiFile(suite, [])));
    console.log(`  Found ${testcases.length} cases.`);

    console.log(`  Checking overlaps between ${queries.length} queries...`);
    for (const { query: q1 } of queries) {
      for (const { query: q2 } of queries) {
        if (q1 !== q2 && compareQueries(q1, q2) !== Ordering.Unordered) {
          die(`  Overlapping queries in list:\n    ${q1}\n    ${q2}`);
        }
      }
    }
    console.log('  Checking against suite contents...');

    caseloop: for (const testcase of testcases) {
      for (const q of queries) {
        const comparison = compareQueries(q.query, testcase.query);
        if (comparison === Ordering.StrictSuperset || comparison === Ordering.Equal) {
          // TODO: this isn't REALLY what I wanted. I want to match readmes and empty test files too.
          q.count++;
          continue caseloop;
        }
      }
      die(`  No query found for case: ${testcase.query}`);
    }

    console.log("  Checking for queries that didn't match any cases...");
    for (const { query, count } of queries) {
      if (count === 0) {
        console.log(`    ${query}`);
      }
    }
  }
})();
