import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const source = new URL('../data/sight-completion.ts', import.meta.url);
const compiled = ts.transpileModule(readFileSync(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled)(createRequire(source), module, module.exports);
const { isCollectionPlaceCompleted } = module.exports;
const place = { id: 'ny', name: 'New York', state: 'New York', countryId: 'US' };

test('state visits accept abbreviations, ISO subdivisions, and full names', () => {
  for (const subcountry of ['NY', 'US-NY', ' New   York ']) {
    assert.equal(isCollectionPlaceCompleted('usa', place, [], [{ subcountry, countryCode: 'US', country: '' }]), true);
  }
});
test('a state visit does not complete its sights or foreign places with the same name', () => {
  const visits = [{ subcountry: 'NY', countryCode: 'US', country: 'United States' }];
  assert.equal(isCollectionPlaceCompleted('parks', { ...place, name: 'Central Park' }, [], visits), false);
  assert.equal(isCollectionPlaceCompleted('usa', { ...place, countryId: 'CA' }, [], visits), false);
});
test('explicit completions still work without location metadata', () => {
  assert.equal(isCollectionPlaceCompleted('usa', { id: 'ny' }, ['collection-usa-ny'], []), true);
});
