import express from 'express';
import fs from 'fs/promises';
import path from 'path';

// --- Your Project Modules ---
import { InternalLinksExtractor } from '../internal_links/internal_links.js';
import { runLighthouseAudit } from '../load_and_audit/audit.js';
import { generateSeniorAccessibilityReport } from '../report_generation/pdf_generator.js';
import { createAllHighlightedImages } from '../drawing_boxes/draw_all.js'; 

// --- Placeholder for signaling the backend ---
const signalBackend = async (payload) => {
  const backendEndpoint = 'http://localhost:8000/api/audit-status';
  console.log(`\n📡 Signaling backend at ${backendEndpoint} with status: ${payload.status}`);
  console.log('Payload:', payload);
};

// =================================================================
// ## 1. The Core Logic for a Single Job ##
// =================================================================
const runFullAuditProcess = async (job) => {
  const { email, url } = job;
  console.log(`\n\n--- [STARTING JOB] ---`);
  console.log(`Processing job for ${email} to audit ${url}`);
  
  const sanitizedEmail = email.replace(/[^a-z0-9]/gi, '_');
  const jobFolder = path.join('reports', `${sanitizedEmail}-${Date.now()}`);
  await fs.mkdir(jobFolder, { recursive: true });

  try {
    const extractor = new InternalLinksExtractor();
    const extractionResult = await extractor.extractInternalLinks(url);

    if (!extractionResult.success) {
      throw new Error(`Link extraction failed: ${extractionResult.details}`);
    }
    
    const linksToAudit = extractionResult.links;
    console.log(`Found ${linksToAudit.length} links to audit.`);

    // Loop through each extracted link
    for (const link of linksToAudit) {
      // For each link, run both a desktop and a mobile audit
      for (const device of ['desktop', 'mobile']) {
        console.log(`--- Starting ${device} audit for: ${link} ---`);
        let jsonReportPath = null;
        let imagePaths = {};

        try {
          const auditResult = await runLighthouseAudit({ url: link, device: device, format: 'json' });

          if (auditResult.success) {
            jsonReportPath = auditResult.reportPath;
            
            // --- THIS IS THE ONLY CHANGE ---
            // Pass the unique jobFolder to the image orchestrator.
            imagePaths = await createAllHighlightedImages(jsonReportPath, jobFolder);

            // Generate the final PDF for this specific device audit
            await generateSeniorAccessibilityReport({
                inputFile: jsonReportPath,
                clientEmail: email, // Used for subfolder naming inside pdf_generator
                imagePaths: imagePaths
            });
            
          } else {
            console.error(`Skipping report for ${link} (${device}). Reason: ${auditResult.error}`);
          }
        } catch (pageError) {
          console.error(`An unexpected error occurred while auditing ${link} (${device}):`, pageError.message);
        } finally {
          // --- Cleanup for this single audit run ---
          if (jsonReportPath) await fs.unlink(jsonReportPath).catch(e => console.error(e.message));
          if (imagePaths && typeof imagePaths === 'object') {
            for (const imgPath of Object.values(imagePaths)) {
              if(imgPath) await fs.unlink(imgPath).catch(e => console.error(e.message));
            }
          }
        }
      }
    }

    console.log(`🎉 All links for ${email} have been processed for both desktop and mobile.`);
    const finalReportFolder = path.join('reports', email);

    await signalBackend({
      status: 'completed',
      clientEmail: email,
      folderPath: finalReportFolder 
    });
  } catch (jobError) {
    console.error(`A critical error occurred during the job for ${email}:`, jobError.message);
    await signalBackend({ status: 'failed', clientEmail: email, error: jobError.message });
    await fs.rm(jobFolder, { recursive: true, force: true });
  }
};

// =================================================================
// ## 2. The Queue Manager Class and Express Server ##
// =================================================================
class QueueManager {
  constructor() { this.queue = []; this.isBusy = false; }
  addJob(job) { this.queue.push(job); this.processQueue(); }
  async processQueue() {
    if (this.isBusy || this.queue.length === 0) return;
    this.isBusy = true;
    const job = this.queue.shift();
    try {
      await runFullAuditProcess(job);
    } catch (error) {
      console.error(`Job runner error for ${job.email}:`, error);
    } finally {
      this.isBusy = false;
      this.processQueue();
    }
  }
}

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const queueManager = new QueueManager();

app.post('/start-audit', (req, res) => {
  const { email, url } = req.body;
  if (!email || !url) {
    return res.status(400).json({ error: 'Email and URL are required.' });
  }
  queueManager.addJob({ email, url });
  res.status(202).json({ message: 'Audit request has been queued.' });
});

app.post('/cleanup', async (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) {
    return res.status(400).json({ error: 'folderPath is required.' });
  }
  try {
    await fs.rm(folderPath, { recursive: true, force: true });
    res.status(200).json({ message: 'Cleanup successful.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform cleanup.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Audit server listening on http://localhost:${PORT}`);
});