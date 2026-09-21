(() => {
  const canvas = document.getElementById("fx-canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  const glow = document.getElementById("cursor-glow");
  const toast = document.getElementById("toast");
  const copyBtn = document.getElementById("copy-ca");
  const caValue = document.getElementById("ca-value");
  const navToggle = document.getElementById("nav-toggle");
  const navLinks = document.getElementById("nav-links");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const NEON_RGB = [0, 200, 5];

  let w = 0;
  let h = 0;
  let dpr = 1;
  const arrows = [];
  const sparks = [];
  const shocks = [];
  const hexPulses = [];
  const pointer = { x: 0, y: 0, active: false };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnArrow(fromLeft, aimed) {
    const y = aimed ? aimed.y : rand(h * 0.08, h * 0.92);
    const x = fromLeft ? -40 : w + 40;
    const targetX = aimed ? aimed.x : fromLeft ? w + 80 : -80;
    const targetY = aimed ? aimed.y : y + rand(-90, 90);
    const dx = targetX - x;
    const dy = targetY - y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = aimed ? rand(11, 16) : rand(6.5, 11);
    arrows.push({
      x,
      y,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      side: fromLeft ? 1 : -1,
      life: 1,
      trail: [],
    });
  }

  function burst(x, y, count = 18) {
    for (let i = 0; i < count; i += 1) {
      const a = rand(0, Math.PI * 2);
      const s = rand(1.2, 6.5);
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
        size: rand(1.2, 3.4),
      });
    }
    shocks.push({ x, y, r: 8, life: 1 });
    if (hexPulses.length < 8) {
      hexPulses.push({ x, y, r: 12, life: 1 });
    }
  }

  function drawHex(x, y, size, alpha) {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + Math.cos(a) * size;
      const py = y + Math.sin(a) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(0,200,5,${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGrid(t) {
    const size = 46;
    const pulse = 0.035 + Math.sin(t / 900) * 0.015;
    ctx.save();
    ctx.translate((t / 40) % size, (t / 70) % size);
    for (let y = -size; y < h + size; y += size * 1.15) {
      const offset = (Math.floor(y / (size * 1.15)) % 2) * (size * 0.5);
      for (let x = -size; x < w + size; x += size) {
        drawHex(x + offset, y, 16, pulse);
      }
    }
    ctx.restore();
  }

  function drawArrow(a) {
    const ang = Math.atan2(a.vy, a.vx);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(ang);

    ctx.strokeStyle = `rgba(0,200,5,${0.18 * a.life})`;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(18, 0);
    ctx.stroke();

    ctx.fillStyle = `rgba(0,200,5,${0.95 * a.life})`;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(8, -6);
    ctx.lineTo(8, 6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${0.85 * a.life})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();

    ctx.fillStyle = `rgba(0,200,5,${0.7 * a.life})`;
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(-34, -5);
    ctx.lineTo(-30, 0);
    ctx.lineTo(-34, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (a.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(a.trail[0].x, a.trail[0].y);
      a.trail.forEach((p, i) => {
        if (i) ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = `rgba(0,200,5,${0.35 * a.life})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function collide() {
    for (let i = 0; i < arrows.length; i += 1) {
      for (let j = i + 1; j < arrows.length; j += 1) {
        const a = arrows[i];
        const b = arrows[j];
        if (a.side === b.side) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (dx * dx + dy * dy < 420) {
          burst((a.x + b.x) / 2, (a.y + b.y) / 2, 26);
          a.life = 0;
          b.life = 0;
        }
      }
    }
  }

  function tick(now) {
    ctx.clearRect(0, 0, w, h);
    drawGrid(now);

    if (arrows.length < 18 && Math.random() < 0.045) {
      spawnArrow(Math.random() > 0.5);
    }
    if (Math.random() < 0.006) {
      const volleyFromLeft = Math.random() > 0.5;
      for (let i = 0; i < 4; i += 1) {
        setTimeout(() => spawnArrow(volleyFromLeft), i * 70);
      }
    }

    collide();

    for (let i = arrows.length - 1; i >= 0; i -= 1) {
      const a = arrows[i];
      a.x += a.vx;
      a.y += a.vy;
      a.trail.push({ x: a.x, y: a.y });
      if (a.trail.length > 10) a.trail.shift();
      if (a.x < -80 || a.x > w + 80 || a.y < -80 || a.y > h + 80) a.life = 0;
      drawArrow(a);
      if (a.life <= 0) arrows.splice(i, 1);
    }

    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.04;
      s.life -= 0.02;
      ctx.fillStyle = `rgba(${NEON_RGB[0]},${NEON_RGB[1]},${NEON_RGB[2]},${s.life})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      if (s.life <= 0) sparks.splice(i, 1);
    }

    for (let i = shocks.length - 1; i >= 0; i -= 1) {
      const sh = shocks[i];
      sh.r += 4.2;
      sh.life -= 0.03;
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,200,5,${sh.life * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (sh.life <= 0) shocks.splice(i, 1);
    }

    for (let i = hexPulses.length - 1; i >= 0; i -= 1) {
      const hx = hexPulses[i];
      hx.r += 2.4;
      hx.life -= 0.018;
      drawHex(hx.x, hx.y, hx.r, hx.life * 0.55);
      if (hx.life <= 0) hexPulses.splice(i, 1);
    }

    if (pointer.active) {
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 16 + Math.sin(now / 120) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,200,5,0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pointer.x - 22, pointer.y);
      ctx.lineTo(pointer.x + 22, pointer.y);
      ctx.moveTo(pointer.x, pointer.y - 22);
      ctx.lineTo(pointer.x, pointer.y + 22);
      ctx.strokeStyle = "rgba(0,200,5,0.28)";
      ctx.stroke();
    }

    requestAnimationFrame(tick);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  async function copyCA() {
    const value = caValue.textContent.trim();
    try {
      await navigator.clipboard.writeText(value);
      showToast("CA copied");
    } catch {
      const range = document.createRange();
      range.selectNodeContents(caValue);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      showToast("CA selected — copy it");
    }
  }

  resize();
  window.addEventListener("resize", resize);

  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });

  window.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  window.addEventListener("click", (e) => {
    if (e.target.closest("a, button, .nav")) return;
    const fromLeft = e.clientX < w / 2;
    spawnArrow(!fromLeft, { x: e.clientX, y: e.clientY });
    burst(e.clientX, e.clientY, 10);
  });

  copyBtn.addEventListener("click", copyCA);
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
  });

  if (!reduced) {
    for (let i = 0; i < 8; i += 1) spawnArrow(i % 2 === 0);
    requestAnimationFrame(tick);
  }
})();
