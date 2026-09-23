const { PHASE_PRODUCTION_BUILD } = require('next/constants');

module.exports = (phase) => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      throw new Error('Production builds require NEXT_PUBLIC_DEMO_MODE=false.');
    }
    const api = process.env.NEXT_PUBLIC_API_URL;
    if (api && api !== '/api') {
      let url;
      try { url = new URL(api); } catch {
        throw new Error('NEXT_PUBLIC_API_URL must be an HTTPS API URL or /api.');
      }
      if (url.protocol !== 'https:' || url.username || url.password ||
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
          url.hostname.endsWith('.localhost')) {
        throw new Error('Production builds require a public HTTPS API URL or /api.');
      }
    }
  }
  return { reactStrictMode: true };
};
