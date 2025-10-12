// This support file is the entrypoint for Cypress tests and will load custom commands
import './commands';

// Prevent tests from failing on cross-origin 'Script error.' which we can't
// reliably debug from Cypress. Return false to let the test continue.
Cypress.on('uncaught:exception', (err, runnable) => {
	try {
		const msg = (err && err.message) || '';
		if (msg && msg.toLowerCase().includes('script error')) {
			// ignore cross-origin script errors
			return false;
		}
	} catch (e) {
		// ignore
	}
	// don't ignore other errors
	return false;
});
