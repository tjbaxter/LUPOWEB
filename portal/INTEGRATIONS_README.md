# Integrations Tab - Implementation Complete ✅

**Date:** December 1, 2025  
**Status:** Ready for use!

---

## What's Been Created

### ✅ New Page: `integrations.html`

A complete integrations management page matching your existing Apple-style design.

**Features:**
- 📊 **CRM Integration** (Optional) - Salesforce, HubSpot
- 📅 **Meeting Booking** (Required) - Google Calendar, Chili Piper, Cal.com, Calendly, Outlook
- 🔔 **Notifications** (Coming Soon) - Placeholder for future features

### ✅ Navigation Updated

Added "Integrations" tab to all pages:
- ✅ dashboard.html
- ✅ calls.html
- ✅ knowledge.html
- ✅ your-agent.html  
- ✅ settings.html
- ✅ call-detail.html

**New Nav Order:**
```
Dashboard | Calls | Knowledge | Your Agent | Integrations | Settings
```

---

## How It Works

### 1. **ONE Connection Per Type Rule** ✓

The page enforces the "one active connection per type" constraint:

- **CRM:** Can only connect ONE (Salesforce OR HubSpot)
- **Booking:** Can only connect ONE (Google OR Chili Piper OR Cal.com, etc.)

If user tries to connect a second one, they get an alert:
> "You're already connected to [Provider]. Please disconnect it first before connecting a new [CRM/booking system]."

### 2. **Connection States**

**Not Connected (Initial State):**
- Shows all provider buttons
- Warning banner for booking (required)
- Optional badge for CRM

**Connected State:**
- Green checkmark card
- Shows account details
- Shows connection date
- "View Settings" button (for Google/Outlook)
- "Disconnect" button

### 3. **Settings Modal** (For Google Calendar Example)

Click "View Settings" → Modal opens with:
- Meeting duration (15/30/45/60 min)
- Title template with variables ({company}, {name}, {title})
- Description template
- Google Meet toggle
- Buffer time settings

### 4. **Disconnect Flow**

Click "Disconnect" → Confirmation modal:
> ⚠️ Disconnect Integration?
> 
> This will:
> - Stop LUPO from booking meetings
> - Revoke access to your account
> - Require reconfiguration if reconnected

### 5. **Data Storage (Current)**

For demo purposes, uses `localStorage`:
- `lupo_crm_integration` - Stores CRM connection
- `lupo_booking_integration` - Stores booking connection

**Structure:**
```javascript
{
  provider: "google",
  account: "user@example.com",
  connectedAt: "2025-12-01T21:00:00.000Z",
  meetingsBooked: 0,
  settings: {
    duration: 30,
    titleTemplate: "Demo with {company}",
    addMeet: true
  }
}
```

---

## Next Steps (Backend Integration)

### TODO: Replace localStorage with API calls

**1. Load Integrations:**
```javascript
// Replace in loadIntegrations()
const response = await fetch(`${API_URL}/v1/integrations`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
```

**2. Connect Provider:**
```javascript
// Replace in connectCRM() / connectBooking()
window.location.href = `${API_URL}/v1/integrations/connect/${provider}`;
// Backend handles OAuth flow and redirects back
```

**3. Disconnect:**
```javascript
// Replace in confirmDisconnect()
await fetch(`${API_URL}/v1/integrations/${type}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
});
```

**4. Update Settings:**
```javascript
// Replace in saveSettings()
await fetch(`${API_URL}/v1/integrations/${type}/settings`, {
    method: 'PATCH',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
});
```

### Backend Database Schema (Recommended)

```sql
CREATE TABLE customer_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(255) NOT NULL,
    integration_type VARCHAR(50) NOT NULL,  -- 'crm' or 'booking'
    service VARCHAR(50) NOT NULL,           -- 'salesforce', 'google', etc
    account_email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    settings JSONB,
    status VARCHAR(20) DEFAULT 'active',
    connected_at TIMESTAMP DEFAULT NOW(),
    disconnected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Enforce one active integration per type
    CONSTRAINT unique_active_integration 
        UNIQUE(client_id, integration_type) 
        WHERE status = 'active'
);

CREATE INDEX idx_client_integrations ON customer_integrations(client_id);
CREATE INDEX idx_integration_status ON customer_integrations(status);
```

### Backend API Endpoints Needed

```
GET    /v1/integrations              # Get all integrations for current user
GET    /v1/integrations/:type        # Get specific integration (crm/booking)
POST   /v1/integrations/connect/:provider  # Initiate OAuth flow
GET    /v1/integrations/callback/:provider # OAuth callback
PATCH  /v1/integrations/:type/settings     # Update settings
DELETE /v1/integrations/:type        # Disconnect integration
```

---

## OAuth Integration Guides

### Google Calendar

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project "LUPO Integration"
3. Enable "Google Calendar API"
4. Create OAuth 2.0 credentials
5. Add authorized redirect: `https://yourdomain.com/v1/integrations/callback/google`
6. Scopes needed: `https://www.googleapis.com/auth/calendar`

### Salesforce

1. Go to Salesforce Setup → App Manager
2. Create "Connected App"
3. Enable OAuth settings
4. Add scopes: `api`, `refresh_token`, `offline_access`
5. Callback URL: `https://yourdomain.com/v1/integrations/callback/salesforce`

### HubSpot

1. Go to HubSpot App Settings
2. Create OAuth app
3. Scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`
4. Redirect URL: `https://yourdomain.com/v1/integrations/callback/hubspot`

### Chili Piper

1. Contact Chili Piper for API access
2. Get API key and queue IDs
3. Integration uses API key (not OAuth)

### Cal.com

1. Cal.com Settings → Developer
2. Create API key
3. Get event type IDs
4. Integration uses API key (not OAuth)

---

## Testing Checklist

### ✅ UI Testing
- [ ] Page loads without errors
- [ ] All provider buttons visible when disconnected
- [ ] Warning shows for booking (required)
- [ ] CRM shows optional badge
- [ ] Can click connect buttons
- [ ] Alert shows if trying to connect second provider
- [ ] Connected state shows correctly
- [ ] Settings modal opens for Google/Outlook
- [ ] Disconnect modal shows warning
- [ ] Confirmation disconnects and reloads
- [ ] Mobile responsive (nav collapses)

### ✅ Integration Testing (Once Backend Ready)
- [ ] OAuth flow redirects correctly
- [ ] Tokens saved to database
- [ ] Duplicate prevention works (DB constraint)
- [ ] Settings save correctly
- [ ] Disconnect revokes tokens
- [ ] Reconnect works after disconnect

---

## User Experience Flow

### First Time User

1. Logs in → Sees dashboard
2. Clicks "Integrations" tab
3. Sees booking warning (required)
4. Clicks "Connect Google Calendar"
5. OAuth popup → Authorizes
6. Redirected back → Shows connected status
7. Clicks "View Settings" → Customizes duration/title
8. Saves settings → Done ✅

### Existing User (Already Connected)

1. Clicks "Integrations" tab
2. Sees green checkmark cards
3. Can view settings or disconnect
4. To switch: Disconnect → Connect new provider

---

## Design Features

### Apple-Style UI
- Glassmorphic nav with blur
- Animated gradient background
- Smooth transitions
- Dark mode optimized
- Card-based layout
- Clean typography (SF Pro Display)

### Color Scheme
```css
--accent: #2997ff       /* Blue - Primary actions */
--success: #34c759      /* Green - Connected state */
--warning: #ff9500      /* Orange - Warnings */
--error: #ff3b30        /* Red - Disconnect */
--text-primary: #f5f5f7 /* White text */
--text-secondary: #a1a1a6 /* Gray text */
```

### Responsive
- Desktop: Full nav visible
- Tablet: Smaller gaps
- Mobile: Single column grids

---

## What's Next?

### Phase 1 (Current) ✅
- UI complete
- Demo functionality with localStorage
- Navigation added to all pages

### Phase 2 (Next - Backend)
- Database schema
- OAuth flows
- API endpoints
- Token management
- Settings persistence

### Phase 3 (Future Features)
- Slack notifications
- Email digests
- SMS alerts
- Zapier webhooks
- More CRM options (Pipedrive, Close, etc.)
- More calendar options (Exchange, iCloud)

---

## Support

**File Location:** `/Users/tombaxter/LUPOWEB/LUPOWEB/portal/integrations.html`

**Updated Pages:**
- All 6 existing portal pages now have "Integrations" link

**Ready to use!** Just needs backend API integration for production.

---

**Created:** December 1, 2025  
**Status:** ✅ Complete and ready for backend integration

