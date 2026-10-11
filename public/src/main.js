import { Peer } from "peerjs";
import QRCode from "qrcode";
import "./style.css";

const app = document.querySelector("#app");

const state = {
  mode: null,
  peer: null,
  conn: null,
  files: [],
  code: "",
  token: "",
  joinToken: "",
  sessionPeerId: "",
  connected: false,
  transfer: null,
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
};

const $ = (s) => document.querySelector(s);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes || 1) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 2 : 0)} ${units[i]}`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  seconds = Math.ceil(seconds);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function render(html) {
  app.innerHTML = `<main class="shell">${html}</main>`;
  requestAnimationFrame(() => app.querySelector(".view")?.classList.add("visible"));
}

function toast(message, type = "info") {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.dataset.type = type;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2800);
}

function icon(name) {
  const icons = {
    send: `<svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14"/></svg>`,
    receive: `<svg viewBox="0 0 24 24"><path d="M12 4v12m0 0 5-5m-5 5-5-5M5 20h14"/></svg>`,
    file: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
    copy: `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>`,
    link: `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 7 20l1.15-1.15"/></svg>`
  };
  return icons[name] || "";
}


function siteNav(active = "") {
  return `
    <header class="topbar">
      <button class="logo" id="logoHome" aria-label="DirectDrop home">
        <span>DIRECT</span><em>DROP</em>
      </button>
      <nav class="nav">
        <button class="${active === "home" ? "active" : ""}" data-nav="home">Home</button>
        <button class="${active === "send" ? "active" : ""}" data-nav="send">Send</button>
        <button class="${active === "receive" ? "active" : ""}" data-nav="receive">Receive</button>
        <button class="${active === "about" ? "active" : ""}" data-nav="about">About</button>
      </nav>
    </header>
  `;
}

function bindNav() {
  $("#logoHome")?.addEventListener("click", home);
  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.nav;
      if (target === "home") home();
      if (target === "send") senderPicker();
      if (target === "receive") receiverPage();
      if (target === "about") aboutPage();
    });
  });
}

function featureStrip() {
  return `
    <div class="feature-strip">
      <div class="feature">
        <span class="feature-icon">⌑</span>
        <div><b>Encrypted connection</b><small>Your files stay private</small></div>
      </div>
      <div class="feature">
        <span class="feature-icon">ϟ</span>
        <div><b>Fast transfer</b><small>No waiting, no uploads</small></div>
      </div>
      <div class="feature">
        <span class="feature-icon">⌁</span>
        <div><b>No cloud storage</b><small>Direct device to device</small></div>
      </div>
    </div>
  `;
}

function aboutPage() {
  render(`
    ${siteNav("about")}
    <section class="view about-page">
      <p class="eyebrow">ABOUT DIRECTDROP</p>
      <h2>Simple file sharing.<br><em>Without the cloud.</em></h2>
      <p class="about-copy">DirectDrop connects two browsers with WebRTC so a file can move directly between devices whenever the network allows it. A temporary session server helps the devices find each other, while the file itself is not permanently stored by DirectDrop.</p>
      <div class="about-grid">
        <div><b>01</b><h3>Pick</h3><p>Choose a file on the sender device.</p></div>
        <div><b>02</b><h3>Connect</h3><p>Use a QR code, link, or six-digit code.</p></div>
        <div><b>03</b><h3>Transfer</h3><p>Watch live speed, progress and ETA.</p></div>
        <div><b>04</b><h3>Save</h3><p>Click the download button to save the file on your device.</p></div>
      </div>
      ${featureStrip()}
      <p class="developer-credit">Engineered by <b>Ayush Raj</b></p>
    </section>
  `);
  bindNav();
}

function home() {
  state.mode = null;
  render(`
    ${siteNav("home")}
    <section class="view hero">
      <p class="eyebrow">PRIVATE · FAST · PEER-TO-PEER</p>
      <h1 class="hero-title"><span>Move files.</span><br><em>Directly.</em></h1>
      <p class="lead">Send files between devices without uploading them to a cloud storage service.</p>
      <div class="choice-grid">
        <button class="choice-card" id="senderBtn">
          <span class="choice-icon">${icon("send")}</span>
          <span><b>Sender</b><small>Choose and share a file</small></span>
          <span class="choice-arrow">${icon("arrow")}</span>
        </button>
        <button class="choice-card" id="receiverBtn">
          <span class="choice-icon">${icon("receive")}</span>
          <span><b>Receiver</b><small>Connect and download</small></span>
          <span class="choice-arrow">${icon("arrow")}</span>
        </button>
      </div>
      ${featureStrip()}
    </section>
  `);
  bindNav();
  $("#senderBtn").onclick = senderPicker;
  $("#receiverBtn").onclick = receiverPage;
}

function totalSize(files) {
  return files.reduce((n, f) => n + f.size, 0);
}

function senderPicker() {
  state.mode = "sender";
  render(`
    ${siteNav("send")}
    <section class="view page-content">
      <div class="page-head">
        <p class="eyebrow">SENDER</p>
        <h2>Share your files</h2>
        <p>Choose one or more files to send to another device.</p>
      </div>
      <label class="dropzone" id="dropzone">
        <input id="fileInput" type="file" multiple hidden />
        <div class="drop-icon">${icon("file")}</div>
        <strong>Drag & drop your files here</strong>
        <span>or</span>
        <button type="button" class="dark-mini" id="pickButton">Choose Files</button>
      </label>
      <div class="selected-file" id="selectedFile"></div>
      ${featureStrip()}
    </section>
  `);
  bindNav();
  const dz = $("#dropzone"), input = $("#fileInput");
  $("#pickButton").onclick = (e) => { e.preventDefault(); input.click(); };
  input.onchange = () => { addFiles(Array.from(input.files || [])); input.value = ""; };
  ["dragenter", "dragover"].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.add("drag"); }));
  ["dragleave", "drop"].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.remove("drag"); }));
  dz.addEventListener("drop", ev => addFiles(Array.from(ev.dataTransfer.files || [])));
  renderSelectedFiles();
}

function addFiles(list) {
  const added = list.filter(f => f && !state.files.some(x => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified));
  state.files.push(...added);
  renderSelectedFiles();
}

function renderSelectedFiles() {
  const box = $("#selectedFile");
  if (!box) return;
  if (!state.files.length) { box.innerHTML = ""; return; }
  box.innerHTML = `
    <div class="file-list">
      ${state.files.map((f, i) => `
        <div class="file-row">
          <div class="file-symbol">${icon("file")}</div>
          <div><b>${escapeHtml(f.name)}</b><span>${formatBytes(f.size)}</span></div>
          <button type="button" class="row-remove" data-remove="${i}" aria-label="Remove ${escapeHtml(f.name)}">✕</button>
        </div>`).join("")}
    </div>
    <button type="button" class="primary-btn" id="shareBtn">Share ${state.files.length} file${state.files.length > 1 ? "s" : ""} · ${formatBytes(totalSize(state.files))} ${icon("arrow")}</button>
  `;
  box.querySelectorAll("[data-remove]").forEach(btn => {
    btn.onclick = () => { state.files.splice(Number(btn.dataset.remove), 1); renderSelectedFiles(); };
  });
  $("#shareBtn").onclick = () => prepareSender(state.files);
}

async function prepareSender(files) {
  render(`
    <section class="view narrow">
      <button class="back" id="back">← Change files</button>
      <div class="file-card large">
        <div class="file-symbol">${icon("file")}</div>
        <div><b>${files.length} file${files.length > 1 ? "s" : ""}</b><span>${formatBytes(totalSize(files))}</span></div>
      </div>
      <div class="loading-card">
        <div class="spinner"></div>
        <b>Creating secure transfer</b>
        <span>Generating your temporary connection...</span>
      </div>
    </section>
  `);
  $("#back").onclick = () => { state.peer?.destroy(); senderPicker(); };
  await startSender();
}

async function getIce() {
  try {
    const r = await fetch("/api/ice");
    if (r.ok) state.iceServers = (await r.json()).iceServers;
  } catch {}
}

async function startSender() {
  await getIce();
  const peer = new Peer(undefined, {
    path: "/peerjs",
    host: location.hostname,
    port: location.port || (location.protocol === "https:" ? 443 : 80),
    secure: location.protocol === "https:",
    config: { iceServers: state.iceServers }
  });
  state.peer = peer;
  const connectionTimeout = setTimeout(() => {
    if (!peer.open) {
      peer.destroy();
      toast("Could not connect to the DirectDrop server. Check your network and try again.", "error");
      senderPicker();
    }
  }, 15000);

  peer.on("open", async (id) => {
    clearTimeout(connectionTimeout);
    try {
      const r = await fetch("/api/session", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ peerId: id })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not create session.");
      state.code = data.code;
      state.token = data.token;
      state.sessionPeerId = id;
      showSenderWaiting();
    } catch (e) {
      toast(e.message, "error");
      senderPicker();
    }
  });

  peer.on("connection", conn => {
    state.conn = conn;
    setupSenderConnection(conn);
  });

  peer.on("error", e => {
    clearTimeout(connectionTimeout);
    console.error(e);
    toast(peerError(e), "error");
  });
}

function peerError(e) {
  if (e?.type === "network") return "Peer network connection failed.";
  if (e?.type === "peer-unavailable") return "Receiver connection could not be established.";
  return e?.message || "Connection error.";
}

function shareUrl() {
  return `${location.origin}/?join=${encodeURIComponent(state.code)}`;
}

async function showSenderWaiting() {
  render(`
    ${siteNav("send")}
    <section class="view page-content">
      <div class="page-head">
        <p class="eyebrow">SENDER</p>
        <h2>Ready to share</h2>
        <p>Share the code or scan the QR to connect.</p>
      </div>
      <div class="ready-grid">
        <div class="qr-card">
          <canvas id="qr"></canvas>
          <b>Scan QR to receive</b>
        </div>
        <div class="ready-panel">
          <div class="ready-block">
            <label>6-DIGIT CODE</label>
            <div class="code-slots">${state.code.split("").map(x => `<span>${x}</span>`).join("")}<button id="copyCode" class="copy-btn">${icon("copy")}</button></div>
          </div>
          <div class="ready-block">
            <label>SHARE LINK</label>
            <div class="link-box"><span>${escapeHtml(shareUrl())}</span><button id="copyLink">${icon("copy")}</button></div>
          </div>
        </div>
      </div>
      <div class="file-status">
        <div class="file-symbol">${icon("file")}</div>
        <div><b>${state.files.length === 1 ? escapeHtml(state.files[0].name) : `${state.files.length} files`}</b><span>${formatBytes(totalSize(state.files))}</span></div>
        <div class="waiting-dot"><i></i>Waiting for receiver…</div>
      </div>
      ${featureStrip()}
    </section>
  `);
  bindNav();
  $("#copyCode").onclick = () => navigator.clipboard.writeText(state.code).then(() => toast("Code copied."));
  $("#copyLink").onclick = () => navigator.clipboard.writeText(shareUrl()).then(() => toast("Link copied."));
  await QRCode.toCanvas($("#qr"), shareUrl(), { width: 220, margin: 2, color: { dark: "#0b0d10", light: "#ffffff" } });
}

function setupSenderConnection(conn) {
  conn.on("open", () => {
    state.connected = true;
    showTransfer("sender");
    sendFiles(conn, state.files);
  });
  conn.on("error", e => toast(e.message || "Connection failed.", "error"));
  conn.on("close", () => {
    if (state.transfer?.done) return;
    toast("Receiver disconnected.", "error");
  });
}

async function sendFiles(conn, files) {
  const CHUNK = 128 * 1024;
  const grandTotal = totalSize(files);
  let sentBefore = 0;
  const started = performance.now();
  let lastUI = 0;
  state.transfer = { total: grandTotal, transferred: 0, done: false, failed: false, meta: { name: "", size: grandTotal } };

  try {
    if (!conn.open) throw new Error("Connection is not open.");
    conn.send({ type: "manifest", count: files.length, total: grandTotal });

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      let offset = 0;
      state.transfer.meta = { name: file.name, size: grandTotal };
      state.transfer.label = `File ${idx + 1} of ${files.length}`;
      conn.send({ type: "meta", index: idx, count: files.length, name: file.name, size: file.size, mime: file.type || "application/octet-stream" });

      while (offset < file.size) {
        if (!conn.open) throw new Error("Receiver disconnected before the files finished sending.");

        while (conn.open && (conn.dataChannel?.bufferedAmount || 0) > 2 * 1024 * 1024) {
          await new Promise(r => setTimeout(r, 20));
        }
        if (!conn.open) throw new Error("Receiver disconnected before the files finished sending.");

        const end = Math.min(offset + CHUNK, file.size);
        const buf = await file.slice(offset, end).arrayBuffer();
        if (!conn.open) throw new Error("Receiver disconnected before the files finished sending.");
        conn.send(buf);
        offset = end;
        state.transfer.transferred = sentBefore + offset;

        const now = performance.now();
        if (now - lastUI > 120) {
          updateTransferUI(started, state.transfer);
          lastUI = now;
          await new Promise(r => setTimeout(r, 0));
        }
      }

      sentBefore += file.size;
      state.transfer.transferred = sentBefore;
      conn.send({ type: "file-done", index: idx });
    }

    if (!conn.open || state.transfer.transferred !== grandTotal) {
      throw new Error("The connection closed before the transfer completed.");
    }

    conn.send({ type: "done" });
    state.transfer.done = true;
    updateTransferUI(started, state.transfer);
    setTimeout(() => completePage(files.map(f => ({ name: f.name, size: f.size })), "sender"), 500);
  } catch (error) {
    state.transfer.failed = true;
    toast(error.message || "Transfer failed.", "error");
    const status = $("#detailStatus");
    if (status) status.textContent = "Transfer failed";
  }
}

function receiverPage() {
  state.mode = "receiver";
  render(`
    ${siteNav("receive")}
    <section class="view page-content receiver-page">
      <div class="page-head center">
        <p class="eyebrow">RECEIVER</p>
        <h2>Connect to a sender</h2>
        <p>Enter the 6-digit code to receive a file</p>
      </div>
      <div class="receiver-card">
        <form class="code-form" id="joinForm">
          <div class="code-inputs" id="codeInputs">
            ${[0,1,2,3,4,5].map(i => `<input maxlength="1" inputmode="numeric" aria-label="Digit ${i+1}" />`).join("")}
          </div>
          <button class="primary-btn" type="submit">Connect</button>
        </form>
        <div class="or"><span>OR</span></div>
        <button class="shared-link-btn" id="openLink">${icon("link")} Open a shared link</button>
      </div>
      ${featureStrip()}
    </section>
  `);
  bindNav();
  const inputs = [...document.querySelectorAll("#codeInputs input")];
  inputs[0].focus();
  inputs.forEach((input, i) => {
    input.oninput = () => {
      input.value = input.value.replace(/\D/g, "");
      if (input.value && inputs[i + 1]) inputs[i + 1].focus();
    };
    input.onkeydown = e => {
      if (e.key === "Backspace" && !input.value && inputs[i - 1]) inputs[i - 1].focus();
    };
  });
  $("#joinForm").onsubmit = e => {
    e.preventDefault();
    joinSession(inputs.map(x => x.value).join(""));
  };
  $("#openLink").onclick = () => {
    const link = prompt("Paste the DirectDrop share link:");
    if (!link) return;
    try {
      const url = new URL(link);
      const code = url.searchParams.get("join");
      if (/^\d{6}$/.test(code)) joinSession(code);
      else toast("That link is not a valid DirectDrop session.", "error");
    } catch { toast("Please enter a valid DirectDrop link.", "error"); }
  };
}

async function joinSession(code) {
  if (!/^\d{6}$/.test(code)) return toast("Enter all 6 digits.", "error");
  render(`<section class="view narrow center-state"><div class="spinner"></div><h2>Connecting…</h2><p>Finding the sender and negotiating a secure WebRTC connection.</p></section>`);
  try {
    await getIce();
    const r = await fetch("/api/session/join", {
      method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ code })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Code not found.");
    state.code = code;
    state.joinToken = data.joinToken || "";
    const peer = new Peer(undefined, {
      path: "/peerjs",
      host: location.hostname,
      port: location.port || (location.protocol === "https:" ? 443 : 80),
      secure: location.protocol === "https:",
      config: { iceServers: state.iceServers }
    });
    state.peer = peer;
    let opened = false;
    const connectionTimeout = setTimeout(async () => {
      if (!opened) {
        peer.destroy();
        await leaveSession();
        toast("Connection timed out. Make sure the sender is still waiting.", "error");
        receiverPage();
      }
    }, 20000);

    peer.on("open", () => {
      opened = true;
      clearTimeout(connectionTimeout);
      const conn = peer.connect(data.peerId, { reliable: true });
      state.conn = conn;
      setupReceiverConnection(conn);
    });
    peer.on("error", async e => {
      clearTimeout(connectionTimeout);
      await leaveSession();
      toast(peerError(e), "error");
      receiverPage();
    });
  } catch (e) {
    toast(e.message, "error");
    receiverPage();
  }
}

function setupReceiverConnection(conn) {
  const received = [];          // finished files: { name, size, mime, blob }
  let chunks = [];
  let meta = null;              // current file meta
  let fileReceived = 0;
  let allReceived = 0;
  let grandTotal = 0;
  let started = 0;
  let lastUI = 0;

  const fail = (msg) => {
    toast(msg, "error");
    if (state.transfer) state.transfer.failed = true;
    conn.close();
  };

  conn.on("open", () => {
    state.connected = true;
    started = performance.now();
    state.transfer = { total: 0, transferred: 0, done: false, meta: null };
    showTransfer("receiver");
  });

  conn.on("data", data => {
    if (data?.type === "manifest") {
      grandTotal = data.total;
      state.transfer.total = grandTotal;
      state.transfer.meta = { name: `${data.count} file${data.count > 1 ? "s" : ""}`, size: grandTotal };
      renderTransferStats("receiver", state.transfer.meta);
      return;
    }
    if (data?.type === "meta") {
      meta = data;
      chunks = [];
      fileReceived = 0;
      state.transfer.meta = { name: data.name, size: grandTotal || data.size };
      state.transfer.label = `File ${data.index + 1} of ${data.count}`;
      if (!grandTotal) state.transfer.total = data.size;
      renderTransferStats("receiver", state.transfer.meta);
      return;
    }
    if (data?.type === "file-done") {
      if (!meta) return fail("Transfer ended before file information was received.");
      if (fileReceived !== meta.size) {
        return fail(`"${meta.name}" incomplete: received ${formatBytes(fileReceived)} of ${formatBytes(meta.size)}.`);
      }
      received.push({
        name: meta.name,
        size: meta.size,
        mime: meta.mime,
        blob: new Blob(chunks, { type: meta.mime || "application/octet-stream" })
      });
      chunks = [];
      meta = null;
      return;
    }
    if (data?.type === "done") {
      if (meta || !received.length) return fail("Transfer ended before all files were received.");
      state.transfer.done = true;
      state.transfer.files = received;
      state.transfer.transferred = state.transfer.total;
      updateTransferUI(started, state.transfer);
      setTimeout(() => completePage(received, "receiver"), 350);
      return;
    }

    let size = 0;
    if (data instanceof ArrayBuffer) {
      chunks.push(data);
      size = data.byteLength;
    } else if (ArrayBuffer.isView(data)) {
      chunks.push(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
      size = data.byteLength;
    } else if (data instanceof Blob) {
      chunks.push(data);
      size = data.size;
    } else {
      return;
    }
    fileReceived += size;
    allReceived += size;
    state.transfer.transferred = allReceived;
    const now = performance.now();
    if (now - lastUI > 120) {
      updateTransferUI(started, state.transfer);
      lastUI = now;
    }
  });

  conn.on("error", async e => {
    await leaveSession();
    toast(e.message || "Transfer failed.", "error");
  });
  conn.on("close", async () => {
    if (!state.transfer?.done) {
      await leaveSession();
      toast("Sender disconnected before completion.", "error");
    }
  });
}

function showTransfer(role) {
  render(`
    ${siteNav(role === "sender" ? "send" : "receive")}
    <section class="view page-content transfer-page">
      <div class="page-head center">
        <p class="eyebrow">${role === "sender" ? "SENDING" : "RECEIVING"}</p>
        <h2 id="transferTitle">${role === "sender" ? "Sending files…" : "Receiving files…"}</h2>
        <p>Keep this page open until the transfer is complete.</p>
      </div>
      <div class="transfer-card">
        <div class="transfer-file">
          <div class="file-symbol">${icon("file")}</div>
          <div><b id="transferName">Preparing transfer…</b><span><span id="statLabel"></span> <span id="statSize">—</span></span></div>
          <strong id="progressNumber">0%</strong>
        </div>
        <div class="progress-wrap"><div class="progress-bar"><div id="progressFill"></div></div></div>
        <div class="transfer-meta"><span id="statTransferred">0 B</span><span id="statSpeed">—</span><span id="statEta">—</span></div>
        <div class="detail-stats">
          <div><span>Speed</span><b id="detailSpeed">—</b></div>
          <div><span>Elapsed time</span><b id="detailElapsed">00:00:00</b></div>
          <div><span>Remaining time</span><b id="detailEta">—</b></div>
          <div><span>Status</span><b><i class="status-dot"></i> <span id="detailStatus">${role === "sender" ? "Sending…" : "Receiving…"}</span></b></div>
        </div>
        <button class="danger-btn" id="cancel">Cancel Transfer</button>
      </div>
    </section>
  `);
  bindNav();
  $("#cancel").onclick = () => {
    state.conn?.close(); state.peer?.destroy(); closeSession().finally(home);
  };
}

function renderTransferStats(role, meta) {
  if (meta?.name) $("#transferName").textContent = meta.name;
  if (meta?.size != null) $("#statSize").textContent = formatBytes(meta.size);
}

function updateTransferUI(started, t) {
  const total = t.total || t.meta?.size || 0;
  const transferred = t.transferred || 0;
  const elapsed = Math.max((performance.now() - started) / 1000, 0.001);
  const speed = transferred / elapsed;
  const pct = total ? Math.min(100, transferred / total * 100) : 0;
  const remaining = speed > 0 && total ? (total - transferred) / speed : Infinity;
  const name = t.meta?.name || "File";
  const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  set("#transferName", name);
  set("#statLabel", t.label ? `${t.label} ·` : "");
  set("#statTransferred", `${formatBytes(transferred)} / ${formatBytes(total)}`);
  set("#statSpeed", `${formatBytes(speed)}/s`);
  set("#statEta", pct >= 100 ? "Done" : formatTime(remaining));
  set("#statSize", formatBytes(total));
  set("#progressNumber", `${pct.toFixed(0)}%`);
  set("#detailSpeed", `${formatBytes(speed)}/s`);
  set("#detailEta", pct >= 100 ? "Done" : formatTime(remaining));
  set("#detailElapsed", formatTime(elapsed));
  const fill = $("#progressFill"); if (fill) fill.style.width = `${pct}%`;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function completePage(files, role) {
  const n = files.length;
  const plural = n > 1;
  render(`
    ${siteNav(role === "sender" ? "send" : "receive")}
    <section class="view page-content center complete">
      <p class="eyebrow">${role === "sender" ? "TRANSFER COMPLETE" : "RECEIVED"}</p>
      <div class="success-icon">${icon("check")}</div>
      <h2>${role === "sender" ? (plural ? `${n} files sent successfully.` : "File sent successfully.") : (plural ? `${n} files received!` : "File received!")}</h2>
      <p class="complete-sub">The ${plural ? "files have" : "file has"} been transferred successfully.</p>
      <div class="complete-list">
        ${files.map((f, i) => `
          <div class="complete-card">
            <div class="file-symbol">${icon("file")}</div>
            <div><b>${escapeHtml(f.name)}</b><span>${formatBytes(f.size || 0)}</span></div>
            ${role === "receiver" ? `<button class="primary-btn" data-dl="${i}">Download ${icon("arrow")}</button>` : ""}
          </div>`).join("")}
        ${role === "receiver" && plural ? `<button class="primary-btn" id="dlAll">Download all ${n} files ${icon("arrow")}</button>` : ""}
        <div class="complete-banner"><span class="check-small">✓</span><div><b>Transfer completed</b><small>${role === "receiver" ? "You can now download the files to your device." : "The receiver can now use the transferred files."}</small></div></div>
      </div>
      <button class="text-btn" id="doneBtn">Done</button>
    </section>
  `);
  bindNav();
  if (role === "receiver") {
    document.querySelectorAll("[data-dl]").forEach(btn => {
      btn.onclick = () => { const f = files[Number(btn.dataset.dl)]; downloadBlob(f.blob, f.name); };
    });
    $("#dlAll")?.addEventListener("click", () => {
      // stagger so browsers don't block multiple downloads
      files.forEach((f, i) => setTimeout(() => downloadBlob(f.blob, f.name), i * 400));
    });
  }
  $("#doneBtn").onclick = () => {
    state.files = [];
    state.peer?.destroy();
    state.conn?.close();
    closeSession().finally(home);
  };
}

async function leaveSession() {
  if (!state.code || !state.joinToken) return;
  try {
    await fetch("/api/session/leave", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ code: state.code, joinToken: state.joinToken })
    });
  } catch {}
  state.joinToken = "";
}

async function closeSession() {
  if (!state.code || !state.token) return;
  try {
    await fetch("/api/session/close", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ code: state.code, token: state.token })
    });
  } catch {}
  state.code = ""; state.token = ""; state.joinToken = "";
}

function boot() {
  home();
  const join = new URLSearchParams(location.search).get("join");
  if (join && /^\d{6}$/.test(join)) {
    setTimeout(() => joinSession(join), 250);
  }
}
boot();
