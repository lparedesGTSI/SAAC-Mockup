(function () {
  const session = getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  applyNavVisibility(session);

  document.getElementById('user-initials').textContent = getInitials(session.name);
  document.getElementById('user-name').textContent = session.name;
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession(); window.location.href = 'index.html';
  });

  // Si es admin, mostrar también enlace a aprobaciones en el dropdown
  if (isAdmin(session)) {
    const dropdown = document.querySelector('.topnav-modules-dropdown');
    const approvalLink = document.createElement('a');
    approvalLink.href = 'vacation-approvals.html';
    approvalLink.setAttribute('role', 'menuitem');
    approvalLink.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      Aprobaciones
    `;
    dropdown.appendChild(approvalLink);
  }

  /* ---- Calendario ---- */
  let calYear, calMonth;
  const today = new Date();
  calYear = today.getFullYear();
  calMonth = today.getMonth();

  const calGrid = document.getElementById('cal-grid');
  const calLabel = document.getElementById('cal-month-label');
  const calTodayLabel = document.getElementById('cal-today-label');
  const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  function getVacationDayMap() {
    const map = {};
    getVacationRequestsForUser(session.email).forEach((req) => {
      if (req.status === 'rejected') return;
      const cur = new Date(req.startDate + 'T00:00:00');
      const end = new Date(req.endDate + 'T00:00:00');
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10);
        map[key] = req.status;
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }

  function makeDay(num, cls) {
    const el = document.createElement('div');
    el.className = cls;
    const numEl = document.createElement('span');
    numEl.className = 'day-num';
    numEl.textContent = num;
    const dot = document.createElement('span');
    dot.className = 'day-dot';
    el.appendChild(numEl);
    el.appendChild(dot);
    return el;
  }

  function renderCalendar() {
    const vacMap = getVacationDayMap();
    calLabel.textContent = new Date(calYear, calMonth, 1)
      .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    calTodayLabel.textContent = today.toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    calGrid.innerHTML = '';
    DAY_NAMES.forEach((d) => {
      const el = document.createElement('div');
      el.className = 'vac-cal-header';
      el.textContent = d;
      calGrid.appendChild(el);
    });

    const firstDay = new Date(calYear, calMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
      calGrid.appendChild(makeDay(prevMonthDays - startOffset + 1 + i, 'vac-cal-day other-month'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(calYear, calMonth, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday =
        d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
      const vacStatus = vacMap[dateStr];

      let cls = 'vac-cal-day';
      if (vacStatus === 'approved') cls += ' vac-approved';
      else if (vacStatus === 'approved_manager') cls += ' vac-approved-manager';
      else if (vacStatus === 'pending') cls += ' vac-pending';
      else if (isWeekend) cls += ' weekend';
      if (isToday) cls += ' today';

      const dayEl = makeDay(d, cls);
      if (!isWeekend) {
        dayEl.classList.add('clickable');
        dayEl.dataset.date = dateStr;
        dayEl.addEventListener('click', () => openModalWithDate(dateStr));
      }
      calGrid.appendChild(dayEl);
    }

    const totalCells = startOffset + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      calGrid.appendChild(makeDay(i, 'vac-cal-day other-month'));
    }
  }

  document.getElementById('cal-prev').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });

  /* ---- Tabla de solicitudes ---- */
  function renderRequests() {
    const tbody = document.getElementById('requests-body');
    const requests = getVacationRequestsForUser(session.email);

    if (!requests.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No tienes solicitudes de vacaciones.</td></tr>';
      return;
    }

    tbody.innerHTML = requests.map((r) => `
      <tr>
        <td>${formatDateMX(r.startDate)} — ${formatDateMX(r.endDate)}</td>
        <td style="text-align:center;">${r.days}</td>
        <td>${r.reason || '<span style="color:var(--color-silver)">—</span>'}</td>
        <td><span class="badge ${vacationStatusClass(r.status)}">${vacationStatusLabel(r.status)}</span></td>
        <td style="color:var(--color-steel);font-size:14px;">
          ${new Date(r.createdAt).toLocaleDateString('es-MX')}
        </td>
      </tr>
    `).join('');
  }

  /* ---- Estadísticas ---- */
  function renderStats() {
    const stats = computeVacationStats(session.email);
    document.getElementById('stat-available').textContent = stats.available;
    document.getElementById('stat-taken').textContent = stats.taken;
    document.getElementById('stat-pending').textContent = stats.pending;
  }

  function renderAll() {
    renderStats();
    renderCalendar();
    renderRequests();
  }

  /* ---- Modal nueva solicitud ---- */
  const modal = document.getElementById('new-request-modal');
  const startInput = document.getElementById('vac-start');
  const endInput = document.getElementById('vac-end');
  const daysHint = document.getElementById('vac-days-hint');
  const formError = document.getElementById('vac-form-error');

  function openModal(prefillStart) {
    startInput.value = prefillStart || '';
    endInput.value = '';
    document.getElementById('vac-reason').value = '';
    formError.style.display = 'none';
    if (prefillStart) {
      daysHint.textContent = 'Selecciona la fecha de fin para calcular los días hábiles.';
      endInput.focus();
    } else {
      daysHint.textContent = 'Selecciona las fechas para calcular los días hábiles.';
    }
    modal.removeAttribute('hidden');
  }
  function openModalWithDate(dateStr) { openModal(dateStr); }
  function closeModal() { modal.setAttribute('hidden', ''); }

  document.getElementById('new-request-btn').addEventListener('click', () => openModal());
  document.getElementById('new-request-close').addEventListener('click', closeModal);
  document.getElementById('new-request-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  function updateDaysHint() {
    if (startInput.value && endInput.value) {
      const days = countWorkingDays(startInput.value, endInput.value);
      daysHint.textContent = days > 0
        ? `${days} día${days !== 1 ? 's' : ''} hábil${days !== 1 ? 'es' : ''}.`
        : 'El rango no contiene días hábiles.';
    }
  }
  startInput.addEventListener('change', updateDaysHint);
  endInput.addEventListener('change', updateDaysHint);

  document.getElementById('new-request-submit').addEventListener('click', () => {
    formError.style.display = 'none';
    const start = startInput.value;
    const end = endInput.value;
    const reason = document.getElementById('vac-reason').value.trim();

    if (!start || !end) {
      formError.textContent = 'Debes seleccionar fecha de inicio y fin.';
      formError.style.display = 'block';
      return;
    }
    if (end < start) {
      formError.textContent = 'La fecha de fin no puede ser anterior al inicio.';
      formError.style.display = 'block';
      return;
    }
    const days = countWorkingDays(start, end);
    if (days === 0) {
      formError.textContent = 'El rango seleccionado no contiene días hábiles.';
      formError.style.display = 'block';
      return;
    }
    const stats = computeVacationStats(session.email);
    if (days > stats.available) {
      formError.textContent = `No tienes suficientes días disponibles (disponibles: ${stats.available}, solicitados: ${days}).`;
      formError.style.display = 'block';
      return;
    }

    addVacationRequest(session.email, session.name, start, end, reason);
    closeModal();
    renderAll();
    showToast('Solicitud enviada correctamente.', 'default');
  });

  renderAll();
  showFlashIfAny();
})();
