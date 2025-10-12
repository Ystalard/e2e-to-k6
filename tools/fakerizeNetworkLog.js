#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');
const minimist = require('minimist');

function callFakerMethod(methodPath) {
  return methodPath.split('.').reduce((acc, part) => acc[part], faker)();
}

function generateReplacements(mapping, seed) {
  if (typeof seed !== 'undefined' && seed !== null) {
    faker.seed(seed);
  }
  const replacements = {};
  let i = 0;
  for (const [k, m] of Object.entries(mapping)) {
    const method = typeof m === 'string' ? m : m.method;
    try {
      replacements[k] = callFakerMethod(method);
    } catch (e) {
      replacements[k] = String(m || '');
    }
    i++;
  }
  return replacements;
}

function applyReplacements(obj, replacements) {
  if (typeof obj === 'string') {
    return Object.entries(replacements).reduce((s, [k, v]) => s.split(k).join(v), obj);
  }
  if (Array.isArray(obj)) return obj.map(v => applyReplacements(v, replacements));
  if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, applyReplacements(v, replacements)]));
  }
  return obj;
}

function fakerizeFile({ inputPath, outputPath, mapping, seed }) {
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  // We expect raw to be an array of requests — wrap into a single trace
  const replacements = generateReplacements(mapping, seed);
  const transformedRequests = raw.map(req => applyReplacements(req, replacements));

  const out = {
    traces: [
      {
        trace: transformedRequests,
        replacements
      }
    ]
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
}

if (require.main === module) {
  const argv = minimist(process.argv.slice(2));
  const input = argv._[0] || 'out/network-log.json';
  const output = argv._[1] || 'out/network-log-fakerized.json';
  const mapping = argv.mapping ? JSON.parse(argv.mapping) : { '__FIRST_NAME__': 'person.firstName', '__EMAIL__': 'internet.email', '__LAST_NAME__': 'person.lastName' };
  const seed = argv.seed ? Number(argv.seed) : 1234;
  fakerizeFile({ inputPath: input, outputPath: output, mapping, seed });
}

module.exports = { fakerizeFile };
