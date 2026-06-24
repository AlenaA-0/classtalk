// ====================================
// 课通 · ClassTalk - 精美动态动画封面 v2
// ====================================

(function() {
  'use strict';

  const TAGLINE_TEXT = '课通，一款懂你的校园AI助手，帮你把课表截图、PPT讲义、通知公告自动整理成日程、脑图和待办，让信息处理快10倍。';

  // 是否已看过封面（刷新不再重复播放）
  const SPLASH_KEY = 'classtalk_splash_seen';

  // ====== Canvas粒子系统 ======
  let canvas, ctx;
  let particles = [];
  let rings = [];
  let sparkles = [];
  let floatingIcons = [];
  let animFrameId;
  let startTime;

  // 粒子类
  class Particle {
    constructor(w, h) {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = (Math.random() - 0.5) * 0.6 - 0.3;
      this.size = Math.random() * 3 + 1;
      this.alpha = Math.random() * 0.5 + 0.1;
      this.life = Math.random() * 200 + 100;
      this.maxLife = this.life;
      this.hue = Math.random() > 0.5 ? 240 + Math.random() * 40 : 280 + Math.random() * 40;
    }
    update(w, h) {
      this.x += this.vx;
      this.y += this.vy;
      this.life--;
      if (this.life <= 0 || this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.life = this.maxLife;
      }
    }
    draw(ctx) {
      const fade = this.life / this.maxLife;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 80%, 75%, ${this.alpha * fade})`;
      ctx.fill();
    }
  }

  // 扩散光环类
  class Ring {
    constructor(cx, cy, delay) {
      this.cx = cx;
      this.cy = cy;
      this.radius = 0;
      this.maxRadius = 250 + Math.random() * 150;
      this.speed = 1.5 + Math.random() * 1;
      this.alpha = 0.4;
      this.lineWidth = 2 + Math.random() * 2;
      this.hue = Math.random() > 0.5 ? 240 : 290;
      this.delay = delay;
      this.started = false;
    }
    update(elapsed) {
      if (elapsed < this.delay) return;
      this.started = true;
      this.radius += this.speed;
      this.alpha = 0.4 * (1 - this.radius / this.maxRadius);
      if (this.radius > this.maxRadius) {
        this.radius = 0;
        this.alpha = 0.4;
      }
    }
    draw(ctx) {
      if (!this.started || this.alpha <= 0) return;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${this.hue}, 80%, 70%, ${this.alpha})`;
      ctx.lineWidth = this.lineWidth;
      ctx.stroke();
    }
  }

  // 闪烁星星类
  class Sparkle {
    constructor(w, h, delay) {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.size = Math.random() * 2 + 1;
      this.delay = delay;
      this.duration = 600 + Math.random() * 800;
      this.started = false;
    }
    draw(ctx, elapsed) {
      if (elapsed < this.delay) return;
      this.started = true;
      const progress = ((elapsed - this.delay) % this.duration) / this.duration;
      const alpha = Math.sin(progress * Math.PI) * 0.8;
      const scale = 0.5 + Math.sin(progress * Math.PI) * 1.5;
      // 四角星形状
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(scale, scale);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2) - Math.PI / 4;
        ctx.lineTo(Math.cos(angle) * this.size, Math.sin(angle) * this.size);
        const midAngle = angle + Math.PI / 4;
        ctx.lineTo(Math.cos(midAngle) * this.size * 0.3, Math.sin(midAngle) * this.size * 0.3);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // 浮动图标类
  class FloatingIcon {
    constructor(w, h, icon, delay) {
      this.icon = icon;
      this.startX = w * (0.1 + Math.random() * 0.8);
      this.startY = h * 1.1;
      this.endY = h * (0.15 + Math.random() * 0.7);
      this.delay = delay;
      this.duration = 1500;
      this.size = 22 + Math.random() * 10;
      this.driftX = (Math.random() - 0.5) * 60;
      this.started = false;
      this.phase = 'rising'; // rising → floating
    }
    draw(ctx, elapsed) {
      if (elapsed < this.delay) return;
      this.started = true;
      const t = elapsed - this.delay;

      if (this.phase === 'rising' && t < this.duration) {
        const progress = t / this.duration;
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const y = this.startY + (this.endY - this.startY) * ease;
        const x = this.startX + this.driftX * progress;
        const alpha = ease;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `${this.size}px serif`;
        ctx.fillText(this.icon, x, y);
        ctx.restore();
      } else {
        this.phase = 'floating';
        // 浮动状态：轻微上下漂动
        const floatT = t - this.duration;
        const floatY = this.endY + Math.sin(floatT / 800) * 8;
        const floatX = this.startX + this.driftX + Math.sin(floatT / 1200) * 10;
        ctx.save();
        ctx.globalAlpha = 0.7 + Math.sin(floatT / 600) * 0.15;
        ctx.font = `${this.size}px serif`;
        ctx.fillText(this.icon, floatX, floatY);
        ctx.restore();
      }
    }
  }

  function initCanvas() {
    canvas = document.getElementById('splash-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // 创建粒子
    for (let i = 0; i < 60; i++) {
      particles.push(new Particle(w, h));
    }

    // 创建扩散光环
    for (let i = 0; i < 4; i++) {
      rings.push(new Ring(cx, cy, 400 + i * 500));
    }

    // 创建闪烁星星
    for (let i = 0; i < 25; i++) {
      sparkles.push(new Sparkle(w, h, Math.random() * 3000));
    }

    // 创建浮动图标
    const icons = ['📚', '📝', '🎯', '💡', '🗓️', '🧠', '✨', '📊'];
    for (let i = 0; i < icons.length; i++) {
      floatingIcons.push(new FloatingIcon(w, h, icons[i], 500 + i * 300));
    }

    startTime = performance.now();
    animateCanvas();
  }

  function animateCanvas() {
    const elapsed = performance.now() - startTime;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 绘制底色渐变光晕
    const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.5);
    grad.addColorStop(0, `rgba(102, 126, 234, ${0.08 + Math.sin(elapsed/2000)*0.04})`);
    grad.addColorStop(0.5, `rgba(118, 75, 162, ${0.04 + Math.sin(elapsed/3000)*0.02})`);
    grad.addColorStop(1, 'rgba(26, 16, 64, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 绘制粒子
    particles.forEach(p => { p.update(w, h); p.draw(ctx); });

    // 绘制光环
    rings.forEach(r => { r.update(elapsed); r.draw(ctx); });

    // 绘制星星
    sparkles.forEach(s => s.draw(ctx, elapsed));

    // 绘制浮动图标
    floatingIcons.forEach(f => f.draw(ctx, elapsed));

    // 绘制连接线（粒子间的光线）
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          const alpha = (1 - dist/120) * 0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(102, 126, 234, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    animFrameId = requestAnimationFrame(animateCanvas);
  }

  // ====== 逐字显示标语（带光标） ======
  function animateTagline() {
    const el = document.getElementById('splash-tagline');
    if (!el) return;

    el.textContent = '';
    let index = 0;
    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'splash-cursor';
    cursorSpan.textContent = '|';
    el.appendChild(cursorSpan);

    // 0.8秒后开始逐字显示
    setTimeout(() => {
      const interval = setInterval(() => {
        if (index < TAGLINE_TEXT.length) {
          // 移除旧光标，插入文字+新光标
          if (cursorSpan.parentNode) cursorSpan.remove();
          el.textContent += TAGLINE_TEXT[index];
          el.appendChild(cursorSpan);
          index++;
        } else {
          clearInterval(interval);
          // 打字完成后光标闪烁2次后消失
          let blinkCount = 0;
          const blinkInterval = setInterval(() => {
            cursorSpan.style.opacity = blinkCount % 2 === 0 ? '0' : '1';
            blinkCount++;
            if (blinkCount >= 4) {
              clearInterval(blinkInterval);
              cursorSpan.remove();
            }
          }, 300);
        }
      }, 60); // 每字60ms
    }, 800);
  }

  // ====== Logo光晕爆发效果 ======
  function triggerLogoBurst() {
    const logoWrap = document.querySelector('.splash-logo-wrap');
    if (!logoWrap) return;

    // 创建爆发光晕
    const burst = document.createElement('div');
    burst.className = 'splash-burst-glow';
    logoWrap.appendChild(burst);

    // 动画结束后移除
    setTimeout(() => burst.remove(), 1200);
  }

  // ====== 主初始化 ======
  function initSplash() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    // 已看过封面则跳过
    if (sessionStorage.getItem(SPLASH_KEY)) {
      splash.style.display = 'none';
      return;
    }

    // 初始化Canvas粒子系统
    initCanvas();

    // Logo光晕爆发（0.6秒后）
    setTimeout(triggerLogoBurst, 600);

    // 逐字显示标语
    animateTagline();

    // 进度条动画（3秒填充，对应总时长）
    setTimeout(() => {
      const bar = document.getElementById('splash-bar');
      if (bar) bar.style.width = '100%';
    }, 100);

    // 3.7秒后过渡进入主页面
    setTimeout(() => {
      splash.classList.add('fade-out');
      sessionStorage.setItem(SPLASH_KEY, '1');

      // 停止Canvas动画
      if (animFrameId) cancelAnimationFrame(animFrameId);

      setTimeout(() => {
        splash.style.display = 'none';
      }, 900);
    }, 3700);
  }

  // 页面加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSplash);
  } else {
    initSplash();
  }

  console.log('✅ [Splash] 精美动态封面模块v2加载完成');
})();
