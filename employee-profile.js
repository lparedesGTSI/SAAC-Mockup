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

  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');
  if (!email) { window.location.href = 'employee-list.html'; return; }

  function getEmployee() {
    return getAllEmployees().find(e => e.email === email) || { email, name: deriveNameFromEmail(email), active: true };
  }

  function fillValue(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val || '—';
    if (!val) el.classList.add('empty'); else el.classList.remove('empty');
  }
  function fillInput(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  function renderHeader(emp) {
    const name = emp.name || deriveNameFromEmail(emp.email);
    const inactive = emp.active === false;
    document.title = name + ' · Asistencia Infonavit';
    document.getElementById('profile-avatar').textContent = getInitials(name);
    if (inactive) document.getElementById('profile-avatar').classList.add('inactive');
    document.getElementById('profile-name').textContent = name;
    document.getElementById('profile-email').textContent = emp.email;
    const sb = document.getElementById('profile-status-badge');
    sb.textContent = inactive ? 'Inactivo' : 'Activo';
    sb.className = 'badge ' + (inactive ? 'badge-inactive' : 'badge-active');
    const pb = document.getElementById('profile-position-badge');
    if (emp.position) { pb.textContent = emp.position; pb.style.display = ''; }
  }

  function renderPersonal(emp) {
    fillValue('v-curp', emp.curp);
    fillValue('v-nss', emp.nss);
    fillValue('v-rfc', emp.rfc);
    fillValue('v-birthDate', emp.birthDate ? new Date(emp.birthDate+'T00:00:00').toLocaleDateString('es-MX') : '');
    fillValue('v-gender', emp.gender);
    fillValue('v-phone', emp.phone);
    fillValue('v-address', emp.address);
    const ec = emp.emergencyContact || {};
    fillValue('v-emergencyName', ec.name);
    fillValue('v-emergencyPhone', ec.phone);
    fillValue('v-emergencyRel', ec.relationship);
    fillInput('f-curp', emp.curp); fillInput('f-nss', emp.nss); fillInput('f-rfc', emp.rfc);
    fillInput('f-birthDate', emp.birthDate); fillInput('f-gender', emp.gender);
    fillInput('f-phone', emp.phone); fillInput('f-address', emp.address);
    fillInput('f-emergencyName', ec.name); fillInput('f-emergencyPhone', ec.phone); fillInput('f-emergencyRel', ec.relationship);
  }

  function renderLaboral(emp) {
    fillValue('v-position', emp.position); fillValue('v-area', emp.area);
    fillValue('v-manager', emp.manager);
    fillValue('v-hireDate', emp.hireDate ? new Date(emp.hireDate+'T00:00:00').toLocaleDateString('es-MX') : '');
    fillValue('v-contractType', emp.contractType);
    fillInput('f-position', emp.position); fillInput('f-area', emp.area);
    fillInput('f-manager', emp.manager); fillInput('f-hireDate', emp.hireDate);
    fillInput('f-contractType', emp.contractType);
  }

  function renderMovements() {
    const tbody = document.getElementById('tab-mov-body');
    const movs = getAllHrMovements().filter(m => m.email === email).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    if (!movs.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Sin movimientos.</td></tr>'; return; }
    tbody.innerHTML = movs.map(m => `<tr>
      <td><span class="badge ${hrMovementTypeClass(m.type)}">${hrMovementTypeLabel(m.type)}</span></td>
      <td style="font-size:13px;">${m.effectiveDate ? new Date(m.effectiveDate+'T00:00:00').toLocaleDateString('es-MX') : '—'}</td>
      <td style="font-size:13px;color:var(--color-graphite);">${hrMovementSummary(m)}</td>
      <td style="font-size:13px;color:var(--color-steel);">${new Date(m.createdAt).toLocaleDateString('es-MX')}</td>
    </tr>`).join('');
  }

  function renderVacaciones() {
    const tbody = document.getElementById('tab-vac-body');
    const reqs = getVacationRequestsForUser(email);
    if (!reqs.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Sin solicitudes.</td></tr>'; return; }
    tbody.innerHTML = reqs.map(r => `<tr>
      <td style="font-size:13px;">${formatDateMX(r.startDate)} – ${formatDateMX(r.endDate)}</td>
      <td style="text-align:center;">${r.days}</td>
      <td><span class="badge ${vacationStatusClass(r.status)}">${vacationStatusLabel(r.status)}</span></td>
      <td style="font-size:13px;color:var(--color-steel);">${new Date(r.createdAt).toLocaleDateString('es-MX')}</td>
    </tr>`).join('');
  }

  function renderIncidencias() {
    const tbody = document.getElementById('tab-inc-body');
    const incs = getIncidentsForUser(email);
    if (!incs.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Sin incidencias.</td></tr>'; return; }
    tbody.innerHTML = incs.map(i => `<tr>
      <td><span class="badge ${incidentTypeClass(i.type)}">${incidentTypeLabel(i.type)}</span></td>
      <td style="font-size:13px;">${i.date ? new Date(i.date+'T00:00:00').toLocaleDateString('es-MX') : '—'}</td>
      <td style="font-size:13px;">${i.duration ? i.duration + ' ' + (i.durationType||'') : '—'}</td>
      <td style="font-size:13px;color:var(--color-graphite);">${i.notes || '—'}</td>
    </tr>`).join('');
  }

  function renderComisiones() {
    const tbody = document.getElementById('tab-com-body');
    const coms = getCommissionsForUser(email);
    if (!coms.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Sin comisiones.</td></tr>'; return; }
    tbody.innerHTML = coms.map(c => `<tr>
      <td style="font-weight:600;font-size:13px;">${c.destination || '—'}</td>
      <td style="font-size:13px;">${c.departureDate ? new Date(c.departureDate+'T00:00:00').toLocaleDateString('es-MX') : '—'} – ${c.returnDate ? new Date(c.returnDate+'T00:00:00').toLocaleDateString('es-MX') : '—'}</td>
      <td><span class="badge ${commissionStatusClass(c.status)}">${commissionStatusLabel(c.status)}</span></td>
      <td style="font-size:13px;color:var(--color-graphite);">${c.purpose || '—'}</td>
    </tr>`).join('');
  }

  function renderAll() {
    const emp = getEmployee();
    renderHeader(emp);
    renderPersonal(emp);
    renderLaboral(emp);
    renderMovements();
    renderVacaciones();
    renderIncidencias();
    renderComisiones();
  }

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // Edición inline por sección
  function enableEditing(sectionEl) { sectionEl.classList.add('profile-editing'); }
  function disableEditing(sectionEl) { sectionEl.classList.remove('profile-editing'); }

  document.querySelectorAll('.profile-section').forEach(section => {
    const saveBtn = section.querySelector('[id$="-personal-btn"],[id$="-laboral-btn"]');
    const cancelBtn = section.querySelector('[id^="cancel-"]');
    if (cancelBtn) cancelBtn.addEventListener('click', () => disableEditing(section));
  });

  document.getElementById('edit-btn').addEventListener('click', () => {
    document.querySelectorAll('.profile-section').forEach(s => enableEditing(s));
  });

  document.getElementById('save-personal-btn').addEventListener('click', () => {
    const emp = getEmployee();
    updateEmployeeProfile(email, {
      ...emp,
      curp: document.getElementById('f-curp').value.trim(),
      nss: document.getElementById('f-nss').value.trim(),
      rfc: document.getElementById('f-rfc').value.trim(),
      birthDate: document.getElementById('f-birthDate').value,
      gender: document.getElementById('f-gender').value,
      phone: document.getElementById('f-phone').value.trim(),
      address: document.getElementById('f-address').value.trim(),
      emergencyContact: {
        name: document.getElementById('f-emergencyName').value.trim(),
        phone: document.getElementById('f-emergencyPhone').value.trim(),
        relationship: document.getElementById('f-emergencyRel').value.trim(),
      },
    });
    document.querySelectorAll('.profile-section').forEach(s => disableEditing(s));
    renderAll();
    showToast('Datos guardados correctamente.');
  });

  document.getElementById('cancel-personal-btn').addEventListener('click', () => {
    document.querySelectorAll('.profile-section').forEach(s => disableEditing(s));
  });

  document.getElementById('save-laboral-btn').addEventListener('click', () => {
    const emp = getEmployee();
    updateEmployeeProfile(email, {
      ...emp,
      position: document.getElementById('f-position').value.trim(),
      area: document.getElementById('f-area').value.trim(),
      manager: document.getElementById('f-manager').value.trim(),
      hireDate: document.getElementById('f-hireDate').value,
      contractType: document.getElementById('f-contractType').value,
    });
    document.querySelectorAll('.profile-section').forEach(s => disableEditing(s));
    renderAll();
    showToast('Datos laborales guardados.');
  });

  document.getElementById('cancel-laboral-btn').addEventListener('click', () => {
    document.querySelectorAll('.profile-section').forEach(s => disableEditing(s));
  });

  renderAll();
  showFlashIfAny();
})();
