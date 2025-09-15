import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import customConfig from '../load_and_audit/custom-config.js';

// Helper to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Elderly-focused audit information with expanded explanations and recommendations
const AUDIT_INFO = {
    'text-font-audit': {
        title: 'Text Size and Readability Analysis',
        category: 'Vision Accessibility',
        importance: 'Font size is critical for elderly users who often experience presbyopia. Text smaller than 16px can be extremely difficult to read, causing eye strain.',
        why: 'Age-related vision changes make small text nearly impossible to read. Seniors need larger fonts to browse websites comfortably.',
        recommendation: 'Ensure all body text is at least 16 pixels. Use relative units like "rem" to allow users to easily scale the font size in their browser settings.',
    },
    'color-contrast': {
        title: 'Color Contrast for Clear Vision',
        category: 'Vision Accessibility',
        importance: 'Adequate color contrast is essential for seniors whose vision may be affected by cataracts or macular degeneration, making text invisible.',
        why: 'Aging eyes require higher contrast to distinguish text from backgrounds. Without it, content becomes inaccessible.',
        recommendation: 'Aim for a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text to meet WCAG AA standards, ensuring readability for most users.',
    },
    'interactive-color-audit': {
        title: 'Interactive Elements Visual Clarity',
        category: 'Vision Accessibility',
        importance: 'Seniors need clear visual cues to identify clickable elements. Relying on color alone can make navigation impossible for those with color vision changes.',
        why: 'Reduced visual acuity makes it difficult to distinguish interactive elements without clear, multi-sensory indicators (e.g., underlines, icons).',
        recommendation: 'Do not rely on color alone to indicate interactivity. Combine color with other visual cues like underlines for links or bold font weight for buttons.',
    },
    'target-size': {
        title: 'Touch Target Size for Seniors',
        category: 'Motor Accessibility',
        importance: 'Seniors often experience tremors or arthritis. Small buttons and links are difficult to accurately tap, creating barriers to use.',
        why: 'Age-related motor changes require larger, well-spaced interactive elements. Small targets lead to frustration and prevent task completion.',
        recommendation: 'Ensure all buttons, links, and other interactive elements are at least 48x48 pixels. Provide ample spacing between targets to prevent accidental taps.',
    },
    'layout-brittle-audit': {
        title: 'Text Spacing Flexibility for Readability',
        category: 'Motor Accessibility',
        importance: 'Seniors often need to increase text spacing for better readability. Rigid layouts that break when text spacing is adjusted prevent this customization.',
        why: 'Many seniors require personalized text spacing to read comfortably. Inflexible layouts deny them this ability.',
        recommendation: 'Use flexible layout techniques (like CSS Flexbox or Grid) and avoid fixed heights on containers with text to ensure the layout adapts to user-adjusted text spacing.',
    },
    'heading-order': {
        title: 'Logical Content Structure',
        category: 'Cognitive Accessibility',
        importance: 'Proper heading hierarchy helps seniors understand content organization. A confusing structure increases cognitive load.',
        why: 'Clear information hierarchy reduces cognitive burden and helps seniors find and understand content without becoming overwhelmed.',
        recommendation: 'Structure content with a single H1 heading, followed by H2s for main sections, H3s for sub-sections, etc. Do not skip heading levels.',
    },
    'button-name': {
        title: 'Clear Button Labels',
        category: 'Cognitive Accessibility',
        importance: 'Seniors benefit from descriptive button names that clearly explain the resulting action. Vague labels like "Click here" create confusion.',
        why: 'Clear, descriptive labels help seniors understand website functionality and build confidence in their interactions.',
        recommendation: 'Button text should describe the action it will perform. For example, use "Submit Application" or "Download Report" instead of generic labels.',
    },
    'link-name': {
        title: 'Descriptive Link Text',
        category: 'Cognitive Accessibility',
        importance: 'Meaningful link text helps seniors understand where links will take them. Generic text like "Read more" creates uncertainty.',
        why: 'Descriptive links reduce confusion and help seniors navigate with confidence, understanding the purpose of each link.',
        recommendation: 'Link text should make sense out of context. Instead of a "click here" link, phrase it as "Read more about our senior services".',
    },
    'label': {
        title: 'Form Field Labels',
        category: 'Cognitive Accessibility',
        importance: 'Clear form labels are essential for seniors who may have difficulty understanding form purposes. Missing labels create confusion.',
        why: 'Proper labels help seniors complete forms successfully, reducing frustration and abandonment of important tasks.',
        recommendation: 'Every form input should have a clearly visible and programmatically associated <label> tag. Place labels above the input field for clarity.',
    },
    'largest-contentful-paint': {
        title: 'Page Loading Speed',
        category: 'Performance for Seniors',
        importance: 'Slow-loading pages can confuse seniors who may think the site is broken. Fast loading builds confidence.',
        why: 'Seniors may have less patience for slow technology and may abandon sites that don\'t load quickly.',
        recommendation: 'Optimize images, use a content delivery network (CDN), and minimize render-blocking scripts to ensure the main content loads in under 2.5 seconds.',
    },
    'cumulative-layout-shift': {
        title: 'Stable Page Layout',
        category: 'Performance for Seniors',
        importance: 'Pages that shift unexpectedly can confuse seniors and cause them to click wrong elements. Stable layouts provide predictable experiences.',
        why: 'Layout stability is crucial for seniors who need consistent, predictable interfaces.',
        recommendation: 'Specify dimensions for all images and ads to prevent content from shifting as it loads. Avoid inserting new content above existing content.',
    },
    'total-blocking-time': {
        title: 'Page Responsiveness',
        category: 'Performance for Seniors',
        importance: 'Unresponsive pages frustrate seniors who may interpret delays as system failures. Quick responsiveness builds trust.',
        why: 'Seniors need immediate feedback from interactions to feel confident that their actions are being processed.',
        recommendation: 'Break up long-running JavaScript tasks and minimize main-thread work to ensure the page responds to user input (like clicks) quickly.',
    },
    'is-on-https': {
        title: 'Secure Connection Protection',
        category: 'Security for Seniors',
        importance: 'HTTPS is crucial for protecting seniors who are often targets of online scams. It protects sensitive information from interception.',
        why: 'Seniors are frequently targeted by cybercriminals. Secure connections provide essential protection for their personal and financial information.',
        recommendation: 'The website should use a secure (HTTPS) connection on all pages to protect user data and build trust. This is indicated by a padlock icon in the browser\'s address bar.',
    },
    'geolocation-on-start': {
        title: 'Privacy-Respecting Location Requests',
        category: 'Security for Seniors',
        importance: 'Unexpected location requests can alarm seniors who may not understand why a website needs their location. Clear explanations build trust.',
        why: 'Seniors value privacy and may be suspicious of unexpected requests for personal information.',
        recommendation: 'Only request the user\'s location in response to a direct user action (e.g., clicking a "Find stores near me" button). Never ask on page load.',
    },
    'viewport': {
        title: 'Mobile-Friendly Design',
        category: 'Technical Accessibility',
        importance: 'Proper viewport configuration ensures content displays correctly on all devices, which is vital as many seniors use tablets or phones.',
        why: 'Responsive design helps seniors access content on their preferred devices without text being too small or requiring horizontal scrolling.',
        recommendation: 'Include the `<meta name="viewport" content="width=device-width, initial-scale=1">` tag in the `<head>` of all pages to ensure proper rendering on mobile devices.',
    },
    'dom-size': {
        title: 'Page Complexity Management',
        category: 'Technical Accessibility',
        importance: 'Overly complex pages can slow down assistive technologies and confuse seniors. Simpler pages load faster and are easier to navigate.',
        why: 'Seniors benefit from simpler, more focused page designs that don\'t overwhelm them with too many choices.',
        recommendation: 'Keep the number of DOM elements on a page below 1,500. Simplify the page structure where possible to improve performance and reduce complexity.',
    },
    'errors-in-console': {
        title: 'Technical Stability',
        category: 'Technical Accessibility',
        importance: 'JavaScript errors can break website functionality in unexpected ways, particularly affecting assistive technologies that seniors may rely on.',
        why: 'Elderly users often depend on assistive technologies, and technical errors can make websites completely unusable for them.',
        recommendation: 'Regularly check the browser\'s developer console for errors and fix them promptly to ensure a stable and reliable experience for all users.',
    },
    'font-size': {
        title: 'Overall Font Size Assessment',
        category: 'Vision Accessibility',
        importance: 'Consistent, readable font sizes ensure seniors can access all content without strain. Mixed small font sizes create accessibility barriers.',
        why: 'Predictable, large font sizes help elderly users read content comfortably and maintain their independence online.',
        recommendation: 'Audit the entire site to ensure no text (other than logos or decorative text) falls below a 16 pixel computed size.',
    }
};

const CATEGORY_COLORS = {
    'Vision Accessibility': { bg: '#E3F2FD', border: '#1976D2', text: '#0D47A1' },
    'Motor Accessibility': { bg: '#F3E5F5', border: '#7B1FA2', text: '#4A148C' },
    'Cognitive Accessibility': { bg: '#E8F5E8', border: '#388E3C', text: '#1B5E20' },
    'Performance for Seniors': { bg: '#FFF3E0', border: '#F57C00', text: '#E65100' },
    'Security for Seniors': { bg: '#FFEBEE', border: '#D32F2F', text: '#B71C1C' },
    'Technical Accessibility': { bg: '#F5F5F5', border: '#616161', text: '#212121' }
};

// Function to calculate the weighted "Senior Friendliness" score
function calculateSeniorFriendlinessScore(report) {
    const categoryId = 'senior-friendly';
    const categoryConfig = customConfig.categories[categoryId];
    if (!categoryConfig) {
        console.error(`Error: '${categoryId}' category not found in config.`);
        return { finalScore: 0, totalWeightedScore: 0, totalWeight: 0 };
    }

    const auditRefs = categoryConfig.auditRefs;
    const auditResults = report.audits;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const auditRef of auditRefs) {
        const { id, weight } = auditRef;
        const result = auditResults[id];
        const score = result ? (result.score ?? 0) : 0;
        totalWeightedScore += score * weight;
        totalWeight += weight;
    }

    if (totalWeight === 0) {
        return { finalScore: 0, totalWeightedScore: 0, totalWeight: 0 };
    }

    const finalScore = (totalWeightedScore / totalWeight) * 100;
    return { finalScore, totalWeightedScore, totalWeight };
}

class ElderlyAccessibilityPDFGenerator {
    constructor(options = {}) {
        this.imagePaths = options.imagePaths || {};
        this.doc = new PDFDocument({
            margin: 40,
            size: 'A4'
        });

        // Use default system fonts
        this.doc.registerFont('RegularFont', 'Helvetica');
        this.doc.registerFont('BoldFont', 'Helvetica-Bold');

        this.currentY = 40;
        this.pageWidth = 515; // Adjusted for margins
        this.margin = 40;
    }

    addPage() {
        this.doc.addPage();
        this.currentY = this.margin;
    }

    drawColorBar(category, y = null) {
        if (y !== null) this.currentY = y;
        const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['Technical Accessibility'];
        this.doc.rect(this.margin, this.currentY, this.pageWidth, 4).fill(colors.border);
        this.currentY += 10;
    }

    addTitle(text, fontSize = 28) {
        this.doc.fontSize(fontSize).font('BoldFont').fillColor('#2C3E50').text(text, this.margin, this.currentY, { width: this.pageWidth, align: 'center' });
        this.currentY += fontSize + 25;
    }

    addSectionHeader(text, category, fontSize = 20) {
        const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['Technical Accessibility'];
        this.doc.rect(this.margin, this.currentY, this.pageWidth, 35).fill(colors.bg);
        this.doc.rect(this.margin, this.currentY, this.pageWidth, 35).strokeColor(colors.border).lineWidth(2).stroke();
        this.doc.fontSize(fontSize).font('BoldFont').fillColor(colors.text).text(text, this.margin + 15, this.currentY + 10, { width: this.pageWidth - 30 });
        this.currentY += 50;
    }

    addHeading(text, fontSize = 16, color = '#34495E') {
        this.doc.fontSize(fontSize).font('BoldFont').fillColor(color).text(text, this.margin, this.currentY, { width: this.pageWidth });
        this.currentY += fontSize + 12;
    }

    addBodyText(text, fontSize = 11, color = '#2C3E50') {
        this.doc.fontSize(fontSize).font('RegularFont').fillColor(color).text(text, this.margin, this.currentY, { width: this.pageWidth, align: 'justify', lineGap: 3 });
        this.currentY += this.doc.heightOfString(text, { width: this.pageWidth, lineGap: 3 }) + 12;
    }

    addScoreBar(score, label) {
        const barWidth = 200;
        const barHeight = 20;
        const startX = this.margin;
        let scoreColor = '#E74C3C';
        let scoreText = 'Needs Improvement';
        if (score === null) {
            scoreColor = '#95A5A6';
            scoreText = 'Not Applicable';
        } else if (score === 1) {
            scoreColor = '#27AE60';
            scoreText = 'Excellent for Seniors';
        } else if (score > 0.8) {
            scoreColor = '#2ECC71';
            scoreText = 'Good for Seniors';
        } else if (score > 0.5) {
            scoreColor = '#F39C12';
            scoreText = 'Moderate Issues';
        }
        this.doc.rect(startX, this.currentY, barWidth, barHeight).fillColor('#ECF0F1').fill();
        if (score !== null) {
            this.doc.rect(startX, this.currentY, barWidth * Math.max(score, 0.05), barHeight).fillColor(scoreColor).fill();
        }
        this.doc.fontSize(12).font('BoldFont').fillColor('#2C3E50').text(`${label}: ${scoreText}`, startX + barWidth + 15, this.currentY + 5);
        this.currentY += barHeight + 15;
    }

    addOverallScoreDisplay(scoreData) {
        const score = scoreData.finalScore;
        const centerX = this.doc.page.width / 2;
        const radius = 60;

        let scoreColor = '#E74C3C'; // Red (Poor)
        if (score >= 90) {
            scoreColor = '#27AE60'; // Green (Excellent)
        } else if (score >= 50) {
            scoreColor = '#F39C12'; // Yellow (Moderate)
        }

        this.doc.circle(centerX, this.currentY + radius, radius).fill(scoreColor);
        this.doc.fontSize(50).font('BoldFont').fillColor('#FFFFFF').text(Math.round(score), centerX - (radius / 2), this.currentY + (radius / 2) + 5, { width: radius, align: 'center' });
        this.currentY += (radius * 2) + 15;
        this.doc.fontSize(16).font('BoldFont').fillColor('#2C3E50').text('Overall Silver Surfers Score', this.margin, this.currentY, { width: this.pageWidth, align: 'center' });
        this.currentY += 40;
    }

    addIntroPage(reportData, scoreData) {
        this.doc.rect(0, 0, this.doc.page.width, 120).fill('#34495E');
        this.doc.fontSize(32).font('BoldFont').fillColor('white').text('Silver Surfers', this.margin, 30, { width: this.pageWidth, align: 'center' });
        this.doc.fontSize(24).font('RegularFont').fillColor('white').text('Accessibility Audit Report', this.margin, 70, { width: this.pageWidth, align: 'center' });
        this.currentY = 150;
        if (reportData.finalUrl) {
            this.doc.rect(this.margin, this.currentY, this.pageWidth, 40).fill('#ECF0F1').stroke('#BDC3C7');
            this.doc.fontSize(14).font('BoldFont').fillColor('#2C3E50').text('Website Analyzed: ', this.margin + 10, this.currentY + 12);
            this.doc.font('RegularFont').text(reportData.finalUrl, this.margin + 160, this.currentY + 12);
            this.currentY += 55;
        }
        this.addOverallScoreDisplay(scoreData);
        const timestamp = new Date(reportData.fetchTime).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
        this.addBodyText(`Report Generated: ${timestamp}`, 12, '#7F8C8D');
        this.currentY += 10;
        this.addHeading('Our Mission: Digital Inclusion for Seniors', 18, '#2980B9');
        this.addBodyText('This comprehensive Silver Surfers audit evaluates website accessibility specifically from the perspective of elderly users. We focus on the unique challenges seniors face, including age-related vision changes, motor skill considerations, cognitive processing needs, and technology familiarity levels.');
    }

    // New method to show score calculation breakdown
    addScoreCalculationPage(reportData, scoreData) {
        this.addPage();
        this.addTitle('How Your Score Was Calculated', 24);
        this.addBodyText('The final score is a weighted average of individual audits. Audits that have a greater impact on the user experience for seniors are given a higher "weight," meaning they contribute more to the final score.');
        this.currentY += 10;

        const auditRefs = customConfig.categories['senior-friendly']?.auditRefs || [];
        const auditResults = reportData.audits;

        const tableItems = auditRefs.map(ref => {
            const result = auditResults[ref.id];
            const score = result ? (result.score ?? 0) : 0;
            const weightedScore = score * ref.weight;
            return {
                name: AUDIT_INFO[ref.id]?.title || ref.id,
                score: (score * 100).toFixed(0),
                weight: ref.weight,
                contribution: weightedScore.toFixed(2),
            };
        });

        const tableConfig = {
            headers: ['Audit Component', 'Score', 'Weight', 'Weighted Contribution'],
            widths: [295, 50, 50, 120],
            extractors: [
                item => item.name,
                item => item.score,
                item => item.weight,
                item => item.contribution,
            ]
        };

        this.drawEnhancedTable(tableItems, tableConfig, 'Technical Accessibility');

        this.currentY += 15;
        this.addHeading(`Final Calculation: ${scoreData.totalWeightedScore.toFixed(2)} (Total Points) / ${scoreData.totalWeight} (Total Weight) = ${scoreData.finalScore.toFixed(0)}`, 14, '#2980B9');
    }

    addSummaryPage(reportData) {
        this.addPage();
        this.addTitle('Audit Summary by Category', 24);
        const audits = reportData.audits || {};
        const categories = {};
        Object.keys(audits).forEach(auditId => {
            const info = AUDIT_INFO[auditId];
            if (info) {
                if (!categories[info.category]) {
                    categories[info.category] = [];
                }
                categories[info.category].push({ id: auditId, info, data: audits[auditId] });
            }
        });
        const ESTIMATED_SECTION_HEIGHT = 150;
        Object.keys(categories).forEach(categoryName => {
            if (this.currentY > (this.doc.page.height - this.doc.page.margins.bottom - ESTIMATED_SECTION_HEIGHT)) {
                this.addPage();
            }
            this.addSectionHeader(categoryName, categoryName);
            const categoryAudits = categories[categoryName];
            categoryAudits.forEach(audit => {
                const score = audit.data.score;
                let scoreText = 'Poor';
                if (score === null) scoreText = 'N/A';
                else if (score === 1) scoreText = 'Excellent';
                else if (score > 0.8) scoreText = 'Good';
                else if (score > 0.5) scoreText = 'Needs Work';
                this.addBodyText(`• ${audit.info.title}: ${scoreText}`, 11);
            });
            this.currentY += 20;
        });
    }

    addAuditDetailPage(auditId, auditData) {
        this.addPage();
        const info = AUDIT_INFO[auditId];
        if (!info) return;
        this.drawColorBar(info.category);
        this.addTitle(info.title, 22);
        this.addScoreBar(auditData.score, 'Silver Surfer Score');
        if (auditData.description) {
            this.doc.rect(this.margin, this.currentY, this.pageWidth, 60).fill('#F8F9FA').stroke('#E9ECEF');
            this.doc.fontSize(12).font('RegularFont').fillColor('#495057').text(auditData.description.replace(/\[(.*?)\]\(.*?\)/g, '$1'), this.margin + 10, this.currentY + 10, { width: this.pageWidth - 20, height: 40 });
            this.currentY += 75;
        }
        this.addHeading('Why This Matters for Silver Surfers', 14, '#E67E22');
        this.addBodyText(info.importance);
        this.addHeading('Impact on Silver Surfers', 14, '#8E44AD');
        this.addBodyText(info.why);
        if (info.recommendation) {
            this.addHeading('How to Improve for Silver Surfers', 14, '#27AE60');
            this.addBodyText(info.recommendation);
        }
        if (auditData.displayValue) {
            this.addHeading('Detailed Results', 14, '#2980B9');
            this.addBodyText(auditData.displayValue);
        }
    }
    
    addImagePage(auditId) {
        const imageFile = this.imagePaths[auditId];
        if (!imageFile || !fs.existsSync(imageFile)) {
            return;
        }
        this.addPage();
        const info = AUDIT_INFO[auditId];
        if (info) {
            this.drawColorBar(info.category);
            this.addHeading(`Visual Analysis: ${info.title}`, 18, '#2C3E50');
        }
        try {
            this.doc.image(imageFile, this.margin, this.currentY, { fit: [this.pageWidth, 650], align: 'center' });
        } catch (error) {
            console.error(`Error adding image ${imageFile}:`, error.message);
            this.addBodyText(`Visual analysis image unavailable: ${imageFile}`);
        }
    }
    
    addTablePages(auditId, auditData) {
        if (!auditData.details?.items || auditData.details.items.length === 0) return;
        this.addPage();
        const info = AUDIT_INFO[auditId];
        if (info) {
            this.drawColorBar(info.category);
            this.addHeading(`Detailed Findings: ${info.title}`, 16);
        }
        const tableConfig = this.getTableConfig(auditId);
        const items = auditData.details.items;
        const itemsPerPage = 12;
        for (let i = 0; i < items.length; i += itemsPerPage) {
            if (i > 0) {
                this.addPage();
                this.addHeading(`${info.title} (continued)`, 16);
            }
            this.drawEnhancedTable(items.slice(i, i + itemsPerPage), tableConfig, info?.category);
        }
    }
    
    getTableConfig(auditId) {
        switch (auditId) {
            case 'text-font-audit':
                return {
                    headers: ['Text Content', 'Element Selector', 'Reason'],
                    widths: [180, 200, 135],
                    extractors: [
                        item => item.textSnippet || 'N/A',
                        item => item.containerSelector || 'N/A',
                        item => 'Font smaller than 16px - difficult for seniors to read'
                    ]
                };
            case 'interactive-color-audit':
                return {
                    headers: ['Interactive Text', 'Element Location', 'Senior Accessibility Issue'],
                    widths: [150, 200, 165],
                    extractors: [
                        item => item.text || 'Interactive Element',
                        item => this.extractSelector(item.node) || 'N/A',
                        item => item.explanation || 'Insufficient visual distinction for elderly users'
                    ]
                };
            case 'layout-brittle-audit':
                return {
                    headers: ['Page Element', 'Element Location', 'Senior Impact'],
                    widths: [150, 200, 165],
                    extractors: [
                        item => this.extractNodeLabel(item.node) || 'Layout Element',
                        item => this.extractSelector(item.node) || 'N/A',
                        item => 'Layout may break when seniors adjust text size for better readability'
                    ]
                };
            default:
                return {
                    headers: ['Element', 'Location', 'Senior Accessibility Issue'],
                    widths: [150, 200, 165],
                    extractors: [
                        item => item.node?.nodeLabel || item.nodeLabel || 'Page Element',
                        item => item.node?.selector || item.selector || 'N/A',
                        item => item.node?.explanation || item.explanation || 'May impact senior users'
                    ]
                };
        }
    }
    
    extractSelector(node) {
        if (!node) return null;
        return node.selector || node.path || null;
    }
    
    extractNodeLabel(node) {
        if (!node) return null;
        return node.nodeLabel || node.snippet || null;
    }
    
    drawEnhancedTable(items, config, category) {
        const startY = this.currentY;
        const headerHeight = 35;
        const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['Technical Accessibility'];
        let tableY = startY;
        const auditInfo = AUDIT_INFO[config.auditId];
        this.doc.rect(this.margin, tableY, this.pageWidth, headerHeight).fill(colors.bg).stroke(colors.border);
        this.doc.font('BoldFont').fontSize(11).fillColor(colors.text);
        let currentX = this.margin;
        config.headers.forEach((header, index) => {
            if (index > 0) {
                this.doc.moveTo(currentX, tableY).lineTo(currentX, tableY + headerHeight).strokeColor(colors.border).stroke();
            }
            this.doc.text(header, currentX + 8, tableY + 12, { width: config.widths[index] - 16, height: headerHeight - 10, align: 'center' });
            currentX += config.widths[index];
        });
        tableY += headerHeight;
        this.doc.font('RegularFont').fontSize(9);
        items.forEach((item, rowIndex) => {
            const rowData = config.extractors.map(extractor => String(extractor(item) || 'N/A'));
            let maxRowHeight = 0;
            rowData.forEach((cellValue, colIndex) => {
                const cellWidth = config.widths[colIndex] - 16;
                const cellHeight = this.doc.heightOfString(cellValue, { width: cellWidth });
                if (cellHeight > maxRowHeight) {
                    maxRowHeight = cellHeight;
                }
            });
            const rowHeight = Math.max(maxRowHeight + 16, 30);
            if (tableY + rowHeight > this.doc.page.height - this.doc.page.margins.bottom) {
                this.addPage();
                this.addHeading(`${auditInfo?.title || 'Detailed Findings'} (continued)`, 16);
                tableY = this.currentY;
                this.doc.font('RegularFont').fontSize(9);
            }
            const isEvenRow = rowIndex % 2 === 0;
            if (isEvenRow) {
                this.doc.rect(this.margin, tableY, this.pageWidth, rowHeight).fill('#FAFAFA');
            }
            currentX = this.margin;
            rowData.forEach((cellValue, colIndex) => {
                if (colIndex > 0) {
                    this.doc.moveTo(currentX, tableY).lineTo(currentX, tableY + rowHeight).strokeColor('#E0E0E0').stroke();
                }
                this.doc.fillColor('#2C3E50').text(cellValue, currentX + 8, tableY + 8, {
                    width: config.widths[colIndex] - 16
                });
                currentX += config.widths[colIndex];
            });
            this.doc.rect(this.margin, tableY, this.pageWidth, rowHeight).strokeColor('#E0E0E0').stroke();
            tableY += rowHeight;
        });
        this.currentY = tableY + 20;
    }

    async generateReport(inputFile, outputFile, options = {}) {
        try {
            const reportData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
            const clientEmail = options.clientEmail || 'unknown-client';
            const formFactor = reportData.configSettings?.formFactor || 'desktop';
            const url = reportData.finalUrl || 'unknown-url';
            
            // Create sanitized filename from URL
            const sanitizedUrl = url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-');
            const fileName = `${sanitizedUrl}-${formFactor}.pdf`;

            // Use outputDir if provided, otherwise use clientEmail as folder
            let clientFolder;
            if (options.outputDir) {
                clientFolder = path.resolve(options.outputDir, clientEmail);
            } else {
                clientFolder = path.resolve(clientEmail);
            }
            if (!fs.existsSync(clientFolder)) {
                fs.mkdirSync(clientFolder, { recursive: true });
            }
            
            // Set final output path
            const finalOutputPath = path.join(clientFolder, fileName);

            const scoreData = calculateSeniorFriendlinessScore(reportData);
            const stream = fs.createWriteStream(finalOutputPath);
            this.doc.pipe(stream);

            console.log('Generating senior-friendly accessibility report...');
            console.log(`Overall Score Calculated: ${scoreData.finalScore.toFixed(0)}`);

            this.addIntroPage(reportData, scoreData);
            this.addScoreCalculationPage(reportData, scoreData);
            this.addSummaryPage(reportData);

            const audits = reportData.audits || {};
            const supportedAudits = Object.keys(audits).filter(id => AUDIT_INFO[id]);
            const categories = {};

            supportedAudits.forEach(auditId => {
                const info = AUDIT_INFO[auditId];
                if (!categories[info.category]) {
                    categories[info.category] = [];
                }
                categories[info.category].push(auditId);
            });

            console.log(`Processing ${supportedAudits.length} audits across ${Object.keys(categories).length} categories...`);

            for (const categoryName of Object.keys(categories)) {
                console.log(`  Processing ${categoryName}...`);
                for (const auditId of categories[categoryName]) {
                    const auditData = audits[auditId];
                    console.log(`    - ${auditId}...`);
                    this.addAuditDetailPage(auditId, auditData);
                    this.addImagePage(auditId);
                    this.addTablePages(auditId, auditData);
                }
            }

            this.doc.end();

            return new Promise((resolve, reject) => {
                stream.on('finish', () => {
                    const successMessage = {
                        success: true,
                        message: 'Senior accessibility report generated successfully',
                        reportPath: finalOutputPath,
                        clientFolder: clientFolder,
                        fileName: fileName,
                        formFactor: formFactor,
                        url: url,
                        score: scoreData.finalScore.toFixed(0)
                    };
                    console.log(`Senior accessibility report generated successfully: ${finalOutputPath}`);
                    resolve(successMessage);
                });
                stream.on('error', reject);
            });

        } catch (error) {
            console.error('Error generating senior accessibility report:', error.message);
            throw error;
        }
    }
}

export async function generateSeniorAccessibilityReport(options = {}) {
    const {
        inputFile = 'report.json',
        outputFile = 'silver-surfers-report.pdf',
        imagePaths = {},
        clientEmail = 'unknown-client',
        outputDir // <-- new option
    } = options;

    const generator = new ElderlyAccessibilityPDFGenerator({ imagePaths });

    // Pass outputDir to generateReport via options
    return await generator.generateReport(inputFile, outputFile, { ...options, outputDir });
}