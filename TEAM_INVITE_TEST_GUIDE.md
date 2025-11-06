# 🧪 TEAM INVITE - QUICK TEST GUIDE

## **Test the Fix (3 minutes)**

### **Prerequisites:**
- ✅ Both `signup.html` and `join.html` deployed to web server
- ✅ Backend is running

---

## **Test 1: New User Flow (Main Test)**

### **Step 1: Create Team & Get Invite Link**
```
1. Go to: https://lupolabs.ai/team-setup.html
2. Create a team (or use existing manager account)
3. Go to manager dashboard
4. Click "Invite Team"
5. Copy the invite link: https://lupolabs.ai/join.html?token=XXXXXX
```

### **Step 2: Test as Team Member**
```
1. Open invite link in INCOGNITO/PRIVATE browser
2. Should see: "Welcome to LUPO - [Company Name] invited you..."
3. Open browser console (F12)
4. Look for: "✅ Stored invite token for signup: XXXXXX"
```

### **Step 3: Download & Open App**
```
1. Download LUPO for your platform
2. Install and open the app
3. Should open signup.html
```

### **Step 4: Sign Up**
```
1. Enter email (use different email than manager)
2. Enter password
3. Click "Create Account"
4. Look in console for:
   "✅ Found pending invite token in storage: XXXXXX"
   "✅ Successfully joined organization: [Company Name]"
```

### **Step 5: Verify Success** ✅
```
1. Should see: "Welcome to [Company Name]!" success screen
2. Go to manager dashboard
3. Should see new team member listed
4. Check their account in database:
   - organizationId: [should match company]
   - accountType: 'team_member'
   - subscriptionTier: 'enterprise'
```

---

## **Test 2: OAuth Signup Flow**

### **Steps:**
```
1. Get invite link (same as Test 1)
2. Open in incognito browser
3. Click "Continue with Google"
4. Complete OAuth
5. Should automatically join team
6. Look for: "✅ Found pending invite token in storage for OAuth"
```

---

## **Test 3: Token Cleanup**

### **Steps:**
```
1. Complete Test 1 or Test 2
2. After successful signup, open browser console
3. Run: localStorage.getItem('pendingInviteToken')
4. Should return: null ✅ (token was cleaned up)
```

---

## **Test 4: Existing User Flow**

### **Steps:**
```
1. User already has LUPO app installed
2. User clicks invite link
3. Should see helpful note:
   "Already have LUPO installed? Just sign up in the app..."
4. User opens app manually
5. User signs up
6. Should still join team (token from localStorage)
```

---

## **Quick Debug Commands**

### **Check if token is stored:**
```javascript
// In browser console
localStorage.getItem('pendingInviteToken')
sessionStorage.getItem('pendingInviteToken')
```

### **Manually set token (for testing):**
```javascript
localStorage.setItem('pendingInviteToken', 'YOUR_TOKEN_HERE')
```

### **Clear token (for re-testing):**
```javascript
localStorage.removeItem('pendingInviteToken')
sessionStorage.removeItem('pendingInviteToken')
```

### **Check user's organization (after signup):**
```javascript
// In Electron app console
lupoSession.get('organizationId').then(console.log)
```

---

## **Expected Console Logs (Success)**

### **In join.html:**
```
🔍 Checking invite token: 74J870BO...
✅ Valid invite for: Acme Sales Team
✅ Stored invite token for signup: 74J870BO...
```

### **In signup.html:**
```
✅ Found pending invite token in storage: 74J870BO...
✅ Successfully joined organization: Acme Sales Team
```

### **Backend logs:**
```
🔍 Checking invite token: 74J870BO...
✅ Valid invite for: Acme Sales Team
👥 Team join request: { inviteToken: '74J870BO...', email: 'user@example.com' }
✅ User joined team: { user: 'user@example.com', org: 'Acme Sales Team' }
```

---

## **Common Issues & Fixes**

### **Issue: Token not found in signup.html**
```
❌ Symptom: User creates individual account instead of joining team

✅ Check:
1. Is token stored? localStorage.getItem('pendingInviteToken')
2. Is signup.html latest version?
3. Check browser console for any errors
```

### **Issue: "Invalid invite link"**
```
❌ Symptom: join.html shows error

✅ Check:
1. Is backend running?
2. Is token expired? (Check in database)
3. Has org reached max seats?
```

### **Issue: Account created but not joined to org**
```
❌ Symptom: Console shows warning, user not in team

✅ Check:
1. Backend logs for /api/team/invite/accept errors
2. Is org at capacity?
3. Is user already in another org?
```

---

## **Rollback Plan (If Issues)**

### **If new flow breaks:**
```bash
# 1. Revert signup.html to previous version
git checkout HEAD~1 -- signup.html

# 2. Deploy old version

# 3. Old flow still works via URL params:
#    https://lupolabs.ai/signup.html?invite=TOKEN
```

---

## **Database Verification Queries**

### **Check if user joined team:**
```javascript
// MongoDB
db.users.findOne({ email: 'user@example.com' })

// Should see:
{
  email: 'user@example.com',
  organizationId: ObjectId("..."), // ✅ Should be set
  accountType: 'team_member',      // ✅ Should be team_member
  subscriptionTier: 'enterprise'   // ✅ Should be enterprise
}
```

### **Check org seat count:**
```javascript
db.salesorgs.findOne({ companyName: 'Acme Sales Team' })

// Should see:
{
  companyName: 'Acme Sales Team',
  planDetails: {
    maxUsers: 5,
    activeUsers: 2  // ✅ Should increment
  }
}
```

### **Check invite token usage:**
```javascript
db.invitetokens.findOne({ token: '74J870BO17h8IKcO' })

// Should see:
{
  token: '74J870BO17h8IKcO',
  usedCount: 1,  // ✅ Should increment
  usedBy: [
    {
      userId: ObjectId("..."),
      email: 'user@example.com',
      usedAt: ISODate("...")
    }
  ]
}
```

---

## **Performance Metrics**

Track these in analytics:

```javascript
// Successful invite acceptance rate
(Invites Accepted / Invites Sent) × 100

// Time from invite click to account creation
timestamp(account_created) - timestamp(invite_clicked)

// Failed join attempts
Count of signup WITHOUT organizationId when token present
```

---

## **Success Criteria** ✅

- [ ] Team member clicks invite link
- [ ] join.html validates and stores token
- [ ] Team member downloads app (if needed)
- [ ] signup.html finds token in localStorage
- [ ] Account created with organizationId set
- [ ] Team member appears in manager dashboard
- [ ] Org seat count incremented
- [ ] Invite token usedCount incremented
- [ ] Token cleaned up from localStorage

---

**Last Updated:** November 6, 2025

