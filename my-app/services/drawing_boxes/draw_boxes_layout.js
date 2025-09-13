import fs from 'fs';
import sharp from 'sharp';

/**
 * Extracts box data from the layout-brittle-audit.
 */
function extractBoxData(lighthouseReport, auditId) {
    const boxes = [];
    const audit = lighthouseReport.audits[auditId];
    if (!audit?.details?.items) return boxes;

    for (const item of audit.details.items) {
        // --- CHANGE: Read coordinates from the correct location ---
        const rect = item.node?.boundingRect;

        if (rect) {
            boxes.push({
                rect: {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                },
                // --- CHANGE: Use a different color and get the text snippet ---
                color: 'blue',
                textSnippet: item.node?.nodeLabel || '',
            });
        }
    }
    return boxes;
}

async function enhanceAndHighlightMultiple(inputImagePath, outputImagePath, boundingBoxes, options = {}) {
    const { scaleFactor = 1, sharpenAmount = 1, boxThickness = 3 } = options;
    try {
        const image = sharp(inputImagePath);
        const metadata = await image.metadata();
        const newWidth = Math.round(metadata.width * scaleFactor);
        const newHeight = Math.round(metadata.height * scaleFactor);
        let processedImage = image.resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3 });
        if (sharpenAmount > 0) processedImage = processedImage.sharpen({ sigma: sharpenAmount * 0.5 });
        let svgElements = '';
        boundingBoxes.forEach((boxData, index) => {
            const rect = boxData.rect;
            const boxNumber = index + 1;
            const scaledX = Math.round(rect.left * scaleFactor);
            const scaledY = Math.round(rect.top * scaleFactor);
            const scaledWidth = Math.round(rect.width * scaleFactor);
            const scaledHeight = Math.round(rect.height * scaleFactor);
            const scaledThickness = Math.round((boxData.thickness || boxThickness) * scaleFactor);
            svgElements += `<rect x="${scaledX + 1}" y="${scaledY + 1}" width="${scaledWidth}" height="${scaledHeight}" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="${scaledThickness}" />`;
            svgElements += `<rect x="${scaledX}" y="${scaledY}" width="${scaledWidth}" height="${scaledHeight}" fill="none" stroke="${boxData.color}" stroke-width="${scaledThickness}" />`;
            const minSize = Math.round(8 * scaleFactor);
            const maxSize = Math.round(20 * scaleFactor);
            const idealSize = Math.round(scaledHeight * 0.8);
            const finalSize = Math.max(minSize, Math.min(idealSize, maxSize));
            const circleRadius = finalSize;
            const fontSize = Math.round(finalSize * 1.2);
            const circleCx = scaledX;
            const circleCy = scaledY;
            svgElements += `<circle cx="${circleCx}" cy="${circleCy}" r="${circleRadius + 1}" fill="rgba(0,0,0,0.5)" />`;
            svgElements += `<circle cx="${circleCx}" cy="${circleCy}" r="${circleRadius}" fill="${boxData.color}" />`;
            svgElements += `<text x="${circleCx}" y="${circleCy}" font-family="sans-serif" font-size="${fontSize}" fill="white" text-anchor="middle" dominant-baseline="central" font-weight="bold">${boxNumber}</text>`;
        });
        const svgOverlay = `<svg width="${newWidth}" height="${newHeight}">${svgElements}</svg>`;
        await processedImage.composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }]).png({ quality: 95, adaptiveFiltering: true }).toFile(outputImagePath);
    } catch (error) {
        console.error('❌ Error enhancing image:', error.message); throw error;
    }
}

export async function processLayoutBrittleAudit(jsonReportPath) {
    const AUDIT_ID = 'layout-brittle-audit';
    const outputImagePath = './highlighted-layout-brittle.png';

    console.log(`🔄 Reading report: ${jsonReportPath}`);
    let lighthouseReport;
    try {
        lighthouseReport = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));
    } catch (error) {
        console.error('❌ Error parsing JSON report:', error.message); 
        return;
    }
    const screenshotData = lighthouseReport.fullPageScreenshot?.screenshot?.data;
    if (!screenshotData) {
        console.error('❌ Error: Report does not contain a full-page screenshot'); 
        return;
    }
    const tempScreenshotPath = './temp_screenshot_layout.png';
    fs.writeFileSync(tempScreenshotPath, Buffer.from(screenshotData.split(',').pop(), 'base64'));

    console.log(`🔎 Extracting data for audit: "${AUDIT_ID}"`);
    const finalBoxes = extractBoxData(lighthouseReport, AUDIT_ID);

    if (finalBoxes.length === 0) {
        console.log('✅ No elements with fixed heights found for this audit.');
        fs.unlinkSync(tempScreenshotPath);
        return;
    }

    console.log('\n📦 Legend for Highlighted Layout Boxes:');
    const tableData = finalBoxes.map((box, index) => ({
        'Box #': index + 1,
        'Text Snippet': (box.textSnippet || '').replace(/\s+/g, ' ').trim(),
    }));
    console.table(tableData);

    console.log(`\n🎨 Drawing ${finalBoxes.length} boxes on screenshot...`);
    await enhanceAndHighlightMultiple(tempScreenshotPath, outputImagePath, finalBoxes);

    fs.unlinkSync(tempScreenshotPath);
    console.log(`\n✅ Success! Image saved to: ${outputImagePath}`);
}