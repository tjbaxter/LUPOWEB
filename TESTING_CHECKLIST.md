# ✅ Testing Checklist - Hierarchical Context System

## Pre-Test Setup

### 1. Deploy Backend
```bash
cd /Users/tombaxter/LUPOBACKEND/LUPOBACKEND/LUPOBACKEND
# Make sure your backend is running
# fly deploy (if using Fly.io)
```

### 2. Deploy Frontend
```bash
cd /Users/tombaxter/LUPOWEB/LUPOWEB
# Deploy sales-dashboard.html to your hosting
```

### 3. Create Test Users

You'll need:
- **Manager Account**: `manager@testcompany.com` (must be in org.admins array)
- **Rep Account 1**: `rep1@testcompany.com`
- **Rep Account 2**: `rep2@testcompany.com`

---

## Test Suite

### ✅ Test 1: Manager Creates Company Context

**Steps:**
1. Login as `manager@testcompany.com`
2. Navigate to sales dashboard
3. Click "Context" button in header
4. ✅ **Verify**: You see TWO tabs: "My Context" and "Company Template"
5. Click "Company Template" tab
6. ✅ **Verify**: Tab switches, button highlights in blue
7. Enter company context:
   ```
   PRODUCT
   TestCRM
   Sales automation platform
   Target: B2B companies 50+ employees

   PRICING
   Starter: $50/seat/month
   Pro: $100/seat/month
   Enterprise: Contact sales

   OBJECTIONS
   Price → "ROI in 2 months with automation"
   Already have CRM → "We integrate with all major CRMs"
   ```
8. Click "Save Company Template"
9. ✅ **Verify**: Success toast appears
10. ✅ **Verify**: Button says "Save Company Template" (not just "Save")

**Database Check:**
```javascript
// In MongoDB/your DB
db.salesorgs.findOne({ contactEmail: "manager@testcompany.com" })

// Should show:
{
  salesContext: {
    content: "PRODUCT\nTestCRM...",
    extractedFacts: "..."
  },
  companyContext: {
    version: 1,
    lastUpdatedBy: "manager@testcompany.com",
    lastUpdatedAt: ISODate("2025-...")
  }
}
```

**Status:** ⬜ Pass / ⬜ Fail

---

### ✅ Test 2: Rep Sees Company Context Banner

**Steps:**
1. Login as `rep1@testcompany.com` (fresh account, no context yet)
2. Navigate to sales dashboard
3. ✅ **Verify**: Banner appears with message "🎯 Your company has a sales playbook ready"
4. ✅ **Verify**: Banner has "Use Company Context" button
5. Do NOT click it yet

**Status:** ⬜ Pass / ⬜ Fail

---

### ✅ Test 3: Rep Applies Company Context (One-Click)

**Steps:**
1. (Continuing from Test 2)
2. Click "Use Company Context" button
3. ✅ **Verify**: Banner disappears
4. ✅ **Verify**: Success toast appears
5. Click "Context" button
6. ✅ **Verify**: Context editor opens with company content populated
7. ✅ **Verify**: You see TWO tabs: "My Context" and "Company Context"
8. ✅ **Verify**: "My Context" tab is active
9. ✅ **Verify**: Content matches what manager entered

**Database Check:**
```javascript
db.users.findOne({ email: "rep1@testcompany.com" })

// Should show:
{
  salesContext: {
    content: "PRODUCT\nTestCRM...",
    contextSource: "company",
    companyContextVersion: 1,
    lastSyncedAt: ISODate("2025-...")
  }
}
```

**Status:** ⬜ Pass / ⬜ Fail

---

### ✅ Test 4: Rep Views Company Context Tab

**Steps:**
1. (Context editor still open from Test 3)
2. Click "Company Context" tab
3. ✅ **Verify**: Tab switches, button highlights
4. ✅ **Verify**: Content is same as company template
5. ✅ **Verify**: Editor is slightly transparent/disabled (read-only)
6. ✅ **Verify**: "Use This Context" button appears in footer
7. Try to edit the text
8. ✅ **Verify**: Can't edit (disabled state)
9. Click back to "My Context" tab
10. ✅ **Verify**: Editor is editable again

**Status:** ⬜ Pass / ⬜ Fail

---

### ✅ Test 5: Rep Customizes Personal Context

**Steps:**
1. (In "My Context" tab)
2. Add personal customization at the end:
   ```
   
   MY FOCUS
   I specialize in healthcare companies
   Key talking points:
   - HIPAA compliance built-in
   - Integrates with Epic/Cerner
   ```
3. Click "Save"
4. ✅ **Verify**: Success toast appears
5. Close and reopen context editor
6. ✅ **Verify**: Your personal additions are still there
7. Switch to "Company Context" tab
8. ✅ **Verify**: Company context does NOT have your additions (separate)

**Database Check:**
```javascript
db.users.findOne({ email: "rep1@testcompany.com" })

// Should show:
{
  salesContext: {
    content: "PRODUCT\nTestCRM... MY FOCUS...",
    contextSource: "custom",  // Changed from "company"
    customOverrides: "MY FOCUS..."
  }
}
```

**Status:** ⬜ Pass / ⬜ Fail

---

### ✅ Test 6: Manager Updates Company Context

**Steps:**
1. Login as `manager@testcompany.com`
2. Open context editor
3. Switch to "Company Template" tab
4. Update pricing:
   ```
   PRICING
   Starter: $75/seat/month (was $50)
   Pro: $150/seat/month (was $100)
   Enterprise: Contact sales
   ```
5. Click "Save Company Template"
6. ✅ **Verify**: Success toast with "All reps can now use this context"
7. ✅ **Verify**: No errors

**Database Check:**
```javascript
db.salesorgs.findOne({ contactEmail: "manager@testcompany.com" })

// Should show:
{
  companyContext: {
    version: 2,  // Incremented from 1
    lastUpdatedBy: "manager@testcompany.com",
    changeLog: [
      { version: 2, summary: "Company context updated", ... }
    ]
  }
}
```

**Status:** ⬜ Pass / ⬜ Fail

---

### ✅ Test 7: Rep Sees "Context Updated" Banner

**Steps:**
1. Login as `rep2@testcompany.com` (different rep who used company context)
2. Make sure they applied company context first (follow Test 2-3)
3. Logout and wait for manager to update (Test 6)
4. Login again as `rep2@testcompany.com`
5. Refresh page
6. ✅ **Verify**: Banner appears: "🔔 Company context updated"
7. ✅ **Verify**: Banner has "View Updates" button

**Note:** This requires `rep2` to have `contextSource: "company"` and `companyContextVersion: 1` (before update)

**Status:** ⬜ Pass / ⬜ Fail

---

### ✅ Test 8: Rep Applies Updated Company Context

**Steps:**
1. (Continuing from Test 7)
2. Click "View Updates" button
3. ✅ **Verify**: Context editor opens
4. ✅ **Verify**: "Company Context" tab is active (not personal)
5. ✅ **Verify**: Shows updated pricing ($75, $150)
6. Click "Use This Context"
7. ✅ **Verify**: Success toast
8. Switch to "My Context" tab
9. ✅ **Verify**: Personal context now has updated pricing

**Database Check:**
```javascript
db.users.findOne({ email: "rep2@testcompany.com" })

// Should show:
{
  salesContext: {
    companyContextVersion: 2,  // Updated from 1
    lastSyncedAt: ISODate("2025-...")
  }
}
```

**Status:** ⬜ Pass / ⬜ Fail

---

### ✅ Test 9: Admin Onboarding Flow

**Steps:**
1. Create NEW admin user: `newadmin@testcompany.com`
2. Add to `org.admins` array
3. Login as `newadmin@testcompany.com`
4. Click "Add Context" (should see banner)
5. Go through onboarding wizard (3 steps)
6. Fill out:
   - Product: "TestCRM v2"
   - Pricing: "$200/seat"
   - etc.
7. Click "Complete Setup"
8. ✅ **Verify**: Prompt appears: "Save as company template?"
9. Click "OK" (Yes, save as company)
10. ✅ **Verify**: Success toast mentions "company template"
11. ✅ **Verify**: Context editor opens with two tabs

**Database Check:**
```javascript
db.salesorgs.findOne()

// Should show:
{
  companyContext: {
    version: 3,  // Incremented
    lastUpdatedBy: "newadmin@testcompany.com"
  }
}
```

**Status:** ⬜ Pass / ⬜ Fail

---

### ✅ Test 10: Non-Admin Has No Company Tab

**Steps:**
1. Manually remove company context from DB (for this test only):
   ```javascript
   db.salesorgs.updateOne(
     { contactEmail: "manager@testcompany.com" },
     { $set: { "salesContext.content": "" } }
   )
   ```
2. Login as `rep1@testcompany.com`
3. Open context editor
4. ✅ **Verify**: Only ONE tab: "My Context"
5. ✅ **Verify**: No "Company Context" tab
6. Can edit and save normally

**Restore:**
```javascript
// Put company context back
db.salesorgs.updateOne(
  { contactEmail: "manager@testcompany.com" },
  { $set: { "salesContext.content": "PRODUCT\nTestCRM..." } }
)
```

**Status:** ⬜ Pass / ⬜ Fail

---

## API Testing (cURL)

### Test API Endpoints Directly

**1. Get Context Status**
```bash
curl -X GET \
  https://lupo-backend.fly.dev/sales/context-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "status": {
    "contextSource": "company",
    "userVersion": 2,
    "companyVersion": 2,
    "isOutOfDate": false,
    "hasCompanyContext": true
  }
}
```

**2. Apply Company Context**
```bash
curl -X POST \
  https://lupo-backend.fly.dev/sales/apply-company-context \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Company context applied successfully",
  "version": 2
}
```

**3. Update Company Context (Admin Only)**
```bash
curl -X POST \
  https://lupo-backend.fly.dev/sales/company-context \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated company context...",
    "summary": "Q4 pricing update"
  }'
```

---

## Common Issues & Fixes

### ❌ Issue: "Only admins can update company context"
**Fix:** Make sure user email is in `SalesOrg.admins` array:
```javascript
db.salesorgs.updateOne(
  { contactEmail: "manager@testcompany.com" },
  { $push: { admins: { email: "manager@testcompany.com", role: "owner" } } }
)
```

### ❌ Issue: Banner doesn't show
**Fix:** Clear localStorage:
```javascript
localStorage.removeItem('lupo_context_banner_dismissed');
```

### ❌ Issue: Can't see company context tab
**Fix:** Verify company has context:
```javascript
db.salesorgs.findOne().salesContext.content
// Should NOT be empty
```

### ❌ Issue: Rep sees admin features
**Fix:** Check `isUserAdmin` flag in console:
```javascript
console.log('isUserAdmin:', isUserAdmin);
```

---

## Performance Testing

### Load Test: 100 Reps Apply Company Context

**Setup:**
```javascript
// Create 100 test users
for (let i = 0; i < 100; i++) {
  db.users.insertOne({
    email: `rep${i}@testcompany.com`,
    organizationId: ObjectId("YOUR_ORG_ID"),
    salesContext: { content: "", contextSource: "custom" }
  });
}
```

**Test:**
```bash
# Time how long it takes for all to apply
for i in {1..100}; do
  curl -X POST https://lupo-backend.fly.dev/sales/apply-company-context \
    -H "Authorization: Bearer ${TOKEN}" &
done
wait
```

**Expected:** All complete within 10 seconds

---

## Success Criteria

✅ All 10 functional tests pass
✅ No console errors in browser
✅ No backend errors in logs
✅ Database correctly stores version info
✅ Banners show/hide appropriately
✅ Context inheritance works correctly
✅ Admin vs rep permissions work
✅ One-click apply takes < 2 seconds
✅ UI is responsive and intuitive
✅ Backward compatible with existing users

---

## Sign-Off

Once all tests pass:

- [ ] Backend deployed to production
- [ ] Frontend deployed to production
- [ ] Test users created and verified
- [ ] All 10 functional tests passed
- [ ] API tests successful
- [ ] Performance acceptable
- [ ] Documentation reviewed
- [ ] Team trained on new feature

**Tested By:** _______________
**Date:** _______________
**Status:** ⬜ Ready for Production / ⬜ Needs Fixes

