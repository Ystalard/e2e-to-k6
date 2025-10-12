const { spawn } = require('child_process');
const path = require('path');

const server = spawn(process.execPath, [path.join(__dirname, '..', 'test-site', 'server.js')], { stdio: 'inherit' });

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Give server a second to start then run Cypress
setTimeout(() => {
  const cypress = spawn('npx', ['cypress', 'run'], { stdio: 'inherit', shell: true });
  cypress.on('exit', (code) => {
    server.kill();
    process.exit(code);
  });
}, 1000);
