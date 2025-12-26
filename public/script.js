window.addEventListener('load', function () {
    setTimeout(function () {
        var splash = document.getElementById('splash');
        var welcome = document.getElementById('welcome');
        if (splash && welcome) {
            splash.style.display = 'none';
            welcome.style.display = 'flex';
            document.body.classList.add('welcome-active');
        }
    }, 2000);
});


var welcomeScreen    = document.getElementById('welcome');
var registerScreen   = document.getElementById('registerScreen');
var parentInfoScreen = document.getElementById('parentInfoScreen');
var dancerInfoScreen = document.getElementById('dancerInfoScreen');
var loginScreen      = document.getElementById('loginScreen');
var mainScreen = document.getElementById('mainScreen');
var chatList = document.getElementById('chatList');
var currentUser = null;

function addChatItem(chat) {
    if (!chatList) return;

    var item = document.createElement('div');
    item.className = 'chat-item';

    var avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'chat-avatar';

    if (chat.avatar) {
        var img = document.createElement('img');
        img.src = chat.avatar;
        img.alt = chat.title;
        avatarWrapper.appendChild(img);
    }

    var body = document.createElement('div');
    body.className = 'chat-body';

    var title = document.createElement('div');
    title.className = 'chat-title';
    title.textContent = chat.title;

    var subtitle = document.createElement('div');
    subtitle.className = 'chat-subtitle';
    subtitle.textContent = chat.subtitle || '';

    body.appendChild(title);
    body.appendChild(subtitle);

    item.appendChild(avatarWrapper);
    item.appendChild(body);

    chatList.appendChild(item);
}

async function openMainScreen(user) {
    currentUser = user;

    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (registerScreen) registerScreen.style.display = 'none';
    if (parentInfoScreen) parentInfoScreen.style.display = 'none';
    if (dancerInfoScreen) dancerInfoScreen.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'none';

    if (mainScreen) mainScreen.style.display = 'flex';

    if (!user || !user.login || !chatList) return;

    chatList.innerHTML = '';

    try {
        var resp = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: user.login })
        });
        var data = await resp.json();

        if (!resp.ok) {
            alert(data.error || 'Ошибка загрузки чатов');
            return;
        }

        (data.chats || []).forEach(function (chat) {
            addChatItem(chat);
        });
    } catch (e) {
        alert('Сетевая ошибка при загрузке чатов');
    }
}

var registrationBaseData = {
    login: null,
    password: null,
    role: null
};

var registerBtn = document.getElementById('registerBtn');
if (registerBtn && welcomeScreen && registerScreen) {
    registerBtn.addEventListener('click', function () {
        welcomeScreen.style.display = 'none';
        registerScreen.style.display = 'block';
    });
}

var loginBtn = document.getElementById('loginBtn');
if (loginBtn && welcomeScreen && loginScreen) {
    loginBtn.addEventListener('click', function () {
        welcomeScreen.style.display = 'none';
        loginScreen.style.display = 'block';
    });
}

var backBtn = document.getElementById('backToWelcome');
if (backBtn && welcomeScreen && registerScreen) {
    backBtn.addEventListener('click', function () {
        registerScreen.style.display = 'none';
        welcomeScreen.style.display = 'flex';
    });
}

var backToWelcomeFromLoginBtn = document.getElementById('backToWelcomeFromLogin');
if (backToWelcomeFromLoginBtn && welcomeScreen && loginScreen) {
    backToWelcomeFromLoginBtn.addEventListener('click', function () {
        loginScreen.style.display = 'none';
        welcomeScreen.style.display = 'flex';
    });
}

var loginInput = document.getElementById('loginInput');
if (loginInput) {
    loginInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^\x20-\x7E]/g, '').slice(0, 20);
    });
}

var passwordInput = document.getElementById('passwordInput');
if (passwordInput) {
    passwordInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^\x20-\x7E]/g, '').slice(0, 20);
    });
}

var togglePasswordBtn = document.querySelector('.toggle-password');
if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', function () {
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
    });
}

var roleSelect = document.getElementById('roleSelect');
var roleText   = document.getElementById('roleText');
var roleValue  = document.getElementById('roleValue');

if (roleSelect && roleText && roleValue) {
    roleSelect.addEventListener('click', function (e) {
        if (e.target.classList.contains('select-option')) {
            var value = e.target.getAttribute('data-value');
            var text  = e.target.textContent;
            roleText.textContent = text;
            roleValue.value = value;
            roleSelect.classList.remove('open');
        } else {
            roleSelect.classList.toggle('open');
        }
    });

    document.addEventListener('click', function (e) {
        if (!roleSelect.contains(e.target)) {
            roleSelect.classList.remove('open');
        }
    });
}

var registerForm = document.querySelector('.register-form');
var continueBtn  = registerForm ? registerForm.querySelector('.btn-primary') : null;

if (continueBtn && loginInput && passwordInput && roleValue && registerScreen) {
    continueBtn.addEventListener('click', async function () {
        var login    = loginInput.value.trim();
        var password = passwordInput.value;
        var role     = roleValue.value;

        if (!login || !password || !role) {
            alert('Заполните логин, пароль и выберите роль');
            return;
        }

        try {
            var resp = await fetch('/api/check-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: login })
            });
            var data = await resp.json();

            if (!resp.ok) {
                alert(data.error || 'Ошибка проверки логина');
                return; // не переходим дальше
            }
        } catch (e) {
            alert('Сетевая ошибка при проверке логина');
            return;
        }

        
        registrationBaseData.login    = login;
        registrationBaseData.password = password;
        registrationBaseData.role     = role;

        if (role === 'parent' && parentInfoScreen) {
            registerScreen.style.display = 'none';
            parentInfoScreen.style.display = 'block';
            if (dancerInfoScreen) dancerInfoScreen.style.display = 'none';
            return;
        }

        if (role === 'dancer' && dancerInfoScreen) {
            registerScreen.style.display = 'none';
            dancerInfoScreen.style.display = 'block';
            if (parentInfoScreen) parentInfoScreen.style.display = 'none';
            return;
        }
    });
}

var backToRegisterBtn = document.getElementById('backToRegister');
if (backToRegisterBtn && registerScreen && parentInfoScreen) {
    backToRegisterBtn.addEventListener('click', function () {
        parentInfoScreen.style.display = 'none';
        registerScreen.style.display   = 'block';
    });
}

var backToRegisterFromDancerBtn = document.getElementById('backToRegisterFromDancer');
if (backToRegisterFromDancerBtn && registerScreen && dancerInfoScreen) {
    backToRegisterFromDancerBtn.addEventListener('click', function () {
        dancerInfoScreen.style.display = 'none';
        registerScreen.style.display   = 'block';
    });
}

function allowOnlyCyrillic(value) {
    return value.replace(/[^А-Яа-яЁё]/g, '').slice(0, 30);
}

var parentFirstNameInput = document.getElementById('parentFirstName');
var parentLastNameInput  = document.getElementById('parentLastName');

if (parentFirstNameInput) {
    parentFirstNameInput.addEventListener('input', function () {
        this.value = allowOnlyCyrillic(this.value);
    });
}

if (parentLastNameInput) {
    parentLastNameInput.addEventListener('input', function () {
        this.value = allowOnlyCyrillic(this.value);
    });
}

var teamSelect = document.getElementById('teamSelect');
var teamText   = document.getElementById('teamText');
var teamValue  = document.getElementById('teamValue');

if (teamSelect && teamText && teamValue) {
    teamSelect.addEventListener('click', function (e) {
        if (e.target.classList.contains('select-option')) {
            var value = e.target.getAttribute('data-value');
            var text  = e.target.textContent;
            teamText.textContent = text;
            teamValue.value = value;
            teamSelect.classList.remove('open');
        } else {
            teamSelect.classList.toggle('open');
        }
    });

    document.addEventListener('click', function (e) {
        if (!teamSelect.contains(e.target)) {
            teamSelect.classList.remove('open');
        }
    });
}

var parentContinueBtn = document.getElementById('parentContinueBtn');
if (parentContinueBtn && parentFirstNameInput && parentLastNameInput && teamValue) {
    parentContinueBtn.addEventListener('click', async function () {
        var firstName = parentFirstNameInput.value.trim();
        var lastName  = parentLastNameInput.value.trim();
        var team      = teamValue.value;

        if (!firstName || !lastName || !team) {
            alert('Заполните имя, фамилию и выберите команду');
            return;
        }

        if (!registrationBaseData.login || !registrationBaseData.password || registrationBaseData.role !== 'parent') {
            alert('Ошибка данных регистрации. Вернитесь назад.');
            return;
        }

        try {
            var response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login:    registrationBaseData.login,
                    password: registrationBaseData.password,
                    role:     registrationBaseData.role,
                    firstName: firstName,
                    lastName:  lastName,
                    team:      team,
                    dob:       null
                })
            });

            var data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Ошибка регистрации');
                return;
            }

            openMainScreen({
                login: registrationBaseData.login,
                role: registrationBaseData.role,
                team: team
                });
        } catch (e) {
            alert('Сетевая ошибка');
        }
    });
}

var dancerFirstNameInput = document.getElementById('dancerFirstName');
var dancerLastNameInput  = document.getElementById('dancerLastName');

if (dancerFirstNameInput) {
    dancerFirstNameInput.addEventListener('input', function () {
        this.value = allowOnlyCyrillic(this.value);
    });
}

if (dancerLastNameInput) {
    dancerLastNameInput.addEventListener('input', function () {
        this.value = allowOnlyCyrillic(this.value);
    });
}


var dancerTeamSelect = document.getElementById('dancerTeamSelect');
var dancerTeamText   = document.getElementById('dancerTeamText');
var dancerTeamValue  = document.getElementById('dancerTeamValue');

if (dancerTeamSelect && dancerTeamText && dancerTeamValue) {
    dancerTeamSelect.addEventListener('click', function (e) {
        if (e.target.classList.contains('select-option')) {
            var value = e.target.getAttribute('data-value');
            var text  = e.target.textContent;
            dancerTeamText.textContent = text;
            dancerTeamValue.value = value;
            dancerTeamSelect.classList.remove('open');
        } else {
            dancerTeamSelect.classList.toggle('open');
        }
    });

    document.addEventListener('click', function (e) {
        if (!dancerTeamSelect.contains(e.target)) {
            dancerTeamSelect.classList.remove('open');
        }
    });
}

var dancerDobField = document.getElementById('dancerDobField');
var dancerDobInput = document.getElementById('dancerDobInput');
var dancerDobText  = document.getElementById('dancerDobText');
var dancerDobBtn   = document.getElementById('dancerDobBtn');

if (dancerDobField && dancerDobInput && dancerDobText && dancerDobBtn) {
    function openDobPicker() {
        if (dancerDobInput.showPicker) {
            dancerDobInput.showPicker();
        } else {
            dancerDobInput.focus();
        }
    }

    dancerDobField.addEventListener('click', function (e) {
        if (e.target === dancerDobBtn) return;
        openDobPicker();
    });

    dancerDobBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDobPicker();
    });

    dancerDobInput.addEventListener('change', function () {
        if (this.value) {
            var parts = this.value.split('-');
            dancerDobText.textContent = parts[2] + '.' + parts[1] + '.' + parts[0];
            dancerDobText.style.color = '#FFFFFF';
        } else {
            dancerDobText.textContent = 'Выберите';
            dancerDobText.style.color = 'rgba(255, 255, 255, 0.4)';
        }
    });
}

var dancerContinueBtn = document.getElementById('dancerContinueBtn');
if (dancerContinueBtn && dancerFirstNameInput && dancerLastNameInput && dancerTeamValue && dancerDobInput) {
    dancerContinueBtn.addEventListener('click', async function () {
        var firstName = dancerFirstNameInput.value.trim();
        var lastName  = dancerLastNameInput.value.trim();
        var team      = dancerTeamValue.value;
        var dob       = dancerDobInput.value;

        if (!firstName || !lastName || !team || !dob) {
            alert('Заполните имя, фамилию, выберите команду и дату рождения');
            return;
        }

        if (!registrationBaseData.login || !registrationBaseData.password || registrationBaseData.role !== 'dancer') {
            alert('Ошибка данных регистрации. Вернитесь назад.');
            return;
        }

        try {
            var response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login:    registrationBaseData.login,
                    password: registrationBaseData.password,
                    role:     registrationBaseData.role,
                    firstName: firstName,
                    lastName:  lastName,
                    team:      team,
                    dob:       dob
                })
            });

            var data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Ошибка регистрации');
                return;
            }

            openMainScreen({
                login: registrationBaseData.login,
                role: registrationBaseData.role,
                team: team
            });
        } catch (e) {
            alert('Сетевая ошибка');
        }
    });
}

var loginScreenLogin    = document.getElementById('loginScreenLogin');
var loginScreenPassword = document.getElementById('loginScreenPassword');
var loginContinueBtn    = document.getElementById('loginContinueBtn');

if (loginScreenLogin) {
    loginScreenLogin.addEventListener('input', function () {
        this.value = this.value.replace(/[^\x20-\x7E]/g, '').slice(0, 20);
    });
}

if (loginScreenPassword) {
    loginScreenPassword.addEventListener('input', function () {
        this.value = this.value.replace(/[^\x20-\x7E]/g, '').slice(0, 20);
    });
}

if (loginContinueBtn && loginScreenLogin && loginScreenPassword) {
    loginContinueBtn.addEventListener('click', async function () {
        var login    = loginScreenLogin.value.trim();
        var password = loginScreenPassword.value;

        if (!login || !password) {
            alert('Введите логин и пароль');
            return;
        }

        try {
            var resp = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: login, password: password })
            });
            var data = await resp.json();

            if (!resp.ok) {
                alert(data.error || 'Ошибка входа');
                return;
            }

            openMainScreen({
                login: login,
                role: data.role,
                team: data.team
            });
        } catch (e) {
            alert('Сетевая ошибка');
        }
    });
}