import { generateSeniorAccessibilityReport } from './pdf_generator.js';
import path from 'path';

// Convert absolute paths to proper format for Node.js
const baseInputPath = '../load_and_audit';
const baseImagePath = '../drawing_boxes';

async function testPDFGenerator() {
    const options = {
        inputFile: path.resolve(baseInputPath, 'report-curemd-com-1757764239485.json'),
        outputFile: './SilverSurfers.pdf',
        imagePaths: {
            'text-font-audit': path.resolve(baseImagePath, 'highlighted-text-font.png'),
            'interactive-color-audit': path.resolve(baseImagePath, 'highlighted-interactive-color.png'),
            'layout-brittle-audit': path.resolve(baseImagePath, 'highlighted-layout-brittle.png'),
            'color-contrast': path.resolve(baseImagePath, 'highlighted-color-contrast.png'),
            'target-size': path.resolve(baseImagePath, 'highlighted-target-size.png')
        }
    };

    try {
        console.log('Resolved paths:', options);
        const resultPath = await generateSeniorAccessibilityReport(options);
        console.log(`PDF report generated successfully: ${resultPath}`);
    } catch (error) {
        console.error('Error generating PDF report:', error.message);
        console.error('Stack:', error.stack);
    }
}

testPDFGenerator();