# LUPO Admin Scripts

Administrative scripts for managing LUPO client accounts.

## Available Scripts

### `create-client.js`

Creates a new client account after a demo and payment.

**Usage:**
```bash
node scripts/create-client.js --company "Company Name" --email "user@example.com" --plan "GROWTH"
```

**Arguments:**
- `--company` - Company name (required)
- `--email` - Client email address (required)
- `--plan` - Plan tier: `GROWTH`, `SCALE`, or `ENTERPRISE` (required)

**Example:**
```bash
node scripts/create-client.js \
  --company "PakEnergy" \
  --email "michelle@pakenergy.com" \
  --plan "GROWTH"
```

**Output:**
```
✅ SUCCESS! Client account created.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 SEND THIS TO CLIENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: Your LUPO Agent is Live! 🎉

Hi PakEnergy!

Your AI sales agent is ready to take calls.

Login Details:
  Portal: https://lupolabs.ai/login
  Email: michelle@pakenergy.com
  Temporary Password: Temp-Xk9L-pY3w

(You'll be prompted to change your password on first login)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Environment Variables:**
- `API_URL` - Backend API URL (default: `http://localhost:3000`)

**For Production:**
```bash
API_URL=https://api.lupo.ai node scripts/create-client.js \
  --company "PakEnergy" \
  --email "michelle@pakenergy.com" \
  --plan "GROWTH"
```

---

## Post-Demo Workflow

After a successful demo and payment, follow these steps:

### 1. Create Account
```bash
node scripts/create-client.js \
  --company "ClientCompany" \
  --email "contact@client.com" \
  --plan "GROWTH"
```

### 2. Provision Phone Number
```bash
# TODO: Create this script
# Assigns a Twilio number to the tenant
node scripts/provision-phone.js --tenant-id <id> --area-code 713
```

### 3. Upload Knowledge Base
```bash
# TODO: Create this script
# Uploads company profile, pricing, objections, etc.
node scripts/upload-knowledge.js --tenant-id <id> --file knowledge/client-profile.md
```

### 4. Send Welcome Email
Copy the credentials from step 1 output and send to the client.

### 5. Test the Agent
Call the provisioned number and verify the agent works correctly.

---

## Future Scripts (Coming Soon)

- `provision-phone.js` - Provision Twilio phone number
- `upload-knowledge.js` - Upload knowledge base documents
- `send-welcome-email.js` - Automated welcome email sender
- `delete-client.js` - Safely remove a client account
- `list-clients.js` - View all client accounts
- `update-plan.js` - Change client's billing plan

---

## Notes

- All temporary passwords start with `Temp-` for easy detection
- Passwords are 13 characters: `Temp-XXXX-YYYY`
- Tenant slugs are auto-generated from company names
- First login forces password change

---

## Security

⚠️ **Important:**
- Never commit credentials to git
- Use environment variables for sensitive data
- Store temp passwords securely until sent to client
- Delete temp password records after client changes password

