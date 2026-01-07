// JOIN BUTTON ACTION
document.addEventListener("click", function(e) {
    if (e.target.classList.contains("btn-join")) {

        if (e.target.classList.contains("joined")) {
            e.target.classList.remove("joined");
            e.target.textContent = "Join";
        } else {
            e.target.classList.add("joined");
            e.target.textContent = "Joined";
        }
    }
});


// CREATE NEW COMMUNITY
function createCommunity() {
    let name = document.getElementById("newCommunityName").value;
    let desc = document.getElementById("newCommunityDesc").value;

    if (name.trim() === "") {
        alert("Please enter a community name.");
        return;
    }

    let box = document.createElement("div");
    box.className = "community-item card-premium";

    box.innerHTML = `
        <img src="https://placekitten.com/300/200" class="community-cover">
        <div class="community-info">
            <div class="comm-title">${name}</div>
            <div class="comm-desc">${desc}</div>
            <div class="comm-meta">1 member</div>
        </div>
        <button class="btn-mint btn-join">Join</button>
    `;

    document.getElementById("communityList").prepend(box);

    document.getElementById("newCommunityName").value = "";
    document.getElementById("newCommunityDesc").value = "";
}
