# e2e-to-k6 POC

This repository contains a proof-of-concept that captures browser network traffic with Cypress, fakerizes sensitive values, and replays traces in k6 for load testing.

Prerequisites
- Node 18+
- Docker (for running k6 in the container)

Quick start

1. Install dependencies:

```pwsh
npm install
```

2. Run Cypress to capture a trace (this will create `out/network-log.json`):

```pwsh
npm run cypress:open
# then run the capture test or use `npm run cypress:run` to run headless
```

3. Generate fakerized traces:

```pwsh
npm run generate:traces
```

4. Run k6 (Docker is used in the script):

```pwsh
npm run test:k6

Local end-to-end POC
--------------------
To run the full POC locally (serve the test page, capture with Cypress, fakerize, replay):

1. Start the local test server (serves `test-site/form.html` and receives submissions):

```pwsh
npm run start:test-server
```

2. In another shell, run the Cypress capture test (this will create `out/network-log.json`):

```pwsh
npm run cypress:run
```

Or run the helper that starts the server and runs Cypress for you:

```pwsh
npm run poc:local
```

Run entire POC in Docker (recommended to isolate your machine)
-----------------------------------------------------------
If you have Docker and docker-compose installed you can run the whole flow (server -> cypress -> fakerizer -> k6) in containers:

```pwsh
docker-compose up --build
```

This will build/start the server, run Cypress tests, generate fakerized traces, then run k6 to replay the traces. Artifacts will be written into the repo-mounted folders.
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

Running the full flow (PowerShell)
----------------------------------
1) Install dependencies:

```pwsh
npm install
```

2) Capture a trace with Cypress (creates `out/network-log.json`):

```pwsh
npm run cypress:open
# or headless
npm run cypress:run
```

3) Generate fakerized traces (reads `cypress/fixtures/mapping.json`):

```pwsh
npm run generate:traces
```

4) Run k6 using Docker (the script mounts the workspace into the container):

```pwsh
npm run test:k6
```

CI
--
The provided `azure-pipelines.yml` runs `npm install`, generates traces, and runs k6 in Docker. It also publishes the `out` directory as a pipeline artifact.

Limitations & next steps
-------------------------
- The fakerizer performs global string replacements; consider a path-aware replacer to avoid accidental changes in URLs or IDs.
- For authenticated scenarios, add a login step in the k6 script or inject per-VU tokens.
- Be cautious: replaying POSTs/PUTs may create resources on the target system. Use a test environment.

Installing k6 on Windows (PowerShell)
------------------------------------

If you want to run the k6 script locally on Windows, install k6 using one of these methods in an elevated PowerShell prompt:

- With Chocolatey (recommended):

```pwsh
choco install k6
```

- Or with Scoop:

```pwsh
scoop install k6
```

Verify the install with:

```pwsh
k6 version
```

Then run the local test:

```pwsh
npm run test:k6:local
```

Running k6 with custom BASE_URL and scaling
------------------------------------------

The `k6-script.js` resolves relative URLs (those starting with `/`) against the `BASE_URL` environment variable. By default it uses `http://localhost:3000`.

Set `BASE_URL` and run the test (PowerShell):

```pwsh
$env:BASE_URL='http://localhost:3000'
npm run test:k6:local
```

To scale the run (more VUs / more iterations) edit the top of `k6-script.js` or run k6 directly with CLI options. Example running with 10 VUs and 100 iterations total:

```pwsh
k6 run --vus 10 --iterations 100 k6-script.js
```

Note on per-VU tokens and trace assignment
- The script assigns each VU a trace from the fakerized `out/network-log-fakerized.json` using the VU index. Each VU also receives a per-VU `__AUTH_TOKEN__` replacement (e.g. `token-vu-1`) so you can distinguish VUs during the replay. If you want different behavior (random trace selection, per-VU seeding, etc.) edit the `default` function in `k6-script.js`.

Azure DevOps: configuring environment approvals and secrets
---------------------------------------------------------

1. Create an environment named `load-testing` in Azure DevOps:
	- In Azure DevOps, go to Pipelines -> Environments -> New environment.
	- Name it `load-testing` to match the `environment` set in `azure-pipelines.yml`.

2. Configure approvals / checks for the environment:
	- In the environment settings add an approval check (single or multiple approvers).
	- This causes the LoadTest stage to pause and require manual approval before running.

3. Add secrets/variables securely:
	- In Pipelines -> Library or the pipeline's Variables section, add secret variables (for example `MY_SECRET_TOKEN`) and mark them secret.
	- Alternatively, link an Azure Key Vault and reference secrets by name in the pipeline.

4. Reference secrets in the YAML:
	- Use pipeline variables like `$(MY_SECRET_TOKEN)` in scripts or pass them into containers via environment variables.
	- Do not commit secrets into the repo or YAML.

Example: pass a token into the LoadTest Docker run (configure `MY_SECRET_TOKEN` as a secret variable):

```pwsh
docker run --rm -v $(System.DefaultWorkingDirectory):/scripts -w /scripts -e AUTH_TOKEN=$(MY_SECRET_TOKEN) grafana/k6 run k6-script.js --env BASE_URL=$(BASE_URL)
```

This README section gives basic guidance; consult Azure DevOps docs for organization-wide policy on approvals and secret management.

