/**
 * Settings API - Tương tác với backend settings
 */

const SettingsAPI = {
    
    /**
     * Get privacy settings
     * GET /api/settings/privacy
     */
    async getPrivacySettings() {
        try {
            const data = await api.get('/api/settings/privacy');
            return data || {};
        } catch (err) {
            console.error('Error fetching privacy settings:', err);
            return {};
        }
    },

    /**
     * Update privacy settings
     * PUT /api/settings/privacy
     */
    async updatePrivacySettings(settings) {
        try {
            console.log('Updating privacy settings:', settings);
            const result = await api.put('/api/settings/privacy', settings);
            console.log('Privacy settings updated:', result);
            return result;
        } catch (err) {
            console.error('Error updating privacy settings:', err);
            throw err;
        }
    }
};
