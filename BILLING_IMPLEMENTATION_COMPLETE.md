# LUPO Billing & Subscription Management - Implementation Summary

## Overview
Created a premium, minimalist billing/subscription management system for LUPO Enterprise with proper 7-day trial handling, seat locking during trial, and Stripe integration.

---

## What Was Built

### 1. Frontend - Billing Page (`manager-billing.html`)

**Premium Minimalist Design:**
- Matches manager dashboard styling (dark theme, clean typography, lots of whitespace)
- No clutter - subtle dividers instead of boxes
- Inspired by Stripe/Linear billing pages

**Key Sections:**

#### A. Current Plan Overview
- Plan name (Enterprise)
- Monthly cost (calculated from seats × $200)
- Status badge (Trial, Active, Payment Failed, Canceling)
- Next billing date OR "First Charge" (during trial)

**During Trial (Days 1-7):**
```
Trial - 3 days left
$1,200/month
First Charge: Nov 14, 2025
```

**After Trial:**
```
Active
$1,200/month
Next Billing: Dec 14, 2025
```

#### B. Team Seats Management
- Shows active/total seats
- "Adjust Seats" button opens modal

**Trial Seat Rules (Implemented):**
- ✅ Can ADD seats during trial
- ❌ CANNOT remove seats during trial
- Clear warning shown in modal
- Confirmation dialog when adding seats:
  > "Add 2 seats?
  > 
  > Your first charge on Nov 14, 2025 will be $1,400 (7 seats × $200).
  > 
  > You won't be able to remove these seats until after your first billing cycle."

**After Trial:**
- Can add/remove seats freely
- Instant proration via Stripe

#### C. Payment Method
- Shows card brand (Visa, Mastercard, etc.)
- Shows last 4 digits
- "Update Payment Method" → redirects to Stripe billing portal

#### D. Billing History
- Table showing past invoices
- Date, Amount, Status, Download link
- Empty state during trial: "No billing history yet - you're in your free trial"

#### E. Cancel Subscription
- Small grey link at bottom (not prominent)
- Opens confirmation modal
- Cancels at period end (access continues until then)

---

### 2. Backend - Billing Endpoints (`/routes/billing.js`)

**Created 6 new endpoints:**

#### `GET /api/billing/subscription`
Returns current subscription details:
```json
{
  "plan": "Enterprise",
  "status": "trialing", // or "active", "past_due", "canceled"
  "totalSeats": 10,
  "activeSeats": 3,
  "monthlyCost": 2000,
  "pricePerSeat": 200,
  "nextBillingDate": "2025-11-14T00:00:00Z",
  "trialEndsAt": "2025-11-14T00:00:00Z",
  "isTrialing": true,
  "cancelAtPeriodEnd": false,
  "paymentMethod": {
    "brand": "visa",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2026
  }
}
```

#### `POST /api/billing/update-seats`
Update seat count with trial validation:
```javascript
// Request
{ "seats": 12 }

// During trial - REJECTS if reducing seats
// After trial - allows add/remove with proration
```

**Logic:**
```javascript
if (subscription.status === 'trialing') {
  if (seats < currentSeats) {
    return error('Cannot reduce seats during trial');
  }
}

// Update Stripe subscription
await stripe.subscriptions.update(subId, {
  items: [{ id: itemId, quantity: seats }],
  proration_behavior: isTrialing ? 'none' : 'create_prorations'
});
```

#### `GET /api/billing/invoices`
Returns list of past invoices from Stripe:
```json
{
  "invoices": [
    {
      "id": "in_xxx",
      "date": "2025-11-14T00:00:00Z",
      "amount": "2000.00",
      "status": "paid",
      "invoiceUrl": "https://invoice.stripe.com/...",
      "invoiceNumber": "ABC-1234"
    }
  ]
}
```

#### `POST /api/billing/create-portal-session`
Creates Stripe billing portal session (for payment method updates):
```javascript
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: 'https://lupolabs.ai/manager-billing.html'
});

return { url: session.url };
```

#### `POST /api/billing/cancel`
Cancel subscription at period end:
```javascript
// Request (optional)
{ "immediate": false }

// Default: cancel at period end (keeps access)
await stripe.subscriptions.update(subId, {
  cancel_at_period_end: true
});
```

#### `POST /api/billing/reactivate`
Reactivate a canceled subscription:
```javascript
await stripe.subscriptions.update(subId, {
  cancel_at_period_end: false
});
```

---

## Trial Billing Flow (Detailed)

### Signup Flow
**Nov 7, 2025 - Manager signs up:**
1. Enters payment info in Stripe Checkout
2. Stripe creates subscription with `trial_period_days: 7`
3. Payment method stored but NOT charged ($0 today)
4. Full access to all features immediately

**Stripe Subscription Created:**
```javascript
{
  status: 'trialing',
  trial_end: 1731542400, // Nov 14, 2025 (7 days later)
  items: [{ quantity: 10 }], // 10 seats
  current_period_end: 1731542400
}
```

### During Trial (Nov 7-13)
**Manager can:**
- Add seats (increases first charge)
- Update payment method
- Cancel anytime for $0

**Manager CANNOT:**
- Remove seats (locked until after first charge)

**Example: Adding seats on Day 3 (Nov 9):**
```javascript
// Started with 10 seats
// Add 2 seats → now 12 seats

// First charge on Nov 14 will be:
// 12 seats × $200 = $2,400
```

### Day 7 - Nov 14, 2025
**Automatic charge:**
- Stripe charges payment method for current seat count
- If card succeeds → subscription becomes `status: 'active'`
- If card fails → subscription becomes `status: 'past_due'` (should suspend access)
- Billing anniversary is now the 14th of every month

### After Trial (Nov 15+)
**Manager can now:**
- Add seats (prorated immediately)
- Remove seats (prorated immediately)
- Cancel (access until end of period)

**Example: Adding 2 seats on Nov 20 (6 days after trial):**
```javascript
// Current: 10 seats @ $2,000/month
// Add 2 → 12 seats @ $2,400/month

// Proration:
// ~24 days left in billing period
// Immediate charge: 2 seats × $200 × (24/30) = $320
// Next full month (Dec 14): $2,400
```

---

## Seat Locking Logic (Critical)

### Why Lock Seats During Trial?
Prevents abuse:
- Manager signs up with 100 seats
- Invites 100 reps to test during trial
- Reduces to 5 seats before day 7
- You pay API costs for 100 seats but only get paid for 5

### Implementation
**During Trial:**
```javascript
// In UI
input.min = currentSeats; // HTML validation

// In backend
if (subscription.status === 'trialing' && newSeats < currentSeats) {
  return error({
    message: 'Cannot reduce seats during trial',
    currentSeats,
    requestedSeats: newSeats
  });
}
```

**After Trial:**
```javascript
// No restrictions
input.min = 1;
// Can reduce to minimum 1 seat
```

---

## Manager Seat (`has_call_access`)

When manager checks "Include manager seat" at signup:
- Adds +1 to seat count
- Sets `user.has_call_access = true` in MongoDB
- Manager can use LUPO themselves (not just admin-only)

**Pricing:**
- 5 rep seats + 1 manager seat = 6 total seats
- 6 × $200 = $1,200/month

**Can they toggle it later?**
Yes (future feature):
- Manager goes to their profile
- Toggles "Give me call access"
- Backend updates:
  - `user.has_call_access = true/false`
  - Stripe subscription seats ±1
  - Prorates if post-trial

---

## Integration Points

### Manager Dashboard → Billing Page
```javascript
// In manager-dashboard.html
billingBtn.addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = '/manager-billing.html';
});
```

**Authentication:**
- Token stored in `localStorage.getItem('lupo_manager_token')`
- Billing page reads token and passes to API
- All endpoints protected with `requireAuth` middleware

### Stripe Checkout → Manager Dashboard
```javascript
// After successful payment in team-checkout.js
res.redirect(
  `https://lupolabs.ai/manager-dashboard.html?token=${jwt_token}`
);
```

---

## Files Created/Modified

### Created:
1. `/Users/tombaxter/LUPOWEB/LUPOWEB/manager-billing.html` (NEW)
   - Premium billing page with trial handling
   - Seat locking UI
   - Clear warnings and confirmations

2. `/Users/tombaxter/LUPOBACKEND/LUPOBACKEND/LUPOBACKEND/routes/billing.js` (NEW)
   - 6 billing endpoints
   - Trial validation
   - Stripe integration

### Modified:
1. `/Users/tombaxter/LUPOBACKEND/LUPOBACKEND/LUPOBACKEND/server.js`
   - Added billing routes: `app.use('/api/billing', billingRouter)`

2. `/Users/tombaxter/LUPOWEB/LUPOWEB/manager-dashboard.html`
   - Updated "Manage Subscription" button to navigate to billing page

---

## Next Steps (Not Yet Implemented)

### 1. Stripe Webhooks (CRITICAL)
You MUST set up webhooks or database will be out of sync:

```javascript
// POST /webhook/stripe
app.post('/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  switch (event.type) {
    case 'customer.subscription.updated':
      // Update MongoDB with new seat count, status, etc.
      break;
      
    case 'invoice.payment_succeeded':
      // Mark org as active, update billing history
      break;
      
    case 'invoice.payment_failed':
      // Suspend access, send alert
      break;
      
    case 'customer.subscription.deleted':
      // Mark org as canceled
      break;
      
    case 'customer.subscription.trial_will_end':
      // Send reminder email 1 day before trial ends
      break;
  }
  
  res.json({received: true});
});
```

**Set up in Stripe Dashboard:**
1. Go to Developers → Webhooks
2. Add endpoint: `https://lupo-backend.fly.dev/webhook/stripe`
3. Select events: `customer.subscription.*`, `invoice.*`
4. Copy webhook secret → set as `STRIPE_WEBHOOK_SECRET` env var

### 2. Access Control Based on Subscription Status
```javascript
// In your call creation/access endpoints
const org = await SalesOrg.findById(user.organizationId);

if (org.subscriptionStatus === 'past_due') {
  return res.status(403).json({ 
    error: 'Payment failed. Please update your payment method.'
  });
}

if (org.subscriptionStatus === 'canceled') {
  return res.status(403).json({ 
    error: 'Subscription canceled. Please reactivate to continue.'
  });
}
```

### 3. Email Notifications
- Trial ending in 1 day
- Payment succeeded
- Payment failed (with link to update payment method)
- Subscription canceled

### 4. Manager Toggle for Call Access
Add to manager profile settings:
```javascript
// POST /api/profile/toggle-call-access
const user = await User.findById(userId);
const org = await SalesOrg.findById(user.organizationId);

// Toggle access
user.has_call_access = !user.has_call_access;
await user.save();

// Update Stripe subscription
const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
const currentSeats = sub.items.data[0].quantity;
const newSeats = user.has_call_access ? currentSeats + 1 : currentSeats - 1;

await stripe.subscriptions.update(org.stripeSubscriptionId, {
  items: [{ id: sub.items.data[0].id, quantity: newSeats }],
  proration_behavior: 'create_prorations'
});
```

---

## Testing Checklist

### Trial Flow
- [ ] Sign up with 10 seats on Nov 7
- [ ] Verify $0 charged today
- [ ] Verify trial ends Nov 14
- [ ] Try to remove seats → should fail with clear error
- [ ] Add 2 seats → should show warning and new total
- [ ] Wait until Nov 14 → verify $2,400 charged
- [ ] After Nov 14, verify can now remove seats

### Billing Page
- [ ] Access from manager dashboard "Manage Subscription" button
- [ ] During trial: Shows "Trial - X days left"
- [ ] During trial: Shows "First Charge" not "Next Billing Date"
- [ ] Seats modal shows warning during trial
- [ ] After trial: Can add/remove seats
- [ ] Payment method update redirects to Stripe portal
- [ ] Billing history shows invoices (or empty state during trial)
- [ ] Cancel subscription shows confirmation

### Edge Cases
- [ ] Card fails on day 7 → subscription enters `past_due`
- [ ] Cancel during trial → $0 charged, access until day 7
- [ ] Cancel after trial → access until end of period
- [ ] Reactivate canceled subscription

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/billing/subscription` | GET | Get current plan, seats, billing date | Yes |
| `/api/billing/update-seats` | POST | Change seat count (trial: only add) | Yes |
| `/api/billing/invoices` | GET | Get billing history from Stripe | Yes |
| `/api/billing/create-portal-session` | POST | Create Stripe portal link | Yes |
| `/api/billing/cancel` | POST | Cancel subscription at period end | Yes |
| `/api/billing/reactivate` | POST | Reactivate canceled subscription | Yes |

All endpoints:
- Require JWT authentication
- Return JSON
- Handle trial vs. active states
- Integrate with Stripe API

---

## Design Philosophy

**Minimalist & Premium:**
- Inspired by Stripe, Linear, and Airtable
- Lots of whitespace
- No clutter (subtle dividers, not boxes)
- Clear typography hierarchy
- Limited color palette (accent for CTAs only)

**Transparency & Trust:**
- Clear warnings before charging
- No hidden fees
- Explicit about seat locking
- Always show what they'll be charged

**Enterprise-Grade:**
- Proper error handling
- Loading states
- Clear messaging
- Professional aesthetics

---

## Cost Breakdown Example

**Manager signs up: Nov 7, 2025**
- 10 seats
- 7-day trial
- $0 today

**Day 3 (Nov 9): Adds 2 seats**
- Now 12 seats
- Still $0 charged
- First charge will be: 12 × $200 = $2,400

**Day 7 (Nov 14): Trial ends**
- Charged: $2,400
- Subscription becomes active
- Next charge: Dec 14

**Day 13 (Nov 20): Removes 3 seats**
- Now 9 seats
- Prorated credit: 3 × $200 × (24/30) = $480
- Next charge (Dec 14): 9 × $200 = $1,800

**Dec 14: Second billing cycle**
- Charged: $1,800
- Next charge: Jan 14

---

## Notes

1. **No webhook handling yet** - You MUST implement this or billing will break
2. **No access suspension** - Should suspend/limit access when payment fails
3. **No email notifications** - Should notify about trial ending, payment failures
4. **Manager call access toggle** - Not yet implemented in UI
5. **All endpoints tested locally** - Need production testing

---

## Questions Answered

✅ Does trial charge anything? **No, $0 today**
✅ When is first charge? **7 days after signup (trial end)**
✅ Can they cancel during trial? **Yes, $0 charged**
✅ Can they add seats during trial? **Yes**
✅ Can they remove seats during trial? **No (locked)**
✅ Is billing date the signup date? **No, it's trial end date (signup + 7 days)**
✅ What if card fails on day 7? **Subscription enters past_due, should suspend access**
✅ Can they change seats after trial? **Yes, with instant proration**

---

Built with ❤️ by Claude & Tom

