const nodemailer = require('nodemailer');

function createTransporter(env = process.env, request = (...args) => fetch(...args)) {
  const provider = env.EMAIL_PROVIDER || 'smtp';
  if (provider === 'smtp') {
    return nodemailer.createTransport({ service: 'gmail', auth: {
      user: env.SUPPORT_EMAIL, pass: env.EMAIL_PASSWORD
    }, connectionTimeout: 10000, socketTimeout: 15000 });
  }
  if (provider !== 'gmail-api') throw new Error('Unsupported EMAIL_PROVIDER');
  const composer = nodemailer.createTransport({ streamTransport: true, buffer: true,
    disableFileAccess: true, disableUrlAccess: true });
  return {
    async sendMail(options) {
      if (['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'GMAIL_USER']
          .some(key => !env[key])) throw new Error('Gmail API configuration is incomplete');
      for (const value of [options.to, options.subject, options.replyTo, env.GMAIL_USER]) {
        if (value !== undefined && (typeof value !== 'string' || /[\r\n]/.test(value))) {
          throw new Error('Invalid email header');
        }
      }
      const composed = await composer.sendMail({ ...options,
        from: { name: 'Kissan App', address: env.GMAIL_USER } });
      const tokenResponse = await request('https://oauth2.googleapis.com/token', {
        method: 'POST', signal: AbortSignal.timeout(15000),
        body: new URLSearchParams({ client_id: env.GMAIL_CLIENT_ID,
          client_secret: env.GMAIL_CLIENT_SECRET, refresh_token: env.GMAIL_REFRESH_TOKEN,
          grant_type: 'refresh_token' })
      });
      if (!tokenResponse.ok) throw new Error('Gmail authorization failed');
      const token = await tokenResponse.json();
      if (!token.access_token) throw new Error('Gmail authorization failed');
      // Do not retry a send automatically: a timeout might follow an accepted message.
      const response = await request('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: composed.message.toString('base64url') })
      });
      if (!response.ok) throw new Error('Gmail did not accept the message');
      const result = await response.json();
      if (!result.id) throw new Error('Gmail returned no message ID');
      return { messageId: result.id };
    }
  };
}
module.exports = { createTransporter };
