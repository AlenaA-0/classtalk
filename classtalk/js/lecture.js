// ====================================
// 课通 · ClassTalk - 讲义总结模块（支持PDF/PPT/图片）
// ====================================

// --- 当前已选讲义文件列表 ---
let currentLectureFiles = [];

// --- 当前讲义总结结果（用于导出） ---
let currentLectureSummary = null;
let currentLectureFileName = '';

// --- 支持的文件类型 ---
const SUPPORTED_FILE_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/bmp': 'image',
  'image/webp': 'image'
};

// --- 显示已选文件列表 ---
function showLectureFileList(files) {
  // 先验证文件类型
  const validFiles = [];
  const invalidFiles = [];
  const pptFiles = []; // 旧版.ppt文件
  
  files.forEach(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    
    // 检查是否是旧版.ppt文件
    if (ext === 'ppt' && !file.type.includes('openxmlformats')) {
      pptFiles.push(file.name);
      return;
    }
    
    // 检查是否支持
    if (['pdf', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
      validFiles.push(file);
    } else {
      invalidFiles.push(file.name);
    }
  });
  
  // 显示警告信息
  if (pptFiles.length > 0) {
    showToast(`⚠️ 不支持旧版.ppt格式：${pptFiles.join(', ')}。请转为.pptx或PDF后重新上传`, 'error');
  }
  
  if (invalidFiles.length > 0) {
    showToast(`不支持的文件：${invalidFiles.join(', ')}。仅支持PDF、PPTX、JPG、PNG格式`, 'error');
  }
  
  if (validFiles.length === 0) {
    return; // 没有有效文件，直接返回
  }
  
  // 继续处理有效文件
  currentLectureFiles = validFiles;
  const fileListSection = document.getElementById('lecture-file-list');
  const fileListUl = document.getElementById('lecture-ul');
  if (!fileListSection || !fileListUl) return;

  fileListUl.innerHTML = '';
  validFiles.forEach((file, index) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    
    // 根据文件类型显示不同图标
    let icon = '📄';
    if (file.type.includes('pdf')) icon = '📕';
    else if (file.type.includes('powerpoint') || file.type.includes('presentation')) icon = '📊';
    else if (file.type.startsWith('image/')) icon = '🖼️';
    
    li.innerHTML = `
      <span class="file-icon">${icon}</span>
      <span class="file-name">${file.name}</span>
      <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
    `;
    fileListUl.appendChild(li);
  });

  fileListSection.style.display = 'block';
}

// --- 将文件转为 base64 ---
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- 从PDF文件中提取文字 ---
async function extractTextFromPDF(file) {
  showToast('正在提取PDF文字...', 'info');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    showToast('✅ PDF文字提取成功', 'success');
    return fullText.trim();
  } catch (error) {
    console.error('PDF提取失败:', error);
    throw new Error('PDF文字提取失败：' + error.message);
  }
}

// --- 从PPT文件中提取内容（发送到服务器处理） ---
async function extractContentFromPPT(file) {
  showToast('正在处理PPT文件...', 'info');
  
  try {
    const base64 = await fileToBase64(file);
    
    // 发送到服务器处理
    const response = await fetchProxy('/ppt-extract-proxy', {
      fileName: file.name,
      fileData: base64,
      fileType: file.type
    });
    
    if (response.success) {
      showToast('✅ PPT内容提取成功', 'success');
      return response.text;
    } else {
      throw new Error(response.error || 'PPT处理失败');
    }
  } catch (error) {
    console.error('PPT提取失败:', error);
    // 显示详细错误信息，帮助调试
    const errorMsg = error.message || '未知错误';
    throw new Error(`PPT处理失败：${errorMsg}。请将PPT转为PDF后重新上传，或截图PPT页面上传`);
  }
}

// --- 讲义总结主流程 ---
async function handleLectureSummarize() {
  if (currentLectureFiles.length === 0) {
    showToast('请先选择讲义文件', 'error');
    return;
  }

  const processing = document.getElementById('lecture-processing');
  const resultsSection = document.getElementById('lecture-results');
  const fileListSection = document.getElementById('lecture-file-list');
  const uploadArea = document.getElementById('lecture-upload-area');

  // 显示处理状态
  if (uploadArea) uploadArea.style.display = 'none';
  if (fileListSection) fileListSection.style.display = 'none';
  if (resultsSection) resultsSection.style.display = 'none';
  if (processing) processing.style.display = 'block';

  // 激活步骤动画
  const stepOcr = document.getElementById('step-ocr');
  const stepSummary = document.getElementById('step-summary');
  if (stepOcr) stepOcr.classList.add('active');
  if (stepSummary) stepSummary.classList.remove('active');

  try {
    let allText = '';
    let fileName = currentLectureFiles[0].name;

    // 处理每个文件
    for (const file of currentLectureFiles) {
      showToast(`正在处理：${file.name}`, 'info');
      
      const fileType = file.type;
      
      if (fileType.includes('pdf')) {
        // PDF文件：提取文字
        const pdfText = await extractTextFromPDF(file);
        allText += pdfText + '\n\n';
      } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
        // PPT文件：发送到服务器处理
        const pptText = await extractContentFromPPT(file);
        allText += pptText + '\n\n';
      } else if (fileType.startsWith('image/')) {
        // 图片文件：OCR识别
        if (stepOcr) stepOcr.classList.add('active');
        const imageBase64 = await fileToBase64(file);
        const ocrData = await fetchProxy('/baidu-ocr-proxy', { image: imageBase64 });
        const ocrText = ocrData.data.words_result.map(w => w.words).join('\n');
        allText += ocrText + '\n\n';
      } else {
        throw new Error(`不支持的文件类型：${fileType}`);
      }
    }

    if (!allText.trim()) {
      throw new Error('未能提取到任何文字内容');
    }

    // OCR完成
    if (stepOcr) {
      stepOcr.classList.remove('active');
      stepOcr.classList.add('completed');
    }
    if (stepSummary) stepSummary.classList.add('active');

    // 调用AI总结
    showToast('正在调用AI生成总结...', 'info');
    const summary = await callDeepSeekForLecture(allText, fileName);

    // 保存到当前结果
    currentLectureSummary = summary;
    currentLectureFileName = fileName;

    // 保存到服务器
    try {
      await fetchProxy('/lecture-summary-proxy', {
        fileName: fileName,
        ocrText: allText.substring(0, 1000), // 只保存前1000字符
        summary: summary
      });
    } catch (e) {
      console.warn('保存到服务器失败:', e);
    }

    // 渲染结果
    renderLectureResults(summary, fileName);

    // 显示结果
    if (processing) processing.style.display = 'none';
    if (resultsSection) resultsSection.style.display = 'block';
    if (stepSummary) {
      stepSummary.classList.remove('active');
      stepSummary.classList.add('completed');
    }

    showToast('✅ 讲义总结完成！', 'success');

  } catch (error) {
    console.error('讲义总结失败:', error);
    if (processing) processing.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
    if (fileListSection) fileListSection.style.display = 'block';
    showToast('总结失败：' + error.message, 'error');
  }
}

// --- 调用DeepSeek AI生成讲义总结 ---
async function callDeepSeekForLecture(text, fileName) {
  const prompt = `你是一位专业的讲义总结助手。请对以下讲义内容进行分析和总结。

文件名：${fileName}

讲义内容：
${text}

请严格按照以下JSON格式返回（只返回JSON，不要添加其他文字）：
{
  "title": "总结标题（简洁明确，不超过20字）",
  "mindmap": "核心知识点脑图（Markdown格式，使用# ## ### 表示层级）",
  "summary": "重点摘要（用数字编号列表，每条一行，简洁明了）",
  "terms": [
    {"term": "关键术语1", "definition": "术语解释"},
    {"term": "关键术语2", "definition": "术语解释"}
  ]
}

要求：
1. mindmap用Markdown格式，清晰展示知识点层级关系
2. summary提取5-8个重点，简洁易懂
3. terms提取3-5个核心术语
4. 内容要准确、简洁、易懂`;

  const aiResponse = await fetchProxy('/deepseek-proxy', {
    messages: [
      { role: 'system', content: '你是专业的讲义总结助手，擅长提取核心知识点。只返回JSON格式。' },
      { role: 'user', content: prompt }
    ]
  });

  const content = aiResponse.content;
  
  // 提取JSON
  let jsonStr = content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  return JSON.parse(jsonStr);
}

// --- 渲染讲义总结结果 ---
function renderLectureResults(summary, fileName) {
  // 文件信息
  const fileInfo = document.getElementById('lecture-file-info');
  if (fileInfo) {
    fileInfo.innerHTML = `📄 文件：${fileName}`;
  }

  const meta = document.getElementById('lecture-meta');
  if (meta) {
    meta.textContent = `生成时间：${new Date().toLocaleString('zh-CN')} | AI生成`;
  }

  // 脑图
  const mindmapContent = document.getElementById('mindmap-content');
  if (mindmapContent && summary.mindmap) {
    mindmapContent.innerHTML = renderMindmapHtml(summary.mindmap);
  }

  // 重点摘要
  const summaryContent = document.getElementById('summary-content');
  if (summaryContent && summary.summary) {
    const points = summary.summary.split('\n').filter(l => l.trim());
    summaryContent.innerHTML = '<ol>' + points.map(p => `<li>${p.replace(/^\d+\.?\s*/, '')}</li>`).join('') + '</ol>';
  }

  // 术语表
  const termsContent = document.getElementById('terms-content');
  if (termsContent && summary.terms) {
    termsContent.innerHTML = '<table class="terms-table"><tr><th>术语</th><th>解释</th></tr>' +
      summary.terms.map(t => `<tr><td>${t.term}</td><td>${t.definition}</td></tr>`).join('') +
      '</table>';
  }
}

// --- 将脑图文本渲染为HTML ---
function renderMindmapHtml(mindmapText) {
  const lines = mindmapText.split('\n').filter(l => l.trim());
  let html = '<div class="mindmap-tree">';

  lines.forEach(line => {
    const trimmed = line.trim();
    let level = 0;
    if (trimmed.startsWith('###')) level = 3;
    else if (trimmed.startsWith('##')) level = 2;
    else if (trimmed.startsWith('#')) level = 1;
    else level = 4;

    const text = trimmed.replace(/^#+\s*/, '');

    if (level === 1) {
      html += `<div class="mm-root">${text}</div>`;
    } else if (level === 2) {
      html += `<div class="mm-branch">▸ ${text}</div>`;
    } else {
      html += `<div class="mm-leaf">• ${text}</div>`;
    }
  });

  html += '</div>';
  return html;
}

// --- 导出为 Markdown 文件 ---
function exportLectureAsMarkdown() {
  if (!currentLectureSummary) {
    showToast('请先生成讲义总结', 'error');
    return;
  }

  const { title, mindmap, summary, terms } = currentLectureSummary;
  const fileName = currentLectureFileName || '讲义总结';

  let md = `# ${title || '讲义总结'}\n\n`;
  md += `> 来源文件：${fileName}  \n`;
  md += `> 生成时间：${new Date().toLocaleString('zh-CN')}  \n`;
  md += `> 由「课通 · 校园AI助手」生成\n\n`;
  md += `---\n\n`;
  md += `## 核心知识点脑图\n\n`;
  md += (mindmap || '').trim() + '\n\n';
  md += `---\n\n`;
  md += `## 重点摘要\n\n`;
  const summaryPoints = (summary || '').split('\n').filter(l => l.trim());
  summaryPoints.forEach((p, i) => {
    const clean = p.replace(/^\d+\.?\s*/, '');
    md += `${i + 1}. ${clean}\n`;
  });
  md += '\n---\n\n';
  md += `## 关键术语表\n\n`;
  md += `| 术语 | 解释 |\n`;
  md += `| --- | --- |\n`;
  (terms || []).forEach(t => {
    md += `| ${t.term} | ${t.definition} |\n`;
  });
  md += '\n';

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(title || '讲义总结').replace(/[<>:"/\\|?*]+/g, '_').substring(0, 100)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Markdown 文件已导出', 'success');
}

// --- 导出为 PDF ---
function exportLectureAsPdf() {
  if (!currentLectureSummary) {
    showToast('请先生成讲义总结', 'error');
    return;
  }

  const { title, mindmap, summary, terms } = currentLectureSummary;
  const fileName = currentLectureFileName || '讲义总结';

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const summaryHtml = (summary || '').split('\n').filter(l => l.trim()).map(p =>
    `<li>${escapeHtml(p.replace(/^\d+\.?\s*/, ''))}</li>`
  ).join('');

  const termsHtml = (terms || []).map(t =>
    `<tr><td>${escapeHtml(t.term)}</td><td>${escapeHtml(t.definition)}</td></tr>`
  ).join('');

  const printWindow = window.open('', '_blank');
  printWindow.document.write('<!DOCTYPE html>');
  printWindow.document.write('<html lang="zh-CN"><head>');
  printWindow.document.write('<meta charset="UTF-8">');
  printWindow.document.write(`<title>${(title || '讲义总结').replace(/</g, '&lt;')}</title>`);
  printWindow.document.write('<style>');
  printWindow.document.write('body{font-family:"Noto Sans SC","Microsoft YaHei",sans-serif;padding:40px;color:#333;max-width:900px;margin:0 auto;}');
  printWindow.document.write('h1{color:#4F46E5;border-bottom:2px solid #4F46E5;padding-bottom:10px;}');
  printWindow.document.write('h2{color:#6366F1;margin-top:30px;border-left:4px solid #6366F1;padding-left:10px;}');
  printWindow.document.write('blockquote{background:#f8f9fa;border-left:4px solid #4F46E5;padding:10px 15px;margin:10px 0;color:#666;font-size:14px;}');
  printWindow.document.write('ol{padding-left:20px;}');
  printWindow.document.write('li{margin:6px 0;line-height:1.6;}');
  printWindow.document.write('table{border-collapse:collapse;width:100%;margin:15px 0;}');
  printWindow.document.write('th{background:#4F46E5;color:white;padding:10px;text-align:left;}');
  printWindow.document.write('td{border:1px solid #ddd;padding:8px 10px;}');
  printWindow.document.write('tr:nth-child(even){background:#f8f9fa;}');
  printWindow.document.write('.mindmap{background:#f0f4ff;padding:15px;border-radius:8px;white-space:pre-wrap;font-family:monospace;line-height:1.8;}');
  printWindow.document.write('.footer{margin-top:50px;text-align:center;color:#999;font-size:12px;}');
  printWindow.document.write('@media print{body{padding:20px;}h1{page-break-after:avoid;}h2{page-break-after:avoid;}table{page-break-inside:avoid;}}');
  printWindow.document.write('</style></head><body>');

  printWindow.document.write(`<h1>📄 ${escapeHtml(title || '讲义总结')}</h1>`);
  printWindow.document.write('<blockquote>');
  printWindow.document.write(`来源文件：${escapeHtml(fileName)}<br>`);
  printWindow.document.write(`生成时间：${new Date().toLocaleString('zh-CN')}<br>`);
  printWindow.document.write('由「课通 · 校园AI助手」生成');
  printWindow.document.write('</blockquote>');

  printWindow.document.write('<h2>核心知识点脑图</h2>');
  printWindow.document.write(`<div class="mindmap">${escapeHtml(mindmap)}</div>`);

  printWindow.document.write('<h2>重点摘要</h2>');
  printWindow.document.write('<ol>' + summaryHtml + '</ol>');

  printWindow.document.write('<h2>关键术语表</h2>');
  printWindow.document.write('<table><tr><th>术语</th><th>解释</th></tr>' + termsHtml + '</table>');

  printWindow.document.write(`<div class="footer">课通 · 校园AI助手 | ${new Date().toLocaleDateString('zh-CN')}</div>`);
  printWindow.document.write('</body></html>');

  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 800);

  showToast('正在打开打印窗口，请选择"保存为PDF"', 'info');
}

// --- 初始化讲义模块的按钮事件 ---
function initLectureModule() {
  // 上传区域点击事件
  const uploadArea = document.getElementById('lecture-upload-area');
  const fileInput = document.getElementById('lecture-file-input');

  if (uploadArea && fileInput) {
    // 支持的文件类型
    fileInput.accept = '.pdf,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.webp';

    uploadArea.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.style.borderColor = '#4F46E5';
      uploadArea.style.background = '#f0f4ff';
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.style.borderColor = '#c6d4f7';
      uploadArea.style.background = '';
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.style.borderColor = '#c6d4f7';
      uploadArea.style.background = '';
      
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(f => {
        const ext = f.name.split('.').pop().toLowerCase();
        return ['pdf', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
      });
      
      if (validFiles.length > 0) {
        showLectureFileList(validFiles);
      } else {
        showToast('请上传PDF、PPT或图片文件', 'error');
      }
    });

    fileInput.addEventListener('change', (e) => {
      e.stopPropagation();
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        showLectureFileList(files);
      }
    });
  }

  // 开始总结按钮
  const btnStart = document.getElementById('btn-start-summarize');
  if (btnStart) {
    btnStart.addEventListener('click', (e) => {
      e.stopPropagation();
      handleLectureSummarize();
    });
  }

  // 重新上传按钮
  const btnReupload = document.getElementById('btn-reupload');
  if (btnReupload) {
    btnReupload.addEventListener('click', (e) => {
      e.stopPropagation();
      const processing = document.getElementById('lecture-processing');
      const resultsSection = document.getElementById('lecture-results');
      const fileListSection = document.getElementById('lecture-file-list');
      const uploadArea = document.getElementById('lecture-upload-area');

      if (processing) processing.style.display = 'none';
      if (resultsSection) resultsSection.style.display = 'none';
      if (fileListSection) fileListSection.style.display = 'none';
      if (uploadArea) uploadArea.style.display = 'block';

      // 重置步骤状态
      const stepOcr = document.getElementById('step-ocr');
      const stepSummary = document.getElementById('step-summary');
      if (stepOcr) {
        stepOcr.classList.remove('active', 'completed');
      }
      if (stepSummary) {
        stepSummary.classList.remove('active', 'completed');
      }
    });
  }

  // 导出Markdown按钮
  const btnExportMd = document.getElementById('btn-export-md');
  if (btnExportMd) {
    btnExportMd.addEventListener('click', exportLectureAsMarkdown);
  }

  // 导出PDF按钮
  const btnExportPdf = document.getElementById('btn-export-pdf');
  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', exportLectureAsPdf);
  }

  // 生成讲解视频按钮（关键修复！）
  const btnGenerateVideo = document.getElementById('btn-generate-video');
  if (btnGenerateVideo) {
    console.log('🎬 [讲义] 找到"生成讲解视频"按钮，绑定事件');
    btnGenerateVideo.addEventListener('click', () => {
      console.log('🎬 [讲义] 点击"生成讲解视频"按钮');
      
      // 获取当前讲义总结的内容
      const summaryContent = currentLectureSummary;
      if (!summaryContent) {
        showToast('请先完成讲义总结', 'error');
        return;
      }
      
      // 将总结内容保存到全局变量
      window.currentLectureSummary = summaryContent;
      
      // 跳转到视频页面
      const videoTab = document.querySelector('[data-tab="video"]');
      if (videoTab) {
        videoTab.click();
        
        // 等待页面切换完成后，填充内容到视频输入框
        setTimeout(() => {
          const videoTextInput = document.getElementById('video-text-input');
          if (videoTextInput) {
            // 填充总结内容
            const content = summaryContent.summary || JSON.stringify(summaryContent, null, 2);
            videoTextInput.value = content;
            showToast('✅ 已跳转到视频页面，正在生成视频...', 'success');
            
            // 自动点击生成视频按钮
            const btnGenerate = document.getElementById('btn-generate-video-content');
            if (btnGenerate) {
              setTimeout(() => {
                btnGenerate.click();
              }, 500);
            }
          }
        }, 300);
      }
    });
  } else {
    console.warn('⚠️ [讲义] 未找到"生成讲解视频"按钮 (btn-generate-video)');
  }
}

// 初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLectureModule);
} else {
  initLectureModule();
}
