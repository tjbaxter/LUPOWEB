class InstantDeduplicator {
    constructor() {
      this.activeAlerts = new Map(); // type -> {text, timestamp, hash}
      this.recentResponses = new Map(); // responseStart -> timestamp
      this.DUPLICATE_WINDOW = 3000;
      this.RESPONSE_WINDOW = 5000;
    }
  
    shouldProcessDetection(type, text) {
      const now = Date.now();
      const hash = this.quickHash(text);
      
      const active = this.activeAlerts.get(type);
      if (active && (now - active.timestamp < this.DUPLICATE_WINDOW)) {
        const similarity = this.quickSimilarity(text, active.text);
        if (similarity > 0.7 || hash === active.hash) {
          return false;
        }
      }
      
      this.activeAlerts.set(type, {text, timestamp: now, hash});
      return true;
    }
  
    shouldSendResponse(response) {
      const now = Date.now();
      const responseKey = response.slice(0, 40).toLowerCase().replace(/[^\w\s]/g, '');
      
      // Check recent responses
      for (const [key, timestamp] of this.recentResponses) {
        if (now - timestamp > this.RESPONSE_WINDOW) {
          this.recentResponses.delete(key);
          continue;
        }
        if (this.quickSimilarity(responseKey, key) > 0.8) {
          return false;
        }
      }
      
      this.recentResponses.set(responseKey, now);
      return true;
    }
  
    quickHash(text) {
      const words = text.toLowerCase().split(' ').filter(w => w.length > 3);
      return `${words[0]}_${words[words.length-1]}_${words.length}`;
    }
  
    quickSimilarity(a, b) {
      const wordsA = new Set(a.toLowerCase().split(' '));
      const wordsB = new Set(b.toLowerCase().split(' '));
      if (wordsA.size === 0) return 0;
      let overlap = 0;
      for (const word of wordsA) {
        if (wordsB.has(word)) overlap++;
      }
      return overlap / wordsA.size;
    }
  
    reset() {
      this.activeAlerts.clear();
      this.recentResponses.clear();
    }
  }
  
  module.exports = InstantDeduplicator;