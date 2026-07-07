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

  const dl = document.getElementById('known-emails-list');
  getKnownEmails().forEach(email => { const o = document.createElement('option'); o.value = email; dl.appendChild(o); });

  const deptInput   = document.getElementById('com-departure');
  const returnInput = document.getElementById('com-return');
  const daysHint    = document.getElementById('com-days-hint');

  function updateDays() {
    if (deptInput.value && returnInput.value) {
      const days = countWorkingDays(deptInput.value, returnInput.value);
      daysHint.textContent = days > 0 ? `${days} día${days!==1?'s':''} hábil${days!==1?'es':''}.` : 'El rango no contiene días hábiles.';
    }
  }
  deptInput.addEventListener('change', updateDays);
  returnInput.addEventListener('change', updateDays);

  const errEl = document.getElementById('com-error');
  function err(msg) { errEl.textContent = msg; errEl.style.display = 'block'; return false; }

  document.getElementById('submit-btn').addEventListener('click', () => {
    errEl.style.display = 'none';
    const email       = document.getElementById('com-email').value.trim().toLowerCase();
    const destination = document.getElementById('com-destination').value.trim();
    const departure   = deptInput.value;
    const ret         = returnInput.value;
    const purpose     = document.getElementById('com-purpose').value.trim();
    if (!email)       return err('El correo del empleado es obligatorio.');
    if (!destination) return err('El destino es obligatorio.');
    if (!departure)   return err('La fecha de salida es obligatoria.');
    if (!ret)         return err('La fecha de regreso es obligatoria.');
    if (ret < departure) return err('La fecha de regreso no puede ser antes de la salida.');
    if (!purpose)     return err('El propósito de la comisión es obligatorio.');

    addCommission({
      email,
      name: deriveNameFromEmail(email),
      destination,
      officeNumber: document.getElementById('com-office').value.trim(),
      departureDate: departure,
      returnDate: ret,
      days: countWorkingDays(departure, ret),
      purpose,
      viaticos: document.getElementById('com-viaticos').value || null,
      status: 'pending',
      rejectionReason: '',
      createdBy: session.email,
    });
    sessionStorage.setItem('infonavit_flash', 'Comisión registrada y enviada para aprobación.');
    window.location.href = 'commissions.html';
  });
})();
