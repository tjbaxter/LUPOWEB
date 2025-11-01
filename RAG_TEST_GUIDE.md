# 🧪 RAG END-TO-END TEST GUIDE

## Prerequisites
- Backend deployed and running on `https://lupo-backend.fly.dev`
- Environment variables set:
  - `QDRANT_URL`
  - `QDRANT_API_KEY`
  - `OPENAI_API_KEY`
  - `REDIS_URL`

---

## Test Flow

### **STEP 1: Manager Upload (sales-context.html)**

**Actions:**
1. Open `http://localhost:8080/sales-context.html` (or production URL)
2. Log in as manager
3. Drag & drop a PDF file (e.g., `Pricing_Sheet.pdf`)
4. Watch upload progress bar
5. Verify document appears in list with "Indexed" status

**What to check:**
- ✅ Upload progress shows (0% → 100%)
- ✅ Toast notification: "Document uploaded successfully!"
- ✅ Document appears in list with 📕 PDF icon
- ✅ Status shows green dot + "Indexed"
- ✅ Upload date displayed

**Backend logs to watch:**
```bash
fly logs --region lhr | grep -E "(Upload|Process|Qdrant|Chunk)"
```

Expected logs:
```
✅ PDF uploaded: [filename]
🔄 Processing document [documentId]...
✅ Extracted [X] pages, [Y] tokens
🔄 Chunking text into 512-token chunks...
✅ Created [Z] chunks
🔄 Generating embeddings for [Z] chunks...
✅ Generated [Z] embeddings in [X]ms
✅ Indexed [Z] chunks for company [companyId]
✅ Document processing complete
```

---

### **STEP 2: Verify Qdrant Indexing**

**Check Qdrant directly:**
```bash
curl -X GET "https://81296ada-3436-4b98-9a10-c518ac1fd79.us-east4-0.gcp.cloud.qdrant.io/collections/org_[COMPANY_ID]/points" \
  -H "api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.GvWdikKM4lGy_0E-dDJ7uRns-bV4l6jVvGbHHAwgP_w"
```

**Or use backend test endpoint:**
```bash
curl https://lupo-backend.fly.dev/api/rag/test/search?companyId=[ID]&query=pricing \
  -H "Authorization: Bearer [TOKEN]"
```

Expected response:
```json
{
  "success": true,
  "results": [
    {
      "text": "Enterprise pricing starts at $200/seat/month...",
      "source": "Pricing_Sheet.pdf",
      "page": 3,
      "score": 0.91
    }
  ],
  "timing": "87ms"
}
```

---

### **STEP 3: Rep Sets Profile (sales-dashboard.html)**

**Actions:**
1. Open `sales-dashboard.html` as a rep
2. Click "Sales Context" button in header
3. Enter name: "Thomas Baxter"
4. Click "Save Profile"
5. Verify toast: "✓ Profile saved! Welcome, Thomas Baxter!"

**What to check:**
- ✅ Popup closes automatically
- ✅ Welcome banner disappears
- ✅ Name saved to backend

**Backend check:**
```bash
curl https://lupo-backend.fly.dev/sales/me \
  -H "Authorization: Bearer [REP_TOKEN]"
```

Expected response:
```json
{
  "user": {
    "name": "Thomas Baxter",
    "salesContext": {
      "content": "Rep: Thomas Baxter",
      "source": "profile"
    },
    "onboardingCompleted": true
  }
}
```

---

### **STEP 4: Start Call & Test AI Retrieval**

**Actions:**
1. In sales-dashboard, click "New Call"
2. Enter call objective: "Close Tony at $50K deal"
3. Start call
4. During call, prospect asks: **"What's your pricing?"**
5. Watch AI overlay for real-time guidance

**What to check:**
- ✅ AI detects critical moment: 🧩 Technical Question
- ✅ AI response includes **exact pricing from uploaded PDF**
- ✅ Response cites source: "(from Pricing_Sheet.pdf, page 3)"

**Backend logs to watch:**
```bash
fly logs | grep -E "(Context|Retrieval|Qdrant|Cache)"
```

Expected logs:
```
🔄 Building context for call [callId]...
📊 Cache: 0/1 hit, generating 1
✅ Generated 1 embeddings in 45ms
✅ Context search completed in 87ms (3 results)
✅ Reranked 10 documents to 3 in 123ms
✅ Deduplicated 3 → 3 chunks
✅ Context built: 1247 chars in 267ms
```

---

### **STEP 5: Test Manual Search**

**Actions:**
1. During call, click "Search" button
2. Type query: "Do you integrate with Salesforce?"
3. Hit enter

**What to check:**
- ✅ AI responds with integration info from uploaded docs
- ✅ Response is specific, not generic
- ✅ Latency < 1 second (if cached: < 300ms)

**Cache hit test:**
1. Ask same question again
2. Should be instant (< 100ms) due to Redis cache

**Backend logs:**
```
✅ Search results from Redis cache
✅ Context built: 1134 chars in 34ms (cached)
```

---

### **STEP 6: Delete Document**

**Actions:**
1. Go back to `sales-context.html`
2. Click delete button (🗑️) on a document
3. Confirm deletion
4. Verify document removed from list

**What to check:**
- ✅ Toast: "Document deleted"
- ✅ Document disappears from list
- ✅ Doc count updates: "4 documents" → "3 documents"

**Backend logs:**
```
✅ Deleted [X] points from org_[companyId]
✅ Document deleted: [documentId]
```

---

## 🎯 Success Criteria

| Test | Expected Result | Status |
|------|----------------|--------|
| PDF upload | Indexed in < 30s | ⏳ |
| Qdrant storage | Points created | ⏳ |
| Rep profile save | Name stored | ⏳ |
| AI retrieval | Exact info from PDF | ⏳ |
| Search latency | < 100ms (p95) | ⏳ |
| Cache hit rate | > 50% after 10 queries | ⏳ |
| Delete | Document removed | ⏳ |

---

## 🐛 Common Issues & Fixes

### **Issue: Upload fails with 401**
**Fix:** Check JWT token in localStorage
```javascript
console.log(localStorage.getItem('token'));
```

### **Issue: "Context search failed"**
**Fix:** Check Qdrant connectivity
```bash
fly logs | grep Qdrant
```

### **Issue: AI returns generic answers**
**Fix:** Check context is being retrieved
```bash
fly logs | grep "Context built"
```

### **Issue: Slow retrieval (> 500ms)**
**Fix:** Check Redis cache is working
```bash
fly logs | grep "Cache hit"
```

---

## 📊 Monitoring

### **Prometheus Metrics:**
```bash
curl https://lupo-backend.fly.dev/metrics | grep rag_
```

Key metrics:
- `rag_cache_hits_total{type="embedding"}` - Embedding cache hits
- `rag_cache_hits_total{type="search"}` - Search cache hits
- `rag_retrieval_duration_seconds` - Retrieval latency histogram
- `rag_context_build_duration_seconds` - Full context assembly time
- `rag_errors_total` - Error count by component

### **Redis Cache Stats:**
```bash
fly redis connect
> INFO stats
```

---

## 🚀 Performance Benchmarks

**Target:**
- Upload & index: < 30 seconds for 10-page PDF
- Context retrieval: < 100ms (p95)
- Cache hit rate: > 50% in production
- End-to-end latency: < 1 second (first query), < 300ms (cached)

**Actual (to be measured):**
- Upload & index: _____ seconds
- Context retrieval: _____ ms
- Cache hit rate: _____ %
- End-to-end latency: _____ ms

---

## ✅ Test Checklist

Before marking complete, verify:
- [ ] Manager can upload PDF
- [ ] Document appears in list with "Indexed" status
- [ ] Rep can set name in simple profile
- [ ] AI retrieves context during calls
- [ ] Search returns specific info from PDFs
- [ ] Cache works (second query is faster)
- [ ] Delete removes document
- [ ] No errors in backend logs
- [ ] Metrics endpoint returns data

---

**Ready to test! 🧪**

Start with STEP 1 and work through each step systematically.

