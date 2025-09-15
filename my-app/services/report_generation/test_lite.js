// In your main server or calling script...
import { generateLiteAccessibilityReport } from './pdf-generator-lite.js';
import path from 'path';

// --- Your variables ---
const jsonReportPath = '../server/report-curemd-com-1757853492952-lite.json';
const userEmail = 'jane.doe@example.com';
const baseReportsDir = '../server'; // The main directory for all reports

// 1. Construct the full path for this user's report folder
const userSpecificOutputDir = path.join(baseReportsDir, `${userEmail}_lite`);
// This creates a path like: '../server/jane.doe@example.com_lite'

try {
    // 2. Pass the full directory path to the function
    const result = await generateLiteAccessibilityReport(jsonReportPath, userSpecificOutputDir);
    
    console.log('✅ Report generated successfully!');
    console.log(`Final path: ${result.reportPath}`);

} catch (error) {
    console.error('❌ Failed to generate report:', error);
}