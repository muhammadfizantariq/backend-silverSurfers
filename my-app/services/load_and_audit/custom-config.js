// custom-config.js
// Resolve custom gatherers/audits via absolute paths so Lighthouse can load them in Docker/Render.

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const r = (rel) => path.resolve(__dirname, rel);

const GATHERERS = {
  text: r('custom_gatherers/text-gatherer.js'),
  color: r('custom_gatherers/color-gatherer.js'),
  layout: r('custom_gatherers/layout-gatherer.js'),
};

const AUDITS = {
  text: r('custom_audits/text-audit.js'),
  color: r('custom_audits/color-audit.js'),
  layout: r('custom_audits/layout-audit.js'),
};

const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['senior-friendly'],
  },
  artifacts: [
    { id: 'PageText', gatherer: GATHERERS.text },
    { id: 'PageLinkColors', gatherer: GATHERERS.color },
    { id: 'BrittleLayoutElements', gatherer: GATHERERS.layout },
  ],
  audits: [
    { path: AUDITS.text },
    { path: AUDITS.color },
    { path: AUDITS.layout },
  ],
  categories: {
    'senior-friendly': {
      title: 'Senior Friendliness',
      description:
        'A comprehensive score based on audits for readability, ease of use, and a stable, non-confusing experience.',
      auditRefs: [
        // Tier 1
        { id: 'color-contrast', weight: 10 },
        { id: 'target-size', weight: 10 },
        { id: 'viewport', weight: 10 },
        { id: 'cumulative-layout-shift', weight: 10 },
        { id: 'text-font-audit', weight: 10 },
        { id: 'layout-brittle-audit', weight: 10 },
        // Tier 2
        { id: 'largest-contentful-paint', weight: 5 },
        { id: 'total-blocking-time', weight: 5 },
        { id: 'link-name', weight: 5 },
        { id: 'button-name', weight: 5 },
        { id: 'label', weight: 5 },
        { id: 'interactive-color-audit', weight: 5 },
        // Tier 3
        { id: 'is-on-https', weight: 2 },
        { id: 'dom-size', weight: 2 },
        { id: 'heading-order', weight: 2 },
        { id: 'errors-in-console', weight: 2 },
        { id: 'geolocation-on-start', weight: 2 },
      ],
    },
  },
};

export default config;