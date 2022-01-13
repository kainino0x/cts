# Developing

The WebGPU CTS is written in TypeScript.

## Setup

After checking out the repository and installing node/npm, run:

```sh
npm ci
```

Before uploading, you can run pre-submit checks (`npm test`) to make sure it will pass CI.
Use `npm run fix` to fix linting issues.

`npm run` will show available npm scripts.
Some more scripts can be listed using `npx grunt`.

## Dev Server

To start the development server, use:

```sh
npm start
```

Then, browse to the standalone test runner at the printed URL.

The server will generate and compile code on the fly, so no build step is necessary.
Only a reload is needed to see saved changes.
(TODO: except, currently, `README.txt` and file `description` changes won't be reflected in
the standalone runner.)

Note: The first load of a test suite may take some time as generating the test suite listing can
take a few seconds.

## Standalone Test Runner / Test Plan Viewer

**The standalone test runner also serves as a test plan viewer.**
(This can be done in a browser without WebGPU support.)
You can use this to preview how your test plan will appear.

You can view different suites (webgpu, unittests, stress, etc.) or different subtrees of
the test suite.

- `http://localhost:8080/standalone/` (defaults to `?runnow=0&worker=0&debug=0&q=webgpu:*`)
- `http://localhost:8080/standalone/?q=unittests:*`
- `http://localhost:8080/standalone/?q=unittests:basic:*`

The following url parameters change how the harness runs:

- `runnow=1` runs all matching tests on page load.
- `debug=1` enables verbose debug logging from tests.
- `worker=1` runs the tests on a Web Worker instead of the main thread.

## Editor

Since this project is written in TypeScript, it integrates best with
[Visual Studio Code](https://code.visualstudio.com/).
This is optional, but highly recommended: it automatically adds `import` lines and
provides robust completions, cross-references, renames, error highlighting,
deprecation highlighting, and type/JSDoc popups.

Open the `cts.code-workspace` workspace file to load settings convienient for this project.
You can make local configuration changes in `.vscode/`, which is untracked by Git.

## Pull Requests

When opening a pull request, fill out the PR checklist and attach the issue number.
If an issue hasn't been opened, find the draft issue on the
[project tracker](https://github.com/orgs/gpuweb/projects/3) and choose "Convert to issue":

![convert to issue button screenshot](data:image/png;base64,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)

Opening a pull request will automatically notify reviewers.

To make the review process smoother, once a reviewer has started looking at your change:

- Avoid major additions or changes that would be best done in a follow-up PR.
- Avoid rebases (`git rebase`) and force pushes (`git push -f`). These can make
  it difficult for reviewers to review incremental changes as GitHub often cannot
  view a useful diff across a rebase. If it's necessary to resolve conflicts
  with upstream changes, use a merge commit (`git merge`) and don't include any
  consequential changes in the merge, so a reviewer can skip over merge commits
  when working through the individual commits in the PR.
- When you address a review comment, mark the thread as "Resolved".

Pull requests will (usually) be landed with the "Squash and merge" option.

### TODOs

The word "TODO" refers to missing test coverage. It may only appear inside file/test descriptions
and README files (enforced by linting).

To use comments to refer to TODOs inside the description, use a backreference, e.g., in the
description, `TODO: Also test the FROBNICATE usage flag [1]`, and somewhere in the code, `[1]:
Need to add FROBNICATE to this list.`.

Use `MAINTENANCE_TODO` for TODOs which don't impact test coverage.
