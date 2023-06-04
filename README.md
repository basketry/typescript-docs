[![main](https://github.com/basketry/typescript-docs/workflows/build/badge.svg?branch=main&event=push)](https://github.com/basketry/typescript-docs/actions?query=workflow%3Abuild+branch%3Amain+event%3Apush)
[![typescript-docs](https://img.shields.io/npm/v/@basketry/typescript-docs)](https://www.npmjs.com/package/@basketry/typescript-docs)

# Sorbet Docs

[Basketry generator](https://github.com/basketry) for documenting services that have a [Typescript](https://typescriptlang.org/) language target. This parser can be coupled with any Basketry parser. It is recommended to use this generator alongside the [`@basketry/typescript`](https://github.com/basketry/typescript) generator.

## Quick Start

The following example converts a "Swagger" doc into [Typescript](https://typescriptlang.org/) types:

1. Save `https://petstore.swagger.io/v2/swagger.json` as `petstore.json` in the root of your project.
1. Install packages: `npm install -g basketry @basketry/swagger-2 @basketry/typescript @basketry/typescript-docs`
1. Generate code: `basketry --source petstore.json --parser @basketry/swagger-2 --generators @basketry/typescript @basketry/typescript-docs --output src`

When the last step is run, basketry will parse the source file (`petstore.json`) using the specified parser (`@basketry/swagger-2`) and then run each specified generator writing the output folder (`src`).

## Folder Structure

TODO!!!!!!!!!!!!

## Options

TODO!!!!!!!!!!!!

---

## For contributors:

### Run this project

1.  Install packages: `npm ci`
1.  Build the code: `npm run build`
1.  Run it! `npm start`

Note that the `lint` script is run prior to `build`. Auto-fixable linting or formatting errors may be fixed by running `npm run fix`.

### Create and run tests

1.  Add tests by creating files with the `.test.ts` suffix
1.  Run the tests: `npm t`
1.  Test coverage can be viewed at `/coverage/lcov-report/index.html`

### Publish a new package version

1. Create new version
   1. Navigate to the [version workflow](https://github.com/basketry/typescript-docs/actions/workflows/version.yml) from the Actions tab.
   1. Manually dispatch the action with the appropriate inputs
   1. This will create a PR with the new version
1. Publish to NPM
   1. Review and merge the PR
   1. The [publish workflow](https://github.com/basketry/typescript-docs/actions/workflows/publish.yml) will create a git tag and publish the package on NPM

---

Generated with [generator-ts-console](https://www.npmjs.com/package/generator-ts-console)
