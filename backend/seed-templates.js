import { db } from "./dist/db/client.js";
import { documentTemplates } from "./dist/db/schema.js";

const templates = [
  {
    name: 'Blank Document',
    description: 'Start from scratch with a clean document',
    category: 'General',
    content: ''
  },
  {
    name: 'Meeting Notes',
    description: 'Template for meeting minutes and action items',
    category: 'Business',
    content: `# Meeting Notes

**Date:** ${new Date().toLocaleDateString()}
**Attendees:** 

## Agenda

## Discussion Points

## Action Items

## Next Steps
`
  },
  {
    name: 'Project Plan',
    description: 'Organize project goals, timeline, and deliverables',
    category: 'Business',
    content: `# Project Plan

## Overview

## Objectives

## Timeline

## Deliverables

## Resources

## Risk Assessment
`
  },
  {
    name: 'Technical Documentation',
    description: 'Document APIs, processes, or technical specifications',
    category: 'Technical',
    content: `# Technical Documentation

## Overview

## Prerequisites

## Installation

## Usage

## API Reference

## Examples

## Troubleshooting
`
  },
  {
    name: 'Task Checklist',
    description: 'Create organized to-do lists and checklists',
    category: 'Productivity',
    content: `# Task Checklist

## Today
- [ ] 
- [ ] 

## This Week
- [ ] 
- [ ] 

## Completed
- [x] Example completed task
`
  },
  {
    name: 'Creative Writing',
    description: 'Perfect for stories, articles, and creative content',
    category: 'Creative',
    content: `# Creative Writing

## Inspiration

## Outline

## Draft

## Notes
`
  }
];

async function seedTemplates() {
  try {
    console.log('Seeding document templates...');
    
    for (const template of templates) {
      await db.insert(documentTemplates).values(template).onConflictDoNothing();
      console.log(`Added template: ${template.name}`);
    }
    
    console.log('Templates seeded successfully!');
  } catch (error) {
    console.error('Error seeding templates:', error);
  } finally {
    process.exit(0);
  }
}

seedTemplates();
