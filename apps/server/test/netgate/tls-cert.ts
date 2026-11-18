/**
 * GATE:NET prototype — runtime self-signed certificate for a local TLS measurement.
 *
 * The key and certificate are generated into a fresh temporary directory with the system `openssl`, kept in
 * memory only for the test, and removed afterwards. Nothing is committed: no private key, no certificate.
 * A self-signed certificate with `rejectUnauthorized: false` proves transport encryption, not production PKI.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface SelfSignedCertificate {
  readonly key: Buffer;
  readonly cert: Buffer;
  readonly directory: string;
  readonly opensslVersion: string;
  cleanup(): void;
}

export function opensslVersion(): string | null {
  const probe = spawnSync('openssl', ['version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) return null;
  return probe.stdout.trim();
}

export function generateSelfSignedCertificate(): SelfSignedCertificate {
  const directory = mkdtempSync(join(tmpdir(), 'strata-netgate-tls-'));
  const keyPath = join(directory, 'key.pem');
  const certPath = join(directory, 'cert.pem');
  try {
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-keyout', keyPath, '-out', certPath,
      '-days', '1', '-subj', '/CN=127.0.0.1',
      '-addext', 'subjectAltName=IP:127.0.0.1',
    ], { stdio: 'ignore' });
    const version = opensslVersion();
    if (!version) throw new Error('openssl disappeared after generating the certificate');
    let cleaned = false;
    return {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
      directory,
      opensslVersion: version,
      cleanup() {
        if (cleaned) return;
        cleaned = true;
        rmSync(directory, { recursive: true, force: true });
      },
    };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}
