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

  const grid = document.getElementById('employee-grid');
  const emptyMsg = document.getElementById('empty-msg');
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');

  function render() {
    let employees = getAllEmployeeProfiles();
    const q = searchInput.value.trim().toLowerCase();
    if (q) employees = employees.filter(e => (e.name||'').toLowerCase().includes(q) || (e.email||'').toLowerCase().includes(q));
    const st = statusFilter.value;
    if (st === 'active') employees = employees.filter(e => e.active !== false);
    if (st === 'inactive') employees = employees.filter(e => e.active === false);

    if (!employees.length) {
      grid.innerHTML = '';
      emptyMsg.style.display = 'block';
      return;
    }
    emptyMsg.style.display = 'none';
    grid.innerHTML = employees.map(e => {
      const initials = getInitials(e.name || deriveNameFromEmail(e.email));
      const inactive = e.active === false;
      return `<a href="employee-profile.html?email=${encodeURIComponent(e.email)}" class="employee-card${inactive ? ' inactive' : ''}">
        <div class="avatar-lg">${initials}</div>
        <div class="employee-card-info">
          <strong>${e.name || deriveNameFromEmail(e.email)}</strong>
          <span>${e.email}</span>
          <div class="employee-card-meta">${e.position ? e.position + (e.area ? ' · ' + e.area : '') : '<span style="color:var(--color-silver)">Sin puesto registrado</span>'}</div>
        </div>
        <span class="badge ${inactive ? 'badge-inactive' : 'badge-active'}" style="margin-left:auto;flex-shrink:0;">${inactive ? 'Inactivo' : 'Activo'}</span>
      </a>`;
    }).join('');
  }

  document.getElementById('filter-btn').addEventListener('click', render);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') render(); });
  render();
  showFlashIfAny();
})();
