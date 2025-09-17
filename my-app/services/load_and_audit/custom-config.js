// custom-config.js



/**

 * @license

 * Copyright 2025 Google LLC

 * SPDX-License-Identifier: Apache-2.0

 */



export default {

  // 1. We still extend the default config to get access to all the audits and gatherers.

  extends: 'lighthouse:default',



  // 2. Add a 'settings' object to control what the runner executes. 

  settings: {

    // This is the key change: tell Lighthouse to build only our custom category.

    // It will automatically run only the audits required for this category.

    onlyCategories: ['senior-friendly'],

  },



  // 3. Your custom gatherers and audits are still registered here.
    artifacts: [
    { id: 'PageText', gatherer: path.resolve(__dirname, 'load_and_audit/custom_gatherers/text-gatherer.js') },
    { id: 'PageLinkColors', gatherer: path.resolve(__dirname, 'load_and_audit/custom_gatherers/color-gatherer.js') },
    { id: 'BrittleLayoutElements', gatherer: path.resolve(__dirname, 'load_and_audit/custom_gatherers/layout-gatherer.js') },
  ],

  audits: [
    { path: path.resolve(__dirname, 'load_and_audit/custom_audits/text-audit.js') },
    { path: path.resolve(__dirname, 'load_and_audit/custom_audits/color-audit.js') },
    { path: path.resolve(__dirname, 'load_and_audit/custom_audits/layout-audit.js') },
  ],



  // 4. The categories section defines the content of your custom category.

  categories: {

    'senior-friendly': {

      title: 'Senior Friendliness',

      description: 'A comprehensive score based on audits for readability, ease of use, and a stable, non-confusing experience.',

      auditRefs: [

        // --- Tier 1: Critical (Weight: 10 each) ---

        { id: 'color-contrast', weight: 10 },

        { id: 'target-size', weight: 10 },

        { id: 'viewport', weight: 10 },

        { id: 'cumulative-layout-shift', weight: 10 },

        { id: 'text-font-audit', weight: 10 },         // Your custom audit

        { id: 'layout-brittle-audit', weight: 10 },    // Your custom audit



        // --- Tier 2: Important (Weight: 5 each) ---

        { id: 'largest-contentful-paint', weight: 5 },

        { id: 'total-blocking-time', weight: 5 },

        { id: 'link-name', weight: 5 },

        { id: 'button-name', weight: 5 },

        { id: 'label', weight: 5 },

        { id: 'interactive-color-audit', weight: 5 }, // Your custom audit



        // --- Tier 3: Foundational (Weight: 2 each) ---

        { id: 'is-on-https', weight: 2 },

        { id: 'dom-size', weight: 2 },

        { id: 'heading-order', weight: 2 },

        { id: 'errors-in-console', weight: 2 },

        { id: 'geolocation-on-start', weight: 2 },

      ],

    },

  },

};