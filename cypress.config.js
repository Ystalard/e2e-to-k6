const { defineConfig } = require('cypress');
const fs = require('fs');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        saveNetworkLog({ filename, content }) {
          fs.mkdirSync('out', { recursive: true });
          fs.writeFileSync(`out/${filename}`, JSON.stringify(content, null, 2));
          return null;
        }
      });
    }
  }
});
