describe('Local Test Form - Capture réseau', () => {
  it('submits the local form and captures requests', () => {
    cy.fixture('mapping.json').then((mapping) => {
      const nameToken = Object.keys(mapping).find(k => k.includes('FIRST')) || '__FIRST_NAME__';

      // Visit the local form and patch window before scripts run
      cy.visit('http://localhost:3000/form.html', {
        onBeforeLoad(win) {
          try { win.__capturedRequests__ = []; } catch (e) {}

          function normalizeHeaders(headers) {
            const out = {};
            try {
              if (!headers) return out;
              if (typeof headers.forEach === 'function') headers.forEach((v, k) => out[k] = v);
              else if (typeof headers === 'object') Object.entries(headers).forEach(([k, v]) => out[k] = v);
            } catch (e) {}
            return out;
          }

          function pushIfMatches(entry) {
            try {
              if (!entry || !entry.url) return;
              const url = String(entry.url || '');
              // treat absolute localhost OR relative paths as local
              if (url.includes('http://localhost:3000') || url.startsWith('/')) {
                win.__capturedRequests__.push(entry);
              }
            } catch (e) {}
          }

          // Patch fetch
          try {
            if (!win.__fetchPatched__) {
              const originalFetch = win.fetch;
              win.fetch = function(resource, init) {
                const start = Date.now();
                const url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
                const method = (init && init.method) || (resource && resource.method) || 'GET';
                const requestBody = init && init.body ? init.body : null;
                const requestHeaders = normalizeHeaders((init && init.headers) || (resource && resource.headers));

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
          } catch (e) {}

          // Patch XHR
          try {
            if (!win.__xhrPatched__) {
              const OriginalXHR = win.XMLHttpRequest;
              function PatchedXHR() {
                const xhr = new OriginalXHR();
                let start, _url = '', _method = 'GET', _requestBody = null;
                const _requestHeaders = {};

                const origOpen = xhr.open;
                xhr.open = function(method, url) { _method = method; _url = url; return origOpen.apply(xhr, arguments); };

                const origSetRequestHeader = xhr.setRequestHeader;
                xhr.setRequestHeader = function(name, value) { _requestHeaders[name] = value; return origSetRequestHeader.apply(xhr, arguments); };

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
          } catch (e) {}
        }
      });

      // Interact with the form
      cy.get('#name').type(nameToken);
      // file input available if needed
      // cy.get('#file').attachFile('test-image.png');
      cy.get('input[name="gender"][value="male"]').check({ force: true });
      cy.get('input[name="interests"][value="music"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      cy.wait(1000);

      // Save captured requests
      cy.window().then((win) => {
        const captured = win.__capturedRequests__ || [];
        captured.sort((a, b) => a.start - b.start);
        captured.forEach((e, i) => e.deltaFromPrevMs = i === 0 ? 0 : e.start - captured[i - 1].end);
        cy.task('saveNetworkLog', { filename: `network-log.json`, content: captured });
      });
    });
  });
});
