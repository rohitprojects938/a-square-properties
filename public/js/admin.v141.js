// ═══════════════════════════════════════════════════════════════
// House Rental — Modern SaaS Admin Panel JS Core
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

// State Management
let currentSection = 'dashboard';
let usersList = [];
let propertiesList = [];
let servicesList = [];
let plansList = [];
let paymentsList = [];
let reelsList = [];
let bannersList = [];
let auditLogs = [];

// Initialize Dashboard
async function initAdminDashboard() {
  // Theme check
  const savedTheme = localStorage.getItem('admin_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  // Auth check
  const loggedUserStr = localStorage.getItem('user');
  if (!loggedUserStr) {
    window.location.href = '/login.html';
    return;
  }
  const u = JSON.parse(loggedUserStr);
  if (u.role !== 'admin') {
    alert('Access denied. Admin role required.');
    window.location.href = '/profile.html';
    return;
  }

  // Setup UI event listeners
  setupNavEvents();
  setupThemeToggle();
  setupSidebarToggle();
  setupGlobalSearch();

  // Load Dashboard Data (initial load)
  await loadSectionData('dashboard');
  addAuditLog('System initialized', 'Admin panel dashboard interface loaded by ' + u.email);
}

// Nav Routing Simulation
function setupNavEvents() {
  document.querySelectorAll('.nav-item[data-target]').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      const target = item.getAttribute('data-target');
      
      // Update UI active states
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Update Section
      document.querySelectorAll('.adm-section').forEach(sec => sec.classList.remove('active'));
      const activeSec = document.getElementById(`sec-${target}`);
      if (activeSec) activeSec.classList.add('active');

      // Update Page Title
      const label = item.querySelector('.nav-label').textContent;
      document.getElementById('topbar-page-title').textContent = label;

      // Close mobile sidebar if open
      document.getElementById('adm-sidebar').classList.remove('mobile-open');
      document.getElementById('adm-mobile-overlay').classList.remove('active');

      currentSection = target;
      await loadSectionData(target);
    });
  });
}

// Load Section Specific Data
async function loadSectionData(section) {
  showLoader();
  try {
    switch(section) {
      case 'dashboard':
        await loadDashboardOverview();
        break;
      case 'users':
        await loadUsersTable();
        break;
      case 'listings':
        await loadListingsTable();
        break;
      case 'approval':
        await loadApprovalQueue();
        break;
      case 'featured':
        await loadFeaturedProperties();
        break;
      case 'banners':
        loadBannersSection();
        break;

      case 'services':
        await loadServicesManager();
        break;
      case 'reviews':
        await loadReviewsManager();
        break;
      case 'loans':
        await loadLoansManager();
        break;
      case 'plans':
        await loadPlansManager();
        break;
      case 'payments':
        await loadPaymentsLog();
        break;
      case 'reels':
        await loadReelsTable();
        break;
      case 'analytics':
        await loadAnalyticsCharts();
        break;
      case 'notifications':
        initNotificationComposer();
        break;
      case 'reports':
        loadReportsSection();
        break;
      case 'audit':
        renderAuditLogs();
        break;
      case 'settings':
        await loadSettingsPanel();
        break;
    }
  } catch(e) {
    showToast('❌ Error loading section: ' + e.message, 'danger');
  } finally {
    hideLoader();
  }
}

// ─── DASHBOARD OVERVIEW ─────────────────────────────────────────
async function loadDashboardOverview() {
  const result = await apiRequest('/api/admin/stats');
  if (result.success) {
    const stats = result.stats;
    
    // Bind all stat boxes
    document.getElementById('stat-total-users').textContent = stats.totalUsers;
    document.getElementById('stat-active-users').textContent = stats.activeUsers;
    document.getElementById('stat-inactive-users').textContent = stats.inactiveUsers;
    document.getElementById('stat-google-users').textContent = stats.googleUsers;
    document.getElementById('stat-phone-users').textContent = stats.phoneUsers;
    document.getElementById('stat-premium-subs').textContent = stats.activeSubscriptions;
    document.getElementById('stat-free-users').textContent = stats.freeUsers;
    document.getElementById('stat-total-listings').textContent = stats.totalProperties;
    document.getElementById('stat-pending-listings').textContent = stats.pendingProperties;
    document.getElementById('stat-approved-listings').textContent = stats.approvedProperties;
    document.getElementById('stat-rejected-listings').textContent = stats.rejectedProperties;
    document.getElementById('stat-featured-listings').textContent = stats.featuredProperties;
    document.getElementById('stat-today-users').textContent = stats.todayNewUsers;
    document.getElementById('stat-today-listings').textContent = stats.todayListings;
    document.getElementById('stat-revenue-today').textContent = `₹${formatNumber(stats.revenueToday)}`;
    document.getElementById('stat-revenue-month').textContent = `₹${formatNumber(stats.revenueMonth)}`;
    document.getElementById('stat-revenue-total').textContent = `₹${formatNumber(stats.revenueTotal)}`;

    // Render Recent Users
    const usersBody = document.getElementById('recent-users-list');
    usersBody.innerHTML = result.recentUsers.length ? result.recentUsers.map(u => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--adm-border);">
        <div>
          <div style="font-weight:600; font-size:12px;">${u.name}</div>
          <div style="font-size:10px; color:var(--adm-muted);">${u.email}</div>
        </div>
        <span class="adm-badge badge-gray" style="font-size:9px;">${u.provider}</span>
      </div>
    `).join('') : '<p style="color:var(--adm-muted); font-size:11px;">No new registrations today.</p>';

    // Render Recent Payments
    const payBody = document.getElementById('recent-payments-list');
    payBody.innerHTML = result.recentPayments.length ? result.recentPayments.map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--adm-border);">
        <div>
          <div style="font-weight:600; font-size:12px;">${p.user_name}</div>
          <div style="font-size:10px; color:var(--adm-muted);">${new Date(p.created_at).toLocaleDateString()}</div>
        </div>
        <strong style="font-size:12px; color:var(--adm-success);">₹${p.amount}</strong>
      </div>
    `).join('') : '<p style="color:var(--adm-muted); font-size:11px;">No transactions recorded.</p>';

    // Render Recent Listings
    const listBody = document.getElementById('recent-listings-list');
    listBody.innerHTML = result.recentProperties.length ? result.recentProperties.map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--adm-border);">
        <div style="min-width:0; flex:1;">
          <div style="font-weight:600; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.title}</div>
          <div style="font-size:10px; color:var(--adm-muted);">${p.city} • ₹${formatNumber(p.price)}</div>
        </div>
        <span class="adm-badge ${p.approval_status === 'approved' ? 'badge-green' : (p.approval_status === 'pending' ? 'badge-amber' : 'badge-red')}" style="font-size:8px;">${p.approval_status}</span>
      </div>
    `).join('') : '<p style="color:var(--adm-muted); font-size:11px;">No listings added recently.</p>';

    if (window.lucide) window.lucide.createIcons();
  }
}

// ─── USERS MANAGEMENT ───────────────────────────────────────────
async function loadUsersTable(page = 1) {
  const search = document.getElementById('user-search-query')?.value || '';
  const filterRole = document.getElementById('user-filter-role')?.value || '';
  const filterSub = document.getElementById('user-filter-sub')?.value || '';
  
  const qs = new URLSearchParams({ page, limit: 10, search, role: filterRole, status: filterSub }).toString();
  const res = await apiRequest(`/api/admin/users?${qs}`);
  
  if (res.success) {
    usersList = res.data;
    const body = document.getElementById('users-table-body');
    if (!body) return;
    
    body.innerHTML = usersList.map(u => `
      <tr>
        <td>
          <div class="adm-user-cell">
            ${window.AvatarSystem.renderHtml({ name: u.name, profile_photo: u.profile_photo || u.profile_picture }, 'adm-user-avatar-img', 'width:32px; height:32px; border-radius:50%; object-fit:cover;')}
            <div>
              <div class="adm-user-name">${u.name}</div>
              <div class="adm-user-email">${u.email}</div>
            </div>
          </div>
        </td>
        <td>${u.phone || 'N/A'}</td>
        <td><span class="adm-badge ${u.role === 'admin' ? 'badge-orange' : 'badge-blue'}">${u.role}</span></td>
        <td><span class="adm-badge badge-gray">${u.provider}</span></td>
        <td><span class="adm-badge ${u.subscription_status === 'active' ? 'badge-green' : 'badge-red'}">${u.subscription_status}</span></td>
        <td>${u.properties_count}</td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
        <td>
          <div class="adm-actions">
            <button class="adm-btn adm-btn-ghost adm-btn-sm" onclick="viewUserProfile(${u.id})"><i data-lucide="eye"></i> View</button>
            <button class="adm-btn adm-btn-danger adm-btn-sm" onclick="deleteUserPrompt(${u.id})"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    renderPagination('users-pagination', res.pagination, loadUsersTable);
    if (window.lucide) window.lucide.createIcons();
  }
}

window.filterUsers = () => loadUsersTable(1);

// View User Profile details in modal
window.viewUserProfile = async (uid) => {
  const res = await apiRequest(`/api/admin/users/${uid}`);
  if (res.success) {
    const u = res.data;
    const modal = document.getElementById('user-profile-modal');
    
    document.getElementById('prof-name').textContent = u.name;
    document.getElementById('prof-email').textContent = u.email;
    document.getElementById('prof-phone').textContent = u.phone || 'N/A';
    document.getElementById('prof-role').textContent = u.role;
    document.getElementById('prof-provider').textContent = u.provider;
    document.getElementById('prof-sub').textContent = u.subscription_status;
    document.getElementById('prof-created').textContent = new Date(u.created_at).toLocaleDateString();

    // Store user ID for actions
    modal.setAttribute('data-user-id', uid);

    // List properties owned
    const listBody = document.getElementById('prof-properties-list');
    listBody.innerHTML = res.properties.length ? res.properties.map(p => `
      <div style="padding:8px; background:var(--adm-surface2); border-radius:var(--adm-radius-sm); font-size:12px; margin-bottom:6px; display:flex; justify-content:space-between;">
        <span>${p.title}</span>
        <strong>₹${formatNumber(p.price)}</strong>
      </div>
    `).join('') : '<p style="color:var(--adm-muted); font-size:11px;">No listings owned.</p>';

    // Actions binds
    document.getElementById('btn-action-activate').onclick = () => updateUserSubscription(uid, 'active');
    document.getElementById('btn-action-deactivate').onclick = () => updateUserSubscription(uid, 'inactive');
    document.getElementById('btn-action-suspend').onclick = () => updateUserSuspension(uid, true);

    openModal('user-profile-modal');
  }
};

async function updateUserSubscription(uid, status) {
  const res = await apiRequest(`/api/admin/users/${uid}`, 'PUT', { subscription_status: status });
  if (res.success) {
    showToast(`User subscription updated to ${status}!`);
    closeModal('user-profile-modal');
    loadUsersTable();
    addAuditLog('Subscription modified', `User ID ${uid} subscription set to ${status}`);
  }
}

async function updateUserSuspension(uid, suspend) {
  const res = await apiRequest(`/api/admin/users/${uid}`, 'PUT', { is_suspended: suspend ? 1 : 0 });
  if (res.success) {
    showToast(suspend ? 'User account suspended!' : 'User account activated!');
    closeModal('user-profile-modal');
    loadUsersTable();
  }
}

window.deleteUserPrompt = async (uid) => {
  if (confirm('Are you absolutely sure you want to delete this user? All their listings will be deleted.')) {
    const res = await apiRequest(`/api/admin/users/${uid}`, 'DELETE');
    if (res.success) {
      showToast('User successfully deleted!', 'success');
      loadUsersTable();
      addAuditLog('User deleted', `Deleted user ID ${uid} along with listings.`);
    }
  }
};

// ─── LISTINGS MANAGEMENT ────────────────────────────────────────
async function loadListingsTable(page = 1) {
  const search = document.getElementById('listing-search-query')?.value || '';
  const status = document.getElementById('listing-filter-status')?.value || '';
  
  const qs = new URLSearchParams({ page, limit: 10, search, status }).toString();
  const res = await apiRequest(`/api/admin/properties?${qs}`);
  
  if (res.success) {
    propertiesList = res.data;
    const body = document.getElementById('listings-table-body');
    if (!body) return;

    body.innerHTML = propertiesList.map(p => `
      <tr>
        <td><img class="adm-prop-img" src="${p.cover_image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=100&q=80'}" alt=""></td>
        <td>
          <div style="font-weight:600;">${p.title}</div>
          <div style="font-size:10px; color:var(--adm-muted);">${p.city} • ${p.category} • ${p.listing_type}</div>
        </td>
        <td>
          <div style="font-weight:500;">${p.owner_name}</div>
          <div style="font-size:10px; color:var(--adm-muted);">${p.owner_email}</div>
        </td>
        <td><strong>₹${formatNumber(p.price)}</strong></td>
        <td><span class="adm-badge ${p.approval_status === 'approved' ? 'badge-green' : (p.approval_status === 'pending' ? 'badge-amber' : 'badge-red')}">${p.approval_status}</span></td>
        <td><span class="adm-badge ${p.is_hidden ? 'badge-red' : 'badge-green'}">${p.is_hidden ? 'Hidden' : 'Visible'}</span></td>
        <td><span class="adm-badge ${p.is_featured ? 'badge-orange' : 'badge-gray'}">${p.is_featured ? '★ Featured' : 'Normal'}</span></td>
        <td>
          <div class="adm-actions">
            <a href="/post.html?edit=${p.id}" class="adm-btn adm-btn-ghost adm-btn-sm" style="text-decoration:none; display:inline-flex; align-items:center;">Edit</a>
            <button class="adm-btn adm-btn-ghost adm-btn-sm" onclick="toggleListingFeatured(${p.id}, ${p.is_featured ? 0 : 1})">${p.is_featured ? 'Unfeature' : 'Feature'}</button>
            <button class="adm-btn adm-btn-ghost adm-btn-sm" onclick="toggleListingVisibility(${p.id}, ${p.is_hidden ? 0 : 1})">${p.is_hidden ? 'Show' : 'Hide'}</button>
            <button class="adm-btn adm-btn-danger adm-btn-sm" onclick="deleteListingPrompt(${p.id})"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    renderPagination('listings-pagination', res.pagination, loadListingsTable);
    if (window.lucide) window.lucide.createIcons();
  }
}

window.filterListings = () => loadListingsTable(1);

window.toggleListingFeatured = async (pid, state) => {
  const res = await apiRequest('/api/admin/property/featured', 'POST', { propertyId: pid, featured: state });
  if (res.success) {
    showToast(state ? 'Property marked as featured!' : 'Property removed from featured!');
    loadListingsTable();
  }
};

window.toggleListingVisibility = async (pid, state) => {
  const res = await apiRequest('/api/admin/property/visibility', 'POST', { propertyId: pid, hidden: state });
  if (res.success) {
    showToast(state ? 'Property hidden successfully!' : 'Property is now visible!');
    loadListingsTable();
  }
};

window.deleteListingPrompt = async (pid) => {
  if (confirm('Are you sure you want to delete this listing permanently?')) {
    const res = await apiRequest(`/api/admin/properties/${pid}`, 'DELETE');
    if (res.success) {
      showToast('Property listing deleted.', 'success');
      loadListingsTable();
    }
  }
};

// ─── PROPERTY APPROVAL QUEUE ────────────────────────────────────
async function loadApprovalQueue() {
  const statsRes = await apiRequest('/api/admin/stats');
  if (statsRes.success) {
    const list = statsRes.pendingList || [];
    const container = document.getElementById('approval-queue-container');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="adm-empty">
          <div class="adm-empty-icon">✓</div>
          <div class="adm-empty-title">Queue is empty</div>
          <div class="adm-empty-desc">All submitted House Rental Listings have been approved or rejected.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(p => {
      const safeTitle = window.SafeRender.safeText(p.title, 'Untitled');
      const safeCity = window.SafeRender.safeText(p.city, 'Unknown');
      const safeCategory = window.SafeRender.safeText(p.category, 'Unknown');
      const safePrice = p.price ? formatNumber(p.price) : '0';
      const safeDate = p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Unknown';
      return `
        <div class="adm-approval-card">
          <img class="adm-approval-img" src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=120&q=80" alt="">
          <div class="adm-approval-info">
            <div class="adm-approval-title">${safeTitle}</div>
            <div class="adm-approval-meta">City: ${safeCity} • Category: ${safeCategory} • Price: ₹${safePrice} • Date: ${safeDate}</div>
            <div class="adm-approval-actions">
              <a href="/post.html?edit=${p.id}" class="adm-btn adm-btn-ghost adm-btn-sm" style="text-decoration:none; display:inline-flex; align-items:center;">Edit</a>
              <button class="adm-btn adm-btn-success adm-btn-sm" onclick="approveProperty(${p.id})">Approve</button>
              <button class="adm-btn adm-btn-danger adm-btn-sm" onclick="rejectProperty(${p.id})">Reject</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.approveProperty = async (pid) => {
  const res = await apiRequest('/api/admin/property/status', 'POST', { propertyId: pid, status: 'approved' });
  if (res.success) {
    showToast('Property approved and published!');
    loadApprovalQueue();
    addAuditLog('Property approved', `Approved listing ID ${pid}`);
  }
};

window.rejectProperty = async (pid) => {
  const res = await apiRequest('/api/admin/property/status', 'POST', { propertyId: pid, status: 'rejected' });
  if (res.success) {
    showToast('Property rejected.');
    loadApprovalQueue();
  }
};

// ─── FEATURED MANAGER ───────────────────────────────────────────
async function loadFeaturedProperties() {
  const res = await apiRequest('/api/properties?is_featured=1&limit=50');
  if (res.success) {
    const list = res.data || [];
    const body = document.getElementById('featured-manager-list');
    if (!body) return;

    if (list.length === 0) {
      body.innerHTML = '<p style="color:var(--adm-muted); padding:20px;">No featured properties marked yet.</p>';
      return;
    }

    body.innerHTML = list.map((p, idx) => `
      <div style="background:var(--adm-surface); border:1px solid var(--adm-border); border-radius:var(--adm-radius-sm); padding:12px; margin-bottom:8px; display:flex; align-items:center; gap:12px;">
        <span style="font-weight:700; color:var(--adm-muted); width:20px;">#${idx+1}</span>
        <img src="${p.cover_image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=60&q=80'}" style="width:50px; height:38px; object-fit:cover; border-radius:4px;">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.title}</div>
          <div style="font-size:10px; color:var(--adm-muted);">${p.city} • ₹${formatNumber(p.price)}</div>
        </div>
        <button class="adm-btn adm-btn-ghost adm-btn-sm" onclick="toggleListingFeatured(${p.id}, 0)">Remove</button>
      </div>
    `).join('');
  }
}

// ─── HOME SERVICES MANAGER ──────────────────────────────────────
async function loadServicesManager() {
  const res = await apiRequest('/api/admin/services');
  if (res.success) {
    servicesList = res.data;
    const grid = document.getElementById('services-manager-grid');
    if (!grid) return;

    grid.innerHTML = servicesList.map(s => `
      <div class="adm-service-card">
        <div class="adm-service-icon">${s.icon || '🔧'}</div>
        <div class="adm-service-name">${s.name}</div>
        <div style="font-size:11px; color:var(--adm-muted); margin-bottom:4px;">${s.description || 'No description'}</div>
        <div style="font-size:11px; color:var(--adm-muted); margin-bottom:8px;">WhatsApp: ${s.whatsapp_number || 'None'} • Order: ${s.sort_order || 0}</div>
        <span class="adm-badge ${s.is_active ? 'badge-green' : 'badge-red'}" style="font-size:9px;">${s.is_active ? 'Active' : 'Inactive'}</span>
        <div class="adm-service-actions">
          <button class="adm-btn adm-btn-ghost adm-btn-sm" onclick="editServiceModal(${s.id})"><i data-lucide="edit-2"></i></button>
          <button class="adm-btn adm-btn-danger adm-btn-sm" onclick="deleteService(${s.id})"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }
}

window.openAddServiceModal = () => {
  const form = document.getElementById('service-form');
  form.reset();
  document.getElementById('service-modal-title').textContent = 'Add Home Service';
  form.removeAttribute('data-id');
  openModal('service-modal');
};

window.editServiceModal = (sid) => {
  const s = servicesList.find(item => item.id === sid);
  if (!s) return;
  const form = document.getElementById('service-form');
  form.setAttribute('data-id', sid);
  document.getElementById('service-modal-title').textContent = 'Edit Home Service';
  document.getElementById('service-name').value = s.name;
  document.getElementById('service-icon').value = s.icon || '🔧';
  document.getElementById('service-whatsapp').value = s.whatsapp_number || '+919919014220';
  document.getElementById('service-description').value = s.description || '';
  document.getElementById('service-order').value = s.sort_order || 0;
  document.getElementById('service-status').value = s.is_active ? '1' : '0';
  openModal('service-modal');
};

window.saveAdminService = async (e) => {
  e.preventDefault();
  const form = document.getElementById('service-form');
  const sid = form.getAttribute('data-id');
  const payload = {
    name: document.getElementById('service-name').value,
    icon: document.getElementById('service-icon').value,
    whatsapp_number: document.getElementById('service-whatsapp').value,
    description: document.getElementById('service-description').value,
    sort_order: parseInt(document.getElementById('service-order').value) || 0,
    is_active: document.getElementById('service-status').value === '1'
  };

  const url = sid ? `/api/admin/services/${sid}` : '/api/admin/services';
  const method = sid ? 'PUT' : 'POST';
  const res = await apiRequest(url, method, payload);
  if (res.success) {
    showToast(sid ? 'Service updated successfully!' : 'New service created!');
    closeModal('service-modal');
    loadServicesManager();
  }
};

window.deleteService = async (sid) => {
  if (confirm('Delete this home service category?')) {
    const res = await apiRequest(`/api/admin/services/${sid}`, 'DELETE');
    if (res.success) {
      showToast('Service category deleted.');
      loadServicesManager();
    }
  }
};

// ─── CUSTOMER REVIEWS MODERATION ─────────────────────────────────
let reviewsList = [];
let activeReviewReplyId = null;

async function loadReviewsManager() {
  const status = document.getElementById('review-filter-status').value;
  const search = document.getElementById('review-search').value.trim();
  const res = await apiRequest(`/api/admin/reviews?status=${status}&search=${encodeURIComponent(search)}`);
  if (res.success) {
    reviewsList = res.data;
    const tbody = document.getElementById('reviews-manager-list');
    if (!tbody) return;

    if (reviewsList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--adm-muted);">No customer reviews found.</td></tr>';
      return;
    }

    tbody.innerHTML = reviewsList.map(r => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      let badgeColor = 'badge-gray';
      if (r.status === 'approved') badgeColor = 'badge-green';
      if (r.status === 'rejected') badgeColor = 'badge-red';

      const formattedDate = new Date(r.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <tr>
          <td>${r.id}</td>
          <td>
            <strong>${r.name}</strong>
            ${r.email ? `<br><span style="font-size:10px; color:var(--adm-muted);">${r.email}</span>` : ''}
          </td>
          <td><span style="color:#ffb800;">${stars}</span></td>
          <td>
            <div style="max-width:250px; white-space:normal; font-size:12px;">${r.review_text}</div>
            <div style="font-size:9px; color:var(--adm-muted); margin-top:4px;">Date: ${formattedDate}</div>
          </td>
          <td><span class="adm-badge ${badgeColor}">${r.status}</span></td>
          <td><div style="max-width:180px; white-space:normal; font-size:11px; color:#a0aec0;">${r.reply_text || '<em>No reply</em>'}</div></td>
          <td>
            <div style="display:flex; gap:6px;">
              ${r.status !== 'approved' ? `<button class="adm-btn adm-btn-sm" style="background:#25d366; color:white; border:none;" onclick="updateReviewStatus(${r.id}, 'approved')">Approve</button>` : ''}
              ${r.status !== 'rejected' ? `<button class="adm-btn adm-btn-sm" style="background:#ff3b30; color:white; border:none;" onclick="updateReviewStatus(${r.id}, 'rejected')">Reject</button>` : ''}
              <button class="adm-btn adm-btn-ghost adm-btn-sm" onclick="openReviewReplyModal(${r.id})">Reply</button>
              <button class="adm-btn adm-btn-danger adm-btn-sm" onclick="deleteReview(${r.id})"><i data-lucide="trash-2"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }
}

window.updateReviewStatus = async (rid, newStatus) => {
  const res = await apiRequest(`/api/admin/reviews/${rid}/status`, 'PUT', { status: newStatus });
  if (res.success) {
    showToast(`Review status updated to ${newStatus}.`);
    loadReviewsManager();
  }
};

window.openReviewReplyModal = (rid) => {
  activeReviewReplyId = rid;
  const r = reviewsList.find(item => item.id === rid);
  document.getElementById('review-reply-text').value = r ? (r.reply_text || '') : '';
  openModal('review-reply-modal');
};

window.saveAdminReviewReply = async (e) => {
  e.preventDefault();
  if (!activeReviewReplyId) return;
  const reply_text = document.getElementById('review-reply-text').value.trim();
  const res = await apiRequest(`/api/admin/reviews/${activeReviewReplyId}/reply`, 'POST', { reply_text });
  if (res.success) {
    showToast('Review reply posted!');
    closeModal('review-reply-modal');
    loadReviewsManager();
  }
};

window.deleteReview = async (rid) => {
  if (confirm('Delete this customer review permanently?')) {
    const res = await apiRequest(`/api/admin/reviews/${rid}`, 'DELETE');
    if (res.success) {
      showToast('Review deleted successfully.');
      loadReviewsManager();
    }
  }
};

// ─── LOAN LEADS MANAGER ──────────────────────────────────────────
let loansList = [];
let loansCurrentPage = 1;

function getLoanFilters() {
  return {
    search:    (document.getElementById('loan-search')        || {}).value || '',
    status:    (document.getElementById('loan-status-filter') || {}).value || '',
    date_from: (document.getElementById('loan-date-from')     || {}).value || '',
    date_to:   (document.getElementById('loan-date-to')       || {}).value || '',
  };
}

async function loadLoansManager(page = 1) {
  loansCurrentPage = page;
  await loadAdminLoanSettings();

  const { search, status, date_from, date_to } = getLoanFilters();
  const params = new URLSearchParams({ search, status, date_from, date_to, page, limit: 20 });
  const res = await apiRequest(`/api/admin/loans?${params}`);

  if (!res.success) return;
  loansList = res.data;

  // Update count label
  const countLabel = document.getElementById('loans-count-label');
  if (countLabel && res.pagination) {
    countLabel.innerText = `${res.pagination.total} application${res.pagination.total !== 1 ? 's' : ''} found`;
  }

  const tbody = document.getElementById('loans-manager-list');
  if (!tbody) return;

  if (loansList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--adm-muted); padding:24px;">No loan applications found.</td></tr>';
    return;
  }

  const statusBadge = (s) => {
    const colors = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };
    return `<span style="display:inline-block; padding:2px 9px; border-radius:20px; font-size:10px; font-weight:700; background:${colors[s] || '#888'}22; color:${colors[s] || '#888'}; border:1px solid ${colors[s] || '#888'}44; text-transform:capitalize;">${s}</span>`;
  };

  tbody.innerHTML = loansList.map(l => `
    <tr>
      <td><strong>#${l.id}</strong></td>
      <td>${l.applicant_name || l.user_name || '<span style="color:var(--adm-muted)">Guest</span>'}</td>
      <td style="font-size:11px;">${l.email || '<span style="color:var(--adm-muted)">—</span>'}</td>
      <td><a href="tel:${l.mobile_number}" style="color:var(--adm-primary); text-decoration:none; font-weight:600;">${l.mobile_number}</a></td>
      <td><code style="font-size:11px;">${l.aadhaar_number}</code></td>
      <td><code style="font-size:11px;">${l.pan_number}</code></td>
      <td>${statusBadge(l.status || 'pending')}</td>
      <td style="font-size:11px; white-space:nowrap;">${new Date(l.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
      <td>
        <div style="display:flex; gap:5px; flex-wrap:wrap;">
          ${l.status !== 'approved'  ? `<button class="adm-btn adm-btn-sm" style="background:#22c55e22; color:#22c55e; border:1px solid #22c55e44;" onclick="updateLoanStatus(${l.id},'approved')" title="Approve"><i data-lucide="check"></i></button>` : ''}
          ${l.status !== 'rejected'  ? `<button class="adm-btn adm-btn-sm" style="background:#ef444422; color:#ef4444; border:1px solid #ef444444;" onclick="updateLoanStatus(${l.id},'rejected')" title="Reject"><i data-lucide="x"></i></button>` : ''}
          ${l.status !== 'pending'   ? `<button class="adm-btn adm-btn-sm" style="background:#f59e0b22; color:#f59e0b; border:1px solid #f59e0b44;" onclick="updateLoanStatus(${l.id},'pending')" title="Set Pending"><i data-lucide="clock"></i></button>` : ''}
          <button class="adm-btn adm-btn-danger adm-btn-sm" onclick="deleteLoanLead(${l.id})" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) window.lucide.createIcons();

  // Pagination
  if (res.pagination) {
    const totalPages = Math.ceil(res.pagination.total / res.pagination.limit);
    const paginationEl = document.getElementById('loans-pagination');
    if (paginationEl && totalPages > 1) {
      paginationEl.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1).map(p =>
        `<button class="adm-btn adm-btn-sm ${p === page ? 'adm-btn-primary' : 'adm-btn-ghost'}" onclick="loadLoansManager(${p})">${p}</button>`
      ).join('');
    } else if (paginationEl) {
      paginationEl.innerHTML = '';
    }
  }
}

async function loadAdminLoanSettings() {
  try {
    const res = await apiRequest('/api/public/settings');
    if (res.success && res.data) {
      document.getElementById('admin-loan-enabled').checked = !!res.data.loan_section_enabled;
      document.getElementById('admin-loan-button-text').value = res.data.loan_apply_button_text || 'Apply Now';
    }
  } catch(e) {
    console.warn('Load loan settings failed:', e.message);
  }
}

window.saveAdminLoanSettings = async (e) => {
  e.preventDefault();
  const loan_section_enabled = document.getElementById('admin-loan-enabled').checked;
  const loan_apply_button_text = document.getElementById('admin-loan-button-text').value.trim();

  const res = await apiRequest('/api/admin/settings/loan', 'PUT', { loan_section_enabled, loan_apply_button_text });
  if (res.success) {
    showToast('Loan configurations saved successfully!');
  }
};

window.updateLoanStatus = async (lid, status) => {
  const res = await apiRequest(`/api/admin/loans/${lid}/status`, 'PUT', { status });
  if (res.success) {
    showToast(`Application marked as ${status}.`);
    loadLoansManager(loansCurrentPage);
  } else {
    showToast(res.error || 'Status update failed.', 'error');
  }
};

window.deleteLoanLead = async (lid) => {
  if (confirm('Permanently delete this loan application?')) {
    const res = await apiRequest(`/api/admin/loans/${lid}`, 'DELETE');
    if (res.success) {
      showToast('Application deleted successfully.');
      loadLoansManager(loansCurrentPage);
    }
  }
};

window.exportLoansXlsx = () => {
  const { search, status, date_from, date_to } = getLoanFilters();
  const params = new URLSearchParams({ search, status, date_from, date_to });
  const token = localStorage.getItem('token');
  // Create a temporary link to download the file
  const a = document.createElement('a');
  a.href = `/api/admin/loans/export/xlsx?${params}`;
  // Pass auth token via URL since file downloads can't use headers easily
  a.href += `&_token=${encodeURIComponent(token || '')}`;
  a.download = 'loan_applications.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Downloading Excel export...');
};



// ─── SUBSCRIPTION PLANS ─────────────────────────────────────────
async function loadPlansManager() {
  const res = await apiRequest('/api/admin/plans');
  if (res.success) {
    plansList = res.data;
    const grid = document.getElementById('plans-manager-grid');
    if (!grid) return;

    grid.innerHTML = plansList.map(p => `
      <div class="adm-plan-card">
        <div class="adm-plan-name">${p.name}</div>
        <div class="adm-plan-price">₹${p.price}<span>/${p.duration_days} Days</span></div>
        <div class="adm-plan-features">
          <div class="adm-plan-feature">✓ Limit: ${p.property_limit} Properties</div>
          <div class="adm-plan-feature">✓ Featured: ${p.featured_limit} listings</div>
          <div class="adm-plan-feature">✓ Active Status: ${p.is_active ? 'Active' : 'Inactive'}</div>
        </div>
        <div style="display:flex; gap:6px; margin-top:14px;">
          <button class="adm-btn adm-btn-ghost adm-btn-sm" style="flex:1;" onclick="editPlanModal(${p.id})">Edit</button>
          <button class="adm-btn adm-btn-danger adm-btn-sm" onclick="deletePlan(${p.id})"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }
}

window.openAddPlanModal = () => {
  const form = document.getElementById('plan-form');
  form.reset();
  document.getElementById('plan-modal-title').textContent = 'Create Subscription Plan';
  form.removeAttribute('data-id');
  openModal('plan-modal');
};

window.editPlanModal = (pid) => {
  const p = plansList.find(item => item.id === pid);
  if (!p) return;
  const form = document.getElementById('plan-form');
  form.setAttribute('data-id', pid);
  document.getElementById('plan-modal-title').textContent = 'Edit Subscription Plan';
  document.getElementById('plan-name').value = p.name;
  document.getElementById('plan-price').value = p.price;
  document.getElementById('plan-duration').value = p.duration_days;
  document.getElementById('plan-limit').value = p.property_limit;
  document.getElementById('plan-featured').value = p.featured_limit;
  document.getElementById('plan-desc').value = p.description || '';
  document.getElementById('plan-status').value = p.is_active ? '1' : '0';
  openModal('plan-modal');
};

window.savePlan = async (e) => {
  e.preventDefault();
  const form = document.getElementById('plan-form');
  const pid = form.getAttribute('data-id');
  const payload = {
    name: document.getElementById('plan-name').value,
    price: parseFloat(document.getElementById('plan-price').value),
    duration_days: parseInt(document.getElementById('plan-duration').value),
    property_limit: parseInt(document.getElementById('plan-limit').value),
    featured_limit: parseInt(document.getElementById('plan-featured').value),
    description: document.getElementById('plan-desc').value,
    is_active: document.getElementById('plan-status').value === '1'
  };

  const url = pid ? `/api/admin/plans/${pid}` : '/api/admin/plans';
  const method = pid ? 'PUT' : 'POST';
  const res = await apiRequest(url, method, payload);
  if (res.success) {
    showToast(pid ? 'Plan updated successfully!' : 'Subscription plan created!');
    closeModal('plan-modal');
    loadPlansManager();
  }
};

window.deletePlan = async (pid) => {
  if (confirm('Delete this subscription plan category?')) {
    const res = await apiRequest(`/api/admin/plans/${pid}`, 'DELETE');
    if (res.success) {
      showToast('Plan deleted.');
      loadPlansManager();
    }
  }
};

// ─── PAYMENTS LOG ───────────────────────────────────────────────
async function loadPaymentsLog(page = 1) {
  const res = await apiRequest(`/api/admin/payments?page=${page}&limit=10`);
  if (res.success) {
    paymentsList = res.data;
    const body = document.getElementById('payments-table-body');
    if (!body) return;

    body.innerHTML = paymentsList.map(p => `
      <tr>
        <td>#${p.id}</td>
        <td>
          <div style="font-weight:600;">${p.user_name}</div>
          <div style="font-size:10px; color:var(--adm-muted);">${p.user_email}</div>
        </td>
        <td>${p.razorpay_order_id}</td>
        <td>${p.razorpay_payment_id || 'N/A'}</td>
        <td><strong>₹${p.amount}</strong></td>
        <td><span class="adm-badge ${p.status === 'success' ? 'badge-green' : (p.status === 'failed' ? 'badge-red' : 'badge-amber')}">${p.status}</span></td>
        <td>${new Date(p.created_at || Date.now()).toLocaleString()}</td>
      </tr>
    `).join('');
  }
}

// ─── REELS APPROVAL ─────────────────────────────────────────────
async function loadReelsTable(page = 1) {
  const res = await apiRequest(`/api/admin/reels?page=${page}&limit=10`);
  if (res.success) {
    reelsList = res.data;
    const body = document.getElementById('reels-table-body');
    if (!body) return;

    if (reelsList.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--adm-muted);">No vertical reels submitted yet.</td></tr>';
      return;
    }

    body.innerHTML = reelsList.map(r => `
      <tr>
        <td>#${r.id}</td>
        <td><a href="${r.video_url}" target="_blank" style="color:var(--adm-accent); font-weight:600;">View Video 🔗</a></td>
        <td>${r.owner_name || 'Owner'}</td>
        <td>${r.caption}</td>
        <td><span class="adm-badge ${r.approval_status === 'approved' ? 'badge-green' : (r.approval_status === 'pending' ? 'badge-amber' : 'badge-red')}">${r.approval_status}</span></td>
        <td>
          <div class="adm-actions">
            <button class="adm-btn adm-btn-success adm-btn-sm" onclick="decideReel(${r.id}, 'approved')">Approve</button>
            <button class="adm-btn adm-btn-danger adm-btn-sm" onclick="decideReel(${r.id}, 'rejected')">Reject</button>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

window.decideReel = async (rid, state) => {
  const res = await apiRequest('/api/admin/reel/status', 'POST', { reelId: rid, status: state });
  if (res.success) {
    showToast(`Reel listing status set to ${state}.`);
    loadReelsTable();
  }
};

// ─── ANALYTICS CHARTS (using Chart.js) ─────────────────────────
let chartsInstances = {};
async function loadAnalyticsCharts() {
  const res = await apiRequest('/api/admin/analytics');
  if (res.success) {
    // 1. Registrations
    const regCtx = document.getElementById('chart-registrations')?.getContext('2d');
    if (regCtx) {
      if (chartsInstances.regs) chartsInstances.regs.destroy();
      chartsInstances.regs = new Chart(regCtx, {
        type: 'line',
        data: {
          labels: res.dailyUsers.map(d => d.date),
          datasets: [{ label: 'Registrations', data: res.dailyUsers.map(d => d.count), borderColor: '#8b5cf6', fill: false, tension: 0.1 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    // 2. Listings growth
    const listCtx = document.getElementById('chart-listings')?.getContext('2d');
    if (listCtx) {
      if (chartsInstances.lists) chartsInstances.lists.destroy();
      chartsInstances.lists = new Chart(listCtx, {
        type: 'bar',
        data: {
          labels: res.dailyListings.map(d => d.date),
          datasets: [{ label: 'Listings', data: res.dailyListings.map(d => d.count), backgroundColor: '#FF6A00' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    // 3. Category distribution
    const catCtx = document.getElementById('chart-categories')?.getContext('2d');
    if (catCtx) {
      if (chartsInstances.cats) chartsInstances.cats.destroy();
      chartsInstances.cats = new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: res.catDist.map(c => c.category),
          datasets: [{ data: res.catDist.map(c => c.count), backgroundColor: ['#FF6A00', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'] }]
        },
        options: { responsive: true }
      });
    }
  }
}

// ─── BANNERS SECTION ────────────────────────────────────────────
async function loadBannersSection() {
  const container = document.getElementById('banners-manager-container');
  if (!container) return;

  container.innerHTML = `<p style="padding: 16px; color: var(--adm-muted);">Loading promotional banners...</p>`;

  try {
    const res = await apiRequest('/api/banners/admin');
    if (res.success) {
      bannersList = res.data || [];
      
      let html = `
        <div class="adm-card-toolbar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap: 16px; flex-wrap: wrap;">
          <p style="font-size:12px; color:var(--adm-muted); margin:0;">Upload new banners, reorder, or enable/disable them. Banners slide sequentially based on Sort Order.</p>
          <button class="adm-btn adm-btn-primary" onclick="openAddBannerModal()"><i data-lucide="plus"></i> Add Banner</button>
        </div>
      `;

      if (bannersList.length === 0) {
        html += `<p style="padding:20px; color:var(--adm-muted); text-align:center;">No promo banners added yet.</p>`;
      } else {
        html += `
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
            ${bannersList.map(b => `
              <div class="adm-card" style="display:flex; flex-direction:column; gap:12px; padding:16px; border:1px solid var(--adm-border); border-radius:12px; position:relative;">
                <div style="position:relative; width:100%; aspect-ratio:16/9; border-radius:8px; overflow:hidden; background:#222;">
                  <img src="${b.image_url}" style="width:100%; height:100%; object-fit:cover;">
                  <span class="adm-badge ${b.is_active ? 'badge-orange' : 'badge-gray'}" style="position:absolute; top:8px; right:8px; z-index:2;">
                    ${b.is_active ? '★ Active' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700; color:var(--adm-text);">${b.title || 'Untitled Banner'}</h4>
                  <p style="margin:0 0 8px 0; font-size:11px; color:var(--adm-muted);">${b.subtitle || 'No subtitle provided'}</p>
                  <div style="display:flex; flex-direction:column; gap:4px; font-size:11px; color:var(--adm-muted);">
                    <div style="word-break: break-all;"><strong>Link:</strong> ${b.link_url || 'None'}</div>
                    <div><strong>Sort Order:</strong> ${b.sort_order || 0}</div>
                  </div>
                </div>
                <div style="display:flex; gap:8px; margin-top:auto; padding-top:8px; border-top:1px dashed var(--adm-border);">
                  <button class="adm-btn adm-btn-ghost adm-btn-sm" style="flex:1; border: 1px solid var(--adm-border);" onclick="editBannerModal(${b.id})">Edit</button>
                  <button class="adm-btn adm-btn-ghost adm-btn-sm" style="flex:1; color:var(--adm-danger); border: 1px solid var(--adm-border);" onclick="deleteBanner(${b.id})">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
      container.innerHTML = html;
      if (window.lucide) window.lucide.createIcons();
    } else {
      container.innerHTML = `<p style="padding:16px; color:var(--adm-danger);">Failed to load promotional banners.</p>`;
    }
  } catch (err) {
    container.innerHTML = `<p style="padding:16px; color:var(--adm-danger);">Error: ${err.message}</p>`;
  }
}

window.openAddBannerModal = () => {
  const form = document.getElementById('banner-form');
  form.reset();
  form.removeAttribute('data-id');
  document.getElementById('banner-modal-title').textContent = 'Upload Promo Banner';
  
  document.getElementById('banner-preview-wrapper').style.display = 'none';
  document.getElementById('banner-preview').src = '';
  
  openModal('banner-modal');
};

window.editBannerModal = (bid) => {
  const b = bannersList.find(item => item.id === bid);
  if (!b) return;

  const form = document.getElementById('banner-form');
  form.setAttribute('data-id', bid);
  document.getElementById('banner-modal-title').textContent = 'Edit Promo Banner';

  document.getElementById('banner-file').value = '';
  document.getElementById('banner-url').value = b.image_url || '';
  document.getElementById('banner-title').value = b.title || '';
  document.getElementById('banner-subtitle').value = b.subtitle || '';
  document.getElementById('banner-link').value = b.link_url || '';
  document.getElementById('banner-order').value = b.sort_order || 0;
  document.getElementById('banner-status').value = b.is_active ? '1' : '0';

  const previewWrapper = document.getElementById('banner-preview-wrapper');
  const previewImg = document.getElementById('banner-preview');
  if (b.image_url) {
    previewImg.src = b.image_url;
    previewWrapper.style.display = 'block';
  } else {
    previewWrapper.style.display = 'none';
  }

  openModal('banner-modal');
};

window.saveBanner = async (e) => {
  e.preventDefault();
  const form = document.getElementById('banner-form');
  const bid = form.getAttribute('data-id');

  const fileInput = document.getElementById('banner-file');
  const urlInput = document.getElementById('banner-url');
  const titleInput = document.getElementById('banner-title');
  const subtitleInput = document.getElementById('banner-subtitle');
  const linkInput = document.getElementById('banner-link');
  const orderInput = document.getElementById('banner-order');
  const statusSelect = document.getElementById('banner-status');

  if (!fileInput.files[0] && !urlInput.value.trim()) {
    showToast('Please upload an image file or provide an image URL.', 'danger');
    return;
  }

  const formData = new FormData();
  if (fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
  }
  formData.append('imageUrl', urlInput.value.trim());
  formData.append('title', titleInput.value.trim());
  formData.append('subtitle', subtitleInput.value.trim());
  formData.append('linkUrl', linkInput.value.trim());
  formData.append('sortOrder', orderInput.value);
  formData.append('isActive', statusSelect.value === '1');

  const url = bid ? `/api/banners/${bid}` : '/api/banners';
  const method = bid ? 'PUT' : 'POST';

  showLoader();
  try {
    const res = await apiRequest(url, method, formData, true);
    if (res.success) {
      showToast(bid ? 'Promo banner updated successfully!' : 'Promo banner created successfully!');
      closeModal('banner-modal');
      loadBannersSection();
      addAuditLog(bid ? 'Banner updated' : 'Banner created', `Title: ${titleInput.value.trim()}`);
    }
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    hideLoader();
  }
};

window.deleteBanner = async (bid) => {
  if (confirm('Are you sure you want to delete this promotional banner? This action cannot be undone.')) {
    showLoader();
    try {
      const res = await apiRequest(`/api/banners/${bid}`, 'DELETE');
      if (res.success) {
        showToast('Promotional banner deleted.');
        loadBannersSection();
        addAuditLog('Banner deleted', `Banner ID: ${bid}`);
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      hideLoader();
    }
  }
};

window.previewBannerImage = (input) => {
  const previewWrapper = document.getElementById('banner-preview-wrapper');
  const previewImg = document.getElementById('banner-preview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImg.src = e.target.result;
      previewWrapper.style.display = 'block';
    }
    reader.readAsDataURL(input.files[0]);
  } else {
    previewWrapper.style.display = 'none';
  }
};

// ─── NOTIFICATIONS BROADCASTER ──────────────────────────────────
function initNotificationComposer() {
  const comp = document.getElementById('notifications-composer-container');
  if (!comp) return;
  comp.innerHTML = `
    <div class="adm-notif-composer">
      <div style="font-weight:700; font-size:14px; margin-bottom:14px;">Broadcaster Panel</div>
      <form id="notif-broadcast-form" onsubmit="sendBroadcast(event)">
        <div class="adm-form-group">
          <label class="adm-form-label">Target Audience</label>
          <select id="notif-target" class="adm-form-select">
            <option value="all">All Users</option>
            <option value="premium">Premium Subscribers only</option>
          </select>
        </div>
        <div class="adm-form-group">
          <label class="adm-form-label">Title</label>
          <input type="text" id="notif-title" class="adm-form-input" placeholder="e.g. Exclusive Weekend Sale Offer" required>
        </div>
        <div class="adm-form-group">
          <label class="adm-form-label">Message Details</label>
          <textarea id="notif-msg" class="adm-form-textarea" placeholder="Enter broadcast message description..." required></textarea>
        </div>
        <button type="submit" class="adm-btn adm-btn-primary">Send Broadcast Notification</button>
      </form>
    </div>
  `;
}

window.sendBroadcast = async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById('notif-title').value,
    message: document.getElementById('notif-msg').value,
    target: document.getElementById('notif-target').value
  };

  const res = await apiRequest('/api/admin/notifications/send', 'POST', payload);
  if (res.success) {
    showToast('Broadcast notification successfully sent!');
    document.getElementById('notif-broadcast-form').reset();
    addAuditLog('Broadcast notification', `Sent "${payload.title}" to target ${payload.target}`);
  }
};

// ─── REPORTS ────────────────────────────────────────────────────
function loadReportsSection() {
  const container = document.getElementById('reports-container');
  if (!container) return;
  container.innerHTML = `
    <div class="adm-card">
      <div class="adm-card-title">User Reports & Moderation Flags</div>
      <div style="padding:20px; text-align:center; color:var(--adm-muted);">
        <i data-lucide="shield-check" style="width:48px; height:48px; margin-bottom:10px; opacity:0.4;"></i>
        <div style="font-weight:600; color:var(--adm-text);">No reports flagged.</div>
        <p style="font-size:11px; margin-top:2px;">Users or Listings violating rules will show up here.</p>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

// ─── SETTINGS PANEL ─────────────────────────────────────────────
async function loadSettingsPanel() {
  const res = await apiRequest('/api/admin/settings');
  if (res.success) {
    const s = res.data;
    document.getElementById('set-name').value = s.site_name || 'House Rental';
    document.getElementById('set-email').value = s.contact_email || 'admin@houserenter.in';
    document.getElementById('set-phone').value = s.contact_phone || '+919919014220';
    document.getElementById('set-address').value = s.address || 'Lucknow, UP, India';
    document.getElementById('set-maintenance').value = s.maintenance_mode ? '1' : '0';
  }
}

window.saveSettings = async (e) => {
  e.preventDefault();
  const site_name = document.getElementById('set-name').value.trim();
  const contact_email = document.getElementById('set-email').value.trim();
  const contact_phone = document.getElementById('set-phone').value.trim();
  const address = document.getElementById('set-address').value.trim();
  const maintenance_mode = document.getElementById('set-maintenance').value === '1';

  // Email format validation
  const emailVal = contact_email.toLowerCase();
  if (emailVal.includes('..') || emailVal.includes(' ') || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailVal)) {
    return alert('Please enter a valid email address.');
  }

  // Phone validation
  if (!/^[6-9]\d{9}$/.test(contact_phone)) {
    return alert('Please enter a valid 10-digit Indian mobile number.');
  }

  const payload = {
    site_name,
    contact_email: emailVal,
    contact_phone,
    address,
    maintenance_mode
  };

  const res = await apiRequest('/api/admin/settings', 'PUT', payload);
  if (res.success) {
    showToast('Global settings successfully saved!');
  }
};

// ─── AUDIT LOGS ─────────────────────────────────────────────────
function addAuditLog(action, details) {
  const log = {
    action,
    details,
    time: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
    ip: '127.0.0.1'
  };
  auditLogs.unshift(log);
}

function renderAuditLogs() {
  const body = document.getElementById('audit-logs-body');
  if (!body) return;

  if (auditLogs.length === 0) {
    body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--adm-muted);">No actions logged in this session.</td></tr>';
    return;
  }

  body.innerHTML = auditLogs.map(l => `
    <tr>
      <td><strong>${l.action}</strong></td>
      <td>${l.details}</td>
      <td>${l.date} ${l.time}</td>
      <td><span class="adm-badge badge-gray">${l.ip}</span></td>
    </tr>
  `).join('');
}

// ─── EXPORTING TO CSV ───────────────────────────────────────────
window.exportTableToCSV = (tableId, filename) => {
  let csv = [];
  const rows = document.querySelectorAll(`#${tableId} tr`);
  
  for (let i = 0; i < rows.length; i++) {
    let row = [], cols = rows[i].querySelectorAll("td, th");
    for (let j = 0; j < cols.length - 1; j++) { // exclude last action column
      row.push('"' + cols[j].innerText.trim().replace(/"/g, '""') + '"');
    }
    csv.push(row.join(","));
  }

  const csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
  const downloadLink = document.createElement("a");
  downloadLink.download = filename;
  downloadLink.href = window.URL.createObjectURL(csvFile);
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

// ─── HELPER UTILITIES ───────────────────────────────────────────
function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('admin_theme', next);
    updateThemeIcon(next);
    addAuditLog('Theme toggled', `Switched theme view to ${next}`);
  });
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  btn.innerHTML = theme === 'dark' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
  if (window.lucide) window.lucide.createIcons();
}

function setupSidebarToggle() {
  const btn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('adm-sidebar');
  const overlay = document.getElementById('adm-mobile-overlay');

  if (btn && sidebar) {
    btn.addEventListener('click', () => {
      // Desktop toggle
      if (window.innerWidth > 768) {
        sidebar.classList.toggle('collapsed');
      } else {
        // Mobile toggle
        sidebar.classList.add('mobile-open');
        overlay.classList.add('active');
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }
}

function setupGlobalSearch() {
  const searchInput = document.getElementById('adm-global-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (!val) {
      loadSectionData(currentSection);
      return;
    }
    
    // Perform filtering depending on active section
    if (currentSection === 'users') {
      const tableBody = document.getElementById('users-table-body');
      const filtered = usersList.filter(u => u.name.toLowerCase().includes(val) || u.email.toLowerCase().includes(val));
      tableBody.innerHTML = filtered.map(u => `
        <tr>
          <td>
            <div class="adm-user-cell">
              <div class="adm-user-avatar" style="background:#8b5cf6;">${u.name[0].toUpperCase()}</div>
              <div>
                <div class="adm-user-name">${u.name}</div>
                <div class="adm-user-email">${u.email}</div>
              </div>
            </div>
          </td>
          <td>${u.phone || 'N/A'}</td>
          <td><span class="adm-badge badge-blue">${u.role}</span></td>
          <td><span class="adm-badge badge-gray">${u.provider}</span></td>
          <td><span class="adm-badge ${u.subscription_status === 'active' ? 'badge-green' : 'badge-red'}">${u.subscription_status}</span></td>
          <td>${u.properties_count}</td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
          <td>
            <div class="adm-actions">
              <button class="adm-btn adm-btn-ghost adm-btn-sm" onclick="viewUserProfile(${u.id})">View</button>
            </div>
          </td>
        </tr>
      `).join('');
    } else if (currentSection === 'listings') {
      const tableBody = document.getElementById('listings-table-body');
      const filtered = propertiesList.filter(p => p.title.toLowerCase().includes(val) || p.city.toLowerCase().includes(val));
      tableBody.innerHTML = filtered.map(p => `
        <tr>
          <td><img class="adm-prop-img" src="${p.cover_image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=100&q=80'}" alt=""></td>
          <td>
            <div style="font-weight:600;">${p.title}</div>
            <div style="font-size:10px; color:var(--adm-muted);">${p.city} • ${p.category}</div>
          </td>
          <td>${p.owner_name}</td>
          <td><strong>₹${formatNumber(p.price)}</strong></td>
          <td><span class="adm-badge badge-green">${p.approval_status}</span></td>
          <td><span class="adm-badge ${p.is_hidden ? 'badge-red' : 'badge-green'}">${p.is_hidden ? 'Hidden' : 'Visible'}</span></td>
          <td><span class="adm-badge ${p.is_featured ? 'badge-orange' : 'badge-gray'}">${p.is_featured ? 'Featured' : 'Normal'}</span></td>
          <td>
            <div class="adm-actions">
              <button class="adm-btn adm-btn-ghost adm-btn-sm" onclick="toggleListingFeatured(${p.id}, ${p.is_featured ? 0 : 1})">Feature</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  });
}

// Show/Hide page loaders
function showLoader() {
  const loading = document.getElementById('adm-loading-overlay');
  if (loading) loading.style.display = 'flex';
}
function hideLoader() {
  const loading = document.getElementById('adm-loading-overlay');
  if (loading) loading.style.display = 'none';
}

// Pop dynamic Toast notifications
function showToast(msg, type = 'success') {
  const toast = document.getElementById('adm-toast');
  const icon = document.getElementById('adm-toast-icon');
  const text = document.getElementById('adm-toast-msg');
  if (!toast) return;

  toast.className = 'adm-toast show';
  text.textContent = msg;
  
  if (type === 'danger') {
    icon.innerHTML = '<i data-lucide="alert-triangle" style="color:var(--adm-danger);"></i>';
  } else {
    icon.innerHTML = '<i data-lucide="check-circle" style="color:var(--adm-success);"></i>';
  }
  
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Render dynamic pagination button block
function renderPagination(containerId, pagination, callback) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML = '';
  
  if (!pagination || pagination.totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'adm-page-btn';
  prevBtn.innerHTML = '←';
  prevBtn.disabled = pagination.page === 1;
  prevBtn.onclick = () => callback(pagination.page - 1);
  cont.appendChild(prevBtn);

  for (let i = 1; i <= pagination.totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `adm-page-btn ${pagination.page === i ? 'active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => callback(i);
    cont.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'adm-page-btn';
  nextBtn.innerHTML = '→';
  nextBtn.disabled = pagination.page === pagination.totalPages;
  nextBtn.onclick = () => callback(pagination.page + 1);
  cont.appendChild(nextBtn);
}

// Modal open/close controls
window.openModal = (modalId) => {
  document.getElementById(modalId).classList.add('open');
};
window.closeModal = (modalId) => {
  document.getElementById(modalId).classList.remove('open');
};

function formatNumber(num) {
  if (num >= 10000000) return (num / 10000000).toFixed(1) + ' Cr';
  if (num >= 100000) return (num / 100000).toFixed(1) + ' L';
  return num.toLocaleString('en-IN');
}
