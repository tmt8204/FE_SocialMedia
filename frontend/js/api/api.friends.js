(function(global){
  // api.friends.js
  // API wrapper for /api/friends endpoints

  const Friends = {
    /**
     * Lấy danh sách lời mời kết bạn đang chờ
     */
    async getPendingRequests() {
      return global.api.get('/api/friends/requests/pending');
    },

    /**
     * Lấy danh sách bạn bè
     */
    async getFriendsList() {
      return global.api.get('/api/friends/list');
    },

    /**
     * Lấy gợi ý kết bạn
     */
    async getSuggestions(limit = 10) {
      return global.api.get(`/api/friends/suggestions?limit=${limit}`);
    },

    /**
     * Gửi lời mời kết bạn
     */
    async sendFriendRequest(targetUserId) {
      return global.api.post(`/api/friends/send/${targetUserId}`);
    },

    /**
     * Chấp nhận lời mời kết bạn
     */
    async acceptFriendRequest(requestFromUserId) {
      return global.api.post(`/api/friends/${requestFromUserId}/accept`);
    },

    /**
     * Từ chối lời mời kết bạn
     */
    async rejectFriendRequest(requestFromUserId) {
      return global.api.post(`/api/friends/${requestFromUserId}/reject`);
    },

    /**
     * Xóa bạn bè
     */
    async removeFriend(friendUserId) {
      return global.api.del(`/api/friends/${friendUserId}`);
    },

    /**
     * Block user
     */
    async blockUser(targetUserId) {
      return global.api.post(`/api/friends/${targetUserId}/block`);
    },

    /**
     * Kiểm tra trạng thái bạn bè
     */
    async getFriendshipStatus(targetUserId) {
      return global.api.get(`/api/friends/${targetUserId}/status`);
    }
  };

  global.api = Object.assign(global.api || {}, { friends: Friends });
})(window);
