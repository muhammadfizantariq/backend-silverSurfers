import { generateSeniorAccessibilityReport } from './pdf_generator.js';

// Test the PDF generator with folder creation and proper naming
async function testPDFGenerator() {
    const options = {
        inputFile: '../load_and_audit/report-curemd-com-1757764239485.json',
        clientEmail: 'john.doe@example.com', // This will become the folder name
        imagePaths: {
            'text-font-audit': '../drawing_boxes/highlighted-text-font.png',
            'interactive-color-audit': '../drawing_boxes/highlighted-interactive-color.png',
            'layout-brittle-audit': '../drawing_boxes/highlighted-layout-brittle.png',
            'color-contrast': '../drawing_boxes/highlighted-color-contrast.png',
            'target-size': '../drawing_boxes/highlighted-target-size.png'
        }
    };

    try {
        console.log('Starting PDF generation...');
        console.log('Client Email:', options.clientEmail);
        console.log('Input file:', options.inputFile);
        
        const result = await generateSeniorAccessibilityReport(options);
        
        if (result.success) {
            console.log('\n=== PDF Generation Successful ===');
            console.log('Message:', result.message);
            console.log('Report saved to:', result.reportPath);
            console.log('Client folder:', result.clientFolder);
            console.log('File name:', result.fileName);
            console.log('Form factor:', result.formFactor);
            console.log('Website URL:', result.url);
            console.log('Accessibility score:', result.score);
            
            // This is what you'd send back to your calling server/script
            console.log('\n=== Response for calling server ===');
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.error('PDF generation failed:', result.error);
        }
    } catch (error) {
        console.error('Error during PDF generation:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testPDFGenerator();