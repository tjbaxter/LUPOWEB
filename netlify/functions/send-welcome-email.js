const sgMail = require('@sendgrid/mail');

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email, company } = data;

    // Set SendGrid API key from environment variable
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const companyLine = company ? `at ${company}` : '';

    const msg = {
      to: email,
      from: {
        email: 'tom@lupolabs.ai',
        name: 'Tom from LUPO'
      },
      subject: 'Welcome to LUPO Early Access',
      text: `Hi ${name},

Thanks for joining the LUPO early access program.

We're building an AI SDR that answers every inbound call and qualifies leads instantly — real-time response, precise BANT qualification, and seamless human handoffs.

You're on the list for Q1 2026.

I'll reach out personally when we're ready for your team to go live.

In the meantime, if you'd like to chat about your current inbound call workflow or have specific requirements, just reply to this email.

Tom Baxter
Founder, LUPO
https://lupolabs.ai`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Display', sans-serif;
      background: #000000;
      color: #f5f5f7;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 60px 20px;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin-bottom: 40px;
    }
    .content {
      background: linear-gradient(135deg, #161617 0%, #1a1a1e 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 48px 40px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      line-height: 1.3;
      margin: 0 0 24px 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      color: #a1a1a6;
      margin: 0 0 20px 0;
    }
    .highlight {
      color: #f5f5f7;
      font-weight: 500;
    }
    .cta {
      display: inline-block;
      margin-top: 32px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #2997ff, #5090ff);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 500;
    }
    .signature {
      margin-top: 40px;
      padding-top: 32px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .signature p {
      margin: 4px 0;
      font-size: 15px;
    }
    .signature .name {
      color: #f5f5f7;
      font-weight: 600;
    }
    .signature .title {
      color: #a1a1a6;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 32px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .footer p {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.35);
      margin: 8px 0;
    }
    .footer a {
      color: #2997ff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">LUPO</div>
    
    <div class="content">
      <h1>Welcome to LUPO Early Access</h1>
      
      <p>Hi ${name},</p>
      
      <p>Thanks for joining the LUPO early access program.</p>
      
      <p class="highlight">We're building an AI SDR that answers every inbound call and qualifies leads instantly — real-time response, precise BANT qualification, and seamless human handoffs.</p>
      
      <p>You're on the list for <strong>Q1 2026</strong>.</p>
      
      <p>I'll reach out personally when we're ready for your team to go live.</p>
      
      <p>In the meantime, if you'd like to chat about your current inbound call workflow or have specific requirements, just reply to this email.</p>
      
      <a href="https://cal.com/tombaxter/lupo" class="cta">Book a Quick Chat</a>
      
      <div class="signature">
        <p class="name">Tom Baxter</p>
        <p class="title">Founder, LUPO</p>
        <p class="title"><a href="https://lupolabs.ai" style="color: #2997ff;">lupolabs.ai</a></p>
      </div>
    </div>
    
    <div class="footer">
      <p>© 2025 LUPO, a product of Flair Technologies Ltd.</p>
      <p>Registered Office · 45 Fitzroy St, Fitzrovia · London, W1T 6EB, United Kingdom</p>
    </div>
  </div>
</body>
</html>
      `
    };

    await sgMail.send(msg);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' })
    };
  }
};

