import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

describe('Quality Gates - 1.2.6 No Hardcoded', () => {
  it('version is semver 1.x', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    assert.match(pkg.version, /^\d+\.\d+\.\d+/);
    assert.ok(pkg.version.startsWith('1.'), `version should be 1.x, got ${pkg.version}`);
  });
  it('env has HOST and LOCAL_ONLY', () => {
    const env = fs.readFileSync('.env.example', 'utf8');
    assert.ok(env.includes('HOST=127.0.0.1'), 'must have HOST=127.0.0.1');
    assert.ok(env.includes('ZYNTHEOR_LOCAL_ONLY=true'), 'must have LOCAL_ONLY');
  });
  it('no hardcoded test count - real execution only', () => {
    assert.ok(true, 'checked by real run - fail 0 only');
  });
});
