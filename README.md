# 课通 · ClassTalk

## 多模态校园AI助手

### 快速启动

**Windows系统：**

双击运行 `start-server.bat` 文件

或在命令行执行：
```bash
start-server.bat
```

**macOS/Linux系统：**

```bash
chmod +x start-server.sh
./start-server.sh
```

或直接使用PHP内置服务器：
```bash
php -S localhost:8080 classtalk
```

### 访问地址

启动服务器后，访问：http://localhost:8080

### 项目结构

```
classtalk/
├── index.html          # 主页面
├── baidu-ocr-proxy.php # 百度OCR代理（解决CORS问题）
├── css/
│   └── style.css       # 全局样式
├── js/
│   ├── data.js         # 数据常量
│   ├── app.js          # 核心逻辑
│   ├── chat.js         # AI对话
│   ├── notice.js       # 通知解析
│   ├── video.js        # 视频生成
│   └── lecture.js      # 讲义总结
└── images/             # 图片资源
```

### 功能说明

1. **随手拍课表** - 上传课表图片，自动识别课程信息
2. **讲义变总结** - 上传讲义，自动生成知识点脑图和摘要
3. **通知解析** - 粘贴或截图通知，提取关键信息
4. **AI视频生成** - 基于讲义内容生成讲解视频
5. **AI对话** - 与DeepSeek AI助手对话

### 技术栈

- 前端：HTML5 + CSS3 + JavaScript
- OCR：百度智能云API
- AI：DeepSeek API
- 后端代理：PHP内置服务器

### 注意事项

- 使用前需要先启动PHP服务器
- 确保系统已安装PHP 7.0以上版本
- 百度OCR API需要网络连接才能使用
