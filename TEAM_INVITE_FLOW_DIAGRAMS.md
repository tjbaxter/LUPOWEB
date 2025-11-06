# 🔄 TEAM INVITE FLOW DIAGRAMS

## **BEFORE (BROKEN) ❌**

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANAGER CREATES TEAM                         │
│                                                                 │
│  team-setup.html → Backend creates org                         │
│  Manager gets: https://lupolabs.ai/join.html?token=ABC123     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TEAM MEMBER CLICKS INVITE LINK                  │
│                                                                 │
│  Opens: https://lupolabs.ai/join.html?token=ABC123            │
│  join.html validates token with backend                        │
│  Shows: "Download LUPO for Mac or Windows"                     │
│                                                                 │
│  ✅ Stores token in localStorage:                              │
│     localStorage.setItem('pendingInviteToken', 'ABC123')       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TEAM MEMBER DOWNLOADS & OPENS APP               │
│                                                                 │
│  Electron app launches → Opens signup.html                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ❌ THE BREAK HAPPENS HERE                    │
│                                                                 │
│  signup.html loads                                             │
│  Checks: urlParams.get('invite') → NULL ❌                     │
│  NEVER checks localStorage for 'pendingInviteToken' ❌         │
│                                                                 │
│  User enters email/password                                    │
│  Creates account WITHOUT inviteToken                           │
│                                                                 │
│  Result: STANDALONE INDIVIDUAL ACCOUNT                         │
│  organizationId: null ❌                                       │
│  accountType: 'individual' ❌                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## **AFTER (FIXED) ✅**

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANAGER CREATES TEAM                         │
│                                                                 │
│  team-setup.html → Backend creates org                         │
│  Manager gets: https://lupolabs.ai/join.html?token=ABC123     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TEAM MEMBER CLICKS INVITE LINK                  │
│                                                                 │
│  Opens: https://lupolabs.ai/join.html?token=ABC123            │
│  join.html validates token with backend                        │
│  Shows: "Download LUPO for Mac or Windows"                     │
│                                                                 │
│  ✅ Stores token in localStorage:                              │
│     localStorage.setItem('pendingInviteToken', 'ABC123')       │
│     console.log('✅ Stored invite token...')                   │
│                                                                 │
│  ✅ Shows helpful note:                                        │
│     "Already have LUPO? Just sign up in the app using         │
│      the same email. Your invite will be detected."           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TEAM MEMBER DOWNLOADS & OPENS APP               │
│                                                                 │
│  Electron app launches → Opens signup.html                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ✅ FIXED FLOW                               │
│                                                                 │
│  signup.html loads                                             │
│                                                                 │
│  Step 1: Check URL params                                      │
│    let inviteToken = urlParams.get('invite')                   │
│    Result: null                                                │
│                                                                 │
│  Step 2: ✅ NEW - Check localStorage                           │
│    if (!inviteToken) {                                         │
│      inviteToken = localStorage.getItem('pendingInviteToken')  │
│    }                                                           │
│    Result: 'ABC123' ✅                                         │
│    console.log('✅ Found pending invite token in storage')     │
│                                                                 │
│  User enters email/password                                    │
│  Creates account WITH inviteToken                              │
│                                                                 │
│  Backend:                                                      │
│    1. Create account                                           │
│    2. Accept invite: /api/team/invite/accept                   │
│    3. Link user to organization                                │
│                                                                 │
│  Result: ✅ TEAM MEMBER ACCOUNT                               │
│  organizationId: [company_id] ✅                               │
│  accountType: 'team_member' ✅                                 │
│  subscriptionTier: 'enterprise' ✅                             │
│                                                                 │
│  ✅ Cleanup:                                                   │
│    localStorage.removeItem('pendingInviteToken')               │
│    sessionStorage.removeItem('pendingInviteToken')             │
└─────────────────────────────────────────────────────────────────┘
```

---

## **SIDE-BY-SIDE COMPARISON**

### **BEFORE ❌**
```javascript
async function createAccount() {
    // Only checks URL
    const inviteToken = urlParams.get('invite');
    
    // Always null when coming from join.html!
    if (inviteToken) {
        // This code NEVER runs ❌
        acceptInvite(inviteToken);
    }
}
```

### **AFTER ✅**
```javascript
async function createAccount() {
    // Check URL first
    let inviteToken = urlParams.get('invite');
    
    // ✅ NEW: Fallback to localStorage
    if (!inviteToken) {
        inviteToken = localStorage.getItem('pendingInviteToken') ||
                     sessionStorage.getItem('pendingInviteToken');
        console.log('✅ Found pending invite token');
    }
    
    // Now this code RUNS! ✅
    if (inviteToken) {
        acceptInvite(inviteToken);
        // Clean up
        localStorage.removeItem('pendingInviteToken');
    }
}
```

---

## **COMPLETE USER JOURNEY (FIXED) ✅**

```
                    ┌──────────────────────────┐
                    │  MANAGER DASHBOARD       │
                    │  "Invite Team" button    │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Backend generates       │
                    │  invite token: ABC123    │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼──────────────────────────┐
                    │  Manager shares:                      │
                    │  https://lupolabs.ai/join.html?       │
                    │  token=ABC123                         │
                    └────────────┬──────────────────────────┘
                                 │
            ┌────────────────────┴────────────────────┐
            │                                         │
            ▼                                         ▼
    ┌───────────────┐                        ┌───────────────┐
    │  NEW USER     │                        │  EXISTING     │
    │  (no app)     │                        │  USER (app)   │
    └───────┬───────┘                        └───────┬───────┘
            │                                        │
            ▼                                        ▼
    ┌───────────────────────┐              ┌─────────────────┐
    │  1. Click link        │              │  1. Click link  │
    │  2. join.html loads   │              │  2. join.html   │
    │  3. Validates token   │              │     shows note  │
    │  4. Stores token ✅   │              │  3. Opens app   │
    │  5. Downloads app     │              │     manually    │
    │  6. Opens app         │              │                 │
    └───────┬───────────────┘              └─────────┬───────┘
            │                                        │
            └────────────────┬───────────────────────┘
                             │
                ┌────────────▼─────────────┐
                │  signup.html loads       │
                │                          │
                │  ✅ Checks localStorage  │
                │  ✅ Finds: ABC123        │
                └────────────┬─────────────┘
                             │
                ┌────────────▼─────────────┐
                │  User signs up           │
                │  email@company.com       │
                │  password: ********      │
                └────────────┬─────────────┘
                             │
                ┌────────────▼─────────────────────────┐
                │  Backend:                           │
                │  1. Creates account ✅              │
                │  2. Accepts invite ✅               │
                │  3. Links to organization ✅        │
                │     organizationId: [company_id]    │
                │     accountType: team_member        │
                │  4. Increments seat count ✅        │
                └────────────┬────────────────────────┘
                             │
                ┌────────────▼─────────────┐
                │  SUCCESS! 🎉             │
                │                          │
                │  Welcome to [Company]!   │
                │  You've joined the team  │
                │                          │
                │  ✅ Token cleaned up     │
                └──────────────────────────┘
```

---

## **ERROR HANDLING FLOW**

```
┌─────────────────────────────────────┐
│  User arrives at signup.html        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Check for invite token:            │
│  1. URL params                      │
│  2. localStorage                    │
│  3. sessionStorage                  │
└────────────┬────────────────────────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
┌─────────┐    ┌─────────────┐
│ Found   │    │ Not Found   │
│ Token   │    │ Token       │
└────┬────┘    └─────┬───────┘
     │               │
     │               ▼
     │         ┌──────────────┐
     │         │ Create       │
     │         │ Individual   │
     │         │ Account      │
     │         └──────────────┘
     │
     ▼
┌─────────────────────────┐
│  Validate token with    │
│  backend: /api/team/    │
│  invite/validate/[token]│
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌────────────┐
│ Valid │  │  Invalid   │
└───┬───┘  └─────┬──────┘
    │            │
    │            ▼
    │      ┌────────────────────────┐
    │      │  Show error:           │
    │      │  "Invalid invite link" │
    │      │  Clear token           │
    │      │  Create individual     │
    │      └────────────────────────┘
    │
    ▼
┌─────────────────────────┐
│  Create account         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Accept invite:         │
│  POST /api/team/invite/ │
│  accept                 │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌────────────────┐
│Success│  │  Failed        │
└───┬───┘  └─────┬──────────┘
    │            │
    │            ▼
    │      ┌────────────────────────┐
    │      │  Log warning:          │
    │      │  "Account created but  │
    │      │   not joined to org"   │
    │      │  Continue anyway       │
    │      └────────────────────────┘
    │
    ▼
┌─────────────────────────┐
│  Clean up token:        │
│  - Remove from          │
│    localStorage         │
│  - Remove from          │
│    sessionStorage       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Show success:          │
│  "Welcome to [Company]!"│
│  Auto-close window      │
└─────────────────────────┘
```

---

## **STORAGE PRIORITY**

```
┌─────────────────────────────────────────────┐
│  INVITE TOKEN RESOLUTION ORDER              │
└─────────────────────────────────────────────┘

Priority 1: URL Parameters (Highest)
    ↓
    urlParams.get('invite')
    Example: ?invite=ABC123
    
    ⬇️ If null, check next source

Priority 2: localStorage (Persistent)
    ↓
    localStorage.getItem('pendingInviteToken')
    Survives: browser restart, app close
    
    ⬇️ If null, check next source

Priority 3: sessionStorage (Session only)
    ↓
    sessionStorage.getItem('pendingInviteToken')
    Survives: page reload
    Expires: when browser/tab closes
    
    ⬇️ If null

Priority 4: No Invite
    ↓
    Create individual account
```

---

## **MULTI-PLATFORM FLOW**

```
                        INVITE LINK
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
        ┌───────┐      ┌──────────┐     ┌────────┐
        │  WEB  │      │ ELECTRON │     │ MOBILE │
        │Browser│      │   APP    │     │  (iOS) │
        └───┬───┘      └─────┬────┘     └────┬───┘
            │                │                │
            ▼                ▼                ▼
    ┌───────────────┐ ┌─────────────┐ ┌──────────────┐
    │ join.html     │ │ Deep link:  │ │ lupo://join/ │
    │ Stores token  │ │ lupo://join/│ │ [TOKEN]      │
    │ in localStorage│ │ [TOKEN]     │ │              │
    └───────┬───────┘ └──────┬──────┘ └──────┬───────┘
            │                │                │
            ▼                ▼                ▼
    ┌───────────────┐ ┌─────────────┐ ┌──────────────┐
    │ signup.html   │ │handleTeam   │ │ Opens signup │
    │ Checks        │ │Invite()     │ │ screen       │
    │ localStorage  │ │ If logged in│ │ Passes token │
    │ ✅            │ │ → auto-join │ │ via params   │
    └───────────────┘ └─────────────┘ └──────────────┘
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
            ┌──────────┐         ┌──────────┐
            │ LOGGED   │         │ NOT      │
            │ IN       │         │ LOGGED IN│
            └────┬─────┘         └────┬─────┘
                 │                    │
                 ▼                    ▼
        ┌────────────────┐   ┌────────────────┐
        │ Auto-join team │   │ Open signup    │
        │ Show success   │   │ with token     │
        │ dialog         │   │ in URL         │
        └────────────────┘   └────────────────┘
```

---

**Last Updated:** November 6, 2025

