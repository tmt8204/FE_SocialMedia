// Reaction logic for feed

export function reactionEmoji(type) {
    switch(type) {
        case "like": return "👍";
        case "love": return "❤️";
        case "haha": return "😆";
        case "wow":  return "😮";
        case "sad":  return "😢";
        case "angry":return "😡";
        default:     return "👍";
    }
}

export function renderReactionText(post) {
    if (post.reaction === "none") return "👍 Like";
    return reactionEmoji(post.reaction);
}
