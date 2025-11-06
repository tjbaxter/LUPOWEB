/* ============================================================================
   MANAGER DASHBOARD WEBSOCKET - Real-Time Live Now Updates
   Add this to manager-dashboard.html before the closing </script> tag
   ============================================================================ */

// WebSocket connection for real-time updates
let managerWS = null;
let wsReconnectAttempts = 0;
const MAX_WS_RECONNECTS = 5;

function connectManagerWebSocket() {
    const token = localStorage.getItem('lupo_token');
    if (!token) {
        console.log('No token for WebSocket connection');
        return;
    }
    
    // Determine WebSocket URL
    const apiUrl = AUTH_CONFIG.apiUrl;
    const wsUrl = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const wsEndpoint = `${wsUrl}/manager-stream?token=${encodeURIComponent(token)}`;
    
    console.log('🔌 Connecting to Manager WebSocket...');
    
    try {
        managerWS = new WebSocket(wsEndpoint);
        
        managerWS.onopen = () => {
            console.log('✅ Manager WebSocket connected - Live updates enabled');
            wsReconnectAttempts = 0;
            
            // Show connection indicator (optional)
            const liveIndicator = document.querySelector('.header-stat-value');
            if (liveIndicator && liveIndicator.textContent.includes('Live Now')) {
                liveIndicator.style.color = 'var(--success)';
            }
        };
        
        managerWS.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'handshake':
                        console.log(`📊 Manager dashboard watching: ${data.orgName}`);
                        break;
                        
                    case 'live_update':
                        // Update the "Live Now" counter in real-time
                        updateLiveNow(data.liveNow);
                        break;
                        
                    case 'pong':
                        // Keep-alive response
                        break;
                        
                    default:
                        console.log('Unknown WS message:', data);
                }
                
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        managerWS.onerror = (error) => {
            console.error('❌ Manager WebSocket error:', error);
        };
        
        managerWS.onclose = (event) => {
            console.log('🔌 Manager WebSocket closed:', event.code, event.reason);
            
            // Reset live indicator color
            const liveIndicator = document.querySelector('.header-stat-value');
            if (liveIndicator && liveIndicator.textContent.includes('Live Now')) {
                liveIndicator.style.color = 'var(--text)';
            }
            
            // Attempt reconnection
            if (wsReconnectAttempts < MAX_WS_RECONNECTS) {
                wsReconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
                console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt ${wsReconnectAttempts}/${MAX_WS_RECONNECTS})`);
                setTimeout(connectManagerWebSocket, delay);
            } else {
                console.log('⚠️  Max reconnection attempts reached. Falling back to polling.');
            }
        };
        
    } catch (error) {
        console.error('Error creating WebSocket:', error);
    }
}

function updateLiveNow(count) {
    // Find and update the "Live Now" display
    const liveStatValue = document.querySelector('.header-stat-value');
    if (liveStatValue && liveStatValue.textContent.includes('Live Now')) {
        const oldValue = parseInt(liveStatValue.textContent) || 0;
        
        // Only update if changed
        if (oldValue !== count) {
            liveStatValue.textContent = `${count} Live Now`;
            
            // Visual feedback when count changes
            liveStatValue.style.transition = 'all 0.3s ease';
            liveStatValue.style.transform = 'scale(1.1)';
            
            if (count > oldValue) {
                // Someone went live - pulse green
                liveStatValue.style.color = 'var(--success)';
            } else if (count < oldValue) {
                // Someone went offline - pulse dim
                liveStatValue.style.color = 'var(--text-dim)';
            }
            
            setTimeout(() => {
                liveStatValue.style.transform = 'scale(1)';
                liveStatValue.style.color = 'var(--text)';
            }, 300);
            
            console.log(`🔴 Live Now: ${count} ${count > oldValue ? '↑' : count < oldValue ? '↓' : ''}`);
        }
    }
}

// Send keep-alive ping every 30 seconds
setInterval(() => {
    if (managerWS && managerWS.readyState === WebSocket.OPEN) {
        managerWS.send(JSON.stringify({ type: 'ping' }));
    }
}, 30000);

// Initialize WebSocket after authentication
// Add this line AFTER the authenticateUser() call succeeds:
// connectManagerWebSocket();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (managerWS) {
        managerWS.close();
    }
});

/* ============================================================================
   USAGE INSTRUCTIONS:
   
   1. Find the initializeDashboard() function
   2. After "await loadData();" add:
      connectManagerWebSocket();
   
   3. Remove or reduce the setInterval polling frequency since WebSocket 
      now provides live updates:
      
      BEFORE: setInterval(async () => { await loadData(); }, 30000); // Every 30s
      AFTER: setInterval(async () => { await loadData(); }, 60000);  // Every 60s (fallback only)
   
   ============================================================================ */

