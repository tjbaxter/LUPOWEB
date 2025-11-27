#!/usr/bin/env node

/**
 * LUPO Admin Script - Create Client Account
 * 
 * Usage:
 *   node scripts/create-client.js --company "PakEnergy" --email "michelle@pakenergy.com" --plan "GROWTH"
 * 
 * Plans: GROWTH, SCALE, ENTERPRISE
 */

const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const isHttps = API_URL.startsWith('https');
const httpModule = isHttps ? https : http;

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    parsed[key] = value;
  }
  
  return parsed;
}

// Generate temporary password
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  
  const randomPart = () => {
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };
  
  return `Temp-${randomPart()}-${randomPart()}`;
}

// Create tenant slug from company name
function createSlug(companyName) {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Make HTTP request
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const req = httpModule.request(url, options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.error || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Create client account
async function createClient(companyName, email, plan) {
  console.log('\n🚀 Creating LUPO client account...\n');
  
  // Validate plan
  const validPlans = ['GROWTH', 'SCALE', 'ENTERPRISE'];
  if (!validPlans.includes(plan.toUpperCase())) {
    throw new Error(`Invalid plan: ${plan}. Must be one of: ${validPlans.join(', ')}`);
  }
  
  // Generate credentials
  const tenantSlug = createSlug(companyName);
  const tempPassword = generateTempPassword();
  
  console.log('📋 Client Details:');
  console.log(`   Company: ${companyName}`);
  console.log(`   Slug: ${tenantSlug}`);
  console.log(`   Email: ${email}`);
  console.log(`   Plan: ${plan.toUpperCase()}`);
  console.log('');
  
  // Prepare request
  const url = new URL(`${API_URL}/v1/auth/register`);
  const requestData = {
    tenantName: companyName,
    tenantSlug,
    email,
    password: tempPassword,
    companyName,
    plan: plan.toUpperCase(),
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(requestData)),
    },
  };
  
  try {
    // Create account
    console.log('⏳ Creating account...');
    const response = await makeRequest(url, options, requestData);
    
    console.log('\n✅ SUCCESS! Client account created.\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 SEND THIS TO CLIENT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`Subject: Your LUPO Agent is Live! 🎉`);
    console.log('');
    console.log(`Hi ${companyName}!`);
    console.log('');
    console.log('Your AI sales agent is ready to take calls.');
    console.log('');
    console.log('Login Details:');
    console.log(`  Portal: https://lupolabs.ai/login`);
    console.log(`  Email: ${email}`);
    console.log(`  Temporary Password: ${tempPassword}`);
    console.log('');
    console.log('(You\'ll be prompted to change your password on first login)');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('💾 Account Info:');
    console.log(`   Tenant ID: ${response.user.tenant.id}`);
    console.log(`   User ID: ${response.user.id}`);
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Provision Twilio phone number');
    console.log('   2. Upload knowledge base documents');
    console.log('   3. Send welcome email to client');
    console.log('   4. Test the agent');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Main
async function main() {
  const args = parseArgs();
  
  // Validate required arguments
  if (!args.company || !args.email || !args.plan) {
    console.error('\n❌ Missing required arguments\n');
    console.log('Usage:');
    console.log('  node scripts/create-client.js --company "Company Name" --email "user@example.com" --plan "GROWTH"\n');
    console.log('Arguments:');
    console.log('  --company   Company name (required)');
    console.log('  --email     Client email (required)');
    console.log('  --plan      Plan tier: GROWTH, SCALE, or ENTERPRISE (required)\n');
    console.log('Example:');
    console.log('  node scripts/create-client.js --company "PakEnergy" --email "michelle@pakenergy.com" --plan "GROWTH"\n');
    process.exit(1);
  }
  
  await createClient(args.company, args.email, args.plan);
}

// Run
main().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});

