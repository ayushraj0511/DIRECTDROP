// Animated background: a quiet field of drifting nodes. Nearby nodes are linked
// by faint lines, and now and then a small packet travels along one of them —
// the same idea the app is built on (one device handing data straight to another).

export function startBackground() {
  if (document.getElementById("bg")) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  canvas.id = "bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  // colours per theme (read every frame, so the switch takes effect at once)
  const PALETTES = {
    dark:  { link: [120, 135, 220], linkAlpha: 0.3, dot: "rgba(200,208,245,.38)", ring: "rgba(200,208,245,.35)", hub: "rgba(226,189,120,.75)", packet: [226, 189, 120], head: "255,236,200" },
    light: { link: [70, 86, 170],   linkAlpha: 0.26, dot: "rgba(40,52,110,.4)",    ring: "rgba(40,52,110,.35)",   hub: "rgba(150,100,20,.8)",   packet: [176, 118, 24],  head: "120,78,10" }
  };
  const pal = () => PALETTES[document.documentElement.dataset.theme === "light" ? "light" : "dark"];

  let w = 0, h = 0, linkDist = 180;
  let nodes = [];
  let packets = [];
  let lastSpawn = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    linkDist = Math.max(130, Math.min(230, w / 5));
    const count = Math.round(Math.min(52, Math.max(18, (w * h) / 28000)));
    nodes = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      hub: i % 7 === 0
    }));
    packets = [];
  }

  function step() {
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -40) n.x = w + 40; else if (n.x > w + 40) n.x = -40;
      if (n.y < -40) n.y = h + 40; else if (n.y > h + 40) n.y = -40;
    }
  }

  function spawnPacket(now) {
    if (now - lastSpawn < 1300 || packets.length > 5) return;
    for (let tries = 0; tries < 14; tries++) {
      const a = Math.floor(Math.random() * nodes.length);
      const b = Math.floor(Math.random() * nodes.length);
      if (a === b) continue;
      const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
      if (d < linkDist * 0.95) {
        packets.push({ a, b, t: 0, speed: 0.006 + Math.random() * 0.006 });
        lastSpawn = now;
        return;
      }
    }
  }

  function draw(now) {
    const P = pal();
    const LINK = { r: P.link[0], g: P.link[1], b: P.link[2] };
    const PACKET = { r: P.packet[0], g: P.packet[1], b: P.packet[2] };
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > linkDist) continue;
        const alpha = (1 - d / linkDist) * P.linkAlpha;
        ctx.strokeStyle = `rgba(${LINK.r},${LINK.g},${LINK.b},${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const n of nodes) {
      if (n.hub) {
        ctx.strokeStyle = P.ring;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = n.hub ? P.hub : P.dot;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.hub ? 1.8 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduceMotion) {
      spawnPacket(now);
      packets = packets.filter(p => {
        p.t += p.speed;
        if (p.t >= 1) return false;
        const a = nodes[p.a], b = nodes[p.b];
        if (Math.hypot(a.x - b.x, a.y - b.y) > linkDist * 1.15) return false;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        const tx = a.x + (b.x - a.x) * Math.max(0, p.t - 0.09);
        const ty = a.y + (b.y - a.y) * Math.max(0, p.t - 0.09);
        const fade = Math.sin(p.t * Math.PI);

        const grad = ctx.createLinearGradient(tx, ty, x, y);
        grad.addColorStop(0, `rgba(${PACKET.r},${PACKET.g},${PACKET.b},0)`);
        grad.addColorStop(1, `rgba(${PACKET.r},${PACKET.g},${PACKET.b},${0.85 * fade})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.fillStyle = `rgba(${P.head},${0.9 * fade})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
    }
  }

  function frame(now) {
    step();
    draw(now);
    requestAnimationFrame(frame);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); if (reduceMotion) draw(0); }, 150);
  });

  resize();
  if (reduceMotion) draw(0);
  else requestAnimationFrame(frame);
}
