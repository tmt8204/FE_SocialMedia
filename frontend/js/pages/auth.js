// ĐĂNG NHẬP
document.getElementById("loginForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  e.stopPropagation();
  
  console.log("Login form submitted");

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  if (!usernameInput?.value || !passwordInput?.value) {
    console.log("Missing username or password");
    if (typeof showToast === 'function') {
      showToast("Vui lòng nhập tài khoản và mật khẩu!", "error");
    } else {
      alert("Vui lòng nhập tài khoản và mật khẩu!");
    }
    return false;
  }

  try {
    console.log("Attempting login...");
    const data = await api.post('/api/auth/login', {
      username: usernameInput.value,
      password: passwordInput.value
    });

    console.log("Login response:", data);

    if (data && data.token) {
      api.setToken(data.token);
      
      // Save user info including role
      if (data.userId) {
        localStorage.setItem('user', JSON.stringify({
          userId: data.userId,
          userName: data.userName,
          email: data.email,
          avatarUrl: data.avatarUrl,
          role: data.role || 'USER'
        }));
      }
      
      if (typeof showToast === 'function') {
        showToast("Đăng nhập thành công!", "success");
      } else {
        alert("Đăng nhập thành công!");
      }
      setTimeout(() => {
        window.location.href = "feed.html";
      }, 1500);
    } else {
      console.log("No token in response");
      if (typeof showToast === 'function') {
        showToast("Sai tài khoản hoặc mật khẩu!", "error");
      } else {
        alert("Sai tài khoản hoặc mật khẩu!");
      }
    }
  } catch (err) {
    console.error("Login error:", err);
    const errorMsg = err?.body?.error || err?.body?.message || err?.message || 'Đăng nhập thất bại!';
    console.log("Error message:", errorMsg);
    
    if (typeof showToast === 'function') {
      showToast(errorMsg, "error");
    } else {
      alert(errorMsg);
    }
  }
  
  return false;
});

// ĐĂNG KÝ
document.getElementById("registerForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  e.stopPropagation();

  const emailInput = document.getElementById('reg_email');
  const passwordInput = document.getElementById('reg_password');

  if (!emailInput?.value || !passwordInput?.value) {
    showToast("Vui lòng nhập email và mật khẩu!", "error");
    return false;
  }

  try {
    await api.post('/api/auth/register', {
      username: emailInput.value,
      password: passwordInput.value,
      email: emailInput.value
    });

    showToast("Đăng ký thành công!", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (err) {
    console.error("Register error:", err);
    const errorMsg = err?.body?.error || err?.body?.message || 'Đăng ký thất bại!';
    showToast(errorMsg, "error");
  }
  
  return false;
});
