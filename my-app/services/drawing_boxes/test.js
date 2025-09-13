import { processLayoutBrittleAudit } from './draw_boxes_layout.js';
import { processInteractiveColorAudit } from './draw_boxes_interactivecolor.js';
import { processColorContrastAudit } from './draw_boxes_contrast.js';
import { processTargetSizeAudit } from './draw_boxes_targetSize.js';
import { processTextFontAudit } from './draw_boxes_fontSize.js';

// Test the function with a Lighthouse report JSON file
const jsonFilePath = '../load_and_audit/report-curemd-com-1757764239485.json'; // Replace with your actual JSON file path

processLayoutBrittleAudit(jsonFilePath);
processInteractiveColorAudit(jsonFilePath);
processColorContrastAudit(jsonFilePath);
processTargetSizeAudit(jsonFilePath);
processTextFontAudit(jsonFilePath);