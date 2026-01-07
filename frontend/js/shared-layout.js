// Default cover image URL when user hasn't set one
const DEFAULT_COVER_URL = 'images/covers/default_cover.jpg';

// Helper to get full image URL
function getFullImageUrl(imageUrl) {
    if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') return getDefaultAvatarUrl();
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    
    // Data URL
    if (imageUrl.startsWith('data:')) {
        return imageUrl;
    }
    
    // Relative path - prepend backend URL
    if (imageUrl.startsWith('/uploads/')) {
        const backendUrl = (typeof api !== 'undefined' && api.baseUrl) ? api.baseUrl : 'http://localhost:8080';
        return backendUrl + imageUrl;
    }
    
    return imageUrl;
}

// Get cover URL with default fallback
function getCoverUrl(coverUrl) {
    return coverUrl || DEFAULT_COVER_URL;
}

// Load shared layout (topbar + sidebar) into pages
async function loadSharedLayout() {
    console.log('loadSharedLayout called');
    try {
        const response = await fetch('includes/layout.html');
        const html = await response.text();
        console.log('Layout HTML loaded');
        
        // Insert at the beginning of body (before main content)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Find topbar and sidebar
        const topbar = tempDiv.querySelector('.topbar-premium');
        const sidebar = tempDiv.querySelector('.sidebar-left-premium');
        
        if (topbar) {
            document.body.insertBefore(topbar, document.body.firstChild);
        }
        if (sidebar) {
            // Insert sidebar before the main layout
            const layoutDiv = document.querySelector('.layout-premium');
            if (layoutDiv) {
                layoutDiv.insertBefore(sidebar, layoutDiv.firstChild);
            } else {
                document.body.insertBefore(sidebar, document.body.firstChild);
            }
        }
        
        // Mark current page in sidebar
        markActivePage();
        
        // Show admin link if user is admin
        showAdminLinkIfAdmin();
        
        // Load user avatar in topbar
        loadTopbarAvatar();
    } catch (e) {
        console.warn('Could not load shared layout', e);
    }
}

async function loadTopbarAvatar() {
    try {
        const profile = await api.users.getMe();
        if (profile) {
            const avatarUrl = api.getAvatarUrl(profile.avatarUrl);
            const fullAvatarUrl = getFullImageUrl(avatarUrl);
            const topAvatar = document.getElementById('topAvatar');
            if (topAvatar) {
                topAvatar.src = fullAvatarUrl;
            }
            
            // Update all avatar-small elements
            document.querySelectorAll('.avatar-small').forEach(el => {
                if (el.tagName === 'IMG') {
                    el.src = fullAvatarUrl;
                } else {
                    el.style.backgroundImage = `url(${fullAvatarUrl})`;
                    el.style.backgroundSize = 'cover';
                    el.style.backgroundPosition = 'center';
                }
            });
        }
    } catch (e) {
        console.warn('Could not load user avatar', e);
        // Set default avatar on error
        const defaultAvatar = getDefaultAvatarUrl();
        const topAvatar = document.getElementById('topAvatar');
        if (topAvatar) {
            topAvatar.src = defaultAvatar;
        }
    }
}

// Check if user is admin and show admin link if true
function showAdminLinkIfAdmin() {
    try {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            // Check if user has ADMIN role
            if (userData.role === 'ADMIN' || userData.roleName === 'ADMIN') {
                const adminLink = document.getElementById('admin-link');
                if (adminLink) {
                    adminLink.style.display = 'block';
                }
            }
        }
    } catch (err) {
        console.warn('Could not check admin role:', err);
    }
}

// Mark the current page as active in the sidebar
function markActivePage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    document.querySelectorAll('.sidebar-left-premium a').forEach(link => {
        const href = link.getAttribute('href');
        const sideItem = link.querySelector('.side-item');
        
        if (sideItem) {
            if (href === currentPage || (href === 'index.html' && currentPage === '')) {
                sideItem.classList.add('active');
            } else {
                sideItem.classList.remove('active');
            }
        }
    });
}

// ========================================================
// UNREAD MESSAGE BADGE
// ========================================================

let globalUnreadCount = 0;

function updateUnreadBadgeDisplay() {
    // Find or create badge on chat icon
    const chatLink = document.querySelector('a[href="chat.html"]');
    console.log('Chat link found:', !!chatLink);
    if (!chatLink) {
        console.warn('Chat link not found yet');
        return false;
    }
    
    let chatIconContainer = chatLink.querySelector('.chat-icon-badge');
    if (!chatIconContainer) {
        const icon = chatLink.querySelector('i');
        console.log('Chat icon found:', !!icon);
        if (icon) {
            chatIconContainer = document.createElement('span');
            chatIconContainer.className = 'chat-icon-badge';
            icon.parentElement.insertBefore(chatIconContainer, icon);
            chatIconContainer.appendChild(icon);
            console.log('Badge container created');
        } else {
            console.warn('Chat icon not found');
            return false;
        }
    }
    
    if (chatIconContainer) {
        let badge = chatIconContainer.querySelector('.unread-badge');
        console.log('Unread count:', globalUnreadCount);
        if (globalUnreadCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-badge';
                chatIconContainer.appendChild(badge);
                console.log('Badge element created');
            }
            badge.textContent = globalUnreadCount > 99 ? '99+' : globalUnreadCount;
        } else if (badge) {
            badge.remove();
        }
    }
    
    return true;
}

async function initUnreadBadge() {
    try {
        console.log('initUnreadBadge start');
        // Wait for ChatAPI to be available (with retries)
        let retries = 0;
        while (typeof ChatAPI === 'undefined' && retries < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (typeof ChatAPI === 'undefined') {
            console.warn('ChatAPI not available, badge skipped');
            return;
        }
        
        console.log('ChatAPI available, loading unread count...');
        const count = await ChatAPI.getUnreadCount();
        globalUnreadCount = count || 0;
        console.log('Unread count loaded:', globalUnreadCount);
        
        // Try to display badge, retry if layout not ready
        let displayRetries = 0;
        const tryDisplay = () => {
            if (!updateUnreadBadgeDisplay() && displayRetries < 5) {
                displayRetries++;
                console.log('Retrying badge display...', displayRetries);
                setTimeout(tryDisplay, 200);
            }
        };
        tryDisplay();
        
        // Poll for updates every 5 seconds as fallback
        setInterval(async () => {
            try {
                const newCount = await ChatAPI.getUnreadCount();
                if (newCount !== globalUnreadCount) {
                    globalUnreadCount = newCount || 0;
                    console.log('Unread count updated to:', globalUnreadCount);
                    updateUnreadBadgeDisplay();
                }
            } catch (e) {
                // Silently fail on network errors
            }
        }, 5000);
    } catch (err) {
        console.warn('Could not init unread badge:', err);
    }
}

async function initUnreadBadgeOnChatPage() {
    // Special init for chat.html page
    try {
        if (typeof ChatAPI === 'undefined') {
            return;
        }
        
        const count = await ChatAPI.getUnreadCount();
        globalUnreadCount = count || 0;
        updateUnreadBadgeDisplay();
    } catch (err) {
        console.warn('Error initializing chat page badge:', err);
    }
}

// Wrap loadSharedLayout to init badge after layout loads
const originalLoadSharedLayout = loadSharedLayout;
loadSharedLayout = async function() {
    console.log('loadSharedLayout wrapper called');
    await originalLoadSharedLayout();
    console.log('Layout loaded, scheduling badge init...');
    // Wait a bit for DOM to settle, then init badge
    setTimeout(() => {
        console.log('initUnreadBadge scheduled after layout');
        initUnreadBadge();
    }, 150);
};

// Load layout on DOMContentLoaded (or immediately if DOM already parsed)
console.log('shared-layout.js loaded, readyState:', document.readyState);
if (document.readyState !== 'loading') {
    console.log('DOM already loaded, calling loadSharedLayout immediately');
    loadSharedLayout();
} else {
    console.log('Waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', loadSharedLayout);
}

