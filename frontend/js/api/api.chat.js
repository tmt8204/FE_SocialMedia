/**
 * Chat API - Tương tác với backend MessageService
 */

const ChatAPI = {
    
    /**
     * Lấy lịch sử chat với một người
     * GET /api/messages/with/{otherId}
     */
    async getConversation(userId) {
        try {
            const data = await api.get(`/api/messages/with/${userId}`);
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('Error fetching conversation:', err);
            return [];
        }
    },

    /**
     * Gửi tin nhắn qua REST API
     * POST /api/messages/to/{otherId}
     */
    async sendMessage(toUserId, content, imageUrl = '', videoUrl = '') {
        const body = {
            content: content || '',
            imageUrl: imageUrl || '',
            videoUrl: videoUrl || ''
        };
        try {
            return await api.post(`/api/messages/to/${toUserId}`, body);
        } catch (err) {
            console.error('Error sending message:', err);
            throw err;
        }
    },

    /**
     * Đánh dấu tin nhắn đã đọc
     * PUT /api/messages/{id}/read (single message)
     * PUT /api/messages/mark-read-from/{userId} (all messages from user)
     */
    async markRead(idOrUserId) {
        try {
            console.log('ChatAPI.markRead called with:', idOrUserId);
            const url = `/api/messages/mark-read-from/${idOrUserId}`;
            console.log('Calling PUT:', url);
            const result = await api.put(url);
            console.log('markRead response:', result);
            return result;
        } catch (err) {
            console.error('Error marking message as read:', err);
            throw err;
        }
    },

    /**
     * Đánh dấu một tin nhắn cụ thể đã đọc
     * PUT /api/messages/{id}/read
     */
    async markSingleRead(messageId) {
        try {
            return await api.put(`/api/messages/${messageId}/read`);
        } catch (err) {
            console.error('Error marking single message as read:', err);
        }
    },

    /**
     * Đếm tin nhắn chưa đọc
     * GET /api/messages/unread-count
     */
    async getUnreadCount() {
        try {
            const data = await api.get('/api/messages/unread-count');
            return typeof data?.unread === 'number' ? data.unread : 0;
        } catch (err) {
            console.error('Error fetching unread count:', err);
            return 0;
        }
    }
};
