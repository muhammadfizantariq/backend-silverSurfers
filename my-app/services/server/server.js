import express from 'express';
import fs from 'fs/promises';
import path from 'path';

// --- Your Project Modules (CORRECTED IMPORT) ---
import { InternalLinksExtractor } from '../internal_links/internal_links.js';
import { runLighthouseAudit } from '../load_and_audit/audit.js'; // Changed to your modified audit module
import { runLighthouseLiteAudit } from '../load_and_audit/audit-module-with-lite.js'; // Keep lite for quick scans
import { generateSeniorAccessibilityReport } from '../report_generation/pdf_generator.js';
import { createAllHighlightedImages } from '../drawing_boxes/draw_all.js';
import { generateLiteAccessibilityReport } from '../report_generation/pdf-generator-lite.js';

// --- Placeholder for signaling the backend (assumed to be the same) ---
const signalBackend = async (payload) => {
    const backendEndpoint = 'http://localhost:8000/api/audit-status';
    console.log(`\n📡 Signaling backend at ${backendEndpoint} with status: ${payload.status}`);
    console.log('Payload:', payload);
};

// --- Logic for FULL AUDIT and QUICK SCAN (Unchanged from your code) ---
// =================================================================
// ## PASTE THIS CODE INTO YOUR SERVER FILE ##
// =================================================================

const runFullAuditProcess = async (job) => {
    const { email, url } = job;
    console.log(`\n\n--- [STARTING FULL JOB] ---`);
    console.log(`Processing job for ${email} to audit ${url}`);

    // --- FIX STEP 1: Define the FINAL destination folder at the top ---
    const finalReportFolder = path.join('reports-full', email);

    // --- FIX STEP 2: Create the temporary folder for processing ---
    const sanitizedEmail = email.replace(/[^a-z0-9]/gi, '_');
    const jobFolder = path.join('reports', `${sanitizedEmail}-${Date.now()}`);

    // --- FIX STEP 3: Create BOTH directories to ensure they exist ---
    await fs.mkdir(finalReportFolder, { recursive: true });
    await fs.mkdir(jobFolder, { recursive: true });


    try {
        const extractor = new InternalLinksExtractor();
        const extractionResult = await extractor.extractInternalLinks(url);

        if (!extractionResult.success) {
            throw new Error(`Link extraction failed: ${extractionResult.details}`);
        }
        
        const linksToAudit = extractionResult.links;
        console.log(`Found ${linksToAudit.length} links for full audit.`);

        for (const link of linksToAudit) {
            for (const device of ['desktop', 'mobile']) {
                console.log(`--- Starting full ${device} audit for: ${link} ---`);
                let jsonReportPath = null;
                let imagePaths = {};

                try {
                    const auditResult = await runLighthouseAudit({ url: link, device: device, format: 'json' });

                    if (auditResult.success) {
                        jsonReportPath = auditResult.reportPath;
                        imagePaths = await createAllHighlightedImages(jsonReportPath, jobFolder);

                        // --- FIX STEP 4: Pass the final destination to the report generator ---
                        await generateSeniorAccessibilityReport({
                            inputFile: jsonReportPath,
                            clientEmail: email,
                            imagePaths: imagePaths,
                            outputDir: finalReportFolder // Pass the correct folder here
                        });
                        
                    } else {
                        console.error(`Skipping full report for ${link} (${device}). Reason: ${auditResult.error}`);
                    }
                } catch (pageError) {
                    console.error(`An unexpected error occurred while auditing ${link} (${device}):`, pageError.message);
                } finally {
                    if (jsonReportPath) await fs.unlink(jsonReportPath).catch(e => console.error(e.message));
                    if (imagePaths && typeof imagePaths === 'object') {
                        for (const imgPath of Object.values(imagePaths)) {
                            if (imgPath) await fs.unlink(imgPath).catch(e => console.error(e.message));
                        }
                    }
                }
            }
        }

        console.log(`🎉 All links for ${email} have been processed for the full audit.`);

        await signalBackend({
            status: 'completed',
            clientEmail: email,
            folderPath: finalReportFolder // This line now correctly reflects the folder used
        });
    } catch (jobError) {
        console.error(`A critical error occurred during the full job for ${email}:`, jobError.message);
        await signalBackend({ status: 'failed', clientEmail: email, error: jobError.message });
        await fs.rm(jobFolder, { recursive: true, force: true });
    }
};

const runQuickScanProcess = async (job) => {
    const { email, url } = job;
    console.log(`\n--- [STARTING QUICK SCAN] ---`);
    console.log(`Processing quick scan for ${email} on ${url}`);
    
    let jsonReportPath = null;
    
    try {
        const liteAuditResult = await runLighthouseLiteAudit({
            url: url,
            device: 'desktop',
            format: 'json'
        });

        if (!liteAuditResult.success) {
            throw new Error(`Lite audit failed: ${liteAuditResult.error}`);
        }

        jsonReportPath = liteAuditResult.reportPath;
        console.log(`Lite audit successful. Temp JSON at: ${jsonReportPath}`);

        const baseReportsDir = 'reports-lite';
        const userSpecificOutputDir = path.join(baseReportsDir, `${email}_lite`);

        const pdfResult = await generateLiteAccessibilityReport(jsonReportPath, userSpecificOutputDir);

        console.log(`✅ Quick scan PDF generated for ${email} at ${pdfResult.reportPath}`);
        return pdfResult;

    } catch (error) {
        console.error(`A critical error occurred during the quick scan for ${email}:`, error.message);
        throw error;
    } finally {
        if (jsonReportPath) {
            await fs.unlink(jsonReportPath).catch(e => console.error(`Failed to delete temp file ${jsonReportPath}:`, e.message));
        }
    }
};

// =================================================================
// ## 1. SHARED STATE (The Global Lock) ##
// =================================================================
let isBrowserInUse = false; // This is the single, shared lock for both queues.

// =================================================================
// ## 2. The JobQueue Class (Updated to use the shared lock) ##
// =================================================================

class JobQueue {
    constructor(processFunction, queueName = 'Unnamed') {
        this.processFunction = processFunction;
        this.queue = [];
        this.queueName = queueName; // For better logging
    }

    addBgJob(job) {
        this.queue.push({ job, isBg: true });
        this.processQueue();
    }

    addRequestJob(job) {
        return new Promise((resolve, reject) => {
            this.queue.push({ job, resolve, reject, isBg: false });
            this.processQueue();
        });
    }

    async processQueue() {
        // CRITICAL CHANGE: Check the GLOBAL lock, not an internal one.
        if (isBrowserInUse || this.queue.length === 0) {
            return;
        }

        // CRITICAL CHANGE: Set the GLOBAL lock to true.
        isBrowserInUse = true;
        
        const task = this.queue.shift();
        console.log(`[${this.queueName}] picked up job for ${task.job.email}. Browser is now locked.`);
        
        try {
            const result = await this.processFunction(task.job);
            if (!task.isBg) {
                task.resolve(result);
            }
        } catch (error) {
            console.error(`Job runner error in [${this.queueName}] for ${task.job.email}:`, error.message);
            if (!task.isBg) {
                task.reject(error);
            }
        } finally {
            // CRITICAL CHANGE: Release the GLOBAL lock so the next job can run.
            console.log(`[${this.queueName}] finished job for ${task.job.email}. Releasing browser lock.`);
            isBrowserInUse = false;
            
            // IMPORTANT: After releasing the lock, we must trigger BOTH queues
            // to check if they can start a new job.
            fullAuditQueue.processQueue();
            quickScanQueue.processQueue();
        }
    }
}


// =================================================================
// ## 3. The Express Server (Updated to instantiate queues correctly) ##
// =================================================================

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// --- Create two independent queues that will share the global lock ---
const fullAuditQueue = new JobQueue(runFullAuditProcess, 'FullAuditQueue');
const quickScanQueue = new JobQueue(runQuickScanProcess, 'QuickScanQueue');

// --- Endpoints (No changes needed here) ---

app.post('/start-audit', (req, res) => {
    const { email, url } = req.body;
    if (!email || !url) {
        return res.status(400).json({ error: 'Email and URL are required.' });
    }
    fullAuditQueue.addBgJob({ email, url });
    res.status(202).json({ message: 'Full audit request has been queued.' });
});

app.post('/quick-scan', async (req, res) => {
    const { email, url } = req.body;
    if (!email || !url) {
        return res.status(400).json({ error: 'Email and URL are required.' });
    }
    try {
        const result = await quickScanQueue.addRequestJob({ email, url });
        res.status(200).json({
            message: 'Quick scan completed successfully.',
            reportPath: result.reportPath,
            score: result.score
        });
    } catch (error) {
        res.status(500).json({
            message: 'Quick scan failed to complete.',
            error: error.message
        });
    }
});

app.post('/cleanup', async (req, res) => { /* ... your cleanup logic ... */ });

app.listen(PORT, () => {
    console.log(`🚀 Audit server listening on http://localhost:${PORT}`);
    // ...
});