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

  const searchInput  = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const dateFrom     = document.getElementById('date-from');
  const dateTo       = document.getElementById('date-to');
  const filterBtn    = document.getElementById('filter-btn');
  const exportBtn    = document.getElementById('export-btn');
  const list         = document.getElementById('commissions-list');
  let current = [];

  // Rechazo modal
  const rejectModal = document.getElementById('reject-modal');
  let pendingRejectId = null;
  document.getElementById('reject-close').addEventListener('click', () => rejectModal.setAttribute('hidden',''));
  document.getElementById('reject-cancel').addEventListener('click', () => rejectModal.setAttribute('hidden',''));
  rejectModal.addEventListener('click', e => { if (e.target === rejectModal) rejectModal.setAttribute('hidden',''); });
  document.getElementById('reject-confirm').addEventListener('click', () => {
    if (!pendingRejectId) return;
    updateCommission(pendingRejectId, { status: 'rejected', rejectionReason: document.getElementById('reject-reason').value.trim() });
    rejectModal.setAttribute('hidden','');
    render();
    showToast('Comisión rechazada.');
  });

  function getFiltered() {
    let coms = getAllCommissions().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    const q = searchInput.value.trim().toLowerCase();
    if (q) coms = coms.filter(c => (c.email||'').toLowerCase().includes(q)||(c.name||'').toLowerCase().includes(q));
    if (statusFilter.value) coms = coms.filter(c => c.status === statusFilter.value);
    if (dateFrom.value) coms = coms.filter(c => (c.departureDate||'') >= dateFrom.value);
    if (dateTo.value) coms = coms.filter(c => (c.departureDate||'') <= dateTo.value);
    return coms;
  }

  function approve(id) {
    const com = getAllCommissions().find(c => c.id === id);
    if (!com) return;
    if (com.status === 'pending') {
      updateCommission(id, { status: 'approved_manager' });
      showToast('Aprobada por jefe. Pendiente de RH.');
    } else if (com.status === 'approved_manager') {
      updateCommission(id, { status: 'approved' });
      showToast('Comisión aprobada por RH.');
    }
    render();
  }

  function render() {
    current = getFiltered();
    if (!current.length) {
      list.innerHTML = `<div class="approvals-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <p>No hay comisiones con los filtros seleccionados.</p>
      </div>`;
      return;
    }

    list.innerHTML = current.map(c => {
      const isPending = c.status === 'pending' || c.status === 'approved_manager';
      const stepText = c.status === 'pending' ? 'Paso 1 de 2 · Esperando aprobación del jefe directo'
                     : c.status === 'approved_manager' ? 'Paso 2 de 2 · Esperando aprobación de RH' : '';
      return `<div class="commission-card">
        <div class="commission-card-header">
          <div>
            <div class="commission-destination">${c.destination || '—'}</div>
            <div style="font-size:13px;color:var(--color-steel);">${c.name||deriveNameFromEmail(c.email||'')} · ${c.email||''}</div>
          </div>
          <span class="badge ${commissionStatusClass(c.status)}">${commissionStatusLabel(c.status)}</span>
        </div>
        ${isPending ? `<div class="commission-step-label">${stepText}</div>` : ''}
        <div class="commission-meta">
          <strong>Salida:</strong> ${c.departureDate ? new Date(c.departureDate+'T00:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
          &nbsp;·&nbsp; <strong>Regreso:</strong> ${c.returnDate ? new Date(c.returnDate+'T00:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
          &nbsp;·&nbsp; ${c.days || 0} día${c.days!==1?'s':''}
          ${c.viaticos ? '&nbsp;·&nbsp; Viáticos: $' + Number(c.viaticos).toLocaleString('es-MX') : ''}
        </div>
        ${c.purpose ? `<div class="commission-purpose">"${c.purpose}"</div>` : ''}
        ${c.officeNumber ? `<div style="font-size:12px;color:var(--color-steel);">No. oficio: ${c.officeNumber}</div>` : ''}
        ${c.status==='rejected'&&c.rejectionReason ? `<div style="font-size:13px;color:var(--color-infonavit-red);margin-top:8px;">Motivo de rechazo: ${c.rejectionReason}</div>` : ''}
        ${isPending ? `<div class="approval-card-actions" style="margin-top:12px;">
          <button class="btn btn-primary btn-sm" data-approve="${c.id}">${c.status==='pending'?'Aprobar (jefe)':'Aprobar (RH)'}</button>
          <button class="btn btn-secondary btn-sm" data-reject="${c.id}">Rechazar</button>
        </div>` : ''}
      </div>`;
    }).join('');

    list.querySelectorAll('[data-approve]').forEach(btn => btn.addEventListener('click', () => approve(btn.dataset.approve)));
    list.querySelectorAll('[data-reject]').forEach(btn => btn.addEventListener('click', () => {
      pendingRejectId = btn.dataset.reject;
      document.getElementById('reject-reason').value = '';
      rejectModal.removeAttribute('hidden');
    }));
  }

  filterBtn.addEventListener('click', render);
  statusFilter.addEventListener('change', render);
  searchInput.addEventListener('keydown', e => { if (e.key==='Enter') render(); });

  exportBtn.addEventListener('click', () => {
    if (typeof XLSX === 'undefined') { showToast('SheetJS no disponible.','error'); return; }
    const rows = current.map(c => ({
      'Empleado': c.name||deriveNameFromEmail(c.email||''),
      'Correo': c.email||'',
      'Destino': c.destination||'',
      'Propósito': c.purpose||'',
      'Salida': c.departureDate||'',
      'Regreso': c.returnDate||'',
      'Días': c.days||0,
      'Viáticos': c.viaticos||'',
      'No. Oficio': c.officeNumber||'',
      'Estado': commissionStatusLabel(c.status),
    }));
    exportRowsToExcel(rows, 'comisiones.xlsx', 'Comisiones');
  });

  render();
  showFlashIfAny();
})();
