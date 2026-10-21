'use strict';

// ---------- Constants ----------

const STORAGE_KEY = 'hrr.visits.v1';
const RECORDS_PER_GP = 5;
const COLUMNS = [
  { key: 'allergies', label: 'Allergies & ADRs' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'alcohol', label: 'Alcohol' },
  { key: 'smoking', label: 'Smoking Status' },
  { key: 'ethnicity', label: 'Ethnicity/ATSI' },
  { key: 'nok', label: 'NOK' },
  { key: 'summary', label: 'Health Summary' },
  { key: 'medications', label: 'Medication List' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'notes', label: 'Notes' }
];
// Tap order for a cell: blank -> tick -> cross -> N/A -> blank
const CYCLE = ['', 'y', 'n', 'na'];
const SYMBOL = { '': '', y: '✓', n: '✗', na: 'N/A' };
const STATE_LABEL = { '': 'not yet reviewed', y: 'present and current', n: 'absent or incomplete', na: 'not applicable' };
const REMINDER = 'Random selection. Active patients only (3+ visits in the last 2 years).';
const IDENTIFIER_HINT = 'No patient names or identifiers';

// Equipment checklists, one of each per visit. Results are stored by item label,
// so renaming an item drops its saved result; adding or reordering items is safe.
const EQUIPMENT = [
  {
    key: 'bag',
    title: "Doctor's bag",
    reminder: 'Must: have a doctor’s bag that your GPs can access, and store medicines according to legal requirements.',
    items: [
      'Auriscope',
      'Disposable gloves',
      'Equipment for maintaining an airway in adults and children',
      'Hand sanitiser',
      'Intravenous access',
      'In-date medicines for medical emergencies',
      'Practice stationery (including prescription pads and letterhead)',
      'Ophthalmoscope',
      'Sharps container',
      'Sphygmomanometer',
      'Stethoscope',
      'Surgical mask',
      'Syringes and needles in a range of sizes',
      'Thermometer',
      'Tongue depressors',
      'Torch'
    ]
  },
  {
    key: 'room',
    title: 'Treatment room equipment',
    reminder: 'Must: have all required equipment, including the items below.',
    items: [
      'Ability to view x-rays',
      'Auriscope',
      'Blood glucose monitoring equipment',
      'Disposable syringes and needles',
      'Electrocardiograph',
      'Equipment for resuscitation (airway for adults and children, and ventilation including bag and mask)',
      'Equipment for sensation testing',
      'Emergency medicines',
      'Examination light',
      'Eye examination equipment (e.g. fluorescein staining)',
      'Gloves (sterile and non-sterile)',
      'Height measurement device',
      'Intravenous access',
      'Measuring tape',
      'Ophthalmoscope',
      'Oxygen',
      'Patella hammer',
      'Peak flow meter',
      'Personal protective equipment (PPE)',
      'Pulse oximeter',
      'Scales',
      'Spacer for inhaler',
      'Specimen collection equipment',
      'Sphygmomanometer with small, medium and large cuffs',
      'Stethoscope',
      'Surgical masks',
      'Thermometer',
      'Torch',
      'Tourniquet',
      'Urine testing strips, including pregnancy testing kits',
      'Vaginal specula',
      'Visual acuity charts'
    ]
  },
  {
    key: 'medicines',
    title: 'Medicines and samples',
    reminder: 'Always check S8s — never assume there are none. Medicines and samples acquired, stored, supplied and disposed of according to manufacturers’ directions and relevant laws.',
    items: [
      'S8 medicines stored and recorded according to legal requirements (S8 register)',
      'Sample cupboard',
      'Sample labels — stickers with patient name and instructions for samples given out'
    ]
  }
].map((s) => ({ ...s, items: s.items.map((label) => ({ id: s.key + '.' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40), label })) }));
const EQUIPMENT_STATE_LABEL = { '': 'not yet checked', y: 'present and in order', n: 'missing or not in order', na: 'not applicable' };

// ---------- Storage ----------

let visits = load();
let saveTimer = null;

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
    setStatus('Saved ' + new Date().toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }));
  } catch (e) {
    setStatus('⚠ Not saved — storage full or blocked');
  }
}

function save() {
  setStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}

function setStatus(text) {
  document.getElementById('saveStatus').textContent = text;
}

// Flush pending saves if the iPad backgrounds or closes the app.
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) saveNow(); });
window.addEventListener('pagehide', () => { if (saveTimer) saveNow(); });

// Ask Safari not to evict our data.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// ---------- Model helpers ----------

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function newRecord() {
  const cells = {};
  COLUMNS.forEach((c) => { cells[c.key] = ''; });
  return { cells, comment: '' };
}

function newGp(name) {
  return { id: uid(), name: name || '', records: Array.from({ length: RECORDS_PER_GP }, newRecord), findings: '' };
}

function newVisit() {
  return {
    id: uid(),
    practice: '',
    date: today(),
    surveyor: 'Dr Neil Stanford',
    coSurveyor: '',
    gps: [newGp(''), newGp('')],
    equipment: {},
    created: Date.now(),
    updated: Date.now()
  };
}

function findVisit(id) {
  return visits.find((v) => v.id === id);
}

function touch(visit) {
  visit.updated = Date.now();
  save();
}

function gpName(gp, i) {
  return (gp.name || '').trim() ? doctorName(gp.name) : 'GP ' + (i + 1);
}

function namedGps(visit) {
  return visit.gps.filter((g) => (g.name || '').trim());
}

// Counts for one column across a set of records.
function tally(records, key) {
  const t = { y: 0, n: 0, na: 0, blank: 0 };
  records.forEach((r) => {
    const v = r.cells[key];
    if (v === 'y') t.y++;
    else if (v === 'n') t.n++;
    else if (v === 'na') t.na++;
    else t.blank++;
  });
  t.applicable = t.y + t.n;
  return t;
}

// Saved result for one equipment item; visits saved before equipment existed get it lazily.
function equipmentEntry(visit, id) {
  if (!visit.equipment) visit.equipment = {};
  if (!visit.equipment[id]) visit.equipment[id] = { state: '', comment: '' };
  return visit.equipment[id];
}

function equipmentProgress(visit, sections) {
  let done = 0;
  let total = 0;
  (sections || EQUIPMENT).forEach((sec) => sec.items.forEach((item) => {
    total++;
    if (visit.equipment && visit.equipment[item.id] && visit.equipment[item.id].state) done++;
  }));
  return { done, total };
}

// GP interview state; visits saved before interviews existed get it lazily.
function interviewState(visit) {
  if (!visit.interview) visit.interview = { name: '', items: {}, other: {}, short: { required: null, name: '', notes: '' } };
  return visit.interview;
}

function interviewItem(visit, code) {
  const iv = interviewState(visit);
  if (!iv.items[code]) iv.items[code] = { status: '', notes: '', comment: '', annotations: [] };
  return iv.items[code];
}

function interviewProgress(visit) {
  const items = (visit.interview && visit.interview.items) || {};
  return { done: GP_INTERVIEW.filter((c) => items[c.code] && items[c.code].comment.trim()).length, total: GP_INTERVIEW.length };
}

// The short interview is needed when the practice has more than 5 doctors.
// Until Neil says otherwise, go by the imported doctor list or the GPs entered.
function shortInterviewRequired(visit) {
  const req = interviewState(visit).short.required;
  return req === null ? Math.max(namedGps(visit).length, visit.doctorCount || 0) > 5 : req;
}

// Always "Dr" before doctor names; an empty name stays as the [Name] placeholder.
function doctorName(raw) {
  const name = (raw || '').trim();
  if (!name) return '[Name]';
  return /^dr\.?\s/i.test(name) ? name.replace(/^dr\.?\s+/i, 'Dr ') : 'Dr ' + name;
}

function progress(gps) {
  let done = 0;
  let total = 0;
  gps.forEach((g) => g.records.forEach((r) => COLUMNS.forEach((c) => {
    total++;
    if (r.cells[c.key]) done++;
  })));
  return { done, total };
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// ---------- Routing ----------

const app = document.getElementById('app');

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'visit' && parts[1]) {
    const visit = findVisit(parts[1]);
    if (!visit) return go('#/');
    if (parts[2] === 'setup') return renderSetup(visit);
    if (parts[2] === 'equipment') return renderEquipment(visit);
    if (parts[2] === 'interview') return renderInterview(visit);
    if (parts[2] === 'exit') return renderExit(visit, parts[3] === 'edit');
    return renderReview(visit, parts[2]);
  }
  renderHome();
}

function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

window.addEventListener('hashchange', () => {
  stopDictation();
  if (saveTimer) saveNow();
  if (exitWakeLock) { exitWakeLock.release().catch(() => {}); exitWakeLock = null; }
  route();
  window.scrollTo(0, 0);
});

// ---------- Home ----------

function renderHome() {
  const sorted = visits.slice().sort((a, b) => b.updated - a.updated);
  app.innerHTML = `
    <h1>Visits</h1>
    <p class="sub">Health records review, RACGP Standards (5th edition). Everything is saved on this iPad only.</p>
    <div class="actions" style="margin:0 0 16px"><button class="primary" id="newVisit">+ New visit</button></div>
    ${sorted.length ? sorted.map((v) => {
      const p = progress(namedGps(v));
      const e = equipmentProgress(v);
      return `
      <div class="card visit">
        <div class="info">
          <div class="name">${esc(v.practice || 'Untitled practice')}</div>
          <div class="meta">${esc(formatDate(v.date))} · ${namedGps(v).length} GP${namedGps(v).length === 1 ? '' : 's'} · ${p.done}/${p.total} record cells · ${e.done}/${e.total} equipment items · ${interviewProgress(v).done}/${GP_INTERVIEW.length} interview comments</div>
        </div>
        <a class="btn primary" href="#/visit/${v.id}">Open</a>
        <a class="btn" href="#/visit/${v.id}/setup">Edit details</a>
        <button class="danger" data-delete="${v.id}">Delete</button>
      </div>`;
    }).join('') : '<div class="card empty">No visits yet. Tap <strong>New visit</strong> to start.</div>'}
  `;
  document.getElementById('newVisit').onclick = () => {
    const v = newVisit();
    visits.push(v);
    saveNow();
    go('#/visit/' + v.id + '/setup');
  };
  app.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.onclick = () => {
      const v = findVisit(btn.dataset.delete);
      if (!confirm(`Delete the visit to ${v.practice || 'this practice'}? This cannot be undone.`)) return;
      visits = visits.filter((x) => x !== v);
      saveNow();
      renderHome();
    };
  });
}

// ---------- Setup ----------

function renderSetup(visit) {
  app.innerHTML = `
    <h1>Visit details</h1>
    <p class="sub">Enter the practice and the GPs whose records you will review. Each GP gets ${RECORDS_PER_GP} records.</p>
    <div class="card">
      <label class="field"><span>Practice name</span>
        <input type="text" id="practice" value="${esc(visit.practice)}" placeholder="e.g. Riverside Medical Centre" autocomplete="off"></label>
      <label class="field" style="max-width:260px"><span>Visit date</span>
        <input type="date" id="date" value="${esc(visit.date)}"></label>
      <div class="row">
        <label class="field" style="flex:1;min-width:220px"><span>Primary surveyor</span>
          <input type="text" id="surveyor" value="${esc(visit.surveyor)}" autocomplete="off"></label>
        <label class="field" style="flex:1;min-width:220px"><span>Co-surveyor</span>
          <input type="text" id="coSurveyor" value="${esc(visit.coSurveyor || '')}" placeholder="e.g. Leonie Stanford" autocomplete="off"></label>
      </div>
    </div>
    <div class="card">
      <div class="row" style="margin-bottom:12px">
        <h2 style="margin:0">GPs</h2>
        <div class="spacer"></div>
        <label class="btn" for="gpPdf">Import names from PDF</label>
        <input type="file" id="gpPdf" accept="application/pdf,.pdf" hidden>
      </div>
      <div id="gpImport"></div>
      <div id="gpList"></div>
      <button id="addGp">+ Add GP</button>
      <p class="note" id="doctorCount">${visit.doctorCount ? `The imported list had ${visit.doctorCount} doctors.` : ''}</p>
    </div>
    <div class="actions">
      <button class="primary" id="start">Start reviewing records</button>
      <a class="btn" href="#/">Back to visits</a>
    </div>
    <p class="note" id="setupMsg"></p>
  `;

  const bind = (id, field) => {
    document.getElementById(id).addEventListener('input', (e) => { visit[field] = e.target.value; touch(visit); });
  };
  bind('practice', 'practice');
  bind('date', 'date');
  bind('surveyor', 'surveyor');
  bind('coSurveyor', 'coSurveyor');

  const list = document.getElementById('gpList');
  const drawGps = () => {
    list.innerHTML = visit.gps.map((g, i) => `
      <div class="gp-edit">
        <input type="text" data-gp="${i}" value="${esc(g.name)}" placeholder="GP ${i + 1} name, e.g. Dr Jane Smith" autocomplete="off">
        <button class="danger" data-remove="${i}" aria-label="Remove GP ${i + 1}">Remove</button>
      </div>`).join('');
    list.querySelectorAll('[data-gp]').forEach((input) => {
      input.addEventListener('input', () => { visit.gps[+input.dataset.gp].name = input.value; touch(visit); });
    });
    list.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.onclick = () => {
        const i = +btn.dataset.remove;
        const gp = visit.gps[i];
        const used = progress([gp]).done > 0 || gp.findings.trim() || gp.records.some((r) => r.comment.trim());
        if (used && !confirm(`Remove ${gpName(gp, i)} and their reviewed records?`)) return;
        visit.gps.splice(i, 1);
        touch(visit);
        drawGps();
      };
    });
  };
  drawGps();

  const importBox = document.getElementById('gpImport');
  const pdfInput = document.getElementById('gpPdf');
  pdfInput.addEventListener('change', async () => {
    const file = pdfInput.files[0];
    pdfInput.value = '';
    if (!file) return;
    importBox.innerHTML = '<p class="note">Reading the PDF…</p>';
    let names;
    try {
      names = await namesFromPdf(file);
    } catch (e) {
      importBox.innerHTML = `<p class="note warn">Could not read that PDF (${esc(e.message)}). Type the names instead.</p>`;
      return;
    }
    if (!names.length) {
      importBox.innerHTML = '<p class="note warn">No names found. If the PDF is a scanned image there is no text to read, so type the names instead.</p>';
      return;
    }
    const existing = new Set(visit.gps.map((g) => doctorName(g.name).toLowerCase()));
    const fresh = names.filter((n) => !existing.has(doctorName(n.name).toLowerCase()));
    const anyDr = names.some((n) => n.dr);
    importBox.innerHTML = `
      <div class="import-panel">
        <p style="margin-top:0"><strong>Found ${names.length} name${names.length === 1 ? '' : 's'} in ${esc(file.name)}.</strong>
          ${anyDr ? 'Tick the GPs whose records you will review.' : 'No “Dr” was found, so nothing is ticked — tick the names that are GPs whose records you will review.'}
          ${fresh.length < names.length ? ` ${names.length - fresh.length} already in the list ${names.length - fresh.length === 1 ? 'is' : 'are'} not shown.` : ''}</p>
        ${fresh.map((n, i) => `<label class="check"><input type="checkbox" data-import="${i}" ${n.dr ? 'checked' : ''}> ${esc(doctorName(n.name))}</label>`).join('')}
        <div class="row">
          <button class="primary" id="importAdd">Add ticked GPs</button>
          <button id="importCancel">Cancel</button>
        </div>
        <p class="note" style="margin-bottom:0">The PDF is only read on this iPad; it is not saved.</p>
      </div>`;
    document.getElementById('importCancel').onclick = () => { importBox.innerHTML = ''; };
    document.getElementById('importAdd').onclick = () => {
      const picked = fresh.filter((n, i) => importBox.querySelector(`[data-import="${i}"]`).checked);
      // Fill any empty GP rows first, then add new ones.
      picked.forEach((n) => {
        const blank = visit.gps.find((g) => !g.name.trim());
        if (blank) blank.name = doctorName(n.name);
        else visit.gps.push(newGp(doctorName(n.name)));
      });
      // Remember the practice's doctor count for the second short interview.
      if (anyDr) {
        visit.doctorCount = names.filter((n) => n.dr).length;
        document.getElementById('doctorCount').textContent = `The imported list had ${visit.doctorCount} doctors.`;
      }
      touch(visit);
      importBox.innerHTML = '';
      drawGps();
    };
  });

  document.getElementById('addGp').onclick = () => {
    visit.gps.push(newGp(''));
    touch(visit);
    drawGps();
    const inputs = list.querySelectorAll('[data-gp]');
    inputs[inputs.length - 1].focus();
  };

  document.getElementById('start').onclick = () => {
    const msg = document.getElementById('setupMsg');
    if (!visit.practice.trim()) { msg.innerHTML = '<span class="warn">Enter the practice name first.</span>'; return; }
    if (!namedGps(visit).length) { msg.innerHTML = '<span class="warn">Add at least one GP name.</span>'; return; }
    saveNow();
    go('#/visit/' + visit.id);
  };
}

// ---------- Doctor list import ----------

// pdf.js is only loaded when a PDF is imported (it is still cached for offline use).
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error('could not load ' + src));
    document.head.appendChild(el);
  });
}

// Qualifications, roles and days that often follow a doctor's name in staff lists.
const NOT_NAME = /^(MBBS|BMBS|MBChB|MB|BS|BCh|BAO|MD|PhD|MPH|BSc|BMed\w*|FRACGP|FACRRM|FARGP|FRANZCOG|DRANZCOG\w*|DCH|MRCGP|GAICD|Dip\w*|Grad\w*|Adv\w*|GP|VMO|Registrar|Principal|Partner|Director|Owner|Locum|Female|Male|Mon\w*|Tue\w*|Wed\w*|Thu\w*|Fri\w*|Sat\w*|Sun\w*)$/i;

function cleanName(words) {
  const kept = [];
  for (const w of words) {
    if (NOT_NAME.test(w.replace(/[(),.]/g, ''))) break;
    // SMITH -> Smith, keeping hyphens and apostrophes (O'BRIEN -> O'Brien).
    kept.push(w.length > 1 && w === w.toUpperCase() ? w.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (m, p, c) => p + c.toUpperCase()) : w);
  }
  return kept.join(' ').replace(/[,.;:]+$/, '');
}

// Returns [{ name, dr }]: names after "Dr", or if there are none, lines that look like names.
async function namesFromPdf(file) {
  if (!window.pdfjsLib) await loadScript('vendor/pdf.min.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const text = await (await pdf.getPage(p)).getTextContent();
    // Rebuild lines from text items by their vertical position.
    const rows = new Map();
    text.items.forEach((it) => {
      if (!it.str.trim()) return;
      const y = Math.round(it.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push(it);
    });
    [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => {
      lines.push(items.sort((a, b) => a.transform[4] - b.transform[4]).map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim());
    });
  }

  const found = new Map();
  const add = (name, dr) => {
    const key = name.toLowerCase();
    if (name.split(' ').length >= 2 && !found.has(key)) found.set(key, { name, dr });
  };
  const WORD = "[\\p{Lu}][\\p{L}'’\\-]*\\.?";
  const drPattern = new RegExp(`\\b(?:Dr|DR|Doctor)\\.?\\s+(${WORD}(?:\\s+${WORD}){1,4})`, 'gu');
  lines.forEach((line) => {
    for (const m of line.matchAll(drPattern)) add(cleanName(m[1].split(/\s+/)), true);
  });
  if (!found.size) {
    const nameLine = /^[\p{Lu}][\p{L}'’\-]+(?:\s+[\p{Lu}][\p{L}'’\-]+){1,3}$/u;
    lines.forEach((line) => { if (nameLine.test(line) && line.length <= 40) add(cleanName(line.split(' ')), false); });
  }
  return [...found.values()];
}

// ---------- Review ----------

// Practice heading, actions and the Health records / Equipment switch shared by both screens.
function visitHeader(visit, active) {
  const p = progress(namedGps(visit));
  const e = equipmentProgress(visit);
  const iv = interviewProgress(visit);
  return `
    <div class="row">
      <div>
        <h1>${esc(visit.practice)}</h1>
        <p class="sub" style="margin:0">${esc(formatDate(visit.date))} · ${esc(visit.surveyor)}</p>
      </div>
      <div class="spacer"></div>
      <a class="btn" href="#/visit/${visit.id}/setup">Edit details</a>
      ${active === 'exit' ? '' : `<button class="primary" id="exportBtn">${active === 'interview' ? 'Export Word' : 'Export PDF'}</button>`}
    </div>
    <nav class="sections">
      <a class="btn tab ${active === 'records' ? 'active' : ''}" href="#/visit/${visit.id}">Health records <span class="count" id="recordsCount">${p.done}/${p.total}</span></a>
      <a class="btn tab ${active === 'equipment' ? 'active' : ''}" href="#/visit/${visit.id}/equipment">Equipment <span class="count" id="equipmentCount">${e.done}/${e.total}</span></a>
      <a class="btn tab ${active === 'interview' ? 'active' : ''}" href="#/visit/${visit.id}/interview">GP interview <span class="count" id="interviewCount">${iv.done}/${iv.total}</span></a>
      <a class="btn tab ${active === 'exit' ? 'active' : ''}" href="#/visit/${visit.id}/exit">Exit interview</a>
    </nav>`;
}

function renderReview(visit, gpId) {
  const gps = namedGps(visit);
  if (!gps.length) return go('#/visit/' + visit.id + '/setup');
  const gpIndex = Math.max(0, gps.findIndex((g) => g.id === gpId));
  const gp = gps[gpIndex];

  app.innerHTML = `
    ${visitHeader(visit, 'records')}
    <div class="reminder">
      <strong>Reminder: ${esc(REMINDER)}</strong>
      <div class="legend">
        <span><span class="swatch cell y">✓</span>Present and current</span>
        <span><span class="swatch cell n">✗</span>Absent or incomplete</span>
        <span><span class="swatch cell na" style="font-size:10px">N/A</span>Not applicable</span>
        <span>Blank = not yet reviewed · tap a cell to change it</span>
      </div>
    </div>
    <nav class="tabs" id="tabs">
      ${gps.map((g, i) => {
        const p = progress([g]);
        return `<a class="btn tab ${g === gp ? 'active' : ''}" href="#/visit/${visit.id}/${g.id}">${esc(gpName(g, visit.gps.indexOf(g)))} <span class="count">${p.done}/${p.total}</span></a>`;
      }).join('')}
    </nav>
    <div class="grid-wrap">
      <table class="grid">
        <thead><tr><th class="rec">Record</th>${COLUMNS.map((c) => `<th>${esc(c.label).replace('/', '/<wbr>')}</th>`).join('')}</tr></thead>
        <tbody>
          ${gp.records.map((r, ri) => `
            <tr class="record-row">
              <th scope="row">${ri + 1}</th>
              ${COLUMNS.map((c) => `<td><button class="cell ${r.cells[c.key]}" data-r="${ri}" data-c="${c.key}" aria-label="Record ${ri + 1}, ${esc(c.label)}: ${STATE_LABEL[r.cells[c.key]]}">${SYMBOL[r.cells[c.key]]}</button></td>`).join('')}
            </tr>
            <tr class="comment-row"><td></td><td colspan="${COLUMNS.length}">
              <input type="text" data-comment="${ri}" value="${esc(r.comment)}" placeholder="Comment on record ${ri + 1} (optional) — ${IDENTIFIER_HINT.toLowerCase()}" autocomplete="off">
            </td></tr>`).join('')}
        </tbody>
        <tfoot><tr><th>Present</th>${COLUMNS.map((c) => `<td data-tally="${c.key}"></td>`).join('')}</tr></tfoot>
      </table>
    </div>
    <h2>Findings summary — ${esc(gpName(gp, visit.gps.indexOf(gp)))}</h2>
    <div class="summary-tallies" id="chips"></div>
    <textarea id="findings" placeholder="Plain-English summary of what you found in this GP's records. ${IDENTIFIER_HINT}.">${esc(gp.findings)}</textarea>
    <p class="note">Ticks, crosses, comments and summaries save automatically on this iPad.</p>
  `;

  const drawTallies = () => {
    COLUMNS.forEach((c) => {
      const t = tally(gp.records, c.key);
      app.querySelector(`[data-tally="${c.key}"]`).textContent = t.applicable ? `${t.y}/${t.applicable}` : '–';
    });
    document.getElementById('chips').innerHTML = COLUMNS.map((c) => {
      const t = tally(gp.records, c.key);
      if (!t.applicable) return `<span class="chip">${esc(c.label)}: –</span>`;
      const cls = t.y === t.applicable ? 'full' : (t.n > 0 ? 'low' : '');
      return `<span class="chip ${cls}">${esc(c.label)}: ${t.y}/${t.applicable}</span>`;
    }).join('');
    const p = progress([gp]);
    const tab = app.querySelector('#tabs .tab.active .count');
    if (tab) tab.textContent = `${p.done}/${p.total}`;
    const all = progress(gps);
    document.getElementById('recordsCount').textContent = `${all.done}/${all.total}`;
  };
  drawTallies();

  app.querySelectorAll('.cell[data-r]').forEach((btn) => {
    btn.onclick = () => {
      const rec = gp.records[+btn.dataset.r];
      const key = btn.dataset.c;
      const next = CYCLE[(CYCLE.indexOf(rec.cells[key]) + 1) % CYCLE.length];
      rec.cells[key] = next;
      btn.className = 'cell ' + next;
      btn.textContent = SYMBOL[next];
      btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace(/: .*$/, ': ' + STATE_LABEL[next]));
      touch(visit);
      drawTallies();
    };
  });
  app.querySelectorAll('[data-comment]').forEach((input) => {
    input.addEventListener('input', () => { gp.records[+input.dataset.comment].comment = input.value; touch(visit); });
  });
  document.getElementById('findings').addEventListener('input', (e) => { gp.findings = e.target.value; touch(visit); });
  document.getElementById('exportBtn').onclick = () => exportPdf(visit);
}

// ---------- Equipment ----------

function renderEquipment(visit) {
  if (!namedGps(visit).length) return go('#/visit/' + visit.id + '/setup');

  app.innerHTML = `
    ${visitHeader(visit, 'equipment')}
    <div class="reminder">
      <strong>One doctor’s bag and one treatment room check per visit.</strong>
      <div class="legend">
        <span><span class="swatch cell y">✓</span>Present and in order</span>
        <span><span class="swatch cell n">✗</span>Missing or not in order</span>
        <span><span class="swatch cell na" style="font-size:10px">N/A</span>Not applicable</span>
        <span>Blank = not yet checked · tap to change</span>
      </div>
    </div>
    ${EQUIPMENT.map((sec) => `
      <section class="card equip">
        <div class="row equip-head">
          <h2>${esc(sec.title)}</h2>
          <div class="spacer"></div>
          <span class="chip" data-sec-tally="${sec.key}"></span>
        </div>
        <p class="note">${esc(sec.reminder)}</p>
        ${sec.items.map((item) => {
          const e = equipmentEntry(visit, item.id);
          return `
          <div class="equip-item">
            <button class="cell ${e.state}" data-item="${esc(item.id)}" aria-label="${esc(item.label)}: ${EQUIPMENT_STATE_LABEL[e.state]}">${SYMBOL[e.state]}</button>
            <div class="equip-text">
              <div class="equip-label">${esc(item.label)}</div>
              <input type="text" data-item-comment="${esc(item.id)}" value="${esc(e.comment)}" placeholder="Comment (optional)" autocomplete="off">
            </div>
          </div>`;
        }).join('')}
      </section>`).join('')}
    <p class="note">Ticks and comments save automatically on this iPad.</p>
  `;

  const drawTallies = () => {
    EQUIPMENT.forEach((sec) => {
      let y = 0, n = 0;
      sec.items.forEach((item) => {
        const st = equipmentEntry(visit, item.id).state;
        if (st === 'y') y++;
        if (st === 'n') n++;
      });
      const p = equipmentProgress(visit, [sec]);
      const chip = app.querySelector(`[data-sec-tally="${sec.key}"]`);
      chip.textContent = `${y} present · ${n} missing · ${p.total - p.done} to check`;
      chip.className = 'chip' + (n ? ' low' : (p.done === p.total ? ' full' : ''));
    });
    const e = equipmentProgress(visit);
    document.getElementById('equipmentCount').textContent = `${e.done}/${e.total}`;
  };
  drawTallies();

  app.querySelectorAll('.cell[data-item]').forEach((btn) => {
    btn.onclick = () => {
      const entry = equipmentEntry(visit, btn.dataset.item);
      const next = CYCLE[(CYCLE.indexOf(entry.state) + 1) % CYCLE.length];
      entry.state = next;
      btn.className = 'cell ' + next;
      btn.textContent = SYMBOL[next];
      btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace(/: [^:]*$/, ': ' + EQUIPMENT_STATE_LABEL[next]));
      touch(visit);
      drawTallies();
    };
  });
  app.querySelectorAll('[data-item-comment]').forEach((input) => {
    input.addEventListener('input', () => { equipmentEntry(visit, input.dataset.itemComment).comment = input.value; touch(visit); });
  });
  document.getElementById('exportBtn').onclick = () => exportPdf(visit);
}

// ---------- GP interview ----------

const STATUS = [
  { key: 'met', label: 'Met' },
  { key: 'notmet', label: 'Not met' },
  { key: 'na', label: 'N/A' }
];
const ANNOTATION = {
  c: { label: 'Commendation', prefix: '★ Commendation — ', color: '375623' },
  io: { label: 'Improvement Opportunity', prefix: '★ Improvement Opportunity — ', color: 'C55A11' },
  ra: { label: 'Required Action', prefix: '★ Required Action — ', color: 'C00000' }
};

function renderInterview(visit) {
  if (!namedGps(visit).length) return go('#/visit/' + visit.id + '/setup');
  const iv = interviewState(visit);

  app.innerHTML = `
    ${visitHeader(visit, 'interview')}
    <div class="reminder">
      <strong>One main interview with a GP. A second short interview with another GP if the practice has more than 5 doctors.</strong>
      <div class="legend"><span>Tap a criterion to open it. Insert the standard comment, then add the specifics the doctor gave — type them or tap the microphone to dictate. Comments export to Word in your Accreditation Pro format.</span></div>
    </div>
    <div class="card">
      <label class="field" style="margin:0"><span>Doctor interviewed</span>
        <input type="text" id="ivName" value="${esc(iv.name)}" placeholder="e.g. Dr Jane Smith" autocomplete="off"></label>
    </div>
    ${GP_INTERVIEW.map((c) => criterionHtml(visit, c)).join('')}
    <section class="card">
      <h2 style="margin-top:0">Also ask</h2>
      <p class="note" style="margin-top:0">Notes only — not included in the comments.</p>
      ${GP_INTERVIEW_OTHER.map((q, i) => `
        <label class="field"><span>${esc(q)}</span>
          ${withMic(`<textarea class="short" data-other="${i}" placeholder="Notes">${esc(iv.other[i] || '')}</textarea>`)}</label>`).join('')}
    </section>
    <section class="card">
      <h2 style="margin-top:0">Second short interview</h2>
      <label class="check"><input type="checkbox" id="shortReq" ${shortInterviewRequired(visit) ? 'checked' : ''}> The practice has more than 5 doctors, so a second short interview is needed</label>
      <div id="shortBody" ${shortInterviewRequired(visit) ? '' : 'hidden'}>
        <label class="field"><span>Doctor interviewed</span>
          <input type="text" id="shortName" value="${esc(iv.short.name)}" placeholder="e.g. Dr Ahmed Khan" autocomplete="off"></label>
        <label class="field" style="margin:0"><span>Notes</span>
          ${withMic(`<textarea id="shortNotes" placeholder="Notes from the short interview">${esc(iv.short.notes)}</textarea>`)}</label>
      </div>
    </section>
    <p class="note">Everything on this screen saves automatically on this iPad.</p>
  `;

  const updateCount = () => {
    const p = interviewProgress(visit);
    document.getElementById('interviewCount').textContent = `${p.done}/${p.total}`;
  };

  // Keep inserted comments in step when the doctor's name is corrected.
  const nameInput = document.getElementById('ivName');
  let shownName = doctorName(iv.name);
  nameInput.addEventListener('input', () => { iv.name = nameInput.value; touch(visit); });
  nameInput.addEventListener('change', () => {
    const next = doctorName(iv.name);
    if (next === shownName) return;
    GP_INTERVIEW.forEach((c) => {
      const item = interviewItem(visit, c.code);
      item.comment = item.comment.split(shownName).join(next);
      const box = app.querySelector(`[data-comment-for="${c.code}"]`);
      if (box) box.value = item.comment;
    });
    shownName = next;
    touch(visit);
  });

  GP_INTERVIEW.forEach((c) => {
    const card = app.querySelector(`[data-crit="${c.code}"]`);
    const item = interviewItem(visit, c.code);
    const refreshSummary = () => {
      card.querySelector('.crit-status').outerHTML = statusPill(item);
      updateCount();
    };

    card.querySelectorAll('[data-status]').forEach((btn) => {
      btn.onclick = () => {
        item.status = item.status === btn.dataset.status ? '' : btn.dataset.status;
        card.querySelectorAll('[data-status]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.status === item.status)));
        card.querySelector('.ra-hint').hidden = item.status !== 'notmet';
        touch(visit);
        refreshSummary();
      };
    });
    card.querySelector('[data-notes-for]').addEventListener('input', (e) => { item.notes = e.target.value; touch(visit); });
    const comment = card.querySelector('[data-comment-for]');
    comment.addEventListener('input', () => { item.comment = comment.value; touch(visit); refreshSummary(); });
    card.querySelectorAll('[data-standard]').forEach((btn) => {
      btn.onclick = () => {
        const text = c.standards[+btn.dataset.standard].text.split('[Name]').join(doctorName(iv.name));
        if (item.comment.trim() && !confirm('Replace the current comment with the standard comment?')) return;
        item.comment = text;
        comment.value = text;
        touch(visit);
        refreshSummary();
        comment.focus();
      };
    });

    const drawAnnotations = () => {
      const list = card.querySelector('.annotations');
      list.innerHTML = item.annotations.map((a, i) => `
        <div class="annotation ${a.type}">
          <div class="row"><strong>★ ${ANNOTATION[a.type].label}</strong><div class="spacer"></div><button class="link danger" data-remove-ann="${i}">Remove</button></div>
          ${withMic(`<textarea class="short" data-ann="${i}">${esc(a.text)}</textarea>`)}
        </div>`).join('');
      wireMics(list);
      list.querySelectorAll('[data-ann]').forEach((ta) => {
        ta.addEventListener('input', () => { item.annotations[+ta.dataset.ann].text = ta.value; touch(visit); });
      });
      list.querySelectorAll('[data-remove-ann]').forEach((btn) => {
        btn.onclick = () => { item.annotations.splice(+btn.dataset.removeAnn, 1); touch(visit); drawAnnotations(); };
      });
    };
    drawAnnotations();
    card.querySelectorAll('[data-add-ann]').forEach((btn) => {
      btn.onclick = () => {
        const suggestion = btn.dataset.suggestion !== undefined ? c.notes[+btn.dataset.suggestion] : null;
        item.annotations.push({ type: btn.dataset.addAnn, text: suggestion ? suggestion.text : '' });
        touch(visit);
        drawAnnotations();
        if (!suggestion) card.querySelector(`[data-ann="${item.annotations.length - 1}"]`).focus();
      };
    });
  });

  app.querySelectorAll('[data-other]').forEach((ta) => {
    ta.addEventListener('input', () => { iv.other[ta.dataset.other] = ta.value; touch(visit); });
  });
  document.getElementById('shortReq').addEventListener('change', (e) => {
    iv.short.required = e.target.checked;
    document.getElementById('shortBody').hidden = !e.target.checked;
    touch(visit);
  });
  document.getElementById('shortName').addEventListener('input', (e) => { iv.short.name = e.target.value; touch(visit); });
  document.getElementById('shortNotes').addEventListener('input', (e) => { iv.short.notes = e.target.value; touch(visit); });
  document.getElementById('exportBtn').onclick = () => exportWord(visit);
  wireMics(app);
}

function statusPill(item) {
  const done = item.comment.trim() ? '<span class="chip full">Comment</span>' : '';
  const st = STATUS.find((s) => s.key === item.status);
  const cls = item.status === 'met' ? 'full' : (item.status === 'notmet' ? 'low' : '');
  return `<span class="crit-status">${st ? `<span class="chip ${cls}">${st.label}</span>` : ''}${done}</span>`;
}

function criterionHtml(visit, c) {
  const item = interviewItem(visit, c.code);
  return `
    <details class="card crit" data-crit="${c.code}">
      <summary>
        <span class="crit-code">${esc(c.code)}</span>
        <span class="crit-title">${esc(c.title)}</span>
        ${statusPill(item)}
      </summary>
      <div class="crit-body">
        <ul class="ask">${c.ask.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
        <p class="note"><strong>Cover:</strong> ${esc(c.cover)}</p>
        <div class="seg" role="group" aria-label="Outcome">
          ${STATUS.map((s) => `<button data-status="${s.key}" aria-pressed="${item.status === s.key}">${s.label}</button>`).join('')}
        </div>
        <p class="note warn ra-hint" ${item.status === 'notmet' ? '' : 'hidden'}>Not met — add a Required Action below.</p>
        <label class="field"><span>Notes</span>
          ${withMic(`<textarea class="short" data-notes-for="${c.code}" placeholder="What the doctor said">${esc(item.notes)}</textarea>`)}</label>
        <div class="row" style="margin-bottom:6px">
          <strong>Comment</strong><div class="spacer"></div>
          ${c.standards.map((st, i) => `<button data-standard="${i}">Insert standard${st.label ? ` (${esc(st.label)})` : ''}</button>`).join('')}
        </div>
        ${withMic(`<textarea data-comment-for="${c.code}" placeholder="Insert the standard comment, then add specifics (names, systems, frequencies).">${esc(item.comment)}</textarea>`)}
        <div class="annotations"></div>
        <div class="row ann-add">
          ${c.notes.map((n, i) => `<button class="ann-btn ${n.type}" data-add-ann="${n.type}" data-suggestion="${i}">+ ${n.type === 'io' ? 'IO' : ANNOTATION[n.type].label}: ${esc(n.trigger)}</button>`).join('')}
          ${Object.keys(ANNOTATION).map((t) => `<button class="ann-btn ${t}" data-add-ann="${t}">+ ${ANNOTATION[t].label}</button>`).join('')}
        </div>
      </div>
    </details>`;
}

function exportWord(visit) {
  saveNow();
  const iv = interviewState(visit);
  const missing = GP_INTERVIEW.filter((c) => !interviewItem(visit, c.code).comment.trim());
  const placeholders = GP_INTERVIEW.filter((c) => /\[(?!FOLLOW UP NEEDED)[^\]]+\]|\{[^}]*\}/.test(interviewItem(visit, c.code).comment));
  const warnings = [];
  if (!iv.name.trim()) warnings.push('No doctor name entered for the main interview.');
  if (missing.length) warnings.push(`${missing.length} criteria have no comment yet (they will show FOLLOW UP NEEDED).`);
  if (placeholders.length) warnings.push(`Still to fill in [placeholders] or {choices}: ${placeholders.map((c) => c.code).join(', ')}.`);
  if (shortInterviewRequired(visit) && !iv.short.name.trim()) warnings.push('The second short interview has no doctor name.');
  if (warnings.length && !confirm(warnings.join('\n') + '\n\nExport the Word document anyway?')) return;

  const safe = (s) => s.replace(/[\\/:*?"<>|]+/g, '').trim();
  const filename = `GP Interview Comments - ${safe(visit.practice) || 'Practice'} - ${visit.date}.docx`;
  buildDocx(visit)
    .then((blob) => shareFile(blob, filename, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
    .catch((e) => alert('Could not create the Word document: ' + e.message));
}

// ---------- Word (.docx) export ----------
// Layout follows section 1 "Word output format" of the master reference.

function xmlEsc(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function wRun(text, f = {}) {
  const props = (f.bold ? '<w:b/>' : '') + (f.italic ? '<w:i/>' : '') +
    (f.color ? `<w:color w:val="${f.color}"/>` : '') + (f.size ? `<w:sz w:val="${f.size * 2}"/><w:szCs w:val="${f.size * 2}"/>` : '');
  return String(text).split('\n').map((line, i) =>
    `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${xmlEsc(line)}</w:t></w:r>`).join('');
}

function wPara(runs, f = {}) {
  return `<w:p><w:pPr>${f.keepNext ? '<w:keepNext/>' : ''}<w:spacing w:before="${f.before || 0}" w:after="${f.after == null ? 120 : f.after}"/></w:pPr>${runs}</w:p>`;
}

// FOLLOW UP NEEDED markers are bold italic.
function wCommentRuns(text, color) {
  return text.split(/(\[FOLLOW UP NEEDED[^\]]*\])/).filter(Boolean)
    .map((part) => wRun(part, { color, bold: part.startsWith('[FOLLOW UP NEEDED'), italic: part.startsWith('[FOLLOW UP NEEDED') })).join('');
}

const NAVY_HEX = '1F3864';
const GREY_HEX = '595959';

function wHeading(text) {
  return wPara(wRun(text, { bold: true, color: NAVY_HEX, size: 13 }), { before: 240, after: 160, keepNext: true });
}

function wCodeLine(c) {
  return wPara(wRun(c.code, { bold: true, color: NAVY_HEX, size: 11 }) + wRun(' — ' + c.title, { bold: true, italic: true, color: GREY_HEX, size: 11 }), { before: 120, after: 40, keepNext: true });
}

function buildDocx(visit) {
  const iv = interviewState(visit);
  const name = doctorName(iv.name);
  let body = '';
  body += wPara(wRun('GP Interview Comments', { bold: true, color: NAVY_HEX, size: 17 }), { after: 120 });
  body += wPara(wRun(`Primary Surveyor: ${visit.surveyor} | AGPAL On-Site Assessment`), { after: 0 });
  body += wPara(wRun(`Practice: ${visit.practice}`), { after: 240 });

  body += wPara(wRun(`GP Interview — ${name}`, { bold: true, color: NAVY_HEX, size: 13 }), { before: 120, after: 160, keepNext: true });
  GP_INTERVIEW.forEach((c) => {
    const item = interviewItem(visit, c.code);
    const comment = item.comment.trim().split('[Name]').join(name) || `[FOLLOW UP NEEDED — ${c.code} comment not written]`;
    body += wCodeLine(c);
    body += wPara(wCommentRuns(comment), { after: item.annotations.length ? 60 : 160 });
    item.annotations.filter((a) => a.text.trim()).forEach((a, i, all) => {
      const t = ANNOTATION[a.type];
      body += wPara(wRun(t.prefix, { bold: true, color: t.color }) + wCommentRuns(a.text.trim(), t.color), { after: i === all.length - 1 ? 160 : 60 });
    });
  });

  if (shortInterviewRequired(visit)) {
    body += wHeading(`GP Interview (Short) — ${doctorName(iv.short.name)}`);
    body += wPara(wCommentRuns(iv.short.notes.trim() || '[FOLLOW UP NEEDED — short interview notes not written]'));
  }
  return docxPackage(body);
}

// Wraps document body XML into a .docx: A4 portrait, 0.75" margins, Calibri 11.
function docxPackage(body) {
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-AU"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file('word/document.xml', document);
  zip.file('word/styles.xml', styles);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// ---------- Exit interview ----------
// Structure and standard wording follow section 8 of the master reference.

function exitState(visit) {
  if (!visit.exit) visit.exit = { opening: null, extra: '', closing: null, includeImprovements: false };
  return visit.exit;
}

function exitOpening(visit) {
  const ex = exitState(visit);
  return ex.opening !== null ? ex.opening : EXIT_OPENING.split('[Practice]').join(visit.practice || '[Practice]');
}

function exitClosing(visit) {
  const ex = exitState(visit);
  return ex.closing !== null ? ex.closing : EXIT_CLOSING;
}

// Everything the exit interview brings over from the rest of the visit.
function exitContent(visit) {
  const commendations = [];
  const improvements = [];
  const unmet = [];
  GP_INTERVIEW.forEach((c) => {
    const item = interviewItem(visit, c.code);
    const texts = (type) => item.annotations.filter((a) => a.type === type && a.text.trim()).map((a) => a.text.trim());
    texts('c').forEach((text) => commendations.push({ code: c.code, title: c.title, text }));
    texts('io').forEach((text) => improvements.push({ code: c.code, title: c.title, text }));
    const actions = texts('ra');
    if (item.status === 'notmet' || actions.length) unmet.push({ code: c.code, title: c.title, actions });
  });

  const equipment = [];
  EQUIPMENT.forEach((sec) => sec.items.forEach((item) => {
    const e = equipmentEntry(visit, item.id);
    if (e.state === 'n') equipment.push({ section: sec.title, label: item.label, comment: e.comment.trim() });
  }));

  const records = namedGps(visit).flatMap((g) => g.records);
  let yes = 0;
  let applicable = 0;
  const gaps = [];
  COLUMNS.forEach((col) => {
    const t = tally(records, col.key);
    yes += t.y;
    applicable += t.applicable;
    if (t.applicable && t.y < t.applicable) gaps.push(`${col.label}: present and current in ${t.y} of ${t.applicable} records reviewed`);
  });
  const gpCount = namedGps(visit).length;
  const overall = applicable
    ? `${records.length} records were reviewed across ${gpCount} GP${gpCount === 1 ? '' : 's'}, and ${Math.round((yes / applicable) * 100)}% of items checked were present and current.`
    : '';
  return { commendations, improvements, unmet, equipment, overall, gaps };
}

// The exit interview is read aloud from the iPad, not printed: a large-type
// reading page, with an edit view for the opening, closing and extras.
let exitWakeLock = null;

function renderExit(visit, editing) {
  if (!namedGps(visit).length) return go('#/visit/' + visit.id + '/setup');
  return editing ? renderExitEdit(visit) : renderExitRead(visit);
}

function renderExitRead(visit) {
  const ex = exitState(visit);
  const content = exitContent(visit);
  const co = (visit.coSurveyor || '').trim();
  const paras = (text) => text.trim().split(/\n\s*\n/).filter(Boolean).map((t) => `<p>${esc(t.trim()).replace(/\n/g, '<br>')}</p>`).join('');
  const annotated = (heading, items, type) => items.length ? `
    <h2>${heading}</h2>
    ${items.map((c) => `<div class="exit-item"><div class="exit-code">${esc(c.code)} — ${esc(c.title)}</div><p class="ann-text ${type}">${esc(c.text)}</p></div>`).join('')}` : '';

  app.innerHTML = `
    ${visitHeader(visit, 'exit')}
    <div class="row exit-tools">
      <span class="note">Read from this page at the end of the visit. The screen stays on while it is open.</span>
      <div class="spacer"></div>
      <a class="btn" href="#/visit/${visit.id}/exit/edit">Edit</a>
    </div>
    <article class="exit-read">
      <p class="exit-meta">${esc(visit.practice)} · ${esc(formatDate(visit.date))}<br>Primary Surveyor: ${esc(visit.surveyor)}${co ? ` · Co-Surveyor: ${esc(co)}` : ''}</p>
      <h2>Thank you</h2>
      ${paras(exitOpening(visit))}
      ${annotated('Commendations', content.commendations, 'c')}
      ${ex.includeImprovements ? annotated('Improvement opportunities', content.improvements, 'io') : ''}
      ${content.unmet.length || content.equipment.length ? `
        <h2>Not met on the day</h2>
        ${content.unmet.map((u) => `<div class="exit-item"><div class="exit-code">${esc(u.code)} — ${esc(u.title)}</div>${u.actions.length
          ? u.actions.map((a) => `<p class="ann-text ra">${esc(a)}</p>`).join('')
          : '<p class="warn"><em>No Required Action written yet — add one in the GP interview.</em></p>'}</div>`).join('')}
        ${EQUIPMENT.map((sec) => {
          const items = content.equipment.filter((e) => e.section === sec.title);
          return items.length ? `<div class="exit-item"><div class="exit-code">${esc(sec.title)}</div>${items.map((e) => `<p class="ann-text ra">${esc(e.label)} — missing or not in order${e.comment ? ` (${esc(e.comment)})` : ''}</p>`).join('')}</div>` : '';
        }).join('')}` : ''}
      ${content.overall ? `
        <h2>Health records review</h2>
        <p>${esc(content.overall)}</p>
        ${content.gaps.length ? `<ul>${content.gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}` : ''}
      ${ex.extra.trim() ? `<h2>Additional comments</h2>${paras(ex.extra)}` : ''}
      <h2>Closing</h2>
      ${paras(exitClosing(visit))}
    </article>
  `;

  // Keep the iPad from dimming while Neil reads (Safari 16.4+; ignored elsewhere).
  if (navigator.wakeLock) {
    navigator.wakeLock.request('screen').then((lock) => { exitWakeLock = lock; }).catch(() => {});
  }
}

function renderExitEdit(visit) {
  const ex = exitState(visit);
  const content = exitContent(visit);
  app.innerHTML = `
    ${visitHeader(visit, 'exit')}
    <div class="row exit-tools">
      <span class="note">Commendations, items not met and the records review come from the other sections — edit them there.</span>
      <div class="spacer"></div>
      <a class="btn primary" href="#/visit/${visit.id}/exit">Done</a>
    </div>
    <section class="card">
      <div class="row"><h2 style="margin:0">Thank you</h2><div class="spacer"></div><button class="link" data-reset="opening">Reset to standard</button></div>
      ${withMic(`<textarea id="exitOpening">${esc(exitOpening(visit))}</textarea>`, 'margin-top:8px')}
    </section>
    <section class="card">
      <h2 style="margin-top:0">Improvement opportunities</h2>
      <label class="check"><input type="checkbox" id="exitIOs" ${ex.includeImprovements ? 'checked' : ''}> Include in the exit interview (${content.improvements.length} from the GP interview)</label>
    </section>
    <section class="card">
      <h2 style="margin-top:0">Additional comments</h2>
      ${withMic(`<textarea id="exitExtra" placeholder="Anything else to say at the exit interview, such as ${visit.coSurveyor && visit.coSurveyor.trim() ? `${esc(visit.coSurveyor.trim())}’s` : 'the co-surveyor’s'} findings (optional)">${esc(ex.extra)}</textarea>`)}
    </section>
    <section class="card">
      <div class="row"><h2 style="margin:0">Closing</h2><div class="spacer"></div><button class="link" data-reset="closing">Reset to standard</button></div>
      ${withMic(`<textarea id="exitClosing">${esc(exitClosing(visit))}</textarea>`, 'margin-top:8px')}
    </section>
  `;

  document.getElementById('exitOpening').addEventListener('input', (e) => { ex.opening = e.target.value; touch(visit); });
  document.getElementById('exitClosing').addEventListener('input', (e) => { ex.closing = e.target.value; touch(visit); });
  document.getElementById('exitExtra').addEventListener('input', (e) => { ex.extra = e.target.value; touch(visit); });
  document.getElementById('exitIOs').addEventListener('change', (e) => { ex.includeImprovements = e.target.checked; touch(visit); });
  wireMics(app);
  app.querySelectorAll('[data-reset]').forEach((btn) => {
    btn.onclick = () => {
      const key = btn.dataset.reset;
      if (!confirm('Replace this text with the standard wording?')) return;
      ex[key] = null;
      document.getElementById(key === 'opening' ? 'exitOpening' : 'exitClosing').value = key === 'opening' ? exitOpening(visit) : exitClosing(visit);
      touch(visit);
    };
  });
}

// ---------- Dictation ----------
// Microphone button on interview text boxes. Uses Safari's speech recognition;
// dictated words are appended to the end of the box and saved like typing.

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const MIC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
let dictation = null;

function withMic(textareaHtml, style) {
  return `<div class="dictate"${style ? ` style="${style}"` : ''}>${textareaHtml}<button type="button" class="mic" aria-label="Dictate" aria-pressed="false">${MIC_ICON}</button></div>`;
}

function wireMics(root) {
  root.querySelectorAll('.dictate').forEach((wrap) => {
    const btn = wrap.querySelector('.mic');
    const box = wrap.querySelector('textarea');
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.onclick = (e) => { e.preventDefault(); toggleDictation(box, btn); };
    // Typing in the box stops dictation into it.
    box.addEventListener('input', (e) => { if (e.isTrusted && dictation && dictation.box === box) stopDictation(); });
  });
}

function stopDictation() {
  if (!dictation) return;
  const { rec, btn } = dictation;
  dictation = null;
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-label', 'Dictate');
  try { rec.stop(); } catch (e) { /* already stopped */ }
}

function toggleDictation(box, btn) {
  const same = dictation && dictation.box === box;
  stopDictation();
  if (same) return;
  if (!SpeechRec) {
    alert('Dictation by button isn’t available here. Tap in the box and use the microphone key on the iPad keyboard instead.');
    box.focus();
    return;
  }
  const rec = new SpeechRec();
  rec.lang = 'en-AU';
  rec.continuous = true;
  rec.interimResults = true;
  const before = box.value;
  const session = { rec, box, btn };
  rec.onresult = (e) => {
    if (dictation !== session) return;
    if (!box.isConnected) return stopDictation();
    const heard = Array.from(e.results).map((r) => r[0].transcript.trim()).filter(Boolean).join(' ');
    box.value = joinDictation(before, heard);
    box.dispatchEvent(new Event('input'));
  };
  rec.onerror = (e) => {
    if (dictation !== session) return;
    stopDictation();
    if (e.error === 'not-allowed') alert('Microphone access is blocked. Allow the microphone for this app in Settings, or use the microphone key on the iPad keyboard.');
    else if (e.error === 'service-not-allowed') alert('Dictation is turned off on this iPad. Turn on Settings → General → Keyboard → Enable Dictation, or type instead.');
    else if (e.error === 'network') alert('Dictation needs an internet connection. Try again when connected, or use the microphone key on the iPad keyboard.');
  };
  rec.onend = () => { if (dictation === session) stopDictation(); };
  dictation = session;
  btn.setAttribute('aria-pressed', 'true');
  btn.setAttribute('aria-label', 'Stop dictating');
  try { rec.start(); } catch (e) { stopDictation(); }
}

// Add dictated words to the end of the existing text as a new sentence.
function joinDictation(before, heard) {
  let text = tidyDictation(heard);
  if (!text) return before;
  const startsSentence = !before.trim() || /[.!?:]\s*$/.test(before);
  if (startsSentence) text = text[0].toUpperCase() + text.slice(1);
  if (/[A-Za-z0-9)]$/.test(text)) text += '.';
  const sep = !before || /\s$/.test(before) ? '' : ' ';
  return before + sep + text;
}

// Spellings from the master reference that dictation gets wrong.
function tidyDictation(text) {
  return text
    .replace(/\s+/g, ' ').trim()
    .replace(/\blogic(\s?QC)?\b/gi, 'LOGIQC')
    .replace(/\b(thirteen|13) sick\b/gi, '13 SICK')
    .replace(/\bstrive for (five|5)\b/gi, 'Strive for 5')
    .replace(/\bclever ?logger\b/gi, 'CleverLogger')
    .replace(/\b[Dd]octor (?=[A-Z])/g, 'Dr ');
}

// ---------- PDF export ----------

const NAVY = [31, 56, 100];
const GREY = [89, 89, 89];
const GREEN = [46, 107, 31];
const RED = [179, 38, 30];

function exportPdf(visit) {
  saveNow();
  const gps = namedGps(visit);
  const p = progress(gps);
  const missingFindings = gps.filter((g) => !g.findings.trim()).map((g) => gpName(g, visit.gps.indexOf(g)));
  const warnings = [];
  if (p.done < p.total) warnings.push(`${p.total - p.done} health record cell${p.total - p.done === 1 ? ' has' : 's have'} not been reviewed yet.`);
  if (missingFindings.length) warnings.push(`No findings summary yet for: ${missingFindings.join(', ')}.`);
  const e = equipmentProgress(visit);
  if (e.done < e.total) warnings.push(`${e.total - e.done} equipment item${e.total - e.done === 1 ? ' has' : 's have'} not been checked yet.`);
  const s8 = EQUIPMENT.find((sec) => sec.key === 'medicines').items[0];
  if (!equipmentEntry(visit, s8.id).state) warnings.push('S8 medicines have not been checked.');
  if (warnings.length && !confirm(warnings.join('\n') + '\n\nExport the PDF anyway?')) return;

  let doc;
  try {
    doc = buildPdf(visit, gps);
  } catch (e) {
    alert('Could not create the PDF: ' + e.message);
    return;
  }
  const safe = (s) => s.replace(/[\\/:*?"<>|]+/g, '').trim();
  const filename = `Health Records Review - ${safe(visit.practice) || 'Practice'} - ${visit.date}.pdf`;
  shareFile(doc.output('blob'), filename, 'application/pdf');
}

// On iPad the share sheet offers Save to Files, Mail, AirDrop and Print.
function shareFile(blob, filename, type) {
  const file = new File([blob], filename, { type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: filename }).catch((e) => {
      if (e.name !== 'AbortError') downloadBlob(blob, filename);
    });
  } else {
    downloadBlob(blob, filename);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function buildPdf(visit, gps) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 12;
  const contentW = pageW - M * 2;
  const footer = `Health Records Review — ${visit.practice} — ${formatDate(visit.date)}`;

  // Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...NAVY);
  doc.text('Health Records Review', M, M + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(0);
  doc.text(`Practice: ${visit.practice}  |  Date: ${formatDate(visit.date)}  |  Surveyor: ${visit.surveyor}`, M, M + 13);
  doc.text('RACGP Standards for general practices (5th edition) — AGPAL on-site assessment', M, M + 18.5);
  doc.setFontSize(9.5);
  doc.setTextColor(...GREY);
  const intro = doc.splitTextToSize(`${REMINDER} ${RECORDS_PER_GP} records per GP. Tick = present and current; cross = absent or incomplete; N/A = not applicable; blank = not reviewed.`, contentW);
  doc.text(intro, M, M + 24);
  let y = M + 24 + intro.length * 4 + 6;

  // Practice overview: one row per GP, "present / applicable" per column.
  y = heading(doc, 'Overview', M, y);
  const all = gps.flatMap((g) => g.records);
  const fmt = (t) => (t.applicable ? `${t.y}/${t.applicable}` : '–');
  const pct = (recs) => {
    let yes = 0, app = 0;
    COLUMNS.forEach((c) => { const t = tally(recs, c.key); yes += t.y; app += t.applicable; });
    return app ? Math.round((yes / app) * 100) + '%' : '–';
  };
  doc.autoTable({
    startY: y,
    margin: { left: M, right: M, bottom: 16 },
    head: [['GP', ...COLUMNS.map((c) => c.label.replace('/', '/\n')), 'Overall']],
    body: gps.map((g) => [gpName(g, visit.gps.indexOf(g)), ...COLUMNS.map((c) => fmt(tally(g.records, c.key))), pct(g.records)]),
    foot: [['All GPs', ...COLUMNS.map((c) => fmt(tally(all, c.key))), pct(all)]],
    theme: 'grid',
    styles: { fontSize: 9, halign: 'center', valign: 'middle', cellPadding: 1.8, lineColor: [200, 205, 215], lineWidth: 0.2 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [230, 236, 246], textColor: 0, fontStyle: 'bold' },
    columnStyles: equalColumns(contentW, 42, 16, { halign: 'left' })
  });
  y = doc.lastAutoTable.finalY + 4;
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  doc.text('Figures show records with the item present and current out of records reviewed where the item applies (N/A and blank cells excluded).', M, y + 2);
  y += 10;

  // One section per GP
  gps.forEach((gp) => {
    const name = gpName(gp, visit.gps.indexOf(gp));
    const findings = gp.findings.trim();
    const comments = gp.records.map((r, i) => ({ n: i + 1, text: r.comment.trim() })).filter((c) => c.text);
    // Keep each GP's heading, table, comments and summary on one page where possible.
    doc.setFontSize(10);
    const blockH = 72 + (comments.length ? 8 + comments.length * 5 : 0) + doc.splitTextToSize(findings || ' ', contentW).length * 5;
    if (y + blockH > pageH - 16 && y > M + 10) { doc.addPage(); y = M + 4; }
    y = heading(doc, name, M, y);

    doc.autoTable({
      startY: y,
      margin: { left: M, right: M, bottom: 16 },
      head: [['Record', ...COLUMNS.map((c) => c.label.replace('/', '/\n'))]],
      body: gp.records.map((r, i) => [String(i + 1), ...COLUMNS.map((c) => r.cells[c.key])]),
      foot: [['Present', ...COLUMNS.map((c) => fmt(tally(gp.records, c.key)))]],
      theme: 'grid',
      styles: { fontSize: 9, halign: 'center', valign: 'middle', cellPadding: 1.6, minCellHeight: 7, lineColor: [200, 205, 215], lineWidth: 0.2 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [230, 236, 246], textColor: 0, fontStyle: 'bold' },
      columnStyles: equalColumns(contentW, 18, 0, {}),
      didParseCell: (data) => {
        if (data.section !== 'body' || data.column.index === 0) return;
        const v = data.cell.raw;
        data.cell.text = [v === 'na' ? 'N/A' : ''];
        if (v === 'y') data.cell.styles.fillColor = [227, 241, 220];
        if (v === 'n') data.cell.styles.fillColor = [251, 227, 225];
        if (v === 'na') data.cell.styles.textColor = GREY;
      },
      didDrawCell: (data) => {
        if (data.section !== 'body' || data.column.index === 0) return;
        const cx = data.cell.x + data.cell.width / 2;
        const cy = data.cell.y + data.cell.height / 2;
        if (data.cell.raw === 'y') drawTick(doc, cx, cy);
        if (data.cell.raw === 'n') drawCross(doc, cx, cy);
      }
    });
    y = doc.lastAutoTable.finalY + 6;

    if (comments.length) {
      y = subheading(doc, 'Record comments', M, y, pageH);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(0);
      comments.forEach((c) => {
        const lines = doc.splitTextToSize(`Record ${c.n}: ${c.text}`, contentW);
        y = ensureSpace(doc, y, lines.length * 4.5, pageH);
        doc.text(lines, M, y);
        y += lines.length * 4.5 + 1;
      });
      y += 3;
    }

    doc.setFont('helvetica', findings ? 'normal' : 'italic');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(findings || 'No summary entered.', contentW);
    // Keep the summary on one page when it fits on one.
    if (lines.length * 5 + 10 < pageH - 32) y = ensureSpace(doc, y, lines.length * 5 + 10, pageH);
    y = subheading(doc, 'Findings summary', M, y, pageH);
    doc.setFont('helvetica', findings ? 'normal' : 'italic');
    doc.setFontSize(10);
    doc.setTextColor(findings ? 0 : 150);
    lines.forEach((line) => {
      y = ensureSpace(doc, y, 5, pageH);
      doc.text(line, M, y);
      y += 5;
    });
    y += 8;
  });

  // Equipment checklists, long lists split into two side-by-side columns.
  doc.addPage();
  y = heading(doc, 'Equipment', M, M + 4) + 8;
  EQUIPMENT.forEach((sec) => {
    const rows = sec.items.map((item) => {
      const e = equipmentEntry(visit, item.id);
      return [item.label, e.state, e.comment.trim()];
    });
    const count = (st) => rows.filter((r) => r[1] === st).length;
    const unchecked = rows.filter((r) => !r[1]).length;
    const halves = rows.length > 6 ? [rows.slice(0, Math.ceil(rows.length / 2)), rows.slice(Math.ceil(rows.length / 2))] : [rows];
    const estimate = 16 + halves[0].length * 6.5;
    y = ensureSpace(doc, y, Math.min(estimate, pageH - 40), pageH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...NAVY);
    doc.text(sec.title, M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text(`${count('y')} present · ${count('n')} missing or not in order · ${count('na')} N/A${unchecked ? ` · ${unchecked} not checked` : ''}`, pageW - M, y, { align: 'right' });
    const top = y + 2.5;
    const gap = 6;
    const halfW = halves.length > 1 ? (contentW - gap) / 2 : contentW;
    const startPage = doc.internal.getCurrentPageInfo().pageNumber;
    let end = { page: startPage, y: top };
    halves.forEach((half, h) => {
      const left = M + h * (halfW + gap);
      doc.setPage(startPage);
      doc.autoTable({
        startY: top,
        margin: { left, right: pageW - left - halfW, bottom: 16 },
        tableWidth: halfW,
        head: [['Item', 'Status', 'Comment']],
        body: half,
        theme: 'grid',
        styles: { fontSize: 8.5, valign: 'middle', cellPadding: 1.4, minCellHeight: 6, lineColor: [200, 205, 215], lineWidth: 0.2 },
        headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
        columnStyles: { 1: { cellWidth: 14, halign: 'center' }, 2: { cellWidth: halves.length > 1 ? 42 : 110 } },
        didParseCell: (data) => {
          if (data.section !== 'body' || data.column.index !== 1) return;
          const v = data.cell.raw;
          data.cell.text = [v === 'na' ? 'N/A' : ''];
          if (v === 'y') data.cell.styles.fillColor = [227, 241, 220];
          if (v === 'n') data.cell.styles.fillColor = [251, 227, 225];
          if (v === 'na') data.cell.styles.textColor = GREY;
        },
        didDrawCell: (data) => {
          if (data.section !== 'body' || data.column.index !== 1) return;
          const cx = data.cell.x + data.cell.width / 2;
          const cy = data.cell.y + data.cell.height / 2;
          if (data.cell.raw === 'y') drawTick(doc, cx, cy);
          if (data.cell.raw === 'n') drawCross(doc, cx, cy);
        }
      });
      // If a long half ran onto another page, carry on below whichever half ended last.
      const page = doc.internal.getCurrentPageInfo().pageNumber;
      const finalY = doc.lastAutoTable.finalY;
      if (page > end.page || (page === end.page && finalY > end.y)) end = { page, y: finalY };
    });
    doc.setPage(end.page);
    y = end.y + 9;
  });

  // Footer with page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(footer, M, pageH - 7);
    doc.text(`Page ${i} of ${pages}`, pageW - M, pageH - 7, { align: 'right' });
  }
  return doc;
}

// First column fixed, optional fixed last column, item columns share the rest equally.
function equalColumns(totalW, firstW, lastW, firstStyle) {
  const styles = { 0: Object.assign({ cellWidth: firstW }, firstStyle) };
  const itemW = (totalW - firstW - lastW) / COLUMNS.length;
  COLUMNS.forEach((c, i) => { styles[i + 1] = { cellWidth: itemW }; });
  if (lastW) styles[COLUMNS.length + 1] = { cellWidth: lastW };
  return styles;
}

function heading(doc, text, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(text, x, y);
  return y + 3;
}

function subheading(doc, text, x, y, pageH) {
  y = ensureSpace(doc, y, 12, pageH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...GREY);
  doc.text(text, x, y);
  return y + 5;
}

function ensureSpace(doc, y, needed, pageH) {
  if (y + needed > pageH - 16) {
    doc.addPage();
    return 16;
  }
  return y;
}

function drawTick(doc, cx, cy) {
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.6);
  doc.lines([[1.2, 1.2], [2.4, -2.8]], cx - 1.8, cy + 0.1);
}

function drawCross(doc, cx, cy) {
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.6);
  doc.line(cx - 1.5, cy - 1.5, cx + 1.5, cy + 1.5);
  doc.line(cx - 1.5, cy + 1.5, cx + 1.5, cy - 1.5);
}

// ---------- Start ----------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
route();
