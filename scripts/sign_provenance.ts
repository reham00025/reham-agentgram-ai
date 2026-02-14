#!/usr/bin/env tsx
/**
 * Sign Provenance Script
 *
 * Signs or verifies provenance JSON files.
 *
 * Usage:
 *   tsx scripts/sign_provenance.ts sign <provenance.json>
 *   tsx scripts/sign_provenance.ts verify <provenance.json>
 *   tsx scripts/sign_provenance.ts generate-keys
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

interface Provenance {
  article_sha256: string;
  submission_hash: string;
  bot_id: string;
  publisher_job_id: string;
  pipeline_version: string;
  sources: string[];
  created_at: string;
  signatures_present: {
    contributor: boolean;
    publisher: boolean;
  };
  provenance_signature?: string;
}

function getProvenanceDataForSigning(provenance: Provenance): string {
  // Create a copy without the signature field
  const { provenance_signature, ...dataToSign } = provenance;
  return JSON.stringify(dataToSign, Object.keys(dataToSign).sort());
}

function signWithHmac(data: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret).update(data).digest('base64');
  return `hmac-sha256:${hmac}`;
}

function verifyHmac(data: string, signature: string, secret: string): boolean {
  const expected = signWithHmac(data, secret);
  return signature === expected;
}

async function signWithEd25519(data: string, privateKeyBase64: string): Promise<string> {
  try {
    const privateKey = Buffer.from(privateKeyBase64, 'base64');

    // Try to create key object
    const keyObject = crypto.createPrivateKey({
      key: privateKey,
      format: 'der',
      type: 'pkcs8',
    });

    const signature = crypto.sign(null, Buffer.from(data), keyObject);
    return `ed25519:${signature.toString('base64')}`;
  } catch (error) {
    throw new Error(`Ed25519 signing failed: ${error}`);
  }
}

async function verifyEd25519(
  data: string,
  signature: string,
  publicKeyBase64: string
): Promise<boolean> {
  try {
    const signatureBuffer = Buffer.from(signature.replace('ed25519:', ''), 'base64');
    const publicKey = Buffer.from(publicKeyBase64, 'base64');

    const keyObject = crypto.createPublicKey({
      key: publicKey,
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(null, Buffer.from(data), keyObject, signatureBuffer);
  } catch (error) {
    console.error('Ed25519 verification failed:', error);
    return false;
  }
}

function generateKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    publicKeyEncoding: { type: 'spki', format: 'der' },
  });

  return {
    privateKey: privateKey.toString('base64'),
    publicKey: publicKey.toString('base64'),
  };
}

async function signProvenance(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const provenance: Provenance = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const dataToSign = getProvenanceDataForSigning(provenance);

  let signature: string;

  const privateKeyBase64 = process.env.PUBLISHER_PRIVATE_KEY;
  if (privateKeyBase64) {
    try {
      signature = await signWithEd25519(dataToSign, privateKeyBase64);
      console.log('Signed with Ed25519');
    } catch (error) {
      console.warn('Ed25519 signing failed, falling back to HMAC:', error);
      const secret = process.env.PUBLISHER_SECRET || 'development-secret';
      signature = signWithHmac(dataToSign, secret);
      console.log('Signed with HMAC-SHA256');
    }
  } else {
    const secret = process.env.PUBLISHER_SECRET || 'development-secret';
    signature = signWithHmac(dataToSign, secret);
    console.log('Signed with HMAC-SHA256 (no PUBLISHER_PRIVATE_KEY set)');
  }

  provenance.provenance_signature = signature;
  provenance.signatures_present.publisher = true;

  fs.writeFileSync(filePath, JSON.stringify(provenance, null, 2));
  console.log(`Provenance signed and saved: ${filePath}`);
  console.log(`Signature: ${signature.slice(0, 50)}...`);
}

async function verifyProvenance(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const provenance: Provenance = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (!provenance.provenance_signature) {
    console.log('No signature present in provenance file');
    process.exit(1);
  }

  const dataToVerify = getProvenanceDataForSigning(provenance);
  const signature = provenance.provenance_signature;

  let valid = false;

  if (signature.startsWith('ed25519:')) {
    const publicKeyBase64 = process.env.PUBLISHER_PUBLIC_KEY;
    if (!publicKeyBase64) {
      console.error('PUBLISHER_PUBLIC_KEY environment variable required for Ed25519 verification');
      process.exit(1);
    }
    valid = await verifyEd25519(dataToVerify, signature, publicKeyBase64);
  } else if (signature.startsWith('hmac-sha256:')) {
    const secret = process.env.PUBLISHER_SECRET || 'development-secret';
    valid = verifyHmac(dataToVerify, signature, secret);
  } else {
    console.error('Unknown signature format');
    process.exit(1);
  }

  if (valid) {
    console.log('\x1b[32m✓\x1b[0m Signature verified');
    console.log(`  Article: ${provenance.article_sha256.slice(0, 16)}...`);
    console.log(`  Bot: ${provenance.bot_id}`);
    console.log(`  Pipeline: ${provenance.pipeline_version}`);
  } else {
    console.log('\x1b[31m✗\x1b[0m Signature verification failed');
    process.exit(1);
  }
}

function generateKeys() {
  console.log('Generating Ed25519 key pair...\n');

  const keys = generateKeyPair();

  console.log('Private Key (base64) - Keep this secret!');
  console.log('Set as PUBLISHER_PRIVATE_KEY environment variable:');
  console.log(`  ${keys.privateKey}\n`);

  console.log('Public Key (base64) - Share this for verification:');
  console.log('Set as PUBLISHER_PUBLIC_KEY environment variable:');
  console.log(`  ${keys.publicKey}\n`);

  // Save to files in config directory
  const configDir = path.join(process.cwd(), 'config', 'keys');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(configDir, 'publisher.public.key'),
    keys.publicKey
  );
  console.log('Public key saved to: config/keys/publisher.public.key');

  console.log('\n\x1b[33mWARNING:\x1b[0m Never commit the private key to version control!');
  console.log('Add the private key as a GitHub secret named PUBLISHER_PRIVATE_KEY');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Provenance Signing Utility');
    console.log('');
    console.log('Usage:');
    console.log('  tsx scripts/sign_provenance.ts sign <provenance.json>');
    console.log('  tsx scripts/sign_provenance.ts verify <provenance.json>');
    console.log('  tsx scripts/sign_provenance.ts generate-keys');
    console.log('');
    console.log('Environment variables:');
    console.log('  PUBLISHER_PRIVATE_KEY - Base64 Ed25519 private key for signing');
    console.log('  PUBLISHER_PUBLIC_KEY  - Base64 Ed25519 public key for verification');
    console.log('  PUBLISHER_SECRET      - Fallback HMAC secret (development only)');
    process.exit(1);
  }

  const [command, ...rest] = args;

  switch (command) {
    case 'sign':
      if (rest.length !== 1) {
        console.error('Usage: tsx scripts/sign_provenance.ts sign <provenance.json>');
        process.exit(1);
      }
      await signProvenance(rest[0]!);
      break;

    case 'verify':
      if (rest.length !== 1) {
        console.error('Usage: tsx scripts/sign_provenance.ts verify <provenance.json>');
        process.exit(1);
      }
      await verifyProvenance(rest[0]!);
      break;

    case 'generate-keys':
      generateKeys();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
