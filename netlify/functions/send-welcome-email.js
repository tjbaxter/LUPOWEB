const { Resend } = require('resend');

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email, company } = data;

    // Initialize Resend with API key from environment variable
    const resend = new Resend(process.env.RESEND_API_KEY);

    const companyLine = company ? `at ${company}` : '';

    const { data: emailData, error } = await resend.emails.send({
      from: 'Tom from LUPO <tom@lupolabs.ai>',
      to: email,
      subject: 'You\'re in - LUPO Beta Access',
      text: `Hey ${name},

Thanks for signing up. You're on the list for LUPO beta access.

Quick reminder what we're building: AI SDR that answers your inbound calls, qualifies leads on BANT, and books meetings with your team. No more calls to voicemail.

We're onboarding first customers in the next few weeks. Want to jump on a quick call so I can understand your setup and see if you're a good fit for the first batch?

Book a 20-min call: https://cal.com/tombaxter/lupo

Or just reply to this if you have questions.

Tom
Founder, LUPO
lupolabs.ai`,
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
      color: #ffffff !important;
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
      <h1 style="color: #ffffff !important;">You're In - LUPO Beta Access</h1>
      
      <p>Hey ${name},</p>
      
      <p>Thanks for signing up. You're on the list for LUPO beta access.</p>
      
      <p class="highlight">Quick reminder what we're building: AI SDR that answers your inbound calls, qualifies leads on BANT, and books meetings with your team. No more calls to voicemail.</p>
      
      <p><strong>We're onboarding first customers in the next few weeks.</strong> Want to jump on a quick call so I can understand your setup and see if you're a good fit for the first batch?</p>
      
      <a href="https://cal.com/tombaxter/lupo" class="cta">Book a 20-min call</a>
      
      <p style="margin-top: 24px; font-size: 15px; color: #a1a1a6;">Or just reply to this if you have questions.</p>
      
      <div class="signature">
        <p class="name">Tom</p>
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
    });

    if (error) {
      console.error('Error sending email:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to send email' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: emailData?.id })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' })
    };
  }
};

