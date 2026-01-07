/**
 * Media API Handler
 * Handles image and video uploads, downloads, and processing
 */

const MediaAPI = {
    
    /**
     * Get base URL for API calls
     */
    getBaseUrl: function() {
        return (window.api && api.baseUrl ? api.baseUrl : (window.BACKEND_URL || 'http://localhost:8080'));
    },

    /**
     * Get authorization token
     */
    getToken: function() {
        return (window.api && api.getToken && api.getToken()) || localStorage.getItem('token');
    },

    /**
     * Validate file before upload
     * @param {File} file - File to validate
     * @param {string} fileType - 'image' or 'video'
     * @returns {Object} - {valid: boolean, error: string}
     */
    validateFile: function(file, fileType = 'image') {
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/gif'];
        const ALLOWED_VIDEOS = ['video/mp4', 'video/webm'];

        if (file.size > MAX_SIZE) {
            return {
                valid: false,
                error: `File size exceeds ${MAX_SIZE / 1024 / 1024}MB limit`
            };
        }

        const allowedTypes = fileType === 'image' ? ALLOWED_IMAGES : ALLOWED_VIDEOS;
        if (!allowedTypes.includes(file.type)) {
            const formats = fileType === 'image' ? 'JPEG, PNG, GIF' : 'MP4, WebM';
            return {
                valid: false,
                error: `Unsupported format. Allowed: ${formats}`
            };
        }

        return { valid: true };
    },

    /**
     * Convert file to Base64
     * @param {File} file - File to convert
     * @returns {Promise<string>} - Base64 encoded file data
     */
    fileToBase64: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    },

    /**
     * Convert Base64 to Blob
     * @param {string} base64Data - Base64 encoded data
     * @param {string} mimeType - MIME type (e.g., 'image/jpeg', 'video/mp4')
     * @returns {Blob} - Blob object
     */
    base64ToBlob: function(base64Data, mimeType = 'image/jpeg') {
        const bstr = atob(base64Data.split(',')[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
            u8arr[i] = bstr.charCodeAt(i);
        }
        return new Blob([u8arr], { type: mimeType });
    },

    /**
     * Split Base64 string into chunks
     * @param {string} base64Data - Base64 encoded data
     * @param {number} chunkSize - Size of each chunk in bytes
     * @returns {Array<string>} - Array of Base64 chunks
     */
    splitBase64IntoChunks: function(base64Data, chunkSize = 64 * 1024) {
        const chunks = [];
        const dataWithoutPrefix = base64Data.includes(',') ? 
            base64Data.split(',')[1] : base64Data;
        
        for (let i = 0; i < dataWithoutPrefix.length; i += chunkSize) {
            chunks.push(dataWithoutPrefix.substring(i, i + chunkSize));
        }
        return chunks;
    },

    /**
     * Upload image to server
     * @param {number} toUserId - Recipient user ID
     * @param {File} imageFile - Image file to upload
     * @returns {Promise<Object>} - Response with message data
     */
    uploadImage: async function(toUserId, imageFile) {
        const validation = this.validateFile(imageFile, 'image');
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const formData = new FormData();
        formData.append('toUserId', toUserId);
        formData.append('file', imageFile);
        formData.append('mediaType', 'image');

        try {
            const response = await fetch(
                `${this.getBaseUrl()}/api/chat/send-media`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`
                    },
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            console.error('Error uploading image:', err);
            throw err;
        }
    },

    /**
     * Upload video to server
     * @param {number} toUserId - Recipient user ID
     * @param {File} videoFile - Video file to upload
     * @returns {Promise<Object>} - Response with message data
     */
    uploadVideo: async function(toUserId, videoFile) {
        const validation = this.validateFile(videoFile, 'video');
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const formData = new FormData();
        formData.append('toUserId', toUserId);
        formData.append('file', videoFile);
        formData.append('mediaType', 'video');

        try {
            const response = await fetch(
                `${this.getBaseUrl()}/api/chat/send-media`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`
                    },
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            console.error('Error uploading video:', err);
            throw err;
        }
    },

    /**
     * Send media via WebSocket (chunked)
     * @param {WebSocket} ws - WebSocket connection
     * @param {number} toUserId - Recipient user ID
     * @param {File} file - File to send
     * @param {string} mediaType - 'image' or 'video'
     * @returns {Promise<boolean>} - Success status
     */
    sendMediaViaWebSocket: async function(ws, toUserId, file, mediaType = 'image') {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }

        try {
            const base64Data = await this.fileToBase64(file);
            const chunks = this.splitBase64IntoChunks(base64Data);
            const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            for (let i = 0; i < chunks.length; i++) {
                const payload = {
                    type: 'MEDIA_CHUNK',
                    messageId: messageId,
                    toUserId: toUserId,
                    chunk: chunks[i],
                    chunkIndex: i,
                    totalChunks: chunks.length,
                    mediaType: mediaType,
                    mimeType: file.type,
                    fileName: file.name
                };

                ws.send(JSON.stringify(payload));

                // Small delay between chunks
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            return true;
        } catch (err) {
            console.error('Error sending media via WebSocket:', err);
            throw err;
        }
    },

    /**
     * Download image from URL
     * @param {string} imageUrl - URL of the image
     * @param {string} fileName - Name for the downloaded file
     */
    downloadImage: function(imageUrl, fileName = 'image.jpg') {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * Download video from URL
     * @param {string} videoUrl - URL of the video
     * @param {string} fileName - Name for the downloaded file
     */
    downloadVideo: function(videoUrl, fileName = 'video.mp4') {
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * Get media from message
     * @param {number} messageId - Message ID
     * @returns {Promise<Blob>} - Media as Blob
     */
    getMediaFromMessage: async function(messageId) {
        try {
            const response = await fetch(
                `${this.getBaseUrl()}/api/chat/message/${messageId}/media`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.blob();
        } catch (err) {
            console.error('Error getting media:', err);
            throw err;
        }
    },

    /**
     * Delete media from message
     * @param {number} messageId - Message ID
     * @returns {Promise<Object>} - Response
     */
    deleteMedia: async function(messageId) {
        try {
            const response = await fetch(
                `${this.getBaseUrl()}/api/chat/message/${messageId}/media`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            console.error('Error deleting media:', err);
            throw err;
        }
    },

    /**
     * Get thumbnail for video
     * @param {File} videoFile - Video file
     * @param {number} atTime - Time in seconds (default: 0)
     * @returns {Promise<string>} - Base64 thumbnail data URL
     */
    getVideoThumbnail: function(videoFile, atTime = 0) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            video.src = URL.createObjectURL(videoFile);
            video.onloadedmetadata = () => {
                video.currentTime = atTime;
            };

            video.onseeked = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);
                
                canvas.toBlob((blob) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                });

                URL.revokeObjectURL(video.src);
            };

            video.onerror = reject;
        });
    },

    /**
     * Compress image before upload
     * @param {File} imageFile - Image file
     * @param {number} quality - JPEG quality (0-1)
     * @returns {Promise<Blob>} - Compressed image blob
     */
    compressImage: function(imageFile, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.src = URL.createObjectURL(imageFile);
            img.onload = () => {
                // Calculate new dimensions if needed
                let width = img.width;
                let height = img.height;
                const maxWidth = 1920;
                const maxHeight = 1080;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                    URL.revokeObjectURL(img.src);
                }, 'image/jpeg', quality);
            };

            img.onerror = reject;
        });
    }
};
