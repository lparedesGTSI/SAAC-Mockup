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
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession(); window.location.href = 'index.html';
  });

  const statusFilter = document.getElementById('status-filter');
  const list = document.getElementById('approvals-list');

  /* ---- Rechazo modal ---- */
  const rejectModal = document.getElementById('reject-modal');
  let pendingRejectId = null;

  function openRejectModal(id) {
    pendingRejectId = id;
    document.getElementById('reject-reason').value = '';
    rejectModal.removeAttribute('hidden');
  }
  function closeRejectModal() {
    rejectModal.setAttribute('hidden', '');
    pendingRejectId = null;
  }

  document.getElementById('reject-modal-close').addEventListener('click', closeRejectModal);
  document.getElementById('reject-cancel').addEventListener('click', closeRejectModal);
  rejectModal.addEventListener('click', (e) => { if (e.target === rejectModal) closeRejectModal(); });

  document.getElementById('reject-confirm').addEventListener('click', () => {
    if (!pendingRejectId) return;
    const reason = document.getElementById('reject-reason').value.trim();
    updateVacationRequest(pendingRejectId, {
      status: 'rejected',
      rejectionReason: reason,
    });
    closeRejectModal();
    render();
    showToast('Solicitud rechazada.', 'default');
  });

  /* ---- Renderizado ---- */
  function approveRequest(id) {
    const req = getAllVacationRequests().find((r) => r.id === id);
    if (!req) return;
    if (req.status === 'pending') {
      // Jefe aprueba → pasa a RH
      updateVacationRequest(id, { status: 'approved_manager' });
      showToast('Aprobada por jefe. Pendiente de RH.', 'default');
    } else if (req.status === 'approved_manager') {
      // RH aprueba → aprobada definitivamente
      updateVacationRequest(id, { status: 'approved' });
      showToast('Solicitud aprobada por RH.', 'default');
    }
    render();
  }

  function stepLabel(status) {
    if (status === 'pending') return 'Paso 1 de 2 · Esperando aprobación del jefe directo';
    if (status === 'approved_manager') return 'Paso 2 de 2 · Esperando aprobación de RH';
    return '';
  }

  function render() {
    const filter = statusFilter.value;
    let requests = getAllVacationRequests().sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    if (filter !== 'all') {
      requests = requests.filter((r) => r.status === filter);
    }

    if (!requests.length) {
      list.innerHTML = `
        <div class="approvals-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          <p>No hay solicitudes en este estado.</p>
        </div>`;
      return;
    }

    list.innerHTML = requests.map((r) => {
      const isPending = r.status === 'pending' || r.status === 'approved_manager';
      const stepHtml = isPending
        ? `<div class="approval-step-label">${stepLabel(r.status)}</div>` : '';

      const actionsHtml = isPending ? `
        <div class="approval-card-actions">
          <button type="button" class="btn btn-primary btn-sm" data-approve="${r.id}">
            ${r.status === 'pending' ? 'Aprobar (jefe)' : 'Aprobar (RH)'}
          </button>
          <button type="button" class="btn btn-secondary btn-sm" data-reject="${r.id}">Rechazar</button>
        </div>` : '';

      const rejectionHtml = r.status === 'rejected' && r.rejectionReason
        ? `<p style="font-size:13px;color:var(--color-infonavit-red);margin:8px 0 0;">
            Motivo de rechazo: ${r.rejectionReason}
          </p>` : '';

      return `
        <div class="approval-card">
          <div class="approval-card-header">
            <div class="approval-card-employee">
              <strong>${r.name}</strong>
              <span>${r.email}</span>
            </div>
            <span class="badge ${vacationStatusClass(r.status)}">${vacationStatusLabel(r.status)}</span>
          </div>
          ${stepHtml}
          <div class="approval-card-dates">
            Período: <strong>${formatDateMX(r.startDate)}</strong> al <strong>${formatDateMX(r.endDate)}</strong>
            &nbsp;·&nbsp; <strong>${r.days}</strong> día${r.days !== 1 ? 's' : ''} hábil${r.days !== 1 ? 'es' : ''}
          </div>
          ${r.reason ? `<div class="approval-card-reason">"${r.reason}"</div>` : ''}
          ${rejectionHtml}
          ${actionsHtml}
        </div>`;
    }).join('');

    // Eventos delegados
    list.querySelectorAll('[data-approve]').forEach((btn) => {
      btn.addEventListener('click', () => approveRequest(btn.dataset.approve));
    });
    list.querySelectorAll('[data-reject]').forEach((btn) => {
      btn.addEventListener('click', () => openRejectModal(btn.dataset.reject));
    });
  }

  statusFilter.addEventListener('change', render);
  render();
  showFlashIfAny();
})();
