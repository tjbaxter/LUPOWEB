// admin-dashboard.js
const API_URL = 'https://lupo-backend.fly.dev';
let authToken = null;
let companies = [];

// Initialize
async function init() {
    // Login as admin first
    authToken = await adminLogin();
    if (!authToken) return;
    
    loadCompanies();
    setupEventListeners();
}

async function adminLogin() {
    const email = 'tjpb2@cantab.ac.uk'; // Your admin email
    const password = prompt('Enter admin password:');
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (data.success) {
            return data.token;
        }
    } catch (error) {
        console.error('Login failed:', error);
    }
    return null;
}

async function loadCompanies() {
    try {
        const response = await fetch(`${API_URL}/admin/companies`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        companies = await response.json();
        renderCompanies(companies);
        updateStats();
    } catch (error) {
        console.error('Failed to load companies:', error);
    }
}

function renderCompanies(companiesToRender) {
    const grid = document.getElementById('companiesGrid');
    
    if (companiesToRender.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏢</div>
                <div class="empty-title">No Companies Yet</div>
                <div class="empty-text">Add your first enterprise customer to get started</div>
                <button class="btn" onclick="showAddCompanyModal()">Add First Company</button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = companiesToRender.map(company => `
        <div class="company-card">
            <div class="company-header">
                <div class="company-info">
                    <h3>${company.companyName}</h3>
                    <div class="company-meta">
                        <span>📧 ${company.contactEmail}</span>
                        <span>📅 ${new Date(company.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <span class="status-badge ${company.status}">${company.status}</span>
            </div>
            
            <div class="company-stats">
                <div class="company-stat">
                    <div class="company-stat-value">${company.seats || 0}</div>
                    <div class="company-stat-label">Seats</div>
                </div>
                <div class="company-stat">
                    <div class="company-stat-value">${company.activeReps || 0}</div>
                    <div class="company-stat-label">Active</div>
                </div>
                <div class="company-stat">
                    <div class="company-stat-value">${company.pendingInvites || 0}</div>
                    <div class="company-stat-label">Pending</div>
                </div>
                <div class="company-stat">
                    <div class="company-stat-value">$${company.mrr || 0}</div>
                    <div class="company-stat-label">MRR</div>
                </div>
            </div>
            
            <div class="company-actions">
                <button class="btn btn-secondary" onclick="viewCompany('${company._id}')">View Details</button>
                <button class="btn" onclick="openManagerPortal('${company._id}')">Manager Portal</button>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    const totalCompanies = companies.length;
    const totalSeats = companies.reduce((sum, c) => sum + (c.seats || 0), 0);
    const activeReps = companies.reduce((sum, c) => sum + (c.activeReps || 0), 0);
    const mrr = companies.reduce((sum, c) => sum + (c.mrr || 0), 0);
    
    document.getElementById('totalCompanies').textContent = totalCompanies;
    document.getElementById('totalSeats').textContent = totalSeats;
    document.getElementById('activeReps').textContent = activeReps;
    document.getElementById('mrr').textContent = `$${mrr.toLocaleString()}`;
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Show selected tab
            const tabId = tab.dataset.tab;
            document.getElementById(`${tabId}-tab`).style.display = 'block';
        });
    });
    
    // Search
    document.getElementById('searchCompanies').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = companies.filter(c => 
            c.companyName.toLowerCase().includes(query) ||
            c.contactEmail.toLowerCase().includes(query)
        );
        renderCompanies(filtered);
    });
}

function showAddCompanyModal() {
    document.getElementById('companyModal').classList.add('show');
    document.getElementById('modalTitle').textContent = 'Add New Company';
}

function closeModal() {
    document.getElementById('companyModal').classList.remove('show');
}

async function sendManagerInvite() {
    const companyName = document.getElementById('modalCompanyName').value;
    const managerEmail = document.getElementById('modalManagerEmail').value;
    const managerName = document.getElementById('modalManagerName').value;
    const plan = document.getElementById('modalPlan').value;
    const seats = document.getElementById('modalSeats').value;
    
    try {
        const response = await fetch(`${API_URL}/admin/create-company-with-manager`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                companyName,
                managerEmail,
                managerName,
                plan,
                seats: parseInt(seats)
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert(`Company created! Manager invite sent to ${managerEmail}`);
            closeModal();
            loadCompanies();
        }
    } catch (error) {
        alert('Failed to create company');
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);