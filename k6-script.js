import http from 'k6/http';
import { sleep, check } from 'k6';
import { SharedArray } from 'k6/data';

const raw = new SharedArray('traces', function() {
  return JSON.parse(open('out/network-log-fakerized.json')).traces;
});

function replaceTokens(str, replacements) {
  if (!str || typeof str !== 'string') return str;
  return Object.entries(replacements || {}).reduce((s, [k, v]) => s.split(k).join(v), str);
}

function replay(trace, replacements) {
  for (const req of trace) {
    sleep((req.deltaFromPrevMs || 0) / 1000);

    let url = replaceTokens(req.url, replacements);
    // if URL is relative (starts with /), prefix with BASE_URL env or default localhost
    if (typeof url === 'string' && url.startsWith('/')) {
      const base = (__ENV.BASE_URL && __ENV.BASE_URL.length) ? __ENV.BASE_URL : 'http://localhost:3000';
      // remove trailing slash on base
      url = base.replace(/\/$/, '') + url;
    }
    const body = req.requestBody ? replaceTokens(req.requestBody, replacements) : null;
    const headers = req.requestHeaders || req.requestHeaders || req.requestHeaders || {};
    const h = {};
    for (const [k, v] of Object.entries(headers || {})) {
      h[k] = replaceTokens(v, replacements);
    }

    const params = { headers: h };
    const method = (req.method || 'GET').toUpperCase();

    let res;
    try {
      res = http.request(method, url, body, params);
    } catch (e) {
      // mark as failed via check
      check({ status: 0 }, { 'request succeeded': r => r.status >= 200 && r.status < 300 });
      continue;
    }

    check(res, { 'status is 2xx': (r) => r.status >= 200 && r.status < 300 });
  }
}

export default function () {
  const vuIndex = (__VU - 1) % raw.length;
  const traceObj = raw[vuIndex];
  const trace = traceObj.trace || [];
  const replacements = Object.assign({}, traceObj.replacements || {});
  // avoid mutating the SharedArray's objects (they are not extensible)
  replacements['__AUTH_TOKEN__'] = `token-vu-${__VU}`;
  replay(trace, replacements);
}
