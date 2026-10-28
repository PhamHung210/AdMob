/** Shared across both screens. Time measured from the last OPENED event. */
const COOLDOWN_MS = 3 * 60 * 1000;
function canShowInterstitial(lastShownAt, now = Date.now()) {
  return lastShownAt === null || (now >= lastShownAt && now - lastShownAt >= COOLDOWN_MS);
}
module.exports = { COOLDOWN_MS, canShowInterstitial };
