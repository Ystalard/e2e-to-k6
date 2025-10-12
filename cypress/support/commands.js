import 'cypress-file-upload';

Cypress.Commands.add('startFilteredCapture', (options = {}) => {
  const hostRegex = options.hostRegex || /https?:\/\//i;
  const maxBodyLength = options.maxBodyLength || 10000;

  cy.window({ log: false }).then((win) => {
    win.__capturedRequests__ = [];

    function normalizeHeaders(headers) {
      const out = {};
      try {
        if (!headers) return out;
        if (typeof headers.forEach === 'function') {
          headers.forEach((v, k) => out[k] = v);
        } else if (typeof headers === 'object') {
          Object.entries(headers).forEach(([k, v]) => out[k] = v);
        }
      } catch (e) {
        // ignore
      }
      return out;
    }

    function pushIfMatches(entry) {
      try {
        if (!entry || !entry.url) return;
        if (hostRegex.test(entry.url)) {
          if (entry.requestBody && entry.requestBody.length > maxBodyLength) {
            entry.requestBody = entry.requestBody.slice(0, maxBodyLength) + '...[truncated]';
          }
          if (entry.responseBody && entry.responseBody.length > maxBodyLength) {
            entry.responseBody = entry.responseBody.slice(0, maxBodyLength) + '...[truncated]';
          }
          win.__capturedRequests__.push(entry);
        }
      } catch (e) {
        // ignore
      }
    }

    // Patch fetch
    if (!win.__fetchPatched__) {
      const originalFetch = win.fetch;
      win.fetch = function(resource, init) {
        const start = Date.now();
        const url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
        const method = (init && init.method) || (resource && resource.method) || 'GET';
        let requestBody = init && init.body ? init.body : null;
        let requestHeaders = {};
        try {
          if (init && init.headers) requestHeaders = normalizeHeaders(init.headers);
          if (resource && resource.headers) requestHeaders = Object.assign({}, requestHeaders, normalizeHeaders(resource.headers));
        } catch (e) {}

        return originalFetch(resource, init).then((res) => {
          const end = Date.now();
          res.clone().text().catch(() => null).then((bodyText) => {
            pushIfMatches({ type: 'fetch', url, method, requestBody, responseBody: bodyText, status: res.status, start, end, duration: end - start, timestamp: new Date(start).toISOString(), requestHeaders, responseHeaders: normalizeHeaders(res.headers) });
          });
          return res;
        }).catch((err) => {
          const end = Date.now();
          pushIfMatches({ type: 'fetch', url, method, requestBody, responseBody: null, status: 0, start, end, duration: end - start, timestamp: new Date(start).toISOString(), requestHeaders, responseHeaders: {} });
          throw err;
        });
      };
      win.__fetchPatched__ = true;
    }

    // Patch XHR
    if (!win.__xhrPatched__) {
      const OriginalXHR = win.XMLHttpRequest;
      function PatchedXHR() {
        const xhr = new OriginalXHR();
        let start, _url = '', _method = 'GET', _requestBody = null;
        const _requestHeaders = {};

        const origOpen = xhr.open;
        xhr.open = function(method, url) {
          _method = method;
          _url = url;
          return origOpen.apply(xhr, arguments);
        };

        const origSetRequestHeader = xhr.setRequestHeader;
        xhr.setRequestHeader = function(name, value) {
          _requestHeaders[name] = value;
          return origSetRequestHeader.apply(xhr, arguments);
        };

        const origSend = xhr.send;
        xhr.send = function(body) {
          _requestBody = body;
          start = Date.now();
          xhr.addEventListener('loadend', () => {
            const end = Date.now();
            pushIfMatches({ type: 'xhr', url: _url, method: _method, requestBody: _requestBody, responseBody: xhr.responseText, status: xhr.status, start, end, duration: end - start, timestamp: new Date(start).toISOString(), requestHeaders: _requestHeaders, responseHeaders: {} });
          });
          return origSend.apply(xhr, arguments);
        };

        return xhr;
      }
      win.XMLHttpRequest = PatchedXHR;
      win.__xhrPatched__ = true;
    }
  });
});
