// friends.js - Page controller for friends.html
(function() {
  'use strict';

  // Helper to get full image URL
    function getFullImageUrl(imageUrl) {
      const fallback = getDefaultAvatarUrl();
      if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') return fallback;
      
      // Already a full URL
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }
      
      // Relative path - prepend backend URL
      if (imageUrl.startsWith('/uploads/')) {
        const backendUrl = (typeof api !== 'undefined' && api.baseUrl) ? api.baseUrl : 'http://localhost:8080';
        return backendUrl + imageUrl;
      }

      // If looks like a bare id or invalid path, fall back
      if (!imageUrl.includes('/') && !imageUrl.includes('.')) {
        return fallback;
      }
      
      return imageUrl;
    }

  let currentUser = null;

  async function init() {
    try {
      // Lấy thông tin user hiện tại
      currentUser = await api.users.getMe();
      
      // Load dữ liệu từ backend
      await Promise.all([
        loadPendingRequests(),
        loadSuggestions(),
        loadFriendsList()
      ]);
    } catch (err) {
      console.error('Error initializing friends page:', err);
      alert('Lỗi khi tải trang: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Load danh sách lời mời kết bạn đang chờ
   */
  async function loadPendingRequests() {
    try {
      const requests = await api.friends.getPendingRequests();
      console.log('Pending requests:', requests);
      renderPendingRequests(requests);
    } catch (err) {
      console.error('Error loading pending requests:', err);
    }
  }

  /**
   * Load danh sách gợi ý kết bạn
   */
  async function loadSuggestions() {
    try {
      const suggestions = await api.friends.getSuggestions(10);
      console.log('Suggestions:', suggestions);
      renderSuggestions(suggestions);
    } catch (err) {
      console.error('Error loading suggestions:', err);
    }
  }

  /**
   * Render danh sách lời mời kết bạn
   */
  function renderPendingRequests(requests) {
    const container = document.querySelector('#pending-requests-container');
    if (!container) return;

    if (requests.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">Không có lời mời kết bạn nào</p>';
      return;
    }

    container.innerHTML = requests.map(req => `
      <div class="friend-item" data-user-id="${req.userId}">
        <img src="${getFullImageUrl(req.avatarUrl)}" 
             class="friend-avatar" 
             alt="${req.displayName || req.username}">
        <div class="friend-info">
          <div class="friend-name">${req.displayName || req.username}</div>
          <div class="mutual">${req.mutualFriends} bạn chung</div>
          
          <button class="friend-btn btn-confirm" onclick="FriendsPage.acceptRequest(${req.userId})">
            Chấp nhận
          </button>
          <button class="friend-btn btn-delete" onclick="FriendsPage.rejectRequest(${req.userId})">
            Từ chối
          </button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render danh sách gợi ý kết bạn
   */
  async function renderSuggestions(suggestions) {
    const container = document.querySelector('#suggestions-container');
    if (!container) return;

    if (suggestions.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">Không có gợi ý nào</p>';
      return;
    }

    // Load status for each user
    const suggestionsWithStatus = await Promise.all(
      suggestions.map(async (user) => {
        try {
          const statusResponse = await api.friends.getFriendshipStatus(user.userId);
          return { ...user, status: statusResponse.status };
        } catch (err) {
          console.error(`Error loading status for user ${user.userId}:`, err);
          return { ...user, status: 'none' };
        }
      })
    );

    container.innerHTML = suggestionsWithStatus.map(user => {
      let buttonHtml = '';
      if (user.status === 'none') {
        buttonHtml = `<button class="friend-btn btn-add" onclick="FriendsPage.sendRequest(${user.userId})">Thêm bạn bè</button>`;
      } else if (user.status === 'pending_sent') {
        buttonHtml = `<button class="friend-btn btn-delete" onclick="FriendsPage.cancelRequest(${user.userId})">Hủy lời mời</button>`;
      } else if (user.status === 'friends') {
        buttonHtml = `<button class="friend-btn btn-delete" onclick="FriendsPage.removeFriendFromSuggestions(${user.userId})">Hủy kết bạn</button>`;
      } else if (user.status === 'pending_received') {
        buttonHtml = `<button class="friend-btn btn-confirm" onclick="FriendsPage.acceptRequest(${user.userId})">Chấp nhận</button>`;
      }

      return `
        <div class="friend-item" data-user-id="${user.userId}">
          <img src="${getFullImageUrl(user.avatarUrl)}" 
               class="friend-avatar" 
               alt="${user.displayName || user.username}">
          <div class="friend-info">
            <div class="friend-name">${user.displayName || user.username}</div>
            <div class="mutual">${user.mutualFriends} bạn chung</div>
            ${buttonHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Load danh sách bạn bè
   */
  async function loadFriendsList() {
    try {
      const friends = await api.friends.getFriendsList();
      console.log('Friends list:', friends);
      renderFriendsList(friends);
    } catch (err) {
      console.error('Error loading friends list:', err);
    }
  }

  /**
   * Render danh sách bạn bè (hiển thị ở sidebar)
   */
  function renderFriendsList(friends) {
    const container = document.querySelector('#friends-list-container');
    if (!container) return;

    if (friends.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">Chưa có bạn bè nào</p>';
      return;
    }

    container.innerHTML = friends.map(friend => `
      <div class="friend-item" style="padding: 8px; margin-bottom: 10px;">
        <img src="${getFullImageUrl(friend.avatarUrl)}" 
             class="friend-avatar" 
             style="width: 50px; height: 50px;"
             alt="${friend.displayName || friend.username}">
        <div class="friend-info" style="font-size: 13px; flex: 1;">
          <div class="friend-name" style="font-size: 13px; margin-bottom: 2px;">${friend.displayName || friend.username}</div>
          <button class="friend-btn btn-delete" style="padding: 4px 8px; font-size: 12px;" onclick="FriendsPage.removeFriend(${friend.userId})">Hủy kết bạn</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Chấp nhận lời mời kết bạn
   */
  async function acceptRequest(userId) {
    try {
      const result = await api.friends.acceptFriendRequest(userId);
      if (result.success) {
        alert(result.message || 'Đã chấp nhận lời mời kết bạn');
        // Reload lại danh sách
        await Promise.all([
          loadPendingRequests(),
          loadFriendsList()
        ]);
      } else {
        alert(result.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error('Error accepting friend request:', err);
      alert('Lỗi: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Từ chối lời mời kết bạn
   */
  async function rejectRequest(userId) {
    try {
      const result = await api.friends.rejectFriendRequest(userId);
      if (result.success) {
        alert(result.message || 'Đã từ chối lời mời kết bạn');
        // Reload lại danh sách
        await loadPendingRequests();
      } else {
        alert(result.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      alert('Lỗi: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Gửi lời mời kết bạn
   */
  async function sendRequest(userId) {
    try {
      const result = await api.friends.sendFriendRequest(userId);
      if (result.success) {
        alert(result.message || 'Đã gửi lời mời kết bạn');
        // Reload lại danh sách gợi ý
        await loadSuggestions();
      } else {
        alert(result.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      alert('Lỗi: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Hủy lời mời kết bạn đã gửi
   */
  async function cancelRequest(userId) {
    try {
      // Hủy lời mời = từ chối lời mời nhưng đối với người gửi
      // API rejectFriendRequest sẽ không dùng được ở đây vì nó dành cho người nhận
      // Thay vào đó ta sẽ xóa bạn bè (vì lúc này chưa là bạn thật sự)
      const result = await api.friends.removeFriend(userId);
      if (result.success) {
        alert('Đã hủy lời mời kết bạn');
        // Reload lại danh sách gợi ý
        await loadSuggestions();
      } else {
        alert(result.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error('Error canceling friend request:', err);
      alert('Lỗi: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Hủy kết bạn từ danh sách gợi ý
   */
  async function removeFriendFromSuggestions(userId) {
    if (!confirm('Bạn chắc chắn muốn hủy kết bạn?')) return;
    
    try {
      const result = await api.friends.removeFriend(userId);
      if (result.success) {
        alert(result.message || 'Đã hủy kết bạn');
        // Reload lại danh sách
        await Promise.all([
          loadSuggestions(),
          loadFriendsList()
        ]);
      } else {
        alert(result.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      alert('Lỗi: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Hủy kết bạn từ danh sách bạn bè
   */
  async function removeFriend(userId) {
    if (!confirm('Bạn chắc chắn muốn hủy kết bạn?')) return;
    
    try {
      const result = await api.friends.removeFriend(userId);
      if (result.success) {
        alert(result.message || 'Đã hủy kết bạn');
        // Reload lại danh sách
        await Promise.all([
          loadFriendsList(),
          loadSuggestions()
        ]);
      } else {
        alert(result.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      alert('Lỗi: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Gửi lời mời kết bạn (cũ - sẽ thay thế)
   */
  async function sendRequest(userId) {
    try {
      const result = await api.friends.sendFriendRequest(userId);
      if (result.success) {
        alert(result.message || 'Đã gửi lời mời kết bạn');
        // Reload lại danh sách gợi ý
        await loadSuggestions();
      } else {
        alert(result.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      alert('Lỗi: ' + (err.message || 'Unknown error'));
    }
  }

  // Export functions to global scope
  window.FriendsPage = {
    init,
    acceptRequest,
    rejectRequest,
    sendRequest,
    cancelRequest,
    removeFriend,
    removeFriendFromSuggestions,
    loadPendingRequests,
    loadSuggestions,
    loadFriendsList
  };

  // Auto-init khi DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
