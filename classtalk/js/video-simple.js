// ====================================
// 课通 · ClassTalk - AI视频生成模块（简化版）
// ====================================

console.log('🎬 [视频] 加载视频模块...');

// 全局变量
let currentVideoData = null;

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
  console.log('🎬 [视频] DOM加载完成，开始初始化...');
  initVideoModule();
});

function initVideoModule() {
  console.log('🎬 [视频] 初始化视频模块...');
  
  // 绑定生成按钮事件
  const btnGenerate = document.getElementById('btn-generate-video-content');
  if (btnGenerate) {
    console.log('✅ [视频] 找到生成按钮');
    
    // 使用onclick直接绑定（最简单可靠的方式）
    btnGenerate.onclick = function() {
      console.log('🎬 [视频] 点击生成按钮');
      handleVideoGenerate();
    };
    
    console.log('✅ [视频] 按钮事件已绑定');
  } else {
    console.error('❌ [视频] 未找到生成按钮！');
  }
  
  // 绑定下载按钮
  const btnDownload = document.getElementById('btn-download-video');
  if (btnDownload) {
    btnDownload.onclick = function() {
      console.log('🎬 [视频] 点击下载按钮');
      downloadVideo();
    };
  }
  
  // 绑定分享按钮
  const btnShare = document.getElementById('btn-share-video');
  if (btnShare) {
    btnShare.onclick = function() {
      console.log('🎬 [视频] 点击分享按钮');
      shareVideo();
    };
  }
  
  console.log('🎬 [视频] 初始化完成');
}

// 处理视频生成
async function handleVideoGenerate() {
  console.log('🎬 [视频] 开始生成视频...');
  
  // 获取输入内容
  const textarea = document.getElementById('video-text-input');
  const content = textarea.value.trim();
  
  if (!content) {
    alert('请先输入知识点内容！');
    return;
  }
  
  console.log('📝 [视频] 知识点内容：', content.substring(0, 50) + '...');
  
  // 显示处理状态
  const processing = document.getElementById('video-processing');
  const result = document.getElementById('video-result');
  
  if (processing) processing.style.display = 'block';
  if (result) result.style.display = 'none';
  
  // 模拟生成过程
  try {
    console.log('⏳ [视频] 正在生成...');
    
    // 模拟AI处理
    await sleep(2000);
    
    console.log('✅ [视频] 生成完成');
    
    // 隐藏处理状态，显示结果
    if (processing) processing.style.display = 'none';
    if (result) result.style.display = 'block';
    
    // 显示成功消息
    alert('✅ 视频生成成功！\n\n（这是简化版演示，实际应该调用AI生成真实视频）');
    
  } catch (error) {
    console.error('❌ [视频] 生成失败：', error);
    alert('❌ 生成失败：' + error.message);
    
    if (processing) processing.style.display = 'none';
  }
}

// 下载视频
function downloadVideo() {
  console.log('📥 [视频] 开始下载...');
  alert('📥 下载功能演示\n\n实际应该下载生成的视频文件');
}

// 分享视频
function shareVideo() {
  console.log('🔗 [视频] 开始分享...');
  alert('🔗 分享功能演示\n\n实际应该生成分享链接');
}

// 工具函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('🎬 [视频] 视频模块加载完成');
