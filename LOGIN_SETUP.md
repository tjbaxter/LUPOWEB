# 🔐 LUPO Login System Setup

## ✅ What's Been Implemented

### 1. **Premium Login Button (Homepage)**
- Added a beautiful, minimalistic Apple-style login button in the top right corner of `index.html`
- Glassmorphic design with subtle hover effects
- Links to `/login.html`
- Fully responsive for mobile devices

### 2. **Login Page (`/login.html`)**
- Premium minimalistic design matching your homepage aesthetic
- Connects to your existing backend API at `/v1/auth/login`
- Auto-detects environment:
  - **Local:** `http://localhost:3000`
  - **Production:** `https://api.lupo.ai`
- Features:
  - Email & password authentication
  - Error handling with smooth animations
  - "Forgot password" link
  - "Don't have an account? Book a Demo" (links to Cal.com)
  - Automatic token storage in localStorage
  - Detects temporary passwords (starting with `Temp-`) and redirects to password change

### 3. **Dashboard Page (`/portal/dashboard.html`)**
- Placeholder dashboard showing user info
- Displays: email, role, tenant name
- Logout functionality
- Protected route (redirects to login if no token)

### 4. **Change Password Page (`/portal/change-password.html`)**
- Forces password change for users with temporary passwords
- Warning banner for temporary password notice
- Password validation (min 8 characters, must match)
- "Skip for now" option
- Ready for backend integration (commented code included)

### 5. **Updated Routing (`_redirects`)**
```
/login               /login.html          200
/portal/*            /portal/:splat       200
```

---

## 🎨 Design Features

### Consistent Apple-Style Aesthetic
- SF Pro Display font family
- Dark theme with subtle gradients
- Glassmorphism effects
- Smooth animations and transitions
- Responsive design for all devices

### Color Palette (from your homepage)
```css
--text-primary: #f5f5f7;
--text-secondary: #a1a1a6;
--bg-primary: #000000;
--bg-secondary: #161617;
--accent: #2997ff;
--accent-hover: #409cff;
--border: rgba(255, 255, 255, 0.08);
```

---

## 🔌 Backend Integration

### Current API Endpoints Used

#### **Login** (Already Working)
```typescript
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "OWNER",
    "tenant": {
      "id": "uuid",
      "name": "Company Name",
      "slug": "company-slug"
    }
  }
}
```

#### **Register** (For Admin Scripts)
```typescript
POST /v1/auth/register
Content-Type: application/json

{
  "tenantName": "Company Name",
  "tenantSlug": "company-slug",
  "email": "user@example.com",
  "password": "Temp-Xk9L-pY3w",  // Generated temp password
  "companyName": "Company Name",
  "plan": "GROWTH" | "SCALE" | "ENTERPRISE"
}
```

### Needed (Optional Enhancement)
```typescript
POST /v1/auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "newPassword": "newsecurepassword"
}
```

---

## 📝 How It Works

### **User Flow (Demo-First Model)**

1. **New Prospect visits homepage** → Clicks "Book Demo" → Scheduled demo call
2. **After demo & payment** → You manually create their account (see below)
3. **You send welcome email** with:
   - Phone number
   - Portal login URL: `https://portal.lupo.ai` (or `https://lupolabs.ai/login`)
   - Email
   - Temporary password (e.g., `Temp-Xk9L-pY3w`)
4. **Customer logs in** → Detects temp password → Redirected to change password page
5. **Sets new password** → Redirected to dashboard

### **Existing Customer Flow**

1. Sees "Login" button in top right of homepage
2. Clicks → Goes to login page
3. Enters credentials → Redirected to dashboard

---

## 🛠️ Next Steps (Admin Scripts)

### Create These Helper Scripts

#### 1. **Create Client Account**
```bash
# scripts/create-client.ts
node scripts/create-client.ts --company "PakEnergy" --email "michelle@pakenergy.com" --plan "GROWTH"

# Output:
# ✅ Client created: PakEnergy
# 📧 Email: michelle@pakenergy.com
# 🔑 Temp Password: Temp-Xk9L-pY3w
# 🔗 Login URL: https://lupolabs.ai/login
```

**Implementation:**
```typescript
import axios from 'axios';

const API_URL = 'http://localhost:3000'; // or production URL

async function createClient(data: {
  companyName: string;
  email: string;
  plan: 'GROWTH' | 'SCALE' | 'ENTERPRISE';
}) {
  const tenantSlug = data.companyName.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
  
  const tempPassword = generateTempPassword();
  
  const response = await axios.post(`${API_URL}/v1/auth/register`, {
    tenantName: data.companyName,
    tenantSlug,
    email: data.email,
    password: tempPassword,
    companyName: data.companyName,
    plan: data.plan,
  });
  
  console.log('✅ Client created:', data.companyName);
  console.log('📧 Email:', data.email);
  console.log('🔑 Temp Password:', tempPassword);
  console.log('🔗 Login URL:', 'https://lupolabs.ai/login');
  
  return { ...response.data, tempPassword };
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const randomPart = () => Array.from({ length: 4 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  
  return `Temp-${randomPart()}-${randomPart()}`;
}
```

#### 2. **Send Welcome Email**
```typescript
// scripts/send-welcome-email.ts
import nodemailer from 'nodemailer';

async function sendWelcomeEmail(data: {
  email: string;
  tempPassword: string;
  phoneNumber: string;
  companyName: string;
}) {
  const transporter = nodemailer.createTransport({
    // Your SMTP config (SendGrid, Gmail, etc.)
  });
  
  await transporter.sendMail({
    from: 'Tom @ LUPO <tom@lupo.ai>',
    to: data.email,
    subject: 'Your LUPO Agent is Live! 🎉',
    html: `
      <h2>Hi ${data.companyName}!</h2>
      <p>Your AI sales agent is ready to take calls.</p>
      
      <h3>Login Details</h3>
      <ul>
        <li><strong>Portal:</strong> <a href="https://lupolabs.ai/login">lupolabs.ai/login</a></li>
        <li><strong>Email:</strong> ${data.email}</li>
        <li><strong>Temporary Password:</strong> ${data.tempPassword}</li>
      </ul>
      
      <p><em>You'll be prompted to change this on first login.</em></p>
      
      <h3>Your Agent's Phone Number</h3>
      <p><strong>${data.phoneNumber}</strong></p>
      
      <p>Call it now and see what happens!</p>
      
      <p>Questions? Just reply to this email.</p>
      <p>Tom<br>LUPO</p>
    `,
  });
}
```

---

## 🧪 Testing Locally

### 1. **Start Your Backend**
```bash
cd "/Users/tombaxter/Agentic Omnissiah Luposis/LUPOSalesAgent/api-backend"
npm run dev
```

### 2. **Start Your Frontend**
```bash
cd /Users/tombaxter/LUPOWEB/LUPOWEB
# Use any local server, e.g.:
python3 -m http.server 8000
# or
npx serve
```

### 3. **Test Login Flow**

#### Create a Test Account
```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Test Company",
    "tenantSlug": "test-company",
    "email": "test@example.com",
    "password": "Temp-Test-1234",
    "companyName": "Test Company",
    "plan": "GROWTH"
  }'
```

#### Login via UI
1. Go to `http://localhost:8000/login.html`
2. Enter: `test@example.com` / `Temp-Test-1234`
3. Click "Login"
4. Should redirect to `/portal/change-password.html` (temp password detected)
5. Set new password
6. Redirected to `/portal/dashboard.html`

---

## 📱 Mobile Responsive

All pages are fully responsive:
- Login button scales down on mobile
- Forms are touch-friendly
- Text sizes adjust appropriately
- Tested on iPhone & Android viewports

---

## 🎯 Key Files Changed/Created

### Modified
- ✏️ `index.html` - Added login button to navigation
- ✏️ `_redirects` - Added login and portal routes

### Created
- ✨ `login.html` - Main login page
- ✨ `portal/dashboard.html` - Protected dashboard
- ✨ `portal/change-password.html` - Password change flow
- 📄 `LOGIN_SETUP.md` - This documentation

---

## 🚀 Deployment Checklist

### Before Going Live

1. **Update Production API URL** (already auto-detected in login.html)
   - Automatically uses `https://api.lupo.ai` in production
   - Uses `http://localhost:3000` in development

2. **Test Full Flow**
   - [ ] Homepage login button works
   - [ ] Login with valid credentials works
   - [ ] Login with invalid credentials shows error
   - [ ] Temp password triggers password change
   - [ ] Dashboard displays user info
   - [ ] Logout works

3. **Backend Endpoint** (Optional)
   - [ ] Implement `/v1/auth/change-password` endpoint
   - [ ] Add password reset functionality

4. **Email Setup**
   - [ ] Configure SMTP for welcome emails
   - [ ] Create welcome email template
   - [ ] Test email delivery

---

## 💡 Pro Tips

### Security
- ✅ Temp passwords start with `Temp-` for easy detection
- ✅ JWT tokens stored in localStorage (upgrade to httpOnly cookies later)
- ✅ Password minimum 8 characters
- ✅ API uses bcrypt for password hashing (already in your backend)

### UX
- ✅ Smooth animations for better feel
- ✅ Clear error messages
- ✅ Auto-focus on email field
- ✅ Loading states on buttons
- ✅ Success feedback before redirects

### Future Enhancements
- 🔜 Remember me functionality
- 🔜 2FA support
- 🔜 Password strength meter
- 🔜 Email verification
- 🔜 OAuth (Google, Microsoft)

---

## 📞 Support

If you need to customize anything, all the code is well-commented and easy to modify.

The design system is consistent across all pages, so any changes to colors, fonts, or spacing can be updated in the CSS variables at the top of each file.

---

**Your login system is ready! 🎉**

Next step: Create those admin scripts to automate client onboarding after demos.

