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

  // Poblar datalist con correos conocidos
  const emailsDatalist = document.getElementById('known-emails-list');
  getKnownEmails().forEach((email) => {
    const opt = document.createElement('option');
    opt.value = email;
    emailsDatalist.appendChild(opt);
  });

  // Selector de tipo
  let selectedType = null;
  const typeCards = document.querySelectorAll('.hr-type-card');
  const placeholder = document.getElementById('form-placeholder');
  const formActions = document.getElementById('form-actions');
  const formError   = document.getElementById('form-error');

  typeCards.forEach((card) => {
    card.addEventListener('click', () => {
      typeCards.forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedType = card.querySelector('input[type="radio"]').value;

      document.querySelectorAll('.hr-form-section').forEach((s) => s.classList.remove('active'));
      document.getElementById('section-' + selectedType).classList.add('active');
      placeholder.style.display = 'none';
      formActions.style.display = 'flex';
      formError.style.display = 'none';
    });
  });

  // Validación y guardado
  function val(id) { return (document.getElementById(id) || {}).value || ''; }
  function err(msg) { formError.textContent = msg; formError.style.display = 'block'; return false; }

  function buildMovement() {
    formError.style.display = 'none';
    if (!selectedType) return err('Selecciona un tipo de movimiento.');

    const base = { type: selectedType, createdBy: session.email };

    if (selectedType === 'alta') {
      if (!val('alta-name'))     return err('El nombre es obligatorio.');
      if (!val('alta-email'))    return err('El correo es obligatorio.');
      if (!val('alta-position')) return err('El puesto es obligatorio.');
      if (!val('alta-area'))     return err('El área es obligatoria.');
      if (!val('alta-date'))     return err('La fecha de ingreso es obligatoria.');
      if (!val('alta-contract')) return err('El tipo de contrato es obligatorio.');
      const mov = {
        ...base,
        email: val('alta-email').toLowerCase().trim(),
        name: val('alta-name').trim(),
        position: val('alta-position').trim(),
        area: val('alta-area').trim(),
        effectiveDate: val('alta-date'),
        contractType: val('alta-contract'),
        notes: val('alta-notes').trim(),
      };
      // Registrar empleado activo
      upsertEmployee({ email: mov.email, name: mov.name, position: mov.position, area: mov.area, contractType: mov.contractType, active: true });
      return mov;
    }

    if (selectedType === 'baja') {
      if (!val('baja-email'))  return err('El correo del empleado es obligatorio.');
      if (!val('baja-date'))   return err('La fecha efectiva es obligatoria.');
      if (!val('baja-type'))   return err('El tipo de baja es obligatorio.');
      if (!val('baja-reason')) return err('El motivo es obligatorio.');
      const email = val('baja-email').toLowerCase().trim();
      const mov = {
        ...base,
        email,
        name: deriveNameFromEmail(email),
        effectiveDate: val('baja-date'),
        leaveType: val('baja-type'),
        reason: val('baja-reason').trim(),
      };
      // Marcar como inactivo
      setEmployeeInactive(email);
      return mov;
    }

    if (selectedType === 'cambio') {
      if (!val('cambio-email')) return err('El correo del empleado es obligatorio.');
      if (!val('cambio-date'))  return err('La fecha efectiva es obligatoria.');
      if (!val('cambio-type'))  return err('El tipo de cambio es obligatorio.');
      if (!val('cambio-prev'))  return err('El valor anterior es obligatorio.');
      if (!val('cambio-new'))   return err('El valor nuevo es obligatorio.');
      const email = val('cambio-email').toLowerCase().trim();
      return {
        ...base,
        email,
        name: deriveNameFromEmail(email),
        effectiveDate: val('cambio-date'),
        changeType: val('cambio-type'),
        previousValue: val('cambio-prev').trim(),
        newValue: val('cambio-new').trim(),
        notes: val('cambio-notes').trim(),
      };
    }

    if (selectedType === 'promocion') {
      if (!val('promo-email'))         return err('El correo del empleado es obligatorio.');
      if (!val('promo-prev-position')) return err('El puesto anterior es obligatorio.');
      if (!val('promo-new-position'))  return err('El puesto nuevo es obligatorio.');
      if (!val('promo-date'))          return err('La fecha efectiva es obligatoria.');
      const email = val('promo-email').toLowerCase().trim();
      const mov = {
        ...base,
        email,
        name: deriveNameFromEmail(email),
        effectiveDate: val('promo-date'),
        previousPosition: val('promo-prev-position').trim(),
        newPosition: val('promo-new-position').trim(),
        area: val('promo-area').trim(),
        salaryIncrease: val('promo-salary') ? parseFloat(val('promo-salary')) : null,
        notes: val('promo-notes').trim(),
      };
      // Actualizar puesto en registro de empleado
      upsertEmployee({ email, position: mov.newPosition, area: mov.area || undefined });
      return mov;
    }

    return err('Tipo de movimiento no reconocido.');
  }

  document.getElementById('submit-btn').addEventListener('click', () => {
    const mov = buildMovement();
    if (!mov) return;
    addHrMovement(mov);
    sessionStorage.setItem('infonavit_flash', `Movimiento de ${hrMovementTypeLabel(mov.type).toLowerCase()} registrado correctamente.`);
    window.location.href = 'hr-movements.html';
  });
})();
