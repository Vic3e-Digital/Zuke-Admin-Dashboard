document.addEventListener('DOMContentLoaded', async function () {
  await authManager.redirectIfAuthenticated();

  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const passwordToggle = document.getElementById('passwordToggle');
  const submitButton = document.getElementById('submitButton');
  const errorMessage = document.getElementById('errorMessage');

  passwordToggle.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    const eyeIcon = passwordToggle.querySelector('.eye-icon');
    eyeIcon.innerHTML = type === 'text'
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Please fill in all fields');
      return;
    }

    setLoading(true);
    hideError();

    try {
      const result = await authManager.login(email, password);

      if (result.success) {
        window.location.href = '/dashboard.html';
      } else {
        showError(result.error || 'Login failed');
      }
    } catch {
      showError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  });

  function setLoading(loading) {
    submitButton.disabled = loading;
    submitButton.innerHTML = loading
      ? 'Signing in...'
      : `<svg class="login-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10,17 15,12 10,7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg> Sign In`;
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }

  function hideError() {
    errorMessage.style.display = 'none';
  }
});
