#!/usr/bin/env tsx
/**
 * Hash Utility Script
 *
 * Computes SHA-256 hashes for files or strings.
 * Used for creating payload hashes in submissions.
 *
 * Usage:
 *   tsx scripts/hash.ts file <path>           - Hash a file
 *   tsx scripts/hash.ts string <text>         - Hash a string
 *   tsx scripts/hash.ts submission <path>     - Compute submission payload hash
 */

import fs from 'node:fs';
import crypto from 'node:crypto';

interface Submission {
  bot_id: string;
  timestamp: string;
  sources: string[];
  outline?: string[];
  notes?: string;
  submission_version: number;
  title?: string;
  category?: string;
  tags?: string[];
}

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function hashString(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function normalizeSubmission(submission: Submission): string {
  const normalized = {
    bot_id: submission.bot_id,
    timestamp: submission.timestamp,
    sources: [...submission.sources].sort(),
    outline: submission.outline ? [...submission.outline] : undefined,
    notes: submission.notes || undefined,
    submission_version: submission.submission_version,
    title: submission.title || undefined,
    category: submission.category || undefined,
    tags: submission.tags ? [...submission.tags].sort() : undefined,
  };

  const cleaned = Object.fromEntries(
    Object.entries(normalized).filter(([_, v]) => v !== undefined)
  );

  return JSON.stringify(cleaned, Object.keys(cleaned).sort());
}

function hashSubmission(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  const submission = JSON.parse(content) as Submission;
  const normalized = normalizeSubmission(submission);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Hash Utility for Reham Agentgram');
    console.log('');
    console.log('Usage:');
    console.log('  tsx scripts/hash.ts file <path>           - Hash a file');
    console.log('  tsx scripts/hash.ts string <text>         - Hash a string');
    console.log('  tsx scripts/hash.ts submission <path>     - Compute submission payload hash');
    console.log('');
    console.log('Output format: sha256:<hash>');
    process.exit(1);
  }

  const [command, ...rest] = args;
  const input = rest.join(' ');

  let hash: string;

  switch (command) {
    case 'file':
      if (!fs.existsSync(input)) {
        console.error(`File not found: ${input}`);
        process.exit(1);
      }
      hash = hashFile(input);
      break;

    case 'string':
      hash = hashString(input);
      break;

    case 'submission':
      if (!fs.existsSync(input)) {
        console.error(`Submission file not found: ${input}`);
        process.exit(1);
      }
      hash = hashSubmission(input);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Valid commands: file, string, submission');
      process.exit(1);
  }

  console.log(`sha256:${hash}`);
}

main();
