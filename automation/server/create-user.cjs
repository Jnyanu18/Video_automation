'use strict';
// Creates (or re-passwords) a pilot account. Invited clients get an account this way; there is no sign-up page.
//   npm run create-user -- "client@example.com" "<password of at least 10 characters>" ["Display Name"]
//   npm run create-user -- --list
//   npm run create-user -- --reset "client@example.com" "<new password>"
// The account list lives in server/storage/users.json (gitignored: it holds real scrypt password hashes).
const { loadConfig } = require('./config.cjs');
const { createUsers } = require('./users.cjs');
const { loadEnvFiles } = require('./env.cjs');

const USAGE = [
  'Usage:',
  '  npm run create-user -- "<email>" "<password, 10+ chars>" ["Display Name"]',
  '  npm run create-user -- --reset "<email>" "<new password>"',
  '  npm run create-user -- --list',
].join('\n');

function main(argv) {
  // Same env files the server reads, so this always writes the users.json the server loads.
  const cfg = loadConfig(loadEnvFiles(process.env).env);
  const users = createUsers(cfg);
  const args = argv.slice(2);

  if (args[0] === '--list') {
    const list = users.list();
    if (!list.length) console.log('No accounts yet in ' + users.file);
    list.forEach((u) => console.log(`${u.id}  ${u.email}  (created ${u.created_at})`));
    return 0;
  }
  if (args[0] === '--reset') {
    const u = users.setPassword(args[1], args[2]);
    console.log(`Password updated for ${u.email} (id ${u.id})`);
    return 0;
  }
  if (args.length < 2) {
    console.error(USAGE);
    return 1;
  }
  const u = users.create(args[0], args[1], args[2]);
  console.log(`Created account ${u.email}`);
  console.log(`  id:   ${u.id}`);
  console.log(`  file: ${users.file}`);
  console.log('This id is the name of the account folder used for uploads and for the engine workspace.');
  return 0;
}

try {
  process.exit(main(process.argv));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
