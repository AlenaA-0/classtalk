// ============================================
// 课通 · ClassTalk - 通用工具函数（改进版）
// ============================================

const SERVER_URL = 'http://localhost:8080';

// --- 获取或创建用户ID ---
function getUserId() {
  let userId = localStorage.getItem('classtalk_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('classtalk_user_id', userId);
  }
  return userId;
}

// --- 检测访问方式并提示 ---
function checkAccessMode() {
  if (window.location.protocol === 'file:') {
    console.error('⚠️ [访问方式] 当前通过 file:// 协议打开，API请求可能被浏览器阻止！');
    console.warn('⚠️ [访问方式] 请通过 http://localhost:8080 访问页面');
    
    // 在页面顶部显示醒目提示
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#ff4444;color:white;padding:12px 20px;text-align:center;font-size:16px;font-weight:bold;cursor:pointer;';
    banner.textContent = '⚠️ 当前通过本地文件打开，功能可能受限！点击此处通过 http://localhost:8080 访问 →';
    banner.onclick = function() {
      window.location.href = SERVER_URL;
    };
    document.body.appendChild(banner);
    
    return false;
  }
  return true;
}

// --- 通用代理请求函数（改进版） ---
async function fetchProxy(pathname, bodyObj) {
  // 构建尝试的URL列表
  const proxyUrls = [];
  
  // 1. 相对路径（最优先，当页面从服务器访问时直接生效）
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    proxyUrls.push(window.location.origin + pathname);
  }
  
  // 2. 绝对路径（fallback，当相对路径不可用时尝试直连服务器）
  proxyUrls.push(SERVER_URL + pathname);
  
  console.log(`[fetchProxy] 尝试连接: ${pathname}, 共${proxyUrls.length}个候选URL`);
  
  for (let i = 0; i < proxyUrls.length; i++) {
    const proxyUrl = proxyUrls[i];
    try {
      console.log(`[fetchProxy] 尝试 #${i + 1}: ${proxyUrl}`);
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'user-id': getUserId()
        },
        body: JSON.stringify(bodyObj),
        signal: AbortSignal.timeout(15000) // 15秒超时
      });
      
      if (!response.ok) {
        // 服务器返回了HTTP错误状态码（如500、404等）
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `服务器返回HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`[fetchProxy] ✅ 成功: ${proxyUrl}`);
        return data;
      } else {
        throw new Error(data.error || '请求失败');
      }
      
    } catch (error) {
      console.warn(`[fetchProxy] ❌ 失败 #${i + 1}: ${proxyUrl}`, error.message);
      
      // 如果是最后一个URL也失败了，抛出最终错误
      if (i === proxyUrls.length - 1) {
        if (error.name === 'AbortError' || error.name === 'TypeError' || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          // 网络级别的连接失败
          const errorMsg = `无法连接到服务器！\n\n可能原因：\n1. 服务器未运行 - 请在项目目录运行 node server.js\n2. 浏览器访问方式错误 - 请通过 ${SERVER_URL} 访问\n3. 端口被占用 - 检查8080端口是否被其他程序使用\n\n当前页面: ${window.location.protocol}//${window.location.host}`;
          throw new Error(errorMsg);
        }
        // 其他错误（如服务器返回500等），直接抛出原始错误
        throw error;
      }
      // 还有更多URL可以尝试，继续循环
    }
  }
  
  throw new Error(`所有连接方式失败！请通过 ${SERVER_URL} 访问页面，并确保服务器正在运行`);
}

// --- 服务器健康检查 ---
async function checkServerHealth() {
  try {
    const response = await fetch(SERVER_URL + '/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    const data = await response.json();
    console.log('[健康检查] ✅ 服务器运行中:', data);
    return { online: true, data: data };
  } catch (error) {
    console.error('[健康检查] ❌ 服务器不可达:', error.message);
    return { online: false, error: error.message };
  }
}

// --- Toast提示 ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) {
    // 如果没有toast容器，创建一个
    const newContainer = document.createElement('div');
    newContainer.id = 'toast-container';
    newContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(newContainer);
  }
  
  const targetContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  // 如果toast样式不存在，添加基础样式
  if (!document.getElementById('toast-base-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-base-styles';
    style.textContent = `
      .toast { padding: 12px 20px; border-radius: 8px; color: white; font-size: 14px; animation: toastIn 0.3s ease; max-width: 350px; word-break: break-word; }
      .toast.info { background: #4F46E5; }
      .toast.success { background: #10B981; }
      .toast.error { background: #EF4444; }
      .toast.warning { background: #F59E0B; }
      @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    `;
    document.head.appendChild(style);
  }
  
  targetContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- HTML转义 ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- 页面加载时自动检测访问方式 ---
window.addEventListener('DOMContentLoaded', () => {
  checkAccessMode();
  
  // 健康检查（静默）
  checkServerHealth().then(result => {
    if (!result.online) {
      showToast('⚠️ 服务器未运行，请启动后端服务 (node server.js)', 'warning');
    } else {
      console.log('✅ [启动] 服务器连接正常');
    }
  });
});
