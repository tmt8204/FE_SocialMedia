/* ============================================================
   GUMMY FEED — FINAL FIXED VERSION (REACTION HOVER WORKING)
============================================================ */

/* Helper to get avatar URL with default fallback */
function getAvatarUrl(avatarUrl) {
    const fallback = getDefaultAvatarUrl();
    if (!avatarUrl || avatarUrl === 'null' || avatarUrl === 'undefined') return fallback;
    
    // Already a full URL
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
        return avatarUrl;
    }
    
    // Relative path - prepend backend URL
    if (avatarUrl.startsWith('/uploads/')) {
        const backendUrl = (typeof api !== 'undefined' && api.baseUrl) ? api.baseUrl : 'http://localhost:8080';
        return backendUrl + avatarUrl;
    }

    // If looks like a bare id or invalid path, fall back
    if (!avatarUrl.includes('/') && !avatarUrl.includes('.')) {
        return fallback;
    }
    
    return avatarUrl;
}

/* Helper to get full image URL for posts */
function getFullImageUrl(imageUrl) {
    if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') return '';
    
    // If already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    
    // If relative path starting with /uploads/, prepend backend URL
    if (imageUrl.startsWith('/uploads/')) {
        const backendUrl = (typeof api !== 'undefined' && api.baseUrl) ? api.baseUrl : 'http://localhost:8080';
        return backendUrl + imageUrl;
    }
    
    return imageUrl;
}

/* Navigate to user's profile */
function viewUserProfile(userId) {
    if (userId) {
        window.location.href = `profile.html?id=${userId}`;
    }
}

/* -------------------------
   LOAD POSTS FROM STORAGE / BACKEND
   If backend available, fetch /api/posts/feed and map to UI format.
--------------------------*/
let posts = []; // will be loaded from backend or fallback to localStorage

async function loadFeedFromBackend() {
    try {
        const list = await api.get('/api/posts/feed');
        if (Array.isArray(list)) {
            posts = list.map(p => ({
                id: 'post-' + (p.postId || p.id || crypto.randomUUID()),
                user: (p.user && p.user.userName) || p.userName || 'Unknown',
                avatar: getAvatarUrl((p.user && p.user.avatarUrl) || p.avatarUrl),
                content: p.content || '',
                image: p.imageUrl || p.image || null,
                privacy: p.privacy || 'public',
                time: p.createdAt || p.time || new Date().toISOString(),
                // store author id for ownership checks
                authorId: (p.user && p.user.userId) || p.userId || null,
                // IMPORTANT: backend returns counts as commentCount / likeCount
                likes: Number(p.likeCount) || 0,
                // Reaction for current user will be hydrated after initial render
                reaction: 'none',
                // comments not included in feed response — load on demand
                comments: [],
                commentCount: Number(p.commentCount) || 0,
                shares: Number(p.shares) || 0
            }));
            savePosts();
            renderPosts();
            // After initial render, hydrate each post's reaction for current user
            hydrateMyReactionsOnLoad();
            // Load upcoming birthdays when feed is refreshed
            loadUpcomingBirthdays();
            return;
        }
    } catch (err) {
        console.warn('Could not load feed from backend:', err);
    }

    // fallback to localStorage if backend fails
    posts = JSON.parse(localStorage.getItem("gummy_posts")) || [];
    renderPosts();
    // Even in fallback mode, try to hydrate from backend if logged in,
    // otherwise apply local reaction map
    hydrateMyReactionsOnLoad();
}

// Load feed on start
loadFeedFromBackend();

// Hydrate current user's reaction for each post after initial load
async function hydrateMyReactionsOnLoad() {
    try {
        console.log('🔄 Starting reaction hydration for', posts.length, 'posts');
        const loggedIn = !!api.getToken();
        console.log('🔐 Logged in:', loggedIn);
        const tasks = posts.map(async (p) => {
            const num = postIdNum(p.id);
            if (!/^\d+$/.test(String(num))) {
                // For local-only posts, apply local map
                const localType = getLocalReaction(num);
                console.log('📦 Local post', num, '→ local reaction:', localType);
                if (p.reaction !== localType) {
                    p.reaction = localType;
                    updatePostReactionUI(p.id);
                }
                return;
            }
            if (loggedIn) {
                try {
                    const resp = await api.get(`/api/posts/${num}/reactions/me`);
                    const type = (resp && resp.type) ? resp.type : 'none';
                    console.log('🌐 Backend reaction for post', num, '→', type);
                    if (p.reaction !== type) {
                        p.reaction = type;
                        updatePostReactionUI(p.id);
                    }
                    return;
                } catch (e) {
                    console.warn('⚠️ Failed to fetch backend reaction for post', num, '- falling back to local');
                    // fall back to local map if backend fails
                }
            }
            const localType = getLocalReaction(num);
            console.log('💾 Using local reaction for post', num, '→', localType);
            if (p.reaction !== localType) {
                p.reaction = localType;
                updatePostReactionUI(p.id);
            }
        });
        await Promise.allSettled(tasks);
        savePosts();
        console.log('✅ Reaction hydration complete');
    } catch (e) {
        console.error('❌ Error during reaction hydration:', e);
        // silent fail; feed remains usable
    }
}

/* -------------------------
   DOM ELEMENTS
--------------------------*/
const postInput = document.getElementById("postInput");
const postList = document.getElementById("postList");
const postImageInput = document.getElementById("postImageInput");
const previewImg = document.getElementById("previewImg");

/* -------------------------
   USER DATA
--------------------------*/
let selectedImage = null;


let currentUser = {
    name: localStorage.getItem("setting_name") || "You",
    avatar: getAvatarUrl(localStorage.getItem("gummy_avatar"))
};

// Load current user info from backend if logged in
async function loadCurrentUser() {
    const token = api.getToken();
    if (!token) {
        updateGummyUI();
        return;
    }
    try {
        const me = await api.get('/api/profile/me');
        if (me && me.userName) {
            currentUser.name = me.userName;
            currentUser.avatar = getAvatarUrl(me.avatarUrl);
            // Optionally update localStorage for fallback
            localStorage.setItem("setting_name", currentUser.name);
            localStorage.setItem("gummy_avatar", currentUser.avatar);
        }
    } catch (e) {
        // fallback to localStorage
    }
    updateGummyUI();
}

// Call on load
loadCurrentUser();

/* -------------------------
   UPCOMING BIRTHDAYS
--------------------------*/

// Function to calculate days until birthday
function daysUntilBirthday(birthDate) {
    if (!birthDate) return null;
    
    // Parse birthDate (could be YYYY-MM-DD or other format)
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create birthday for this year
    let upcomingBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    
    // If birthday already passed this year, use next year
    if (upcomingBirthday < today) {
        upcomingBirthday = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
    }
    
    const timeDiff = upcomingBirthday - today;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

// Function to get birthday string (e.g., "Ngày Mai", "Tuần Tới", etc.)
function getBirthdayLabel(daysUntil) {
    if (daysUntil === 0) return "Hôm nay";
    if (daysUntil === 1) return "Ngày Mai";
    if (daysUntil <= 7) return "Tuần Tới";
    return null;
}

// Load and display upcoming birthdays
async function loadUpcomingBirthdays() {
    try {
        const container = document.querySelector('.sidebar-right-premium');
        if (!container) return;
        
        // Check if friends API is available
        if (!api || !api.friends || typeof api.friends.getFriendsList !== 'function') {
            console.log('ℹ️ Friends API not available yet, skipping birthday load');
            return;
        }
        
        // Get friends list
        const friends = await api.friends.getFriendsList();
        if (!Array.isArray(friends)) return;
        
        // Filter friends with birthdays within next 7 days
        const upcomingBdays = [];
        
        for (const friend of friends) {
            if (!friend.dateOfBirth) continue;
            
            const daysUntil = daysUntilBirthday(friend.dateOfBirth);
            if (daysUntil !== null && daysUntil >= 0 && daysUntil <= 7) {
                upcomingBdays.push({
                    name: friend.userName || friend.name || 'Unknown',
                    avatar: getAvatarUrl(friend.avatarUrl),
                    daysUntil: daysUntil,
                    label: getBirthdayLabel(daysUntil)
                });
            }
        }
        
        // Sort by days until birthday
        upcomingBdays.sort((a, b) => a.daysUntil - b.daysUntil);
        
        // Find the birthday card and update it
        const cards = container.querySelectorAll('.card-premium');
        let birthdayCard = null;
        
        for (const card of cards) {
            if (card.querySelector('h3')?.textContent.includes('Sinh Nhật')) {
                birthdayCard = card;
                break;
            }
        }
        
        if (birthdayCard) {
            // Clear existing birthday items
            const items = birthdayCard.querySelectorAll('.right-item');
            items.forEach(item => item.remove());
            
            // Add birthday items
            if (upcomingBdays.length > 0) {
                upcomingBdays.forEach(bday => {
                    const item = document.createElement('div');
                    item.className = 'right-item';
                    item.innerHTML = `🎂 ${bday.name} – ${bday.label}`;
                    birthdayCard.appendChild(item);
                });
            } else {
                const item = document.createElement('div');
                item.className = 'right-item';
                item.textContent = 'Không có sinh nhật sắp tới';
                birthdayCard.appendChild(item);
            }
        }
    } catch (error) {
        console.warn('Could not load upcoming birthdays:', error);
    }
}

// Load birthdays on page load
loadUpcomingBirthdays();

/* -------------------------
   PRIVACY ICON
--------------------------*/
function privacyIcon(privacy) {
    // Map backend privacy setting (EVERYONE, FRIENDS, ONLY_ME) to icon
    if (privacy === "FRIENDS") return '<i class="fas fa-users"></i>';
    if (privacy === "ONLY_ME") return '<i class="fas fa-lock"></i>';
    if (privacy === "EVERYONE") return '<i class="fas fa-globe"></i>';
    // Default to friends if unknown
    return '<i class="fas fa-users"></i>';
}

/* -------------------------
   REACTIONS
--------------------------*/
function reactionEmoji(type) {
    switch(type) {
        case "like": return "👍";
        case "love": return "❤️";
        case "haha": return "😆";
        case "wow":  return "😮";
        case "sad":  return "😢";
        case "angry":return "😡";
        default:     return "👍";
    }
}

function renderReactionText(post) {
    if (post.reaction === "none") return "👍 Like";
    return reactionEmoji(post.reaction);
}

// ===== Local persistence for my reactions (fallback for anonymous/offline) =====
const REACTION_STORAGE_KEY = 'gummy_myReactions';

function readMyReactions() {
    try {
        const raw = localStorage.getItem(REACTION_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function writeMyReactions(map) {
    try { localStorage.setItem(REACTION_STORAGE_KEY, JSON.stringify(map)); } catch (e) {}
}

function setLocalReaction(postNum, type) {
    const map = readMyReactions();
    if (type && type !== 'none') map[String(postNum)] = type; else delete map[String(postNum)];
    writeMyReactions(map);
}

function getLocalReaction(postNum) {
    const map = readMyReactions();
    return map[String(postNum)] || 'none';
}


function setReaction(id, type) {
    const post = posts.find(p => p.id === id);
    if (!post) return;


    // Gửi lên backend: type là query param
    const num = postIdNum(id);
    try {
        api.post(`/api/posts/${num}/react?type=${encodeURIComponent(type)}`);
    } catch (e) {
        // ignore
    }

    // Gửi sự kiện qua WebSocket (key 'type' thay vì 'reaction' cho đồng bộ backend)
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'REACT_POST',
            data: { postId: num, type: type, userId: getCurrentUserId() }
        }));
    }

    // Cập nhật UI cho post này, không reload toàn bộ
    post.reaction = type;
    setLocalReaction(num, type);
    // Không tự tăng likes ở đây, nên fetch lại từ backend hoặc cập nhật từ event
    savePosts();
    updatePostReactionUI(id);
}
// Cập nhật UI cho post khi có thay đổi reaction
function updatePostReactionUI(id) {
    const post = posts.find(p => p.id === id);
    if (!post) {
        console.warn('updatePostReactionUI: post not found', id);
        return;
    }
    const card = document.getElementById('post_card_' + id);
    if (!card) {
        console.warn('updatePostReactionUI: card not found', id);
        return;
    }
    // Cập nhật nút like (inside .reaction-wrapper to avoid selecting comment/share buttons)
    const btn = card.querySelector('.reaction-wrapper .post-btn');
    if (btn) {
        btn.classList.toggle('liked', post.reaction !== 'none');
        btn.innerHTML = (post.reaction === 'none'
            ? `<i class='fa-regular fa-thumbs-up'></i> Like`
            : `${reactionEmoji(post.reaction)}`
        ) + (typeof post.likes === 'number' && post.likes > 0 ? ` ${post.likes}` : '');
        console.log('✅ Updated reaction UI for', id, '→', post.reaction);
    } else {
        console.warn('updatePostReactionUI: like button not found in card', id);
    }
}


/* -------------------------
   UPDATE ALL AVATARS
--------------------------*/
function updateGummyUI() {
    const avatar = currentUser.avatar;

    const topbarAvatar = document.getElementById("topbarAvatar");
    const feedAvatar = document.getElementById("feedUserAvatar");
    const preview = document.getElementById("myStoryPreview");

    if (topbarAvatar) topbarAvatar.style.backgroundImage = `url('${avatar}')`;
    if (feedAvatar) feedAvatar.src = avatar;
    if (preview) preview.src = avatar;
}
updateGummyUI();

/* -------------------------
   SAVE POSTS
--------------------------*/
function savePosts() {
    localStorage.setItem("gummy_posts", JSON.stringify(posts));
}

/* -------------------------
   TIME FORMATTER
--------------------------*/
function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);

    if (seconds < 5) return "Just now";
    if (seconds < 60) return seconds + "s ago";

    const mins = Math.floor(seconds / 60);
    if (mins < 60) return mins + "m ago";

    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + "h ago";

    return Math.floor(hours / 24) + "d ago";
}

/* -------------------------
   PREVIEW IMAGE
--------------------------*/
postImageInput?.addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    // Preview image (resize for preview only)
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const MAX = 600;
            let w = img.width;
            let h = img.height;
            if (w > MAX) {
                h = h * (MAX / w);
                w = MAX;
            }
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            previewImg.src = canvas.toDataURL("image/jpeg", 0.75);
            previewImg.style.display = "block";
        };
    };
    reader.readAsDataURL(file);

    // Upload image to server
    try {
        const formData = new FormData();
        formData.append("file", file);
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        
        // Use api.baseUrl which is already set from api.base.js
        const backendUrl = (typeof api !== 'undefined' && api.baseUrl) ? api.baseUrl : 'http://localhost:8080';
        const uploadUrl = backendUrl + '/api/upload/post';
        
        console.log('🔧 Upload URL:', uploadUrl);
        console.log('🔧 Token:', token ? 'present' : 'missing');
        
        const resp = await fetch(uploadUrl, {
            method: "POST",
            headers: headers,
            body: formData
        });
        
        console.log('🔧 Upload response status:', resp.status);
        
        if (!resp.ok) {
            const errorData = await resp.json();
            throw new Error(errorData.error || 'Upload failed');
        }
        const data = await resp.json();
        console.log('🔧 Upload success, URL:', data.url);
        selectedImage = data.url; // URL trả về từ server
    } catch (e) {
        console.error('❌ Upload error:', e);
        alert("Upload image failed: " + e.message);
        selectedImage = null;
        previewImg.style.display = "none";
        postImageInput.value = "";
    }
});

/* -------------------------
   REMOVE IMAGE
--------------------------*/
function removeImg() {
    selectedImage = null;
    previewImg.style.display = "none";
    postImageInput.value = "";
}

/* -------------------------
   CREATE POST
--------------------------*/
async function createPost() {
    let text = postInput.value.trim();
    let privacy = document.getElementById("privacySelect").value;

    if (!text && !selectedImage) return;


    // Prepare payload for backend
    const payload = { content: text };
    if (selectedImage) payload.imageUrl = selectedImage; // selectedImage giờ là URL

    // Try to create on backend when user is logged in
    try {
        const token = api.getToken();
        if (token) {
            const resp = await api.post('/api/posts', payload);
            // server response: postId, content, imageUrl, createdAt, user, commentCount, likeCount
            const postObj = {
                id: 'post-' + (resp.postId || resp.id),
                user: (resp.user && resp.user.userName) || getCurrentUserNameFromToken() || currentUser.name,
                avatar: (resp.user && resp.user.avatarUrl) || currentUser.avatar,
                content: resp.content || text,
                image: resp.imageUrl || selectedImage,
                privacy,
                time: resp.createdAt || new Date().toISOString(),
                authorId: (resp.user && resp.user.userId) || getCurrentUserId(),
                likes: Number(resp.likeCount) || 0,
                // Do not infer my reaction from counts; default to none
                reaction: 'none',
                comments: [],
                commentCount: Number(resp.commentCount) || 0,
                shares: 0,
                _editing: false
            };

            posts.unshift(postObj);

            savePosts();
            postInput.value = "";
            selectedImage = null;
            previewImg.style.display = "none";
            postImageInput.value = "";
            renderPosts();
            return;
        }
    } catch (e) {
        console.warn('Could not create post on backend; saving locally', e);
        // show user-visible error if server returned info
        try {
            const body = e && e.body ? e.body : null;
            const msg = (body && (body.error || body.message)) ? (body.error || body.message) : (e && e.message ? e.message : 'Could not create post on server');
            alert(msg);
        } catch (ex) {
            // ignore alert errors
        }
        // fall through to local fallback
    }

    // Local-only fallback when backend unavailable or not logged in
    const newPost = {
        id: crypto.randomUUID(),
        user: getCurrentUserNameFromToken() || currentUser.name,
        avatar: currentUser.avatar,
        content: text,
        image: selectedImage,
        privacy,
        time: new Date().toISOString(),
        // record local author id (if user is logged in via token)
        authorId: getCurrentUserId(),
        likes: 0,
        reaction: "none",
        comments: [],
        commentCount: 0,
        shares: 0,
        _editing: false
    };

    posts.unshift(newPost);
    savePosts();

    postInput.value = "";
    selectedImage = null;
    previewImg.style.display = "none";
    postImageInput.value = "";

    renderPosts();
}

/* -------------------------
   DELETE POST
--------------------------*/
async function deletePost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    // Try backend delete when post id is numeric (created on server)
    const num = postIdNum(id);
    try {
        // only try if num looks numeric
        if (/^\d+$/.test(String(num))) {
            await api.del(`/api/posts/${num}`);
        }
    } catch (e) {
        console.warn('Could not delete post on backend (may be unauthorized); deleting locally', e);
    }

    // remove locally and re-render
    posts = posts.filter(p => p.id !== id);
    savePosts();
    renderPosts();
}

/* -------------------------
   COMMENTS
--------------------------*/
async function toggleReaction(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const num = postIdNum(id);
    try {
        if (post.reaction && post.reaction !== 'none') {
            // unreact
            await api.del(`/api/posts/${num}/react`);
            post.reaction = 'none';
        } else {
            // react (default: like)
            await api.post(`/api/posts/${num}/react?type=like`);
            post.reaction = 'like';
        }
        // Optionally: fetch count by type
        const countResp = await api.get(`/api/posts/${num}/reactions/count/like`);
        post.likes = Number(countResp.count) || 0;
    } catch (e) {
        // fallback: toggle locally
        post.reaction = post.reaction === 'none' ? 'like' : 'none';
        post.likes = post.reaction === 'like' ? 1 : 0;
    }
    // persist locally for reload when offline/anonymous
    setLocalReaction(num, post.reaction);
    savePosts();
    updatePostReactionUI(id);
}

function postIdNum(id) {
    return id.toString().replace(/^post-/, '');
}

// Decode JWT payload safely
function parseJwtPayload(token) {
    if (!token) return null;
    try {
        const part = token.split('.')[1];
        const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(b64);
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

function getCurrentUserId() {
    const t = api.getToken();
    if (!t) return null;
    const payload = parseJwtPayload(t);
    if (!payload) return null;
    return payload.sub || payload.userId || null;
}

function getCurrentUserNameFromToken() {
    const t = api.getToken();
    if (!t) return null;
    const payload = parseJwtPayload(t);
    if (!payload) return null;
    return payload.userName || null;
}

// Escape HTML to avoid injecting raw user content into templates
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Start editing a post inline
function startEditPost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const canEdit = (getCurrentUserId() && String(getCurrentUserId()) == String(post.authorId)) || (currentUser.name && currentUser.name === post.user) || (getCurrentUserNameFromToken() && getCurrentUserNameFromToken() === post.user);
    if (!canEdit) return;

    const card = document.getElementById('post_card_' + id);
    if (!card) return;

    // Get current content
    const contentEl = card.querySelector('#post_content_' + id);
    const current = contentEl ? contentEl.innerText : (post.content || '');

    // Hide existing content
    if (contentEl) {
        contentEl.style.display = 'none';
    }

    // Remove existing edit container if any
    const existingEdit = card.querySelector('.post-edit-container');
    if (existingEdit) {
        existingEdit.remove();
    }

    // Create inline edit UI
    const editHtml = `
        <div class="post-edit-container">
            <textarea id="post_edit_input_${id}" class="post-edit-textarea" placeholder="What's on your mind?">${escapeHtml(current)}</textarea>
            <div class="post-edit-actions">
                <button class="btn-save" onclick="saveEditPost('${id}')">
                    <i class="fas fa-check"></i> Save
                </button>
                <button class="btn-cancel" onclick="cancelEditPost('${id}')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;

    // Insert after post header
    const postHeader = card.querySelector('.post-header');
    if (postHeader) {
        postHeader.insertAdjacentHTML('afterend', editHtml);
    }

    const ta = document.getElementById('post_edit_input_' + id);
    if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
    }
}

// Save edited post (optimistic UI, call backend when possible)
async function saveEditPost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const ta = document.getElementById('post_edit_input_' + id);
    if (!ta) return;
    const val = ta.value.trim();
    if (!val) {
        alert('Content is required');
        return;
    }

    // Update backend if possible
    const num = postIdNum(id);
    try {
        if (/^\d+$/.test(String(num))) {
            await api.put(`/api/posts/${num}`, { content: val });
        }
    } catch (e) {
        console.warn('Could not save edited post to backend; saving locally', e);
    }

    // update local model
    post.content = val;
    post._editing = false;

    // Update UI
    const card = document.getElementById('post_card_' + id);
    if (!card) return;
    
    // Remove edit container
    const editContainer = card.querySelector('.post-edit-container');
    if (editContainer) {
        editContainer.remove();
    }
    
    // Show updated content
    const contentEl = card.querySelector('#post_content_' + id);
    if (contentEl) {
        contentEl.textContent = post.content;
        contentEl.style.display = 'block';
    }

    savePosts();
}

function cancelEditPost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const card = document.getElementById('post_card_' + id);
    if (!card) return;
    
    // Remove edit container
    const editContainer = card.querySelector('.post-edit-container');
    if (editContainer) {
        editContainer.remove();
    }
    
    // Show original content
    const contentEl = card.querySelector('#post_content_' + id);
    if (contentEl) {
        contentEl.style.display = 'block';
    }
}

function updateCommentCountInUI(id) {
    const post = posts.find(p => p.id === id);
    const btn = document.querySelector(`.comment-toggle-btn[data-post-id="${id}"]`);
    if (btn) {
        const span = btn.querySelector('.comment-count');
        if (span) span.innerText = post ? (post.commentCount || post.comments.length || 0) : 0;
    }
}

async function addComment(id) {
    // ensure comment box is open and input exists
    let input = document.getElementById("cmt_input_" + id);
    if (!input) {
        await toggleComments(id);
        input = document.getElementById("cmt_input_" + id);
        if (!input) return; // cannot comment if input still not available
    }

    const text = input.value.trim();
    if (!text) return;

    const post = posts.find(p => p.id === id);
    if (!post) return;

    let newComment;
    let isFallback = false;
    // Try to post to backend if available
    try {
        const num = postIdNum(id);
        const resp = await api.post(`/api/posts/${num}/comments`, { content: text });
        const c = resp;
        newComment = {
            id: 'cmt-' + c.commentId,
            authorId: (c.user && c.user.userId) || c.userId || null,
            user: (c.user && c.user.userName) || c.userName || currentUser.name,
            avatar: getAvatarUrl((c.user && c.user.avatarUrl) || c.avatarUrl),
            text: c.content || c.text || text,
            time: c.createdAt || c.time || new Date().toISOString()
        };
    } catch (e) {
        // fallback to local only
        isFallback = true;
        newComment = {
            id: 'cmt-' + crypto.randomUUID(),
            user: currentUser.name,
            avatar: currentUser.avatar,
            text,
            time: new Date().toISOString()
        };
    }

    // Nếu server đã broadcast sự kiện trước khi HTTP response về, ta tránh duplicate bằng cách kiểm tra id
    const alreadyExists = (post.comments || []).some(cmt => cmt.id === newComment.id);
    if (!alreadyExists) {
        post.comments.unshift(newComment);
        post.commentCount = (post.commentCount || 0) + 1;
    } else {
        // cập nhật nội dung nếu đã tồn tại (thường là WS đã thêm trước)
        const existing = post.comments.find(cmt => cmt.id === newComment.id);
        if (existing) {
            existing.user = newComment.user;
            existing.authorId = newComment.authorId || existing.authorId;
            existing.avatar = newComment.avatar || existing.avatar;
            existing.text = newComment.text;
            existing.time = newComment.time;
        }
    }

    // set last comment preview to show immediately
    post._lastComment = { user: newComment.user, text: newComment.text };

    // Update DOM in-place (no full re-render)
    const box = document.getElementById("cmt_" + id);
    if (box) {
        // include authorId for local comments so owner can delete
        newComment.authorId = getCurrentUserId();
        const currentId = getCurrentUserId();
        const currentName = getCurrentUserNameFromToken() || currentUser.name;
        const isCommentOwner = currentId && String(currentId) == String(newComment.authorId);
        const isPostOwner = currentId && String(currentId) == String(post.authorId);
        const isNameMatch = currentName && (currentName === newComment.user || currentName === post.user);
        const canDeleteComment = !!(isCommentOwner || isPostOwner || isNameMatch);
        const cHtml = `\n            <div class="cmt-item" id="cmt_item_${newComment.id}">\n                <img src="${getFullImageUrl(newComment.avatar)}">\n                <span><b>${newComment.user}</b> ${newComment.text}</span>\n                ${canDeleteComment ? `<button onclick="deleteComment('${id}', '${newComment.id}')">×</button>` : ''}\n            </div>\n        `;
        // insert at top only if not already added by WS
        if (typeof alreadyExists === 'undefined' || !alreadyExists) {
            box.insertAdjacentHTML('afterbegin', cHtml);
            // scroll to top of comment box
            box.scrollTop = 0;
            // clear input
            input.value = '';
            updateCommentCountInUI(id);
        } else {
            // update existing DOM element if present (WS likely added it)
            const existingElem = document.getElementById('cmt_item_' + newComment.id);
            if (existingElem) {
                const span = existingElem.querySelector('span');
                if (span) span.innerHTML = `<b>${escapeHtml(newComment.user)}</b> ${escapeHtml(newComment.text)}`;
            }
            input.value = '';
        }
    }

    savePosts();
}

async function deleteComment(postId, cmtId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // try backend delete if commentId is in form cmt-<num>
    const match = String(cmtId).match(/^cmt-(\d+)$/);
    if (match) {
        const num = match[1];
        try {
            await api.del(`/api/posts/${postIdNum(postId)}/comments/${num}`);
        } catch (e) {
            console.warn('Could not delete comment on backend, falling back to local', e);
        }
    }

    // remove locally
    post.comments = post.comments.filter(c => c.id !== cmtId);
    post.commentCount = Math.max(0, (post.commentCount || 1) - 1);

    // remove DOM element if present
    const elem = document.getElementById('cmt_item_' + cmtId);
    if (elem) elem.remove();

    updateCommentCountInUI(postId);
    savePosts();
}
async function loadCommentsForPost(id) {
    const num = postIdNum(id);
    try {
        const list = await api.get(`/api/posts/${num}/comments`);
        const post = posts.find(p => p.id === id);
        if (!post) return;
        post.comments = (list || []).map(c => ({
            id: 'cmt-' + c.commentId,
            authorId: (c.user && c.user.userId) || c.userId || null,
            user: (c.user && c.user.userName) || c.userName || 'Unknown',
            avatar: getAvatarUrl((c.user && c.user.avatarUrl) || c.avatarUrl),
            text: c.content || c.text || '',
            time: c.createdAt || c.time || new Date().toISOString()
        }));
        post.commentCount = post.comments.length;

        // update comment box DOM in-place (no full re-render)
        const box = document.getElementById("cmt_" + id);
        if (!box) return;

        const commentsHTML = post.comments.map(c => {
            const currentId = getCurrentUserId();
            const currentName = getCurrentUserNameFromToken() || currentUser.name;
            const isCommentOwner = currentId && String(currentId) == String(c.authorId);
            const isPostOwner = currentId && String(currentId) == String(post.authorId);
            const isNameMatch = currentName && (currentName === c.user || currentName === post.user);
            const canDeleteComment = !!(isCommentOwner || isPostOwner || isNameMatch);
            return `
            <div class="cmt-item" id="cmt_item_${c.id}">
                <img src="${c.avatar}">
                <span><b>${c.user}</b> ${c.text}</span>
                ${canDeleteComment ? `<button onclick="deleteComment('${id}', '${c.id}')">×</button>` : ''}
            </div>
        `}).join("");

        const addHtml = `
            <div class="cmt-add">
                <img src="${getFullImageUrl(currentUser.avatar)}" class="cmt-avatar">
                <div class="cmt-input-wrapper">
                    <input id="cmt_input_${id}" class="cmt-input" placeholder="Write a comment...">
                </div>
                <button class="cmt-btn" onclick="addComment('${id}')">Post</button>
            </div>
        `;

        box.innerHTML = commentsHTML + addHtml;

        updateCommentCountInUI(id);
        savePosts();
    } catch (e) {
        console.warn('Could not load comments for post', id, e);
    }
}

async function toggleComments(id) {
    const box = document.getElementById("cmt_" + id);
    const post = posts.find(p => p.id === id);

    if (!box || !post) return;

    const opening = (box.style.display === "none");

    if (opening && post.comments.length === 0 && post.commentCount > 0) {
        await loadCommentsForPost(id);
        box.style.display = "block";
        return;
    }

    box.style.display = opening ? "block" : "none";
}

/* -------------------------
   SHARE POST
--------------------------*/
function sharePost(id) {
    const original = posts.find(p => p.id === id);
    if (!original) return;

    const shared = {
        id: crypto.randomUUID(),
        sharedBy: currentUser.name,
        user: original.user,
        avatar: original.avatar,
        content: original.content,
        image: original.image,
        time: new Date().toISOString(),
        likes: 0,
        reaction: "none",
        comments: [],
        commentCount: original.commentCount || 0,
        shares: 0
    };

    original.shares++;
    posts.unshift(shared);
    savePosts();
    renderPosts();
}

/* -------------------------
   RENDER POSTS
--------------------------*/
function renderPosts() {
    postList.innerHTML = "";

    posts.forEach(post => {

        const commentsHTML = post.comments.map(c => {
            const currentId = getCurrentUserId();
            const currentName = getCurrentUserNameFromToken() || currentUser.name;
            const isCommentOwner = currentId && String(currentId) == String(c.authorId);
            const isPostOwner = currentId && String(currentId) == String(post.authorId);
            const isNameMatch = currentName && (currentName === c.user || currentName === post.user);
            const canDeleteComment = !!(isCommentOwner || isPostOwner || isNameMatch);
            return `
            <div class="cmt-item" id="cmt_item_${c.id}">
                <img src="${c.avatar}">
                <span><b>${c.user}</b> ${c.text}</span>
                ${canDeleteComment ? `<button onclick="deleteComment('${post.id}', '${c.id}')">×</button>` : ''}
            </div>
        `}).join("");

        const card = document.createElement("div");
        card.className = "card-premium post-card";
        card.id = 'post_card_' + post.id;

        card.innerHTML = `
            <div class="post-header">
                <img src="${getFullImageUrl(post.avatar)}" class="avatar-large" style="cursor: pointer;" onclick="viewUserProfile(${post.authorId})" title="View profile">

                <div class="post-header-info" style="cursor: pointer;" onclick="viewUserProfile(${post.authorId})">
                    <div class="post-user">${post.user}</div>
                    <div class="post-time">${privacyIcon(post.privacy)} • ${timeAgo(post.time)}</div>
                </div>

                ${((getCurrentUserId() && String(getCurrentUserId()) == String(post.authorId)) || (currentUser.name && currentUser.name === post.user) || (getCurrentUserNameFromToken() && getCurrentUserNameFromToken() === post.user)) ? `
                <div class="post-actions-menu">
                    <button class="post-edit-btn" onclick="startEditPost('${post.id}')" title="Edit post">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="post-delete" onclick="deletePost('${post.id}')" title="Delete post">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ` : ''}
            </div>

            ${post.content ? `<div class="post-content" id="post_content_${post.id}">${post.content}</div>` : ""}
            ${post.image ? `<img src="${getFullImageUrl(post.image)}" class="gummy-image">` : ""}

            <!-- LATEST COMMENT PREVIEW (shows even when comment box closed) -->
            ${post._lastComment ? `<div class="post-latest-cmt" id="post_latest_cmt_${post.id}"><b>${escapeHtml(post._lastComment.user)}</b> ${escapeHtml(post._lastComment.text)}</div>` : (post.comments && post.comments.length > 0 ? `<div class="post-latest-cmt" id="post_latest_cmt_${post.id}"><b>${escapeHtml(post.comments[0].user)}</b> ${escapeHtml(post.comments[0].text)}</div>` : ``)}

            <div class="post-actions">

                <!-- LIKE + HOVER REACTIONS -->
                <div class="reaction-wrapper">

                    <div class="reaction-box" id="reactBox_${post.id}">
                        <span onclick="setReaction('${post.id}', 'like')">👍</span>
                        <span onclick="setReaction('${post.id}', 'love')">❤️</span>
                        <span onclick="setReaction('${post.id}', 'haha')">😆</span>
                        <span onclick="setReaction('${post.id}', 'wow')">😮</span>
                        <span onclick="setReaction('${post.id}', 'sad')">😢</span>
                        <span onclick="setReaction('${post.id}', 'angry')">😡</span>
                    </div>

                    <button class="post-btn ${post.reaction !== 'none' ? 'liked' : ''}"
                            onclick="toggleReaction('${post.id}')">

                        ${
                            post.reaction === "none"
                            ? `<i class='fa-regular fa-thumbs-up'></i> Like`
                            : `${reactionEmoji(post.reaction)}`
                        }

                        ${post.likes > 0 ? `${post.likes}` : ""}
                    </button>



                </div>

                <!-- COMMENT -->
                <button class="post-btn comment-toggle-btn" data-post-id="${post.id}" onclick="toggleComments('${post.id}')">
                    💬 Comment (<span class="comment-count">${post.commentCount || post.comments.length}</span>)
                </button>

                <!-- SHARE -->
                <button class="post-btn" onclick="sharePost('${post.id}')">
                    <i class="fa-solid fa-share"></i> Share (${post.shares})
                </button>


            </div>

            <div class="comment-box" id="cmt_${post.id}" style="display:none;">
                ${commentsHTML}

                <div class="cmt-add">
                    <img src="${getFullImageUrl(currentUser.avatar)}" class="cmt-avatar">
                    <div class="cmt-input-wrapper">
                        <input id="cmt_input_${post.id}" class="cmt-input" placeholder="Write a comment...">
                    </div>
                    <button class="cmt-btn" onclick="addComment('${post.id}')">Post</button>
                </div>
            </div>
        `;

        postList.appendChild(card);
    });
}

renderPosts();

/* ============================================================
   STORY SYSTEM
============================================================ */
let myStory = localStorage.getItem("gummy_story");

function loadStory() {
    const box = document.getElementById("myStoryBox");
    const img = document.getElementById("myStoryImage");

    if (myStory) {
        img.src = myStory;
        box.style.display = "block";
    } else {
        box.style.display = "none";
    }
}
loadStory();

document.getElementById("storyUploadInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {
        const img = new Image();
        img.src = e.target.result;

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const MAX = 600;
            let w = img.width;
            let h = img.height;

            if (w > MAX) {
                h = h * (MAX / w);
                w = MAX;
            }

            canvas.width = w;
            canvas.height = h;

            ctx.drawImage(img, 0, 0, w, h);

            myStory = canvas.toDataURL("image/jpeg", 0.75);

            localStorage.setItem("gummy_story", myStory);
            loadStory();
        };
    };

    reader.readAsDataURL(file);
});

function openStory(url) {
    document.getElementById("storyImage").src = url;
    document.getElementById("storyViewer").style.display = "flex";
}

function deleteMyStory(event) {
    event.stopPropagation();
    localStorage.removeItem("gummy_story");
    myStory = null;
    loadStory();
}
function closeStory() {
    document.getElementById("storyViewer").style.display = "none";
}
function burstReaction(emoji) {
    const viewer = document.getElementById("storyViewer");

    const bubble = document.createElement("div");
    bubble.className = "burst-emoji";
    bubble.innerText = emoji;

    // Lệch trái/phải ngẫu nhiên cho tự nhiên
    bubble.style.left = (50 + (Math.random() * 40 - 20)) + "%";
    bubble.style.fontSize = (26 + Math.random() * 10) + "px";

    viewer.appendChild(bubble);

    setTimeout(() => bubble.remove(), 1200);
}
function floatStoryReaction(emoji) {
    let zone = document.getElementById("storyFloatZone");
    let storyImg = document.getElementById("storyImage");

    if (!zone || !storyImg) return;

    // Lấy vị trí ảnh để giới hạn icon bay trong ảnh
    let rect = storyImg.getBoundingClientRect();

    let floatIcon = document.createElement("div");
    floatIcon.className = "story-floating-icon";
    floatIcon.innerHTML = emoji;

    // Random vị trí từ 20px bên trái đến 20px bên phải của ảnh
    let randomX = rect.left + Math.random() * rect.width;

    // Icon xuất phát từ *dưới đáy ảnh*
    let startY = rect.bottom - 30;

    floatIcon.style.left = randomX + "px";
    floatIcon.style.top = startY + "px";

    // Random tốc độ bay
    let duration = 1.2 + Math.random() * 0.8;
    floatIcon.style.animationDuration = duration + "s";

    zone.appendChild(floatIcon);

    setTimeout(() => floatIcon.remove(), duration * 1000);
}


function closeStory() {
    document.getElementById("storyViewer").style.display = "none";
}

/* -------------------------
   REALTIME WEBSOCKET
--------------------------*/
let ws;
let wsRetryTimer = null;
function buildWsUrl() {
    const token = api.getToken();
    const base = api.baseUrl ? api.baseUrl.replace(/\/$/, '') : (window.BACKEND_URL || 'http://localhost:8080');
    const scheme = base.startsWith('https') ? 'wss' : 'ws';
    const host = base.replace(/^https?:\/\//, '');
    return scheme + '://' + host + '/ws/chat?token=' + encodeURIComponent(token || '');
}

function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    const token = api.getToken();
    if (!token) {
        console.log('WS token missing, will retry in 2s');
        if (!wsRetryTimer) wsRetryTimer = setTimeout(() => { wsRetryTimer = null; connectWebSocket(); }, 2000);
        return;
    }

    const url = buildWsUrl();
    console.log('WS connecting to', url);

    try {
        ws = new WebSocket(url);
    } catch (e) {
        console.warn('WebSocket not available', e);
        if (!wsRetryTimer) wsRetryTimer = setTimeout(() => { wsRetryTimer = null; connectWebSocket(); }, 2000);
        return;
    }

    ws.addEventListener('open', () => {
        console.log('WS connected');
        if (wsRetryTimer) { clearTimeout(wsRetryTimer); wsRetryTimer = null; }
    });

    ws.addEventListener('close', (ev) => {
        console.log('WS closed, will reconnect in 2s', ev.reason);
        if (!wsRetryTimer) wsRetryTimer = setTimeout(() => { wsRetryTimer = null; connectWebSocket(); }, 2000);
    });

    ws.addEventListener('error', (ev) => {
        console.warn('WS error', ev);
    });

    ws.addEventListener('message', (ev) => {
        try {
            const msg = JSON.parse(ev.data);
            if (!msg || !msg.type) return;
            if (msg.type === 'NEW_COMMENT') handleNewCommentEvent(msg.data);
            if (msg.type === 'DELETE_COMMENT') handleDeleteCommentEvent(msg.data);
            if (msg.type === 'REACT_POST') handleReactPostEvent(msg.data);
        } catch (e) {
            console.warn('Invalid WS message', e);
        }
    });
}

// Xử lý sự kiện react từ WebSocket
function handleReactPostEvent(data) {
    if (!data || !data.postId || !data.reaction) return;
    const postId = 'post-' + data.postId;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    post.reaction = data.reaction;
    // Nếu backend gửi kèm số lượng likes mới, cập nhật luôn
    if (typeof data.likes === 'number') {
        post.likes = data.likes;
    }
    savePosts();
    updatePostReactionUI(postId);
}

function handleNewCommentEvent(data) {
    // data expected: comment fields including commentId and postId
    if (!data || data.commentId == null || data.postId == null) return;
    const postId = 'post-' + data.postId;
    const post = posts.find(p => p.id === postId);
    if (!post) return; // possibly not in current feed

    const cid = 'cmt-' + data.commentId;
    // ignore if already present
    if ((post.comments || []).some(c => c.id === cid)) return;

    const comment = {
        id: cid,
        authorId: (data.user && data.user.userId) || data.userId || null,
        user: (data.user && data.user.userName) || data.userName || (data.user && data.user.userName) || 'Unknown',
        avatar: getAvatarUrl((data.user && data.user.avatarUrl) || data.avatarUrl),
        text: data.content || data.content || '',
        time: data.createdAt || data.createdAt || new Date().toISOString()
    };

    post.comments.unshift(comment);
    post.commentCount = (post.commentCount || 0) + 1;

    // set last comment preview to show immediately
    post._lastComment = { user: comment.user, text: comment.text };

    // if comment box open, insert element at top
    const box = document.getElementById('cmt_' + postId);
    if (box) {
        const currentId = getCurrentUserId();
        const currentName = getCurrentUserNameFromToken() || currentUser.name;
        const isCommentOwner = currentId && String(currentId) == String(comment.authorId);
        const isPostOwner = currentId && String(currentId) == String(post.authorId);
        const isNameMatch = currentName && (currentName === comment.user || currentName === post.user);
        const canDeleteComment = !!(isCommentOwner || isPostOwner || isNameMatch);
        const cHtml = `\n            <div class="cmt-item" id="cmt_item_${comment.id}">\n                <img src="${getFullImageUrl(comment.avatar)}">\n                <span><b>${comment.user}</b> ${comment.text}</span>\n                ${canDeleteComment ? `<button onclick="deleteComment('${postId}', '${comment.id}')">×</button>` : ''}\n            </div>\n        `;
        box.insertAdjacentHTML('afterbegin', cHtml);
    }

    // update preview element if present
    const prevEl = document.getElementById('post_latest_cmt_' + postId);
    if (prevEl) prevEl.innerHTML = `<b>${escapeHtml(post._lastComment.user)}</b> ${escapeHtml(post._lastComment.text)}`;

    updateCommentCountInUI(postId);
    savePosts();
}

function handleDeleteCommentEvent(data) {
    if (!data || data.commentId == null || data.postId == null) return;
    const cid = 'cmt-' + data.commentId;
    const postId = 'post-' + data.postId;

    const post = posts.find(p => p.id === postId);
    if (post) {
        post.comments = (post.comments || []).filter(c => c.id !== cid);
        post.commentCount = Math.max(0, (post.commentCount || 1) - 1);
        updateCommentCountInUI(postId);
        const elem = document.getElementById('cmt_item_' + cid);
        if (elem) elem.remove();
        savePosts();
    }
}

// connect on load (if token available, reconnects automatically)
connectWebSocket();
/* ==========================
    CHAT POPUP SYSTEM
========================== */

function openChat(name, avatar) {
    const popup = document.getElementById("chatPopup");
    const popName = document.getElementById("popupName");
    const popAvatar = document.getElementById("popupAvatar");
    const popMsgs = document.getElementById("popupMessages");

    popName.innerText = name;
    popAvatar.src = avatar;
    popMsgs.innerHTML = ""; // clear chat history mỗi lần mở

    popup.style.display = "flex";
}

function closePopup() {
    document.getElementById("chatPopup").style.display = "none";
}

function sendPopupMsg() {
    const input = document.getElementById("popupInput");
    const msg = input.value.trim();
    if (!msg) return;

    const msgBox = document.getElementById("popupMessages");

    msgBox.innerHTML += `
        <div class="popup-msg-right">${msg}</div>
    `;

    input.value = "";
    msgBox.scrollTop = msgBox.scrollHeight;
}

