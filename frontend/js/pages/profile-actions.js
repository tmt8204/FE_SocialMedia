/* ------------------------------------------
   PROFILE ACTIONS (Profile & Settings)
------------------------------------------- */

// Note: DEFAULT_COVER_URL is defined in shared-layout.js

// Helper to get full image URL
function getFullImageUrl(imageUrl) {
    if (!imageUrl) return '';
    
    // Already a full URL
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

// ========== SETTINGS PAGE HELPERS ==========
async function loadProfile() {
    try {
        const params = new URLSearchParams(window.location.search);
        const viewingUserId = params.get('id');
        
        let p;
        if (viewingUserId) {
            // Load other user's profile
            p = await api.users.getById(viewingUserId);
            // Hide edit buttons and settings for other users' profiles
            document.querySelectorAll('.post-edit-btn, .post-delete, .edit-btn').forEach(btn => {
                btn.style.display = 'none';
            });
            // Hide edit field functionality
            document.querySelectorAll('[onclick*="editField"]').forEach(el => {
                el.style.display = 'none';
            });
        } else {
            // Load own profile
            p = await api.users.getMe();
        }
        
        if (p) {
            if (p.userName) document.getElementById('username').innerText = '@' + p.userName;
            if (p.email) document.getElementById('email').innerText = p.email;
            if (p.phone) document.getElementById('phone').innerText = p.phone;

            // Use default avatar if not set
            const avatarUrl = api.getAvatarUrl(p.avatarUrl);
            const fullAvatarUrl = getFullImageUrl(avatarUrl);
            const topImg = document.getElementById('topAvatar');
            if (topImg) topImg.src = fullAvatarUrl;

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
        console.warn('Could not load profile', e);
    }
}

function showLocal(id) {
    const saved = localStorage.getItem('setting_' + id);
    if (saved) document.getElementById(id).innerText = saved;
}

function editField(id, label) {
    let current = document.getElementById(id).innerText;
    let updated = prompt("Enter new " + label + ":", current);

    if (updated && updated !== current) {
        if (id === 'username') {
            const u = updated.replace(/^@/, '').trim();
            console.log('🔧 Updating username:', {current, updated, processed: u});
            api.users.updateMe({ userName: u })
                .then(res => {
                    console.log('✅ Username update success:', res);
                    document.getElementById('username').innerText = '@' + (res.userName || u);
                    alert('Username updated');
                })
                .catch(err => {
                    console.error('❌ Username update error:', err);
                    let msg = 'Update failed';
                    if (err && err.body) {
                        if (typeof err.body === 'string') {
                            msg = err.body;
                        } else if (err.body.error) {
                            // Map error codes to user-friendly messages
                            const errorMap = {
                                'USER_NAME_EXISTS': 'Tên đăng nhập này đã được sử dụng',
                                'INVALID_USER_NAME': 'Tên đăng nhập không hợp lệ (3-50 ký tự, chỉ có chữ, số, dấu gạch dưới, chấm hoặc dấu gạch)',
                                'USER_NAME_REQUIRED': 'Tên đăng nhập không được để trống'
                            };
                            msg = errorMap[err.body.error] || err.body.error;
                        }
                    }
                    alert('Lỗi: ' + msg);
                });
        } else if (id === 'email') {
            const e = updated.trim();
            console.log('🔧 Updating email:', {current, updated, processed: e});
            api.users.updateMe({ email: e })
                .then(res => {
                    console.log('✅ Email update success:', res);
                    document.getElementById('email').innerText = res.email || e;
                    alert('Email updated');
                })
                .catch(err => {
                    console.error('❌ Email update error:', err);
                    let msg = 'Update failed';
                    if (err && err.body) {
                        if (typeof err.body === 'string') {
                            msg = err.body;
                        } else if (err.body.error) {
                            const errorMap = {
                                'EMAIL_EXISTS': 'Email này đã được sử dụng',
                                'INVALID_EMAIL': 'Email không hợp lệ',
                                'EMAIL_REQUIRED': 'Email không được để trống'
                            };
                            msg = errorMap[err.body.error] || err.body.error;
                        }
                    }
                    alert('Lỗi: ' + msg);
                });
        } else if (id === 'phone') {
            const ph = updated.trim();
            
            // Validation: Chỉ số, 10 ký tự
            if (!/^\d+$/.test(ph)) {
                alert('Lỗi: Số điện thoại phải chỉ chứa các chữ số');
                return;
            }
            if (ph.length !== 10) {
                alert('Lỗi: Số điện thoại phải có chính xác 10 ký tự');
                return;
            }
            
            console.log('🔧 Updating phone:', {current, updated, processed: ph});
            api.users.updateMe({ phone: ph })
                .then(res => {
                    console.log('✅ Phone update success:', res);
                    document.getElementById('phone').innerText = res.phone || ph;
                    alert('Phone updated');
                })
                .catch(err => {
                    console.error('❌ Phone update error:', err);
                    let msg = 'Update failed';
                    if (err && err.body) {
                        if (typeof err.body === 'string') {
                            msg = err.body;
                        } else if (err.body.error) {
                            const errorMap = {
                                'INVALID_PHONE': 'Số điện thoại không hợp lệ'
                            };
                            msg = errorMap[err.body.error] || err.body.error;
                        }
                    }
                    alert('Lỗi: ' + msg);
                });
        } else if (id === 'name') {
            document.getElementById(id).innerText = updated;
            localStorage.setItem('setting_' + id, updated);
        } else {
            document.getElementById(id).innerText = updated;
            localStorage.setItem('setting_' + id, updated);
        }
    }
}

function openChangePassword() {
    document.getElementById('changePasswordBox').style.display = 'block';
}

function closeChangePassword() {
    document.getElementById('changePasswordBox').style.display = 'none';
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
}

function submitChangePassword() {
    const current = document.getElementById('currentPassword').value;
    const next = document.getElementById('newPassword').value;

    if (!current || !next) {
        alert('Please enter both current and new password.');
        return;
    }

    if (next.length < 6) {
        alert('New password must be at least 6 characters.');
        return;
    }

    api.users.changePassword(current, next)
        .then(() => {
            alert('Password changed successfully!');
            closeChangePassword();
        })
        .catch(err => {
            const msg = (err && err.body && err.body.error) ? err.body.error : (err.message || 'Change failed');
            alert('Failed to change password: ' + msg);
        });
}

// Initialize settings page (if on settings.html)
if (document.body.querySelector('.settings-card')) {
    window.addEventListener('load', async () => {
        ['name', 'phone', 'email'].forEach(showLocal);
        await loadProfile();
    });
}

// ========== PROFILE PAGE HELPERS ==========
let avatarInputEl, coverInputEl, aboutPopupEl, editBirthdayEl, editLocationEl, editStatusEl, editEduEl, aboutContentEl, bioTextEl, profileNameEl, topbarAvatarEl, aboutSaveBtnEl;
let currentProfile = null;

function changeAvatar() { if (avatarInputEl) avatarInputEl.click(); }
function changeCover() { if (coverInputEl) coverInputEl.click(); }

function showToast(msg, type = 'info', duration = 5000) {
    const d = document.createElement('div');
    d.className = 'gummy-toast ' + (type || '');
    d.innerText = msg;
    document.body.appendChild(d);
    requestAnimationFrame(() => d.classList.add('show'));
    setTimeout(() => { d.classList.remove('show'); setTimeout(() => d.remove(), 250); }, duration);
}

function updateStatsFromProfile(p) {
    if (!p) return;
    const postsCountEl = document.getElementById('postsCount');
    const friendsCountEl = document.getElementById('friendsCount');
    const communitiesCountEl = document.getElementById('communitiesCount');

    if (postsCountEl && typeof p.postCount !== 'undefined') postsCountEl.innerText = p.postCount;
    if (friendsCountEl && typeof p.friendCount !== 'undefined') friendsCountEl.innerText = p.friendCount;
    if (communitiesCountEl && typeof p.communityCount !== 'undefined') communitiesCountEl.innerText = p.communityCount;
}

function onAvatarChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async ev => {
        const dataUrl = ev.target.result;
        localStorage.setItem("gummy_avatar", dataUrl);
        if (document.querySelector(".profile-avatar")) document.querySelector(".profile-avatar").style.backgroundImage = `url('${dataUrl}')`;
        if (topbarAvatarEl) topbarAvatarEl.style.backgroundImage = `url('${dataUrl}')`;
        try {
            // Upload image first
            const formData = new FormData();
            formData.append("file", f);
            
            const backendUrl = (typeof api !== 'undefined' && api.baseUrl) ? api.baseUrl : 'http://localhost:8080';
            const uploadUrl = backendUrl + '/api/upload/image';
            
            const token = api.getToken ? api.getToken() : localStorage.getItem('token');
            const headers = {};
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            
            const uploadResp = await fetch(uploadUrl, {
                method: "POST",
                headers: headers,
                body: formData
            });
            
            if (!uploadResp.ok) {
                throw new Error('Upload failed');
            }
            const uploadData = await uploadResp.json();
            const avatarUrl = uploadData.url;
            
            // Then update profile with the uploaded URL
            const res = await api.put('/api/profile/me', { avatarUrl: avatarUrl });
            if (res) {
                currentProfile = res;
                const finalAvatarUrl = res.avatarUrl || avatarUrl;
                localStorage.setItem('gummy_avatar', finalAvatarUrl);
                const fullAvatarUrl = getFullImageUrl(finalAvatarUrl);
                if (document.querySelector('.profile-avatar')) document.querySelector('.profile-avatar').style.backgroundImage = `url('${fullAvatarUrl}')`;
                if (topbarAvatarEl) topbarAvatarEl.style.backgroundImage = `url('${fullAvatarUrl}')`;
                updateStatsFromProfile(res);
            }
            showToast('Avatar saved', 'success');
        } catch (err) {
            console.warn('Failed to save avatar to backend', err);
            showToast('Saved locally (not uploaded)', 'info');
        }
    };
    r.readAsDataURL(f);
}

function onCoverChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async ev => {
        const dataUrl = ev.target.result;
        localStorage.setItem("gummy_cover", dataUrl);
        if (document.querySelector(".profile-cover-img")) document.querySelector(".profile-cover-img").style.backgroundImage = `url('${dataUrl}')`;
        try {
            // Upload image first
            const formData = new FormData();
            formData.append("file", f);
            
            const backendUrl = (typeof api !== 'undefined' && api.baseUrl) ? api.baseUrl : 'http://localhost:8080';
            const uploadUrl = backendUrl + '/api/upload/image';
            
            const token = api.getToken ? api.getToken() : localStorage.getItem('token');
            const headers = {};
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            
            const uploadResp = await fetch(uploadUrl, {
                method: "POST",
                headers: headers,
                body: formData
            });
            
            if (!uploadResp.ok) {
                throw new Error('Upload failed');
            }
            const uploadData = await uploadResp.json();
            const coverUrl = uploadData.url;
            
            // Then update profile with the uploaded URL
            const res = await api.put('/api/profile/me', { coverUrl: coverUrl });
            if (res) {
                currentProfile = res;
                const finalCoverUrl = res.coverUrl || coverUrl;
                localStorage.setItem('gummy_cover', finalCoverUrl);
                const fullCoverUrl = getFullImageUrl(finalCoverUrl);
                if (document.querySelector('.profile-cover-img')) document.querySelector('.profile-cover-img').style.backgroundImage = `url('${fullCoverUrl}')`;
                updateStatsFromProfile(res);
            }
            showToast('Cover saved', 'success');
        } catch (err) {
            console.warn('Failed to save cover to backend', err);
            showToast('Saved locally (not uploaded)', 'info');
        }
    };
    r.readAsDataURL(f);
}

async function editName() {
    if (!profileNameEl) return;
    const current = profileNameEl.innerText;
    let newName = prompt('Update your display name:', current);
    if (!newName) return;
    newName = newName.trim();
    if (!newName) return showToast('Name cannot be empty', 'error');

    profileNameEl.innerText = newName;
    localStorage.setItem('setting_name', newName);

    try {
        const res = await api.put('/api/profile/me', { userName: newName });
        if (res) {
            currentProfile = res;
            const saved = res.userName || newName;
            profileNameEl.innerText = saved;
            localStorage.setItem('setting_name', saved);
            updateStatsFromProfile(res);
        }
        showToast('Name saved', 'success');
    } catch (err) {
        console.warn('Could not save name', err);
        profileNameEl.innerText = current;
        localStorage.setItem('setting_name', current);
        const bodyMsg = (err && err.body && (err.body.message || err.body.error)) || err.body || 'Failed to save name';
        showToast(bodyMsg, 'error');
    }
}

async function editBio() {
    if (!bioTextEl) return;
    const current = bioTextEl.innerText;
    let newBio = prompt('Update your bio:', current);
    if (!newBio) return;
    newBio = newBio.trim();

    bioTextEl.innerText = newBio;
    localStorage.setItem('gummy_bio', newBio);

    try {
        const res = await api.put('/api/profile/me', { bio: newBio });
        if (res) {
            currentProfile = res;
            const saved = res.bio || newBio;
            bioTextEl.innerText = saved;
            localStorage.setItem('gummy_bio', saved);
        }
        showToast('Bio saved', 'success');
    } catch (err) {
        console.warn('Could not save bio', err);
        bioTextEl.innerText = current;
        const msg = (err && err.body && err.body.error) || 'Failed to save bio';
        showToast(msg, 'error');
    }
}

function openAboutPopup() {
    if (aboutPopupEl) aboutPopupEl.style.display = 'flex';
    if (currentProfile) {
        if (editBirthdayEl) editBirthdayEl.value = currentProfile.birthday || '';
        if (editLocationEl) editLocationEl.value = currentProfile.location || '';
        if (editStatusEl) editStatusEl.value = currentProfile.relationship || '';
        if (editEduEl) editEduEl.value = currentProfile.edu || '';
    }
    enableAboutSave();
}

function closeAboutPopup() {
    if (aboutPopupEl) aboutPopupEl.style.display = 'none';
}

function enableAboutSave() {
    if (aboutSaveBtnEl) aboutSaveBtnEl.disabled = false;
}

async function saveAbout() {
    const about = {
        birthday: editBirthdayEl?.value || '',
        location: editLocationEl?.value || '',
        relationship: editStatusEl?.value || '',
        edu: editEduEl?.value || ''
    };

    try {
        const res = await api.put('/api/profile/me', about);
        if (res) {
            currentProfile = res;
            if (aboutContentEl) {
                aboutContentEl.innerHTML = `
                    <p>🎂 Ngày Sinh - ${about.birthday}</p>
                    <p>📍 Sống tại - ${about.location}</p>
                    <p>❤️ Mối quan hệ - ${about.relationship}</p>
                    <p>📚 Trường học - ${about.edu}</p>
                `;
            }
            localStorage.setItem('gummy_about_json', JSON.stringify(about));
        }
        showToast('About saved', 'success');
        closeAboutPopup();
    } catch (err) {
        console.warn('Failed to save about', err);
        const msg = (err && err.body && err.body.error) || 'Failed to save';
        showToast(msg, 'error');
    }
}

function initProfilePage() {
    // Bind elements
    avatarInputEl = document.getElementById('avatarInput');
    coverInputEl = document.getElementById('coverInput');
    aboutPopupEl = document.getElementById('aboutPopup');
    editBirthdayEl = document.getElementById('editBirthday');
    editLocationEl = document.getElementById('editLocation');
    editStatusEl = document.getElementById('editStatus');
    editEduEl = document.getElementById('editEdu');
    aboutContentEl = document.getElementById('aboutContent');
    bioTextEl = document.getElementById('bioText');
    profileNameEl = document.getElementById('profileName');
    topbarAvatarEl = document.getElementById('topbarAvatar');
    aboutSaveBtnEl = document.getElementById('aboutSaveBtn');

    // Attach change handlers
    if (avatarInputEl) avatarInputEl.addEventListener('change', onAvatarChange);
    if (coverInputEl) coverInputEl.addEventListener('change', onCoverChange);

    // Load profile from backend
    (async () => {
        try {
            const profile = await api.users.getMe();
            if (profile) {
                currentProfile = profile;

                // Use default avatar and cover if not set
                const avatar = api.getAvatarUrl(profile.avatarUrl || localStorage.getItem('gummy_avatar'));
                const cover = getCoverUrl(profile.coverUrl || localStorage.getItem('gummy_cover'));
                const name = profile.userName || localStorage.getItem('setting_name') || 'User Name';
                const bio = profile.bio || localStorage.getItem('gummy_bio') || '"Living the sweetest life 🍬♡"';

                if (document.querySelector('.profile-avatar')) {
                    const fullAvatarUrl = getFullImageUrl(avatar);
                    document.querySelector('.profile-avatar').style.backgroundImage = `url('${fullAvatarUrl}')`;
                }
                if (topbarAvatarEl) {
                    const fullAvatarUrl = getFullImageUrl(avatar);
                    topbarAvatarEl.style.backgroundImage = `url('${fullAvatarUrl}')`;
                }
                if (document.querySelector('.profile-cover-img')) {
                    const fullCoverUrl = getFullImageUrl(cover);
                    document.querySelector('.profile-cover-img').style.backgroundImage = `url('${fullCoverUrl}')`;
                }
                if (profileNameEl) profileNameEl.innerText = name;
                if (bioTextEl) bioTextEl.innerText = bio;

                const about = {
                    birthday: profile.birthday || '',
                    location: profile.location || '',
                    status: profile.relationship || '',
                    edu: profile.edu || ''
                };
                if (aboutContentEl) {
                    aboutContentEl.innerHTML = `
                        <p>🎂 Ngày Sinh - ${about.birthday}</p>
                        <p>📍 Sống tại - ${about.location}</p>
                        <p>❤️ Mối quan hệ - ${about.status}</p>
                        <p>📚 Trường học - ${about.edu}</p>
                    `;
                }

                updateStatsFromProfile(profile);

                localStorage.setItem('gummy_avatar', avatar);
                localStorage.setItem('gummy_cover', cover);
                localStorage.setItem('setting_name', name);
                localStorage.setItem('gummy_bio', bio);
                localStorage.setItem('gummy_about_json', JSON.stringify(about));
            }
        } catch (e) {
            console.warn('Could not fetch profile from backend, using localStorage', e);
            const avatar = localStorage.getItem('gummy_avatar');
            const cover = getCoverUrl(localStorage.getItem('gummy_cover'));
            const name = localStorage.getItem('setting_name') || 'User Name';
            const bio = localStorage.getItem('gummy_bio') || '"Living the sweetest life 🍬♡"';

            if (avatar && document.querySelector('.profile-avatar')) {
                const fullAvatarUrl = getFullImageUrl(avatar);
                document.querySelector('.profile-avatar').style.backgroundImage = `url('${fullAvatarUrl}')`;
                if (topbarAvatarEl) topbarAvatarEl.style.backgroundImage = `url('${fullAvatarUrl}')`;
            }
            if (document.querySelector('.profile-cover-img')) {
                const fullCoverUrl = getFullImageUrl(cover);
                document.querySelector('.profile-cover-img').style.backgroundImage = `url('${fullCoverUrl}')`;
            }
            if (profileNameEl) profileNameEl.innerText = name;
            if (bioTextEl) bioTextEl.innerText = bio;
        }

        renderProfilePosts();
        loadProfilePhotos();
    })();
}

document.addEventListener('DOMContentLoaded', initProfilePage);

/* ========== POST RENDERING ========== */
async function editPost(id) {
    const postCard = document.querySelector(`[data-post-id="${id}"]`);
    if (!postCard) return;
    
    const contentDiv = postCard.querySelector('.post-content');
    const originalContent = contentDiv ? contentDiv.textContent : '';
    
    // Create edit UI
    const editContainer = document.createElement('div');
    editContainer.className = 'post-edit-container';
    editContainer.innerHTML = `
        <textarea class="post-edit-textarea" placeholder="What's on your mind?">${originalContent}</textarea>
        <div class="post-edit-actions">
            <button class="btn-save" onclick="savePostEdit('${id}')">
                <i class="fas fa-check"></i> Save
            </button>
            <button class="btn-cancel" onclick="cancelPostEdit('${id}')">
                <i class="fas fa-times"></i> Cancel
            </button>
        </div>
    `;
    
    // Replace content with edit UI
    if (contentDiv) {
        contentDiv.style.display = 'none';
    }
    
    const editExisting = postCard.querySelector('.post-edit-container');
    if (editExisting) {
        editExisting.remove();
    }
    
    const postHeader = postCard.querySelector('.post-header');
    postHeader.after(editContainer);
    
    // Focus textarea
    const textarea = editContainer.querySelector('.post-edit-textarea');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

async function savePostEdit(id) {
    const postCard = document.querySelector(`[data-post-id="${id}"]`);
    if (!postCard) return;
    
    const textarea = postCard.querySelector('.post-edit-textarea');
    const newContent = textarea.value.trim();
    
    if (!newContent) {
        showToast('Post content cannot be empty', 'error');
        return;
    }
    
    try {
        // Update backend
        const num = String(id).replace(/^post-/, '');
        if (/^\d+$/.test(num)) {
            await api.put(`/api/posts/${num}`, { content: newContent });
        }
        
        // Update localStorage
        let posts = JSON.parse(localStorage.getItem("gummy_posts")) || [];
        const post = posts.find(p => p.id === id);
        if (post) {
            post.content = newContent;
            localStorage.setItem("gummy_posts", JSON.stringify(posts));
        }
        
        // Update UI
        const contentDiv = postCard.querySelector('.post-content');
        if (contentDiv) {
            contentDiv.textContent = newContent;
            contentDiv.style.display = 'block';
        }
        
        const editContainer = postCard.querySelector('.post-edit-container');
        if (editContainer) {
            editContainer.remove();
        }
        
        showToast('Post updated successfully', 'success');
    } catch (e) {
        console.error('Failed to update post', e);
        showToast('Failed to update post', 'error');
    }
}

function cancelPostEdit(id) {
    const postCard = document.querySelector(`[data-post-id="${id}"]`);
    if (!postCard) return;
    
    const contentDiv = postCard.querySelector('.post-content');
    if (contentDiv) {
        contentDiv.style.display = 'block';
    }
    
    const editContainer = postCard.querySelector('.post-edit-container');
    if (editContainer) {
        editContainer.remove();
    }
}

async function deletePost(id) {
    let posts = JSON.parse(localStorage.getItem("gummy_posts")) || [];
    const post = posts.find(p => p.id === id);
    if (!post) return;

    try {
        const num = String(id).replace(/^post-/, '');
        if (/^\d+$/.test(num) && window.api && typeof api.del === 'function') {
            await api.del(`/api/posts/${num}`);
        }
    } catch (e) {
        console.warn('Could not delete post on backend', e);
    }

    posts = posts.filter(p => p.id !== id);
    localStorage.setItem("gummy_posts", JSON.stringify(posts));
    renderProfilePosts();
    loadProfilePhotos();
}

function renderProfilePosts() {
    // Check if viewing another user's profile
    const params = new URLSearchParams(window.location.search);
    const viewingUserId = params.get('id');
    
    const endpoint = viewingUserId ? `/api/posts/profile/${viewingUserId}` : '/api/posts/me';
    
    // Try to load from API first, fallback to localStorage
    if (typeof api !== 'undefined' && typeof api.get === 'function') {
        api.get(endpoint)
            .then(posts => {
                const box = document.getElementById("profilePosts");
                if (!box) return;
                
                if (!Array.isArray(posts) || posts.length === 0) {
                    box.innerHTML = "<p>No posts yet…</p>";
                    return;
                }
                
                renderPostsFromAPI(posts, box);
            })
            .catch(err => {
                console.warn('Could not load posts from API, using localStorage', err);
                // If viewing another user and get 403, show message
                if (viewingUserId && err.status === 403) {
                    const box = document.getElementById("profilePosts");
                    if (box) box.innerHTML = "<p>Private profile - no posts to show</p>";
                } else {
                    renderPostsFromLocalStorage();
                }
            });
    } else {
        renderPostsFromLocalStorage();
    }
}

function renderPostsFromAPI(posts, box) {
    box.innerHTML = "";
    
    posts.forEach(post => {
        const commentsHTML = (post.comments || []).map(c => `
            <div class="cmt-item">
                <img src="${api.getAvatarUrl(c.avatar)}">
                <span><b>${c.user}</b> ${c.text}</span>
            </div>
        `).join("");

        const card = document.createElement("div");
        card.className = "card-premium post-card";
        card.setAttribute('data-post-id', post.postId);
        
        // Use privacy from API response
        const privacyStr = post.privacy || "FRIENDS";
        
        // Use default avatar if not set (same pattern as profile section)
        const avatarUrl = api.getAvatarUrl(post.user?.avatarUrl);
        const fullAvatarUrl = getFullImageUrl(avatarUrl);
        
        card.innerHTML = `
            <div class="post-header">
                <img src="${fullAvatarUrl}" class="avatar-large">
                <div class="post-header-info">
                    <div class="post-user">${post.user?.userName || 'User'}</div>
                    <div class="post-time">${privacyIcon(privacyStr)} • ${new Date(post.createdAt).toLocaleString()}</div>
                </div>
                <div class="post-actions-menu">
                    <button class="post-edit-btn" onclick="editPost('${post.postId}')" title="Edit post">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="post-delete" onclick="deletePost('${post.postId}')" title="Delete post">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${post.content ? `<div class="post-content">${post.content}</div>` : ""}
            ${post.imageUrl ? `<img src="${getFullImageUrl(post.imageUrl)}" class="gummy-image" onerror="this.style.display='none'">` : ""}
            <div class="post-actions" aria-hidden="true">
                <span style="color:#777;font-size:14px;">Interactions are disabled on this profile view</span>
            </div>
            <div class="comments-section">${commentsHTML}</div>
        `;
        box.appendChild(card);
    });
}

function renderPostsFromLocalStorage() {
    const posts = JSON.parse(localStorage.getItem("gummy_posts")) || [];
    const user = localStorage.getItem("setting_name") || "You";
    const box = document.getElementById("profilePosts");

    const myPosts = posts.filter(p => p.user === user);

    if (myPosts.length === 0) {
        if (box) box.innerHTML = "<p>No posts yet…</p>";
        return;
    }

    if (!box) return;
    box.innerHTML = "";

    myPosts.forEach(post => {
        const commentsHTML = (post.comments || []).map(c => `
            <div class="cmt-item">
                <img src="${c.avatar}">
                <span><b>${c.user}</b> ${c.text}</span>
            </div>
        `).join("");

        const card = document.createElement("div");
        card.className = "card-premium post-card";
        card.setAttribute('data-post-id', post.id);
        card.innerHTML = `
            <div class="post-header">
                <img src="${getFullImageUrl(post.avatar)}" class="avatar-large">
                <div class="post-header-info">
                    <div class="post-user">${post.user}</div>
                    <div class="post-time">${privacyIcon(post.privacy)} • ${new Date(post.time).toLocaleString()}</div>
                </div>
                <div class="post-actions-menu">
                    <button class="post-edit-btn" onclick="editPost('${post.id}')" title="Edit post">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="post-delete" onclick="deletePost('${post.id}')" title="Delete post">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${post.content ? `<div class="post-content">${post.content}</div>` : ""}
            ${(post.image || post.imageUrl) ? `<img src="${getFullImageUrl(post.image || post.imageUrl)}" class="gummy-image" onerror="this.style.display='none'">` : ""}
            <div class="post-actions" aria-hidden="true">
                <span style="color:#777;font-size:14px;">Interactions are disabled on this profile view</span>
            </div>
            <div class="comments-section">${commentsHTML}</div>
        `;
        box.appendChild(card);
    });
}

function privacyIcon(privacy) {
    // Map backend privacy setting (EVERYONE, FRIENDS, ONLY_ME) to icon
    if (privacy === "FRIENDS") return '<i class="fas fa-users"></i>';
    if (privacy === "ONLY_ME") return '<i class="fas fa-lock"></i>';
    if (privacy === "EVERYONE") return '<i class="fas fa-globe"></i>';
    // Default to friends if unknown
    return '<i class="fas fa-users"></i>';
}

function loadProfilePhotos() {
    const posts = JSON.parse(localStorage.getItem("gummy_posts")) || [];
    const user = localStorage.getItem("setting_name") || "You";
    const box = document.getElementById("profilePhotos");

    let imgs = posts.filter(p => p.user === user && (p.image || p.imageUrl)).map(p => p.image || p.imageUrl);

    if (imgs.length == 0) {
        if (box) box.innerHTML = "<p>Chưa có ảnh…</p>";
        return;
    }

    if (box) {
        box.innerHTML = imgs.map(img => {
            const fullUrl = getFullImageUrl(img);
            return `<img src="${fullUrl}" class="photo-thumb" onerror="this.style.display='none'" onclick="openViewer('${fullUrl}')">`;
        }).join("");
    }
}

function openViewer(url) {
    let v = document.createElement("div");
    v.style = `
        position:fixed;inset:0;background:rgba(0,0,0,0.85);
        display:flex;justify-content:center;align-items:center;
        z-index:3000;
    `;
    v.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;border-radius:12px" onerror="alert('Không thể tải ảnh')">`;
    v.onclick = () => v.remove();
    document.body.appendChild(v);
}

