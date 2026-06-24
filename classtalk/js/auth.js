// ====================================
// 课通 · ClassTalk - 登录/注册模块
// ====================================

(function() {
  'use strict';

  // 当前登录用户（内存+localStorage双存储）
  let currentUser = null;

  // ==========================================
  // 初始化：恢复登录状态 + 注入弹窗HTML
  // ==========================================
  function initAuth() {
    injectAuthStyles();
    injectAuthModals();
    bindNavButtons();
    restoreSession();
  }

  // ==========================================
  // 注入CSS
  // ==========================================
  function injectAuthStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ===== 导航栏登录/注册按钮 ===== */
      .btn-login {
        padding: 6px 16px;
        background: transparent;
        border: 1.5px solid #fff;
        border-radius: 20px;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        margin-right: 6px;
      }
      .btn-login:hover { background: rgba(255,255,255,0.2); }

      .btn-register {
        padding: 6px 16px;
        background: #fff;
        border: none;
        border-radius: 20px;
        color: #667eea;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-register:hover { background: #f0f0ff; }

      /* ===== 已登录状态 ===== */
      .user-avatar-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px 4px 4px;
        background: rgba(255,255,255,0.2);
        border: none;
        border-radius: 20px;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .user-avatar-btn:hover { background: rgba(255,255,255,0.3); }
      .user-avatar-icon {
        width: 28px; height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, #f093fb, #f5a623);
        display: flex; align-items: center; justify-content: center;
        font-size: 15px;
        font-weight: 700;
        color: #fff;
      }

      /* ===== 遮罩层 ===== */
      .auth-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        animation: authFadeIn 0.2s ease;
      }
      @keyframes authFadeIn {
        from { opacity: 0; } to { opacity: 1; }
      }

      /* ===== 弹窗卡片 ===== */
      .auth-card {
        background: #fff;
        border-radius: 20px;
        padding: 40px 36px;
        width: 380px;
        max-width: 92vw;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        animation: authSlideUp 0.3s ease;
        position: relative;
      }
      @keyframes authSlideUp {
        from { opacity: 0; transform: translateY(30px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .auth-card-close {
        position: absolute; top: 16px; right: 20px;
        background: none; border: none;
        font-size: 22px; color: #aaa; cursor: pointer; line-height: 1;
      }
      .auth-card-close:hover { color: #555; }

      .auth-card-logo {
        text-align: center; margin-bottom: 8px; font-size: 36px;
      }
      .auth-card-title {
        text-align: center; font-size: 22px; font-weight: 700;
        color: #333; margin: 0 0 4px;
      }
      .auth-card-sub {
        text-align: center; font-size: 13px; color: #999; margin: 0 0 28px;
      }

      .auth-input-group { margin-bottom: 16px; }
      .auth-input-group label {
        display: block; font-size: 13px; font-weight: 600;
        color: #555; margin-bottom: 6px;
      }
      .auth-input-group input {
        width: 100%; padding: 11px 14px;
        border: 1.5px solid #e0e0e0;
        border-radius: 10px; font-size: 14px;
        outline: none; transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .auth-input-group input:focus { border-color: #667eea; }
      .auth-input-group input.input-error { border-color: #e74c3c; }

      .auth-error-msg {
        color: #e74c3c; font-size: 13px; margin: -8px 0 12px;
        display: none;
      }

      .auth-submit-btn {
        width: 100%; padding: 13px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border: none; border-radius: 10px;
        color: #fff; font-size: 15px; font-weight: 600;
        cursor: pointer; transition: opacity 0.2s;
        margin-top: 4px;
      }
      .auth-submit-btn:hover { opacity: 0.9; }
      .auth-submit-btn:disabled { opacity: 0.6; cursor: default; }

      .auth-switch-text {
        text-align: center; font-size: 13px; color: #999; margin-top: 20px;
      }
      .auth-switch-link {
        color: #667eea; cursor: pointer; font-weight: 600;
        text-decoration: none;
      }
      .auth-switch-link:hover { text-decoration: underline; }

      /* ===== 用户菜单下拉 ===== */
      .user-dropdown {
        position: absolute; top: 100%; right: 0;
        margin-top: 8px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        min-width: 160px;
        padding: 8px 0;
        z-index: 9999;
        animation: authFadeIn 0.15s ease;
      }
      .user-dropdown-item {
        display: block; width: 100%;
        padding: 10px 18px;
        background: none; border: none;
        font-size: 14px; color: #333;
        text-align: left; cursor: pointer;
        transition: background 0.15s;
      }
      .user-dropdown-item:hover { background: #f5f5f5; }
      .user-dropdown-item.danger { color: #e74c3c; }
      .user-dropdown-item.danger:hover { background: #fff0f0; }

      .nav-user-wrapper { position: relative; display: inline-block; }

      /* ===== 个人信息弹窗 ===== */
      .profile-card {
        background: #fff;
        border-radius: 20px;
        padding: 36px;
        width: 420px;
        max-width: 92vw;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        animation: authSlideUp 0.3s ease;
        position: relative;
      }
      .profile-avatar-large {
        width: 64px; height: 64px;
        border-radius: 50%;
        background: linear-gradient(135deg, #f093fb, #f5a623);
        display: flex; align-items: center; justify-content: center;
        font-size: 28px; font-weight: 700; color: #fff;
        margin: 0 auto 12px;
      }
      .profile-info-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 0; border-bottom: 1px solid #f0f0f0;
      }
      .profile-info-row:last-child { border-bottom: none; }
      .profile-info-label {
        font-size: 13px; color: #999; font-weight: 500;
      }
      .profile-info-value {
        font-size: 14px; color: #333; font-weight: 600;
      }
      .profile-edit-input {
        width: 180px; padding: 6px 10px;
        border: 1.5px solid #e0e0e0; border-radius: 8px;
        font-size: 14px; outline: none; text-align: right;
      }
      .profile-edit-input:focus { border-color: #667eea; }
      .profile-stats-grid {
        display: grid; grid-template-columns: 1fr 1fr 1fr;
        gap: 12px; margin-top: 16px;
      }
      .profile-stat-item {
        text-align: center; padding: 12px 8px;
        background: #f8f9ff; border-radius: 10px;
      }
      .profile-stat-num {
        font-size: 20px; font-weight: 700; color: #667eea;
      }
      .profile-stat-label {
        font-size: 12px; color: #999; margin-top: 2px;
      }
      .profile-actions {
        display: flex; gap: 10px; margin-top: 20px;
      }
      .profile-actions button {
        flex: 1; padding: 10px;
        border-radius: 10px; font-size: 14px; font-weight: 600;
        cursor: pointer; border: none; transition: opacity 0.2s;
      }
      .profile-btn-save {
        background: linear-gradient(135deg, #667eea, #764ba2); color: #fff;
      }
      .profile-btn-save:hover { opacity: 0.9; }
      .profile-btn-cancel {
        background: #f0f0f0; color: #666;
      }
      .profile-btn-cancel:hover { background: #e0e0e0; }
    `;
    document.head.appendChild(style);
  }

  // ==========================================
  // 注入弹窗HTML到body
  // ==========================================
  function injectAuthModals() {
    // 登录弹窗
    const loginModal = document.createElement('div');
    loginModal.id = 'auth-login-modal';
    loginModal.className = 'auth-overlay';
    loginModal.style.display = 'none';
    loginModal.innerHTML = `
      <div class="auth-card">
        <button class="auth-card-close" id="login-close-btn">✕</button>
        <div class="auth-card-logo">📚</div>
        <h2 class="auth-card-title">欢迎回来</h2>
        <p class="auth-card-sub">登录课通·校园AI助手</p>
        <div class="auth-input-group">
          <label>用户名</label>
          <input type="text" id="login-username" placeholder="请输入用户名" autocomplete="username">
        </div>
        <div class="auth-input-group">
          <label>密码</label>
          <input type="password" id="login-password" placeholder="请输入密码" autocomplete="current-password">
        </div>
        <p class="auth-error-msg" id="login-error-msg"></p>
        <button class="auth-submit-btn" id="login-submit-btn">登 录</button>
        <p class="auth-switch-text">
          还没有账号？<span class="auth-switch-link" id="go-to-register">立即注册</span>
        </p>
      </div>
    `;
    document.body.appendChild(loginModal);

    // 注册弹窗
    const registerModal = document.createElement('div');
    registerModal.id = 'auth-register-modal';
    registerModal.className = 'auth-overlay';
    registerModal.style.display = 'none';
    registerModal.innerHTML = `
      <div class="auth-card">
        <button class="auth-card-close" id="register-close-btn">✕</button>
        <div class="auth-card-logo">🎓</div>
        <h2 class="auth-card-title">创建账号</h2>
        <p class="auth-card-sub">加入课通·校园AI助手</p>
        <div class="auth-input-group">
          <label>用户名 <span style="color:#aaa;font-weight:400">（至少3位字母/数字）</span></label>
          <input type="text" id="reg-username" placeholder="请输入用户名" autocomplete="username">
        </div>
        <div class="auth-input-group">
          <label>昵称 <span style="color:#aaa;font-weight:400">（选填，默认同用户名）</span></label>
          <input type="text" id="reg-nickname" placeholder="你的显示名称">
        </div>
        <div class="auth-input-group">
          <label>密码 <span style="color:#aaa;font-weight:400">（至少6位）</span></label>
          <input type="password" id="reg-password" placeholder="请设置密码" autocomplete="new-password">
        </div>
        <div class="auth-input-group">
          <label>确认密码</label>
          <input type="password" id="reg-confirm" placeholder="再次输入密码" autocomplete="new-password">
        </div>
        <p class="auth-error-msg" id="register-error-msg"></p>
        <button class="auth-submit-btn" id="register-submit-btn">注 册</button>
        <p class="auth-switch-text">
          已有账号？<span class="auth-switch-link" id="go-to-login">立即登录</span>
        </p>
      </div>
    `;
    document.body.appendChild(registerModal);

    // 个人信息弹窗
    const profileModal = document.createElement('div');
    profileModal.id = 'auth-profile-modal';
    profileModal.className = 'auth-overlay';
    profileModal.style.display = 'none';
    profileModal.innerHTML = `
      <div class="profile-card">
        <button class="auth-card-close" id="profile-close-btn">✕</button>
        <div class="profile-avatar-large" id="profile-avatar-large"></div>
        <h2 style="text-align:center;font-size:18px;font-weight:700;color:#333;margin:0 0 16px;" id="profile-display-name"></h2>
        <div id="profile-info-section"></div>
        <div class="profile-stats-grid" id="profile-stats-grid">
          <div class="profile-stat-item">
            <div class="profile-stat-num" id="stat-lectures">0</div>
            <div class="profile-stat-label">讲义总结</div>
          </div>
          <div class="profile-stat-item">
            <div class="profile-stat-num" id="stat-schedules">0</div>
            <div class="profile-stat-label">课表解析</div>
          </div>
          <div class="profile-stat-item">
            <div class="profile-stat-num" id="stat-chats">0</div>
            <div class="profile-stat-label">AI对话</div>
          </div>
        </div>
        <div class="profile-actions" id="profile-edit-actions" style="display:none;">
          <button class="profile-btn-save" id="profile-save-btn">💾 保存修改</button>
          <button class="profile-btn-cancel" id="profile-cancel-btn">取消编辑</button>
        </div>
        <div class="profile-actions" id="profile-view-actions">
          <button class="profile-btn-cancel" id="profile-edit-start-btn" style="background:#f8f9ff;color:#667eea;">✏️ 编辑昵称</button>
        </div>
      </div>
    `;
    document.body.appendChild(profileModal);
  }

  // ==========================================
  // 绑定导航栏按钮事件
  // ==========================================
  function bindNavButtons() {
    const btnLogin = document.querySelector('.btn-login');
    const btnRegister = document.querySelector('.btn-register');

    if (btnLogin) btnLogin.addEventListener('click', () => showLoginModal());
    if (btnRegister) btnRegister.addEventListener('click', () => showRegisterModal());

    // 弹窗内部事件绑定
    document.getElementById('login-close-btn').addEventListener('click', closeAllModals);
    document.getElementById('register-close-btn').addEventListener('click', closeAllModals);
    document.getElementById('auth-login-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAllModals();
    });
    document.getElementById('auth-register-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAllModals();
    });

    document.getElementById('go-to-register').addEventListener('click', () => {
      closeAllModals(); showRegisterModal();
    });
    document.getElementById('go-to-login').addEventListener('click', () => {
      closeAllModals(); showLoginModal();
    });

    document.getElementById('login-submit-btn').addEventListener('click', handleLogin);
    document.getElementById('register-submit-btn').addEventListener('click', handleRegister);

    // 个人信息弹窗事件
    document.getElementById('profile-close-btn').addEventListener('click', closeAllModals);
    document.getElementById('auth-profile-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAllModals();
    });
    document.getElementById('profile-edit-start-btn').addEventListener('click', enterProfileEditMode);
    document.getElementById('profile-save-btn').addEventListener('click', saveProfileEdits);
    document.getElementById('profile-cancel-btn').addEventListener('click', cancelProfileEdit);

    // 回车键提交
    document.getElementById('login-password').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('reg-confirm').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleRegister();
    });
  }

  // ==========================================
  // 显示/隐藏弹窗
  // ==========================================
  function showLoginModal() {
    document.getElementById('auth-login-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('login-username').focus(), 100);
    clearLoginForm();
  }

  function showRegisterModal() {
    document.getElementById('auth-register-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('reg-username').focus(), 100);
    clearRegisterForm();
  }

  function closeAllModals() {
    document.getElementById('auth-login-modal').style.display = 'none';
    document.getElementById('auth-register-modal').style.display = 'none';
    document.getElementById('auth-profile-modal').style.display = 'none';
  }

  function clearLoginForm() {
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    setError('login-error-msg', '');
  }

  function clearRegisterForm() {
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-nickname').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-confirm').value = '';
    setError('register-error-msg', '');
  }

  function setError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  // ==========================================
  // 处理登录
  // ==========================================
  async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-submit-btn');

    if (!username || !password) {
      setError('login-error-msg', '请输入用户名和密码');
      return;
    }

    btn.disabled = true;
    btn.textContent = '登录中...';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        setLoggedIn(data.user);
        closeAllModals();
        if (typeof showToast === 'function') {
          showToast(`👋 欢迎回来，${data.user.nickname || data.user.username}！`, 'success');
        }
      } else {
        setError('login-error-msg', data.error || '登录失败，请重试');
      }
    } catch (err) {
      setError('login-error-msg', '无法连接服务器，请确保通过 http://localhost:8080 访问');
    } finally {
      btn.disabled = false;
      btn.textContent = '登 录';
    }
  }

  // ==========================================
  // 处理注册
  // ==========================================
  async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const nickname = document.getElementById('reg-nickname').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;
    const btn = document.getElementById('register-submit-btn');

    if (!username || !password) {
      setError('register-error-msg', '用户名和密码不能为空');
      return;
    }
    if (username.length < 3) {
      setError('register-error-msg', '用户名至少需要3个字符');
      return;
    }
    if (password.length < 6) {
      setError('register-error-msg', '密码至少需要6位');
      return;
    }
    if (password !== confirm) {
      setError('register-error-msg', '两次输入的密码不一致');
      return;
    }

    btn.disabled = true;
    btn.textContent = '注册中...';

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nickname })
      });
      const data = await res.json();

      if (data.success) {
        setLoggedIn(data.user);
        closeAllModals();
        if (typeof showToast === 'function') {
          showToast(`🎉 注册成功！欢迎加入课通，${data.user.nickname || data.user.username}！`, 'success');
        }
      } else {
        setError('register-error-msg', data.error || '注册失败，请重试');
      }
    } catch (err) {
      setError('register-error-msg', '无法连接服务器，请确保通过 http://localhost:8080 访问');
    } finally {
      btn.disabled = false;
      btn.textContent = '注 册';
    }
  }

  // ==========================================
  // 设置已登录状态（更新导航栏UI）
  // ==========================================
  function setLoggedIn(user) {
    currentUser = user;
    localStorage.setItem('classtalk_user', JSON.stringify(user));

    // 获取导航栏右侧区域
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    // 取昵称首字大写作头像文字
    const initial = (user.nickname || user.username || '?')[0].toUpperCase();

    navActions.innerHTML = `
      <div class="nav-user-wrapper" id="nav-user-wrapper">
        <button class="user-avatar-btn" id="user-avatar-btn">
          <div class="user-avatar-icon">${initial}</div>
          <span>${user.nickname || user.username}</span>
          <span style="font-size:10px;opacity:0.7">▾</span>
        </button>
      </div>
    `;

    // 点击头像弹出下拉菜单
    document.getElementById('user-avatar-btn').addEventListener('click', toggleUserDropdown);

    console.log(`✅ [Auth] 登录成功: ${user.username}`);
  }

  // ==========================================
  // 用户下拉菜单
  // ==========================================
  function toggleUserDropdown() {
    const wrapper = document.getElementById('nav-user-wrapper');
    const existing = wrapper.querySelector('.user-dropdown');

    if (existing) {
      existing.remove();
      return;
    }

    const menu = document.createElement('div');
    menu.className = 'user-dropdown';
    menu.innerHTML = `
      <button class="user-dropdown-item" id="profile-btn">👤 个人信息</button>
      <button class="user-dropdown-item danger" id="logout-btn">🚪 退出登录</button>
    `;

    wrapper.appendChild(menu);

    document.getElementById('profile-btn').addEventListener('click', () => {
      menu.remove();
      showProfileModal();
    });
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // 点击外部关闭菜单
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!wrapper.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 0);
  }

  // ==========================================
  // 个人信息弹窗
  // ==========================================
  function showProfileModal() {
    if (!currentUser) {
      if (typeof showToast === 'function') showToast('请先登录', 'error');
      showLoginModal();
      return;
    }

    const modal = document.getElementById('auth-profile-modal');
    const avatarLarge = document.getElementById('profile-avatar-large');
    const displayName = document.getElementById('profile-display-name');
    const infoSection = document.getElementById('profile-info-section');

    // 头像
    const initial = (currentUser.nickname || currentUser.username || '?')[0].toUpperCase();
    avatarLarge.textContent = initial;
    displayName.textContent = currentUser.nickname || currentUser.username;

    // 基本信息（只读模式）
    infoSection.innerHTML = `
      <div class="profile-info-row">
        <span class="profile-info-label">👤 用户名</span>
        <span class="profile-info-value">${currentUser.username}</span>
      </div>
      <div class="profile-info-row">
        <span class="profile-info-label">📛 昵称</span>
        <span class="profile-info-value" id="profile-nickname-display">${currentUser.nickname || currentUser.username}</span>
      </div>
      <div class="profile-info-row">
        <span class="profile-info-label">🆔 用户ID</span>
        <span class="profile-info-value" style="font-size:12px;color:#aaa;">${currentUser.id}</span>
      </div>
      <div class="profile-info-row">
        <span class="profile-info-label">📅 注册时间</span>
        <span class="profile-info-value" style="font-size:12px;">${currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleString('zh-CN') : '未知'}</span>
      </div>
    `;

    // 加载统计数据
    loadProfileStats();

    // 显示只读模式按钮
    document.getElementById('profile-edit-actions').style.display = 'none';
    document.getElementById('profile-view-actions').style.display = 'flex';

    modal.style.display = 'flex';
  }

  // 加载用户使用统计
  async function loadProfileStats() {
    try {
      const userId = currentUser ? currentUser.id : 'anonymous';
      const res = await fetch('/api/history/logs?user_id=' + userId);
      const data = await res.json();

      if (data.success) {
        const logs = data.logs || [];
        document.getElementById('stat-lectures').textContent = logs.filter(l => l.module === 'lecture').length;
        document.getElementById('stat-schedules').textContent = logs.filter(l => l.module === 'schedule').length;
        document.getElementById('stat-chats').textContent = logs.filter(l => l.module === 'ai').length;
      }
    } catch (e) {
      console.warn('加载统计数据失败:', e);
    }
  }

  // 进入编辑模式
  function enterProfileEditMode() {
    const infoSection = document.getElementById('profile-info-section');
    infoSection.innerHTML = `
      <div class="profile-info-row">
        <span class="profile-info-label">👤 用户名</span>
        <span class="profile-info-value" style="color:#aaa;">${currentUser.username}（不可修改）</span>
      </div>
      <div class="profile-info-row">
        <span class="profile-info-label">📛 昵称</span>
        <input type="text" class="profile-edit-input" id="profile-edit-nickname" value="${currentUser.nickname || currentUser.username}" placeholder="输入新昵称">
      </div>
    `;

    document.getElementById('profile-edit-actions').style.display = 'flex';
    document.getElementById('profile-view-actions').style.display = 'none';
  }

  // 保存编辑
  async function saveProfileEdits() {
    const newNickname = document.getElementById('profile-edit-nickname').value.trim();
    if (!newNickname) {
      if (typeof showToast === 'function') showToast('昵称不能为空', 'error');
      return;
    }

    // 更新本地数据
    currentUser.nickname = newNickname;
    localStorage.setItem('classtalk_user', JSON.stringify(currentUser));

    // 更新导航栏
    const navNameSpan = document.querySelector('.user-avatar-btn span:not(.user-avatar-icon):first-of-type');
    if (navNameSpan) navNameSpan.textContent = newNickname;
    const avatarIcon = document.querySelector('.user-avatar-icon');
    if (avatarIcon) avatarIcon.textContent = newNickname[0].toUpperCase();

    if (typeof showToast === 'function') showToast('✅ 昵称已更新', 'success');

    // 回到只读模式
    showProfileModal();
  }

  // 取消编辑
  function cancelProfileEdit() {
    showProfileModal(); // 重新渲染只读模式
  }

  // ==========================================
  // 退出登录
  // ==========================================
  function handleLogout() {
    currentUser = null;
    localStorage.removeItem('classtalk_user');

    // 恢复导航栏为登录/注册按钮
    const navActions = document.querySelector('.nav-actions');
    if (navActions) {
      navActions.innerHTML = `
        <button class="btn-login">登录</button>
        <button class="btn-register">注册</button>
      `;
      navActions.querySelector('.btn-login').addEventListener('click', showLoginModal);
      navActions.querySelector('.btn-register').addEventListener('click', showRegisterModal);
    }

    if (typeof showToast === 'function') {
      showToast('👋 已退出登录', 'info');
    }

    console.log('👤 [Auth] 已退出登录');
  }

  // ==========================================
  // 恢复登录会话（从localStorage）
  // ==========================================
  function restoreSession() {
    try {
      const saved = localStorage.getItem('classtalk_user');
      if (saved) {
        const user = JSON.parse(saved);
        if (user && user.username) {
          setLoggedIn(user);
          console.log(`✅ [Auth] 已恢复登录状态: ${user.username}`);
        }
      }
    } catch (e) {
      localStorage.removeItem('classtalk_user');
    }
  }

  // ==========================================
  // 对外暴露接口（供其他模块使用）
  // ==========================================
  window.getCurrentUser = function() { return currentUser; };
  window.showLoginModal = showLoginModal;
  window.showRegisterModal = showRegisterModal;

  // ==========================================
  // 启动
  // ==========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }

  console.log('✅ [Auth] 登录注册模块加载完成');
})();
