const test = require('node:test');
const assert = require('node:assert/strict');
const { COOLDOWN_MS, canShowInterstitial } = require('../src/cooldown.cjs');
test('three minutes', () => assert.equal(COOLDOWN_MS, 180_000));
test('first ad is allowed', () => assert.equal(canShowInterstitial(null, 1000), true));
test('before 3 minutes: blocked', () => assert.equal(canShowInterstitial(1000, 180999), false));
test('exactly 3 minutes: allowed', () => assert.equal(canShowInterstitial(1000, 181000), true));
test('clock moving backwards: blocked', () => assert.equal(canShowInterstitial(1000, 999), false));
