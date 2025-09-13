import fs from 'fs';
import sharp from 'sharp';

async function isVisuallyDistinct(imagePathOrBuffer, rect) {
    try {
        if (rect.width < 2 || rect.height < 2) return false;
        const region = await sharp(imagePathOrBuffer)
            .extract({ left: Math.floor(rect.left), top: Math.floor(rect.top), width: Math.ceil(rect.width), height: Math.ceil(rect.height) })
            .stats();
        const VISIBILITY_THRESHOLD = 5;
        return region.channels.some(c => c.stdev > VISIBILITY_THRESHOLD);
    } catch (error) {
        console.warn(`⚠️  Could not analyze region for box at (${rect.left}, ${rect.top}).`);
        return false;
    }
}

/**
 * Extracts box data from the standard Lighthouse 'color-contrast' audit.
 * @param {object} lighthouseReport The full Lighthouse report object.
 * @param {string} auditId The ID of the audit to extract from.
 * @returns {Array<object>}
 */
function extractBoxData(lighthouseReport, auditId) {
    const boxes = [];
    const audit = lighthouseReport.audits[auditId];
    if (!audit?.details?.items) return boxes;

    for (const item of audit.details.items) {
        // The node object contains all the element details
        const node = item.node;
        if (node?.boundingRect) {
            boxes.push({
                rect: node.boundingRect,
                nodeLabel: node.nodeLabel,
                selector: node.selector,
                explanation: item.explanation,
            });
        }
    }
    return boxes;
}

/**
 * Draws the final image with numbered boxes.
 * @param {string | Buffer} imageBuffer The image to draw on.
 * @param {string} outputImagePath Where to save the final image.
 * @param {Array<object>} boundingBoxes The list of boxes to draw.
 * @param {object} options Drawing options.
 */
async function enhanceAndHighlight(imageBuffer, outputImagePath, boundingBoxes, options = {}) {
    const { boxColor = 'red' } = options;
    try {
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        const { width, height } = metadata;

        let svgElements = '';
        boundingBoxes.forEach((boxData, index) => {
            const rect = boxData.rect;
            const boxNumber = index + 1;

            const svgRect = `<rect x="${rect.left}" y="${rect.top}" width="${rect.width}" height="${rect.height}" fill="none" stroke="${boxColor}" stroke-width="3" />`;
            const svgShadowRect = `<rect x="${rect.left + 1}" y="${rect.top + 1}" width="${rect.width}" height="${rect.height}" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="3" />`;

            const idealSize = Math.max(10, Math.min(rect.height * 0.8, 20));
            const circleRadius = idealSize;
            const fontSize = Math.round(idealSize * 1.2);
            const circleCx = rect.left;
            const circleCy = rect.top;

            const svgCircleShadow = `<circle cx="${circleCx}" cy="${circleCy}" r="${circleRadius + 1}" fill="rgba(0,0,0,0.5)" />`;
            const svgCircle = `<circle cx="${circleCx}" cy="${circleCy}" r="${circleRadius}" fill="${boxColor}" />`;
            const svgText = `<text x="${circleCx}" y="${circleCy}" font-family="sans-serif" font-size="${fontSize}" fill="white" text-anchor="middle" dominant-baseline="central" font-weight="bold">${boxNumber}</text>`;

            svgElements += svgShadowRect + svgRect + svgCircleShadow + svgCircle + svgText;
        });

        const svgOverlay = `<svg width="${width}" height="${height}">${svgElements}</svg>`;
        await image
            .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
            .toFile(outputImagePath);

    } catch (error) {
        console.error('❌ Error enhancing image:', error.message); throw error;
    }
}

export async function processColorContrastAudit(jsonReportPath) {
    const AUDIT_ID = 'color-contrast';
    const outputImagePath = './highlighted-color-contrast.png';

    console.log(`🔄 Reading report: ${jsonReportPath}`);
    const lighthouseReport = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));

    const screenshotData = lighthouseReport.fullPageScreenshot?.screenshot?.data;
    if (!screenshotData) {
        console.error('❌ Error: Report does not contain a full-page screenshot.'); 
        return;
    }
    const screenshotBuffer = Buffer.from(screenshotData.split(',').pop(), 'base64');

    console.log(`🔎 Extracting data for audit: "${AUDIT_ID}"`);
    const allBoxes = extractBoxData(lighthouseReport, AUDIT_ID);

    // Filter out any elements that aren't actually visible in the screenshot
    const finalBoxes = [];
    for (const box of allBoxes) {
        if (await isVisuallyDistinct(screenshotBuffer, box.rect)) {
            finalBoxes.push(box);
        }
    }

    if (finalBoxes.length === 0) {
        console.log(`\n✅ No color contrast issues found. No image will be generated.`);
        return;
    }

    console.log('\n📦 Legend for Highlighted Contrast Issues:');
    const tableData = finalBoxes.map((box, index) => ({
        'Box #': index + 1,
        'Element': box.nodeLabel || box.selector,
        'Issue Details': box.explanation,
    }));
    console.table(tableData);

    console.log(`\n🎨 Drawing ${finalBoxes.length} boxes in yellow...`);
    await enhanceAndHighlight(screenshotBuffer, outputImagePath, finalBoxes, { boxColor: 'yellow' });

    console.log(`\n✅ Success! Image saved to: ${outputImagePath}`);
}