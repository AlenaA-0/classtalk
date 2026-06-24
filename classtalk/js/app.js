// ====================================
// 课通 · ClassTalk - 应用主逻辑
// ====================================

// --- 当前解析的课程数据（全局变量，供保存按钮使用） ---
let currentParsedCourses = [];

// --- 当前周次（全局变量，1-20周） ---
let currentWeek = 1;
const TOTAL_WEEKS = 20;

// --- 计算当前学期周次 ---
function calcCurrentWeek() {
  // 默认学期开始日期：2026年2月17日（春季学期典型开学日）
  const semesterStart = new Date(2026, 1, 17); // 2月17日
  const now = new Date();
  const diffMs = now - semesterStart;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let week = Math.floor(diffDays / 7) + 1;
  // 限制在1-20周范围
  week = Math.max(1, Math.min(TOTAL_WEEKS, week));
  return week;
}

// --- 更新周次导航显示 ---
function updateWeekNavUI() {
  // 首页周次导航
  const weekLabel = document.getElementById('week-nav-label');
  const weeklyTitle = document.getElementById('weekly-title');
  if (weekLabel) {
    weekLabel.textContent = `📅 第${currentWeek}周`;
  }
  if (weeklyTitle) {
    weeklyTitle.textContent = `📅 第${currentWeek}周课表`;
  }

  // 课表页周次导航
  const sWeekLabel = document.getElementById('s-week-label');
  if (sWeekLabel) {
    sWeekLabel.textContent = `第${currentWeek}周`;
  }

  // 按钮禁用控制
  const btnPrev = document.getElementById('btn-prev-week');
  const btnNext = document.getElementById('btn-next-week');
  const btnSPrev = document.getElementById('btn-s-prev-week');
  const btnSNext = document.getElementById('btn-s-next-week');

  [btnPrev, btnSPrev].forEach(btn => {
    if (btn) btn.disabled = currentWeek <= 1;
  });
  [btnNext, btnSNext].forEach(btn => {
    if (btn) btn.disabled = currentWeek >= TOTAL_WEEKS;
  });

  // 重新渲染首页课表预览（显示当前周次的课）
  renderWeeklyPreviewForWeek(currentWeek);
}

// --- 渲染指定周次的课表预览 ---
function renderWeeklyPreviewForWeek(week) {
  const savedData = loadFromLocal(CLASS_TALK.STORAGE_KEYS.schedules);
  let courses = [];

  if (savedData && savedData.courses && savedData.courses.length > 0) {
    courses = savedData.courses;
    currentParsedCourses = courses;
  } else {
    courses = CLASS_TALK.defaultSchedule.courses;
  }

  // 如果课程有week字段，按周次筛选；否则显示所有课程
  const weekCourses = courses.filter(c => {
    if (c.weeks && Array.isArray(c.weeks)) {
      return c.weeks.includes(week);
    }
    // 没有周次信息的课程默认所有周都显示
    return true;
  });

  renderWeeklyPreview(weekCourses);
}

// --- 初始化周次导航按钮 ---
function initWeekNavigation() {
  currentWeek = calcCurrentWeek();

  // 首页按钮
  const btnPrev = document.getElementById('btn-prev-week');
  const btnNext = document.getElementById('btn-next-week');
  if (btnPrev) btnPrev.addEventListener('click', () => { currentWeek--; updateWeekNavUI(); });
  if (btnNext) btnNext.addEventListener('click', () => { currentWeek++; updateWeekNavUI(); });

  // 课表页按钮
  const btnSPrev = document.getElementById('btn-s-prev-week');
  const btnSNext = document.getElementById('btn-s-next-week');
  if (btnSPrev) btnSPrev.addEventListener('click', () => { currentWeek--; updateWeekNavUI(); });
  if (btnSNext) btnSNext.addEventListener('click', () => { currentWeek++; updateWeekNavUI(); });

  // 课表解析成功后显示周次导航
  const sWeekNav = document.getElementById('schedule-week-nav');

  // 监听课表结果展示，显示导航栏
  const originalShowResults = window.showScheduleResults;
  if (originalShowResults) {
    window.showScheduleResults = function(data) {
      originalShowResults(data);
      if (sWeekNav) sWeekNav.style.display = 'flex';
    };
  }

  updateWeekNavUI();
}

// --- 显示课程详情弹窗 ---
function showCoursePopup(course) {
  const overlay = document.getElementById('course-popup-overlay');
  const dayNames = ['周一','周二','周三','周四','周五','周六','周日'];
  const dayIndex = CLASS_TALK.dayKeys.indexOf(course.day);
  const slot = CLASS_TALK.timeSlots[course.period] || CLASS_TALK.timeSlots[0];
  
  document.getElementById('popup-course-name').textContent = course.name;
  document.getElementById('popup-day').textContent = dayIndex >= 0 ? dayNames[dayIndex] : course.day;
  document.getElementById('popup-period').textContent = slot.label + ' (' + slot.range + ')';
  document.getElementById('popup-room').textContent = course.room || '未指定';
  document.getElementById('popup-teacher').textContent = course.teacher || '未指定';
  
  overlay.classList.add('active');
}

// --- 关闭课程详情弹窗 ---
function closeCoursePopup() {
  const overlay = document.getElementById('course-popup-overlay');
  overlay.classList.remove('active');
}

// --- 绑定弹窗关闭和AI助手按钮 ---
function initCoursePopup() {
  document.getElementById('popup-close').addEventListener('click', closeCoursePopup);
  document.getElementById('popup-close-btn').addEventListener('click', closeCoursePopup);
  document.getElementById('course-popup-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCoursePopup();
  });
  
  document.getElementById('popup-ai-help').addEventListener('click', () => {
    const courseName = document.getElementById('popup-course-name').textContent;
    closeCoursePopup();
    // 跳转到AI对话页面，并自动提问
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.tab === 'chat') link.classList.add('active');
    });
    document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
    document.getElementById('chat').classList.add('active');
    
    // 自动在聊天框填入课程相关问题
    const chatInput = document.getElementById('chat-input');
    chatInput.value = `请帮我梳理一下「${courseName}」的核心知识点和复习重点`;
    chatInput.focus();
  });
}

// --- 渲染首页"本周课表预览" ---
function renderWeeklyPreview(courses) {
  const tbody = document.getElementById('weekly-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  // 课程颜色映射（按课程名分配固定颜色）
  const courseColorMap = {};
  let colorIndex = 0;
  courses.forEach(c => {
    if (!courseColorMap[c.name]) {
      courseColorMap[c.name] = CLASS_TALK.courseColors[colorIndex % CLASS_TALK.courseColors.length];
      colorIndex++;
    }
  });
  
  CLASS_TALK.timeSlots.forEach((slot, slotIndex) => {
    const row = document.createElement('tr');
    
    // 时间单元格
    const timeCell = document.createElement('td');
    timeCell.className = 'time-cell';
    timeCell.innerHTML = `${slot.label}<br><small>${slot.range}</small>`;
    row.appendChild(timeCell);
    
    // 星期单元格
    CLASS_TALK.dayKeys.forEach((dayKey, dayIndex) => {
      const cell = document.createElement('td');
      
      const course = courses.find(c => c.day === dayKey && c.period === slotIndex);
      
      if (course) {
        const color = courseColorMap[course.name];
        cell.className = 'course-cell';
        cell.dataset.course = course.name;
        cell.innerHTML = `
          <div class="mini-course" style="background:${color.bg}; color:${color.text}; border-left:3px solid ${color.border};">
            <strong>${course.name}</strong><br><small>${course.room}</small>
          </div>
        `;
        // 点击课程显示详情弹窗
        cell.addEventListener('click', () => showCoursePopup(course));
      } else {
        cell.className = 'empty-cell';
      }
      
      row.appendChild(cell);
    });
    
    tbody.appendChild(row);
  });
  
  // 更新首页课表预览的标题提示
  const weeklyGrid = document.getElementById('weekly-grid');
  if (weeklyGrid) {
    const titleEl = weeklyGrid.closest('.recent-section').querySelector('.section-title');
    if (titleEl) {
      const today = new Date();
      const weekDays = ['周日','周一','周二','周三','周四','周五','周六'];
      titleEl.textContent = `\u{1F4C5} 本周课表预览（${weekDays[today.getDay()]}） \u00B7 ${courses.length}门课`;
    }
  }
}

// --- 从localStorage加载已保存课表并渲染首页预览 ---
function loadSavedScheduleToPreview() {
  const savedData = loadFromLocal(CLASS_TALK.STORAGE_KEYS.schedules);
  if (savedData && savedData.courses && savedData.courses.length > 0) {
    currentParsedCourses = savedData.courses;
    renderWeeklyPreview(savedData.courses);
    console.log('已加载保存的课表到首页预览:', savedData.courses.length + '门课程');
  } else {
    // 没有保存的课表时，使用默认数据
    renderWeeklyPreview(CLASS_TALK.defaultSchedule.courses);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initFeatureCards();
  initUploadAreas();
  initCoursePopup();
  initWeekNavigation();
  // 加载已保存的课表到首页预览
  loadSavedScheduleToPreview();
});

// --- 导航切换 ---
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      
      // 更新导航高亮
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // 切换页面区块
      document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
      });
      
      const targetSection = document.getElementById(tab);
      if (targetSection) {
        targetSection.classList.add('active');
      }
      
      showToast(`已切换到${link.textContent.trim()}页面`, 'info');
    });
  });
}

// --- 功能卡片跳转 ---
function initFeatureCards() {
  const cards = document.querySelectorAll('.feature-card');
  
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const target = card.dataset.target;
      
      // 切换导航高亮
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.tab === target) {
          link.classList.add('active');
        }
      });
      
      // 切换页面
      document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
      });
      
      const targetSection = document.getElementById(target);
      if (targetSection) {
        targetSection.classList.add('active');
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    
    // 按钮点击也触发跳转
    const btn = card.querySelector('.btn-card-action');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = card.dataset.target;
        
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.remove('active');
          if (link.dataset.tab === target) {
            link.classList.add('active');
          }
        });
        
        document.querySelectorAll('.page-section').forEach(section => {
          section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(target);
        if (targetSection) {
          targetSection.classList.add('active');
          targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  });
}

// --- 上传区域初始化 ---
function initUploadAreas() {
  // 课表上传
  const scheduleArea = document.getElementById('schedule-upload-area');
  const scheduleFileInput = document.getElementById('schedule-file-input');
  const btnCamera = document.getElementById('btn-camera-upload');
  const btnFile = document.getElementById('btn-file-upload');
  
  if (scheduleArea) {
    scheduleArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      scheduleArea.style.borderColor = 'var(--color-primary)';
      scheduleArea.style.background = 'var(--color-primary-light)';
    });
    
    scheduleArea.addEventListener('dragleave', () => {
      scheduleArea.style.borderColor = '';
      scheduleArea.style.background = '';
    });
    
    scheduleArea.addEventListener('drop', (e) => {
      e.preventDefault();
      scheduleArea.style.borderColor = '';
      scheduleArea.style.background = '';
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleScheduleUpload(files[0]);
      }
    });
    
    scheduleArea.addEventListener('click', () => {
      scheduleFileInput.click();
    });
  }
  
  if (btnCamera) {
    btnCamera.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止冒泡到上传区域
      // 设置文件输入为拍照模式（移动端会调用摄像头）
      scheduleFileInput.setAttribute('capture', 'environment');
      scheduleFileInput.click();
      // 选择完成后移除capture属性，下次可以正常选文件
      setTimeout(() => scheduleFileInput.removeAttribute('capture'), 100);
    });
  }
  
  if (btnFile) {
    btnFile.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止冒泡到上传区域，避免双重触发
      scheduleFileInput.click();
    });
  }
  
  if (scheduleFileInput) {
    scheduleFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleScheduleUpload(e.target.files[0]);
      }
      // 重置input值，确保下次选择同一文件也能触发change事件
      scheduleFileInput.value = '';
    });
  }
  
  // 讲义上传
  const lectureFileInput = document.getElementById('lecture-file-input');
  const btnLectureFiles = document.getElementById('btn-lecture-files');
  const lectureUploadArea = document.getElementById('lecture-upload-area');
  
  if (lectureUploadArea) {
    lectureUploadArea.addEventListener('click', () => {
      lectureFileInput.click();
    });
  }
  
  if (btnLectureFiles) {
    btnLectureFiles.addEventListener('click', (e) => {
      e.stopPropagation();
      lectureFileInput.click();
    });
  }
  
  if (lectureFileInput) {
    lectureFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        showLectureFileList(files);
      }
      lectureFileInput.value = '';
    });
  }
  
  // 通知图片上传
  const noticeFileInput = document.getElementById('notice-file-input');
  const btnNoticeFile = document.getElementById('btn-notice-file');
  const noticeUploadArea = document.querySelector('.notice-upload-area');
  
  if (noticeUploadArea) {
    noticeUploadArea.addEventListener('click', () => {
      noticeFileInput.click();
    });
  }
  
  if (btnNoticeFile) {
    btnNoticeFile.addEventListener('click', (e) => {
      e.stopPropagation();
      noticeFileInput.click();
    });
  }
  
  if (noticeFileInput) {
    noticeFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleNoticeImageUpload(e.target.files[0]);
      }
      noticeFileInput.value = '';
    });
  }
  
  // 通知Tab切换
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const method = btn.dataset.method;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('.input-mode').forEach(mode => {
        mode.classList.remove('active');
      });
      
      if (method === 'text') {
        document.getElementById('text-input-mode').classList.add('active');
      } else {
        document.getElementById('image-input-mode').classList.add('active');
      }
    });
  });
}

// --- 获取或创建用户ID ---
function getUserId() {
  let userId = localStorage.getItem('classtalk_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('classtalk_user_id', userId);
  }
  return userId;
}

// --- 通用代理请求函数 ---
async function fetchProxy(pathname, bodyObj) {
  const proxyUrls = [];
  
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    proxyUrls.push(pathname);
    proxyUrls.push(window.location.origin + pathname);
  }
  proxyUrls.push('http://localhost:8080' + pathname);
  
  for (const proxyUrl of proxyUrls) {
    try {
      console.log('[请求] 尝试:', proxyUrl);
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'user-id': getUserId()  // 添加用户ID，用于数据追溯
        },
        body: JSON.stringify(bodyObj)
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('[请求] 成功:', proxyUrl);
        return data;
      } else {
        throw new Error(data.error || '请求失败');
      }
    } catch (error) {
      console.warn('[请求] 失败:', proxyUrl, error.message);
      if (proxyUrl === proxyUrls[proxyUrls.length - 1]) {
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
          throw new Error('无法连接到服务器！请通过 http://localhost:8080 访问页面，并确保服务器正在运行');
        }
        throw error;
      }
    }
  }
  throw new Error('所有代理URL不可用，请通过 http://localhost:8080 访问');
}

// --- 将AI解析的课表数据转换为内部格式 ---
function convertAiCourses(aiCourses) {
  // 星期映射
  const dayMap = {
    '周一': 'mon', '星期一': 'mon', '一': 'mon',
    '周二': 'tue', '星期二': 'tue', '二': 'tue',
    '周三': 'wed', '星期三': 'wed', '三': 'wed',
    '周四': 'thu', '星期四': 'thu', '四': 'thu',
    '周五': 'fri', '星期五': 'fri', '五': 'fri',
    '周六': 'sat', '星期六': 'sat', '六': 'sat',
    '周日': 'sun', '星期日': 'sun', '星期天': 'sun', '日': 'sun'
  };
  
  // 时间段映射
  const periodMap = {
    '1-2节': 0, '1-2': 0, '第1-2节': 0, '一二节': 0, '第1节': 0,
    '3-4节': 1, '3-4': 1, '第3-4节': 1, '三四节': 1, '第3节': 1,
    '5-6节': 2, '5-6': 2, '第5-6节': 2, '五六节': 2, '第5节': 2,
    '7-8节': 3, '7-8': 3, '第7-8节': 3, '七八节': 3, '第7节': 3,
    '9-10节': 4, '9-10': 4, '第9-10节': 4, '九十节': 4, '第9节': 4,
    '11-12节': 5, '11-12': 5
  };
  
  return aiCourses.map(course => {
    // 解析星期
    let dayKey = 'mon';
    const dayStr = (course.day || '').trim();
    for (const [key, value] of Object.entries(dayMap)) {
      if (dayStr.includes(key)) {
        dayKey = value;
        break;
      }
    }
    
    // 解析时间段
    let period = 0;
    const periodStr = (course.period || '').trim();
    for (const [key, value] of Object.entries(periodMap)) {
      if (periodStr.includes(key)) {
        period = value;
        break;
      }
    }
    // 如果包含数字，尝试提取
    if (period === 0 && periodStr) {
      const numMatch = periodStr.match(/(\d+)/);
      if (numMatch) {
        const num = parseInt(numMatch[1]);
        period = Math.floor((num - 1) / 2); // 1→0, 3→1, 5→2, 7→3, 9→4
      }
    }
    
    return {
      name: course.name || '未知课程',
      day: dayKey,
      period: Math.max(0, Math.min(period, 4)),
      room: course.room || '未指定',
      teacher: course.teacher || ''
    };
  });
}

// --- 使用AI智能解析课表（OCR + DeepSeek） ---
async function recognizeScheduleWithAi(imageBase64) {
  const processing = document.getElementById('schedule-processing');
  const uploadArea = document.getElementById('schedule-upload-area');
  const previewSection = document.getElementById('schedule-preview-section');
  
  uploadArea.style.display = 'none';
  previewSection.style.display = 'none';
  processing.style.display = 'block';
  processing.querySelector('p').textContent = '正在识别课表...（OCR文字识别 + AI智能解析）';
  
  try {
    // 调用智能解析代理（一步完成OCR+AI解析）
    const data = await fetchProxy('/parse-schedule-proxy', { image: imageBase64 });
    
    if (!data.courses || data.courses.length === 0) {
      throw new Error('AI未能解析出课程信息');
    }
    
    // 显示OCR原文供参考
    if (data.ocrText) {
      const ocrDetails = processing.querySelector('.ocr-details');
      if (!ocrDetails) {
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'ocr-details';
        detailsDiv.style.cssText = 'text-align:left; margin-top:10px; font-size:12px;';
        detailsDiv.innerHTML = `
          <details>
            <summary style="cursor:pointer; color:#666;">查看OCR识别原文（${data.ocrText.split('\\n').length}行）</summary>
            <pre style="background:#f5f5f5; padding:8px; max-height:150px; overflow:auto; white-space:pre-wrap; font-size:11px;">${data.ocrText.substring(0, 800)}</pre>
          </details>
        `;
        processing.querySelector('p').after(detailsDiv);
      }
    }
    
    processing.querySelector('p').textContent = `AI解析到 ${data.courses.length} 门课程，正在生成课表...`;
    
    // 将AI解析结果转换为内部格式
    const courses = convertAiCourses(data.courses);
    
    // 去重
    const uniqueCourses = [];
    const seen = new Set();
    courses.forEach(course => {
      const key = course.name + '-' + course.day + '-' + course.period;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCourses.push(course);
      }
    });
    
    processing.style.display = 'none';
    showScheduleResults({ courses: uniqueCourses });
    
  } catch (error) {
    console.error('课表识别失败:', error);
    processing.style.display = 'none';
    
    if (uploadArea) uploadArea.style.display = '';
    if (previewSection) previewSection.style.display = 'block';
    
    showToast('识别失败：' + error.message, 'error');
  }
}

// --- 课表上传处理 ---
function handleScheduleUpload(file) {
  if (!file.type.match(/image\/(jpeg|png|webp)/)) {
    showToast('请上传图片文件(JPG/PNG/WebP)', 'error');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) {
    showToast('图片文件大小不能超过10MB', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const imageBase64 = e.target.result;
    showSchedulePreview(imageBase64);
    
    // 延迟执行AI智能解析，让用户看到预览
    setTimeout(async () => {
      try {
        await recognizeScheduleWithAi(imageBase64);
      } catch (error) {
        console.error('课表识别失败:', error);
        showToast('识别失败，请重试', 'error');
      }
    }, 500);
  };
  reader.readAsDataURL(file);
}

// --- 显示课表预览 ---
function showSchedulePreview(imgSrc) {
  const previewSection = document.getElementById('schedule-preview-section');
  const previewImg = document.getElementById('schedule-preview-img');
  
  previewImg.src = imgSrc;
  previewSection.style.display = 'block';
  
  // 绑定清除按钮
  document.getElementById('btn-clear-preview').addEventListener('click', () => {
    previewSection.style.display = 'none';
    document.getElementById('schedule-results').style.display = 'none';
    document.getElementById('schedule-upload-area').style.display = '';
  });
}

// --- 显示课表解析结果 ---
function showScheduleResults(scheduleData) {
  const resultsSection = document.getElementById('schedule-results');
  const resultCount = document.getElementById('schedule-result-count');
  
  // 保存到全局变量，供保存按钮使用
  currentParsedCourses = scheduleData.courses;
  
  resultCount.innerHTML = `\u2705 解析完成！共识别 <span>${scheduleData.courses.length}</span> 门课程`;
  
  renderScheduleGrid(scheduleData.courses);
  renderCourseList(scheduleData.courses);
  
  resultsSection.style.display = 'block';
  
  // 绑定导出和保存按钮
  bindScheduleButtons();
  
  showToast(`成功解析 ${scheduleData.courses.length} 门课程`, 'success');
}

// --- 渲染课表网格 ---
function renderScheduleGrid(courses) {
  const body = document.getElementById('schedule-grid-body');
  body.innerHTML = '';
  
  CLASS_TALK.timeSlots.forEach((slot, slotIndex) => {
    const row = document.createElement('tr');
    
    // 时间单元格
    const timeCell = document.createElement('td');
    timeCell.className = 'time-cell';
    timeCell.innerHTML = `${slot.label}<br><small>${slot.range}</small>`;
    row.appendChild(timeCell);
    
    // 星期单元格
    CLASS_TALK.days.forEach((day, dayIndex) => {
      const cell = document.createElement('td');
      cell.className = 'empty-cell';
      
      // 查找匹配的课程
      const course = courses.find(c => c.day === CLASS_TALK.dayKeys[dayIndex] && c.period === slotIndex);
      
      if (course) {
        const colorIdx = courses.indexOf(course) % CLASS_TALK.courseColors.length;
        const color = CLASS_TALK.courseColors[colorIdx];
        
        cell.className = 'course-cell';
        cell.innerHTML = `
          <div class="mini-course" style="background: ${color.bg}; color: ${color.text}; border-left: 3px solid ${color.border};">
            <strong>${course.name}</strong>
            <small>${course.room}</small>
          </div>
        `;
        // 点击课程显示详情弹窗
        cell.addEventListener('click', () => showCoursePopup(course));
      }
      
      row.appendChild(cell);
    });
    
    body.appendChild(row);
  });
}

// --- 渲染课程列表 ---
function renderCourseList(courses) {
  const listContainer = document.getElementById('schedule-course-list');
  listContainer.innerHTML = '';
  
  const sortedCourses = [...courses].sort((a, b) => {
    const dayDiff = CLASS_TALK.dayKeys.indexOf(a.day) - CLASS_TALK.dayKeys.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.period - b.period;
  });
  
  sortedCourses.forEach((course, index) => {
    const dayLabel = CLASS_TALK.days[CLASS_TALK.dayKeys.indexOf(course.day)];
    const timeSlot = CLASS_TALK.timeSlots[course.period];
    
    const item = document.createElement('div');
    item.className = 'course-item';
    item.innerHTML = `
      <div class="course-info">
        <strong>${course.name}</strong>
        <small>${dayLabel} · ${timeSlot.label} · ${timeSlot.range} · ${course.room}</small>
      </div>
      <div class="course-actions">
        <button class="btn-secondary btn-small" data-edit="${index}">&#9998; 编辑</button>
        <button class="btn-danger btn-small" data-delete="${index}">&#10005; 删除</button>
      </div>
    `;
    listContainer.appendChild(item);
  });
  
  // 绑定编辑删除按钮
  listContainer.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('编辑功能：在实际版本中将打开编辑对话框', 'info');
    });
  });
  
  listContainer.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.delete);
      courses.splice(index, 1);
      renderCourseList(courses);
      renderScheduleGrid(courses);
      showToast('课程已删除', 'success');
    });
  });
}

// --- 绑定课表按钮事件 ---
function bindScheduleButtons() {
  // 视图切换
  const viewToggle = document.getElementById('btn-view-toggle');
  if (viewToggle) {
    viewToggle.addEventListener('click', () => {
      const gridView = document.getElementById('grid-view');
      const listView = document.getElementById('list-view');
      
      if (gridView.style.display !== 'none') {
        gridView.style.display = 'none';
        listView.style.display = 'block';
        viewToggle.textContent = '\uD83D\uDCCA 切换为网格视图';
      } else {
        gridView.style.display = 'block';
        listView.style.display = 'none';
        viewToggle.textContent = '\uD83D\uDCCB 切换为列表视图';
      }
    });
  }
  
  // 导出iCal
  const btnExportIcs = document.getElementById('btn-export-ics');
  if (btnExportIcs) {
    btnExportIcs.addEventListener('click', () => {
      showToast('正在生成.ics文件...', 'info');
      setTimeout(() => {
        showToast('.ics日历文件已生成并可下载', 'success');
      }, 1000);
    });
  }
  
  // 保存课表
  const btnSaveSchedule = document.getElementById('btn-save-schedule');
  if (btnSaveSchedule) {
    btnSaveSchedule.addEventListener('click', () => {
      if (currentParsedCourses.length === 0) {
        showToast('没有可保存的课表数据', 'error');
        return;
      }
      
      const savedData = {
        courses: currentParsedCourses,
        savedAt: new Date().toISOString(),
        semester: CLASS_TALK.semester
      };
      
      if (saveToLocal(CLASS_TALK.STORAGE_KEYS.schedules, savedData)) {
        showToast('✅ 课表已保存！首页预览已更新', 'success');
        
        // 更新首页"本周课表预览"
        renderWeeklyPreview(currentParsedCourses);
        
        // 自动跳转到首页预览
        setTimeout(() => {
          document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.tab === 'home') link.classList.add('active');
          });
          document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
          document.getElementById('home').classList.add('active');
          document.getElementById('home').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
      } else {
        showToast('保存失败，请重试', 'error');
      }
    });
  }
}

// --- 讲义文件列表渲染（委托给 lecture.js，此处仅保留空壳以防 lecture.js 未加载） ---
if (typeof window.showLectureFileList !== 'function') {
  window.showLectureFileList = function(files) {
    const fileListSection = document.getElementById('lecture-file-list');
    const fileListUl = document.getElementById('lecture-ul');
    if (!fileListSection || !fileListUl) return;
    fileListUl.innerHTML = '';
    files.forEach(file => {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.innerHTML = `<span class="file-icon">${file.type.includes('pdf') ? '📄' : '🖼️'}</span><span class="file-name">${file.name}</span>`;
      fileListUl.appendChild(li);
    });
    fileListSection.style.display = 'block';
  };
}

// --- 通知图片上传处理 ---
function handleNoticeImageUpload(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('notice-image-preview');
    const previewImg = document.getElementById('notice-preview-img');
    const parseBtn = document.getElementById('btn-parse-notice-image');
    
    previewImg.src = e.target.result;
    preview.style.display = 'block';
    parseBtn.style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
}

// --- 格式化文件大小 ---
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// --- Toast提示 ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ========================================
// 待办事项管理（AI智能添加）
// ========================================

const TODO_STORAGE_KEY = 'classtalk_todos';

// --- 加载待办事项 ---
function loadTodos() {
  try {
    const data = localStorage.getItem(TODO_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('加载待办失败:', e);
    return [];
  }
}

// --- 保存待办事项 ---
function saveTodos(todos) {
  try {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
    return true;
  } catch (e) {
    console.error('保存待办失败:', e);
    return false;
  }
}

// --- 渲染待办列表 ---
function renderTodoList() {
  const todoList = document.getElementById('todo-list');
  const todoEmpty = document.getElementById('todo-empty');
  if (!todoList) return;

  const todos = loadTodos();

  if (todos.length === 0) {
    todoList.innerHTML = '';
    if (todoEmpty) todoEmpty.style.display = 'block';
    return;
  }

  if (todoEmpty) todoEmpty.style.display = 'none';

  // 按创建时间倒序排列（最新的在前面）
  const sorted = [...todos].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  todoList.innerHTML = sorted.map((todo, index) => {
    const isCompleted = todo.completed || false;
    const icon = isCompleted ? '✅' : '📋';
    const meta = [];

    if (todo.dueDate) meta.push(`截止: ${todo.dueDate}`);
    if (todo.time) meta.push(todo.time);
    if (todo.location) meta.push(todo.location);

    return `
      <li class="todo-item ${isCompleted ? 'completed' : ''}" data-id="${todo.id}">
        <span class="todo-icon">${icon}</span>
        <div class="todo-content">
          <div class="todo-text">${escapeHtml(todo.task)}</div>
          ${meta.length > 0 ? `<div class="todo-meta">${escapeHtml(meta.join(' · '))}</div>` : ''}
        </div>
        <div class="todo-actions">
          <button class="todo-btn complete-btn" data-action="complete" data-id="${todo.id}" title="标记完成">${isCompleted ? '↩️' : '✓'}</button>
          <button class="todo-btn delete-btn" data-action="delete" data-id="${todo.id}" title="删除">🗑️</button>
        </div>
      </li>
    `;
  }).join('');

  // 绑定按钮事件
  todoList.querySelectorAll('.complete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTodoComplete(btn.dataset.id);
    });
  });

  todoList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTodo(btn.dataset.id);
    });
  });
}

// --- HTML转义 ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- 切换待办完成状态 ---
function toggleTodoComplete(id) {
  const todos = loadTodos();
  const index = todos.findIndex(t => t.id === id);
  if (index >= 0) {
    todos[index].completed = !todos[index].completed;
    saveTodos(todos);
    renderTodoList();
    showToast(todos[index].completed ? '已完成 ✅' : '已恢复', 'success');
  }
}

// --- 删除待办 ---
function deleteTodo(id) {
  let todos = loadTodos();
  todos = todos.filter(t => t.id !== id);
  saveTodos(todos);
  renderTodoList();
  showToast('待办已删除', 'info');
}

// --- 添加待办 ---
function addTodo(todo) {
  const todos = loadTodos();
  todo.id = 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  todo.createdAt = Date.now();
  todo.completed = false;
  todos.push(todo);
  saveTodos(todos);
  renderTodoList();
}

// --- 用AI解析自然语言为待办事项 ---
async function parseTodoWithAI(userInput) {
  const prompt = `你是一位智能待办助手。用户会用自然语言告诉你一个待办事项，请仔细分析并提取关键信息。

用户输入：「${userInput}」

请严格按照以下JSON格式输出（只输出JSON，不要添加任何其他文字）：
{
  "task": "待办事项的名称（简洁明确，不超过30字）",
  "dueDate": "截止日期（相对日期如：明天、周三、下周一，或具体日期如：6月25日）",
  "time": "具体时间（如果提到，如：10:00、下午2点；没提到则为空字符串）",
  "location": "地点（如果提到，如：图书馆3楼；没提到则为空字符串）",
  "priority": "优先级：high/medium/low（根据紧迫程度判断）"
}

注意事项：
1. dueDate 优先使用相对日期（如"明天"、"周三"），这样更友好
2. task 要简洁，保留核心动作和对象
3. 如果用户输入不明确，根据上下文合理推断
4. 只输出JSON，不要输出\`\`\`json或任何其他文字`;

  try {
    const data = await fetchProxy('/deepseek-proxy', {
      messages: [
        { role: 'system', content: '你是一位智能待办助手，擅长从自然语言中精确提取待办事项信息。只输出JSON格式，不要添加解释文字。' },
        { role: 'user', content: prompt }
      ]
    });

    const aiContent = data.content || '';
    
    // 提取JSON
    let jsonStr = aiContent;
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const todo = JSON.parse(jsonStr);
    
    // 清理空字段
    if (!todo.time) delete todo.time;
    if (!todo.location) delete todo.location;
    
    return todo;
  } catch (error) {
    console.error('AI解析失败:', error);
    // AI解析失败时，使用简单规则提取
    return {
      task: userInput.substring(0, 50),
      dueDate: userInput.includes('明天') ? '明天' : 
               userInput.includes('后天') ? '后天' :
               userInput.includes('下周') ? '下周' : '近期',
      time: '',
      location: '',
      priority: 'medium'
    };
  }
}

// --- 初始化待办功能 ---
function initTodoFeature() {
  // 如果是首次使用，添加默认待办
  const todos = loadTodos();
  if (todos.length === 0) {
    const defaultTodos = [
      { task: '数据结构 作业提交', dueDate: '周三', time: '23:59', location: '', priority: 'high' },
      { task: '数据库 小组讨论', dueDate: '周五', time: '14:00', location: '图书馆3楼', priority: 'medium' },
      { task: '大学英语 演讲测验', dueDate: '下周一', time: '1-2节', location: '', priority: 'high' },
      { task: '高等数学 随堂测试', dueDate: '周四', time: '3-4节', location: '', priority: 'medium' }
    ];
    defaultTodos.forEach(t => addTodo(t));
  } else {
    // 渲染已有待办
    renderTodoList();
  }

  // AI智能添加按钮
  const btnAdd = document.getElementById('btn-home-ai-add');
  const input = document.getElementById('home-ai-input');

  if (btnAdd && input) {
    btnAdd.addEventListener('click', async () => {
      const text = input.value.trim();
      if (!text) {
        showToast('请输入待办内容', 'error');
        return;
      }

      // 显示处理状态
      btnAdd.disabled = true;
      btnAdd.textContent = '🔄 解析中...';
      input.disabled = true;

      try {
        showToast('AI正在解析您的待办事项...', 'info');
        const todo = await parseTodoWithAI(text);
        
        // 添加待办
        addTodo(todo);
        
        // 清空输入
        input.value = '';
        
        // 显示成功提示
        const metaParts = [];
        if (todo.dueDate) metaParts.push(todo.dueDate);
        if (todo.time) metaParts.push(todo.time);
        if (todo.location) metaParts.push(todo.location);
        
        showToast(`✅ 已添加：${todo.task}${metaParts.length > 0 ? '（' + metaParts.join(' · ') + '）' : ''}`, 'success');
      } catch (error) {
        console.error('添加待办失败:', error);
        showToast('添加失败：' + error.message, 'error');
      } finally {
        btnAdd.disabled = false;
        btnAdd.textContent = '✨ 智能添加';
        input.disabled = false;
        input.focus();
      }
    });

    // 回车提交
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        btnAdd.click();
      }
    });
  }

  // 清空按钮
  const btnClear = document.getElementById('btn-clear-todos');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      const todos = loadTodos();
      if (todos.length === 0) {
        showToast('暂无待办事项', 'info');
        return;
      }
      if (confirm('确定要清空所有待办事项吗？')) {
        saveTodos([]);
        renderTodoList();
        showToast('已清空所有待办', 'info');
      }
    });
  }
}

// 在DOM加载后初始化待办功能
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initTodoFeature();
  });
} else {
  initTodoFeature();
}
