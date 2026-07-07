const STORAGE_KEYS = {
  session: 'infonavit_session',
  records: 'infonavit_attendance_records',
  vacations: 'infonavit_vacation_requests',
  employees: 'infonavit_employees',
  hrMovements: 'infonavit_hr_movements',
  incidents: 'infonavit_incidents',
  commissions: 'infonavit_commissions',
};

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.session));
  } catch {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
}

function isAdmin(session) {
  return !!session && session.role === 'admin';
}

const ADMIN_ONLY_PAGES = ['admin-reports.html', 'indicators.html'];

function applyNavVisibility(session) {
  if (isAdmin(session)) return;
  ADMIN_ONLY_PAGES.forEach((page) => {
    const link = document.querySelector(`a[href="${page}"]`);
    if (link) link.remove();
  });
  ['rh-menu', 'empleados-menu'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

/* ---------- Empleados (registro RH) ---------- */
function getAllEmployees() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.employees)) || []; } catch { return []; }
}
function saveAllEmployees(list) {
  localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(list));
}
function upsertEmployee(data) {
  const list = getAllEmployees();
  const idx = list.findIndex((e) => e.email === data.email);
  if (idx >= 0) list[idx] = { ...list[idx], ...data };
  else list.push({ active: true, ...data });
  saveAllEmployees(list);
}
function setEmployeeInactive(email) {
  const list = getAllEmployees();
  const idx = list.findIndex((e) => e.email === email);
  if (idx >= 0) { list[idx].active = false; saveAllEmployees(list); }
}
function isEmployeeActive(email) {
  const emp = getAllEmployees().find((e) => e.email === email);
  return !emp || emp.active !== false;
}
function getKnownEmails() {
  const fromRecords = [...new Set(getAllRecords().map((r) => r.email))];
  const fromEmployees = getAllEmployees().map((e) => e.email);
  return [...new Set([...fromRecords, ...fromEmployees])];
}

function getAllEmployeeProfiles() {
  const employees = getAllEmployees();
  const emailSet = new Set(employees.map((e) => e.email));
  const extra = [...new Set(getAllRecords().map((r) => r.email))]
    .filter((email) => !emailSet.has(email))
    .map((email) => ({ email, name: deriveNameFromEmail(email), active: true }));
  return [...employees, ...extra].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'es')
  );
}

function updateEmployeeProfile(email, data) {
  upsertEmployee({ ...data, email });
}

/* ---------- Incidencias ---------- */
function getAllIncidents() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.incidents)) || []; } catch { return []; }
}
function saveAllIncidents(list) {
  localStorage.setItem(STORAGE_KEYS.incidents, JSON.stringify(list));
}
function addIncident(data) {
  const list = getAllIncidents();
  const inc = { id: Date.now().toString(36) + Math.random().toString(36).slice(2,5), createdAt: new Date().toISOString(), ...data };
  list.push(inc);
  saveAllIncidents(list);
  return inc;
}
function getIncidentsForUser(email) {
  return getAllIncidents().filter((i) => i.email === email).sort((a, b) => new Date(b.date) - new Date(a.date));
}
const INCIDENT_TYPES = {
  retardo:            'Retardo',
  falta_injustificada:'Falta injustificada',
  falta_justificada:  'Falta justificada',
  permiso_goce:       'Permiso con goce',
  permiso_sin_goce:   'Permiso sin goce',
  incapacidad:        'Incapacidad IMSS',
};
function incidentTypeLabel(type) { return INCIDENT_TYPES[type] || type; }
function incidentTypeClass(type) {
  const map = {
    retardo:            'badge-warning',
    falta_injustificada:'badge-danger',
    falta_justificada:  'badge-info',
    permiso_goce:       'badge-success',
    permiso_sin_goce:   'badge-info',
    incapacidad:        'badge-warning',
  };
  return map[type] || 'badge-info';
}

/* ---------- Comisiones de servicio ---------- */
function getAllCommissions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.commissions)) || []; } catch { return []; }
}
function saveAllCommissions(list) {
  localStorage.setItem(STORAGE_KEYS.commissions, JSON.stringify(list));
}
function addCommission(data) {
  const list = getAllCommissions();
  const com = { id: Date.now().toString(36) + Math.random().toString(36).slice(2,5), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
  list.push(com);
  saveAllCommissions(list);
  return com;
}
function updateCommission(id, changes) {
  const list = getAllCommissions();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...changes, updatedAt: new Date().toISOString() };
  saveAllCommissions(list);
  return list[idx];
}
function getCommissionsForUser(email) {
  return getAllCommissions().filter((c) => c.email === email).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function commissionStatusLabel(status) {
  return { pending:'Pendiente', approved_manager:'Aprobada por jefe', approved:'Aprobada', rejected:'Rechazada' }[status] || status;
}
function commissionStatusClass(status) {
  return { pending:'badge-warning', approved_manager:'badge-info', approved:'badge-success', rejected:'badge-danger' }[status] || 'badge-warning';
}

/* ---------- Movimientos RH ---------- */
function getAllHrMovements() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.hrMovements)) || []; } catch { return []; }
}
function saveAllHrMovements(list) {
  localStorage.setItem(STORAGE_KEYS.hrMovements, JSON.stringify(list));
}
function addHrMovement(data) {
  const list = getAllHrMovements();
  const mov = { id: Date.now().toString(36) + Math.random().toString(36).slice(2,5), createdAt: new Date().toISOString(), ...data };
  list.push(mov);
  saveAllHrMovements(list);
  return mov;
}
function hrMovementSummary(mov) {
  switch (mov.type) {
    case 'alta': return `Alta · ${mov.position || ''}${mov.area ? ' — ' + mov.area : ''}`;
    case 'baja': return `Baja ${mov.leaveType || ''} · ${mov.reason || ''}`.trim();
    case 'cambio': return `Cambio de ${mov.changeType || ''}: ${mov.previousValue || '—'} → ${mov.newValue || '—'}`;
    case 'promocion': return `Promoción: ${mov.previousPosition || '—'} → ${mov.newPosition || '—'}`;
    default: return mov.type;
  }
}
function hrMovementTypeLabel(type) {
  return { alta: 'Alta', baja: 'Baja', cambio: 'Cambio', promocion: 'Promoción' }[type] || type;
}
function hrMovementTypeClass(type) {
  return { alta: 'badge-success', baja: 'badge-danger', cambio: 'badge-info', promocion: 'badge-warning' }[type] || 'badge-info';
}

function getAllRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.records)) || [];
  } catch {
    return [];
  }
}

function saveAllRecords(records) {
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
}

function addRecord(email, type, meta = {}) {
  const records = getAllRecords();
  const now = new Date();
  records.push({
    email,
    type,
    timestamp: now.toISOString(),
    photo: meta.photo || null,
    location: meta.location || null,
    device: meta.device || null,
    ip: meta.ip || null,
  });
  saveAllRecords(records);
  return records;
}

function deriveNameFromEmail(email) {
  const local = (email || '').split('@')[0];
  const words = local.split(/[._-]+/).filter(Boolean);
  if (words.length === 0) return 'Usuario';
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getInitials(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '--';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function detectDeviceType() {
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'Móvil';
  return 'Escritorio';
}

function fetchPublicIp() {
  return fetch('https://api.ipify.org?format=json')
    .then((res) => res.json())
    .then((data) => data.ip || 'No disponible')
    .catch(() => 'No disponible');
}

function requestCurrentLocation() {
  return new Promise((resolve) => {
    if (window.isSecureContext === false) {
      resolve({ location: null, error: 'Requiere conexión segura (HTTPS)' });
      return;
    }
    if (!navigator.geolocation) {
      resolve({ location: null, error: 'Geolocalización no soportada en este navegador' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude }, error: null }),
      (err) => {
        let message = 'No se pudo obtener la ubicación';
        if (err && err.code === 1) message = 'Permiso de ubicación denegado';
        else if (err && err.code === 2) message = 'Ubicación no disponible en este momento';
        else if (err && err.code === 3) message = 'Tiempo de espera agotado al obtener la ubicación';
        resolve({ location: null, error: message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

function formatLocation(location) {
  if (!location) return 'No disponible';
  return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
}

function getRecordsForUser(email) {
  return getAllRecords()
    .filter((r) => r.email === email)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function groupRecordsByDay(records) {
  const map = new Map();
  records.forEach((r) => {
    const d = new Date(r.timestamp);
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const key = `${r.email}|${dayKey}`;
    if (!map.has(key)) {
      map.set(key, {
        email: r.email,
        dateObj: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        entrada: null,
        salida: null,
      });
    }
    const group = map.get(key);
    if (r.type === 'entrada') {
      if (!group.entrada || new Date(r.timestamp) < new Date(group.entrada.timestamp)) group.entrada = r;
    } else if (r.type === 'salida') {
      if (!group.salida || new Date(r.timestamp) > new Date(group.salida.timestamp)) group.salida = r;
    }
  });
  return Array.from(map.values()).sort((a, b) => b.dateObj - a.dateObj || a.email.localeCompare(b.email));
}

function computeWorkedHoursLabel(entrada, salida) {
  if (!entrada || !salida) return '--';
  const diffMs = new Date(salida.timestamp) - new Date(entrada.timestamp);
  if (diffMs <= 0) return '--';
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function buildMapEmbedUrl(location, delta = 0.01) {
  const { lat, lng } = location;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

function msToHoursLabel(ms) {
  if (!ms || ms <= 0) return '0h 0m';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function computeIndicators(records) {
  const groups = groupRecordsByDay(records);
  const emails = new Set(records.map((r) => r.email));
  const today = new Date();

  const completeDays = groups.filter((g) => g.entrada && g.salida);
  const totalWorkedMs = completeDays.reduce(
    (sum, g) => sum + Math.max(0, new Date(g.salida.timestamp) - new Date(g.entrada.timestamp)),
    0
  );
  const avgHoursMs = completeDays.length ? totalWorkedMs / completeDays.length : 0;

  const todayCheckedIn = groups.filter((g) => g.entrada && isSameDay(g.dateObj, today)).length;

  const byDateMap = new Map();
  groups.forEach((g) => {
    if (!g.entrada) return;
    const key = g.dateObj.toISOString().slice(0, 10);
    byDateMap.set(key, (byDateMap.get(key) || 0) + 1);
  });
  const sortedDateKeys = Array.from(byDateMap.keys()).sort();

  const deviceCounts = {};
  records.forEach((r) => {
    const device = r.device || 'Desconocido';
    deviceCounts[device] = (deviceCounts[device] || 0) + 1;
  });

  const hoursByEmail = new Map();
  completeDays.forEach((g) => {
    const diff = new Date(g.salida.timestamp) - new Date(g.entrada.timestamp);
    if (diff <= 0) return;
    if (!hoursByEmail.has(g.email)) hoursByEmail.set(g.email, { totalMs: 0, days: 0 });
    const entry = hoursByEmail.get(g.email);
    entry.totalMs += diff;
    entry.days += 1;
  });
  const avgHoursByEmployee = Array.from(hoursByEmail.entries())
    .map(([email, v]) => ({ email, avgHoursDecimal: v.totalMs / v.days / 3600000 }))
    .sort((a, b) => b.avgHoursDecimal - a.avgHoursDecimal)
    .slice(0, 8);

  return {
    totalEmployees: emails.size,
    totalRecords: records.length,
    avgHoursLabel: msToHoursLabel(avgHoursMs),
    todayCheckedIn,
    sortedDateKeys,
    byDateMap,
    deviceCounts,
    avgHoursByEmployee,
  };
}

function exportRowsToExcel(rows, filename, sheetName) {
  if (typeof XLSX === 'undefined') {
    showToast('No se pudo cargar el módulo de exportación', 'error');
    return;
  }
  if (!rows || rows.length === 0) {
    showToast('No hay datos para exportar', 'error');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Asistencia');
  XLSX.writeFile(wb, filename);
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function formatTime(date) {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatTimeShort(date) {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLong(date) {
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(date) {
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showFlashIfAny() {
  const message = sessionStorage.getItem('infonavit_flash');
  if (message) {
    sessionStorage.removeItem('infonavit_flash');
    showToast(message, 'error');
  }
}

/* ---------- Dropdowns de nav (genérico) ---------- */
document.addEventListener('DOMContentLoaded', function () {
  function closeAll() {
    document.querySelectorAll('.topnav-modules.open').forEach(function (m) {
      m.classList.remove('open');
      var b = m.querySelector('.topnav-modules-btn');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  document.querySelectorAll('.topnav-modules').forEach(function (menu) {
    var btn = menu.querySelector('.topnav-modules-btn');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasOpen = menu.classList.contains('open');
      closeAll();
      if (!wasOpen) {
        menu.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
    var drop = menu.querySelector('.topnav-modules-dropdown');
    if (drop) drop.addEventListener('click', function (e) { e.stopPropagation(); });
  });
  document.addEventListener('click', closeAll);
});

function showToast(message, variant = 'default') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show' + (variant !== 'default' ? ' ' + variant : '');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

/* ---------- Vacaciones ---------- */
const VACATION_DAYS_PER_YEAR = 12;

function getAllVacationRequests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.vacations)) || [];
  } catch {
    return [];
  }
}

function saveAllVacationRequests(requests) {
  localStorage.setItem(STORAGE_KEYS.vacations, JSON.stringify(requests));
}

function getVacationRequestsForUser(email) {
  return getAllVacationRequests()
    .filter((r) => r.email === email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function countWorkingDays(startDateStr, endDateStr) {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function addVacationRequest(email, name, startDate, endDate, reason) {
  const requests = getAllVacationRequests();
  const days = countWorkingDays(startDate, endDate);
  const req = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    email,
    name,
    startDate,
    endDate,
    days,
    reason,
    status: 'pending',
    rejectedBy: null,
    rejectionReason: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  requests.push(req);
  saveAllVacationRequests(requests);
  return req;
}

function updateVacationRequest(id, changes) {
  const requests = getAllVacationRequests();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  requests[idx] = { ...requests[idx], ...changes, updatedAt: new Date().toISOString() };
  saveAllVacationRequests(requests);
  return requests[idx];
}

function computeVacationStats(email) {
  const requests = getVacationRequestsForUser(email);
  const taken = requests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.days, 0);
  const pending = requests
    .filter((r) => r.status === 'pending' || r.status === 'approved_manager')
    .reduce((sum, r) => sum + r.days, 0);
  const available = Math.max(0, VACATION_DAYS_PER_YEAR - taken - pending);
  return { taken, pending, available, total: VACATION_DAYS_PER_YEAR };
}

function formatDateMX(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

function vacationStatusLabel(status) {
  const map = {
    pending: 'Pendiente',
    approved_manager: 'Aprobada por jefe',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  };
  return map[status] || status;
}

function vacationStatusClass(status) {
  const map = {
    pending: 'badge-warning',
    approved_manager: 'badge-info',
    approved: 'badge-success',
    rejected: 'badge-danger',
  };
  return map[status] || 'badge-warning';
}
