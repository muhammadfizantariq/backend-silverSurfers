import { InternalLinksExtractor } from './internal_links.js'; // Make sure this filename is correct

async function runTests() {
  console.log('--- SCENARIO 1: Successful Extraction ---');
  console.log('Testing with a reliable and simple site...\n');

  try {
    const extractorSuccess = new InternalLinksExtractor({
      maxLinks: 5, // Keep the number of links small for a quick test
      maxDepth: 1,
    });
    const successfulResult = await extractorSuccess.extractInternalLinks('http://books.toscrape.com/');
    
    console.log('\n✅ SUCCESS TEST COMPLETE. FINAL OUTPUT:');
    console.log(JSON.stringify(successfulResult, null, 2));
  } catch (error) {
    console.error('The success test threw an unexpected error:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n'); // Separator

  console.log('--- SCENARIO 2: Failed Extraction (Invalid URL) ---');
  console.log('Testing with a non-existent URL to check retry and failure logic...\n');

  try {
    const extractorFailure = new InternalLinksExtractor();
    const failedResult = await extractorFailure.extractInternalLinks('https://thissitedoesnotexist12345.com');
    
    console.log('\n❌ FAILURE TEST COMPLETE. FINAL OUTPUT:');
    console.log(JSON.stringify(failedResult, null, 2));
  } catch (error) {
    console.error('The failure test threw an unexpected error:', error);
  }
}

// Run the tests
runTests();