// UI helpers for feed

export function updatePostReactionUI(posts, id, reactionEmoji) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const card = document.getElementById('post_card_' + id);
    if (!card) return;
    // Cập nhật nút like
    const btn = card.querySelector('.post-btn');
    if (btn) {
        btn.classList.toggle('liked', post.reaction !== 'none');
        btn.innerHTML = (post.reaction === 'none'
            ? `<i class='fa-regular fa-thumbs-up'></i> Like`
            : `${reactionEmoji(post.reaction)}`
        ) + (typeof post.likes === 'number' && post.likes > 0 ? ` ${post.likes}` : '');
    }
}
