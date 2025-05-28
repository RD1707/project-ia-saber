document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTabs = document.querySelectorAll('.login-tab');

    loginTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelector('.login-tab.active').classList.remove('active');
            document.querySelector('.login-form.active').classList.remove('active');
            
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
        });
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = '/chat.html';
        } else {
            alert(data.error || 'Erro ao fazer login');
        }
    });

    function showLoader() {
        document.getElementById('loader').style.display = 'block';
      }
      
      function hideLoader() {
        document.getElementById('loader').style.display = 'none';
      }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;
        
        if (password !== confirm) {
            alert('As senhas não coincidem');
            return;
        }
        
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await res.json();
        if (res.status === 201) {
            alert('Conta criada com sucesso! Faça login');
            document.querySelector('[data-tab="login"]').click();
        } else {
            alert(data.error || 'Erro ao registrar');
        }
    });
});