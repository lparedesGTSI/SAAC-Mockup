(function () {
  const session = getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  if (!isAdmin(session)) {
    sessionStorage.setItem('infonavit_flash', 'No tienes permisos para ver esta página.');
    window.location.href = 'dashboard.html'; return;
  }
  applyNavVisibility(session);
  document.getElementById('user-initials').textContent = getInitials(session.name);
  document.getElementById('user-name').textContent = session.name;
  document.getElementById('logout-btn').addEventListener('click', () => { clearSession(); window.location.href = 'index.html'; });

  const searchInput = document.getElementById('search-input');
  const typeFilter  = document.getElementById('type-filter');
  const dateFrom    = document.getElementById('date-from');
  const dateTo      = document.getElementById('date-to');
  const filterBtn   = document.getElementById('filter-btn');
  const exportBtn   = document.getElementById('export-btn');
  const tbody       = document.getElementById('incidents-body');
  let current = [];

  function getFiltered() {
    let incs = getAllIncidents().sort((a,b) => new Date(b.date) - new Date(a.date));
    const q = searchInput.value.trim().toLowerCase();
    if (q) incs = incs.filter(i => (i.email||'').toLowerCase().includes(q)||(i.name||'').toLowerCase().includes(q));
    if (typeFilter.value) incs = incs.filter(i => i.type === typeFilter.value);
    if (dateFrom.value) incs = incs.filter(i => i.date >= dateFrom.value);
    if (dateTo.value) incs = incs.filter(i => i.date <= dateTo.value);
    return incs;
  }

  function render() {
    current = getFiltered();
    if (!current.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No hay incidencias con los filtros seleccionados.</td></tr>';
      return;
    }
    tbody.innerHTML = current.map(i => `<tr>
      <td><span class="badge ${incidentTypeClass(i.type)}">${incidentTypeLabel(i.type)}</span></td>
      <td>
        <div class="hr-employee-meta">
          <strong>${i.name || deriveNameFromEmail(i.email||'')}</strong>
          <span>${i.email||'—'}</span>
        </div>
      </td>
      <td style="font-size:13px;">${i.date ? new Date(i.date+'T00:00:00').toLocaleDateString('es-MX') : '—'}</td>
      <td style="font-size:13px;">${i.duration ? i.duration + ' ' + (i.durationType||'') : '—'}</td>
      <td style="font-size:13px;color:var(--color-graphite);max-width:240px;">${i.notes||'—'}</td>
      <td style="font-size:13px;color:var(--color-steel);">${i.createdBy||'—'}</td>
    </tr>`).join('');
  }

  filterBtn.addEventListener('click', render);
  searchInput.addEventListener('keydown', e => { if (e.key==='Enter') render(); });

  exportBtn.addEventListener('click', () => {
    if (typeof XLSX === 'undefined') { showToast('SheetJS no disponible.','error'); return; }
    const rows = current.map(i => ({
      'Tipo': incidentTypeLabel(i.type),
      'Empleado': i.name||deriveNameFromEmail(i.email||''),
      'Correo': i.email||'',
      'Fecha': i.date||'',
      'Duración': i.duration ? i.duration+' '+(i.durationType||'') : '',
      'Notas/Justificación': i.notes||'',
      'Registrado por': i.createdBy||'',
    }));
    exportRowsToExcel(rows, 'incidencias.xlsx', 'Incidencias');
  });

  render();
  showFlashIfAny();
})();
