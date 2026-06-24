// ====================================
// 课通 · ClassTalk - 通知解析模块
// ====================================

document.addEventListener('DOMContentLoaded', () => {
  initNoticeParser();
});

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
      simulateNoticeParsing();
    });
  }
  
  // 图片解析按钮
  const btnParseImage = document.getElementById('btn-parse-notice-image');
  if (btnParseImage) {
    btnParseImage.addEventListener('click', () => {
      simulateNoticeParsing();
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
      showToast('事件已添加到个人日程', 'success');
    });
  }
  
  // 复制信息
  const btnCopyEvent = document.getElementById('btn-copy-event');
  if (btnCopyEvent) {
    btnCopyEvent.addEventListener('click', () => {
      showToast('事件信息已复制到剪贴板', 'success');
    });
  }
}

function simulateNoticeParsing() {
  const processing = document.getElementById('notice-processing');
  const results = document.getElementById('notice-results');
  
  results.style.display = 'none';
  processing.style.display = 'block';
  
  setTimeout(() => {
    processing.style.display = 'none';
    showNoticeResults(CLASS_TALK.defaultNotice);
  }, 2000);
}

function showNoticeResults(noticeData) {
  const results = document.getElementById('notice-results');
  const eventCard = document.getElementById('event-card-display');
  
  eventCard.innerHTML = `
    <h3 class="event-card-title">${noticeData.eventName}</h3>
    <div class="event-field">
      <span class="field-label">&#128197; 时间：</span>
      <span class="field-value"><span class="field-highlight">${noticeData.time}</span></span>
    </div>
    <div class="event-field">
      <span class="field-label">&#128205; 地点：</span>
      <span class="field-value"><span class="field-highlight">${noticeData.location}</span></span>
    </div>
    <div class="event-field">
      <span class="field-label">&#128101; 对象：</span>
      <span class="field-value">${noticeData.targetAudience}</span>
    </div>
    <div class="event-field">
      <span class="field-label">&#9201; 截止：</span>
      <span class="field-value"><span class="field-highlight">${noticeData.deadline}</span></span>
    </div>
    <div class="event-field">
      <span class="field-label">&#128222; 联系：</span>
      <span class="field-value">${noticeData.contact} (${noticeData.phone})</span>
    </div>
    <div class="event-field">
      <span class="field-label">&#128221; 详情：</span>
      <span class="field-value">${noticeData.description}</span>
    </div>
    <div class="event-field">
      <span class="field-label">&#128187; 标签：</span>
      <span class="field-value">${noticeData.tags.map(tag => `<span class="field-highlight" style="margin-right: 8px;">#${tag}</span>`).join('')}</span>
    </div>
  `;
  
  results.style.display = 'block';
  showToast('通知解析完成', 'success');
}
