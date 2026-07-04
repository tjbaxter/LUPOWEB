const { Resend } = require('resend');

// River is about freemail, so the waitlist only accepts work emails. The client
// blocks these already; this is a server-side backstop so a forged POST can't
// email a personal-domain signup through.
const FREEMAIL = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.co.uk', 'hotmail.com', 'hotmail.co.uk',
  'live.com', 'live.co.uk', 'msn.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'ymail.com',
  'rocketmail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'aim.com', 'proton.me',
  'protonmail.com', 'pm.me', 'gmx.com', 'gmx.de', 'mail.com', 'zoho.com', 'yandex.com', 'yandex.ru',
  'fastmail.com', 'hey.com', 'tutanota.com', 'tuta.io', 'hushmail.com', 'mail.ru', 'inbox.com',
  'qq.com', '163.com', '126.com'
]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { email } = JSON.parse(event.body || '{}');
    const value = (email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'invalid email' }) };
    }
    const domain = value.slice(value.lastIndexOf('@') + 1);
    if (FREEMAIL.has(domain)) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'freemail' }) };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: 'Project River <tom@lupolabs.ai>',
      to: 'tom@lupolabs.ai',
      replyTo: value,
      subject: `New Project River signup: ${value}`,
      text: `New Project River waitlist signup.

Email:  ${value}
Domain: ${domain}
Time:   ${new Date().toISOString()}

(via lupolabs.ai/river)`
    });

    if (error) {
      console.error('river-notify send error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'send failed' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, id: data && data.id }) };
  } catch (err) {
    console.error('river-notify error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'error' }) };
  }
};
