(function(global){
  // api.users.js
  // Các helper gọi endpoint /api/profile

  const Users = {
    async getMe(){
      return global.api.get('/api/profile/me');
    },

    async getById(userId){
      return global.api.get('/api/profile/' + userId);
    },

    async updateMe(body){
      return global.api.put('/api/profile/me', body);
    },

    async changePassword(currentPassword, newPassword){
      return global.api.put('/api/profile/me/password', { currentPassword, newPassword });
    }
  };

  global.api = Object.assign(global.api || {}, { users: Users });
})(window);
