const { fakerizeFile } = require('./fakerizeNetworkLog');
const path = require('path');
const fs = require('fs');

// Load mapping from Cypress fixtures
const mappingPath = path.join('cypress', 'fixtures', 'mapping.json');
let mapping = { '__FIRST_NAME__': 'person.firstName', '__EMAIL__': 'internet.email' };
if (fs.existsSync(mappingPath)) {
	mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
}

// Simple helper that reads out/network-log.json and writes out/network-log-fakerized.json
// By default we do not seed faker here so output varies per run. Pass --seed <n> to generate deterministic replacements.
fakerizeFile({ inputPath: path.join('out', 'network-log.json'), outputPath: path.join('out', 'network-log-fakerized.json'), mapping });
console.log('Generated fakerized traces at out/network-log-fakerized.json');
