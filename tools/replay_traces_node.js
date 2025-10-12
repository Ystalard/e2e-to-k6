#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const args = process.argv.slice(2);
const traceFile = args[0] || path.join('out', 'network-log-fakerized.json');
const vus = Number(process.env.VUS || args[1] || 2);
const baseUrl = process.env.BASE_URL || args[2] || 'http://localhost:3000';

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function replaceTokens(s, replacements) {
  if (!s || typeof s !== 'string') return s;
  return Object.entries(replacements || {}).reduce((acc, [k, v]) => acc.split(k).join(v), s);
}

function buildOptions(req, replacements) {
  const url = new URL(replaceTokens(req.url, replacements), baseUrl);
  const headers = (req.requestHeaders || {});
  Object.keys(headers).forEach(k => headers[k] = replaceTokens(headers[k], replacements));
  return { url, method: req.method || req.method || req.method || 'GET', headers };
}

async function doRequest(req, replacements) {
  const opts = buildOptions(req, replacements);
  const body = req.requestBody ? replaceTokens(req.requestBody, replacements) : null;
  const lib = opts.url.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const r = lib.request(opts.url, { method: opts.method, headers: opts.headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode, body: text });
      });
    });
    r.on('error', (e) => {
      resolve({ error: e.message });
    });
    if (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) r.write(body);
      else r.write(JSON.stringify(body));
    }
    r.end();
  });
}

async function replayTrace(traceObj, vuIndex) {
  const trace = traceObj.trace || [];
  const replacements = traceObj.replacements || {};
  for (const req of trace) {
    await sleep(req.deltaFromPrevMs || 0);
    const res = await doRequest(req, replacements);
    console.log(`VU${vuIndex} -> ${req.method || 'GET'} ${req.url} => ${res.status || res.error || ''}`);
  }
}

(async () => {
  if (!fs.existsSync(traceFile)) {
    console.error('Trace file not found:', traceFile);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(traceFile, 'utf8'));
  const traces = raw.traces || [];
  if (!traces.length) {
    console.error('No traces found in', traceFile);
    process.exit(1);
  }

  const jobs = [];
  for (let i = 0; i < vus; i++) {
    const traceObj = traces[i % traces.length];
    jobs.push(replayTrace(traceObj, i + 1));
  }

  await Promise.all(jobs);
  console.log('All VUs finished');
})();
