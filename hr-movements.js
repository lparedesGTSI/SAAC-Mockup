(function () {
  const session = getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  if (!isAdmin(session)) {
    sessionStorage.setItem('infonavit_flash', 'No tienes permisos de administrador para ver esta página.');
    window.location.href = 'dashboard.html';
    return;
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
  const tbody       = document.getElementById('movements-body');

  let currentMovements = [];

  function getFiltered() {
    let movs = getAllHrMovements().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const q = searchInput.value.trim().toLowerCase();
    if (q) movs = movs.filter((m) => (m.email || '').toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q));

    const type = typeFilter.value;
    if (type) movs = movs.filter((m) => m.type === type);

    if (dateFrom.value) {
      const from = new Date(dateFrom.value + 'T00:00:00');
      movs = movs.filter((m) => new Date(m.effectiveDate || m.createdAt) >= from);
    }
    if (dateTo.value) {
      const to = new Date(dateTo.value + 'T23:59:59');
      movs = movs.filter((m) => new Date(m.effectiveDate || m.createdAt) <= to);
    }
    return movs;
  }

  const TYPE_COLORS = { alta: '#1e8e5a', baja: '#b91c1c', cambio: '#1d4ed8', promocion: '#a16207' };

  function render() {
    currentMovements = getFiltered();
    if (!currentMovements.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No hay movimientos con los filtros seleccionados.</td></tr>';
      return;
    }
    tbody.innerHTML = currentMovements.map((m) => {
      const color = TYPE_COLORS[m.type] || '#545454';
      const effectiveFmt = m.effectiveDate
        ? new Date(m.effectiveDate + 'T00:00:00').toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
        : '—';
      const createdFmt = new Date(m.createdAt).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
      return `<tr>
        <td>
          <span class="badge ${hrMovementTypeClass(m.type)}">${hrMovementTypeLabel(m.type)}</span>
        </td>
        <td>
          <div class="hr-employee-meta">
            <strong>${m.name || deriveNameFromEmail(m.email || '')}</strong>
            <span>${m.email || '—'}</span>
          </div>
        </td>
        <td>${effectiveFmt}</td>
        <td style="font-size:13px;color:var(--color-graphite);max-width:280px;">${hrMovementSummary(m)}</td>
        <td style="font-size:13px;color:var(--color-steel);">${m.createdBy || '—'}</td>
        <td style="font-size:13px;color:var(--color-steel);">${createdFmt}</td>
      </tr>`;
    }).join('');
  }

  filterBtn.addEventListener('click', render);
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') render(); });

  exportBtn.addEventListener('click', () => {
    if (typeof XLSX === 'undefined') { showToast('SheetJS no disponible.', 'error'); return; }
    const rows = currentMovements.map((m) => ({
      'Tipo': hrMovementTypeLabel(m.type),
      'Empleado': m.name || deriveNameFromEmail(m.email || ''),
      'Correo': m.email || '',
      'Fecha efectiva': m.effectiveDate || '',
      'Resumen': hrMovementSummary(m),
      'Registrado por': m.createdBy || '',
      'Fecha de registro': m.createdAt ? m.createdAt.slice(0, 10) : '',
    }));
    exportRowsToExcel(rows, 'movimientos_rh.xlsx', 'Movimientos RH');
  });

  render();
  showFlashIfAny();
})();
