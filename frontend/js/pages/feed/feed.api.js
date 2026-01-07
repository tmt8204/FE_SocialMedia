// API functions for feed (load, create, react, comment, delete)

export async function loadFeedFromBackend(api, savePosts, renderPosts) {
    try {
        const list = await api.get('/api/posts/feed');
        if (Array.isArray(list)) {
            // Lấy reaction của user hiện tại cho từng post
            const posts = await Promise.all(list.map(async p => {
                const postId = p.postId || p.id;
                let reaction = 'none';
                try {
                    const resp = await api.get(`/api/posts/${postId}/reactions/me`);
                    if (resp && resp.type) reaction = resp.type;
                } catch (e) {}
                return {
                    id: 'post-' + (postId || crypto.randomUUID()),
                    user: (p.user && p.user.userName) || p.userName || 'Unknown',
                    avatar: (p.user && p.user.avatarUrl) || p.avatarUrl || ('https://i.pravatar.cc/100?u=' + ((p.user && p.user.userId) || p.userId || 'anon')),
                    content: p.content || '',
                    image: p.imageUrl || p.image || null,
                    privacy: p.privacy || 'public',
                    time: p.createdAt || p.time || new Date().toISOString(),
                    authorId: (p.user && p.user.userId) || p.userId || null,
                    likes: Number(p.likeCount) || 0,
                    reaction,
                    comments: [],
                    commentCount: Number(p.commentCount) || 0,
                    shares: Number(p.shares) || 0
                };
            }));
            savePosts(posts);
            renderPosts();
            return posts;
        }
    } catch (err) {
        console.warn('Could not load feed from backend:', err);
    }
    return null;
}

export async function createPost(api, payload) {
    return api.post('/api/posts', payload);
}

export async function deletePost(api, num) {
    return api.del(`/api/posts/${num}`);
}

export async function reactPost(api, num, type) {
    return api.post(`/api/posts/${num}/react?type=${encodeURIComponent(type)}`);
}

export async function unreactPost(api, num) {
    return api.del(`/api/posts/${num}/react`);
}

export async function getReactionCount(api, num, type) {
    return api.get(`/api/posts/${num}/reactions/count/${type}`);
}
