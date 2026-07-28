// Centralized Safe Rendering & Image/Video Helper System
window.SafeRender = {
  safeImageUrl(url, fallback = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80') {
    if (!url || typeof url !== 'string' || url.trim() === '' || url.trim() === 'null') {
      return fallback;
    }
    return url;
  },

  safeVideoUrl(url, fallback = '') {
    if (!url || typeof url !== 'string' || url.trim() === '' || url.trim() === 'null') {
      return fallback;
    }
    return url;
  },

  safeAvatar(user, fallbackInitialsName = 'User') {
    if (!user) {
      return window.AvatarSystem.getInitialsDataUri(fallbackInitialsName);
    }
    const name = user.name || user.creator_name || user.user_name || user.owner_name || fallbackInitialsName;
    const photo = user.profile_photo || user.profile_picture || user.creator_pic || user.user_pic || user.owner_pic || '';
    if (photo && typeof photo === 'string' && photo.trim() !== '' && photo.trim() !== 'null') {
      return photo;
    }
    return window.AvatarSystem.getInitialsDataUri(name);
  },

  safeText(val, fallback = '') {
    if (val === null || val === undefined || String(val).trim() === 'null' || String(val).trim() === 'undefined') {
      return fallback;
    }
    return String(val);
  }
};

// Unified Reusable Avatar & Image Fallback System
window.AvatarSystem = {
  getInitialsDataUri(name) {
    const initial = (name || 'U').trim().charAt(0).toUpperCase();
    const colors = ['#8B2635','#1A6B57','#1F4E79','#6B3A1F','#3D2B6B','#7A3F00','#0A5C5C'];
    const colorIndex = initial.charCodeAt(0) % colors.length;
    const bg = colors[colorIndex];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">` +
                `<circle cx="40" cy="40" r="40" fill="${bg}"/>` +
                `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" fill="white" font-size="32" font-family="Inter,sans-serif" font-weight="700">${initial}</text>` +
                `</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  },

  renderHtml(user, classNames = '', extraStyles = '') {
    const classNameAttr = classNames ? `class="${classNames}"` : '';
    const styleAttr = extraStyles ? `style="${extraStyles}"` : '';
    
    if (!user) {
      const guestSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2358181F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      const guestUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(guestSvg);
      return `<img src="${guestUri}" alt="Guest" ${classNameAttr} ${styleAttr} />`;
    }

    const initialsUri = this.getInitialsDataUri(user.name);
    const photo = window.SafeRender.safeAvatar(user, 'User');
    
    return `<img src="${photo}" ` +
           `alt="${window.SafeRender.safeText(user.name, 'User').replace(/"/g, '&quot;')}" ` +
           `data-fallback-initials="${initialsUri}" ` +
           `onerror="window.AvatarSystem.handleImageError(this)" ` +
           `${classNameAttr} ` +
           `${styleAttr} />`;
  },

  handleImageError(imgEl) {
    if (!imgEl) return;
    imgEl.onerror = null;
    const initialsFallback = imgEl.getAttribute('data-fallback-initials');
    if (initialsFallback) {
      imgEl.src = initialsFallback;
    }
  },

  renderSkeleton(classNames = '', extraStyles = '') {
    const classNameAttr = classNames ? `class="${classNames} skeleton-shimmer"` : 'class="skeleton-shimmer"';
    const styleAttr = `style="background: #ececec; border-radius: 50%; ${extraStyles}"`;
    return `<div ${classNameAttr} ${styleAttr}></div>`;
  }
};

// Global Auth State variables
window.currentUser = null;
window.authProfileData = null;
window.authPromise = null;
window.isAuthInitialized = false;

// Unified Single Authentication Promise to prevent concurrent duplicate profile fetches
window.getAuth = function(forceRefresh = false) {
  if (window.authPromise && !forceRefresh) {
    return window.authPromise;
  }

  window.authPromise = (async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.removeItem('user');
      window.currentUser = null;
      window.authProfileData = null;
      window.isAuthInitialized = true;
      return null;
    }

    try {
      // Fetch fresh profile details from server
      const res = await apiRequest('/api/auth/profile');
      if (res.success) {
        window.currentUser = res.user;
        window.authProfileData = res;
        localStorage.setItem('user', JSON.stringify(res.user));
      } else {
        throw new Error('Invalid session response');
      }
    } catch (err) {
      console.warn('⚠️ Session sync result:', err.message);
      // Only clear credentials if the server explicitly returned 401/403/400 (auth failed)
      if (err.status === 401 || err.status === 403 || err.status === 400) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.currentUser = null;
        window.authProfileData = null;
      } else {
        // Network error or 5xx server error: keep the cached local user
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          try {
            window.currentUser = JSON.parse(cachedUser);
            console.log("ℹ️ Server unreachable. Using cached local profile.");
          } catch (e) {
            window.currentUser = null;
          }
        }
      }
    }
    window.isAuthInitialized = true;
    return window.currentUser;
  })();

  return window.authPromise;
};

// Invalidate token / profile cache to force reload on changes
window.invalidateAuthCache = function() {
  window.authPromise = null;
  window.isAuthInitialized = false;
  window.currentUser = null;
  window.authProfileData = null;
};

document.addEventListener('DOMContentLoaded', () => {
  // Start initializing auth immediately
  const userPromise = window.getAuth();

  // Try to load Lucide script if not present
  if (typeof lucide === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lucide@latest';
    script.onload = async () => {
      convertBoxiconsToLucide();
      await startApp(userPromise);
    };
    document.head.appendChild(script);
  } else {
    convertBoxiconsToLucide();
    startApp(userPromise);
  }

  // Register PWA service worker
  registerServiceWorker();
});

// App startup synchronization
async function startApp(userPromise) {
  const user = await userPromise;

  // Render layouts with guaranteed fresh data
  injectDesktopLayout(user);
  setupNavigation();
  renderUserUI(user);
  injectStandardFooter();

  // Trigger page specific callbacks if defined
  if (window.onAppReady) {
    window.onAppReady(user);
  }
}

// Dynamically inject the standardized footer into target informational pages
function injectStandardFooter() {
  const currentPath = window.location.pathname.toLowerCase();
  const targetPages = ['profile', 'search', 'about', 'blogs', 'marketplace'];
  
  // Clean checks: ignore pages like details/reels/post/admin etc.
  const isTarget = targetPages.some(page => currentPath.includes(page)) &&
                   !currentPath.includes('details') &&
                   !currentPath.includes('post') &&
                   !currentPath.includes('admin') &&
                   !currentPath.includes('reels');

  if (!isTarget) return;

  // Locate the scrollable container so the footer flows naturally and doesn't stick statically
  const container = document.querySelector('.app-content') || 
                    document.querySelector('.scrollable-content') ||
                    document.querySelector('.app-shell') || 
                    document.body;

  if (container) {
    // Prevent duplicate rendering
    if (container.querySelector('footer')) return;

    const footer = document.createElement('footer');
    footer.style.textAlign = 'center';
    footer.style.padding = '24px 16px';
    footer.style.marginTop = '24px';
    footer.style.borderTop = '1px solid var(--border-color)';
    footer.style.color = 'var(--text-muted)';
    footer.style.fontFamily = "'Outfit', sans-serif";

    const isAbout = currentPath.includes('about');
    const line1 = isAbout 
      ? 'Houserenter.in – Your Trusted Partner for Renting, Buying & Selling Properties.'
      : 'Copyright © Houserenter.in 2026';
    const line2 = isAbout
      ? 'WebApp built by ~ '
      : 'WebApp Built by ~ ';

    footer.innerHTML = `
      <div style="font-size: 12px; margin-bottom: 4px;">${line1}</div>
      <div style="font-size: 11px;">${line2}<a href="https://roitsa.in" target="_blank" rel="noopener noreferrer" style="color: var(--primary-red); text-decoration: none; font-weight: 700; transition: opacity 0.2s;">roitsa.in</a></div>
    `;
    container.appendChild(footer);
  }
}

// Render Initials Avatar or Profile image
window.renderUserUI = function(user) {
  const drawerProfile = document.getElementById('drawer-profile-info');
  const headerProfilePic = document.getElementById('header-profile-pic');
  const logoutItem = document.getElementById('drawer-logout');
  const drawerAdminLink = document.getElementById('drawer-admin-link');

  if (user) {
    if (headerProfilePic) {
      const picSrc = window.SafeRender.safeAvatar(user, 'User');
      headerProfilePic.src = picSrc;
      headerProfilePic.setAttribute('data-fallback-initials', window.AvatarSystem.getInitialsDataUri(window.SafeRender.safeText(user.name, 'User')));
      headerProfilePic.onerror = function() { window.AvatarSystem.handleImageError(this); };
      headerProfilePic.parentElement.href = '/profile.html';
    }

    if (drawerProfile) {
      drawerProfile.innerHTML = `
        <h3>${user.name}</h3>
        <p>${user.role.toUpperCase()} • ${user.email}</p>
      `;
    }

    if (logoutItem) {
      logoutItem.style.display = 'flex';
      logoutItem.onclick = (e) => { e.preventDefault(); logoutUser(); };
    }

    if (drawerAdminLink) {
      drawerAdminLink.style.display = user.role === 'admin' ? 'flex' : 'none';
    }
  } else {
    if (logoutItem) logoutItem.style.display = 'none';
    if (drawerAdminLink) drawerAdminLink.style.display = 'none';
    if (headerProfilePic) {
      headerProfilePic.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2358181F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
      headerProfilePic.parentElement.href = '/login.html';
    }
    if (drawerProfile) {
      drawerProfile.innerHTML = `
        <h3>Guest User</h3>
        <p>Login to list properties</p>
      `;
    }
  }
};

// Convert Boxicons to Lucide dynamically for premium style
function convertBoxiconsToLucide() {
  const boxicons = document.querySelectorAll('i[class*="bx"]');
  boxicons.forEach(el => {
    const classes = Array.from(el.classList);
    const bxClass = classes.find(c => c.startsWith('bx-') || c.startsWith('bxs-'));
    if (bxClass) {
      const cleanName = bxClass.replace('bx-', '').replace('bxs-', '');
      const iconName = mapBoxiconToLucide(cleanName);
      
      const lucideIcon = document.createElement('i');
      lucideIcon.setAttribute('data-lucide', iconName);
      if (el.id) lucideIcon.id = el.id;
      lucideIcon.style.cssText = el.style.cssText;
      lucideIcon.onclick = el.onclick;
      if (el.classList.contains('active')) lucideIcon.classList.add('active');
      
      el.replaceWith(lucideIcon);
    }
  });
  if (window.lucide) window.lucide.createIcons();
}

function mapBoxiconToLucide(name) {
  const map = {
    'menu': 'menu',
    'search': 'search',
    'search-alt-2': 'search',
    'map-pin': 'map-pin',
    'slider-alt': 'sliders-horizontal',
    'building-house': 'building-2',
    'building': 'building',
    'home': 'home',
    'bed': 'bed',
    'briefcase': 'briefcase',
    'map': 'map',
    'tree': 'trees',
    'plus': 'plus',
    'compass': 'compass',
    'user-circle': 'user',
    'heart': 'heart',
    'chevron-right': 'chevron-right',
    'chevron-left': 'chevron-left',
    'video-plus': 'video',
    'wrench': 'wrench',
    'paint': 'paint-bucket',
    'bolt': 'bolt',
    'package': 'package',
    'brush': 'brush',
    'x': 'x',
    'trash': 'trash-2',
    'check-circle': 'check-circle',
    'bxs-badge-check': 'check-circle',
    'bell': 'bell',
    'left-arrow-alt': 'arrow-left',
    'log-out': 'log-out',
    'log-in': 'log-in',
    'shield': 'shield',
    'plus-circle': 'plus-circle',
    'book-open': 'book-open',
    'play': 'play',
    'phone': 'phone',
    'phone-call': 'phone-call',
    'whatsapp': 'phone-call',
    'mail': 'mail',
    'envelope': 'mail',
    'star': 'star',
    'calendar': 'calendar',
    'cog': 'settings',
    'info-circle': 'info',
    'help-circle': 'help-circle',
    'calculator': 'calculator',
    'share-alt': 'share-2',
    'share': 'share-2',
    'chevron-up': 'chevron-up',
    'chevron-down': 'chevron-down'
  };
  return map[name] || name;
}

// Setup sticky navigation and drawers
function setupNavigation() {
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    const currentPath = window.location.pathname.toLowerCase();
    const isHome = currentPath.includes('index.html') || currentPath.endsWith('/') || currentPath === '';
    const isSearch = currentPath.includes('search.html');
    const isReels = currentPath.includes('reels.html');
    const isProfile = currentPath.includes('profile.html');

    bottomNav.innerHTML = `
      <a href="/index.html" class="nav-item ${isHome ? 'active' : ''}">
        <i data-lucide="home"></i>
        <span>Home</span>
      </a>
      <a href="/search.html" class="nav-item ${isSearch ? 'active' : ''}">
        <i data-lucide="search"></i>
        <span>Search</span>
      </a>
      <div class="nav-item-center" id="center-add-btn">
        <i data-lucide="plus"></i>
      </div>
      <a href="/reels.html" class="nav-item ${isReels ? 'active' : ''}">
        <i data-lucide="play"></i>
        <span>Reels</span>
      </a>
      <a href="/profile.html" class="nav-item ${isProfile ? 'active' : ''}">
        <i data-lucide="user"></i>
        <span>Profile</span>
      </a>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  const drawerOverlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');
  const hamburgerBtn = document.getElementById('hamburger-btn');

  if (hamburgerBtn && drawer && drawerOverlay) {
    hamburgerBtn.onclick = () => {
      drawer.classList.add('active');
      drawerOverlay.classList.add('active');
    };

    drawerOverlay.onclick = () => {
      drawer.classList.remove('active');
      drawerOverlay.classList.remove('active');
    };
  }

  const bottomSheetOverlay = document.getElementById('bottom-sheet-overlay');
  const bottomSheet = document.getElementById('bottom-sheet');
  const centerBtn = document.getElementById('center-add-btn');
  const sheetClose = document.getElementById('sheet-close');

  if (centerBtn && bottomSheet && bottomSheetOverlay) {
    centerBtn.onclick = (e) => {
      e.preventDefault();
      bottomSheet.classList.add('active');
      bottomSheetOverlay.classList.add('active');
    };

    const hideSheet = () => {
      bottomSheet.classList.remove('active');
      bottomSheetOverlay.classList.remove('active');
    };

    bottomSheetOverlay.onclick = hideSheet;
    if (sheetClose) sheetClose.onclick = hideSheet;
  }
}

// Generate initials SVG avatar
window.applyInitialsAvatar = function(imgEl, name) {
  if (imgEl) {
    imgEl.src = window.AvatarSystem.getInitialsDataUri(name);
    imgEl.style.objectFit = 'cover';
  }
};

// Log out user cleanly
window.logoutUser = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.invalidateAuthCache();
  window.location.href = '/login.html';
};

// Custom Toast Alert System
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconName = type === 'success' ? 'check-circle' : 'alert-triangle';
  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width:16px; height:16px; min-width:16px;"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.remove(); }, 300);
  }, 3500);
}

// Override native alert dialogs
window.alert = function(msg) {
  const isErr = msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('missing') || msg.toLowerCase().includes('invalid');
  showToast(msg, isErr ? 'error' : 'success');
};

window.showToast = showToast;

// Centralized API Request Helper with JWT token injection
async function apiRequest(url, method = 'GET', body = null, isMultipart = false) {
  const token = localStorage.getItem('token');
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers, credentials: 'include' };

  if (body) {
    if (isMultipart) {
      options.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, options);
    let result = {};
    try {
      result = await response.json();
    } catch (e) {}

    if (!response.ok) {
      const errMsg = result.detail ? `${result.error} (${result.detail})` : (result.error || 'Network response failure.');
      const err = new Error(errMsg);
      err.status = response.status;
      throw err;
    }
    return result;
  } catch (error) {
    console.error(`API Error on ${url}:`, error.message);
    throw error;
  }
}

window.apiRequest = apiRequest;

// Leaflet map renderer
window.renderLeafletMap = function(containerId, lat, lng, popupText = 'Property Location') {
  if (typeof L === 'undefined') {
    console.warn('Leaflet library not loaded.');
    return null;
  }
  const map = L.map(containerId).setView([lat, lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  L.marker([lat, lng]).addTo(map)
    .bindPopup(popupText)
    .openPopup();
  
  return map;
};

// EMI calculator
window.calculateEMI = function(principal, rate, tenureMonths) {
  const monthlyRate = (rate / 12) / 100;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return emi ? Math.round(emi) : 0;
};

// Inject Desktop sidebar & top header dynamically
function injectDesktopLayout(user) {
  const isDesktop = window.innerWidth > 768;
  if (!isDesktop) return;

  const shell = document.querySelector('.app-shell');
  if (!shell) return;

  if (document.querySelector('.desktop-drawer')) return;

  const isAdmin = user && user.role === 'admin';

  // Create Overlay
  const overlay = document.createElement('div');
  overlay.className = 'desktop-drawer-overlay desktop-only';
  shell.appendChild(overlay);

  // Create Drawer
  const drawer = document.createElement('aside');
  drawer.className = 'desktop-drawer desktop-only';
  
  let menuItems = [
    { name: 'Dashboard', path: '/index.html', icon: 'home' },
    { name: 'Explore Properties', path: '/search.html', icon: 'search' },
    { name: 'Post Property', path: '/post.html', icon: 'plus-circle' },
    { name: 'Property Reels', path: '/reels.html', icon: 'play' },
    { name: 'About Us', path: '/about.html', icon: 'info' },
    { name: 'Home Services', path: '/marketplace.html', icon: 'wrench' },
    { name: 'Blogs & Guides', path: '/blogs.html', icon: 'book-open' },
    { name: 'My Profile', path: '/profile.html', icon: 'user' }
  ];

  if (isAdmin) {
    menuItems.push({ name: 'Admin Panel', path: '/admin.html', icon: 'shield' });
  }

  const currentPath = window.location.pathname;
  const menuHtml = menuItems.map(item => {
    const isActive = currentPath === item.path || (item.path === '/index.html' && (currentPath === '/' || currentPath === '')) || (currentPath.includes(item.path.split('.')[0]));
    return `
      <a href="${item.path}" class="desktop-drawer-item ${isActive ? 'active' : ''}">
        <i data-lucide="${item.icon}"></i>
        <span>${item.name}</span>
      </a>
    `;
  }).join('');

  drawer.innerHTML = `
    <div class="desktop-drawer-header">
      <div class="desktop-drawer-logo">
        <i data-lucide="building"></i> House Rental
      </div>
      <button class="desktop-drawer-close-btn" id="desktop-drawer-close-btn" title="Close Menu">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="desktop-drawer-menu">
      ${menuHtml}
    </div>
    <div class="desktop-drawer-footer">
      ${user ? `
        <a href="#" class="desktop-drawer-item" id="desktop-logout-btn">
          <i data-lucide="log-out"></i>
          <span>Log Out</span>
        </a>
      ` : `
        <a href="/login.html" class="desktop-drawer-item">
          <i data-lucide="log-in"></i>
          <span>Sign In</span>
        </a>
      `}
    </div>
  `;

  // Create Header with Search & Profile actions
  const header = document.createElement('header');
  header.className = 'desktop-header desktop-only';
  header.innerHTML = `
    <div style="display: flex; align-items: center;">
      <button class="hamburger-menu-btn" id="desktop-hamburger-btn" title="Open Menu">
        <i data-lucide="menu"></i>
      </button>
      <div class="desktop-drawer-logo" style="margin-right: 24px; pointer-events: none; background: linear-gradient(135deg, #111 0%, var(--secondary-orange) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        <i data-lucide="building"></i> House Rental
      </div>
      <div class="desktop-header-search">
        <i data-lucide="search"></i>
        <input type="text" class="desktop-header-search-input" id="desktop-search-input" placeholder="Search by city, area, pincode...">
      </div>
    </div>
    <div class="desktop-header-actions">
      <button class="desktop-header-btn" title="Notifications">
        <i data-lucide="bell"></i>
        <span class="notification-dot" style="${user ? 'display:block;' : 'display:none;'}"></span>
      </button>
      ${user ? `
        <a href="/profile.html" class="desktop-user-profile">
          ${window.AvatarSystem.renderHtml(user, 'desktop-avatar-img')}
          <span>${user.name}</span>
        </a>
      ` : `
        <a href="/login.html" class="btn-primary" style="padding: 10px 20px; border-radius: 12px; font-size: 13px; text-decoration: none; display: flex; align-items: center; justify-content: center; font-weight:700;">
          Sign In
        </a>
      `}
    </div>
  `;

  shell.prepend(header);
  shell.appendChild(drawer);

  // Bind Drawer hamburger logic
  const hmbBtn = header.querySelector('#desktop-hamburger-btn');
  const closeBtn = drawer.querySelector('#desktop-drawer-close-btn');
  
  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('open');
  }
  
  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  }

  if (hmbBtn) hmbBtn.onclick = openDrawer;
  if (closeBtn) closeBtn.onclick = closeDrawer;
  overlay.onclick = closeDrawer;

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  const searchInput = header.querySelector('#desktop-search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        window.location.href = `/search.html?city=${encodeURIComponent(e.target.value)}`;
      }
    });
  }

  const logoutBtn = drawer.querySelector('#desktop-logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = (e) => {
      e.preventDefault();
      logoutUser();
    };
  }
  
  if (window.lucide) window.lucide.createIcons();
}

// Service Worker PWA registration with cache Version Cleanups
async function registerServiceWorker() {
  const CURRENT_VERSION = 'v146';
  const savedVersion = localStorage.getItem('app_cache_version');

  if (savedVersion !== CURRENT_VERSION) {
    localStorage.setItem('app_cache_version', CURRENT_VERSION);
    
    // Clear CacheStorage
    if ('caches' in window) {
      try {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map(key => window.caches.delete(key)));
        console.log('🧹 Cleared CacheStorage on version update.');
      } catch (e) {
        console.warn('CacheStorage clearing error: ', e.message);
      }
    }

    // Unregister service workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) {
          await reg.unregister();
        }
        console.log('🧹 Unregistered old service workers.');
      } catch (e) {
        console.warn('Service Worker unregistration error: ', e.message);
      }
    }

    // Force reload bypassing HTTP cache
    window.location.reload();
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('✅ Service Worker registered! Scope: ', reg.scope);
          reg.update();
        })
        .catch(err => console.warn('❌ Service Worker registration failed: ', err.message));
    });
  }
}
