require('dotenv').config();
try { require('../config/production')({ ...process.env, NODE_ENV: 'production' }); console.log('Required production settings: present and structurally valid'); } catch (error) { console.error(error.message); process.exitCode = 1; }
const groups = {"email": ["SUPPORT_EMAIL", "EMAIL_PASSWORD"], "AI": ["GEMINI_API_KEY"], "weather": ["OPENWEATHER_API_KEY"], "server maps": ["GOOGLE_MAPS_API_KEY"], "browser maps": ["GOOGLE_MAPS_BROWSER_KEY"], "optional SMS": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]};
for (const [name, keys] of Object.entries(groups)) { const missing = keys.filter(key => !process.env[key]); console.log(name + ': ' + (missing.length ? 'missing ' + missing.join(', ') : 'credentials present; live verification required')); }
// This check never connects to a database or provider and never prints secret values.
