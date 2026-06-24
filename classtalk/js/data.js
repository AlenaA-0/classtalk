// ====================================
// 课通 · ClassTalk - 全局数据常量
// ====================================

const CLASS_TALK = {
  // 百度OCR API配置
  baiduOcr: {
    appId: '7873995',
    apiKey: 'snWKGu3tFLmFEbFh95g5HMRM',
    secretKey: 'HmPCIlEPCLFnqj2X0STkjPsWiImZdXJJ'
  },
  
  // 学期信息
  semester: '2025-2026学年第二学期',
  
  // 时间段定义
  timeSlots: [
    { label: '1-2节', range: '8:00-9:40', startHour: 8, startMin: 0, endHour: 9, endMin: 40 },
    { label: '3-4节', range: '10:00-11:40', startHour: 10, startMin: 0, endHour: 11, endMin: 40 },
    { label: '5-6节', range: '14:00-15:40', startHour: 14, startMin: 0, endHour: 15, endMin: 40 },
    { label: '7-8节', range: '16:00-17:40', startHour: 16, startMin: 0, endHour: 17, endMin: 40 },
    { label: '9-10节', range: '19:00-20:40', startHour: 19, startMin: 0, endHour: 20, endMin: 40 }
  ],
  
  // 星期映射
  days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  dayKeys: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  
  // 课程颜色方案
  courseColors: [
    { bg: '#CECBF6', text: '#26215C', border: '#7F77DD' },
    { bg: '#E6F1FB', text: '#0C447C', border: '#378ADD' },
    { bg: '#E1F5EE', text: '#085041', border: '#1D9E75' },
    { bg: '#FAECE7', text: '#712B13', border: '#D85A30' },
    { bg: '#FBEAF0', text: '#72243E', border: '#D4537E' },
    { bg: '#EAF3DE', text: '#27500A', border: '#639922' },
    { bg: '#FAEEDA', text: '#633806', border: '#BA7517' },
    { bg: '#FCEBEB', text: '#791F1F', border: '#E24B4A' }
  ],

  // 默认课表数据
  defaultSchedule: {
    courses: [
      { name: '数据结构', day: 'mon', period: 0, room: 'B301' },
      { name: '操作系统', day: 'mon', period: 1, room: 'A102' },
      { name: '高等数学', day: 'tue', period: 1, room: 'D101' },
      { name: '数据库原理', day: 'wed', period: 0, room: 'C205' },
      { name: '大学英语', day: 'wed', period: 1, room: 'E302' },
      { name: '线性代数', day: 'thu', period: 0, room: 'G103' },
      { name: '软件工程', day: 'thu', period: 2, room: 'H401' },
      { name: '计算机网络', day: 'fri', period: 1, room: 'F201' },
      { name: '概率统计', day: 'fri', period: 2, room: 'I202' }
    ]
  },

  // 模拟讲义总结数据
  defaultLecture: {
    mindMap: [
      {
        name: '栈 (Stack)',
        children: [
          { name: '定义：后进先出(LIFO)', children: [] },
          { name: '基本操作：push/pop/top', children: [] },
          { name: '应用场景：函数调用、括号匹配', children: [] }
        ]
      },
      {
        name: '队列 (Queue)',
        children: [
          { name: '定义：先进先出(FIFO)', children: [] },
          { name: '基本操作：enqueue/dequeue', children: [] },
          { name: '应用场景：任务调度、缓冲区', children: [] }
        ]
      },
      {
        name: '栈与队列的比较',
        children: [
          { name: '数据进出顺序不同', children: [] },
          { name: '操作受限的不同方向', children: [] },
          { name: '底层实现可以相同(数组/链表)', children: [] }
        ]
      }
    ],
    summary: [
      '栈是后进先出的线性表，插入和删除操作都在表的一端（栈顶）进行。',
      '队列是先进先出的线性表，插入在一端（队尾）进行，删除在另一端（队头）进行。',
      '栈和队列是操作受限的线性表，但它们仍然是线性结构。',
      '栈的典型应用包括：函数调用栈、表达式求值、括号匹配、递归实现等。',
      '队列的典型应用包括：广度优先搜索(BFS)、任务队列、缓冲区管理等。',
      '循环队列解决了假溢出问题，利用取模运算实现空间的循环利用。',
      '链式栈和链式队列不需要预先分配空间，但会有额外的指针开销。'
    ],
    terms: [
      { term: 'LIFO', definition: 'Last In First Out，后进先出，栈的核心特性' },
      { term: 'FIFO', definition: 'First In First Out，先进先出，队列的核心特性' },
      { term: 'Push', definition: '将元素压入栈顶的操作' },
      { term: 'Pop', definition: '从栈顶弹出元素的操作' },
      { term: 'Enqueue', definition: '将元素加入队尾的操作' },
      { term: 'Dequeue', definition: '从队头移除元素的操作' },
      { term: '循环队列', definition: '利用取模运算实现空间循环使用的队列' },
      { term: '链式栈', definition: '用链表实现的栈结构' }
    ]
  },

  // 通知解析模拟数据
  defaultNotice: {
    eventName: '2026年大学生程序设计竞赛',
    time: '2026年7月10日 14:00-18:00',
    location: '科技楼报告厅',
    targetAudience: '全校本科生',
    deadline: '2026年7月5日',
    contact: '张老师',
    phone: '138-0000-0000',
    description: '本次竞赛旨在提升大学生的编程能力和团队协作精神，竞赛内容涵盖算法设计、数据结构、软件工程等方面。比赛采用团队赛制，每队3人，限时4小时。',
    tags: ['竞赛', '编程', '学术活动']
  },

  // 模拟视频生成步骤
  videoSteps: [
    { percent: 10, detail: '正在分析知识点结构...' },
    { percent: 25, detail: '正在拆解分镜脚本...' },
    { percent: 40, detail: '正在生成场景画面...' },
    { percent: 60, detail: '正在合成配音内容...' },
    { percent: 75, detail: '正在渲染视频片段...' },
    { percent: 90, detail: '正在拼接视频...' },
    { percent: 100, detail: '视频生成完成！' }
  ],

  // 本地存储键名
  STORAGE_KEYS: {
    schedules: 'classtalk_schedules',
    lectures: 'classtalk_lectures',
    events: 'classtalk_events'
  }
};

// 保存到本地存储
function saveToLocal(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('saveToLocal failed:', e);
    return false;
  }
}

// 从本地存储读取
function loadFromLocal(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('loadFromLocal failed:', e);
    return null;
  }
}
