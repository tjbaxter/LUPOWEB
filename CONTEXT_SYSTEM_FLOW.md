# 🔄 Hierarchical Context System - Visual Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SALES ORGANIZATION                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Company Context (Master Template)                        │  │
│  │  ────────────────────────────────────────────────────────  │  │
│  │  • Product: Acme CRM                                      │  │
│  │  • Pricing: $200/seat/month                               │  │
│  │  • Competitors: Beat Salesforce on price                  │  │
│  │  • Objections: Price → "ROI in 3 months"                  │  │
│  │                                                            │  │
│  │  Version: 3                                                │  │
│  │  Last Updated: 2025-10-11 by manager@company.com          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                               │                                  │
│                               │ Inherits                         │
│                               ▼                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │   Rep Sarah    │  │   Rep Mike     │  │   Rep Emma     │    │
│  ├────────────────┤  ├────────────────┤  ├────────────────┤    │
│  │ Uses Company   │  │ Uses Company   │  │ Custom Context │    │
│  │ Context v3     │  │ Context v2     │  │ (no inherit)   │    │
│  │                │  │ ⚠️ Outdated     │  │                │    │
│  │ + Personal:    │  │                │  │ Sells to SMBs  │    │
│  │ "I sell to     │  │                │  │ only           │    │
│  │  healthcare"   │  │                │  │                │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Manager Updates Flow

```
    Manager                      Backend                       Database
       │                            │                              │
       │  1. Edit Company Context   │                              │
       ├───────────────────────────>│                              │
       │                            │                              │
       │  2. Click "Save Company    │                              │
       │     Template"              │                              │
       ├───────────────────────────>│                              │
       │                            │                              │
       │                            │  3. Increment version        │
       │                            ├─────────────────────────────>│
       │                            │     version: 2 → 3           │
       │                            │     lastUpdatedBy: manager   │
       │                            │     lastUpdatedAt: now       │
       │                            │                              │
       │  4. Success ✅              │                              │
       │<───────────────────────────┤                              │
       │                            │                              │
       │                            │                              │
    Rep (Sarah)                     │                              │
       │                            │                              │
       │  5. Login / Refresh        │                              │
       ├───────────────────────────>│                              │
       │                            │                              │
       │                            │  6. Check context status     │
       │                            ├─────────────────────────────>│
       │                            │     userVersion: 2           │
       │                            │     companyVersion: 3        │
       │                            │     isOutOfDate: true        │
       │                            │                              │
       │  7. Show banner:           │                              │
       │     "🔔 Company context     │                              │
       │      updated"              │                              │
       │<───────────────────────────┤                              │
       │                            │                              │
       │  8. Click "View Updates"   │                              │
       ├───────────────────────────>│                              │
       │                            │                              │
       │  9. Show company context   │                              │
       │     with "Use This         │                              │
       │     Context" button        │                              │
       │<───────────────────────────┤                              │
       │                            │                              │
       │  10. Click "Use This       │                              │
       │      Context"              │                              │
       ├───────────────────────────>│                              │
       │                            │                              │
       │                            │  11. Update user context     │
       │                            ├─────────────────────────────>│
       │                            │     content = company        │
       │                            │     contextSource = company  │
       │                            │     version = 3              │
       │                            │                              │
       │  12. Context applied ✅     │                              │
       │<───────────────────────────┤                              │
```

---

## New Rep Onboarding Flow

```
    New Rep                      Backend                       Database
       │                            │                              │
       │  1. First login            │                              │
       ├───────────────────────────>│                              │
       │                            │                              │
       │                            │  2. Get user info            │
       │                            ├─────────────────────────────>│
       │                            │     user.salesContext = {}   │
       │                            │                              │
       │                            │  3. Get company context      │
       │                            ├─────────────────────────────>│
       │                            │     org.salesContext =       │
       │                            │     { content: "..." }       │
       │                            │                              │
       │  4. Show banner:           │                              │
       │     "🎯 Your company has a  │                              │
       │      sales playbook ready" │                              │
       │     [Use Company Context]  │                              │
       │<───────────────────────────┤                              │
       │                            │                              │
       │  5. Click "Use Company     │                              │
       │     Context"               │                              │
       ├───────────────────────────>│                              │
       │                            │                              │
       │                            │  6. Apply company context    │
       │                            ├─────────────────────────────>│
       │                            │     user.salesContext =      │
       │                            │     org.salesContext         │
       │                            │     contextSource = company  │
       │                            │     version = 3              │
       │                            │                              │
       │  7. Success! Ready to      │                              │
       │     start selling ✅        │                              │
       │<───────────────────────────┤                              │
       │                            │                              │
       │  Total time: 30 seconds    │                              │
       │  (vs 30 minutes manually)  │                              │
```

---

## Context Editor UI States

### State 1: Admin Editing Company Context
```
┌──────────────────────────────────────────────────────────────┐
│  Sales Context                                            [×] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌─────────────────────────┐              │
│  │ My Context   │  │ Company Template (v3)  ✓ │              │
│  └──────────────┘  └─────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  PRODUCT                                               │ │
│  │  Acme CRM                                              │ │
│  │  Helps sales teams close deals faster                 │ │
│  │  Target: B2B sales teams                              │ │
│  │                                                        │ │
│  │  PRICING                                               │ │
│  │  $200/seat/month (annual)                             │ │
│  │  $250/seat/month (monthly)                            │ │
│  │  Enterprise: contact sales                            │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  5,432 chars            [Save Company Template]             │
└──────────────────────────────────────────────────────────────┘
```

### State 2: Rep Viewing Company Context
```
┌──────────────────────────────────────────────────────────────┐
│  Sales Context                                            [×] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌─────────────────────────┐              │
│  │ My Context   │  │ Company Context (v3)   ✓ │              │
│  └──────────────┘  └─────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  PRODUCT                                               │ │
│  │  Acme CRM                                              │ │
│  │  Helps sales teams close deals faster                 │ │
│  │  Target: B2B sales teams                              │ │
│  │                      ...                               │ │
│  │                                                        │ │
│  │  [Read-only, slightly transparent]                    │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  5,432 chars                 [Use This Context]             │
└──────────────────────────────────────────────────────────────┘
```

### State 3: Rep Editing Personal Context
```
┌──────────────────────────────────────────────────────────────┐
│  Sales Context                                            [×] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  ┌──────────────────┐              │
│  │ My Context (v3)    ✓ │  │ Company Context  │              │
│  └─────────────────────┘  └──────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  PRODUCT                                               │ │
│  │  Acme CRM                                              │ │
│  │  Helps sales teams close deals faster                 │ │
│  │  Target: B2B sales teams                              │ │
│  │                                                        │ │
│  │  MY FOCUS: Healthcare providers                       │ │
│  │  - HIPAA compliance is key selling point              │ │
│  │  - Integration with Epic/Cerner                       │ │
│  │                                                        │ │
│  │  PRICING                                               │ │
│  │  ... [company pricing from template]                  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  5,789 chars                              [Save]            │
└──────────────────────────────────────────────────────────────┘
```

---

## Banner Decision Tree

```
                         User Logs In
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Has personal        │
                    │ context?            │
                    └─────────────────────┘
                         /        \
                      NO             YES
                      /                 \
                     ▼                   ▼
          ┌──────────────────┐   ┌──────────────────┐
          │ Company has      │   │ Context source = │
          │ context?         │   │ company?         │
          └──────────────────┘   └──────────────────┘
              /        \              /        \
           NO             YES       NO          YES
           /                 \      /             \
          ▼                   ▼    ▼               ▼
    ┌──────────┐      ┌──────────┐  NO      ┌──────────┐
    │ Show     │      │ Show     │  Banner  │ Version  │
    │ "Add     │      │ "Company │          │ outdated?│
    │ Context" │      │ Context  │          └──────────┘
    │ banner   │      │ Ready"   │              /    \
    └──────────┘      │ banner   │           NO       YES
                      └──────────┘           /          \
                                            ▼            ▼
                                       No Banner   ┌──────────┐
                                                   │ Show     │
                                                   │ "Context │
                                                   │ Updated" │
                                                   │ banner   │
                                                   └──────────┘
```

---

## Data Relationships

```
SalesOrg (Company)
├── companyName: "Acme Corp"
├── admins: [
│     { email: "manager@acme.com", role: "owner" }
│   ]
├── salesContext: {                    ← MASTER TEMPLATE
│     content: "PRODUCT\nAcme CRM...",
│     extractedFacts: "Price: $200...",
│     lastUpdated: Date
│   }
└── companyContext: {
      version: 3,                      ← VERSION TRACKING
      lastUpdatedBy: "manager@acme.com",
      lastUpdatedAt: Date,
      changeLog: [...]
    }

User (Rep)
├── email: "sarah@acme.com"
├── organizationId: → SalesOrg._id
└── salesContext: {
      content: "PRODUCT\nAcme CRM...",      ← THEIR COPY
      extractedFacts: "...",
      contextSource: "company",             ← WHERE IT CAME FROM
      companyContextVersion: 3,             ← WHICH VERSION THEY HAVE
      lastSyncedAt: Date,
      customOverrides: "MY FOCUS: Healthcare..."  ← THEIR EDITS
    }
```

---

## Key Concepts

### 1. Context Source Types
- **`custom`**: Rep created their own context from scratch
- **`company`**: Rep is using company template (can be outdated)
- **`company_with_edits`**: Rep inherited company then made changes

### 2. Version Comparison
```javascript
if (contextSource === 'company' && userVersion < companyVersion) {
  // Rep is out of date → show "Context Updated" banner
}
```

### 3. Admin Detection
```javascript
const isAdmin = org.admins.some(admin => admin.email === user.email);
```

### 4. One-Click Apply
```javascript
POST /sales/apply-company-context
→ Copies company context to user
→ Sets contextSource = 'company'
→ Sets companyContextVersion = current
```

---

This system ensures:
✅ **Consistency** - All reps start with proven messaging
✅ **Speed** - New reps productive in 30 seconds
✅ **Flexibility** - Reps can customize for their needs
✅ **Control** - Managers can update pricing instantly
✅ **Tracking** - Know who's using what version

