// custom-config.js
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gathererPath = (file) => path.join(__dirname, 'custom_gatherers', file);
const auditPath = (file) => path.join(__dirname, 'custom_audits', file);

export default {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['senior-friendly'],
  },
  artifacts: [
    { id: 'PageText', gatherer: gathererPath('text-gatherer.js') },
    { id: 'PageLinkColors', gatherer: gathererPath('color-gatherer.js') },
    { id: 'BrittleLayoutElements', gatherer: gathererPath('layout-gatherer.js') },
  ],
  audits: [
    { path: auditPath('text-audit.js') },
    { path: auditPath('color-audit.js') },
    { path: auditPath('layout-audit.js') },
  ],
  categories: {
    'senior-friendly': {
      title: 'Senior Friendliness',
      description: 'A comprehensive score based on audits for readability, ease of use, and a stable, non-confusing experience.',
      auditRefs: [
        { id: 'color-contrast', weight: 10 },
        { id: 'target-size', weight: 10 },
        { id: 'viewport', weight: 10 },
        { id: 'cumulative-layout-shift', weight: 10 },
        { id: 'text-font-audit', weight: 10 },
        { id: 'layout-brittle-audit', weight: 10 },

        { id: 'largest-contentful-paint', weight: 5 },
        { id: 'total-blocking-time', weight: 5 },
        { id: 'link-name', weight: 5 },
        { id: 'button-name', weight: 5 },
        { id: 'label', weight: 5 },
        { id: 'interactive-color-audit', weight: 5 },

        { id: 'is-on-https', weight: 2 },
        { id: 'dom-size', weight: 2 },
        { id: 'heading-order', weight: 2 },
        { id: 'errors-in-console', weight: 2 },
        { id: 'geolocation-on-start', weight: 2 },
      ],
    },
  },
};