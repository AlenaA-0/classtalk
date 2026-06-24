// ====================================
// 课通 · ClassTalk - 通知解析模块（AI真实解析版）
// ====================================

document.addEventListener('DOMContentLoaded', () => {
  initNoticeParser();
});

// 当前解析的通知数据
let currentNoticeData = null;

function initNoticeParser() {
  // 文本解析按钮
  const btnParseText = document.getElementById('btn-parse-notice-text');
  if (btnParseText) {
    btnParseText.addEventListener('click', () => {
      const textarea = document.getElementById('notice-text-input');
      if (!textarea.value.trim()) {
        showToast('请先粘贴通知内容', 'error');
        return;
      }
      parseNoticeFromText(textarea.value.trim());
    });
  }

  // 图片解析按钮
  const btnParseImage = document.getElementById('btn-parse-notice-image');
  if (btnParseImage) {
    btnParseImage.addEventListener('click', () => {
      parseNoticeFromImage();
    });
  }

  // 清除图片预览
  const btnClearNotice = document.getElementById('btn-clear-notice-preview');
  if (btnClearNotice) {
    btnClearNotice.addEventListener('click', () => {
      document.getElementById('notice-image-preview').style.display = 'none';
      btnParseImage.style.display = 'none';
      document.getElementById('notice-file-input').value = '';
    });
  }

  // 添加到日程
  const btnAddCalendar = document.getElementById('btn-add-calendar');
  if (btnAddCalendar) {
    btnAddCalendar.addEventListener('click', () => {
      if (currentNoticeData) {
        // 保存到本地日程
        const events = loadFromLocal(CLASS_TALK.STORAGE_KEYS.events) || [];
        events.push({
          ...currentNoticeData,
          id: Date.now(),
          addedAt: new Date().toISOString()
        });
        saveToLocal(CLASS_TALK.STORAGE_KEYS.events, events);
        showToast('事件已添加到个人日程', 'success');
      } else {
        showToast('请先解析通知', 'error');
      }
    });
  }

  // 复制信息
  const btnCopyEvent = document.getElementById('btn-copy-event');
  if (btnCopyEvent) {
    btnCopyEvent.addEventListener('click', () => {
      if (currentNoticeData) {
        const info = `事件：${currentNoticeData.eventName}\n时间：${currentNoticeData.time}\n地点：${currentNoticeData.location}\n对象：${currentNoticeData.targetAudience}\n截止：${currentNoticeData.deadline}\n联系：${currentNoticeData.contact} (${currentNoticeData.phone})\n详情：${currentNoticeData.description}`;
        navigator.clipboard.writeText(info).then(() => {
          showToast('事件信息已复制到剪贴板', 'success');
        }).catch(() => {
          showToast('复制失败，请手动复制', 'error');
        });
      } else {
        showToast('请先解析通知', 'error');
      }
    });
  }
}

// --- 从文字解析通知（调用真实AI API） ---
async function parseNoticeFromText(text) {
  const processing = document.getElementById('notice-processing');
  const results = document.getElementById('notice-results');

  results.style.display = 'none';
  processing.style.display = 'block';

  try {
    // fetchProxy 直接返回解析后的JSON数据，不需要再调.json()
    const data = await fetchProxy('/notice-parse-proxy', { text: text });

    if (data.success && data.data) {
      currentNoticeData = data.data;
      processing.style.display = 'none';
      showNoticeResults(data.data);
    } else {
      processing.style.display = 'none';
      showToast('解析失败：' + (data.error || '未知错误'), 'error');
    }
  } catch (error) {
    processing.style.display = 'none';
    showToast('网络错误，请检查服务器连接', 'error');
    console.error('通知解析请求失败:', error);
  }
}

// --- 从图片解析通知（OCR + AI） ---
async function parseNoticeFromImage() {
  const fileInput = document.getElementById('notice-file-input');
  const processing = document.getElementById('notice-processing');
  const results = document.getElementById('notice-results');

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showToast('请先选择通知图片', 'error');
    return;
  }

  results.style.display = 'none';
  processing.style.display = 'block';

  try {
    // 1. 图片转base64
    const file = fileInput.files[0];
    const base64 = await fileToBase64(file);

    // 2. OCR识别
    const ocrData = await fetchProxy('/baidu-ocr-proxy', { image: base64 });

    let ocrText = '';
    if (ocrData.success && ocrData.data && ocrData.data.words_result) {
      ocrText = ocrData.data.words_result.map(w => w.words).join('\n');
    }

    if (!ocrText.trim()) {
      processing.style.display = 'none';
      showToast('图片中未识别到文字，请尝试粘贴文字通知', 'error');
      return;
    }

    // 3. AI解析通知内容
    const noticeData = await fetchProxy('/notice-parse-proxy', { ocrText: ocrText });

    if (noticeData.success && noticeData.data) {
      currentNoticeData = noticeData.data;
      processing.style.display = 'none';
      showNoticeResults(noticeData.data);
    } else {
      processing.style.display = 'none';
      showToast('解析失败：' + (noticeData.error || '未知错误'), 'error');
    }
  } catch (error) {
    processing.style.display = 'none';
    showToast('网络错误，请检查服务器连接', 'error');
    console.error('通知图片解析失败:', error);
  }
}

// --- 文件转base64 ---
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // 去掉data:image/xxx;base64,前缀
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showNoticeResults(noticeData) {
  const results = document.getElementById('notice-results');
  const eventCard = document.getElementById('event-card-display');

  // 确保所有字段都有值（防止AI返回缺失字段）
  const safeData = {
    eventName: noticeData.eventName || '未知事件',
    time: noticeData.time || '暂无',
    location: noticeData.location || '暂无',
    targetAudience: noticeData.targetAudience || '暂无',
    deadline: noticeData.deadline || '暂无',
    contact: noticeData.contact || '暂无',
    phone: noticeData.phone || '暂无',
    description: noticeData.description || '暂无详情',
    tags: noticeData.tags || ['通知']
  };

  eventCard.innerHTML = `
    <h3 class="event-card-title">${safeData.eventName}</h3>
    <div class="event-field">
      <span class="field-label">&#128197; 时间：</span>
      <span class="field-value"><span class="field-highlight">${safeData.time}</span></span>
    </div>
    <div class="event-field">
      <span class="field-label">&#128205; 地点：</span>
      <span class="field-value"><span class="field-highlight">${safeData.location}</span></span>
    </div>
    <div class="event-field">
      <span class="field-label">&#128101; 对象：</span>
      <span class="field-value">${safeData.targetAudience}</span>
    </div>
    <div class="event-field">
      <span class="field-label">&#9201; 截止：</span>
      <span class="field-value"><span class="field-highlight">${safeData.deadline}</span></span>
    </div>
    <div class="event-field">
      <span class="field-label">&#128222; 联系：</span>
      <span class="field-value">${safeData.contact} (${safeData.phone})</span>
    </div>
    <div class="event-field">
      <span class="field-label">&#128221; 详情：</span>
      <span class="field-value">${safeData.description}</span>
    </div>
    <div class="event-field">
      <span class="field-label">&#128187; 标签：</span>
      <span class="field-value">${safeData.tags.map(tag => `<span class="field-highlight" style="margin-right: 8px;">#${tag}</span>`).join('')}</span>
    </div>
  `;

  results.style.display = 'block';
  showToast('通知解析完成', 'success');
}
