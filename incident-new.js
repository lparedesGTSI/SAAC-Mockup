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

  const errEl = document.getElementById('inc-error');
  function err(msg) { errEl.textContent = msg; errEl.style.display = 'block'; return false; }

  document.getElementById('submit-btn').addEventListener('click', () => {
    errEl.style.display = 'none';
    const email = document.getElementById('inc-email').value.trim().toLowerCase();
    const type  = document.getElementById('inc-type').value;
    const date  = document.getElementById('inc-date').value;
    if (!email) return err('El correo del empleado es obligatorio.');
    if (!type)  return err('Selecciona el tipo de incidencia.');
    if (!date)  return err('La fecha es obligatoria.');

    addIncident({
      email,
      name: deriveNameFromEmail(email),
      type,
      date,
      duration: document.getElementById('inc-duration').value || null,
      durationType: document.getElementById('inc-duration-type').value,
      notes: document.getElementById('inc-notes').value.trim(),
      createdBy: session.email,
    });
    sessionStorage.setItem('infonavit_flash', 'Incidencia registrada correctamente.');
    window.location.href = 'incidents.html';
  });
})();
