import { Audit } from 'lighthouse';

const MINIMUM_FONT_SIZE = 16; // Set high to flag all text for drawing

class TextAudit extends Audit {
  static get meta() {
    return {
      id: 'text-font-audit',
      title: 'All Text Elements',
      failureTitle: 'All Text Elements Identified',
      description: 'Identifies all text elements and their coordinates for visualization.',
      requiredArtifacts: ['PageText'],
    };
  }

  static audit(artifacts) {
    const collectedText = artifacts.PageText;
    if (collectedText.length === 0) {
      return { score: 1, notApplicable: true };
    }

    const failingItems = [];
    for (const textItem of collectedText) {
      if (parseFloat(textItem.fontSize) < MINIMUM_FONT_SIZE) {
        failingItems.push({
          textSnippet: textItem.text,
          rect: {
            top: textItem.top,
            left: textItem.left,
            width: textItem.width,
            height: textItem.height,
          },
          // --- CHANGE: Pass container info to the report items ---
          containerTag: textItem.containerTag,
          containerSelector: textItem.containerSelector,
        });
      }
    }

    // --- CHANGE: Add headings for the new columns in the report table ---
    const headings = [
        { key: 'textSnippet', itemType: 'text', text: 'Text Snippet' },
        { key: 'containerTag', itemType: 'code', text: 'Container Tag' },
        { key: 'containerSelector', itemType: 'text', text: 'Container Selector' },
    ];

    return {
      score: 1, // Score isn't relevant for this tool
      details: Audit.makeTableDetails(headings, failingItems),
    };
  }
}
export default TextAudit;