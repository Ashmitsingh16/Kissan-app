// Run only after independently verifying the officer's identity.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
async function main() {
  const email = process.argv[2];
  if (!email) throw new Error('Usage: node scripts/approve-officer.js officer@example.com');
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { $set: { userType: 'government', isVerified: true } }, { new: true }
  );
  if (!user) throw new Error('Register the account as a farmer first, then approve it here.');
  console.log('Government access approved for the specified account.');
}
main().catch(err => { console.error(err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
