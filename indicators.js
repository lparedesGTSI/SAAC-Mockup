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

  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');
  const filterBtn = document.getElementById('filter-btn');

  const kpiEmployees = document.getElementById('kpi-employees');
  const kpiRecords = document.getElementById('kpi-records');
  const kpiAvgHours = document.getElementById('kpi-avg-hours');
  const kpiToday = document.getElementById('kpi-today');

  const RED = '#E3001B';
  const RED_SOFT = 'rgba(227, 0, 27, 0.15)';
  const NAVY = '#1f243c';
  const PALETTE = ['#E3001B', '#1f243c', '#707070', '#b7b7b7'];

  let attendanceChart = null;
  let devicesChart = null;
  let hoursChart = null;

  function getFilteredRecords() {
    let records = getAllRecords().filter((r) => isEmployeeActive(r.email));
    if (dateFrom.value) {
      const from = new Date(dateFrom.value + 'T00:00:00');
      records = records.filter((r) => new Date(r.timestamp) >= from);
    }
    if (dateTo.value) {
      const to = new Date(dateTo.value + 'T23:59:59');
      records = records.filter((r) => new Date(r.timestamp) <= to);
    }
    return records;
  }

  function formatShortDate(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
  }

  function render() {
    const records = getFilteredRecords();
    const indicators = computeIndicators(records);

    kpiEmployees.textContent = indicators.totalEmployees;
    kpiRecords.textContent = indicators.totalRecords;
    kpiAvgHours.textContent = indicators.avgHoursLabel;
    kpiToday.textContent = indicators.todayCheckedIn;

    const attendanceLabels = indicators.sortedDateKeys.map(formatShortDate);
    const attendanceData = indicators.sortedDateKeys.map((key) => indicators.byDateMap.get(key));

    if (attendanceChart) attendanceChart.destroy();
    attendanceChart = new Chart(document.getElementById('chart-attendance'), {
      type: 'line',
      data: {
        labels: attendanceLabels,
        datasets: [
          {
            label: 'Empleados con entrada',
            data: attendanceData,
            borderColor: RED,
            backgroundColor: RED_SOFT,
            fill: true,
            tension: 0.3,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });

    const deviceLabels = Object.keys(indicators.deviceCounts);
    const deviceData = deviceLabels.map((k) => indicators.deviceCounts[k]);

    if (devicesChart) devicesChart.destroy();
    devicesChart = new Chart(document.getElementById('chart-devices'), {
      type: 'doughnut',
      data: {
        labels: deviceLabels,
        datasets: [{ data: deviceData, backgroundColor: PALETTE }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } },
      },
    });

    const hoursLabels = indicators.avgHoursByEmployee.map((e) => deriveNameFromEmail(e.email));
    const hoursData = indicators.avgHoursByEmployee.map((e) => Number(e.avgHoursDecimal.toFixed(2)));

    if (hoursChart) hoursChart.destroy();
    hoursChart = new Chart(document.getElementById('chart-hours'), {
      type: 'bar',
      data: {
        labels: hoursLabels,
        datasets: [
          {
            label: 'Horas promedio',
            data: hoursData,
            backgroundColor: NAVY,
            borderRadius: 6,
            maxBarThickness: 40,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  filterBtn.addEventListener('click', render);

  render();
  showFlashIfAny();
})();
