'use strict';
// Usage: node server/hash-password.cjs "my password"   (prints a value for DASHBOARD_PASSWORD_HASH)
const { hashPassword } = require('./auth.cjs');

const pw = process.argv[2];
if (!pw || pw.length < 10) {
  console.error('Usage: node server/hash-password.cjs "<password of at least 10 characters>"');
  process.exit(1);
}
console.log(hashPassword(pw));
