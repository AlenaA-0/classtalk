// ====================================
// 课通 · ClassTalk - AI视频生成模块（完整版）
// 功能：AI智能展开、全屏播放、易背诵
// ====================================

console.log('🎬 [视频] 加载完整版视频模块...');

// 全局变量
let currentVideoData = null;
let isPlaying = false;
let playTimer = null;
let currentSceneIndex = 0;
let speechSynth = window.speechSynthesis;
let currentUtterance = null;
let isSpeechEnabled = true; // 语音开关
let speechRate = 1.0; // 语速：0.5-2.0

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
  console.log('🎬 [视频] DOM加载完成，开始初始化...');
  initVideoModuleFull();
});

function initVideoModuleFull() {
  console.log('🎬 [视频] 初始化完整版视频模块...');
  
  // 先注入正确的CSS样式（必须在DOM操作之前）
  injectVideoStyles();
  
  // 绑定生成按钮事件
  const btnGenerate = document.getElementById('btn-generate-video-content');
  if (btnGenerate) {
    console.log('✅ [视频] 找到生成按钮');
    btnGenerate.textContent = '🎬 生成智能视频';
    
    btnGenerate.onclick = async function(e) {
      e.preventDefault();
      console.log('🎬 [视频] 点击生成按钮');
      await handleVideoGenerateFull();
    };
    
    console.log('✅ [视频] 按钮事件已绑定');
  } else {
    console.error('❌ [视频] 未找到生成按钮！');
  }
  
  // 绑定下载按钮
  const btnDownload = document.getElementById('btn-download-video');
  if (btnDownload) {
    btnDownload.onclick = function() { downloadVideoFull(); };
  }
  
  // 绑定分享按钮
  const btnShare = document.getElementById('btn-share-video');
  if (btnShare) {
    btnShare.onclick = function() { shareVideoFull(); };
  }
  
  // 绑定诊断按钮
  const btnDiagnose = document.getElementById('btn-diagnose-video');
  if (btnDiagnose) {
    btnDiagnose.onclick = function() { window.diagnoseVideo(); };
  }
  
  console.log('🎬 [视频] 初始化完成');
}

// ====================================
// 注入视频模块的CSS样式（一次性）
// ====================================
function injectVideoStyles() {
  if (document.getElementById('video-full-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'video-full-styles';
  style.textContent = `
    /* ====== 视频播放区域 ====== */
    .vf-player-container {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      border-radius: 12px;
      overflow: hidden;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      background-size: 200% 200%;
      animation: vfGradientShift 6s ease infinite;
    }
    
    @keyframes vfGradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    /* ====== 视频内容区域（居中） ====== */
    .vf-scene-display {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: calc(100% - 60px); /* 底部留60px给控制栏 */
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 30px;
      color: white;
      text-align: center;
      z-index: 10;
    }
    
    .vf-title {
      font-size: clamp(20px, 4vw, 42px);
      font-weight: bold;
      margin-bottom: 15px;
      text-shadow: 2px 3px 8px rgba(0,0,0,0.35);
      line-height: 1.3;
    }
    
    .vf-desc {
      font-size: clamp(14px, 2vw, 24px);
      line-height: 1.7;
      max-width: 700px;
      margin-bottom: 12px;
      padding: 16px 24px;
      background: rgba(255,255,255,0.18);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.25);
    }
    
    .vf-example {
      font-size: clamp(13px, 1.5vw, 20px);
      color: #ffe066;
      font-style: italic;
      max-width: 600px;
    }
    
    /* ====== 底部控制栏 ====== */
    .vf-controls-bar {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(0,0,0,0.35);
      backdrop-filter: blur(8px);
      z-index: 20;
      padding: 0 16px;
    }
    
    .vf-btn {
      background: rgba(255,255,255,0.92);
      color: #333;
      border: none;
      padding: 7px 18px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 700;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    
    .vf-btn:hover {
      background: white;
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
    }
    
    .vf-btn:active {
      transform: translateY(0);
    }
    
    /* 进度条 */
    .vf-progress-track {
      width: 160px;
      height: 6px;
      background: rgba(255,255,255,0.3);
      border-radius: 3px;
      overflow: hidden;
      min-width: 80px;
    }
    
    .vf-progress-fill {
      height: 100%;
      background: #fff;
      width: 0%;
      transition: width 0.4s ease;
      border-radius: 3px;
    }
    
    /* 场景指示器 */
    .vf-scene-indicator {
      position: absolute;
      top: 12px; right: 16px;
      color: rgba(255,255,255,0.75);
      font-size: 13px;
      z-index: 15;
      background: rgba(0,0,0,0.2);
      padding: 4px 12px;
      border-radius: 12px;
      backdrop-filter: blur(4px);
    }

    /* ====== 易背诵弹窗 ====== */
    .vf-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.65);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: vfFadeIn 0.25s ease;
    }
    
    @keyframes vfFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .vf-modal-box {
      background: #fff;
      padding: 32px;
      border-radius: 16px;
      max-width: 580px;
      max-height: 78vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: vfSlideUp 0.3s ease;
    }
    
    @keyframes vfSlideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .vf-modal-box h2 {
      text-align: center;
      margin-bottom: 24px;
      color: #667eea;
      font-size: 22px;
    }
    
    .vf-memo-item {
      background: linear-gradient(135deg, #f8f9ff, #f0f4ff);
      padding: 18px;
      margin-bottom: 14px;
      border-radius: 10px;
      border-left: 4px solid #667eea;
    }
    
    .vf-memo-item h4 {
      color: #333;
      margin-bottom: 8px;
      font-size: 15px;
    }
    
    .vf-memo-item .mnemonic-text {
      color: #e67e22;
      font-weight: 600;
      font-size: 15px;
      margin-bottom: 6px;
    }
    
    .vf-memo-item .technique-text {
      color: #666;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .vf-close-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .vf-close-btn:hover {
      background: #5568d3;
    }
    
    /* ====== 语音控制按钮 ====== */
    .vf-voice-btn {
      background: linear-gradient(135deg, #56ab2f, #a8e063) !important;
      font-size: 13px !important;
      padding: 6px 14px !important;
    }
    .vf-voice-btn:hover {
      background: linear-gradient(135deg, #4a9c25, #96d153) !important;
    }
    .vf-voice-btn.voice-off {
      background: linear-gradient(135deg, #999, #bbb) !important;
    }
    
    .vf-speed-btn {
      background: rgba(255,255,255,0.2) !important;
      font-size: 12px !important;
      padding: 6px 10px !important;
      min-width: 48px;
    }
    .vf-speed-btn:hover {
      background: rgba(255,255,255,0.35) !important;
    }
  `;
  document.head.appendChild(style);
}

// ====================================
// 处理视频生成
// ====================================
async function handleVideoGenerateFull() {
  console.log('🎬 [视频] 开始生成智能视频...');
  
  const textarea = document.getElementById('video-text-input');
  const content = (textarea.value || '').trim();
  
  if (!content) {
    showToast('请先输入知识点内容', 'error');
    return;
  }
  
  console.log('📝 [视频] 知识点内容：', content.substring(0, 60) + '...');
  
  // 显示处理状态
  const processing = document.getElementById('video-processing');
  const resultSection = document.getElementById('video-result');
  const progressBar = document.getElementById('video-progress-bar');
  const progressText = document.getElementById('video-progress-text');
  const progressDetail = document.getElementById('video-progress-detail');
  
  if (processing) processing.style.display = 'block';
  if (resultSection) resultSection.style.display = 'none';
  
  try {
    updateProgress(progressBar, progressText, progressDetail, 10, 'AI正在分析知识点...');
    
    // 调用DeepSeek API展开知识点
    const expandedData = await expandContentWithAIFull(content);
    
    updateProgress(progressBar, progressText, progressDetail, 60, '正在生成视频场景...');
    
    currentVideoData = expandedData;
    
    await sleep(400);
    updateProgress(progressBar, progressText, progressDetail, 90, '正在准备播放器...');
    
    await sleep(300);
    
    // 隐藏处理状态，显示结果区域
    if (processing) processing.style.display = 'none';
    if (resultSection) resultSection.style.display = 'block';
    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = '100%';
    
    showToast('✅ 智能视频已生成！点击▶播放观看', 'success');
    
    // 渲染播放器
    renderVideoPlayer(expandedData);
    
  } catch (error) {
    console.error('❌ [视频] 生成失败：', error);
    showToast('❌ 生成失败：' + error.message, 'error');
    if (processing) processing.style.display = 'none';
  }
}

// ====================================
// 调用DeepSeek API智能展开
// ====================================
async function expandContentWithAIFull(content) {
  console.log('🤖 [AI] 调用DeepSeek API展开知识点...');
  
  const response = await fetchProxy('/deepseek-proxy', {
    messages: [
      {
        role: 'system',
        content: '你是教学视频制作专家，擅长把复杂知识讲得通俗易懂。只输出JSON格式。'
      },
      {
        role: 'user',
        content: `请帮我把以下知识点展开成适合视频讲解的格式。

**原始知识点：**
${content}

**要求：**
1. 生成3-5个场景（scenes）
2. 每个场景包含：
   - title: 标题（简洁有力，不超过15字）
   - content: 通俗易懂的解释（避免专业术语，或解释术语，2-3句话）
   - example: 生活例子或类比（一句话）
   - icon: 合适的emoji

**输出JSON格式（只输出JSON，不要其他文字）：**
{
  "scenes": [
    {
      "title": "标题",
      " content": "通俗易懂的解释",
      "example": "生活例子/类比",
      "icon": "emoji"
    }
  ]
}`
      }
    ]
  });
  
  console.log('✅ [AI] DeepSeek返回成功');
  
  // 解析JSON
  let data;
  try {
    data = JSON.parse(response.content);
  } catch (e) {
    const match = response.content.match(/\{[\s\S]*\}/);
    if (match) {
      data = JSON.parse(match[0]);
    } else {
      throw new Error('AI返回格式错误');
    }
  }
  
  return data;
}

// ====================================
// 渲染视频播放器
// ====================================
function renderVideoPlayer(data) {
  const placeholder = document.getElementById('video-placeholder');
  if (!placeholder) {
    console.error('❌ [视频] 未找到video-placeholder');
    return;
  }
  
  // 清空并构建播放器HTML
  placeholder.innerHTML = `
    <div class="vf-player-container">
      <div class="vf-scene-indicator"><span class="vf-scene-num">1</span> / ${data.scenes.length}</div>
      
      <div class="vf-scene-display">
        <div class="vf-title"></div>
        <div class="vf-desc"></div>
        <div class="vf-example"></div>
      </div>
      
      <div class="vf-controls-bar">
        <button class="vf-btn vf-play-btn">▶ 播放</button>
        <button class="vf-btn vf-voice-btn" id="vf-voice-toggle">🔊 语音</button>
        <button class="vf-btn vf-speed-btn" id="vf-speed-btn">1.0x</button>
        <button class="vf-btn vf-memo-btn">🧠 易背诵</button>
        <div class="vf-progress-track">
          <div class="vf-progress-fill"></div>
        </div>
      </div>
    </div>
  `;
  
  // 绑定事件
  const playBtn = placeholder.querySelector('.vf-play-btn');
  const memoBtn = placeholder.querySelector('.vf-memo-btn');
  const voiceBtn = placeholder.querySelector('#vf-voice-toggle');
  const speedBtn = placeholder.querySelector('#vf-speed-btn');
  
  if (playBtn) {
    playBtn.addEventListener('click', () => togglePlay());
  }
  if (memoBtn) {
    memoBtn.addEventListener('click', () => showMemorizeModal());
  }
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => toggleVoice());
  }
  if (speedBtn) {
    speedBtn.addEventListener('click', () => changeSpeed());
  }
  
  // 显示第一个场景（静态预览）
  showScene(0);
  
  console.log('✅ [视频] 播放器渲染完成');
}

// ====================================
// 显示某个场景
// ====================================
function showScene(index) {
  if (!currentVideoData || !currentVideoData.scenes || index >= currentVideoData.scenes.length) return;
  
  const scene = currentVideoData.scenes[index];
  const titleEl = document.querySelector('.vf-title');
  const descEl = document.querySelector('.vf-desc');
  const exampleEl = document.querySelector('.vf-example');
  const numEl = document.querySelector('.vf-scene-num');
  const fillEl = document.querySelector('.vf-progress-fill');
  
  if (titleEl) titleEl.textContent = scene.icon + ' ' + scene.title;
  if (descEl) descEl.textContent = scene.content;
  if (exampleEl) exampleEl.textContent = '💡 ' + scene.example;
  if (numEl) numEl.textContent = index + 1;
  if (fillEl && currentVideoData.scenes.length > 0) {
    fillEl.style.width = ((index + 1) / currentVideoData.scenes.length * 100) + '%';
  }
}

// ====================================
// 切换播放/暂停
// ====================================
function togglePlay() {
  const btn = document.querySelector('.vf-play-btn');
  
  if (isPlaying) {
    // 暂停
    isPlaying = false;
    if (btn) btn.textContent = '▶ 播放';
    clearTimeout(playTimer);
    playTimer = null;
    stopSpeech(); // 停止语音
    console.log('⏸️ [视频] 已暂停');
    return;
  }
  
  // 开始播放
  isPlaying = true;
  if (btn) btn.textContent = '⏸ 暂停';
  console.log('▶️ [视频] 开始播放');
  
  // 如果已经在最后一个场景之后，从头开始
  if (currentSceneIndex >= currentVideoData.scenes.length) {
    currentSceneIndex = 0;
  }
  
  playCurrentScene();
}

// ====================================
// 朗读当前场景的内容
// ====================================
function speakScene(index) {
  if (!isSpeechEnabled) return;
  if (!currentVideoData || !currentVideoData.scenes[index]) return;
  
  stopSpeech(); // 先停止当前语音
  
  const scene = currentVideoData.scenes[index];
  // 组合要朗读的文本
  const text = `${scene.title}。` + scene.content + `。` + scene.example;
  
  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = 'zh-CN'; // 中文
  currentUtterance.rate = speechRate; // 语速
  currentUtterance.pitch = 1.0; // 音高
  currentUtterance.volume = 1.0; // 音量
  
  // 尝试选择中文语音
  const voices = speechSynth.getVoices();
  const chineseVoice = voices.find(v => v.lang.startsWith('zh'));
  if (chineseVoice) {
    currentUtterance.voice = chineseVoice;
  }
  
  currentUtterance.onstart = () => {
    console.log(`🔊 [语音] 开始朗读场景 ${index + 1}`);
  };
  
  currentUtterance.onend = () => {
    console.log(`🔊 [语音] 场景 ${index + 1} 朗读完毕`);
  };
  
  currentUtterance.onerror = (e) => {
    console.error('❌ [语音] 朗读错误:', e);
  };
  
  speechSynth.speak(currentUtterance);
}

// ====================================
// 停止语音播放
// ====================================
function stopSpeech() {
  if (speechSynth.speaking) {
    speechSynth.cancel();
    console.log('🔇 [语音] 已停止');
  }
}

// ====================================
// 切换语音开关
// ====================================
function toggleVoice() {
  isSpeechEnabled = !isSpeechEnabled;
  const btn = document.getElementById('vf-voice-toggle');
  
  if (isSpeechEnabled) {
    if (btn) btn.textContent = '🔊 语音';
    btn.classList.remove('voice-off');
    showToast('🔊 语音已开启', 'success');
    console.log('🔊 [语音] 已开启');
  } else {
    if (btn) btn.textContent = '🔇 静音';
    btn.classList.add('voice-off');
    stopSpeech();
    showToast('🔇 语音已关闭', 'info');
    console.log('🔇 [语音] 已关闭');
  }
}

// ====================================
// 切换语速
// ====================================
function changeSpeed() {
  const speeds = [0.8, 1.0, 1.2, 1.5];
  const currentIndex = speeds.indexOf(speechRate);
  const nextIndex = (currentIndex + 1) % speeds.length;
  speechRate = speeds[nextIndex];
  
  const btn = document.getElementById('vf-speed-btn');
  if (btn) btn.textContent = speechRate + 'x';
  
  showToast(`🎚️ 语速：${speechRate}x`, 'info');
  console.log(`🎚️ [语音] 语速调整为：${speechRate}x`);
  
  // 如果正在播放，重新朗读当前场景（应用新语速）
  if (isPlaying && isSpeechEnabled) {
    speakScene(currentSceneIndex);
  }
}

function playCurrentScene() {
  if (!isPlaying) return;
  
  if (currentSceneIndex >= currentVideoData.scenes.length) {
    // 播放完毕
    isPlaying = false;
    stopSpeech(); // 停止语音
    const btn = document.querySelector('.vf-play-btn');
    if (btn) btn.textContent = '▶ 重播';
    console.log('✅ [视频] 播放完毕');
    return;
  }
  
  showScene(currentSceneIndex);
  speakScene(currentSceneIndex); // 朗读当前场景
  
  playTimer = setTimeout(() => {
    currentSceneIndex++;
    playCurrentScene();
  }, 5000); // 每个场景5秒
}

// ====================================
// 易背诵弹窗（调用API生成口诀）
// ====================================
async function showMemorizeModal() {
  if (!currentVideoData || !currentVideoData.scenes) {
    showToast('请先生成视频', 'error');
    return;
  }
  
  showToast('🧠 AI正在生成记忆口诀...', 'info');
  
  try {
    const response = await fetchProxy('/deepseek-proxy', {
      messages: [
        { role: 'system', content: '你是记忆大师，擅长把知识编成口诀和押韵句子。只输出JSON。' },
        {
          role: 'user',
          content: `请帮我把以下内容改成易背诵版本。

${JSON.stringify(currentVideoData.scenes, null, 2)}

要求：
1. 为每条编一个口诀（押韵、朗朗上口）
2. 提供记忆技巧说明

只输出JSON：
{
  "items": [
    {"original": "原文", "mnemonic": "口诀", "technique": "技巧"}
  ]
}`
        }
      ]
    });
    
    const data = JSON.parse(response.content);
    openMemorizeDialog(data);
    
  } catch (err) {
    console.error('❌ [易背诵] 失败:', err);
    showToast('❌ 生成口诀失败：' + err.message, 'error');
  }
}

function openMemorizeDialog(data) {
  // 移除已有弹窗
  const oldModal = document.querySelector('.vf-modal-overlay');
  if (oldModal) oldModal.remove();
  
  const overlay = document.createElement('div');
  overlay.className = 'vf-modal-overlay';
  
  let itemsHtml = '';
  data.items.forEach((item, i) => {
    itemsHtml += `
      <div class="vf-memo-item">
        <h4>${i + 1}. ${escapeHtml(item.original)}</h4>
        <p class="mnemonic-text">📝 口诀：${escapeHtml(item.mnemonic)}</p>
        <p class="technique-text">💡 技巧：${escapeHtml(item.technique)}</p>
      </div>`;
  });
  
  overlay.innerHTML = `
    <div class="vf-modal-box">
      <h2>🧠 易背诵版本</h2>
      <div>${itemsHtml}</div>
      <button class="vf-close-btn">关闭</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // 点击遮罩层关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  
  overlay.querySelector('.vf-close-btn').addEventListener('click', () => {
    overlay.remove();
  });
}

// ==================================== 
// 工具函数
// ====================================

function updateProgress(bar, text, detail, percent, msg) {
  if (bar) bar.style.width = percent + '%';
  if (text) text.textContent = percent + '%';
  if (detail) detail.textContent = msg;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function downloadVideoFull() {
  showToast('📥 下载功能开发中...', 'info');
}

function shareVideoFull() {
  showToast('🔗 分享功能开发中...', 'info');
}

// 诊断函数（供外部调用）
window.diagnoseVideo = function() {
  const info = [];
  info.push(`访问方式: ${location.protocol}//${location.host}${location.pathname}`);
  info.push(`服务器: ${fetch ? '可用' : '不可用'}`);
  
  const genBtn = document.getElementById('btn-generate-video-content');
  info.push(`生成按钮: ${genBtn ? '存在 ✓' : '不存在 ✗'}`);
  
  alert('诊断信息:\n\n' + info.join('\n'));
};

console.log('✅ [视频] 完整版模块加载完毕');
