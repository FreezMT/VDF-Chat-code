console.log('app.js loaded');

window.addEventListener('load', function () {
    setTimeout(function () {
        var splash  = document.getElementById('splash');
        var welcome = document.getElementById('welcome');

        if (splash)  splash.style.display  = 'none';
        if (welcome) welcome.style.display = 'flex';

        document.body.classList.add('welcome-active');
    }, 2000);
});

// ЭКРАНЫ
var welcomeScreen      = document.getElementById('welcome');
var registerScreen     = document.getElementById('registerScreen');
var parentInfoScreen   = document.getElementById('parentInfoScreen');
var dancerInfoScreen   = document.getElementById('dancerInfoScreen');
var loginScreen        = document.getElementById('loginScreen');
var mainScreen         = document.getElementById('mainScreen');
var chatScreen         = document.getElementById('chatScreen');
var profileScreen      = document.getElementById('profileScreen');
var createGroupScreen  = document.getElementById('createGroupScreen');
var bottomNav          = document.getElementById('bottomNav');

// ЧАТ
var chatList           = document.getElementById('chatList');
var chatHeaderTitle    = document.getElementById('chatHeaderTitle');
var chatHeaderAvatar   = document.getElementById('chatHeaderAvatar');
var chatContent        = document.querySelector('.chat-content');
var chatInputForm      = document.getElementById('chatInputForm');
var chatInput          = document.getElementById('chatInput');

// ПАНЕЛЬ ОТВЕТА
var replyBar        = document.getElementById('replyBar');
var replySenderEl   = document.getElementById('replySender');
var replyTextEl     = document.getElementById('replyText');
var replyCancelBtn  = document.getElementById('replyCancelBtn');

// НАВИГАЦИЯ
var navAddBtn          = document.getElementById('navAddBtn');
var navHomeBtn         = document.getElementById('navHomeBtn');
var navProfileBtn      = document.getElementById('navProfileBtn');
var navAddIcon         = document.getElementById('navAddIcon');
var navHomeIcon        = document.getElementById('navHomeIcon');
var navProfileIcon     = document.getElementById('navProfileIcon');

// ПРОФИЛЬ
var profileAvatar      = document.getElementById('profileAvatar');
var changePhotoBtn     = document.getElementById('changePhotoBtn');
var profilePhotoInput  = document.getElementById('profilePhotoInput');
var profileNameEl      = document.getElementById('profileName');
var profileIdEl        = document.getElementById('profileId');
var profileTeamEl      = document.getElementById('profileTeam');
var profileDobEl       = document.getElementById('profileDob');

// МОДАЛКА ПОЛЬЗОВАТЕЛЯ
var chatUserModal      = document.getElementById('chatUserModal');
var chatUserAvatar     = document.getElementById('chatUserAvatar');
var chatUserName       = document.getElementById('chatUserName');
var chatUserId         = document.getElementById('chatUserId');
var chatUserTeam       = document.getElementById('chatUserTeam');
var chatUserDob        = document.getElementById('chatUserDob');
var chatUserBackdrop   = document.querySelector('.chat-user-modal-backdrop');
var chatUserWriteBtn   = document.getElementById('chatUserWriteBtn'); // "Написать"
var chatUserBackBtn    = document.getElementById('chatUserBackBtn');  // "Назад"

// МОДАЛКА ГРУППЫ
var groupModal         = document.getElementById('groupModal');
var groupModalBackdrop = document.querySelector('.group-modal-backdrop');
var groupAvatar        = document.getElementById('groupAvatar');
var groupNameTitle     = document.getElementById('groupNameTitle');
var groupMembersCount  = document.getElementById('groupMembersCount');
var groupMembersList   = document.getElementById('groupMembersList');
var groupAddMemberBtn  = document.getElementById('groupAddMemberBtn');
var editGroupAvatarBtn = document.getElementById('editGroupAvatarBtn');
var editGroupNameBtn   = document.getElementById('editGroupNameBtn');
var groupAvatarInput   = document.getElementById('groupAvatarInput');
var groupNameEditInput = document.getElementById('groupNameEditInput');
var groupNameSaveBtn   = document.getElementById('groupNameSaveBtn');

// ДОБАВЛЕНИЕ УЧАСТНИКА
var groupAddModal        = document.getElementById('groupAddModal');
var groupAddBackdrop     = document.querySelector('.group-add-modal-backdrop');
var groupAddAvatar       = document.getElementById('groupAddAvatar');
var groupAddName         = document.getElementById('groupAddName');
var groupAddMembersCount = document.getElementById('groupAddMembersCount');
var groupAddUserIdInput  = document.getElementById('groupAddUserIdInput');
var groupAddSubmitBtn    = document.getElementById('groupAddSubmitBtn');

// СОЗДАНИЕ ГРУППЫ
var groupNameInput     = document.getElementById('groupNameInput');
var audienceParents    = document.getElementById('audienceParents');
var audienceDancers    = document.getElementById('audienceDancers');
var ageField           = document.getElementById('ageField');
var ageText            = document.getElementById('ageText');
var ageValue           = document.getElementById('ageValue');
var createGroupBtn     = document.getElementById('createGroupBtn');

// СОСТОЯНИЕ
var currentUser        = null;
var currentChat        = null;
var currentGroupName   = null;
var currentGroupInfo   = null;

var registrationBaseData = {
    login: null,
    password: null,
    role: null
};

var currentReplyTarget = null;
var swipeStartX = 0;
var swipeStartY = 0;
var swipeItem   = null;

var lastChats         = [];
var userInfoFromGroup = false; // модалка пользователя открыта из группы?

// цвета для отправителей в группах
var senderColors = [
    '#FF6B6B',
    '#FFD93D',
    '#6BCB77',
    '#4D96FF',
    '#C77DFF',
    '#FF9F1C',
    '#2EC4B6'
];

// ---------- ХЕЛПЕРЫ ----------

function allowOnlyCyrillic(value) {
    return value.replace(/[^А-Яа-яЁё]/g, '').slice(0, 30);
}

function formatTime(ts) {
    var d = ts ? new Date(ts) : new Date();
    if (isNaN(d)) return '';
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
}

function colorHash(str) {
    if (!str) return 0;
    var h = 0;
    for (var i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

function getSenderColor(login) {
    if (!login) return '#FFFFFF';
    var idx = colorHash(login) % senderColors.length;
    return senderColors[idx];
}

function setNavActive(tab) {
    if (!navHomeIcon || !navProfileIcon || !navAddIcon) return;

    if (tab === 'profile') {
        navAddIcon.src    = 'icons/plus.png';
        navHomeIcon.src   = 'icons/home-gray.png';
        navProfileIcon.src= 'icons/user-active.png';
    } else if (tab === 'plus') {
        navAddIcon.src    = 'icons/plus-active.png';
        navHomeIcon.src   = 'icons/home-gray.png';
        navProfileIcon.src= 'icons/user.png';
    } else {
        navAddIcon.src    = 'icons/plus.png';
        navHomeIcon.src   = 'icons/home.png';
        navProfileIcon.src= 'icons/user.png';
    }
}

function formatDateForProfile(dob) {
    if (!dob) return '';
    if (dob.indexOf('-') !== -1) {
        var p = dob.split('-');
        if (p.length === 3) return p[2] + '.' + p[1] + '.' + p[0];
    }
    return '';
}

function updateProfileUI() {
    if (!currentUser) return;

    if (profileAvatar) {
        var src = currentUser.avatar || '/img/default-avatar.png';
        profileAvatar.src = src;
        profileAvatar.onerror = function () {
            this.onerror = null;
            this.src = '/img/default-avatar.png';
        };
    }

    if (profileNameEl) {
        var fullName = '';
        if (currentUser.firstName) fullName += currentUser.firstName + ' ';
        if (currentUser.lastName)  fullName += currentUser.lastName;
        profileNameEl.textContent = fullName.trim();
    }

    if (profileIdEl) {
        if (currentUser.publicId) {
            profileIdEl.style.display = '';
            profileIdEl.textContent   = 'ID: ' + currentUser.publicId;
        } else {
            profileIdEl.style.display = 'none';
        }
    }

    if (profileTeamEl) {
        profileTeamEl.style.display = '';
        profileTeamEl.textContent   = currentUser.team || '';
    }

    if (profileDobEl) {
        var roleLower = (currentUser.role || '').toLowerCase();
        if (roleLower === 'parent' || !currentUser.dobFormatted) {
            profileDobEl.style.display = 'none';
        } else {
            profileDobEl.style.display = '';
            profileDobEl.textContent   = currentUser.dobFormatted;
        }
    }
}

async function markChatRead(chatId) {
    if (!currentUser || !currentUser.login || !chatId) return;
    try {
        await fetch('/api/chat/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: currentUser.login, chatId: chatId })
        });
    } catch (e) {
        // можно игнорировать
    }
}

// ---------- ПАРСИНГ ТЕКСТА-ОТВЕТА ----------
// формат: [r]senderName\nsenderLogin\nquotedText\n[/r]\nmainText
function parseReplyWrappedText(raw) {
    var res = { mainText: raw || '', reply: null };
    if (typeof raw !== 'string') return res;
    if (!raw.startsWith('[r]')) return res;

    var marker = '\n[/r]\n';
    var end = raw.indexOf(marker);
    if (end === -1) return res;

    var metaStr   = raw.substring(3, end);
    var metaLines = metaStr.split('\n');
    res.reply = {
        senderName:  metaLines[0] || '',
        senderLogin: metaLines[1] || '',
        text:        metaLines[2] || ''
    };
    res.mainText = raw.substring(end + marker.length);
    return res;
}

// ---------- ПОИСК ЛИЧНОГО ЧАТА ДЛЯ "НАПИСАТЬ" ----------

function findChatWithUser(login) {
    if (!currentUser || !lastChats || !lastChats.length || !login) return null;

    var roleLower = (currentUser.role || '').toLowerCase();

    if (roleLower === 'trainer' || roleLower === 'тренер') {
        return lastChats.find(function (ch) {
            return ch.type === 'trainer' && ch.partnerLogin === login;
        }) || null;
    }

    return lastChats.find(function (ch) {
        return ch.type === 'trainer' && ch.trainerLogin === login;
    }) || null;
}

// ---------- ЛОГИКА ОТВЕТА ----------

function startReplyForMessage(msg) {
    if (!replyBar || !replySenderEl || !replyTextEl) return;

    currentReplyTarget = msg;

    var isMe = currentUser && msg.senderLogin === currentUser.login;
    replySenderEl.textContent = isMe ? 'Вы' : (msg.senderName || msg.senderLogin || '');

    var preview = String(msg.text || '').replace(/\s+/g, ' ').trim();
    if (preview.length > 80) {
        preview = preview.slice(0, 77) + '…';
    }
    replyTextEl.textContent = preview;

    replyBar.style.display = 'flex';
}

function startReplyFromElement(el) {
    var msg = {
        id:           Number(el.dataset.msgId),
        senderLogin:  el.dataset.msgSenderLogin,
        senderName:   el.dataset.msgSenderName,
        text:         el.dataset.msgText
    };
    startReplyForMessage(msg);
}

function clearReply() {
    currentReplyTarget = null;
    if (replyBar) replyBar.style.display = 'none';
}

function onMsgTouchStart(e) {
    var t = e.touches[0];
    swipeStartX = t.clientX;
    swipeStartY = t.clientY;
    swipeItem   = e.currentTarget;
}

function onMsgTouchMove(e) {
    if (!swipeItem) return;
    var t = e.touches[0];
    var dx = t.clientX - swipeStartX;
    var dy = t.clientY - swipeStartY;

    if (dx < -40 && Math.abs(dy) < 30) {
        startReplyFromElement(swipeItem);
        swipeItem = null;
    }
}

function onMsgTouchEnd() {
    swipeItem = null;
}

// ---------- РЕНДЕР СООБЩЕНИЙ ----------

function renderMessage(msg) {
    if (!chatContent) return;

    var parsed = parseReplyWrappedText(msg.text || '');
    var replyInfo = parsed.reply;
    var mainText  = parsed.mainText;

    var item = document.createElement('div');
    item.className = 'msg-item';

    var isMe = currentUser && msg.sender_login === currentUser.login;
    if (isMe) item.classList.add('msg-me');
    else      item.classList.add('msg-other');

    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    var isGroupChat = currentChat && (currentChat.type === 'group' || currentChat.type === 'groupCustom');

    // имя отправителя в группах
    if (isGroupChat) {
        var senderDiv = document.createElement('div');
        senderDiv.className = 'msg-sender-name';

        if (isMe) {
            senderDiv.textContent = 'Вы';
            senderDiv.style.color = '#000000';
        } else {
            senderDiv.textContent = msg.sender_name || msg.sender_login || '';
            senderDiv.style.color = getSenderColor(msg.sender_login);
        }

        bubble.appendChild(senderDiv);
    }

    // блок цитаты, если это ответ
    if (replyInfo && replyInfo.text) {
        var rb = document.createElement('div');
        rb.className = 'reply-block';

        var rbTitle = document.createElement('div');
        rbTitle.className = 'reply-block-title';
        rbTitle.textContent = replyInfo.senderName || replyInfo.senderLogin || '';

        var rbText = document.createElement('div');
        rbText.className  = 'reply-block-text';
        rbText.textContent = replyInfo.text;

        rb.appendChild(rbTitle);
        rb.appendChild(rbText);
        bubble.appendChild(rb);
    }

    var textDiv = document.createElement('div');
    textDiv.textContent = mainText;

    var timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    timeSpan.textContent = formatTime(msg.created_at);

    bubble.appendChild(textDiv);
    bubble.appendChild(timeSpan);

    item.appendChild(bubble);
    chatContent.appendChild(item);

    // данные для ответа
    item.dataset.msgId          = msg.id;
    item.dataset.msgText        = mainText;
    item.dataset.msgSenderLogin = msg.sender_login;
    item.dataset.msgSenderName  = msg.sender_name || msg.sender_login || '';

    // свайп влево
    item.addEventListener('touchstart', onMsgTouchStart, { passive: true });
    item.addEventListener('touchmove',  onMsgTouchMove,  { passive: true });
    item.addEventListener('touchend',   onMsgTouchEnd);
    item.addEventListener('touchcancel',onMsgTouchEnd);

    // двойной клик
    item.addEventListener('dblclick', function () {
        startReplyFromElement(item);
    });
}

async function loadMessages(chatId) {
    if (!chatContent || !chatId) return;

    chatContent.innerHTML = '';

    try {
        var resp = await fetch('/api/messages/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: chatId })
        });
        var data = await resp.json();

        if (!resp.ok) {
            alert(data.error || 'Ошибка загрузки сообщений');
            return;
        }

        (data.messages || []).forEach(function (m) {
            renderMessage(m);
        });

        chatContent.scrollTop = chatContent.scrollHeight;

        await markChatRead(chatId);
    } catch (e) {
        alert('Сетевая ошибка при загрузке сообщений');
    }
}

// ---------- РЕНДЕР ЧАТОВ ----------

function buildChatSubtitle(chat) {
    if (!chat || !currentUser) return chat && chat.subtitle ? chat.subtitle : '';

    if (chat.lastMessageText) {
        var parsed = parseReplyWrappedText(chat.lastMessageText || '');
        var text   = String(parsed.mainText || '').replace(/\s+/g, ' ').trim();

        var senderLabel = '';

        if (chat.lastMessageSenderLogin === currentUser.login) {
            senderLabel = 'Вы';
        } else if (chat.type === 'trainer' && chat.title) {
            senderLabel = chat.title;
        } else if (chat.lastMessageSenderName) {
            senderLabel = chat.lastMessageSenderName;
        } else {
            senderLabel = chat.lastMessageSenderLogin || '';
        }

        var full = senderLabel ? (senderLabel + ': ' + text) : text;

        var maxLen = 40;
        if (full.length > maxLen) {
            full = full.slice(0, maxLen - 3) + '...';
        }

        return full;
    }

    return chat.subtitle || '';
}

function addChatItem(chat) {
    if (!chatList) return;

    var item = document.createElement('div');
    item.className = 'chat-item';

    var avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'chat-avatar';

    var img = document.createElement('img');
    var defaultAvatar = '/img/default-avatar.png';

    if (chat.avatar) {
        img.src = chat.avatar;
    } else if (chat.type === 'group' || chat.type === 'groupCustom') {
        img.src = '/logo.png';
    } else {
        img.src = defaultAvatar;
    }

    img.alt = chat.title;
    img.onerror = function () {
        this.onerror = null;
        this.src = defaultAvatar;
    };

    avatarWrapper.appendChild(img);

    var body = document.createElement('div');
    body.className = 'chat-body';

    var title = document.createElement('div');
    title.className = 'chat-title';
    title.textContent = chat.title;

    var subtitle = document.createElement('div');
    subtitle.className = 'chat-subtitle';
    subtitle.textContent = buildChatSubtitle(chat);

    body.appendChild(title);
    body.appendChild(subtitle);

    var meta = document.createElement('div');
    meta.className = 'chat-meta';

    if (chat.unreadCount && chat.unreadCount > 0) {
        var badge = document.createElement('div');
        badge.className = 'chat-unread-badge';
        badge.textContent = chat.unreadCount > 99 ? '99+' : chat.unreadCount;
        meta.appendChild(badge);
    }

    item.appendChild(avatarWrapper);
    item.appendChild(body);
    item.appendChild(meta);

    item.addEventListener('click', function () {
        openChat(chat);
    });

    chatList.appendChild(item);
}

async function reloadChatList() {
    if (!currentUser || !currentUser.login || !chatList) return;

    chatList.innerHTML = '';

    try {
        var resp = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: currentUser.login })
        });
        var data = await resp.json();

        if (!resp.ok) {
            alert(data.error || 'Ошибка загрузки чатов');
            return;
        }

        var chatsArr = data.chats || [];
        lastChats = chatsArr.slice();

        chatsArr.sort(function (a, b) {
            var ad = a.lastMessageCreatedAt || '';
            var bd = b.lastMessageCreatedAt || '';
            if (ad === bd) return 0;
            return ad > bd ? -1 : 1;
        });

        chatsArr.forEach(function (chat) {
            addChatItem(chat);
        });
    } catch (e) {
        alert('Сетевая ошибка при загрузке чатов');
    }
}

// ---------- ПАРТНЕР В ЛИЧНОМ ЧАТЕ ----------

function getChatPartnerLogin(chat) {
    if (!chat || !currentUser) return null;
    var roleLower = (currentUser.role || '').toLowerCase();

    if (chat.type === 'trainer') {
        if (roleLower === 'trainer' || roleLower === 'тренер') {
            return chat.partnerLogin;
        } else {
            return chat.trainerLogin || chat.partnerLogin;
        }
    }
    return null;
}

// ---------- МОДАЛКА ПОЛЬЗОВАТЕЛЯ ----------

function hideChatUserModal() {
    if (chatUserModal) chatUserModal.classList.remove('visible');
    userInfoFromGroup = false;
}

async function openUserInfoModal(login, fromGroup) {
    if (!chatUserModal || !login) return;

    userInfoFromGroup = !!fromGroup;

    if (userInfoFromGroup && groupModal) {
        groupModal.classList.remove('visible');
    }

    try {
        var resp = await fetch('/api/user/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: login })
        });
        var data = await resp.json();

        if (!resp.ok) {
            alert(data.error || 'Не удалось получить данные пользователя');
            return;
        }

        var user = data;

        if (chatUserAvatar) {
            var src = user.avatar || '/img/default-avatar.png';
            chatUserAvatar.src = src;
            chatUserAvatar.onerror = function () {
                this.onerror = null;
                this.src = '/img/default-avatar.png';
            };
        }

        if (chatUserName) {
            var fullName = '';
            if (user.firstName) fullName += user.firstName + ' ';
            if (user.lastName)  fullName += user.lastName;
            chatUserName.textContent = fullName.trim();
        }

        if (chatUserId) {
            if (user.publicId) {
                chatUserId.style.display = '';
                chatUserId.textContent   = 'ID: ' + user.publicId;
            } else {
                chatUserId.style.display = 'none';
            }
        }

        if (chatUserTeam) {
            chatUserTeam.textContent = user.team || '';
        }

        if (chatUserDob) {
            if (user.dob) {
                chatUserDob.style.display = '';
                chatUserDob.textContent   = formatDateForProfile(user.dob);
            } else {
                chatUserDob.style.display = 'none';
            }
        }

        if (!userInfoFromGroup) {
            // личный чат: без стрелки и без "Написать"
            if (chatUserBackBtn)  { chatUserBackBtn.style.display  = 'none'; chatUserBackBtn.onclick  = null; }
            if (chatUserWriteBtn) { chatUserWriteBtn.style.display = 'none'; chatUserWriteBtn.onclick = null; }
        } else {
            // из группы: стрелка назад и "Написать"
            if (chatUserBackBtn) {
                chatUserBackBtn.style.display = '';
                chatUserBackBtn.onclick = function () {
                    hideChatUserModal();
                    if (groupModal) groupModal.classList.add('visible');
                };
            }
            if (chatUserWriteBtn) {
                chatUserWriteBtn.style.display = '';
                chatUserWriteBtn.onclick = async function () {
                    try {
                        var resp2 = await fetch('/api/chat/personal', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                login: currentUser.login,
                                targetLogin: user.login
                            })
                        });
                        var d2 = await resp2.json();
                        if (!resp2.ok || !d2.ok) {
                            alert(d2.error || 'Не удалось открыть личный чат');
                            return;
                        }
                        hideChatUserModal();
                        openChat(d2.chat);
                    } catch (e2) {
                        alert('Сетевая ошибка при открытии личного чата');
                    }
                };
            }
        }

        chatUserModal.classList.add('visible');
    } catch (e) {
        alert('Сетевая ошибка при загрузке профиля пользователя');
    }
}

async function openChatUserModal() {
    if (!currentChat || !currentUser) return;
    var partnerLogin = getChatPartnerLogin(currentChat);
    if (!partnerLogin) return;
    openUserInfoModal(partnerLogin, false);
}

// ---------- МОДАЛКА ГРУППЫ ----------

function hideGroupModal() {
    if (groupModal) groupModal.classList.remove('visible');
}

function hideGroupAddModal() {
    if (groupAddModal) groupAddModal.style.display = 'none';
}

function showGroupAddModal() {
    if (!groupAddModal || !currentGroupName || !currentGroupInfo) return;

    if (groupAddAvatar) {
        groupAddAvatar.src = currentGroupInfo.avatar || '/logo.png';
        groupAddAvatar.onerror = function () {
            this.onerror = null;
            this.src = '/logo.png';
        };
    }

    if (groupAddName) {
        groupAddName.textContent = currentGroupInfo.name || '';
    }

    if (groupAddMembersCount) {
        groupAddMembersCount.textContent = (currentGroupInfo.membersCount || 0) + ' участников';
    }

    if (groupAddUserIdInput) {
        groupAddUserIdInput.value = '';
        groupAddUserIdInput.focus();
    }

    groupAddModal.style.display = 'flex';
}

async function openGroupModal() {
    if (!groupModal || !currentChat || !currentUser) return;
    if (currentChat.type !== 'group' && currentChat.type !== 'groupCustom') return;

    try {
        var resp = await fetch('/api/group/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: currentChat.id })
        });
        var data = await resp.json();

        if (!resp.ok) {
            alert(data.error || 'Не удалось получить информацию о группе');
            return;
        }

        var groupName      = data.name   || currentChat.id || '';
        var groupAvatarUrl = data.avatar || '/logo.png';
        var membersCount   = data.membersCount || 0;

        if (groupAvatar) {
            groupAvatar.src = groupAvatarUrl;
            groupAvatar.onerror = function () {
                this.onerror = null;
                this.src = '/logo.png';
            };
        }

        if (groupNameTitle) {
            groupNameTitle.textContent = groupName;
        }

        currentGroupName = groupName;
        currentGroupInfo = {
            name: groupName,
            avatar: groupAvatarUrl,
            membersCount: membersCount
        };

        if (groupNameEditInput) {
            groupNameEditInput.value = currentGroupName;
            groupNameEditInput.style.display = 'none';
        }
        if (groupNameSaveBtn) {
            groupNameSaveBtn.style.display = 'none';
        }

        if (groupMembersCount) {
            groupMembersCount.textContent = membersCount + ' участников';
        }

        if (groupMembersList) {
            groupMembersList.innerHTML = '';
            (data.members || []).forEach(function (m) {
                var item = document.createElement('div');
                item.className = 'group-member-item';

                var aw = document.createElement('div');
                aw.className = 'group-member-avatar-wrapper';

                var img = document.createElement('img');
                img.className = 'group-member-avatar';
                img.src = m.avatar || '/img/default-avatar.png';
                img.onerror = function () {
                    this.onerror = null;
                    this.src = '/img/default-avatar.png';
                };
                aw.appendChild(img);

                var nm = document.createElement('div');
                nm.className = 'group-member-name';
                var fn = (m.first_name || '') + ' ' + (m.last_name || '');
                nm.textContent = fn.trim();

                item.appendChild(aw);
                item.appendChild(nm);

                var lg = m.login || '';
                item.dataset.login = lg;

                if (lg) {
                    item.addEventListener('click', function () {
                        openUserInfoModal(this.dataset.login, true);
                    });
                }

                groupMembersList.appendChild(item);
            });
        }

        // иконки всегда активны, сервер всё равно проверит права
        if (editGroupAvatarBtn) editGroupAvatarBtn.style.display = '';
        if (editGroupNameBtn)   editGroupNameBtn.style.display   = '';
        if (groupAddMemberBtn)  groupAddMemberBtn.style.display  = '';

        hideGroupAddModal();
        groupModal.classList.add('visible');
    } catch (e) {
        alert('Сетевая ошибка при загрузке группы');
    }
}

// ---------- ЭКРАНЫ: ОСНОВНОЙ, ЧАТ, ПРОФИЛЬ, СОЗДАНИЕ ГРУППЫ ----------

async function openMainScreen(user) {
    currentUser = currentUser || {};
    if (user) {
        currentUser.login        = user.login;
        currentUser.role         = user.role;
        currentUser.team         = user.team;
        currentUser.firstName    = user.firstName || currentUser.firstName;
        currentUser.lastName     = user.lastName  || currentUser.lastName;
        currentUser.dob          = user.dob       || currentUser.dob;
        currentUser.dobFormatted = formatDateForProfile(currentUser.dob);
        currentUser.avatar       = user.avatar    || currentUser.avatar;
        currentUser.publicId     = user.publicId  || currentUser.publicId;
    }

    if (welcomeScreen)    welcomeScreen.style.display    = 'none';
    if (registerScreen)   registerScreen.style.display   = 'none';
    if (parentInfoScreen) parentInfoScreen.style.display = 'none';
    if (dancerInfoScreen) dancerInfoScreen.style.display = 'none';
    if (loginScreen)      loginScreen.style.display      = 'none';
    if (chatScreen)       chatScreen.style.display       = 'none';
    if (profileScreen)    profileScreen.style.display    = 'none';
    if (createGroupScreen)createGroupScreen.style.display= 'none';

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();

    if (mainScreen) mainScreen.style.display = 'flex';
    if (bottomNav) bottomNav.style.display   = 'flex';
    setNavActive('home');

    await reloadChatList();
}

function openChat(chat) {
    if (!chatScreen) return;

    currentChat = chat;

    if (mainScreen)      mainScreen.style.display      = 'none';
    if (profileScreen)   profileScreen.style.display   = 'none';
    if (createGroupScreen) createGroupScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'none';
    setNavActive('home');

    if (chatHeaderTitle) chatHeaderTitle.textContent = chat.title || 'Чат';

    var avatar = chat.avatar || '/img/default-avatar.png';
    if (chat.type === 'group' || chat.type === 'groupCustom') avatar = '/logo.png';

    if (chatHeaderAvatar) {
        chatHeaderAvatar.src = avatar;
        chatHeaderAvatar.onerror = function () {
            this.onerror = null;
            this.src = '/img/default-avatar.png';
        };
    }

    if (chatInput) chatInput.value = '';
    if (chatContent) chatContent.innerHTML = '';
    clearReply();

    loadMessages(chat.id);
}

function openProfileScreen() {
    if (!profileScreen) return;

    if (mainScreen)      mainScreen.style.display      = 'none';
    if (chatScreen)      chatScreen.style.display      = 'none';
    if (createGroupScreen) createGroupScreen.style.display = 'none';
    profileScreen.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'flex';

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();

    setNavActive('profile');
    updateProfileUI();
}

function openCreateGroupScreen() {
    if (!createGroupScreen) return;

    if (!currentUser || !currentUser.role) {
        alert('Группы могут создавать только тренера');
        return;
    }

    var roleLower = (currentUser.role || '').toLowerCase();
    if (roleLower !== 'trainer' && roleLower !== 'тренер') {
        alert('Группы могут создавать только тренера');
        return;
    }

    if (mainScreen)      mainScreen.style.display      = 'none';
    if (chatScreen)      chatScreen.style.display      = 'none';
    if (profileScreen)   profileScreen.style.display   = 'none';

    createGroupScreen.style.display = 'block';
    if (bottomNav) bottomNav.style.display = 'flex';
    setNavActive('plus');

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();

    if (groupNameInput) groupNameInput.value = '';
    if (audienceParents) audienceParents.checked = false;
    if (audienceDancers) audienceDancers.checked = false;

    if (ageField) ageField.style.display = 'none';
    if (ageText)  ageText.textContent = 'Выберите возраст участников';
    if (ageValue) ageValue.value = '';
}

// ---------- НАВИГАЦИЯ ----------

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

var backToMainFromChat = document.getElementById('backToMainFromChat');
if (backToMainFromChat && chatScreen) {
    backToMainFromChat.addEventListener('click', async function () {
        chatScreen.style.display = 'none';
        if (mainScreen)  mainScreen.style.display  = 'flex';
        if (bottomNav)   bottomNav.style.display   = 'flex';
        currentChat = null;
        if (chatContent) chatContent.innerHTML = '';
        setNavActive('home');
        hideChatUserModal();
        hideGroupModal();
        hideGroupAddModal();
        clearReply();
        await reloadChatList();
    });
}

if (navHomeBtn && mainScreen) {
    navHomeBtn.addEventListener('click', async function () {
        if (profileScreen)     profileScreen.style.display     = 'none';
        if (chatScreen)        chatScreen.style.display        = 'none';
        if (createGroupScreen) createGroupScreen.style.display = 'none';
        mainScreen.style.display = 'flex';
        if (bottomNav) bottomNav.style.display = 'flex';
        setNavActive('home');
        hideChatUserModal();
        hideGroupModal();
        hideGroupAddModal();
        clearReply();
        await reloadChatList();
    });
}

if (navProfileBtn && profileScreen) {
    navProfileBtn.addEventListener('click', function () {
        openProfileScreen();
    });
}

if (navAddBtn) {
    navAddBtn.addEventListener('click', function () {
        openCreateGroupScreen();
    });
}

// клик по шапке чата
document.addEventListener('click', function (e) {
    var header = e.target.closest('.chat-header');
    if (!header) return;
    if (e.target.closest('.chat-back')) return;
    if (!currentChat) return;

    if (currentChat.type === 'trainer') {
        openChatUserModal();
    } else if (currentChat.type === 'group' || currentChat.type === 'groupCustom') {
        openGroupModal();
    }
});

// закрытие модалок по фону
if (chatUserBackdrop && chatUserModal) {
    chatUserBackdrop.addEventListener('click', function () {
        hideChatUserModal();
    });
}

if (groupModalBackdrop && groupModal) {
    groupModalBackdrop.addEventListener('click', function () {
        hideGroupModal();
    });
}

if (groupAddBackdrop && groupAddModal) {
    groupAddBackdrop.addEventListener('click', function () {
        hideGroupAddModal();
    });
}

// ПРОФИЛЬ: смена фото
if (changePhotoBtn && profilePhotoInput) {
    changePhotoBtn.addEventListener('click', function () {
        profilePhotoInput.click();
    });

    profilePhotoInput.addEventListener('change', async function () {
        var file = this.files && this.files[0];
        if (!file || !currentUser || !currentUser.login) return;

        var formData = new FormData();
        formData.append('avatar', file);
        formData.append('login', currentUser.login);

        try {
            var resp = await fetch('/api/profile/avatar', {
                method: 'POST',
                body: formData
            });
            var data = await resp.json();

            if (!resp.ok) {
                alert(data.error || 'Ошибка сохранения фотографии');
                return;
            }

            if (data.avatar) {
                currentUser.avatar = data.avatar;
                updateProfileUI();
            }
        } catch (e) {
            alert('Сетевая ошибка при сохранении фотографии');
        } finally {
            this.value = '';
        }
    });
}

// редактирование аватара группы (клик всегда работает, права проверит сервер)
if (editGroupAvatarBtn && groupAvatarInput) {
    editGroupAvatarBtn.addEventListener('click', function () {
        if (!currentGroupName) return;
        groupAvatarInput.click();
    });

    groupAvatarInput.addEventListener('change', async function () {
        var file = this.files && this.files[0];
        if (!file || !currentUser || !currentUser.login || !currentGroupName) return;

        var formData = new FormData();
        formData.append('avatar', file);
        formData.append('login', currentUser.login);
        formData.append('groupName', currentGroupName);

        try {
            var resp = await fetch('/api/group/avatar', {
                method: 'POST',
                body: formData
            });
            var data = await resp.json();
            if (!resp.ok) {
                alert(data.error || 'Ошибка сохранения аватара группы');
                return;
            }
            if (data.avatar && groupAvatar) {
                groupAvatar.src = data.avatar;
            }
        } catch (e) {
            alert('Сетевая ошибка при сохранении аватара группы');
        } finally {
            this.value = '';
        }
    });
}

// редактирование названия группы (клик всегда работает, права проверит сервер)
if (editGroupNameBtn && groupNameEditInput && groupNameSaveBtn) {
    editGroupNameBtn.addEventListener('click', function () {
        if (!currentGroupName) return;

        groupNameEditInput.value = currentGroupName;
        groupNameEditInput.style.display = 'block';
        groupNameSaveBtn.style.display   = 'block';
        groupNameEditInput.focus();
    });

    groupNameSaveBtn.addEventListener('click', async function () {
        var newName = groupNameEditInput.value.trim();
        if (!newName) {
            alert('Введите новое название группы');
            return;
        }
        if (!currentGroupName || !currentUser || !currentUser.login) return;

        try {
            var resp = await fetch('/api/group/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login:  currentUser.login,
                    oldName: currentGroupName,
                    newName: newName
                })
            });
            var data = await resp.json();
            if (!resp.ok) {
                alert(data.error || 'Ошибка переименования группы');
                return;
            }

            currentGroupName = data.newName || newName;

            if (groupNameTitle)  groupNameTitle.textContent  = currentGroupName;
            if (chatHeaderTitle) chatHeaderTitle.textContent = currentGroupName;
            if (currentChat)     currentChat.id              = currentGroupName;
            if (currentChat)     currentChat.title           = currentGroupName;

            if (currentGroupInfo) {
                currentGroupInfo.name = currentGroupName;
            }

            groupNameEditInput.style.display = 'none';
            groupNameSaveBtn.style.display   = 'none';

            await reloadChatList();
        } catch (e) {
            alert('Сетевая ошибка при переименовании группы');
        }
    });
}

// открытие модалки группы по клику на шапку
document.addEventListener('click', function (e) {
    var header = e.target.closest('.chat-header');
    if (!header) return;
    if (e.target.closest('.chat-back')) return;
    if (!currentChat) return;

    if (currentChat.type === 'trainer') {
        openChatUserModal();
    } else if (currentChat.type === 'group' || currentChat.type === 'groupCustom') {
        openGroupModal();
    }
});

// открытие модалки добавления участника
if (groupAddMemberBtn) {
    groupAddMemberBtn.addEventListener('click', function () {
        if (!currentGroupName) return;
        hideGroupModal();
        showGroupAddModal();
    });
}

// обработчик ID участника
if (groupAddUserIdInput) {
    groupAddUserIdInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 7);
    });
}

// КНОПКА "Отмена" панели ответа
if (replyCancelBtn) {
    replyCancelBtn.addEventListener('click', clearReply);
}

// --- возраст в создании группы ---

if (audienceParents && ageField) {
    audienceParents.addEventListener('change', function () {
        if (this.checked) {
            ageField.style.display = 'none';
            if (ageText)  ageText.textContent = 'Выберите возраст участников';
            if (ageValue) ageValue.value = '';
        }
    });
}

if (audienceDancers && ageField) {
    audienceDancers.addEventListener('change', function () {
        if (this.checked) {
            ageField.style.display = 'block';
        }
    });
}

if (ageField && ageText && ageValue) {
    ageField.addEventListener('click', function (e) {
        var opt = e.target.closest('.select-option');
        if (opt) {
            var val = opt.getAttribute('data-value');
            var txt = opt.textContent;
            ageValue.value = val;
            ageText.textContent = txt;
            ageField.classList.remove('open');
            return;
        }
        if (e.target.classList.contains('select-display') ||
            e.target.id === 'ageText' ||
            e.target.classList.contains('select-arrow')) {
            ageField.classList.toggle('open');
        }
    });

    document.addEventListener('click', function (e) {
        if (!ageField.contains(e.target)) {
            ageField.classList.remove('open');
        }
    });
}

// СОЗДАНИЕ ГРУППЫ
if (createGroupBtn) {
    createGroupBtn.addEventListener('click', async function () {
        if (!currentUser) {
            alert('Авторизуйтесь, чтобы создавать группы');
            return;
        }
        var roleLower = (currentUser.role || '').toLowerCase();
        if (roleLower !== 'trainer' && roleLower !== 'тренер') {
            alert('Группы могут создавать только тренера');
            return;
        }

        var name = groupNameInput ? groupNameInput.value.trim() : '';
        var audience = audienceParents && audienceParents.checked ? 'parents'
                      : audienceDancers && audienceDancers.checked ? 'dancers'
                      : '';

        var age = ageValue ? ageValue.value : '';

        if (!name) {
            alert('Введите название группы');
            return;
        }

        if (!audience) {
            alert('Выберите, для кого группа');
            return;
        }

        if (audience === 'dancers' && !age) {
            alert('Выберите возраст участников');
            return;
        }

        try {
            var resp = await fetch('/api/groups/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login: currentUser.login,
                    name: name,
                    audience: audience,
                    age: age || null
                })
            });
            var data = await resp.json();

            if (!resp.ok) {
                alert(data.error || 'Ошибка создания группы');
                return;
            }

            alert('Группа создана');
            await openMainScreen(currentUser);
        } catch (e) {
            alert('Сетевая ошибка при создании группы');
        }
    });
}

// ------- ВВОДЫ & РЕГИСТРАЦИЯ / ЛОГИН / ОТПРАВКА -------

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
                return;
            }
        } catch (e) {
            alert('Сетевая ошибка при проверке логина');
            return;
        }

        registrationBaseData.login    = login;
        registrationBaseData.password = password;
        registrationBaseData.role     = role;

        if (role === 'parent' && parentInfoScreen) {
            registerScreen.style.display   = 'none';
            parentInfoScreen.style.display = 'block';
            if (dancerInfoScreen) dancerInfoScreen.style.display = 'none';
            return;
        }

        if (role === 'dancer' && dancerInfoScreen) {
            registerScreen.style.display   = 'none';
            dancerInfoScreen.style.display = 'block';
            if (parentInfoScreen) parentInfoScreen.style.display = 'none';
            return;
        }
    });
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
            teamValue.value      = value;
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
                login:      registrationBaseData.login,
                role:       registrationBaseData.role,
                team:       team,
                firstName:  firstName,
                lastName:   lastName,
                dob:        null,
                avatar:     null,
                publicId:   data.publicId || null
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
            dancerTeamValue.value      = value;
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
                login:      registrationBaseData.login,
                role:       registrationBaseData.role,
                team:       team,
                firstName:  firstName,
                lastName:   lastName,
                dob:        dob,
                avatar:     null,
                publicId:   data.publicId || null
            });
        } catch (e) {
            alert('Сетевая ошибка');
        }
    });
}

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
                login:      data.login,
                role:       data.role,
                team:       data.team,
                firstName:  data.firstName,
                lastName:   data.lastName,
                dob:        data.dob,
                avatar:     data.avatar,
                publicId:   data.publicId
            });
        } catch (e) {
            alert('Сетевая ошибка');
        }
    });
}

if (chatInputForm && chatInput) {
    chatInputForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        var text = chatInput.value.trim();
        if (!text || !currentChat || !currentUser) return;

        var finalText = text;

        if (currentReplyTarget) {
            var sName  = currentReplyTarget.senderName  || currentReplyTarget.senderLogin || '';
            var sLogin = currentReplyTarget.senderLogin || '';

            var quoted = String(currentReplyTarget.text || '').replace(/\s+/g, ' ').trim();
            if (quoted.length > 80) {
                quoted = quoted.slice(0, 77) + '…';
            }
            quoted = quoted.replace(/\n/g, ' ');

            finalText = '[r]' + sName + '\n' + sLogin + '\n' + quoted + '\n[/r]\n' + text;
        }

        var payload = {
            chatId: currentChat.id,
            senderLogin: currentUser.login,
            text: finalText
        };

        try {
            var resp = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            var data = await resp.json();

            if (!resp.ok) {
                alert(data.error || 'Ошибка отправки сообщения');
                return;
            }

            chatInput.value = '';
            clearReply();

            if (data.message) {
                renderMessage(data.message);
                if (chatContent) chatContent.scrollTop = chatContent.scrollHeight;
            } else {
                var nowIso = new Date().toISOString();
                renderMessage({
                    id:           Date.now(),
                    sender_login: currentUser.login,
                    sender_name:  (currentUser.firstName || '') + ' ' + (currentUser.lastName || ''),
                    text:         finalText,
                    created_at:   nowIso
                });
                if (chatContent) chatContent.scrollTop = chatContent.scrollHeight;
            }
        } catch (e2) {
            alert('Сетевая ошибка при отправке сообщения');
        }
    });
}