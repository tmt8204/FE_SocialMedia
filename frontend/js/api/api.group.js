/**
 * Group Chat API
 */

const GroupAPI = {
    baseUrl: (window.api && api.baseUrl) || (window.BACKEND_URL || 'http://localhost:8080'),

    /**
     * Get auth token
     */
    getToken() {
        return (window.api && api.getToken && api.getToken()) || localStorage.getItem('token');
    },

    /**
     * Get headers with auth
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this.getToken()
        };
    },

    /**
     * Create new group
     */
    async createGroup(groupName, description = '', avatarUrl = null) {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/group/create' : 
            this.baseUrl + '/api/chat/group/create';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                groupName,
                description,
                avatarUrl
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    /**
     * Get all groups of current user
     */
    async getUserGroups() {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/groups' : 
            this.baseUrl + '/api/chat/groups';

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    /**
     * Get group info
     */
    async getGroup(groupId) {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/group/' + groupId : 
            this.baseUrl + '/api/chat/group/' + groupId;

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    /**
     * Get group members
     */
    async getGroupMembers(groupId) {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/group/' + groupId + '/members' : 
            this.baseUrl + '/api/chat/group/' + groupId + '/members';

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    /**
     * Add member to group
     */
    async addMember(groupId, userId) {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/group/' + groupId + '/members' : 
            this.baseUrl + '/api/chat/group/' + groupId + '/members';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ userId })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    /**
     * Remove member from group
     */
    async removeMember(groupId, memberId) {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/group/' + groupId + '/members/' + memberId : 
            this.baseUrl + '/api/chat/group/' + groupId + '/members/' + memberId;

        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: this.getHeaders()
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    /**
     * Send message to group
     */
    async sendGroupMessage(groupId, content) {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/group/' + groupId + '/send' : 
            this.baseUrl + '/api/chat/group/' + groupId + '/send';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ content })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    /**
     * Get group messages
     */
    async getGroupMessages(groupId, page = 0, pageSize = 50) {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/group/' + groupId + '/messages?page=' + page + '&pageSize=' + pageSize : 
            this.baseUrl + '/api/chat/group/' + groupId + '/messages?page=' + page + '&pageSize=' + pageSize;

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    /**
     * Update group info
     */
    async updateGroup(groupId, groupName = null, description = null, avatarUrl = null) {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/group/' + groupId : 
            this.baseUrl + '/api/chat/group/' + groupId;

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({
                groupName,
                description,
                avatarUrl
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    /**
     * Delete group
     */
    async deleteGroup(groupId) {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/group/' + groupId : 
            this.baseUrl + '/api/chat/group/' + groupId;

        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: this.getHeaders()
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    /**
     * Mark group as read (reset unread count)
     */
    async markGroupAsRead(groupId) {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/group/' + groupId + '/mark-read' : 
            this.baseUrl + '/api/chat/group/' + groupId + '/mark-read';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: this.getHeaders()
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    /**
     * Mark individual group message as read
     */
    async markGroupMessageAsRead(messageId) {
        const endpoint = this.baseUrl.endsWith('/') ? 
            this.baseUrl + 'api/chat/group/message/' + messageId + '/mark-read' : 
            this.baseUrl + '/api/chat/group/message/' + messageId + '/mark-read';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: this.getHeaders()
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }
};
