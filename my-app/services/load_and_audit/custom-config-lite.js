// custom-config-lite.js

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export default {
  // 1. Extend the default config to get access to all built-in audits
  extends: 'lighthouse:default',

  // 2. Settings object to control what the runner executes
  settings: {
    // Only run our lite category - no custom audits needed
    onlyCategories: ['senior-friendly-lite'],
  },

  // 3. No custom gatherers or audits needed for lite version
  // artifacts: [],
  // audits: [],

  // 4. Lite category with only built-in Lighthouse audits
  categories: {
    'senior-friendly-lite': {
      title: 'Senior Accessibility (Lite)',
      description: 'Essential accessibility checks for senior users using built-in Lighthouse audits.',
      auditRefs: [
        // --- Essential (Weight: 5 each) ---
        { id: 'color-contrast', weight: 5 },
        { id: 'target-size', weight: 5 },
        { id: 'font-size', weight: 5 },

        // --- Important (Weight: 3 each) ---
        { id: 'viewport', weight: 3 },
        { id: 'link-name', weight: 3 },
        { id: 'button-name', weight: 3 },
        { id: 'label', weight: 3 },

        // --- Basic (Weight: 2 each) ---
        { id: 'heading-order', weight: 2 },
        { id: 'is-on-https', weight: 2 },

        // --- Performance (Weight: 1 each) ---
        { id: 'largest-contentful-paint', weight: 1 },
        { id: 'cumulative-layout-shift', weight: 1 },
      ],
    },
  },
};