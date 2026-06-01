const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// ==========================================
// 1. FILL IN YOUR APPLE DETAILS HERE
// ==========================================
const TEAM_ID = 'BHASSRZ89N';       // e.g., '1A2B3C4D5E'
const KEY_ID = '4CUBWYRXX2';         // e.g., 'X7Y8Z9W0V1'
const CLIENT_ID = 'com.bartua1.sharedparking'; // e.g., 'com.sharedparking.app.sid' (or bundle ID if native only)
const P8_FILE_NAME = 'AuthKey_4CUBWYRXX2.p8'; // Exact filename of the .p8 file
// ==========================================

try {
  const p8Path = path.resolve(__dirname, P8_FILE_NAME);
  if (!fs.existsSync(p8Path)) {
    throw new Error(`Could not find the .p8 file at: ${p8Path}\nPlace your downloaded .p8 file in this same folder and update P8_FILE_NAME.`);
  }

  if (TEAM_ID === 'YOUR_TEAM_ID' || KEY_ID === 'YOUR_KEY_ID' || CLIENT_ID === 'YOUR_SERVICES_ID') {
    throw new Error('Please open this script and fill in your actual TEAM_ID, KEY_ID, and CLIENT_ID.');
  }

  const privateKey = fs.readFileSync(p8Path, 'utf8');

  // JWT Header
  const header = {
    alg: 'ES256',
    kid: KEY_ID,
  };

  // JWT Payload (180 days is the maximum Apple allows)
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: now + (180 * 24 * 60 * 60),
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;

  // Sign using ES256 (ECDSA using SHA-256)
  // We use dsaEncoding: 'ieee-p1363' to get the raw signature format (R and S concatenated) required by JWT.
  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  const signature = sign.sign({
    key: privateKey,
    dsaEncoding: 'ieee-p1363'
  }, 'base64url');

  const clientSecret = `${signingInput}.${signature}`;

  console.log('\n=========================================');
  console.log('✅ APPLE CLIENT SECRET GENERATED SUCCESSFULLY');
  console.log('=========================================');
  console.log('Copy the following token and paste it into the "Secret" field under');
  console.log('Authentication -> Providers -> Apple in your Supabase Dashboard:\n');
  console.log(clientSecret);
  console.log('\n=========================================');
  console.log('⚠️ NOTE: Apple requires this to be renewed every 6 months (180 days).');
  console.log('=========================================\n');

} catch (error) {
  console.error('\n❌ Error generating client secret:', error.message);
  process.exit(1);
}
