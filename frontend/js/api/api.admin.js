// api.admin.js
// Admin API client

(function (global) {
  console.log('api.admin.js loading...');
  
  const AdminApi = {
    
    // ===== STATS =====
    async getStats() {
      console.log('AdminApi.getStats() called');
      return api.get('/api/admin/stats');
    },

    // ===== USERS =====
    async listUsers(query = '') {
      console.log('AdminApi.listUsers() called with query:', query);
      return api.get('/api/admin/users', { q: query });
    },

    async banUser(userId) {
      console.log('AdminApi.banUser() called with userId:', userId);
      return api.put(`/api/admin/users/${userId}/ban`);
    },

    async unbanUser(userId) {
      console.log('AdminApi.unbanUser() called with userId:', userId);
      return api.put(`/api/admin/users/${userId}/unban`);
    },

    // ===== POSTS =====
    async listPosts() {
      console.log('AdminApi.listPosts() called');
      return api.get('/api/admin/posts');
    },

    async deletePost(postId) {
      console.log('AdminApi.deletePost() called with postId:', postId);
      const url = `/api/admin/posts/${postId}`;
      console.log('Making DELETE request to:', url);
      return api.del(url);
    },

    // ===== COMMENTS =====
    async listComments() {
      console.log('AdminApi.listComments() called');
      return api.get('/api/admin/comments');
    },

    async deleteComment(commentId) {
      console.log('AdminApi.deleteComment() called with commentId:', commentId);
      const url = `/api/admin/comments/${commentId}`;
      console.log('Making DELETE request to:', url);
      return api.del(url);
    }
  };

  console.log('AdminApi object created:', AdminApi);
  global.AdminApi = AdminApi;
  console.log('AdminApi exposed globally');
})(window);
