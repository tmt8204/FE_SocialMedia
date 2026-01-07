// admin.js
// Admin dashboard logic

(function () {
  // ===== HELPERS =====
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

  // ===== STATE =====
  let currentUsers = [];
  let currentPosts = [];
  let currentComments = [];
  let confirmCallback = null;

  // ===== INITIALIZATION =====
  document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    setupEventListeners();
    loadDashboard();
  });

  // ===== AUTH CHECK =====
  function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      window.location.href = 'login.html';
      return;
    }

    const userData = JSON.parse(user);
    document.getElementById('admin-user-name').textContent = userData.userName || 'Admin';

    // Check if user has admin role (optional: can be verified on backend)
  }

  // ===== NAVIGATION =====
  function setupNavigation() {
    const navLinks = document.querySelectorAll('.admin-nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const section = link.getAttribute('data-section');
        showSection(section, link);
      });
    });
  }

  function showSection(sectionName, linkElement) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(sec => {
      sec.classList.remove('active');
    });

    // Remove active class from all nav links
    document.querySelectorAll('.admin-nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
      section.classList.add('active');
      if (linkElement) linkElement.classList.add('active');
    }

    // Load data for section
    switch (sectionName) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'users':
        loadAllUsers();
        break;
      case 'posts':
        loadAllPosts();
        break;
      case 'comments':
        loadAllComments();
        break;
    }
  }

  // ===== EVENT LISTENERS =====
  function setupEventListeners() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Users
    document.getElementById('search-users-btn').addEventListener('click', searchUsers);
    document.getElementById('load-all-users-btn').addEventListener('click', loadAllUsers);
    document.getElementById('user-search').addEventListener('keyup', (e) => {
      if (e.key === 'Enter') searchUsers();
    });

    // Posts
    document.getElementById('search-posts-btn').addEventListener('click', searchPosts);
    document.getElementById('load-all-posts-btn').addEventListener('click', loadAllPosts);

    // Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-confirm').addEventListener('click', confirmAction);
  }

  // ===== DASHBOARD =====
  async function loadDashboard() {
    const statsGrid = document.getElementById('stats-grid');
    
    try {
      const stats = await AdminApi.getStats();
      
      const html = `
        <div class="stat-card">
          <div class="stat-label">Total Users</div>
          <div class="stat-number">${stats.users || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Posts</div>
          <div class="stat-number">${stats.posts || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Comments</div>
          <div class="stat-number">${stats.comments || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Likes</div>
          <div class="stat-number">${stats.likes || 0}</div>
        </div>
      `;
      
      statsGrid.innerHTML = html;
    } catch (err) {
      console.error('Error loading stats:', err);
      statsGrid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load statistics</p></div>';
    }
  }

  // ===== USERS =====
  async function loadAllUsers() {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div>Loading users...</td></tr>';

    try {
      const users = await AdminApi.listUsers('');
      currentUsers = users;
      renderUsers(users);
    } catch (err) {
      console.error('Error loading users:', err);
      usersList.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-exclamation-circle"></i> Failed to load users</td></tr>';
    }
  }

  async function searchUsers() {
    const query = document.getElementById('user-search').value.trim();
    const usersList = document.getElementById('users-list');

    if (!query) {
      loadAllUsers();
      return;
    }

    usersList.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div>Searching...</td></tr>';

    try {
      const users = await AdminApi.listUsers(query);
      currentUsers = users;
      renderUsers(users);
    } catch (err) {
      console.error('Error searching users:', err);
      usersList.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-exclamation-circle"></i> Search failed</td></tr>';
    }
  }

  function renderUsers(users) {
    const usersList = document.getElementById('users-list');

    if (!users || users.length === 0) {
      usersList.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-inbox"></i><p>No users found</p></td></tr>';
      return;
    }

    const rows = users.map(user => {
      const createdDate = new Date(user.createdAt).toLocaleDateString();
      const statusClass = user.status ? 'status-active' : 'status-banned';
      const statusText = user.status ? 'Active' : 'Banned';
      const roleClass = user.role === 'ADMIN' ? 'role-admin' : 'role-user';
      const avatarUrl = getFullImageUrl(user.avatarUrl) || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';

      return `
        <tr>
          <td>
            <div class="user-info">
              <div class="user-avatar" style="background-image: url('${avatarUrl}')"></div>
              <div>
                <div style="font-weight: 600; color: #333;">${escapeHtml(user.userName)}</div>
              </div>
            </div>
          </td>
          <td>${escapeHtml(user.email)}</td>
          <td>
            <span class="role-badge ${roleClass}">${user.role}</span>
          </td>
          <td>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </td>
          <td>${createdDate}</td>
          <td>
            <div class="action-buttons">
              ${user.status 
                ? `<button class="btn btn-danger btn-sm" onclick="window.adminPageAPI.toggleUserStatus(${user.userId}, false)">Ban</button>`
                : `<button class="btn btn-success btn-sm" onclick="window.adminPageAPI.toggleUserStatus(${user.userId}, true)">Unban</button>`
              }
            </div>
          </td>
        </tr>
      `;
    }).join('');

    usersList.innerHTML = rows;
  }

  async function toggleUserStatus(userId, enable) {
    const action = enable ? 'Unban' : 'Ban';
    const message = enable ? 'Are you sure you want to unban this user?' : 'Are you sure you want to ban this user?';

    showConfirmModal(
      `${action} User`,
      message,
      async () => {
        try {
          if (enable) {
            await AdminApi.unbanUser(userId);
          } else {
            await AdminApi.banUser(userId);
          }
          loadAllUsers();
        } catch (err) {
          console.error('Error updating user status:', err);
          alert('Failed to update user status');
        }
      }
    );
  }

  // ===== POSTS =====
  async function loadAllPosts() {
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = '<tr><td colspan="4" class="loading"><div class="spinner"></div>Loading posts...</td></tr>';

    try {
      const posts = await AdminApi.listPosts();
      currentPosts = posts;
      renderPosts(posts);
    } catch (err) {
      console.error('Error loading posts:', err);
      postsList.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fas fa-exclamation-circle"></i> Failed to load posts</td></tr>';
    }
  }

  function renderPosts(posts) {
    const postsList = document.getElementById('posts-list');

    if (!posts || posts.length === 0) {
      postsList.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fas fa-inbox"></i><p>No posts found</p></td></tr>';
      return;
    }

    const rows = posts.map(post => {
      const createdDate = new Date(post.createdAt).toLocaleDateString();
      const content = escapeHtml(post.content || '');
      const truncatedContent = content.length > 50 ? content.substring(0, 50) + '...' : content;
      const authorAvatar = getFullImageUrl(post.authorAvatar) || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';

      return `
        <tr>
          <td>
            <div class="user-info">
              <div class="user-avatar" style="background-image: url('${authorAvatar}')"></div>
              <div>
                <div style="font-weight: 600; color: #333;">${escapeHtml(post.author || 'Unknown')}</div>
              </div>
            </div>
          </td>
          <td title="${content}"><code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">${truncatedContent}</code></td>
          <td>${createdDate}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-danger btn-sm" onclick="window.adminPageAPI.deletePost(${post.postId})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    postsList.innerHTML = rows;
  }

  async function searchPosts() {
    // For now, just load all - can be enhanced later
    loadAllPosts();
  }

  async function deletePost(postId) {
    console.log('deletePost called with:', postId);
    showConfirmModal(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      async () => {
        try {
          console.log('Calling AdminApi.deletePost with:', postId);
          await AdminApi.deletePost(postId);
          console.log('Post deleted successfully');
          loadAllPosts();
        } catch (err) {
          console.error('Error deleting post:', err);
          alert('Failed to delete post: ' + err.message);
        }
      }
    );
  }

  // ===== COMMENTS =====
  async function loadAllComments() {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = '<tr><td colspan="5" class="loading"><div class="spinner"></div>Loading comments...</td></tr>';

    try {
      const comments = await AdminApi.listComments();
      currentComments = comments;
      renderComments(comments);
    } catch (err) {
      console.error('Error loading comments:', err);
      commentsList.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-exclamation-circle"></i> Failed to load comments</td></tr>';
    }
  }

  function renderComments(comments) {
    const commentsList = document.getElementById('comments-list');

    if (!comments || comments.length === 0) {
      commentsList.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-inbox"></i><p>No comments found</p></td></tr>';
      return;
    }

    const rows = comments.map(comment => {
      const createdDate = new Date(comment.createdAt).toLocaleDateString();
      const content = escapeHtml(comment.content || '');
      const truncatedContent = content.length > 50 ? content.substring(0, 50) + '...' : content;
      const authorAvatar = getFullImageUrl(comment.authorAvatar) || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';

      return `
        <tr>
          <td>
            <div class="user-info">
              <div class="user-avatar" style="background-image: url('${authorAvatar}')"></div>
              <div>
                <div style="font-weight: 600; color: #333;">${escapeHtml(comment.author || 'Unknown')}</div>
              </div>
            </div>
          </td>
          <td title="${content}"><code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">${truncatedContent}</code></td>
          <td>#${comment.postId}</td>
          <td>${createdDate}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-danger btn-sm" onclick="window.adminPageAPI.deleteComment(${comment.commentId})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    commentsList.innerHTML = rows;
  }

  async function deleteComment(commentId) {
    console.log('deleteComment called with:', commentId);
    showConfirmModal(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      async () => {
        try {
          console.log('Calling AdminApi.deleteComment with:', commentId);
          await AdminApi.deleteComment(commentId);
          console.log('Comment deleted successfully');
          loadAllComments();
        } catch (err) {
          console.error('Error deleting comment:', err);
          alert('Failed to delete comment: ' + err.message);
        }
      }
    );
  }

  // ===== MODAL =====
  function showConfirmModal(title, message, callback) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = message;
    document.getElementById('confirm-modal').classList.add('show');
    confirmCallback = callback;
  }

  function closeModal() {
    document.getElementById('confirm-modal').classList.remove('show');
    confirmCallback = null;
  }

  async function confirmAction() {
    console.log('confirmAction() called, confirmCallback exists?', !!confirmCallback);
    const callback = confirmCallback;  // Save callback BEFORE closing modal
    closeModal();  // This sets confirmCallback = null
    if (callback) {
      console.log('Running callback');
      await callback();
    } else {
      console.warn('callback is null!');
    }
  }

  // ===== LOGOUT =====
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  }

  // ===== HELPERS =====
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // ===== EXPOSE API =====
  window.adminPageAPI = {
    toggleUserStatus,
    deletePost,
    deleteComment
  };

})();
