# e2e-to-k6 POC

This repository contains a proof-of-concept that captures browser network traffic with Cypress, fakerizes sensitive values, and replays traces in k6 for load testing.

Prerequisites
- Node 18+
- k6

Quick start

1. Install dependencies:

```pwsh
npm install
```

2. Run server
```pwsh
npm run start:test-server 
```
2. Run Cypress to capture a trace (this will create `out/network-log.json`):

```pwsh
npm run cypress:open
# then run the capture test or use `npm run cypress:run` to run headless
```
> run this on a different terminal than the one used to run the server.

3. Generate fakerized traces:

```pwsh
npm run generate:traces
```

4. Run k6:

```pwsh
npm run test:k6:local
```

Notes
- The capture script captures fetch and XHR requests and records headers and bodies when available. Do not capture production secrets.
- The k6 replay approximates browser timing via sleeps between requests. For authenticated flows, either inject tokens or perform a login step in k6.

Mapping fixture
----------------
This POC centralizes the placeholder tokens and faker mapping in `cypress/fixtures/mapping.json`.

- The keys are the placeholder tokens that the Cypress test will type (for example `__FIRST_NAME__`).
- The values are faker method paths (for example `person.firstName`).

Edit `cypress/fixtures/mapping.json` to change which tokens are typed by the Cypress test and how they should be fakerized when generating traces.

Example `cypress/fixtures/mapping.json`:

```json
{
	"__FIRST_NAME__": "person.firstName",
	"__LAST_NAME__": "person.lastName",
	"__EMAIL__": "internet.email"
}
```

Limitations & next steps
-------------------------
- The fakerizer performs global string replacements; consider the ability to identify elements returned by in a response body being used in a next request body
- For authenticated scenarios, add a login step in the k6 script or inject per-VU tokens.

To scale the run (more VUs / more iterations) edit the top of `k6-script.js` or run k6 directly with CLI options. Example running with 10 VUs and 100 iterations total:

```pwsh
k6 run --vus 10 --iterations 100 k6-script.js
```
