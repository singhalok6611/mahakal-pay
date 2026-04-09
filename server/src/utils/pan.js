// Indian PAN format: 5 letters + 4 digits + 1 letter, e.g. ABCDE1234F
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function normalizePan(pan) {
  return typeof pan === 'string' ? pan.trim().toUpperCase() : '';
}

function isValidPan(pan) {
  return PAN_REGEX.test(normalizePan(pan));
}

module.exports = { normalizePan, isValidPan, PAN_REGEX };
