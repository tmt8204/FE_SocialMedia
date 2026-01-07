(function(global) {
  // WebSocket connection for real-time friend notifications
  let ws = null;
  const reconnectAttempts = 3;
  let reconnectCount = 0;

  const FriendWS = {
    /**
     * Kết nối tới WebSocket server
     */
    connect() {
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('FriendWS already connected');
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        try {
          const token = (window.api && api.getToken && api.getToken()) || localStorage.getItem('token');
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          let backendHost = window.location.host;
          if (window.BACKEND_URL) {
            try { backendHost = new URL(window.BACKEND_URL).host; } catch {}
          }
          const url = `${protocol}//${backendHost}/ws/friends${token ? `?token=${encodeURIComponent(token)}` : ''}`;
          ws = new WebSocket(url);

          ws.onopen = () => {
            console.log('FriendWS connected');
            reconnectCount = 0;
            resolve();
          };

          ws.onerror = (err) => {
            console.error('FriendWS error:', err);
            reject(err);
          };

          ws.onclose = () => {
            console.log('FriendWS disconnected');
            FriendWS.reconnect();
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              FriendWS.handleMessage(data);
            } catch (e) {
              console.error('FriendWS parse error:', e);
            }
          };
        } catch (e) {
          reject(e);
        }
      });
    },

    /**
     * Xử lý các message từ server
     */
    handleMessage(data) {
      const type = data.type;
      console.log('FriendWS message:', data);

      switch (type) {
        case 'friend_request_received':
          FriendWS.onFriendRequestReceived(data);
          break;
        case 'friend_request_accepted':
          FriendWS.onFriendRequestAccepted(data);
          break;
        case 'friend_removed':
          FriendWS.onFriendRemoved(data);
          // If chat page defines a hook, notify it
          if (window.ChatPage && typeof window.ChatPage.onFriendRemoved === 'function') {
            window.ChatPage.onFriendRemoved(data);
          }
          break;
        default:
          console.log('Unknown FriendWS event type:', type);
      }
    },

    /**
     * Callback khi nhận được lời mời kết bạn
     */
    onFriendRequestReceived(data) {
      // Reload danh sách lời mời
      if (window.FriendsPage && window.FriendsPage.loadPendingRequests) {
        window.FriendsPage.loadPendingRequests();
      }

      // Hiển thị notification
      if (Notification.permission === 'granted') {
        new Notification('Lời mời kết bạn', {
          body: data.message || `${data.senderName} gửi cho bạn một lời mời kết bạn`,
          icon: api.getAvatarUrl(data.senderAvatar)
        });
      }
    },

    /**
     * Callback khi lời mời được chấp nhận
     */
    onFriendRequestAccepted(data) {
      // Reload danh sách bạn bè
      if (window.FriendsPage && window.FriendsPage.loadFriendsList) {
        window.FriendsPage.loadFriendsList();
      }

      // Reload danh sách gợi ý
      if (window.FriendsPage && window.FriendsPage.loadSuggestions) {
        window.FriendsPage.loadSuggestions();
      }

      // Hiển thị notification
      if (Notification.permission === 'granted') {
        new Notification('Kết bạn thành công', {
          body: data.message || `${data.userName} đã chấp nhận lời mời kết bạn của bạn`,
          icon: api.getAvatarUrl(data.userAvatar)
        });
      }
    },

    /**
     * Callback khi bạn bè bị xóa
     */
    onFriendRemoved(data) {
      // Reload danh sách bạn bè
      if (window.FriendsPage && window.FriendsPage.loadFriendsList) {
        window.FriendsPage.loadFriendsList();
      }

      // Reload danh sách gợi ý
      if (window.FriendsPage && window.FriendsPage.loadSuggestions) {
        window.FriendsPage.loadSuggestions();
      }
    },

    /**
     * Reconnect với backoff
     */
    reconnect() {
      if (reconnectCount < reconnectAttempts) {
        const delay = Math.pow(2, reconnectCount) * 1000; // exponential backoff
        console.log(`Attempting to reconnect FriendWS in ${delay}ms...`);
        setTimeout(() => {
          reconnectCount++;
          FriendWS.connect().catch(err => {
            console.error('FriendWS reconnect failed:', err);
          });
        }, delay);
      } else {
        console.error('FriendWS reconnect attempts exhausted');
      }
    },

    /**
     * Đóng kết nối
     */
    disconnect() {
      if (ws) {
        ws.close();
        ws = null;
      }
    }
  };

  // Request notification permission
  if (window.Notification && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Expose to global scope
  global.friendWS = FriendWS;

})(window);
