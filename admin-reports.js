(function () {
  const session = getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
  if (!isAdmin(session)) {
    sessionStorage.setItem('infonavit_flash', 'No tienes permisos de administrador para ver esta página.');
    window.location.href = 'dashboard.html';
    return;
  }
  applyNavVisibility(session);

  document.getElementById('user-initials').textContent = getInitials(session.name);
  document.getElementById('user-name').textContent = session.name;

  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });

  const searchInput = document.getElementById('search-input');
  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');
  const filterBtn = document.getElementById('filter-btn');
  const exportBtn = document.getElementById('export-btn');
  const reportBody = document.getElementById('report-body');

  const detailModal = document.getElementById('detail-modal');
  const detailModalTitle = document.getElementById('detail-modal-title');
  const detailModalClose = document.getElementById('detail-modal-close');
  const detailSections = document.getElementById('detail-sections');

  const mapModal = document.getElementById('map-modal');
  const mapModalClose = document.getElementById('map-modal-close');
  const mapFrameIframe = document.getElementById('map-frame-iframe');
  const mapCoords = document.getElementById('map-coords');

  let currentGroups = [];

  function getFilteredGroups() {
    let records = getAllRecords().filter((r) => isEmployeeActive(r.email));
    if (dateFrom.value) {
      const from = new Date(dateFrom.value + 'T00:00:00');
      records = records.filter((r) => new Date(r.timestamp) >= from);
    }
    if (dateTo.value) {
      const to = new Date(dateTo.value + 'T23:59:59');
      records = records.filter((r) => new Date(r.timestamp) <= to);
    }

    let groups = groupRecordsByDay(records);

    const query = searchInput.value.trim().toLowerCase();
    if (query) {
      groups = groups.filter(
        (g) => g.email.toLowerCase().includes(query) || deriveNameFromEmail(g.email).toLowerCase().includes(query)
      );
    }

    return groups;
  }

  function renderDetailSection(label, record) {
    if (!record) {
      return `<div class="detail-subsection"><h4>${label}</h4><p class="empty-note">Sin registro</p></div>`;
    }
    const photoHtml = record.photo
      ? `<img class="detail-photo" src="${record.photo}" alt="Foto de ${label.toLowerCase()}">`
      : '';
    const locationHtml = record.location
      ? `<button type="button" class="link-btn" data-lat="${record.location.lat}" data-lng="${record.location.lng}">Ver</button>`
      : 'No disponible';
    return `
      <div class="detail-subsection">
        <h4>${label} · ${formatTimeShort(new Date(record.timestamp))}</h4>
        ${photoHtml}
        <div class="meta-list">
          <div class="meta-row"><span class="meta-label">Ubicación</span><span class="meta-value">${locationHtml}</span></div>
          <div class="meta-row"><span class="meta-label">Dispositivo</span><span class="meta-value">${record.device || 'No disponible'}</span></div>
          <div class="meta-row"><span class="meta-label">Dirección IP</span><span class="meta-value">${record.ip || 'No disponible'}</span></div>
        </div>
      </div>`;
  }

  function openDetailModal(group) {
    detailModalTitle.textContent = `${deriveNameFromEmail(group.email)} · ${formatDateShort(group.dateObj)}`;
    detailSections.innerHTML =
      renderDetailSection('Entrada', group.entrada) + renderDetailSection('Salida', group.salida);
    detailModal.hidden = false;
  }

  function closeDetailModal() {
    detailModal.hidden = true;
  }

  detailModalClose.addEventListener('click', closeDetailModal);
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
  });

  detailSections.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lat]');
    if (!btn) return;
    openMapModal({ lat: Number(btn.getAttribute('data-lat')), lng: Number(btn.getAttribute('data-lng')) });
  });

  function openMapModal(location) {
    mapFrameIframe.src = buildMapEmbedUrl(location);
    mapCoords.textContent = formatLocation(location);
    mapModal.hidden = false;
  }

  function closeMapModal() {
    mapModal.hidden = true;
    mapFrameIframe.src = '';
  }

  mapModalClose.addEventListener('click', closeMapModal);
  mapModal.addEventListener('click', (e) => {
    if (e.target === mapModal) closeMapModal();
  });

  function render() {
    currentGroups = getFilteredGroups();

    if (currentGroups.length === 0) {
      reportBody.innerHTML = '<tr class="empty-row"><td colspan="6">No hay registros en el rango seleccionado.</td></tr>';
      return;
    }

    reportBody.innerHTML = currentGroups
      .map((g, index) => {
        const entradaTime = g.entrada ? formatTimeShort(new Date(g.entrada.timestamp)) : '--';
        const salidaTime = g.salida ? formatTimeShort(new Date(g.salida.timestamp)) : '--';
        const hours = computeWorkedHoursLabel(g.entrada, g.salida);
        return `<tr>
          <td class="employee-cell">
            <span class="employee-name">${deriveNameFromEmail(g.email)}</span>
            <span class="employee-email">${g.email}</span>
          </td>
          <td>${formatDateShort(g.dateObj)}</td>
          <td>${entradaTime}</td>
          <td>${salidaTime}</td>
          <td>${hours}</td>
          <td><button type="button" class="link-btn" data-group-index="${index}">Ver detalle</button></td>
        </tr>`;
      })
      .join('');
  }

  reportBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-group-index]');
    if (!btn) return;
    const group = currentGroups[Number(btn.getAttribute('data-group-index'))];
    if (group) openDetailModal(group);
  });

  filterBtn.addEventListener('click', render);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') render();
  });

  exportBtn.addEventListener('click', () => {
    const rows = currentGroups.map((g) => ({
      Empleado: deriveNameFromEmail(g.email),
      Correo: g.email,
      Fecha: formatDateShort(g.dateObj),
      Entrada: g.entrada ? formatTimeShort(new Date(g.entrada.timestamp)) : '--',
      Salida: g.salida ? formatTimeShort(new Date(g.salida.timestamp)) : '--',
      'Horas trabajadas': computeWorkedHoursLabel(g.entrada, g.salida),
      'Dispositivo entrada': g.entrada && g.entrada.device ? g.entrada.device : '--',
      'IP entrada': g.entrada && g.entrada.ip ? g.entrada.ip : '--',
      'Dispositivo salida': g.salida && g.salida.device ? g.salida.device : '--',
      'IP salida': g.salida && g.salida.ip ? g.salida.ip : '--',
    }));
    exportRowsToExcel(rows, 'reporte_administracion.xlsx', 'Asistencia');
  });

  render();
})();
