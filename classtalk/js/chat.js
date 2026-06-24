// ====================================
// 课通 · ClassTalk - AI对话模块
// ====================================

document.addEventListener('DOMContentLoaded', () => {
  initChat();
});

const chatHistory = [];

function initChat() {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send-chat');
  
  if (sendBtn) {
    sendBtn.addEventListener('click', sendChatMessage);
  }
  
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }
}

function getCurrentTime() {
  const now = new Date();
  return now.getHours().toString().padStart(2, '0') + ':' + 
         now.getMinutes().toString().padStart(2, '0');
}

async function sendChatMessage() {
  const chatInput = document.getElementById('chat-input');
  const userMessage = chatInput.value.trim();
  
  if (!userMessage) {
    showToast('请输入消息', 'error');
    return;
  }
  
  // 添加用户消息到聊天窗口
  addMessageToChat('user', userMessage);
  
  // 添加到历史记录
  chatHistory.push({ role: 'user', content: userMessage });
  
  // 清空输入框
  chatInput.value = '';
  
  // 显示加载状态
  showLoadingMessage();
  
  try {
    // 调用DeepSeek API
    const response = await callDeepSeekAPI();
    removeLoadingMessage();
    
    if (response.reply) {
      addMessageToChat('bot', response.reply);
      chatHistory.push({ role: 'assistant', content: response.reply });
    } else {
      addMessageToChat('bot', '抱歉，我无法回答这个问题。');
    }
  } catch (error) {
    removeLoadingMessage();
    addMessageToChat('bot', '⚠️ 连接AI服务失败。请确保已启动本地服务器（运行 node server.js），然后通过 http://localhost:8080 访问。');
    console.error('API调用失败:', error);
  }
}

function addMessageToChat(sender, content) {
  const chatMessages = document.getElementById('chat-messages');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  
  const avatarSymbol = sender === 'user' ? '&#128100;' : '&#129302;';
  const avatarClass = sender === 'user' ? 'user-avatar' : 'bot-avatar';
  
  messageDiv.innerHTML = `
    <div class="message-avatar ${avatarClass}">${sender === 'user' ? '&#128100;' : '&#129302;'}</div>
    <div class="message-content">
      <div class="message-bubble">
        <p>${escapeHtml(content)}</p>
      </div>
      <span class="message-time">${getCurrentTime()}</span>
    </div>
  `;
  
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

function showLoadingMessage() {
  const chatMessages = document.getElementById('chat-messages');
  
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message bot-message loading-message';
  loadingDiv.id = 'loading-message';
  loadingDiv.innerHTML = `
    <div class="message-avatar bot-avatar">&#129302;</div>
    <div class="message-content">
      <div class="message-bubble">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  
  chatMessages.appendChild(loadingDiv);
  scrollToBottom();
}

function removeLoadingMessage() {
  const loadingDiv = document.getElementById('loading-message');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

function scrollToBottom() {
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function callDeepSeekAPI() {
  // 尝试多个代理URL（回退机制）
  const proxyUrls = [];
  
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    proxyUrls.push('/deepseek-proxy');
    proxyUrls.push(window.location.origin + '/deepseek-proxy');
  }
  proxyUrls.push('http://localhost:8080/deepseek-proxy');
  
  // 添加系统提示，让AI扮演校园助手角色
  const systemMessage = {
    role: 'system',
    content: '你是「课通」校园AI助手，一个专门帮助大学生处理校园信息的AI工具。你能够回答课程相关问题、校园生活、学习方法、考试备考等问题。用亲切自然的语气与学生交流，回答简洁明了。'
  };
  
  const messages = [systemMessage, ...chatHistory];
  
  for (const proxyUrl of proxyUrls) {
    try {
      console.log('[AI] 尝试代理:', proxyUrl);
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages })
      });
      
      if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
      }
      
      const data = await response.json();
      
      if (data.success && data.content) {
        return { reply: data.content };
      } else {
        throw new Error(data.error || 'AI响应异常');
      }
    } catch (error) {
      console.warn('[AI] 代理失败:', proxyUrl, error.message);
      if (proxyUrl === proxyUrls[proxyUrls.length - 1]) {
        throw error;
      }
      // 继续尝试下一个URL
    }
  }
  
  throw new Error('所有代理URL均不可用');
}

// AI回复格式化（支持markdown样式）
function formatAIReply(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/`(.*?)`/g, '<code style="background:#f5f5f5;padding:2px 4px;border-radius:3px;">$1</code>');
}
