// The website's hero shoot, as Electron's main script on the Xvfb display (shoot.sh). One take walks the whole Studio:
// describe an explainer at Home and let Claude Code make it; look through motionhub's motions (applying one if asked); mark a
// spot on the picture with a note and send it; open the agent menu and its models; choose a voice and have the lines
// spoken; export the MP4. marks.json keeps the time of each beat for the cut (promo/make.mjs).
//
// The voice needs a MiniMax key: MINIMAX_API_KEY (and MINIMAX_REGION, china by default) from the environment, sealed
// into the take's own settings for the length of the take and deleted after it. Without one the voice beat is skipped.
// DRY=1 stops before the first message is sent, so no agent turn is spent.
const { app, BrowserWindow, dialog, safeStorage, webContents } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const DESKTOP = process.env.OMS_DESKTOP;
const TEMP = process.env.SHOOT_TEMP;
const USER_DATA = path.join(TEMP, 'user-data');
const EXPORTED = path.join(TEMP, 'export.mp4');
const W = 1920, H = 1080, ZOOM = 1.1;
// What the take asks for: the website's first example, why the Moon has phases, short. The Moon stands in the middle
// of the first scene so the region (REGION) finds it.
const BRIEF = process.env.SHOOT_BRIEF ||
  'A 15-second explainer: why the Moon has phases, in a look of its own: a deep night-blue sky, the Sun a warm white-gold ' +
  'light on the left, the Moon one real three.js sphere lit by that light alone (a procedural cratered surface, no ' +
  'downloaded texture), Earth a small blue disc. Scene 1: sunlight always lights exactly half of the Moon, large in the ' +
  'middle of the frame. Scene 2: seen from above, the Moon circles Earth, its lit half always facing the Sun. Scene 3: ' +
  'from Earth we see more or less of that lit half: new, crescent, half, full, each the same sphere seen from another ' +
  'place, never a drawn crescent. One short line of narration a scene.';
const LOOK = process.env.SHOOT_LOOK || '';                         // typed in the motions' search, if any
const BROWSE = (process.env.SHOOT_BROWSE || 'Depth Stage,Earth Block,Pixel Quest,Stage Light').split(',');  // opened in turn
// The one applied, if any: the Moon keeps its own look by default, the motions only looked through.
const LOOK_NAME = process.env.SHOOT_LOOK_NAME ?? '';
const VOICE_WORDS = process.env.SHOOT_VOICE_WORDS || 'Trustworthy';  // typed in the voices' search
const VOICE = process.env.SHOOT_VOICE || 'English_Trustworthy_Man';  // MiniMax's, chosen from what it finds
// What a viewer of the first cut would ask: the dark half is lost in the sky, so the Moon's shape is too.
const NOTE = 'The dark half melts into the night sky, so the Moon loses its shape. Give it a faint earthshine so the whole disc stays visible.';
const REGION = [0.5, 0.15, 0.72, 0.85]; // the Moon's dark half, as fractions of the film: left, top, right, bottom

app.setPath('userData', USER_DATA);
app.setAppPath(DESKTOP);

const marks = [];
const mark = (name) => { marks.push({ name, at: Date.now() }); fs.writeFileSync(path.join(TEMP, 'marks.json'), JSON.stringify(marks, null, 1)); console.log('MARK', name); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(150); }
  throw new Error('Timed out: ' + label);
}

// The real pointer.
const pointer = spawn('python3', [path.join(__dirname, 'pointer.py')], { stdio: ['pipe', 'pipe', 'inherit'] });
const waiting = [];
pointer.stdout.on('data', (b) => { for (const _ of b.toString().trim().split('\n')) waiting.shift()?.(); });
const say = (line) => new Promise((done) => { waiting.push(done); pointer.stdin.write(line + '\n'); });

// Where an element is on screen. The editor is a view filling the main window, so a page without a window of its
// own is placed in the main one.
const js = (wc, src) => wc.executeJavaScript(src, true);
async function rect(wc, finder) {
  const r = await js(wc, `(() => { const el = (${finder})(); if (!el) return null; const b = el.getBoundingClientRect(); return b.width ? {x:b.x,y:b.y,w:b.width,h:b.height} : null; })()`);
  if (!r) return null;
  const c = (BrowserWindow.fromWebContents(wc) || BrowserWindow.getAllWindows()[0]).getContentBounds();
  const z = wc.getZoomFactor();
  return { x: c.x + r.x * z, y: c.y + r.y * z, w: r.w * z, h: r.h * z };
}
const byLabel = (label) => `() => document.querySelector('[aria-label=${JSON.stringify(label)}]')`;
const byText = (tag, text) => `() => [...document.querySelectorAll(${JSON.stringify(tag)})].find(e => e.offsetParent && e.textContent.trim().startsWith(${JSON.stringify(text)}))`;
const byPattern = (tag, source) => `() => [...document.querySelectorAll(${JSON.stringify(tag)})].find(e => e.offsetParent && new RegExp(${JSON.stringify(source)}, 'i').test(e.textContent.trim()))`;
const exists = (wc, finder) => js(wc, `!!(${finder})()`).catch(() => false);
async function go(wc, finder, label, ms = 650) {
  const r = await until(() => rect(wc, finder), label);
  await say(`move ${Math.round(r.x + r.w / 2)} ${Math.round(r.y + r.h / 2)} ${ms}`);
  return r;
}
async function press(wc, finder, label, ms) { await go(wc, finder, label, ms); await sleep(180); await say('click'); await sleep(250); }
async function type(wc, text, perChar = 38) { for (const ch of text) { wc.insertText(ch); await sleep(perChar + (ch === ' ' ? 20 : 0)); } }
const key = (wc, keyCode) => { wc.sendInputEvent({ type: 'keyDown', keyCode }); wc.sendInputEvent({ type: 'keyUp', keyCode }); };

/** The agent's turn: it starts (the send button turns to stop), then ends, however long it takes. */
async function turn(wc, label) {
  await until(() => exists(wc, `() => document.querySelector('.send.stop')`), `${label} starts`, 60000).catch(() => {});
  await until(async () => !(await exists(wc, `() => document.querySelector('.send.stop')`)), `${label} ends`, 15 * 60 * 1000);
}

/** Plays the film from its start with the pointer out of the picture's way; paused after `pause` ms, if given. */
async function playFromStart(wc, frame, name, pause) {
  await say(`move ${Math.round(frame.x + frame.w * 0.62)} ${Math.round(frame.y + frame.h * 1.04)} 700`);
  await js(wc, 'document.activeElement && document.activeElement.blur()');
  key(wc, 'Home');
  await sleep(400);
  await press(wc, byLabel('Play'), name, 700);
  mark(name);
  if (pause) {
    await sleep(pause);
    // A film shorter than the wait has stopped by itself.
    if (await exists(wc, byLabel('Pause'))) await press(wc, byLabel('Pause'), 'pause', 300);
  }
}

// The voice provider, sealed as the Studio seals one (providers.ts), into this take's settings only.
function sealVoice() {
  const secret = process.env.MINIMAX_API_KEY;
  if (!secret) return false;
  const keysFile = path.join(USER_DATA, 'keys.json');
  const settingsFile = path.join(USER_DATA, 'settings.json');
  const keys = fs.existsSync(keysFile) ? JSON.parse(fs.readFileSync(keysFile, 'utf8')) : {};
  keys['voice:minimax'] = safeStorage.encryptString(secret).toString('base64');
  fs.writeFileSync(keysFile, JSON.stringify(keys));
  const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  // The provider is set up; the voice itself is chosen in the take, in the Voice view.
  settings.voices = { ...settings.voices, minimax: { region: process.env.MINIMAX_REGION || 'china' } };
  // Gemini and DeepSeek for the built-in agent, so the agent menu shows them after Codex and Claude Code. Their keys are
  // placeholders, never used (the film is made by Claude Code), sealed for the take and deleted with keys.json after it.
  keys.gemini = safeStorage.encryptString('shoot-placeholder').toString('base64');
  keys.deepseek = safeStorage.encryptString('shoot-placeholder').toString('base64');
  fs.writeFileSync(keysFile, JSON.stringify(keys));
  settings.providers = [
    { id: 'gemini', name: 'Gemini', protocol: 'openai', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-4-argon', images: true },
    { id: 'deepseek', name: 'DeepSeek', protocol: 'openai', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-pro', images: false },
  ];
  settings.active = 'gemini';
  fs.writeFileSync(settingsFile, JSON.stringify(settings));
  return true;
}
const unsealVoice = () => fs.rmSync(path.join(USER_DATA, 'keys.json'), { force: true });

// The export's save dialog would be a native window over the take: the file goes to the take's folder instead.
dialog.showSaveDialog = async () => ({ canceled: false, filePath: EXPORTED });

require(path.join(DESKTOP, 'out/main/index.js'));

(async () => {
  try {
    await app.whenReady();
    const win = await until(() => BrowserWindow.getAllWindows()[0], 'main window');
    win.setBounds({ x: 0, y: 0, width: W, height: H });
    const home = win.webContents;
    home.setZoomFactor(ZOOM);
    await until(async () => !home.isLoading() && (await exists(home, `() => document.querySelector('.home-prompt textarea')`)), 'home', 30000);
    await sleep(1500);
    // Xvfb has no keyring, so the store would refuse to seal: this take's process seals in plain text instead (Linux
    // only), and the key's file is deleted when the take ends.
    if (process.env.MINIMAX_API_KEY && !safeStorage.isEncryptionAvailable()) safeStorage.setUsePlainTextEncryption?.(true);
    const voiced = sealVoice();
    console.log('voice', voiced ? 'sealed' : 'left out', safeStorage.getSelectedStorageBackend?.());
    mark('home');

    // 1. Describe it: the sentence at Home, to Claude Code.
    await press(home, `() => document.querySelector('.home-prompt textarea')`, 'brief field', 900);
    mark('brief');
    await type(home, BRIEF, 30);
    await sleep(500);
    if (await exists(home, byLabel('Claude Code'))) await press(home, byLabel('Claude Code'), 'claude code', 600);
    if (process.env.DRY) { mark('dry-end'); await sleep(1500); return; }
    await press(home, byText('button', 'Start creating'), 'start creating', 700);
    mark('brief-sent');

    const wc = await until(async () => {
      for (const c of webContents.getAllWebContents()) {
        if (c === home || c.isDestroyed()) continue;
        if (await js(c, '!!document.querySelector(".agent-chip")').catch(() => false)) return c;
      }
      return null;
    }, 'editor', 60000);
    wc.setZoomFactor(ZOOM);
    mark('editor');
    await turn(wc, 'the first cut');
    mark('made');
    await sleep(2500);
    const frame = await until(() => rect(wc, `() => document.querySelector('iframe[title="Film preview"]')`), 'film frame');
    // The first cut, played through: the whole explainer, made from one sentence.
    await playFromStart(wc, frame, 'play-v1', 15500);
    await sleep(600);

    // 2. A look from motionhub, applied by the agent.
    await press(wc, byText('button', 'Motions'), 'motions', 800);
    mark('motions');
    if (LOOK) {
      await press(wc, byLabel('Search motions'), 'search motions', 600);
      await type(wc, LOOK, 70);
    }
    // Every poster in sight has loaded from motionhub before anything is opened.
    await until(() => js(wc, `(() => { const imgs = [...document.querySelectorAll('.library-grid img.poster')]; return imgs.length > 0 && imgs.every(i => i.complete && i.naturalWidth > 0); })()`), 'posters', 45000).catch(() => {});
    await sleep(1500);
    const card = (name) => `() => { const b = [...document.querySelectorAll('.library-grid li button')].find(e => e.textContent.includes(${JSON.stringify(name)})); if (b) b.scrollIntoView({ block: 'nearest' }); return b; }`;
    for (const [i, name] of BROWSE.entries()) {
      if (!(await exists(wc, card(name)))) continue;
      await press(wc, card(name), name, 600);
      mark(`browse-${i + 1}`);
      // Its reel, once it plays.
      await until(() => js(wc, `(() => { const v = document.querySelector('.library-detail video'); return !!document.querySelector('.library-detail iframe.reel-frame') || (!!v && v.readyState >= 3 && v.currentTime > 0.3); })()`), 'reel', 15000).catch(() => {});
      mark(`reel-${i + 1}`);
      await sleep(2400);
    }
    if (LOOK_NAME) {
      await press(wc, card(LOOK_NAME), 'a look', 700);
      mark('look-open');
      await sleep(2800);
      await press(wc, `() => document.querySelector('.library-detail .button.primary')`, 'apply', 700);
      await sleep(500);
      // The confirmation is a dialog over the drawer, its own Apply button beside Cancel.
      await press(wc, `() => document.querySelector('.modal-shell .dialog-actions .button.primary')`, 'apply confirmed', 600);
      mark('look-sent');
      await turn(wc, 'the look');
    }
    mark('look-done');
    await sleep(1500);
    if (await exists(wc, `() => document.querySelector('.library-detail, .library-grid')`)) { key(wc, 'Escape'); await sleep(400); key(wc, 'Escape'); }
    await sleep(1200);
    const framed = await until(() => rect(wc, `() => document.querySelector('iframe[title="Film preview"]')`), 'film frame');
    // The film from the start (in its new look, if one was applied); then again, paused 2 s in, the Moon in sight.
    await playFromStart(wc, framed, 'play-look', 8000);
    await sleep(600);
    await playFromStart(wc, framed, 'play-look-2', 2000);
    mark('paused');
    await sleep(700);

    // 3. Circle it, say what to change, send.
    await press(wc, byLabel('Mark a region'), 'region', 800);
    const [l, t, r, b] = REGION;
    await say(`move ${Math.round(framed.x + framed.w * l)} ${Math.round(framed.y + framed.h * t)} 900`);
    await sleep(200);
    mark('drag');
    await say('down');
    await say(`move ${Math.round(framed.x + framed.w * r)} ${Math.round(framed.y + framed.h * b)} 1100`);
    await say('up');
    await sleep(700);
    await press(wc, byLabel('What should change here'), 'note', 500);
    mark('note');
    await type(wc, NOTE, 45);
    await sleep(600);
    await press(wc, byText('button', 'Add mark'), 'add mark', 600);
    await sleep(900);
    await press(wc, `() => document.querySelector('textarea[placeholder^="Ask for a film"], .composer textarea')`, 'composer', 800);
    await type(wc, 'Keep everything else as it is.', 34);
    await sleep(500);
    await press(wc, byLabel('Send'), 'send', 600);
    mark('sent');
    await turn(wc, 'the change');
    mark('agent-done');
    await sleep(2500);
    await playFromStart(wc, framed, 'play-v2');
    await sleep(8500);
    mark('v2-end');

    // 4. Your own AI: the agent menu, its agents and the models of the one in use.
    try {
      await press(wc, "() => document.querySelector('.agent-chip')", 'agent chip', 800);
      mark('agents-open');
      await sleep(900);
      const rows = await js(wc, "document.querySelectorAll('.agent-menu [role=menuitemradio]').length");
      for (let row = 0; row < rows; row++) {
        await go(wc, `() => document.querySelectorAll('.agent-menu [role=menuitemradio]')[${row}]`, 'agent row', 450);
        await sleep(650);
      }
      mark('agents-rows');
      const model = "() => document.querySelector('.agent-menu [aria-label=\"Model\"]')";
      await until(() => exists(wc, model), 'models', 20000);
      await press(wc, model, 'model', 600);
      mark('agents-models');
      await sleep(600);
      for (const i of [1, 2, 3, 4]) {
        const option = `() => document.querySelectorAll('.select-popup [role=option]')[${i}]`;
        if (!(await exists(wc, option))) break;
        await go(wc, option, 'model option', 350);
        await sleep(500);
      }
      await sleep(700);
      key(wc, 'Escape');
      await sleep(300);
      key(wc, 'Escape');
      mark('agents-close');
    } catch (e) {
      console.error('agent menu', e);
      key(wc, 'Escape');
    }
    await sleep(1200);

    // 5. A voice, chosen from the provider's own: the agent gives it to the film and the Studio speaks its lines.
    const voiceButton = `() => [...document.querySelectorAll('header .button')].find(e => e.textContent.trim() === 'Voice')`;
    if (voiced && (await exists(wc, voiceButton))) {
      await press(wc, voiceButton, 'voice', 800);
      mark('voice');
      await sleep(1500);
      await press(wc, byLabel('Search voices'), 'search voices', 700);
      await type(wc, VOICE_WORDS, 80);
      mark('voice-search');
      const choice = `() => [...document.querySelectorAll('.voice-choices .voice-choice')].find(e => e.textContent.includes(${JSON.stringify(VOICE)})) || document.querySelector('.voice-choices .voice-choice')`;
      await until(() => exists(wc, choice), 'voices listed', 30000);
      await sleep(900);
      await press(wc, choice, 'a voice', 700);
      mark('voice-chosen');
      await sleep(900);
      await press(wc, byText('button', 'Use this voice'), 'use this voice', 700);
      mark('voice-sent');
      await turn(wc, 'the voice');
      await sleep(1500);
      if (await exists(wc, byPattern('button', '^Voice \\d+ lines?$'))) {
        await press(wc, byPattern('button', '^Voice \\d+ lines?$'), 'voice lines', 700);
        mark('voicing');
        await until(() => exists(wc, byPattern('[role=status]', '^(Spoke|Nothing changed)')), 'voiced', 5 * 60 * 1000);
      }
      mark('voiced');
      await sleep(2500);
      key(wc, 'Escape');
      await sleep(1000);
      await playFromStart(wc, framed, 'play-voice', 15500);
    }

    // 6. Export the MP4.
    await sleep(800);
    await press(wc, byText('button', 'Export MP4'), 'export', 800);
    mark('export-open');
    await press(wc, byText('button', 'Choose where to save'), 'choose where to save', 700);
    mark('export-start');
    await until(() => exists(wc, byText('button', 'Exporting')), 'exporting', 30000).catch(() => {});
    await until(async () => !(await exists(wc, byText('button', 'Exporting'))), 'exported', 10 * 60 * 1000);
    mark('export-done');
    await sleep(3000);
    mark('end');
    await sleep(800);
  } catch (e) {
    console.error('SHOOT FAILED', e);
    mark('failed');
  } finally {
    unsealVoice();
    pointer.stdin.end();
    app.exit(0);
  }
})();
