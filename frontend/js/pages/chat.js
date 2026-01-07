// Kết nối WebSocket (nhớ backend phải có endpoint /chat)
let socket = new WebSocket("ws://localhost:8080/chat");

socket.onopen = () => {
  console.log("Đã kết nối WebSocket!");
};

socket.onmessage = event => {
  let msg = JSON.parse(event.data);
  let box = document.getElementById("messages");
  box.innerHTML += `<p><b>${msg.sender}:</b> ${msg.text}</p>`;
};

function sendMsg() {
  let text = document.getElementById("msg").value;
  socket.send(JSON.stringify({ text }));
  document.getElementById("msg").value = "";
}
// LẤY LỊCH SỬ CHAT VỚI AI ĐÓ
function getChatHistory(name) {
    return JSON.parse(localStorage.getItem("chat_history_" + name)) || [];
}

// LƯU LỊCH SỬ CHAT
function saveChatMessage(name, from, avatar, text) {
    let history = getChatHistory(name);

    history.push({
        from: from,
        avatar: avatar,
        text: text,
        time: new Date().toISOString()
    });

    localStorage.setItem("chat_history_" + name, JSON.stringify(history));
}
function openConversation(name, avatar) {
    const header = document.getElementById("chatHeaderName");
    const chatImg = document.getElementById("chatHeaderAvatar");
    const box = document.getElementById("chatMessages");

    header.innerText = name;
    chatImg.src = avatar;

    let history = getChatHistory(name);

    box.innerHTML = history.map(msg => `
        <div class="msg-${msg.from === currentUser.name ? "me" : "other"}">
            ${msg.text}
        </div>
    `).join("");

    box.scrollTop = box.scrollHeight;
}
