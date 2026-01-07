// Shared toast notification for auth pages (login & register)
function showToast(message, type = 'success') {
  console.log("showToast called:", message, type);
  
  // Create container if not exists
  let container = document.getElementById('toastContainer');
  if (!container) {
    console.log("Creating toast container");
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.insertBefore(container, document.body.firstChild);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type === 'success' ? '✓' : '✕'}</div>
    <div class="toast-message">${message}</div>
  `;
  container.appendChild(toast);
  console.log("Toast appended to container");

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Verify function loaded
console.log("auth-shared.js loaded, showToast defined:", typeof showToast);
