import { readFileSync } from 'fs';
import { join } from 'path';
import { generateFiles } from './snapshot/test-utils';

const pkg = require('../package.json');
const withVersion = `${pkg.name}@${pkg.version}`;
const withoutVersion = `${pkg.name}@{{version}}`;

describe('InterfaceFactory', () => {
  it('recreates a valid snapshot using the Engine', async () => {
    for await (const file of await generateFiles()) {
      const snapshot = readFileSync(join(...file.path)).toString();
      expect(file.contents).toStrictEqual(snapshot);
    }
  });
});
