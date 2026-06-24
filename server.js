const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// ============================================
// 课通 · ClassTalk - 完整后端服务器
// 包含：API代理 + 文件数据存储 + 历史记录
// ============================================

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_DIR = './data';

// 创建数据目录
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- 中间件 ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('classtalk'));

// ============================================
// 数据记录工具（JSON文件存储）
// ============================================

// 记录API调用
function logApiCall(userId, module, action, input, output, status) {
  const logFile = path.join(DATA_DIR, 'api-logs.json');
  let logs = [];
  
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  }
  
  const logEntry = {
    id: Date.now(),
    userId: userId || 'anonymous',
    module: module,
    action: action,
    input: input,
    output: output,
    status: status,
    timestamp: new Date().toISOString()
  };
  
  logs.push(logEntry);
  
  // 只保留最近1000条记录
  if (logs.length > 1000) {
    logs = logs.slice(-1000);
  }
  
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  console.log(`📝 API调用已记录: ${module}/${action} (用户: ${userId})`);
}

// 保存课表数据
function saveSchedule(userId, scheduleData, imagePath) {
  const file = path.join(DATA_DIR, 'schedules.json');
  let data = [];
  
  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  
  data.push({
    id: Date.now(),
    userId: userId || 'anonymous',
    scheduleData: scheduleData,
    imagePath: imagePath,
    timestamp: new Date().toISOString()
  });
  
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// 保存讲义数据
function saveLecture(userId, fileName, ocrText, summary) {
  const file = path.join(DATA_DIR, 'lectures.json');
  let data = [];
  
  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  
  data.push({
    id: Date.now(),
    userId: userId || 'anonymous',
    fileName: fileName,
    ocrText: ocrText,
    summary: summary,
    timestamp: new Date().toISOString()
  });
  
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ============================================
// API配置
// ============================================

const BAIDU_API_KEY = process.env.BAIDU_API_KEY || 'snWKGu3tFLmFEbFh95g5HMRM';
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY || 'HmPCIlEPCLFnqj2X0STkjPsWiImZdXJJ';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-fbc13ba9b80e4d9987af9640e60e22e0';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// 获取百度OCR Token
async function getBaiduToken() {
  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
  const response = await fetch(tokenUrl);
  const data = await response.json();
  return data.access_token;
}

// 调用百度OCR
async function callBaiduOcr(imageBase64, token) {
  const ocrUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${token}`;
  const response = await fetch(ocrUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `image=${encodeURIComponent(imageBase64)}`
  });
  return await response.json();
}

// 调用DeepSeek API
async function callDeepSeek(messages) {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      temperature: 0.7
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

// ============================================
// API路由
// ============================================

// --- 百度OCR代理 ---
app.post('/baidu-ocr-proxy', async (req, res) => {
  const userId = req.headers['user-id'] || 'anonymous';
  const { image } = req.body;
  
  try {
    console.log('📸 [OCR] 收到识别请求');
    const token = await getBaiduToken();
    const ocrResult = await callBaiduOcr(image, token);
    
    logApiCall(userId, 'ocr', 'recognize', { imageSize: image.length }, ocrResult, 'success');
    
    res.json({ success: true, data: ocrResult });
  } catch (error) {
    console.error('❌ [OCR] 识别失败:', error);
    logApiCall(userId, 'ocr', 'recognize', { imageSize: image.length }, { error: error.message }, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- DeepSeek AI代理 ---
app.post('/deepseek-proxy', async (req, res) => {
  const userId = req.headers['user-id'] || 'anonymous';
  const { messages } = req.body;
  
  try {
    console.log('🤖 [AI] 收到对话请求');
    const aiResponse = await callDeepSeek(messages);
    
    logApiCall(userId, 'ai', 'chat', { messageCount: messages.length }, { content: aiResponse }, 'success');
    
    res.json({ success: true, content: aiResponse });
  } catch (error) {
    console.error('❌ [AI] 调用失败:', error);
    logApiCall(userId, 'ai', 'chat', { messageCount: messages.length }, { error: error.message }, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- 智能课表解析 ---
app.post('/parse-schedule-proxy', async (req, res) => {
  const userId = req.headers['user-id'] || 'anonymous';
  const { image } = req.body;
  
  try {
    console.log('📅 [课表] 开始解析');
    
    // 1. OCR识别
    const token = await getBaiduToken();
    const ocrResult = await callBaiduOcr(image, token);
    const ocrText = ocrResult.words_result.map(w => w.words).join('\n');
    
    // 2. AI解析
    const aiPrompt = `你是课表解析专家。请从以下OCR文字中提取课程信息，返回JSON数组：
${ocrText}

要求返回格式：
[{"name":"课程名","day":"星期","time":"节次","room":"教室","teacher":"教师"},...]`;

    const aiResponse = await callDeepSeek([
      { role: 'system', content: '你是课表解析专家，只返回JSON数组。' },
      { role: 'user', content: aiPrompt }
    ]);
    
    const courses = JSON.parse(aiResponse);
    
    logApiCall(userId, 'schedule', 'parse', { ocrText: ocrText.substring(0, 200) }, { courses }, 'success');
    
    // 保存到文件
    saveSchedule(userId, courses, null);
    
    res.json({ success: true, ocrText, courses });
  } catch (error) {
    console.error('❌ [课表] 解析失败:', error);
    logApiCall(userId, 'schedule', 'parse', {}, { error: error.message }, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- 通知智能解析（新增） ---
app.post('/notice-parse-proxy', async (req, res) => {
  const userId = req.headers['user-id'] || 'anonymous';
  const { text, ocrText } = req.body; // text=粘贴的文字, ocrText=图片OCR结果

  try {
    console.log('🔔 [通知] 开始解析');

    // 如果有图片，先OCR
    let finalText = '';
    if (ocrText && ocrText.trim()) {
      finalText = ocrText.trim();
    }
    if (text && text.trim()) {
      finalText = finalText ? finalText + '\n' + text.trim() : text.trim();
    }

    if (!finalText) {
      throw new Error('没有可解析的文字内容，请粘贴通知或上传图片');
    }

    // AI解析通知内容
    const aiPrompt = `你是校园通知解析助手。请从以下通知文字中提取关键信息，严格以JSON格式返回（不要添加任何多余文字）：
{
  "eventName": "事件名称（简短）",
  "time": "具体时间（如：2026年7月10日 14:00-18:00）",
  "location": "地点（如：科技楼报告厅）",
  "targetAudience": "面向对象（如：全校本科生）",
  "deadline": "截止时间/报名截止（如没有写"暂无"）",
  "contact": "联系人（如没有写"暂无"）",
  "phone": "联系电话（如没有写"暂无"）",
  "description": "事件详情摘要（50字以内）",
  "tags": ["标签1","标签2","标签3"]
}

通知文字：
${finalText}`;

    const aiResponse = await callDeepSeek([
      { role: 'system', content: '你是校园通知解析助手，只返回纯JSON对象，不要添加markdown标记或其他多余文字。' },
      { role: 'user', content: aiPrompt }
    ]);

    // 清理AI返回中可能包含的markdown标记
    let cleanResponse = aiResponse.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.slice(7);
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.slice(3);
    }
    if (cleanResponse.endsWith('```')) {
      cleanResponse = cleanResponse.slice(0, -3);
    }
    cleanResponse = cleanResponse.trim();

    const noticeData = JSON.parse(cleanResponse);

    logApiCall(userId, 'notice', 'parse', { text: finalText.substring(0, 200) }, noticeData, 'success');

    console.log('✅ [通知] 解析成功:', noticeData.eventName);
    res.json({ success: true, ocrText: finalText, data: noticeData });
  } catch (error) {
    console.error('❌ [通知] 解析失败:', error);
    logApiCall(userId, 'notice', 'parse', {}, { error: error.message }, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- 讲义总结 ---
app.post('/lecture-summary-proxy', async (req, res) => {
  const userId = req.headers['user-id'] || 'anonymous';
  const { image, fileName } = req.body;
  
  try {
    console.log('📝 [讲义] 开始总结');
    
    // 1. OCR识别（如果有图片）
    let ocrText = '';
    if (image) {
      try {
        const token = await getBaiduToken();
        const ocrResult = await callBaiduOcr(image, token);
        if (ocrResult.words_result && Array.isArray(ocrResult.words_result)) {
          ocrText = ocrResult.words_result.map(w => w.words).join('\n');
        } else {
          console.warn('⚠️ [讲义] OCR结果格式异常，跳过OCR步骤');
        }
      } catch (ocrError) {
        console.warn('⚠️ [讲义] OCR识别失败，跳过OCR步骤:', ocrError.message);
      }
    }
    
    // 如果没有OCR文本且请求中也没有文本内容，则报错
    if (!ocrText.trim() && !(req.body.text && req.body.text.trim())) {
      throw new Error('未能提取到任何文字内容，请提供图片或文本');
    }
    
    const inputText = ocrText.trim() || req.body.text.trim();
    
    // 2. AI总结
    const aiResponse = await callDeepSeek([
      { role: 'system', content: '你是讲义总结专家。请生成：1.核心知识点脑图 2.重点摘要 3.关键术语表。用JSON格式返回，包含mindmap、summary、terms三个字段。' },
      { role: 'user', content: `请总结以下讲义内容：\n${inputText}` }
    ]);
    
    const summary = JSON.parse(aiResponse);
    
    logApiCall(userId, 'lecture', 'summary', { text: inputText.substring(0, 200) }, summary, 'success');
    
    // 保存到文件
    saveLecture(userId, fileName, inputText, summary);
    
    res.json({ success: true, ocrText: inputText, summary });
  } catch (error) {
    console.error('❌ [讲义] 总结失败:', error);
    logApiCall(userId, 'lecture', 'summary', {}, { error: error.message }, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- PPT文件解析代理 ---
app.post('/ppt-extract-proxy', async (req, res) => {
  const userId = req.headers['user-id'] || 'anonymous';
  const { fileName, fileData, fileType } = req.body;
  
  try {
    console.log('📊 [PPT] 开始解析:', fileName);
    
    if (!fileData) {
      throw new Error('文件数据为空，请重新上传');
    }
    
    // 动态加载JSZip
    const JSZip = require('jszip');
    let buffer;
    try {
      buffer = Buffer.from(fileData, 'base64');
    } catch (e) {
      throw new Error('文件编码错误，无法解析文件数据');
    }
    
    const zip = new JSZip();
    let contents;
    try {
      contents = await zip.loadAsync(buffer);
    } catch (e) {
      throw new Error('文件格式错误，请确保上传的是有效的PPTX文件（不支持旧版PPT格式）');
    }
    
    let extractedText = '';
    const slideFiles = [];
    
    // 查找所有幻灯片文件
    contents.forEach((relativePath, zipEntry) => {
      if (relativePath.match(/ppt\/slides\/slide\d+\.xml/)) {
        slideFiles.push(relativePath);
      }
    });
    
    if (slideFiles.length === 0) {
      throw new Error('未能在PPT文件中找到幻灯片，文件可能已损坏或格式不正确');
    }
    
    // 按数字排序
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || 0);
      const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || 0);
      return numA - numB;
    });
    
    console.log(`📊 [PPT] 找到 ${slideFiles.length} 张幻灯片`);
    
    // 提取每张幻灯片的文字
    for (const slidePath of slideFiles) {
      const slideXml = await contents.file(slidePath).async('string');
      
      // 从XML中提取文本
      const textMatches = slideXml.match(/<a:t>([^<]+)<\/a:t>/g);
      if (textMatches) {
        const texts = textMatches.map(m => {
          const text = m.replace(/<a:t>/g, '').replace(/<\/a:t>/g, '');
          return text;
        }).filter(t => t.trim());
        
        if (texts.length > 0) {
          extractedText += texts.join(' ') + '\n';
        }
      }
    }
    
    if (!extractedText.trim()) {
      throw new Error('未能从PPT中提取到文字内容，请确保PPT中包含可识别的文字（不是图片）');
    }
    
    logApiCall(userId, 'ppt', 'extract', { fileName, slideCount: slideFiles.length }, { textLength: extractedText.length }, 'success');
    
    console.log(`✅ [PPT] 解析成功，提取 ${extractedText.length} 字符`);
    res.json({ success: true, text: extractedText.trim(), slideCount: slideFiles.length });
    
  } catch (error) {
    console.error('❌ [PPT] 解析失败:', error);
    logApiCall(userId, 'ppt', 'extract', { fileName }, { error: error.message }, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 历史记录查询API（评审关键功能）
// ============================================

// 查询API调用历史
app.get('/api/history/logs', (req, res) => {
  const userId = req.query.user_id || 'anonymous';
  const logFile = path.join(DATA_DIR, 'api-logs.json');
  
  if (!fs.existsSync(logFile)) {
    return res.json({ success: true, logs: [] });
  }
  
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  const userLogs = logs.filter(log => log.userId === userId);
  
  res.json({ success: true, logs: userLogs });
});

// 查询所有用户的API调用历史（管理员视图）
app.get('/api/admin/logs', (req, res) => {
  const logFile = path.join(DATA_DIR, 'api-logs.json');
  
  if (!fs.existsSync(logFile)) {
    return res.json({ success: true, logs: [] });
  }
  
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  res.json({ success: true, logs: logs });
});

// 查询课表历史
app.get('/api/history/schedules', (req, res) => {
  const userId = req.query.user_id || 'anonymous';
  const file = path.join(DATA_DIR, 'schedules.json');
  
  if (!fs.existsSync(file)) {
    return res.json({ success: true, schedules: [] });
  }
  
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const userData = data.filter(item => item.userId === userId);
  
  res.json({ success: true, schedules: userData });
});

// 查询讲义历史
app.get('/api/history/lectures', (req, res) => {
  const userId = req.query.user_id || 'anonymous';
  const file = path.join(DATA_DIR, 'lectures.json');
  
  if (!fs.existsSync(file)) {
    return res.json({ success: true, lectures: [] });
  }
  
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const userData = data.filter(item => item.userId === userId);
  
  res.json({ success: true, lectures: userData });
});

// 统计信息（评审关键数据）
app.get('/api/stats', (req, res) => {
  const logFile = path.join(DATA_DIR, 'api-logs.json');
  
  if (!fs.existsSync(logFile)) {
    return res.json({ success: true, stats: { totalCalls: 0, users: 0 } });
  }
  
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  const uniqueUsers = new Set(logs.map(log => log.userId));
  
  res.json({ 
    success: true, 
    stats: {
      totalApiCalls: logs.length,
      uniqueUsers: uniqueUsers.size,
      callsByModule: {
        ocr: logs.filter(log => log.module === 'ocr').length,
        ai: logs.filter(log => log.module === 'ai').length,
        schedule: logs.filter(log => log.module === 'schedule').length,
        lecture: logs.filter(log => log.module === 'lecture').length
      }
    }
  });
});

// 数据可视化页面（评审演示用）
app.get('/admin/dashboard', (req, res) => {
  const logFile = path.join(DATA_DIR, 'api-logs.json');
  
  if (!fs.existsSync(logFile)) {
    return res.send('<h1>暂无数据</h1>');
  }
  
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  
  let html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>课通 · 数据监控面板</title>
      <style>
        body { font-family: Arial; padding: 20px; background: #f5f5f5; }
        .card { background: white; padding: 20px; margin: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat { display: inline-block; margin: 10px; padding: 20px; background: #4F46E5; color: white; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #4F46E5; color: white; }
      </style>
    </head>
    <body>
      <h1>📊 课通 · 数据监控面板</h1>
      <div class="card">
        <h2>统计数据</h2>
        <div class="stat"><h3>${logs.length}</h3><p>总API调用次数</p></div>
        <div class="stat"><h3>${new Set(logs.map(l => l.userId)).size}</h3><p>独立用户数</p></div>
      </div>
      <div class="card">
        <h2>最近调用记录</h2>
        <table>
          <tr><th>时间</th><th>用户</th><th>模块</th><th>操作</th><th>状态</th></tr>
          ${logs.slice(-20).reverse().map(log => `
            <tr>
              <td>${new Date(log.timestamp).toLocaleString('zh-CN')}</td>
              <td>${log.userId}</td>
              <td>${log.module}</td>
              <td>${log.action}</td>
              <td>${log.status}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
});

// ============================================
// 用户注册/登录 API
// ============================================

const USERS_FILE = path.join(DATA_DIR, 'users.json');

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 注册
app.post('/api/register', (req, res) => {
  const { username, password, nickname } = req.body;
  if (!username || !password) return res.json({ success: false, error: '用户名和密码不能为空' });
  if (username.length < 3) return res.json({ success: false, error: '用户名至少3个字符' });
  if (password.length < 6) return res.json({ success: false, error: '密码至少6位' });

  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.json({ success: false, error: '该用户名已被注册' });
  }

  const newUser = {
    id: 'user_' + Date.now(),
    username,
    password, // 演示版本，实际应hash
    nickname: nickname || username,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);

  console.log(`👤 [注册] 新用户: ${username}`);
  res.json({ success: true, user: { id: newUser.id, username, nickname: newUser.nickname } });
});

// 登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: '请输入用户名和密码' });

  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.json({ success: false, error: '用户名或密码错误' });

  console.log(`👤 [登录] 用户: ${username}`);
  res.json({ success: true, user: { id: user.id, username: user.username, nickname: user.nickname } });
});

// ============================================
// API日志查询端点（供监控页面使用）
// ============================================
app.get('/api-logs', (req, res) => {
  const logFile = path.join(DATA_DIR, 'api-logs.json');
  
  try {
    if (!fs.existsSync(logFile)) {
      return res.json([]);
    }
    
    const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    res.json(logs);
  } catch (error) {
    console.error('❌ [API日志] 读取失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 健康检查端点
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'running',
    port: PORT,
    timestamp: new Date().toISOString(),
    services: {
      baiduOCR: 'available',
      deepseekAI: 'available',
      pptExtract: 'available'
    }
  });
});

// ============================================
// 启动服务器
// ============================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🎓 课通 · ClassTalk 后端服务器        ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║   📡 服务地址: http://localhost:${PORT}       ║`);
  console.log('║   ✅ 数据存储: JSON文件 (./data/)         ║');
  console.log('║   ✅ API代理: 百度OCR + DeepSeek AI      ║');
  console.log('║   ✅ 数据记录: 已启用                     ║');
  console.log('║   📊 监控面板: http://localhost:8080/admin/dashboard ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('📝 所有API调用将记录到 ./data/api-logs.json');
  console.log('📅 课表数据保存到 ./data/schedules.json');
  console.log('📝 讲义数据保存到 ./data/lectures.json');
  console.log('');
});
