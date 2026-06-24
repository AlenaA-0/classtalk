// ====================================
// 课通 · ClassTalk - AI视频生成模块（智能展开版）
// ====================================

let currentVideoData = null;
let isPlaying = false;
let playTimer = null;

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🎬 [视频] DOM加载完成，开始初始化...');
    initVideoGeneratorSmart();
  });
} else {
  console.log('🎬 [视频] DOM已加载，立即初始化...');
  initVideoGeneratorSmart();
}

function initVideoGeneratorSmart() {
  console.log('🎬 [视频] 初始化按钮事件...');
  
  // 生成视频按钮
  const btnGenerate = document.getElementById('btn-generate-video-content');
  if (btnGenerate) {
    console.log('✅ [视频] 找到生成按钮，绑定事件');
    btnGenerate.textContent = '🎬 生成智能视频';
    
    // 移除旧的事件监听器（防止重复绑定）
    btnGenerate.replaceWith(btnGenerate.cloneNode(true));
    const newBtnGenerate = document.getElementById('btn-generate-video-content');
    
    newBtnGenerate.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('🎬 [视频] 点击生成按钮');
      
      const textarea = document.getElementById('video-text-input');
      let content = textarea.value.trim();
      
      if (!content && window.currentLectureSummary) {
        content = window.currentLectureSummary.summary || '';
        textarea.value = content;
        console.log('🎬 [视频] 使用讲义总结内容');
      }
      
      if (!content) {
        showToast('请先输入知识点内容', 'error');
        return;
      }
      
      await generateSmartVideo(content);
    });
  } else {
    console.error('❌ [视频] 未找到生成按钮 (btn-generate-video-content)');
  }
  
  // 下载视频按钮
  const btnDownload = document.getElementById('btn-download-video');
  if (btnDownload) {
    console.log('✅ [视频] 找到下载按钮，绑定事件');
    btnDownload.addEventListener('click', () => {
      console.log('🎬 [视频] 点击下载按钮');
      downloadVideoAsFile();
    });
  } else {
    console.warn('⚠️ [视频] 未找到下载按钮 (btn-download-video)');
  }
  
  // 分享链接按钮
  const btnShare = document.getElementById('btn-share-video');
  if (btnShare) {
    console.log('✅ [视频] 找到分享按钮，绑定事件');
    btnShare.addEventListener('click', () => {
      console.log('🎬 [视频] 点击分享按钮');
      shareVideoContent();
    });
  } else {
    console.warn('⚠️ [视频] 未找到分享按钮 (btn-share-video)');
  }
  
  console.log('🎬 [视频] 初始化完成');
}

// --- 生成智能视频（AI展开内容）---
async function generateSmartVideo(content) {
  const processing = document.getElementById('video-processing');
  const progressBar = document.getElementById('video-progress-bar');
  const progressText = document.getElementById('video-progress-text');
  const progressDetail = document.getElementById('video-progress-detail');
  const results = document.getElementById('video-result');
  const placeholder = document.getElementById('video-placeholder');
  
  // 显示处理界面
  if (results) results.style.display = 'none';
  if (processing) processing.style.display = 'block';
  
  // 步骤1：AI展开知识点
  updateProgress(processing, progressBar, progressText, progressDetail, 10, 'AI正在分析知识点...');
  
  let expandedContent = null;
  try {
    expandedContent = await expandContentWithAI(content);
    updateProgress(processing, progressBar, progressText, progressDetail, 50, '正在生成易懂的解释...');
  } catch (e) {
    console.error('AI展开失败，使用基础模式', e);
    expandedContent = createBasicExpansion(content);
  }
  
  updateProgress(processing, progressBar, progressText, progressDetail, 80, '正在渲染视频...');
  
  setTimeout(() => {
    if (processing) processing.style.display = 'none';
    if (results) results.style.display = 'block';
    
    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = '100%';
    
    // 显示智能视频播放器
    showSmartVideoPlayer(placeholder, expandedContent);
    
    showToast('✅ 智能视频已生成！', 'success');
  }, 500);
}

// --- 用AI展开内容 ---
async function expandContentWithAI(content) {
  const prompt = `你是一位优秀的教学视频制作人。用户提供了一个知识点，请你把它展开成适合视频讲解的格式。

**原始知识点：**
${content}

**要求：**
1. 把每个要点展开成"通俗易懂的解释 + 生活例子/类比"
2. 语言要生动有趣，适合大学生理解
3. 每个要点控制在100字以内
4. 如果有难懂的概念，用比喻来解释

**输出格式（严格JSON）：**
{
  "title": "视频标题（吸引人）",
  "scenes": [
    {
      "type": "explain",
      "title": "要点标题",
      "content": "易懂的解释文字",
      "example": "生活例子或类比（可选）",
      "icon": "合适的emoji（如📚🧮🔬）"
    }
  ]
}

只输出JSON，不要其他文字。`;

  try {
    const response = await fetchProxy('/deepseek-proxy', {
      messages: [
        { role: 'system', content: '你是教学视频制作专家，擅长把复杂知识讲得通俗易懂。只输出JSON。' },
        { role: 'user', content: prompt }
      ]
    });
    
    const aiContent = response.content || '';
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('AI展开失败:', e);
  }
  
  // 降级方案
  return createBasicExpansion(content);
}

// --- 基础展开（AI不可用时的备用）---
function createBasicExpansion(content) {
  const lines = content.split('\n')
    .map(l => l.trim())
    .filter(l => l && l.length > 5)
    .slice(0, 5);
  
  const scenes = lines.map((line, i) => ({
    type: 'explain',
    title: `重点 ${i + 1}`,
    content: line,
    example: '',
    icon: ['📚', '🧮', '🔬', '💡', '🎯'][i % 5]
  }));
  
  return {
    title: '知识点讲解',
    scenes: scenes
  };
}

// --- 生成易背诵版本 ---
async function generateMemorableVersion(content) {
  const prompt = `你把以下知识点改成"容易背诵"的版本。

**原始内容：**
${content}

**要求：**
1. 每句话尽量押韵或朗朗上口
2. 可以用谐音、口诀、缩写等记忆技巧
3. 格式要简洁，每条不超过20字
4. 保留核心信息

**输出格式（严格JSON）：**
{
  "title": "记忆口诀",
  "mnemonics": [
    {
      "original": "原始要点",
      "mnemonic": "口诀/押韵版（朗朗上口）",
      "tip": "记忆技巧说明（可选）"
    }
  ]
}

只输出JSON。`;

  try {
    const response = await fetchProxy('/deepseek-proxy', {
      messages: [
        { role: 'system', content: '你是记忆大师，擅长把知识编成口诀和押韵句子。只输出JSON。' },
        { role: 'user', content: prompt }
      ]
    });
    
    const aiContent = response.content || '';
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('生成易背诵版本失败:', e);
  }
  
  return null;
}

// --- 显示智能视频播放器 ---
function showSmartVideoPlayer(container, videoData) {
  if (!container) return;
  
  currentVideoData = videoData;
  
  // 清空容器并设置全屏样式
  container.innerHTML = '';
  container.style.cssText = `
    width: 100%;
    min-height: 500px;
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  `;
  
  // 视频标题
  const titleBar = document.createElement('div');
  titleBar.style.cssText = `
    padding: 20px 30px;
    background: rgba(0,0,0,0.3);
    color: white;
    font-size: 20px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  titleBar.innerHTML = `
    <span>🎬 ${videoData.title || '知识点讲解'}</span>
    <span style="font-size:14px; color:#94a3b8;" id="video-scene-counter">0 / ${videoData.scenes.length}</span>
  `;
  container.appendChild(titleBar);
  
  // 主显示区域（全屏覆盖）
  const display = document.createElement('div');
  display.id = 'smart-video-display';
  display.style.cssText = `
    width: 100%;
    min-height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
  `;
  container.appendChild(display);
  
  // 粒子背景
  const particleBg = document.createElement('canvas');
  particleBg.id = 'video-particle-bg';
  particleBg.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;';
  display.appendChild(particleBg);
  
  // 内容区域
  const contentArea = document.createElement('div');
  contentArea.id = 'video-content-area';
  contentArea.style.cssText = `
    position: relative;
    z-index: 10;
    text-align: center;
    color: white;
    max-width: 900px;
    width: 100%;
  `;
  display.appendChild(contentArea);
  
  // 控制栏
  const controls = document.createElement('div');
  controls.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
    padding: 20px;
    background: rgba(0,0,0,0.4);
    flex-wrap: wrap;
  `;
  
  const btnPlay = document.createElement('button');
  btnPlay.innerHTML = '▶ 播放';
  btnPlay.className = 'btn-primary';
  btnPlay.style.cssText = 'padding: 10px 25px; font-size: 16px;';
  
  const btnMemorable = document.createElement('button');
  btnMemorable.innerHTML = '🧠 易背诵';
  btnMemorable.className = 'btn-secondary';
  btnMemorable.style.cssText = 'padding: 10px 25px; font-size: 16px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none;';
  
  const btnPrev = document.createElement('button');
  btnPrev.innerHTML = '⏮ 上一条';
  btnPrev.className = 'btn-secondary';
  btnPrev.style.cssText = 'padding: 8px 20px;';
  
  const btnNext = document.createElement('button');
  btnNext.innerHTML = '下一条 ⏭';
  btnNext.className = 'btn-secondary';
  btnNext.style.cssText = 'padding: 8px 20px;';
  
  controls.appendChild(btnPrev);
  controls.appendChild(btnPlay);
  controls.appendChild(btnNext);
  controls.appendChild(btnMemorable);
  container.appendChild(controls);
  
  // 初始化粒子效果
  initSmartParticleEffect(particleBg);
  
  // 播放逻辑
  let currentIndex = 0;
  const scenes = videoData.scenes || [];
  
  function renderScene(index) {
    if (index < 0 || index >= scenes.length) return;
    
    currentIndex = index;
    const scene = scenes[index];
    
    // 更新计数器
    const counter = document.getElementById('video-scene-counter');
    if (counter) counter.textContent = `${index + 1} / ${scenes.length}`;
    
    // 切换背景渐变
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)'
    ];
    display.style.background = gradients[index % gradients.length];
    
    // 渲染内容（带动画）
    contentArea.style.opacity = '0';
    contentArea.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
      contentArea.style.transition = 'all 0.6s ease-out';
      contentArea.style.opacity = '1';
      contentArea.style.transform = 'translateY(0)';
      
      if (scene.type === 'explain') {
        contentArea.innerHTML = `
          <div style="animation: fadeInUp 0.8s ease-out;">
            <div style="font-size: 80px; margin-bottom: 30px;">${scene.icon || '📚'}</div>
            <div style="font-size: 48px; font-weight: bold; margin-bottom: 30px; 
                        text-shadow: 2px 2px 8px rgba(0,0,0,0.3);">
              ${scene.title}
            </div>
            <div style="font-size: 28px; line-height: 1.8; margin-bottom: 30px;
                        background: rgba(255,255,255,0.15); 
                        backdrop-filter: blur(10px);
                        padding: 25px 35px; 
                        border-radius: 15px;
                        display: inline-block;
                        max-width: 800px;">
              ${scene.content}
            </div>
            ${scene.example ? `
              <div style="font-size: 22px; line-height: 1.6; 
                          background: rgba(255,255,255,0.1); 
                          padding: 20px 30px; 
                          border-radius: 10px;
                          border-left: 4px solid #fbbf24;
                          margin-top: 20px;
                          text-align: left;">
                💡 <strong>例子：</strong>${scene.example}
              </div>
            ` : ''}
          </div>
        `;
      }
    }, 50);
  }
  
  // 自动播放
  function startAutoPlay() {
    if (isPlaying) return;
    
    isPlaying = true;
    btnPlay.innerHTML = '⏸ 暂停';
    currentIndex = 0;
    
    function playNext() {
      if (!isPlaying) return;
      
      renderScene(currentIndex);
      
      playTimer = setTimeout(() => {
        currentIndex++;
        if (currentIndex < scenes.length) {
          playNext();
        } else {
          isPlaying = false;
          btnPlay.innerHTML = '▶ 重新播放';
          showToast('🎉 视频播放完毕！', 'success');
        }
      }, 5000); // 每条5秒
    }
    
    playNext();
  }
  
  function stopPlay() {
    isPlaying = false;
    btnPlay.innerHTML = '▶ 播放';
    if (playTimer) clearTimeout(playTimer);
  }
  
  // 按钮事件
  btnPlay.addEventListener('click', () => {
    if (isPlaying) {
      stopPlay();
    } else {
      if (currentIndex >= scenes.length) currentIndex = 0;
      startAutoPlay();
    }
  });
  
  btnPrev.addEventListener('click', () => {
    if (currentIndex > 0) {
      renderScene(currentIndex - 1);
    }
  });
  
  btnNext.addEventListener('click', () => {
    if (currentIndex < scenes.length - 1) {
      renderScene(currentIndex + 1);
    }
  });
  
  // 易背诵按钮
  btnMemorable.addEventListener('click', async () => {
    btnMemorable.disabled = true;
    btnMemorable.innerHTML = '🧠 AI生成中...';
    
    try {
      const memorable = await generateMemorableVersion(
        videoData.scenes.map(s => s.content).join('\n')
      );
      
      if (memorable && memorable.mnemonics) {
        showMemorableModal(memorable);
      } else {
        showToast('生成失败，请重试', 'error');
      }
    } catch (e) {
      showToast('生成失败：' + e.message, 'error');
    } finally {
      btnMemorable.disabled = false;
      btnMemorable.innerHTML = '🧠 易背诵';
    }
  });
  
  // 初始渲染
  if (scenes.length > 0) {
    renderScene(0);
  }
  
  // 添加CSS动画
  addSmartVideoStyles();
}

// --- 显示易背诵弹窗 ---
function showMemorableModal(memorable) {
  // 创建弹窗
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 20px;
    padding: 40px;
    max-width: 700px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  `;
  
  let html = `
    <h2 style="color: #4F46E5; margin-bottom: 30px; font-size: 32px; text-align: center;">
      🧠 ${memorable.title || '记忆口诀'}
    </h2>
    <div style="margin-bottom: 30px;">
  `;
  
  memorable.mnemonics.forEach((item, i) => {
    html += `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 15px; border-left: 4px solid #4F46E5;">
        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">原始内容：</div>
        <div style="font-size: 16px; color: #333; margin-bottom: 15px;">${item.original}</div>
        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">🧠 记忆口诀：</div>
        <div style="font-size: 22px; color: #4F46E5; font-weight: bold; margin-bottom: 10px; font-style: italic;">
          ${item.mnemonic}
        </div>
        ${item.tip ? `<div style="font-size: 13px; color: #999; margin-top: 8px;">💡 ${item.tip}</div>` : ''}
      </div>
    `;
  });
  
  html += `
    </div>
    <div style="text-align: center;">
      <button onclick="this.closest('.memorable-modal').remove()" 
              style="background: #4F46E5; color: white; border: none; padding: 12px 40px; 
                     border-radius: 8px; font-size: 16px; cursor: pointer;">
        关闭
      </button>
    </div>
  `;
  
  content.innerHTML = html;
  modal.appendChild(content);
  modal.className = 'memorable-modal';
  
  document.body.appendChild(modal);
  
  // 点击背景关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// --- 初始化智能粒子效果 ---
function initSmartParticleEffect(canvas) {
  const ctx = canvas.getContext('2d');
  
  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  
  const particles = [];
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 4 + 1,
      opacity: Math.random() * 0.6 + 0.2,
      color: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'][Math.floor(Math.random() * 5)]
    });
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(')', `, ${p.opacity})`).replace('rgb', 'rgba');
      ctx.fill();
      
      // 连线效果
      particles.forEach(p2 => {
        const dist = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// --- 添加智能视频样式 ---
function addSmartVideoStyles() {
  if (document.getElementById('smart-video-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'smart-video-styles';
  style.textContent = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    #smart-video-display {
      transition: background 0.8s ease-out;
    }
  `;
  document.head.appendChild(style);
}

// --- 更新进度 ---
function updateProgress(processing, progressBar, progressText, progressDetail, value, text) {
  if (progressBar) progressBar.style.width = value + '%';
  if (progressText) progressText.textContent = value + '%';
  if (progressDetail) progressDetail.textContent = text;
}

// --- 工具函数 ---
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- 下载视频为文件 ---
async function downloadVideoAsFile() {
  if (!currentVideoData) {
    showToast('请先生成视频', 'error');
    return;
  }
  
  const display = document.getElementById('smart-video-display');
  if (!display) {
    showToast('视频播放器未找到', 'error');
    return;
  }
  
  showToast('正在准备录制视频，请等待...', 'info');
  
  // 方法1：使用 html2canvas + MediaRecorder（如果支持）
  if (typeof html2canvas !== 'undefined') {
    try {
      await downloadVideoWithHtml2Canvas(display);
      return;
    } catch (e) {
      console.error('html2canvas录制失败:', e);
    }
  }
  
  // 方法2：使用浏览器屏幕录制API
  try {
    await downloadVideoWithScreenRecord(display);
  } catch (e) {
    console.error('屏幕录制失败:', e);
    // 降级方案：导出为图片序列
    downloadVideoAsImages(display);
  }
}

// --- 使用html2canvas录制视频 ---
async function downloadVideoWithHtml2Canvas(display) {
  showToast('正在生成视频帧...', 'info');
  
  const frames = [];
  const scenes = currentVideoData.scenes || [];
  
  // 渲染所有场景并捕获帧
  for (let i = 0; i < scenes.length; i++) {
    // 触发渲染（这里简化处理，实际应该调用renderScene）
    await sleep(100);
    
    const canvas = await html2canvas(display, {
      backgroundColor: null,
      scale: 1
    });
    
    frames.push(canvas.toDataURL('image/jpeg', 0.9));
  }
  
  showToast('视频帧已生成，正在创建文件...', 'info');
  
  // 创建视频文件（使用FFmpeg.js或其他方式）
  // 由于复杂度，这里提供替代方案
  showToast('提示：由于技术限制，已生成幻灯片图片。请使用屏幕录制工具录制视频。', 'info');
  
  // 下载第一帧作为预览
  if (frames.length > 0) {
    const link = document.createElement('a');
    link.href = frames[0];
    link.download = '视频预览.jpg';
    link.click();
  }
}

// --- 诊断视频功能 ---
window.diagnoseVideo = function() {
  console.log('🔍 [视频诊断] 开始诊断...');
  
  const results = {
    pageAccess: '',
    serverStatus: '',
    buttonFound: '',
    eventBound: '',
    apiAvailable: ''
  };
  
  // 1. 检查访问方式
  if (window.location.protocol === 'file:') {
    results.pageAccess = '❌ 错误：直接打开了HTML文件\n✅ 解决：请在浏览器输入 http://localhost:8080';
  } else if (window.location.port === '8080') {
    results.pageAccess = '✅ 正确：通过 http://localhost:8080 访问';
  } else {
    results.pageAccess = `⚠️ 警告：当前访问地址是 ${window.location.origin}\n建议通过 http://localhost:8080 访问`;
  }
  
  // 2. 检查按钮是否存在
  const btnGenerate = document.getElementById('btn-generate-video-content');
  if (btnGenerate) {
    results.buttonFound = '✅ 找到生成按钮';
  } else {
    results.buttonFound = '❌ 未找到生成按钮 (btn-generate-video-content)';
  }
  
  // 3. 检查事件监听器（通过查看onclick属性）
  if (btnGenerate && btnGenerate.onclick) {
    results.eventBound = '✅ 按钮有onclick事件';
  } else if (btnGenerate && btnGenerate.addEventListener) {
    results.eventBound = '⚠️ 按钮可能已绑定事件监听器（addEventListener）';
  } else {
    results.eventBound = '❌ 按钮事件可能未绑定';
  }
  
  // 4. 显示诊断结果
  const diagnosis = `
🔍 视频功能诊断报告

1. 访问方式：
${results.pageAccess}

2. 按钮状态：
${results.buttonFound}

3. 事件绑定：
${results.eventBound}

4. 建议操作：
- 按 F12 打开控制台查看详细日志
- 按 Ctrl+F5 强制刷新页面
- 确保服务器正在运行（双击 start-server.bat）

详细日志请查看控制台（Console标签）
  `;
  
  alert(diagnosis);
  console.log('🔍 [视频诊断] 诊断结果:', results);
  
  // 测试API连接
  fetchProxy('/deepseek-proxy', {
    messages: [{ role: 'user', content: '测试' }]
  }).then(data => {
    console.log('✅ [视频诊断] API连接正常');
  }).catch(err => {
    console.error('❌ [视频诊断] API连接失败:', err.message);
    alert('⚠️ API连接失败：' + err.message + '\n请确保服务器正在运行');
  });
};

// 绑定诊断按钮事件
document.addEventListener('DOMContentLoaded', () => {
  const btnDiagnose = document.getElementById('btn-diagnose-video');
  if (btnDiagnose) {
    btnDiagnose.addEventListener('click', () => {
      window.diagnoseVideo();
    });
  }
});

async function downloadVideoWithScreenRecord(display) {
  // 检查是否支持getDisplayMedia
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('浏览器不支持屏幕录制');
  }
  
  showToast('请选择要录制的屏幕区域...', 'info');
  
  // 请求屏幕录制权限
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: 'never'
    },
    audio: false
  });
  
  // 创建MediaRecorder
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9'
  });
  
  const chunks = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };
  
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `课通视频_${new Date().toLocaleDateString('zh-CN')}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    stream.getTracks().forEach(track => track.stop());
    showToast('✅ 视频已下载', 'success');
  };
  
  // 开始录制
  mediaRecorder.start();
  showToast('正在录制...录制完成后点击停止', 'info');
  
  // 自动停止（30秒后）
  setTimeout(() => {
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  }, 30000);
}

// --- 降级方案：导出为图片 ---
function downloadVideoAsImages(display) {
  showToast('正在导出为图片...', 'info');
  
  if (typeof html2canvas !== 'undefined') {
    html2canvas(display).then(canvas => {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = '视频截图.png';
      link.click();
      showToast('✅ 截图已下载（完整视频请使用屏幕录制）', 'success');
    });
  } else {
    // 使用替代方案
    const link = document.createElement('a');
    link.href = '#';
    link.download = '视频录制说明.txt';
    link.click();
    showToast('提示：请使用浏览器扩展或OBS Studio录制屏幕', 'info');
  }
}

// --- 分享视频内容 ---
function shareVideoContent() {
  if (!currentVideoData) {
    showToast('请先生成视频', 'error');
    return;
  }
  
  // 生成分享内容
  let shareText = `【课通 · AI视频分享】\n\n`;
  shareText += `标题：${currentVideoData.title || '知识点讲解'}\n\n`;
  shareText += `内容摘要：\n`;
  
  if (currentVideoData.scenes) {
    currentVideoData.scenes.forEach((scene, i) => {
      if (scene.type === 'explain') {
        shareText += `${i + 1}. ${scene.title}：${scene.content}\n`;
      }
    });
  }
  
  shareText += `\n—— 来自「课通 · 校园AI助手」`;
  
  // 尝试使用Web Share API（移动端）
  if (navigator.share) {
    navigator.share({
      title: currentVideoData.title || '知识点讲解',
      text: shareText
    }).then(() => {
      showToast('✅ 分享成功', 'success');
    }).catch((error) => {
      console.error('分享失败:', error);
      fallbackShare(shareText);
    });
  } else {
    fallbackShare(shareText);
  }
}

// --- 降级分享方案：复制到剪贴板 ---
function fallbackShare(text) {
  // 使用Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✅ 分享内容已复制到剪贴板', 'success');
    }).catch(() => {
      // 如果Clipboard API失败，使用传统方法
      copyToClipboardFallback(text);
    });
  } else {
    copyToClipboardFallback(text);
  }
}

// --- 传统复制方法 ---
function copyToClipboardFallback(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand('copy');
    showToast('✅ 分享内容已复制到剪贴板', 'success');
  } catch (err) {
    console.error('复制失败:', err);
    showToast('复制失败，请手动复制', 'error');
  }
  
  document.body.removeChild(textarea);
}

// --- 导出视频为独立HTML文件 ---
function exportVideoAsHTML() {
  if (!currentVideoData) {
    showToast('请先生成视频', 'error');
    return;
  }
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${currentVideoData.title || '知识点讲解'}</title>
  <style>
    body { margin: 0; padding: 0; font-family: "Microsoft YaHei", sans-serif; }
    .slide { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; color: white; text-align: center; }
    .content { max-width: 800px; padding: 40px; }
    .title { font-size: 48px; font-weight: bold; margin-bottom: 30px; }
    .text { font-size: 28px; line-height: 1.8; }
  </style>
</head>
<body>
  ${currentVideoData.scenes.map((scene, i) => `
    <div class="slide" style="background: ${['#667eea', '#f093fb', '#4facfe', '#43e97b'][i % 4]};">
      <div class="content">
        <div class="title">${scene.title}</div>
        <div class="text">${scene.content}</div>
      </div>
    </div>
  `).join('')}
</body>
</html>
  `;
  
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '课通视频.html';
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('✅ HTML文件已下载（可用浏览器打开）', 'success');
}
