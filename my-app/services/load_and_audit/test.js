// test-audit.js
import { runLighthouseAudit } from './audit.js';

async function main() {
  console.log('--- TEST 1: RUNNING A SUCCESSFUL AUDIT ---');
  const successOptions = {
    url: 'https://curemd.com',
    device: 'desktop',
    format: 'json',
  };

  const successResult = await runLighthouseAudit(successOptions);

  if (successResult.success) {
    console.log(`\n✅ SUCCESS: Audit completed. Report saved at: ${successResult.reportPath}`);
  } else {
    console.error(`\n❌ FAILED: Audit did not complete. Reason: ${successResult.error}`);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  console.log('--- TEST 2: RUNNING A FAILED AUDIT (INVALID URL) ---');
  const failureOptions = {
    url: 'https://thissitedoesnotexist12345.com',
    device: 'desktop',
    format: 'json',
  };

  const failureResult = await runLighthouseAudit(failureOptions);
  
  if (failureResult.success) {
    console.log(`\n✅ SUCCESS: Audit completed. Report saved at: ${failureResult.reportPath}`);
  } else {
    console.error(`\n❌ FAILED: Audit did not complete as expected. Reason: ${failureResult.error}`);
  }
}

main();