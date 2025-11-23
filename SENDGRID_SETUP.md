# SendGrid Setup for LUPO Welcome Emails

## 🎯 What This Does

When someone submits the "Join Early Access" form, they automatically receive a premium welcome email from **tom@lupolabs.ai**.

---

## 📧 Setup Steps (5 minutes)

### 1. Create Free SendGrid Account

1. Go to [https://signup.sendgrid.com/](https://signup.sendgrid.com/)
2. Sign up with your email
3. Verify your email address

### 2. Verify Your Sender Email (tom@lupolabs.ai)

1. In SendGrid dashboard, go to **Settings > Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in:
   - **From Name:** Tom from LUPO
   - **From Email:** tom@lupolabs.ai
   - **Reply To:** tom@lupolabs.ai
   - **Company:** Flair Technologies Ltd
   - **Address:** 45 Fitzroy St, Fitzrovia
   - **City:** London
   - **Postal Code:** W1T 6EB
   - **Country:** United Kingdom
4. Click **Create**
5. **Check your tom@lupolabs.ai inbox** for verification email
6. Click the verification link

### 3. Get Your API Key

1. In SendGrid, go to **Settings > API Keys**
2. Click **Create API Key**
3. Name it: `LUPO Netlify Function`
4. Select **Full Access** (or at least **Mail Send**)
5. Click **Create & View**
6. **Copy the API key** (you won't see it again!)

### 4. Add API Key to Netlify

1. Go to your Netlify dashboard
2. Select your LUPO site
3. Go to **Site settings > Environment variables**
4. Click **Add a variable**
5. Set:
   - **Key:** `SENDGRID_API_KEY`
   - **Value:** [paste the API key you copied]
6. Click **Save**

### 5. Deploy

1. Commit and push your code to GitHub
2. Netlify will automatically deploy
3. Test the form!

---

## ✅ Testing

1. Go to your live site
2. Click "Join early access"
3. Fill in the form with **your email**
4. Submit
5. Check your inbox for the welcome email!

---

## 📧 Email Preview

**Subject:** Welcome to LUPO Early Access

**From:** Tom from LUPO <tom@lupolabs.ai>

**Content:**
- Premium dark-mode design matching your brand
- Personal message from Tom
- CTA to book a chat
- Company footer

---

## 🔧 Troubleshooting

**Email not sending?**
1. Check Netlify Functions logs: Site > Functions > send-welcome-email
2. Verify API key is set correctly in Netlify
3. Make sure tom@lupolabs.ai is verified in SendGrid
4. Check SendGrid > Activity for delivery status

**Still not working?**
- Check your Netlify build logs for errors
- Make sure package.json was deployed in netlify/functions/
- Verify the function is showing up in Netlify dashboard

---

## 💰 Costs

**SendGrid Free Tier:**
- 100 emails/day free forever
- Perfect for early access signups

If you need more, upgrade to:
- Essentials: $19.95/month for 50,000 emails
- Pro: $89.95/month for 100,000 emails

---

## 🎨 Email Template

The email is fully branded with:
- LUPO logo
- Purple gradient heading
- Dark mode design
- Professional signature
- Company footer
- "Book a Quick Chat" CTA linking to your Cal.com

You can customize it by editing:
`/netlify/functions/send-welcome-email.js`

