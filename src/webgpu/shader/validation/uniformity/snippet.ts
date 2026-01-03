export const description = 'Utilities for generating code snippets for uniformity tests';

import { assert, unreachable } from '../../../../common/util/util.js';

export type Verdict =
  // sensitive: fail uniformity analysis if and only if
  //  - the condition is non-uniform, and
  //  - the operation requires uniformity
  | 'sensitive'

  // forbid: fail uniformity analysis if and only if
  //  - the operation requires uniformity
  | 'forbid'

  // permit: always passes uniformity analysis
  | 'permit';

export function compileShouldSucceed({
  requires_uniformity,
  condition_is_uniform,
  verdict,
}: {
  requires_uniformity: boolean;
  condition_is_uniform: boolean;
  verdict: Verdict;
}): boolean {
  switch (verdict) {
    case 'sensitive':
      return !requires_uniformity || condition_is_uniform;
    case 'forbid':
      return !requires_uniformity;
    case 'permit':
      return true;
  }
}

export type Snippet = {
  // A unique name for the case.
  name: string;
  // A WGSL code sippet that optionally embeds items to replaced later:
  //   - '<op>', an operation that does or does not require uniformity.
  //   - '<cond>', a condition which will be uniform or non-uniform
  code: string;
  // What is the verdict for this code snippet, after substitution of
  // the operation and condition.
  verdict: Verdict;
};

// We use a small domain-specific language that converts a
// string into a code snippet.
//
// NOTE: If you're confused about this scheme, see the unit tests
// in src/unittests/uniformity_snippet.spec.ts.  Run them
// with `npm run unittest`.
//
// We process the name from left to right
// using the following component naming scheme:
//  <kind-of-loop>, always appears first
//    'loop'
//    'for', for-loop with without a condition
//    'for-unif', for-loop with a uniform loop condition
//    'for-nonunif', for-loop with a non-uniform loop condition
//    'while-unif', while-loop with uniform loop condition
//    'while-nonunif', while-loop with non-uniform loop condition
// The next components are listed in order they appear in the code.
//  <interrupt> :
//    always-break, cond-break,
//    always-return, cond-return,
//    always-continue, cond-continue,
//    The 'cond' variations will use a condition, either uniform
//    or non-uniform, to be substituted later.
//  'unif-break': a loop break with uniform loop condition, used
//    to avoid rejection due to infinite loop checks.
//  'op':
//  'continuing': indicates start of continuing block
//  'end': indicates end of the loop

type LoopKind = 'loop' | 'for' | 'for-unif' | 'for-nonunif' | 'while-unif' | 'while-nonunif';

// Expand a loop case spec to its shader code
export function specToCode(spec: string): string {
  let matches = spec.match('^(loop|for-unif|for-nonunif|for|while-unif|while-nonunif)-(.*)');
  assert(matches !== null, `invalid spec string: ${spec}`);

  let prefix = '  ';
  const parts = [];
  const end_parts = [prefix, '}\n']; // closing brace

  const kind = matches[1] as LoopKind;
  let rest = matches[2];
  parts.push(prefix);
  switch (kind) {
    case 'loop':
      parts.push('loop {');
      break;
    case 'for':
      parts.push('for (;;) {');
      break;
    case 'for-unif':
      parts.push(`for (;<uniform_cond>;) {`);
      break;
    case 'for-nonunif':
      parts.push(`for (;<nonuniform_cond>;) {`);
      break;
    case 'while-unif':
      parts.push(`while (<uniform_cond>) {`);
      break;
    case 'while-nonunif':
      parts.push(`while (<nonuniform_cond>) {`);
      break;
  }
  parts.push('\n');

  let in_continuing = false;
  prefix = '    ';
  while (rest.length > 0) {
    const current_len = rest.length;
    matches = rest.match(
      '^(op|continuing|end|unif-break|always-break|cond-break|unif-break|always-return|cond-return|always-continue|cond-continue)(-|$)(.*)'
    );
    assert(matches !== null, `invalid spec string: ${spec}`);
    const elem = matches[1];
    rest = matches[3];
    assert(rest.length < current_len, `pattern is not shrinking: '${rest}', from ${spec}`);
    switch (elem) {
      case 'op':
        parts.push(prefix, '<op>\n'); // to be replaced later.
        break;
      case 'end': // end the loop
        if (in_continuing) {
          prefix = '    ';
        }
        prefix = '  ';
        parts.push(...end_parts);
        end_parts.length = 0;
        in_continuing = false;
        break;
      case 'continuing':
        parts.push(prefix, 'continuing {\n');
        end_parts.unshift(prefix, '}\n');
        in_continuing = true;
        prefix = '      ';
        break;
      case 'unif-break':
        assert(!in_continuing);
        parts.push(prefix, `if <uniform_cond> {break;}\n`);
        break;
      case 'always-break':
        assert(!in_continuing);
        parts.push(prefix, 'break;\n');
        break;
      case 'cond-break':
        if (in_continuing) {
          parts.push(prefix, `break if <cond>;\n`);
        } else {
          parts.push(prefix, `if <cond> {break;}\n`);
        }
        break;
      case 'always-return':
        assert(!in_continuing);
        parts.push(prefix, 'return;\n');
        break;
      case 'cond-return':
        assert(!in_continuing);
        parts.push(prefix, `if <cond> {return;}\n`);
        break;
      case 'always-continue':
        assert(!in_continuing);
        parts.push(prefix, 'continue;\n');
        break;
      case 'cond-continue':
        assert(!in_continuing);
        parts.push(prefix, `if <cond> {continue;}\n`);
        break;
      default:
        unreachable(`invalid loop case spec ${spec}`);
    }
  }
  parts.push(...end_parts);
  return parts.join('');
}

// Creates a Snippet from a loop spec string and a verdict.
export function LoopCase(spec: string, verdict: Verdict): Snippet {
  return { name: spec, verdict, code: specToCode(spec) };
}
