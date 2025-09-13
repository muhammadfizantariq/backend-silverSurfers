import fs from 'fs';
import sharp from 'sharp';

// This function checks if a box area has actual visual content.
async function isVisuallyDistinct(imagePath, rect) {
    try {
        if (rect.width < 2 || rect.height < 2) return false;
        const region = await sharp(imagePath)
            .extract({ left: Math.floor(rect.left), top: Math.floor(rect.top), width: Math.ceil(rect.width), height: Math.ceil(rect.height) })
            .stats();
        const VISIBILITY_THRESHOLD = 5;
        return region.channels.some(c => c.stdev > VISIBILITY_THRESHOLD);
    } catch (error) {
        console.warn(`⚠️  Could not analyze region for box at (${rect.left}, ${rect.top}).`);
        return false;
    }
}

// --- NEW: Absolute filter based on your rule ---
// If a box contains another, the outer (containing) box is removed.
function filterContainingBoxes(boxes) {
    const indicesToRemove = new Set();
    for (let i = 0; i < boxes.length; i++) {
        for (let j = 0; j < boxes.length; j++) {
            if (i === j) continue;

            const boxA = boxes[i].rect; // Potential container
            const boxB = boxes[j].rect; // Potential contained box

            const contains = boxA.left <= boxB.left &&
                boxA.top <= boxB.top &&
                (boxA.left + boxA.width) >= (boxB.left + boxB.width) &&
                (boxA.top + boxA.height) >= (boxB.top + boxB.height);

            // If A contains B and is strictly larger, mark A for removal.
            if (contains && (boxA.width > boxB.width || boxA.height > boxB.height)) {
                indicesToRemove.add(i);
            }
        }
    }

    const kept = [];
    const removed = [];
    boxes.forEach((box, index) => {
        if (indicesToRemove.has(index)) {
            removed.push(box);
        } else {
            kept.push(box);
        }
    });
    return { kept, removed };
}

function extractBoxData(lighthouseReport, auditId) {
    const boxes = [];
    const audit = lighthouseReport.audits[auditId];
    if (!audit?.details?.items) return boxes;
    for (const item of audit.details.items) {
        if (item.rect) {
            boxes.push({
                rect: { left: item.rect.left, top: item.rect.top, width: item.rect.width, height: item.rect.height },
                color: 'red',
                textSnippet: item.textSnippet,
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

export async function processTextFontAudit(jsonReportPath) {
    const AUDIT_ID = 'text-font-audit';
    const outputImagePath = './highlighted-text-font.png';
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
        console.error('❌ Error: Report does not contain a full-page screenshot.'); 
        return;
    }
    const tempScreenshotPath = './temp_screenshot_for_boxing.png';
    fs.writeFileSync(tempScreenshotPath, Buffer.from(screenshotData.split(',').pop(), 'base64'));

    console.log(`🔎 Extracting data for audit: "${AUDIT_ID}"`);
    const allBoxes = extractBoxData(lighthouseReport, AUDIT_ID);

    // --- UPDATED LOGIC ---
    // 1. Apply the absolute container filter. No merging is performed.
    const { kept: nonContainerBoxes, removed: containerBoxes } = filterContainingBoxes(allBoxes);

    // 2. Filter out any remaining boxes that are on empty space.
    const finalBoxes = [];
    const visuallyEmptyBoxes = [];
    for (const box of nonContainerBoxes) {
        if (await isVisuallyDistinct(tempScreenshotPath, box.rect)) {
            finalBoxes.push(box);
        } else {
            visuallyEmptyBoxes.push(box);
        }
    }
    // --- END UPDATED LOGIC ---

    if (containerBoxes.length > 0) {
        console.log('\n🗑️ Skipped Container Boxes (per your rule):');
        console.table(containerBoxes.map(box => ({ Text: (box.textSnippet || '').replace(/\s+/g, ' ').trim() })));
    }
    if (visuallyEmptyBoxes.length > 0) {
        console.log('\n🗑️ Skipped Visually Empty Boxes:');
        console.table(visuallyEmptyBoxes.map(box => ({ Text: (box.textSnippet || '').replace(/\s+/g, ' ').trim() })));
    }

    if (finalBoxes.length === 0) {
        console.log('\nℹ️ No elements left to highlight after filtering. No image will be generated.');
        fs.unlinkSync(tempScreenshotPath);
        return;
    }

    console.log('\n📦 Legend for Highlighted Boxes:');
    const tableData = finalBoxes.map((box, index) => ({
        'Box #': index + 1,
        'Text Snippet': (box.textSnippet || '').replace(/\s+/g, ' ').trim(),
    }));
    console.table(tableData);

    console.log(`\n🎨 Drawing ${finalBoxes.length} final boxes on screenshot...`);
    await enhanceAndHighlightMultiple(tempScreenshotPath, outputImagePath, finalBoxes);

    fs.unlinkSync(tempScreenshotPath);
    console.log(`\n✅ Success! Image saved to: ${outputImagePath}`);
}