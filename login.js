(function () {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');

  const existing = getSession();
  if (existing) {
    window.location.href = 'dashboard.html';
    return;
  }

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();

    let valid = true;
    if (!email || !EMAIL_PATTERN.test(email)) {
      emailError.textContent = !email
        ? 'Ingresa tu correo institucional de Infonavit.'
        : 'Ingresa un correo electrónico válido.';
      emailError.classList.add('show');
      valid = false;
    } else {
      emailError.classList.remove('show');
    }

    if (!password) {
      passwordError.classList.add('show');
      valid = false;
    } else {
      passwordError.classList.remove('show');
    }

    if (!valid) return;

    setSession({
      email,
      name: deriveNameFromEmail(email),
      // Placeholder until the backend/LDAP integration returns the real role.
      // For now, any email containing "admin" gets administrator access.
      role: email.includes('admin') ? 'admin' : 'employee',
      loginAt: new Date().toISOString(),
    });

    window.location.href = 'dashboard.html';
  });

  emailInput.addEventListener('input', () => emailError.classList.remove('show'));
  passwordInput.addEventListener('input', () => passwordError.classList.remove('show'));

  const togglePasswordBtn = document.getElementById('toggle-password');
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      togglePasswordBtn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  }
})();
