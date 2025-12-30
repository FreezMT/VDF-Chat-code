console.log('app.js loaded');

window.addEventListener('load', function () {
    setTimeout(async function () {
        var splash  = document.getElementById('splash');
        var welcome = document.getElementById('welcome');

        if (splash) splash.style.display = 'none';

        // Пытаемся восстановить сессию
        var restored = await tryRestoreSession();

        if (!restored) {
            if (welcome) welcome.style.display = 'flex';
            document.body.classList.add('welcome-active');
        } else {
            // если сессия восстановлена, мы уже в openMainScreen
            document.body.classList.remove('welcome-active');
        }
    }, 2000);
});

// состояние последнего рендера сообщений по чатам
var chatRenderState = {}; // { [chatId]: { initialized: bool, lastId: number, pinnedId: number|null } }

// FORWARD MODAL
var forwardModal      = document.getElementById('forwardModal');
var forwardList       = document.getElementById('forwardList');
var forwardCancelBtn  = document.getElementById('forwardCancelBtn');
var forwardSubmitBtn  = document.getElementById('forwardSubmitBtn');
var currentForwardMsg = null;
var forwardSelected   = {}; // { chatId: true }

var chatSearchInput   = document.getElementById('chatSearchInput');
var currentChatSearch = '';

var msgCtxDownloadBtn = null;

// вложения в модалке пользователя
var chatUserAttachments   = document.getElementById('chatUserAttachments');
var chatUserMediaTab      = document.getElementById('chatUserMediaTab');
var chatUserFilesTab      = document.getElementById('chatUserFilesTab');
var chatUserAudioTab      = document.getElementById('chatUserAudioTab');
var chatUserMediaGrid     = document.getElementById('chatUserMediaGrid');
var chatUserFilesList     = document.getElementById('chatUserFilesList');
var chatUserAudioList     = document.getElementById('chatUserAudioList');

// вложения в модалке группы
var groupAttachments      = document.getElementById('groupAttachments');
var groupMediaTab         = document.getElementById('groupMediaTab');
var groupFilesTab         = document.getElementById('groupFilesTab');
var groupAudioTab         = document.getElementById('groupAudioTab');
var groupMediaGrid        = document.getElementById('groupMediaGrid');
var groupFilesList        = document.getElementById('groupFilesList');
var groupAudioList        = document.getElementById('groupAudioList');


// FEED CONTEXT MENU (редактирование/удаление поста)
var feedContextOverlay = null;
var feedContextMenu    = null;
var feedCtxEditBtn     = null;
var feedCtxDeleteBtn   = null;
var currentFeedPostCtx = null;


// ЭКРАНЫ
var welcomeScreen      = document.getElementById('welcome');
var registerScreen     = document.getElementById('registerScreen');
var parentInfoScreen   = document.getElementById('parentInfoScreen');
var dancerInfoScreen   = document.getElementById('dancerInfoScreen');
var loginScreen        = document.getElementById('loginScreen');
var mainScreen         = document.getElementById('mainScreen');  // список чатов
var chatScreen         = document.getElementById('chatScreen');
var profileScreen      = document.getElementById('profileScreen');
var createGroupScreen  = document.getElementById('createGroupScreen');
var feedScreen         = document.getElementById('feedScreen');  // лента
var bottomNav          = document.getElementById('bottomNav');

// FEED
var feedList      = document.getElementById('feedList');
var createPostBtn = document.getElementById('createPostBtn');

// FEED MODAL
var postModal           = document.getElementById('postModal');
var postImageBtn        = document.getElementById('postImageBtn');
var postImageInput      = document.getElementById('postImageInput');
var postImagePreview    = document.getElementById('postImagePreview');
var postImagePreviewImg = document.getElementById('postImagePreviewImg');
var postTextInput       = document.getElementById('postTextInput');
var postCancelBtn       = document.getElementById('postCancelBtn');
var postSubmitBtn       = document.getElementById('postSubmitBtn');

var currentPostImageFile = null;

// ЭЛЕМЕНТЫ ЭКРАНА ЛОГИНА
var loginScreenLogin    = document.getElementById('loginScreenLogin');
var loginScreenPassword = document.getElementById('loginScreenPassword');
var loginContinueBtn    = document.getElementById('loginContinueBtn');

// ЧАТ
var chatList         = document.getElementById('chatList');
var chatHeaderTitle  = document.getElementById('chatHeaderTitle');
var chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
var chatHeaderStatus = document.getElementById('chatHeaderStatus');
var chatContent      = document.querySelector('.chat-content');
var chatInputForm    = document.getElementById('chatInputForm');
var chatInput        = document.getElementById('chatInput');
var chatAttachBtn    = document.getElementById('chatAttachBtn');
var chatAttachInput  = document.getElementById('chatAttachInput');
var attachPreviewBar = document.getElementById('attachPreviewBar');

// МЕДИА ВЬЮЕР
var mediaViewer      = document.getElementById('mediaViewer');
var mediaViewerImg   = document.getElementById('mediaViewerImg');
var mediaViewerVideo = document.getElementById('mediaViewerVideo');

// интервалы
var chatStatusInterval   = null;
var messagePollInterval  = null;
var chatListPollInterval = null;

// УВЕДОМЛЕНИЯ (внутри браузера)
var notificationsSupported = ('Notification' in window);
var notificationsEnabled   = false;
var chatNotifyInterval     = null;
var lastChatMessageMap     = {}; // { chatId: { createdAt, senderLogin } }

// ПАНЕЛЬ ОТВЕТА
var replyBar       = document.getElementById('replyBar');
var replySenderEl  = document.getElementById('replySender');
var replyTextEl    = document.getElementById('replyText');
var replyCancelBtn = document.getElementById('replyCancelBtn');

// НАВИГАЦИЯ
var navListBtn    = document.getElementById('navListBtn');
var navAddBtn     = document.getElementById('navAddBtn');
var navHomeBtn    = document.getElementById('navHomeBtn');
var navProfileBtn = document.getElementById('navProfileBtn');

var navListIcon    = document.getElementById('navListIcon');
var navAddIcon     = document.getElementById('navAddIcon');
var navHomeIcon    = document.getElementById('navHomeIcon');
var navProfileIcon = document.getElementById('navProfileIcon');

// ПРОФИЛЬ
var profileAvatar     = document.getElementById('profileAvatar');
var changePhotoBtn    = document.getElementById('changePhotoBtn');
var profilePhotoInput = document.getElementById('profilePhotoInput');
var profileNameEl     = document.getElementById('profileName');
var profileIdEl       = document.getElementById('profileId');
var profileTeamEl     = document.getElementById('profileTeam');
var profileDobEl      = document.getElementById('profileDob');
var logoutBtn         = document.getElementById('logoutBtn');

// МОДАЛКА ПОЛЬЗОВАТЕЛЯ
var chatUserModal     = document.getElementById('chatUserModal');
var chatUserAvatar    = document.getElementById('chatUserAvatar');
var chatUserName      = document.getElementById('chatUserName');
var chatUserId        = document.getElementById('chatUserId');
var chatUserTeam      = document.getElementById('chatUserTeam');
var chatUserDob       = document.getElementById('chatUserDob');
var chatUserBackdrop  = document.querySelector('.chat-user-modal-backdrop');
var chatUserWriteBtn  = document.getElementById('chatUserWriteBtn');
var chatUserBackBtn   = document.getElementById('chatUserBackBtn');
var chatUserRemoveBtn = document.getElementById('chatUserRemoveBtn');

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
var groupNameInput  = document.getElementById('groupNameInput');
var audienceParents = document.getElementById('audienceParents');
var audienceDancers = document.getElementById('audienceDancers');
var ageField        = document.getElementById('ageField');
var ageText         = document.getElementById('ageText');
var ageValue        = document.getElementById('ageValue');
var createGroupBtn  = document.getElementById('createGroupBtn');

// --- голосовые сообщения / запись ---
var chatSendBtn   = document.getElementById('chatSendBtn');
var chatMicBtn    = document.getElementById('chatMicBtn');
var voiceRecordUi = document.getElementById('voiceRecordUi');
var voiceWaveLive = document.getElementById('voiceWaveLive');
var voiceTimerEl  = document.getElementById('voiceTimer');

var mediaRecorder      = null;
var mediaStream        = null;
var recordedChunks     = [];
var isRecordingVoice   = false;
var voiceTimerInterval = null;
var voiceStartTime     = null;
var voiceSendPlanned   = true;

var voiceAudioCtx   = null;
var voiceAnalyser   = null;
var voiceDataArray  = null;
var voiceWaveRaf    = null;
var voiceWaveBars   = [];
var recordTouchStartX = null;

var voiceSupport = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.MediaRecorder
);

// текущее проигрываемое голосовое сообщение
var currentVoiceAudio   = null;
var currentVoicePlayBtn = null;

// СОСТОЯНИЕ
var currentUser        = null;
var currentChat        = null;
var currentGroupName   = null;
var currentGroupInfo   = null;
var pendingAttachments = [];

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
var userInfoFromGroup = false;

// карта id чата -> DOM-элемент в списке чатов
var chatItemsById     = {};

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

var pinnedTopBar = document.getElementById('pinnedTopBar');

// МЬЮТЫ / ЗАКРЕПЫ / КОНТЕКСТНОЕ МЕНЮ
var mutedChats  = {}; // { chatId: true }
var pinnedChats = {}; // { chatId: true }

var chatContextOverlay    = null;
var chatContextMenu       = null;
var ctxPinBtn             = null;
var ctxMuteBtn            = null;
var ctxLeaveBtn           = null;
var contextMenuTargetChat = null;
var suppressChatClick     = false;

var networkBanner      = document.getElementById('networkBanner');
var networkBannerTimer = null;

initChatAttachments();

function showNetworkErrorBanner(message) {
    if (!networkBanner) return;
    networkBanner.textContent = message || 'Проблемы с сетью';
    networkBanner.classList.add('show');

    if (networkBannerTimer) clearTimeout(networkBannerTimer);
    networkBannerTimer = setTimeout(function () {
        if (networkBanner) networkBanner.classList.remove('show');
    }, 3000);
}


async function tryRestoreSession() {
    try {
        var resp = await fetch('/api/session/me', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
            // cookies для same-origin отправляются автоматически
        });
        if (!resp.ok) return false;

        var data = await resp.json();
        if (!data.ok) return false;

        await openMainScreen({
            login:     data.login,
            role:      data.role,
            team:      data.team,
            firstName: data.firstName,
            lastName:  data.lastName,
            dob:       data.dob,
            avatar:    data.avatar,
            publicId:  data.publicId
        });

        return true;
    } catch (e) {
        console.warn('tryRestoreSession error:', e);
        return false;
    }
}

// ---------- PUSH / SERVICE WORKER ----------

var VAPID_PUBLIC_KEY = 'BG3M55GRSlmaufWbQKN_ykIZmlY0oEqhKvBGMiQX-dwpOPiqpnjtcrEmmRT3kq36nJwWBg7KO-MeZjOKvkr_qSQ';
var pushSupported  = ('serviceWorker' in navigator) && ('PushManager' in window);
var pushSubscribed = false;

function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64  = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}


// вкладки в модалке пользователя
if (chatUserAttachments && chatUserMediaTab && chatUserFilesTab) {
    chatUserMediaTab.addEventListener('click', function () {
        setAttachmentsTab(chatUserAttachments, chatUserMediaTab, chatUserFilesTab, true);
    });
    chatUserFilesTab.addEventListener('click', function () {
        setAttachmentsTab(chatUserAttachments, chatUserMediaTab, chatUserFilesTab, false);
    });
}

// вкладки в модалке группы
if (groupAttachments && groupMediaTab && groupFilesTab) {
    groupMediaTab.addEventListener('click', function () {
        setAttachmentsTab(groupAttachments, groupMediaTab, groupFilesTab, true);
    });
    groupFilesTab.addEventListener('click', function () {
        setAttachmentsTab(groupAttachments, groupMediaTab, groupFilesTab, false);
    });
}

// ---------- ГОЛОСОВЫЕ: ХЕЛПЕРЫ И ЗАПИСЬ ----------


function adjustMediaBlurForMessage(item) {
    if (!item) return;

    var mediaWrapper = item.querySelector('.msg-media-wrapper');
    if (!mediaWrapper) return;

    var mediaEl =
        mediaWrapper.querySelector('.msg-attachment-image') ||
        mediaWrapper.querySelector('.msg-attachment-video');
    if (!mediaEl) return;

    function updateBlur() {
        var col = item.querySelector('.msg-col');
        if (!col) return;

        var colRect   = col.getBoundingClientRect();
        var mediaRect = mediaEl.getBoundingClientRect();
        if (!colRect.width || !mediaRect.width) return;

        var diff = colRect.width - mediaRect.width;

        // если сообщение (колонка) заметно шире картинки — включаем blur‑полосы
        if (diff > 40) {
            mediaWrapper.classList.add('with-blur');
        } else {
            mediaWrapper.classList.remove('with-blur');
        }
    }

    // ждём, пока картинка/видео узнает свои размеры
    if (mediaEl.tagName.toLowerCase() === 'video') {
        if (mediaEl.readyState >= 1) {
            requestAnimationFrame(updateBlur);
        } else {
            mediaEl.addEventListener('loadedmetadata', function () {
                requestAnimationFrame(updateBlur);
            }, { once:true });
        }
    } else { // image
        if (mediaEl.complete) {
            requestAnimationFrame(updateBlur);
        } else {
            mediaEl.addEventListener('load', function () {
                requestAnimationFrame(updateBlur);
            }, { once:true });
        }
    }
}

// форматирование секунд в M:SS
function formatSecondsToMMSS(sec){
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
}

// инициализация "живой" волны для записи
function initVoiceWaveBars(){
    if (!voiceWaveLive || voiceWaveBars.length) return;
    for (var i = 0; i < 16; i++){
        var b = document.createElement('div');
        b.className = 'voice-wave-bar';
        voiceWaveLive.appendChild(b);
        voiceWaveBars.push(b);
    }
}

// ---------- ВКЛАДКИ В МОДАЛКАХ ВЛОЖЕНИЙ ----------

// модалка пользователя
if (chatUserAttachments && chatUserMediaTab && chatUserFilesTab && chatUserAudioTab) {
    var userTabsObj = {
        mediaTab: chatUserMediaTab,
        filesTab: chatUserFilesTab,
        audioTab: chatUserAudioTab
    };

    chatUserMediaTab.addEventListener('click', function () {
        setAttachmentsTab(chatUserAttachments, userTabsObj, 'media');
    });
    chatUserFilesTab.addEventListener('click', function () {
        setAttachmentsTab(chatUserAttachments, userTabsObj, 'files');
    });
    chatUserAudioTab.addEventListener('click', function () {
        setAttachmentsTab(chatUserAttachments, userTabsObj, 'audio');
    });
}

// модалка группы
if (groupAttachments && groupMediaTab && groupFilesTab && groupAudioTab) {
    var groupTabsObj = {
        mediaTab: groupMediaTab,
        filesTab: groupFilesTab,
        audioTab: groupAudioTab
    };

    groupMediaTab.addEventListener('click', function () {
        setAttachmentsTab(groupAttachments, groupTabsObj, 'media');
    });
    groupFilesTab.addEventListener('click', function () {
        setAttachmentsTab(groupAttachments, groupTabsObj, 'files');
    });
    groupAudioTab.addEventListener('click', function () {
        setAttachmentsTab(groupAttachments, groupTabsObj, 'audio');
    });
}




function formatSizeMBVal(v) {
    var val = v || 0;
    if (val < 0.1) val = 0.1;
    return val.toFixed(1) + ' МБ';
}

/**
 * tabs = { mediaTab, filesTab, audioTab }
 * activeKey = 'media' | 'files' | 'audio'
 */
function setAttachmentsTab(container, tabs, activeKey) {
    if (!container || !tabs) return;

    container.classList.remove('chat-attachments-show-files', 'chat-attachments-show-audio');
    if (activeKey === 'files') {
        container.classList.add('chat-attachments-show-files');
    } else if (activeKey === 'audio') {
        container.classList.add('chat-attachments-show-audio');
    }

    if (tabs.mediaTab) tabs.mediaTab.classList.toggle('chat-attachments-tab-active', activeKey === 'media');
    if (tabs.filesTab) tabs.filesTab.classList.toggle('chat-attachments-tab-active', activeKey === 'files');
    if (tabs.audioTab) tabs.audioTab.classList.toggle('chat-attachments-tab-active', activeKey === 'audio');
}

/**
 * Рендер вложений в грид/списки
 */
function renderChatAttachmentsInto(mediaArr, filesArr, audioArr, mediaGrid, filesList, audioList) {
    if (mediaGrid) mediaGrid.innerHTML = '';
    if (filesList) filesList.innerHTML = '';
    if (audioList) audioList.innerHTML = '';

    // медиа
    if (mediaGrid) {
        (mediaArr || []).forEach(function (m) {
            if (!m.url) return;
            var cell = document.createElement('div');
            cell.className = 'chat-media-item';

            var bgUrl = (m.type === 'video' && m.preview) ? m.preview : m.url;
            cell.style.backgroundImage = 'url("' + bgUrl + '")';

            if (m.type === 'video') {
                var badge = document.createElement('div');
                badge.className = 'chat-media-video-icon';
                badge.textContent = '▶';
                cell.appendChild(badge);
            }

            cell.addEventListener('click', function () {
                openMediaViewer(m.url, m.type === 'video' ? 'video' : 'image');
            });

            mediaGrid.appendChild(cell);
        });
    }

    // файлы
    if (filesList) {
        (filesArr || []).forEach(function (f) {
            if (!f.url) return;

            var row = document.createElement('div');
            row.className = 'chat-file-item';

            var icon = document.createElement('div');
            icon.className = 'chat-file-icon';

            var main = document.createElement('div');
            main.className = 'chat-file-main';

            var nameEl = document.createElement('div');
            nameEl.className = 'chat-file-name';
            nameEl.textContent = f.name || 'Файл';

            var metaEl = document.createElement('div');
            metaEl.className = 'chat-file-meta';
            var sizeText = (typeof f.sizeMB === 'number') ? formatSizeMBVal(f.sizeMB) : '';
            var dateText = f.createdAt ? formatDateTime(f.createdAt) : '';
            metaEl.textContent = sizeText && dateText ? (sizeText + ' • ' + dateText) : (sizeText || dateText || '');

            main.appendChild(nameEl);
            main.appendChild(metaEl);

            row.appendChild(icon);
            row.appendChild(main);

            row.addEventListener('click', function () {
                // скачивание / открытие
                var aTag = document.createElement('a');
                aTag.href = f.url;
                aTag.download = f.name || '';
                aTag.target = '_blank';
                document.body.appendChild(aTag);
                aTag.click();
                document.body.removeChild(aTag);

                // спрятать стрелку
                icon.classList.add('downloaded');
            });

            filesList.appendChild(row);
        });
    }

    // аудио (голосовые)
    if (audioList) {
        (audioArr || []).forEach(function (a) {
            if (!a.url) return;

            var row = document.createElement('div');
            row.className = 'chat-file-item';

            var icon = document.createElement('div');
            icon.className = 'chat-file-icon';

            var main = document.createElement('div');
            main.className = 'chat-file-main';

            var nameEl = document.createElement('div');
            nameEl.className = 'chat-file-name';
            nameEl.textContent = 'Голосовое сообщение';

            var metaEl = document.createElement('div');
            metaEl.className = 'chat-file-meta';
            var sizeText = (typeof a.sizeMB === 'number') ? formatSizeMBVal(a.sizeMB) : '';
            var dateText = a.createdAt ? formatDateTime(a.createdAt) : '';
            metaEl.textContent = sizeText && dateText ? (sizeText + ' • ' + dateText) : (sizeText || dateText || '');

            main.appendChild(nameEl);
            main.appendChild(metaEl);

            row.appendChild(icon);
            row.appendChild(main);

            row.addEventListener('click', function () {
                // открываем/играем голосовое (пусть пока в новой вкладке)
                var win = window.open(a.url, '_blank');
                if (win) win.focus();
                icon.classList.add('downloaded');
            });

            audioList.appendChild(row);
        });
    }
}

/**
 * Загрузка вложений для текущего чата и рендер в указанный контейнер
 */
async function loadAttachmentsForCurrentChat(container, mediaGrid, filesList, audioList, tabs) {
    if (!currentChat || !currentChat.id || !container) return;

    try {
        var resp = await fetch('/api/chat/attachments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: currentChat.id })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            return;
        }

        renderChatAttachmentsInto(
            data.media || [],
            data.files || [],
            data.audios || [],
            mediaGrid,
            filesList,
            audioList
        );

        // по умолчанию показываем "Медиа"
        setAttachmentsTab(container, tabs, 'media');
    } catch (e) {
        console.warn('loadAttachmentsForCurrentChat error:', e);
    }
}
// анимация живой волны по данным анализатора (реальная амплитуда)
function startVoiceWaveAnimation(){
    if (!voiceAnalyser || !voiceDataArray) return;
    initVoiceWaveBars();

    function step(){
        if (!voiceAnalyser || !voiceDataArray || !isRecordingVoice){
            voiceWaveBars.forEach(function(b){ b.style.height = '3px'; });
            voiceWaveRaf = null;
            return;
        }

        voiceAnalyser.getByteTimeDomainData(voiceDataArray);
        var sum = 0;
        for (var i = 0; i < voiceDataArray.length; i++){
            var v = (voiceDataArray[i] - 128) / 128;
            sum += v * v;
        }
        var rms = Math.sqrt(sum / voiceDataArray.length); // 0..1

        // усиливаем чувствительность
        rms = rms * 3;
        if (rms > 1) rms = 1;

        var baseH = 3;
        var maxH  = 14;
        var h = baseH + (maxH - baseH) * rms;

        voiceWaveBars.forEach(function(b, idx){
            var factor = 0.3 + 0.7 * Math.abs(Math.sin((Date.now()/200) + idx * 0.5));
            var hh = baseH + (h - baseH) * factor;
            b.style.height = hh + 'px';
        });

        voiceWaveRaf = requestAnimationFrame(step);
    }

    if (!voiceWaveRaf) voiceWaveRaf = requestAnimationFrame(step);
}

function stopVoiceWaveAnimation(){
    if (voiceWaveRaf) {
        cancelAnimationFrame(voiceWaveRaf);
        voiceWaveRaf = null;
    }
    if (voiceWaveBars.length){
        voiceWaveBars.forEach(function(b){ b.style.height = '3px'; });
    }
}

// --- старт записи голосового ---
async function startVoiceRecording() {
    if (!voiceSupport) {
        alert('Ваш браузер не поддерживает голосовые сообщения');
        return;
    }
    if (!currentChat || !currentUser || !currentUser.login) {
        alert('Сначала выберите чат');
        return;
    }
    if (isRecordingVoice) return;

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
        alert('Нет доступа к микрофону');
        return;
    }

    // СРАЗУ отмечаем, что идёт запись, чтобы волна запустилась
    isRecordingVoice = true;
    voiceSendPlanned = true;

    if (chatInputForm) chatInputForm.classList.add('recording');

    voiceStartTime = Date.now();
    if (voiceTimerEl) voiceTimerEl.textContent = '0:00';

    voiceTimerInterval = setInterval(function () {
        if (!voiceTimerEl || !voiceStartTime) return;
        var sec = (Date.now() - voiceStartTime) / 1000;
        voiceTimerEl.textContent = formatSecondsToMMSS(sec);
    }, 500);

    // WebAudio для анализа громкости
    try {
        voiceAudioCtx  = new (window.AudioContext || window.webkitAudioContext)();
        var sourceNode = voiceAudioCtx.createMediaStreamSource(mediaStream);
        voiceAnalyser  = voiceAudioCtx.createAnalyser();
        voiceAnalyser.fftSize = 256;
        voiceDataArray = new Uint8Array(voiceAnalyser.fftSize);
        sourceNode.connect(voiceAnalyser);
        startVoiceWaveAnimation();
    } catch (e) {
        console.warn('AudioContext init error:', e);
        voiceAudioCtx = null;
        voiceAnalyser = null;
        voiceDataArray = null;
    }

    // MediaRecorder
    recordedChunks = [];
    try {
        mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
    } catch (e) {
        mediaRecorder = new MediaRecorder(mediaStream);
    }

    mediaRecorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
        }
    };
    mediaRecorder.onstop = handleVoiceRecordingStop;

    mediaRecorder.start();
}

// --- останов записи (send=true — отправляем, false — отменяем) ---
function stopVoiceRecording(send) {
    if (!isRecordingVoice) return;

    isRecordingVoice = false;
    voiceSendPlanned = !!send;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(function(t){ t.stop(); });
        mediaStream = null;
    }
    if (chatInputForm) chatInputForm.classList.remove('recording');

    if (voiceTimerInterval) {
        clearInterval(voiceTimerInterval);
        voiceTimerInterval = null;
    }
    voiceStartTime = null;

    stopVoiceWaveAnimation();
    if (voiceAudioCtx) {
        voiceAudioCtx.close().catch(function(){});
        voiceAudioCtx = null;
        voiceAnalyser = null;
        voiceDataArray = null;
    }
}

// --- завершение записи: отправка файла ---
async function handleVoiceRecordingStop() {
    if (!voiceSendPlanned || !recordedChunks.length) {
        recordedChunks = [];
        return;
    }
    if (!currentChat || !currentUser || !currentUser.login) {
        recordedChunks = [];
        return;
    }

    var blob = new Blob(recordedChunks, { type: 'audio/webm' });
    recordedChunks = [];

    var fileName = 'voice-' + Date.now() + '.webm';
    var file = new File([blob], fileName, { type: 'audio/webm' });

    var formData = new FormData();
    formData.append('file', file);
    formData.append('login', currentUser.login);
    formData.append('chatId', currentChat.id);
    formData.append('text', ''); // голосовое без текста

    try {
        var resp = await fetch('/api/messages/send-file', {
            method: 'POST',
            body: formData
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка отправки голосового сообщения');
            return;
        }
        await refreshMessages(false);
        if (chatContent) chatContent.scrollTop = chatContent.scrollHeight;
    } catch (e) {
        alert('Сетевая ошибка при отправке голосового сообщения');
    }
}


// ---------- ХЕЛПЕРЫ ДЛЯ РЕПЛАЙ / СКРОЛЛА / РАЗМЕРОВ ----------

function scrollToRepliedMessage(replyInfo) {
    if (!chatContent || !replyInfo) return;

    // 1) Если есть messageId — ищем по ID
    if (replyInfo.messageId) {
        var byId = chatContent.querySelector('.msg-item[data-msg-id="' + replyInfo.messageId + '"]');
        if (byId) {
            var offset = byId.offsetTop - 40;
            if (offset < 0) offset = 0;
            chatContent.scrollTop = offset;

            byId.classList.add('msg-highlight');
            setTimeout(function () {
                byId.classList.remove('msg-highlight');
            }, 1000);
            return;
        }
    }

    // 2) Старый формат без ID — по тексту/типу
    var preview     = String(replyInfo.text || '').replace(/\s+/g, ' ').trim();
    var senderLogin = replyInfo.senderLogin || '';

    var target = null;
    var items  = chatContent.querySelectorAll('.msg-item');

    for (var i = 0; i < items.length; i++) {
        var it    = items[i];
        var login = it.dataset.msgSenderLogin || '';
        if (senderLogin && login !== senderLogin) continue;

        var msgText = String(it.dataset.msgText || '').replace(/\s+/g, ' ').trim();
        var attType = it.dataset.msgAttachmentType || '';

        // медиа / голосовые без текста
        if (preview === '[Фото]' || preview === '[Видео]' || preview === 'Голосовое сообщение') {
            if (!msgText && attType) {
                if (preview === '[Фото]'  && attType === 'image')  target = it;
                if (preview === '[Видео]' && attType === 'video')  target = it;
                if (preview === 'Голосовое сообщение' && attType === 'audio') target = it;
            }
        } else {
            var truncated = msgText.length > 80 ? msgText.slice(0, 77) + '…' : msgText;
            if (truncated === preview) {
                target = it;
            }
        }

        if (target) break;
    }

    if (!target) return;

    var offset2 = target.offsetTop - 40;
    if (offset2 < 0) offset2 = 0;
    chatContent.scrollTop = offset2;

    target.classList.add('msg-highlight');
    setTimeout(function () {
        target.classList.remove('msg-highlight');
    }, 1000);
}

function updateFloatingBarsPosition() {
    if (!chatInputForm) return;

    var inputRect   = chatInputForm.getBoundingClientRect();
    var inputHeight = inputRect.height;

    var attachH = 0;
    if (attachPreviewBar && attachPreviewBar.style.display !== 'none') {
        attachH = attachPreviewBar.getBoundingClientRect().height;
    }

    var replyH = 0;
    if (replyBar && replyBar.style.display !== 'none') {
        replyH = replyBar.getBoundingClientRect().height;
    }

    if (attachPreviewBar) {
        attachPreviewBar.style.bottom = inputHeight + 'px';
    }

    if (replyBar) {
        var offset = inputHeight + (attachH || 0);
        replyBar.style.bottom = offset + 'px';
    }
}

// обновление статуса прочтения (галочек)
function updateReadStatusInDom(messages) {
    if (!chatContent || !currentUser || !currentUser.login) return;

    messages.forEach(function (m) {
        if (m.sender_login !== currentUser.login) return;

        var item = chatContent.querySelector('.msg-item[data-msg-id="' + m.id + '"]');
        if (!item) return;

        var checksEl = item.querySelector('.msg-checks');
        if (!checksEl) return;

        checksEl.textContent = m.read_by_all ? '✓✓' : '✓';
    });
}

// --- управление состоянием кнопки отправки (микрофон / send) ---

function updateSendButtonState() {
    if (!chatInputForm) return;

    var hasText = chatInput && chatInput.value.trim().length > 0;
    var hasAtt  = pendingAttachments && pendingAttachments.length > 0;

    // если есть текст или вложения — показываем кнопку "отправить"
    if (hasText || hasAtt) {
        chatInputForm.classList.add('can-send');
    } else {
        chatInputForm.classList.remove('can-send');
    }
}

// auto-resize textarea + переключение mic/send
if (chatInput) {
    function autoResizeChatInput() {
        var minH = 36;
        var maxH = 96;

        chatInput.style.height = 'auto';

        var newH = chatInput.scrollHeight;
        if (newH < minH) newH = minH;
        if (newH > maxH) {
            newH = maxH;
            chatInput.style.overflowY = 'auto';
        } else {
            chatInput.style.overflowY = 'hidden';
        }
        chatInput.style.height = newH + 'px';

        updateFloatingBarsPosition();
        updateSendButtonState();
    }

    chatInput.addEventListener('input', autoResizeChatInput);
    autoResizeChatInput();
}

function fitMediaSize(el, naturalW, naturalH) {
    if (!naturalW || !naturalH) return;

    var maxW = window.innerWidth  * 0.75;
    var maxH = window.innerHeight * 0.7;

    if (naturalW < maxW) maxW = naturalW;
    if (naturalH < maxH) maxH = naturalH;

    var scale = Math.min(maxW / naturalW, maxH / naturalH, 1);

    el.style.width  = (naturalW * scale) + 'px';
    el.style.height = (naturalH * scale) + 'px';
}

function formatTime(ts) {
    if (!ts) return '';
    var d;

    if (typeof ts === 'string') {
        d = new Date(ts.replace(' ', 'T') + 'Z');
    } else {
        d = new Date(ts);
    }

    if (isNaN(d.getTime())) return '';

    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
}

function formatDateTime(ts) {
    if (!ts) return '';
    var d = new Date(ts.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return '';
    var dd  = String(d.getDate()).padStart(2, '0');
    var mm  = String(d.getMonth() + 1).padStart(2, '0');
    var yy  = String(d.getFullYear()).slice(-2);
    var hh  = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    return dd + '.' + mm + '.' + yy + ' ' + hh + ':' + min;
}

function allowOnlyCyrillic(value) {
    return value.replace(/[^А-Яа-яЁё]/g, '').slice(0, 30);
}

function openMediaViewer(url, type){
    if (!mediaViewer || !mediaViewerImg || !mediaViewerVideo) return;

    mediaViewer.classList.add('visible');

    mediaViewerImg.style.display   = 'none';
    mediaViewerVideo.style.display = 'none';

    if (type === 'image') {
        mediaViewerImg.src = url;
        mediaViewerImg.style.display = 'block';
        mediaViewerVideo.pause();
        mediaViewerVideo.src = '';
    } else if (type === 'video') {
        mediaViewerVideo.src = url;
        mediaViewerVideo.style.display = 'block';
        mediaViewerImg.src = '';

        mediaViewerVideo.muted    = false;
        mediaViewerVideo.controls = true;
        mediaViewerVideo.currentTime = 0;
        mediaViewerVideo.play().catch(function(){});
    }
}

function closeMediaViewer(){
    if (!mediaViewer || !mediaViewerImg || !mediaViewerVideo) return;

    mediaViewer.classList.remove('visible');
    mediaViewerImg.src = '';
    mediaViewerVideo.pause();
    mediaViewerVideo.src = '';
}

// инициализация закрытия по клику по фону
(function initMediaViewerEvents(){
    if (!mediaViewer) return;
    var backdrop = mediaViewer.querySelector('.media-viewer-backdrop');
    if (backdrop){
        backdrop.addEventListener('click', closeMediaViewer);
    }
    mediaViewer.addEventListener('click', function(e){
        if (e.target === mediaViewer) {
            closeMediaViewer();
        }
    });
})();

function renderAttachPreviewBar() {
    if (!attachPreviewBar) return;

    function formatSizeMB(v) {
        var val = v || 0;
        if (val < 0.1) val = 0.1;
        return val.toFixed(1) + ' МБ';
    }

    // нет вложений — скрываем полосу и обновляем состояния
    if (!pendingAttachments.length) {
        attachPreviewBar.style.display = 'none';
        attachPreviewBar.innerHTML = '';

        if (typeof updateFloatingBarsPosition === 'function') {
            updateFloatingBarsPosition();
        }
        if (typeof updateSendButtonState === 'function') {
            updateSendButtonState();
        }
        return;
    }

    attachPreviewBar.style.display = 'flex';
    attachPreviewBar.innerHTML = '';

    pendingAttachments.forEach(function (att) {
        var item = document.createElement('div');
        item.className = 'attach-preview-item';

        if (att.type === 'image' && att.url) {
            var imgThumb = document.createElement('img');
            imgThumb.className = 'attach-preview-thumb';
            imgThumb.src = att.url;
            imgThumb.onerror = function () { this.style.display = 'none'; };
            imgThumb.addEventListener('click', function (e) {
                e.stopPropagation();
                openMediaViewer(att.url, 'image');
            });
            item.appendChild(imgThumb);
        } else if (att.type === 'video' && att.url) {
            item.classList.add('attach-preview-item-file');

            var videoBox = document.createElement('div');
            videoBox.className = 'attach-preview-file';

            var nameDiv = document.createElement('div');
            nameDiv.className = 'attach-preview-file-name';
            nameDiv.textContent = att.name || 'Видео';

            var sizeDiv = document.createElement('div');
            sizeDiv.className = 'attach-preview-file-size';
            sizeDiv.textContent = formatSizeMB(att.sizeMB);

            videoBox.appendChild(nameDiv);
            videoBox.appendChild(sizeDiv);

            videoBox.addEventListener('click', function (e) {
                e.stopPropagation();
                openMediaViewer(att.url, 'video');
            });

            item.appendChild(videoBox);
        } else {
            item.classList.add('attach-preview-item-file');

            var fileBox = document.createElement('div');
            fileBox.className = 'attach-preview-file';

            var nameDiv2 = document.createElement('div');
            nameDiv2.className = 'attach-preview-file-name';
            nameDiv2.textContent = att.name || 'Файл';

            var sizeDiv2 = document.createElement('div');
            sizeDiv2.className = 'attach-preview-file-size';
            sizeDiv2.textContent = formatSizeMB(att.sizeMB);

            fileBox.appendChild(nameDiv2);
            fileBox.appendChild(sizeDiv2);

            item.appendChild(fileBox);
        }

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'attach-preview-remove';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            pendingAttachments = pendingAttachments.filter(function (p) {
                return p.id !== att.id;
            });
            renderAttachPreviewBar();
        });

        item.appendChild(removeBtn);
        attachPreviewBar.appendChild(item);
    });

    if (typeof updateFloatingBarsPosition === 'function') {
        updateFloatingBarsPosition();
    }
    if (typeof updateSendButtonState === 'function') {
        updateSendButtonState();
    }
}

function initChatAttachments() {
    if (!chatAttachBtn || !chatAttachInput) return;

    function bytesToMB(bytes) {
        return bytes / (1024 * 1024);
    }

    chatAttachBtn.addEventListener('click', function () {
        if (!currentUser || !currentUser.login || !currentChat) {
            alert('Сначала войдите в чат');
            return;
        }
        chatAttachInput.click();
    });

    chatAttachInput.addEventListener('change', function () {
        var files = Array.from(this.files || []);

        files.forEach(function (file) {
            if (!file) return;

            var sizeMB = bytesToMB(file.size);
            var mime   = file.type || '';
            var type   = 'file';

            if (mime.startsWith('image/')) {
                if (sizeMB > 25) {
                    alert('Фото "' + file.name + '" больше 25 МБ и не будет добавлено.');
                    return;
                }
                type = 'image';
            } else if (mime.startsWith('video/')) {
                if (sizeMB > 150) {
                    alert('Видео "' + file.name + '" больше 150 МБ и не будет добавлено.');
                    return;
                }
                type = 'video';
            } else {
                if (sizeMB > 500) {
                    alert('Файл "' + file.name + '" больше 500 МБ и не будет добавлен.');
                    return;
                }
                type = 'file';
            }

            var url = null;
            if (type === 'image' || type === 'video') {
                url = URL.createObjectURL(file);
            }

            pendingAttachments.push({
                id:   Date.now().toString() + Math.random().toString(16).slice(2),
                file: file,
                type: type,
                url:  url,
                name: file.name,
                sizeMB: sizeMB
            });
        });

        renderAttachPreviewBar();
        chatAttachInput.value = '';
    });
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

function isChatPinned(chatId) {
    return !!(pinnedChats && pinnedChats[chatId]);
}

function isChatMuted(chatId) {
    return !!(mutedChats && mutedChats[chatId]);
}

function loadPinnedChatsForUser() {
    pinnedChats = {};
    if (!currentUser || !currentUser.login) return;
    var key = 'pinned_' + currentUser.login;
    try {
        var arr = JSON.parse(localStorage.getItem(key) || '[]');
        arr.forEach(function (id) {
            pinnedChats[id] = true;
        });
    } catch (e) {}
}

function savePinnedChatsForUser() {
    if (!currentUser || !currentUser.login) return;
    var key = 'pinned_' + currentUser.login;
    var arr = Object.keys(pinnedChats).filter(function (id) {
        return pinnedChats[id];
    });
    try {
        localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) {}
}

async function loadMutedChats() {
    if (!currentUser || !currentUser.login) return;
    try {
        var resp = await fetch('/api/chat/mute/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: currentUser.login })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) return;
        mutedChats = {};
        (data.mutes || []).forEach(function (cid) {
            mutedChats[cid] = true;
        });
    } catch (e) {}
}

function setNavActive(tab) {
    if (!navHomeIcon || !navProfileIcon || !navAddIcon || !navListIcon) return;

    navHomeIcon.src   = 'icons/home-gray.png';
    navProfileIcon.src= 'icons/user.png';
    navAddIcon.src    = 'icons/plus.png';
    navListIcon.src   = 'icons/list-gray.png';

    if (tab === 'profile') {
        navProfileIcon.src = 'icons/user-active.png';
    } else if (tab === 'plus') {
        navAddIcon.src = 'icons/plus-active.png';
    } else if (tab === 'list') {
        navListIcon.src = 'icons/list.png';
    } else {
        navHomeIcon.src = 'icons/home.png';
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
    } catch (e) {}
}


// ---------- ПАРСИНГ ТЕКСТА-ОТВЕТА ----------
//
// Формат:
//   [r]Имя\nlogin\nпревью\n[/r]\nосновной текст
//   [r:123]Имя\nlogin\nпревью\n[/r]\nосновной текст
//
// Если что‑то пойдёт не так, никогда не показываем сырой [r] пользователю.

function parseReplyWrappedText(raw) {
    var res = { mainText: raw || '', reply: null };
    if (typeof raw !== 'string') return res;

    // допускаем ведущие пробелы/переводы строки перед [r]
    var m = raw.match(/^\s*\[r(?::(\d+))?\]([\s\S]*?)\[\/r\]\s*([\s\S]*)$/);
    if (!m) {
        // если шаблон не совпал, но в тексте есть [r и [/r], на всякий случай вырежем этот блок
        if (raw.indexOf('[r') !== -1 && raw.indexOf('[/r]') !== -1) {
            var cleaned = raw.replace(/^\s*\[r(?::\d+)?\][\s\S]*?\[\/r\]\s*/,'');
            res.mainText = cleaned;
        }
        return res;
    }

    var idStr  = m[1];             // ID сообщения, если есть ([r:123])
    var meta   = m[2] || '';       // Имя, логин, превью
    var after  = m[3] || '';       // основной текст после [/r]

    var id = null;
    if (idStr) {
        var n = parseInt(idStr, 10);
        if (!isNaN(n)) id = n;
    }

    var lines = meta.split('\n');
    var senderName  = (lines[0] || '').trim();
    var senderLogin = (lines[1] || '').trim();
    var previewText = (lines[2] || '').trim();

    res.reply = {
        messageId:   id,
        senderName:  senderName,
        senderLogin: senderLogin,
        text:        previewText
    };
    res.mainText = after;   // основной текст уже без [r]...[/r]
    return res;
}

// ---------- ПОИСК ЛИЧНОГО ЧАТА ДЛЯ "НАПИСАТЬ" ----------

function findChatWithUser(login) {
    if (!currentUser || !lastChats || !lastChats.length || !login) return null;

    var pm = lastChats.find(function (ch) {
        return ch.type === 'personal' && ch.partnerLogin === login;
    });
    if (pm) return pm;

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

    var parsed = parseReplyWrappedText(msg.text || '');
    // если mainText пустой — это ОК (ответ + вложение); не откатываемся к сырым [r]...[/r]
    var baseText = (typeof parsed.mainText === 'string')
        ? parsed.mainText
        : (msg.text || '');

    var cleanText = (baseText || '').trim();
    var preview = cleanText;

    if (!preview) {
        var attType = msg.attachmentType || msg.attachment_type || '';
        if (attType === 'image')      preview = '[Фото]';
        else if (attType === 'video') preview = '[Видео]';
        else if (attType === 'file')  preview = '[Файл]';
        else if (attType === 'audio') preview = 'Голосовое сообщение';
    }

    preview = String(preview).replace(/\s+/g, ' ').trim();
    if (preview.length > 80) preview = preview.slice(0, 77) + '…';

    msg.text = preview;
    currentReplyTarget = msg;

    var isMe = currentUser && msg.senderLogin === currentUser.login;
    replySenderEl.textContent = isMe ? 'Вы' : (msg.senderName || msg.senderLogin || '');
    replyTextEl.textContent   = preview || '';

    replyBar.style.display = 'flex';
    updateFloatingBarsPosition();
}

function startReplyFromElement(el) {
    var msg = {
        id:             Number(el.dataset.msgId),
        senderLogin:    el.dataset.msgSenderLogin,
        senderName:     el.dataset.msgSenderName,
        text:           el.dataset.msgText,
        attachmentType: el.dataset.msgAttachmentType || ''
    };
    startReplyForMessage(msg);
}

function clearReply() {
    currentReplyTarget = null;
    if (replyBar) replyBar.style.display = 'none';
    updateFloatingBarsPosition();
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

// ---------- ОНЛАЙН-СТАТУС В ШАПКЕ ----------

async function updateChatStatus() {
    if (!currentChat || !currentUser || !chatHeaderStatus) return;
    if (currentChat.type !== 'trainer' && currentChat.type !== 'personal') {
        chatHeaderStatus.textContent = '';
        return;
    }
    var partnerLogin = getChatPartnerLogin(currentChat);
    if (!partnerLogin) {
        chatHeaderStatus.textContent = '';
        return;
    }

    try {
        var resp = await fetch('/api/user/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: partnerLogin })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            chatHeaderStatus.textContent = '';
            return;
        }

        if (data.online) {
            chatHeaderStatus.textContent = 'Онлайн';
        } else if (data.lastSeen) {
            var d = new Date(data.lastSeen.replace(' ', 'T') + 'Z');
            if (!isNaN(d.getTime())) {
                var hh = String(d.getHours()).padStart(2, '0');
                var mm = String(d.getMinutes()).padStart(2, '0');
                chatHeaderStatus.textContent = 'Был(а) в сети ' + hh + ':' + mm;
            } else {
                chatHeaderStatus.textContent = '';
            }
        } else {
            chatHeaderStatus.textContent = '';
        }
    } catch (e) {}
}

function startChatStatusUpdates() {
    if (!chatHeaderStatus) return;
    if (!currentChat || (currentChat.type !== 'trainer' && currentChat.type !== 'personal')) {
        chatHeaderStatus.textContent = '';
        return;
    }
    updateChatStatus();
    if (chatStatusInterval) clearInterval(chatStatusInterval);
    chatStatusInterval = setInterval(updateChatStatus, 3000);
}

function stopChatStatusUpdates() {
    if (chatStatusInterval) {
        clearInterval(chatStatusInterval);
        chatStatusInterval = null;
    }
    if (chatHeaderStatus) chatHeaderStatus.textContent = '';
}

// ---------- РЕНДЕР СООБЩЕНИЙ (включая голосовые) ----------

function renderMessage(msg) {
    if (!chatContent) return;

    var parsed    = parseReplyWrappedText(msg.text || '');
    var replyInfo = parsed.reply;
    var mainText  = parsed.mainText;

    if (replyInfo && replyInfo.messageId && messagesById && messagesById[replyInfo.messageId]) {
    var target  = messagesById[replyInfo.messageId];
    var tParsed = parseReplyWrappedText(target.text || '');
    // не откатываемся к target.text, если mainText пустой
    var tBase   = (typeof tParsed.mainText === 'string')
        ? tParsed.mainText
        : (target.text || '');

    var snippet = String(tBase || '').replace(/\s+/g, ' ').trim();
    if (!snippet && target.attachment_type) {
        if (target.attachment_type === 'image')      snippet = '[Фото]';
        else if (target.attachment_type === 'video') snippet = '[Видео]';
        else if (target.attachment_type === 'file')  snippet = '[Файл]';
        else if (target.attachment_type === 'audio') snippet = 'Голосовое сообщение';
    }
    if (snippet.length > 80) snippet = snippet.slice(0, 77) + '…';

    replyInfo.text = snippet;
    }

    var item = document.createElement('div');
    item.className = 'msg-item';

    var isMe = currentUser && msg.sender_login === currentUser.login;
    if (isMe) item.classList.add('msg-me');
    else      item.classList.add('msg-other');

    var hasAttachment = !!msg.attachment_url;
    var hasText       = !!(mainText && String(mainText).trim().length > 0);

    var col = document.createElement('div');
    col.className = 'msg-col';

    // ----- reply-block -----
    var rb = null;
    if (replyInfo && replyInfo.text) {
        rb = document.createElement('div');
        rb.className = 'reply-block';

        var rbTitle = document.createElement('div');
        rbTitle.className = 'reply-block-title';
        rbTitle.textContent = replyInfo.senderName || replyInfo.senderLogin || '';

        var rbText = document.createElement('div');
        rbText.className  = 'reply-block-text';
        rbText.textContent = replyInfo.text;

        rb.appendChild(rbTitle);
        rb.appendChild(rbText);

        (function(info){
            rb.addEventListener('click', function(e){
                e.stopPropagation();
                scrollToRepliedMessage(info);
            });
        })(replyInfo);
    }

    if (rb && (msg.attachment_type === 'image' || msg.attachment_type === 'video')) {
        col.appendChild(rb);
        rb = null;
    }

    // ----- МЕДИА (фото / видео) -----
    var mediaWrapper = null;
    if (hasAttachment && (msg.attachment_type === 'image' || msg.attachment_type === 'video')) {
        mediaWrapper = document.createElement('div');
        mediaWrapper.className = 'msg-media-wrapper';

        if (msg.attachment_type === 'image') {
            var bg = document.createElement('div');
            bg.className = 'msg-media-bg';
            bg.style.backgroundImage = 'url("' + msg.attachment_url + '")';
            mediaWrapper.appendChild(bg);

            var imgAtt = document.createElement('img');
            imgAtt.className = 'msg-attachment-image';
            imgAtt.src = msg.attachment_url;
            imgAtt.onerror = function () { this.style.display = 'none'; };
            imgAtt.addEventListener('click', function () {
                openMediaViewer(msg.attachment_url, 'image');
            });
            mediaWrapper.appendChild(imgAtt);
        } else if (msg.attachment_type === 'video') {
            var preview = msg.attachment_preview || null;
            if (preview) {
                var bg2 = document.createElement('div');
                bg2.className = 'msg-media-bg';
                bg2.style.backgroundImage = 'url("' + preview + '")';
                mediaWrapper.appendChild(bg2);
            }

            var videoAtt = document.createElement('video');
            videoAtt.className = 'msg-attachment-video';
            videoAtt.src = msg.attachment_url;
            if (preview) {
                videoAtt.setAttribute('poster', preview);
            }
            videoAtt.muted       = true;
            videoAtt.loop        = true;
            videoAtt.playsInline = true;
            videoAtt.preload     = 'auto';
            videoAtt.autoplay    = true;
            videoAtt.controls    = false;

            videoAtt.addEventListener('canplay', function () {
                videoAtt.play().catch(function(){});
            });

            videoAtt.addEventListener('click', function (e) {
                e.stopPropagation();
                openMediaViewer(msg.attachment_url, 'video');
            });

            mediaWrapper.appendChild(videoAtt);
        }

        col.appendChild(mediaWrapper);
    }

    // ----- ПУЗЫРЬ -----
    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    var isGroupChat = currentChat && (currentChat.type === 'group' || currentChat.type === 'groupCustom');

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

    if (rb) bubble.appendChild(rb);

    // ----- ГОЛОСОВОЕ / АУДИО -----
    if (msg.attachment_type === 'audio' && msg.attachment_url) {
        var voiceWrap = document.createElement('div');
        voiceWrap.className = 'msg-voice';

        var playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'msg-voice-play';
        voiceWrap.appendChild(playBtn);

        var wave = document.createElement('div');
        wave.className = 'msg-voice-wave';
        voiceWrap.appendChild(wave);

        var bars = [];
        var barCount = 20;
        for (var i = 0; i < barCount; i++){
            var b = document.createElement('div');
            b.className = 'msg-voice-wave-bar';

            var seed = (msg.id || 1) * (i + 3);
            var hFactor = 0.3 + ((seed % 100) / 100) * 0.7;
            var baseH = 3;
            var maxH  = 16;
            var h = baseH + (maxH - baseH) * hFactor;
            b.style.height = h + 'px';

            wave.appendChild(b);
            bars.push(b);
        }

        var timeLabel = document.createElement('span');
        timeLabel.className = 'msg-voice-time';
        timeLabel.textContent = '0:00';
        voiceWrap.appendChild(timeLabel);

        bubble.appendChild(voiceWrap);

        var audio = new Audio(msg.attachment_url);
        audio.preload = 'metadata';

        audio.addEventListener('loadedmetadata', function () {
            if (!isNaN(audio.duration)) {
                timeLabel.textContent = formatSecondsToMMSS(audio.duration);
            }
        });

        audio.addEventListener('timeupdate', function () {
            if (!audio.duration || isNaN(audio.duration)) return;
            var ratio = audio.currentTime / audio.duration;
            var playedCount = Math.round(bars.length * ratio);
            bars.forEach(function(b, idx){
                if (idx < playedCount) b.classList.add('played');
                else b.classList.remove('played');
            });
            timeLabel.textContent = formatSecondsToMMSS(audio.currentTime);
        });

        audio.addEventListener('ended', function () {
            playBtn.classList.remove('playing');
            bars.forEach(function(b){ b.classList.remove('played'); });
            if (!isNaN(audio.duration)) {
                timeLabel.textContent = formatSecondsToMMSS(audio.duration);
            }
            if (currentVoiceAudio === audio) {
                currentVoiceAudio   = null;
                currentVoicePlayBtn = null;
            }
        });

        playBtn.addEventListener('click', function (e) {
            e.stopPropagation();

            if (audio.paused) {
                // остановить другое играющее голосовое
                if (currentVoiceAudio && currentVoiceAudio !== audio) {
                    try { currentVoiceAudio.pause(); } catch (err) {}
                    if (currentVoicePlayBtn) {
                        currentVoicePlayBtn.classList.remove('playing');
                    }
                }
                audio.play().catch(function(){});
                playBtn.classList.add('playing');
                currentVoiceAudio   = audio;
                currentVoicePlayBtn = playBtn;
            } else {
                audio.pause();
                playBtn.classList.remove('playing');
                if (currentVoiceAudio === audio) {
                    currentVoiceAudio   = null;
                    currentVoicePlayBtn = null;
                }
            }
        });

        function seekFromEvent(ev){
            if (!audio.duration || isNaN(audio.duration)) return;
            var rect = wave.getBoundingClientRect();
            var x = ev.clientX - rect.left;
            var ratio = Math.max(0, Math.min(1, x / rect.width));
            audio.currentTime = ratio * audio.duration;
        }

        wave.addEventListener('click', function(e){
            e.stopPropagation();
            seekFromEvent(e);
        });

        wave.addEventListener('touchstart', function(e){
            e.stopPropagation();
            var t = e.touches[0];
            seekFromEvent(t);
        }, { passive: true });

        wave.addEventListener('touchmove', function(e){
            e.stopPropagation();
            var t = e.touches[0];
            seekFromEvent(t);
        }, { passive: true });
    }
    // ----- ФАЙЛ (НЕ АУДИО) -----
    if (msg.attachment_type === 'file' && msg.attachment_url) {
        var fileBox = document.createElement('div');
        fileBox.className = 'msg-file-attachment';

        var fname = msg.attachment_name || 'Файл';
        var fileNameDiv = document.createElement('div');
        fileNameDiv.className = 'msg-file-name';
        fileNameDiv.textContent = fname;
        fileBox.appendChild(fileNameDiv);

        if (typeof msg.attachment_size === 'number') {
            var sz = msg.attachment_size;
            if (sz < 0.1) sz = 0.1;
            var sizeDiv = document.createElement('div');
            sizeDiv.className = 'msg-file-size';
            sizeDiv.textContent = sz.toFixed(1) + ' МБ';
            fileBox.appendChild(sizeDiv);
        }

        bubble.appendChild(fileBox);
    }

    // ----- ТЕКСТ -----
    var textDiv = document.createElement('div');
    textDiv.className = 'msg-text';
    if (hasText) {
        textDiv.textContent = mainText;
    }
    bubble.appendChild(textDiv);

    // ----- META -----
    var metaLine = document.createElement('div');
    metaLine.className = 'msg-meta';

    var timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    timeSpan.textContent = formatTime(msg.created_at);
    metaLine.appendChild(timeSpan);

    if (msg.edited) {
        var editedMark = document.createElement('span');
        editedMark.className = 'msg-edited';
        editedMark.textContent = ' (изменено)';
        metaLine.appendChild(editedMark);
    }

    if (isMe) {
        var checksSpan = document.createElement('span');
        checksSpan.className = 'msg-checks';
        checksSpan.textContent = msg.read_by_all ? '✓✓' : '✓';
        metaLine.appendChild(checksSpan);
    }

    bubble.appendChild(metaLine);

    // Reactions
    if (msg.reactions && msg.reactions.length) {
        var reactRow = document.createElement('div');
        reactRow.className = 'msg-reactions';
        msg.reactions.forEach(function (r) {
            var sp = document.createElement('span');
            sp.className = 'msg-reaction';
            if (msg.myReaction === r.emoji) sp.classList.add('my');
            sp.textContent = r.emoji + ' ' + r.count;
            reactRow.appendChild(sp);
        });
        bubble.appendChild(reactRow);
    }

    col.appendChild(bubble);
    item.appendChild(col);
    chatContent.appendChild(item);

    // data‑атрибуты для reply / контекстного меню
    item.dataset.msgId             = msg.id;
    item.dataset.msgText           = mainText;
    item.dataset.msgSenderLogin    = msg.sender_login;
    item.dataset.msgSenderName     = msg.sender_name || msg.sender_login || '';
    item.dataset.msgAttachmentType = msg.attachment_type || '';
    item.dataset.msgAttachmentUrl  = msg.attachment_url || '';

    // свайп для ответа
    item.addEventListener('touchstart', onMsgTouchStart, { passive: true });
    item.addEventListener('touchmove',  onMsgTouchMove,  { passive: true });
    item.addEventListener('touchend',   onMsgTouchEnd);
    item.addEventListener('touchcancel',onMsgTouchEnd);

    item.addEventListener('dblclick', function () {
        startReplyFromElement(item);
    });

    attachMessageInteractions(item, msg);

    // настроить blur‑полосы вокруг медиа (только если действительно нужны)
    adjustMediaBlurForMessage(item);
}

function renderPinnedTop(msg) {
    if (!pinnedTopBar) return;

    if (!msg) {
        pinnedTopBar.style.display = 'none';
        pinnedTopBar.innerHTML = '';
        return;
    }

    var parsed   = parseReplyWrappedText(msg.text || '');
    // Никакого fallback на msg.text — пустая строка допустима
    var mainText = (typeof parsed.mainText === 'string') ? parsed.mainText : (msg.text || '');
    var text     = String(mainText || '').replace(/\s+/g, ' ').trim();

    if (!text) {
        if (msg.attachment_type === 'image')      text = '[Фото]';
        else if (msg.attachment_type === 'video') text = '[Видео]';
        else if (msg.attachment_type === 'file')  text = '[Файл]';
        else if (msg.attachment_type === 'audio') text = 'Голосовое сообщение';
    }

    if (text.length > 80) text = text.slice(0, 77) + '…';

    pinnedTopBar.style.display = 'block';
    pinnedTopBar.innerHTML =
        '<div class="pinned-top-label">Закреплённое сообщение</div>' +
        '<div class="pinned-top-text">' + text + '</div>';

    pinnedTopBar.onclick = function () {
        if (!chatContent) return;
        var el = chatContent.querySelector('.msg-item[data-msg-id="' + msg.id + '"]');
        if (!el) return;

        var offset = el.offsetTop - 40;
        if (offset < 0) offset = 0;
        chatContent.scrollTop = offset;

        el.classList.add('msg-highlight');
        setTimeout(function () { el.classList.remove('msg-highlight'); }, 1000);
    };
}
// ---------- КОНТЕКСТНОЕ МЕНЮ СООБЩЕНИЙ ----------

var msgContextOverlay = null;
var msgContextMenu    = null;
var msgCtxReplyBtn    = null;
var msgCtxEditBtn     = null;
var msgCtxDeleteBtn   = null;
var msgCtxForwardBtn  = null;
var msgCtxPinBtn      = null;
var msgCtxDownloadBtn = null;
var msgCtxEmojiRow    = null;
var currentMsgContext = null;
var msgReactionsList  = ['❤️','👍','👎','😂','🔥'];

// скачать вложение
function downloadMessageAttachment(info) {
    if (!info || !info.attachmentUrl) return;
    var fname = info.attachmentName || 'file';
    var a = document.createElement('a');
    a.href = info.attachmentUrl;
    a.download = fname;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// обработчики для одного сообщения (ПКМ, long-press)
function attachMessageInteractions(item, msg) {
    if (item._msgHandlersAttached) return;
    item._msgHandlersAttached = true;

    var parsed = parseReplyWrappedText(msg.text || '');

    item._msgInfo = {
        id:             msg.id,
        chatId:         msg.chat_id,
        senderLogin:    msg.sender_login,
        senderName:     msg.sender_name || msg.sender_login || '',
        text:           parsed.mainText || '',
        reply:          parsed.reply || null,
        isPinned:       !!msg.is_pinned,
        attachmentType: msg.attachment_type || null,
        attachmentUrl:  msg.attachment_url || null,
        attachmentName: msg.attachment_name || null,
        attachmentSize: typeof msg.attachment_size === 'number' ? msg.attachment_size : null
    };

    item.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        showMsgContextMenu(item._msgInfo);
    });

    var mouseTimer = null;
    item.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        mouseTimer = setTimeout(function () {
            showMsgContextMenu(item._msgInfo);
        }, 600);
    });
    ['mouseup','mouseleave'].forEach(function (ev) {
        item.addEventListener(ev, function () {
            if (mouseTimer) {
                clearTimeout(mouseTimer);
                mouseTimer = null;
            }
        });
    });

    var touchTimer = null;
    item.addEventListener('touchstart', function () {
        touchTimer = setTimeout(function () {
            showMsgContextMenu(item._msgInfo);
        }, 600);
    }, { passive:true });
    item.addEventListener('touchmove', function () {
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    }, { passive:true });
    item.addEventListener('touchend', function () {
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    });
}

function createMsgContextMenu() {
    if (msgContextOverlay) return;

    msgContextOverlay = document.createElement('div');
    msgContextOverlay.className = 'msg-context-overlay';

    msgContextMenu = document.createElement('div');
    msgContextMenu.className = 'msg-context-menu';

    msgCtxReplyBtn   = document.createElement('button');
    msgCtxReplyBtn.className = 'msg-context-btn';
    msgCtxReplyBtn.textContent = 'Ответить';

    msgCtxEditBtn    = document.createElement('button');
    msgCtxEditBtn.className = 'msg-context-btn';
    msgCtxEditBtn.textContent = 'Редактировать';

    msgCtxDeleteBtn  = document.createElement('button');
    msgCtxDeleteBtn.className = 'msg-context-btn msg-context-btn-danger';
    msgCtxDeleteBtn.textContent = 'Удалить';

    msgCtxForwardBtn = document.createElement('button');
    msgCtxForwardBtn.className = 'msg-context-btn';
    msgCtxForwardBtn.textContent = 'Переслать';

    msgCtxPinBtn     = document.createElement('button');
    msgCtxPinBtn.className = 'msg-context-btn';

    msgCtxDownloadBtn = document.createElement('button');
    msgCtxDownloadBtn.className = 'msg-context-btn';
    msgCtxDownloadBtn.textContent = 'Скачать файл';

    msgCtxEmojiRow = document.createElement('div');
    msgCtxEmojiRow.className = 'msg-context-emoji-row';

    msgReactionsList.forEach(function (em) {
        var b = document.createElement('span');
        b.className = 'msg-context-emoji';
        b.textContent = em;
        b.addEventListener('click', function () {
            if (!currentMsgContext) return;
            reactToMessage(currentMsgContext, em);
            hideMsgContextMenu();
        });
        msgCtxEmojiRow.appendChild(b);
    });

    msgContextMenu.appendChild(msgCtxReplyBtn);
    msgContextMenu.appendChild(msgCtxEditBtn);
    msgContextMenu.appendChild(msgCtxDeleteBtn);
    msgContextMenu.appendChild(msgCtxForwardBtn);
    msgContextMenu.appendChild(msgCtxPinBtn);
    msgContextMenu.appendChild(msgCtxDownloadBtn);
    msgContextMenu.appendChild(msgCtxEmojiRow);

    msgContextOverlay.appendChild(msgContextMenu);
    document.body.appendChild(msgContextOverlay);

    msgContextOverlay.addEventListener('click', function (e) {
        if (e.target === msgContextOverlay) hideMsgContextMenu();
    });

    msgCtxReplyBtn.onclick = function () {
        if (!currentMsgContext) return;
        startReplyForMessage({
            id:             currentMsgContext.id,
            senderLogin:    currentMsgContext.senderLogin,
            senderName:     currentMsgContext.senderName,
            text:           currentMsgContext.text,
            attachmentType: currentMsgContext.attachmentType
        });
        hideMsgContextMenu();
    };

    msgCtxEditBtn.onclick = function () {
        if (!currentMsgContext) return;
        editMessage(currentMsgContext);
        hideMsgContextMenu();
    };

    msgCtxDeleteBtn.onclick = function () {
        if (!currentMsgContext) return;
        deleteMessage(currentMsgContext);
        hideMsgContextMenu();
    };

    msgCtxForwardBtn.onclick = function () {
        if (!currentMsgContext) return;
        forwardMessage(currentMsgContext);
        hideMsgContextMenu();
    };

    msgCtxPinBtn.onclick = function () {
        if (!currentMsgContext) return;
        pinMessage(currentMsgContext);
        hideMsgContextMenu();
    };

    msgCtxDownloadBtn.onclick = function () {
        if (!currentMsgContext) return;
        downloadMessageAttachment(currentMsgContext);
        hideMsgContextMenu();
    };
}

function showMsgContextMenu(msgInfo) {
    if (!msgInfo || !currentUser) return;
    createMsgContextMenu();

    currentMsgContext = msgInfo;

    var isMe          = String(msgInfo.senderLogin).toLowerCase() === String(currentUser.login).toLowerCase();
    var hasText       = msgInfo.text && String(msgInfo.text).trim().length > 0;
    var hasAttachment = !!msgInfo.attachmentType;

    msgCtxEditBtn.style.display   = (isMe && (hasText || hasAttachment)) ? '' : 'none';
    msgCtxDeleteBtn.style.display = isMe ? '' : 'none';

    msgCtxPinBtn.textContent = msgInfo.isPinned ? 'Открепить сообщение' : 'Закрепить сообщение';

    if (hasAttachment && msgInfo.attachmentUrl) {
        msgCtxDownloadBtn.style.display = '';
    } else {
        msgCtxDownloadBtn.style.display = 'none';
    }

    msgContextOverlay.classList.add('visible');
}

function hideMsgContextMenu() {
    if (msgContextOverlay) msgContextOverlay.classList.remove('visible');
    currentMsgContext = null;
}

// --- действия над сообщениями ---

var currentEditingMsgId = null;

async function editMessage(msgInfo) {
    if (!currentUser || !currentUser.login) return;
    if (String(msgInfo.senderLogin).toLowerCase() !== String(currentUser.login).toLowerCase()) return;

    if (!chatContent) return;
    var item = chatContent.querySelector('.msg-item[data-msg-id="' + msgInfo.id + '"]');
    if (!item) return;

    var bubble = item.querySelector('.msg-bubble');
    if (!bubble) return;

    var textEl = bubble.querySelector('.msg-text');
    if (!textEl) {
        textEl = document.createElement('div');
        textEl.className = 'msg-text';
        bubble.insertBefore(textEl, bubble.firstChild);
    }

    var metaEl = bubble.querySelector('.msg-meta');
    if (!metaEl) return;

    if (bubble.querySelector('.msg-edit-wrapper')) return;

    if (currentEditingMsgId && currentEditingMsgId !== msgInfo.id) {
        await refreshMessages(true);
    }
    currentEditingMsgId = msgInfo.id;

    stopMessagePolling();

    textEl.style.display = 'none';
    metaEl.style.display = 'none';

    var wrap = document.createElement('div');
    wrap.className = 'msg-edit-wrapper';

    var ta = document.createElement('textarea');
    ta.className = 'msg-edit-input';
    ta.value = msgInfo.text || '';
    wrap.appendChild(ta);

    var actions = document.createElement('div');
    actions.className = 'msg-edit-actions';

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'msg-edit-btn msg-edit-cancel';
    cancelBtn.textContent = 'Отмена';

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'msg-edit-btn msg-edit-save';
    saveBtn.textContent = 'Сохранить';

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    wrap.appendChild(actions);

    bubble.appendChild(wrap);

    cancelBtn.onclick = function () {
        bubble.removeChild(wrap);
        textEl.style.display = '';
        metaEl.style.display = '';
        currentEditingMsgId = null;
        startMessagePolling();
    };

    saveBtn.onclick = async function () {
        var newText = ta.value;
        var trimmed = newText.trim();
        var hasAttachment = !!msgInfo.attachmentType;

        try {
            if (!hasAttachment && trimmed === '') {
                var respDel = await fetch('/api/messages/delete', {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json' },
                    body: JSON.stringify({
                        login: currentUser.login,
                        messageId: msgInfo.id
                    })
                });
                var dataDel = await respDel.json();
                if (!respDel.ok || !dataDel.ok) {
                    alert(dataDel.error || 'Ошибка удаления сообщения');
                    return;
                }
            } else {
                var fullText = newText;
                if (msgInfo.reply) {
                    var r = msgInfo.reply;
                    var rName  = (r.senderName  || r.senderLogin || '').trim();
                    var rLogin = (r.senderLogin || '').trim();
                    var rText  = String(r.text || '').replace(/\s+/g,' ').trim();

                    fullText =
                        '[r]' + rName + '\n' +
                        rLogin + '\n' +
                        rText + '\n[/r]\n' +
                        newText;
                }

                var resp = await fetch('/api/messages/edit', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        login: currentUser.login,
                        messageId: msgInfo.id,
                        text: fullText
                    })
                });
                var data = await resp.json();
                if (!resp.ok || !data.ok) {
                    alert(data.error || 'Ошибка редактирования');
                    return;
                }
            }

            currentEditingMsgId = null;
            startMessagePolling();
            await refreshMessagesKeepingMessage(msgInfo.id);
        } catch (e) {
            alert('Сетевая ошибка при редактировании');
        }
    };

    ta.focus();
}

async function deleteMessage(msgInfo) {
    if (!currentUser || !currentUser.login) return;
    if (String(msgInfo.senderLogin).toLowerCase() !== String(currentUser.login).toLowerCase()) return;

    try {
        var resp = await fetch('/api/messages/delete', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                login:     currentUser.login,
                messageId: msgInfo.id
            })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка удаления');
            return;
        }
        await refreshMessagesKeepingMessage(msgInfo.id);
    } catch (e) {
        alert('Сетевая ошибка при удалении');
    }
}

async function reactToMessage(msgInfo, emoji) {
    if (!currentUser || !currentUser.login) return;

    try {
        var resp = await fetch('/api/messages/react', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                login: currentUser.login,
                messageId: msgInfo.id,
                emoji: emoji
            })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка реакции');
            return;
        }
        await refreshMessages(true);
    } catch (e) {
        alert('Сетевая ошибка при реакции');
    }
}

async function pinMessage(msgInfo) {
    if (!currentUser || !currentUser.login || !currentChat) return;

    var newPinned = !msgInfo.isPinned;

    try {
        var resp = await fetch('/api/messages/pin', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                login:     currentUser.login,
                chatId:    currentChat.id,
                messageId: msgInfo.id,
                pinned:    newPinned
            })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка закрепления');
            return;
        }
        await refreshMessagesKeepingMessage(msgInfo.id);
    } catch (e) {
        alert('Сетевая ошибка при закреплении');
    }
}

// ---------- ПЕРЕСЫЛКА СООБЩЕНИЙ ----------

function renderForwardList() {
    if (!forwardList) return;
    forwardList.innerHTML = '';

    (lastChats || []).forEach(function (ch) {
        var item = document.createElement('div');
        item.className = 'forward-item';
        item.dataset.chatId = ch.id;

        var title = document.createElement('div');
        title.className = 'forward-item-title';
        title.textContent = ch.title || ch.id;

        var subtitle = document.createElement('div');
        subtitle.className = 'forward-item-subtitle';
        subtitle.textContent = buildChatSubtitle(ch) || '';

        item.appendChild(title);
        item.appendChild(subtitle);

        if (forwardSelected[ch.id]) {
            item.classList.add('selected');
        }

        item.addEventListener('click', function () {
            var cid = this.dataset.chatId;
            if (forwardSelected[cid]) {
                delete forwardSelected[cid];
                this.classList.remove('selected');
            } else {
                forwardSelected[cid] = true;
                this.classList.add('selected');
            }
            updateForwardSubmitState();
        });

        forwardList.appendChild(item);
    });
}

function updateForwardSubmitState() {
    if (!forwardSubmitBtn) return;
    var hasAny = Object.keys(forwardSelected).some(function (id) { return forwardSelected[id]; });
    forwardSubmitBtn.disabled = !hasAny;
}

async function openForwardModal(msgInfo) {
    if (!forwardModal) return;
    currentForwardMsg = msgInfo;
    forwardSelected   = {};

    if (!lastChats || !lastChats.length) {
        await reloadChatList();
    }

    renderForwardList();
    updateForwardSubmitState();
    forwardModal.classList.add('visible');
}

function closeForwardModal() {
    if (!forwardModal) return;
    forwardModal.classList.remove('visible');
    currentForwardMsg = null;
    forwardSelected   = {};
}

async function forwardMessage(msgInfo) {
    if (!currentUser || !currentUser.login) return;
    openForwardModal(msgInfo);
}

// ---------- ЗАГРУЗКА / ПУЛЛИНГ СООБЩЕНИЙ ----------

async function loadMessages(chatId) {
    if (chatRenderState && chatId) {
        chatRenderState[chatId] = {
            initialized:              false,
            lastId:                   0,
            pinnedId:                 null,
            firstUnreadId:            null,
            needScrollToFirstUnread:  true
        };
    }
    await refreshMessages(false);
}

function startMessagePolling() {
    if (messagePollInterval) clearInterval(messagePollInterval);

    messagePollInterval = setInterval(async function () {
        if (!chatContent || !currentUser || !currentUser.login || !currentChat) return;
        var fromBottom = chatContent.scrollHeight - (chatContent.scrollTop + chatContent.clientHeight);
        if (fromBottom > 80) return; // пользователь скроллит вверх

        await refreshMessages(false);
    }, 2000);
}

function stopMessagePolling() {
    if (messagePollInterval) {
        clearInterval(messagePollInterval);
        messagePollInterval = null;
    }
}

// ---------- ПУЛЛИНГ СПИСКА ЧАТОВ ----------

function startChatListPolling() {
    if (!currentUser || !currentUser.login) return;

    if (chatListPollInterval) clearInterval(chatListPollInterval);

    chatListPollInterval = setInterval(async function () {
        if (!mainScreen || mainScreen.style.display === 'none') return;
        await reloadChatList();
    }, 2000);
}

function stopChatListPolling() {
    if (chatListPollInterval) {
        clearInterval(chatListPollInterval);
        chatListPollInterval = null;
    }
}

// ---------- НОТИФИКАЦИИ (Notification API, не push) ----------

function ensureNotificationPermission() {
    if (!notificationsSupported) return;
    if (Notification.permission === 'granted') {
        notificationsEnabled = true;
        return;
    }
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(function (perm) {
            if (perm === 'granted') notificationsEnabled = true;
        });
    }
}

function showChatNotification(chat) {
    if (!notificationsSupported || !notificationsEnabled) return;
    if (!chat || !chat.lastMessageText || !chat.lastMessageSenderLogin) return;
    if (!currentUser || !currentUser.login) return;

    if (chat.lastMessageSenderLogin === currentUser.login) return;

    if (currentChat && currentChat.id === chat.id && document.hasFocus()) return;

    if (isChatMuted(chat.id)) return;

    var parsed   = parseReplyWrappedText(chat.lastMessageText || '');
    var mainText = String(parsed.mainText || '').replace(/\s+/g, ' ').trim();
    var text     = mainText;

    if (!text) {
        var att = chat.lastMessageAttachmentType;
        if (att === 'image')      text = '[Фото]';
        else if (att === 'video') text = '[Видео]';
        else if (att === 'file')  text = '[Файл]';
        else if (att === 'audio') text = 'Голосовое сообщение';
        else                      text = '[Сообщение]';
    }

    if (text.length > 80) text = text.slice(0, 77) + '…';

    var isPersonal = (chat.type === 'trainer' || chat.type === 'personal');

    var title, body, icon;
    if (isPersonal) {
        title = chat.title || 'Личное сообщение';
        body  = text;
        icon  = chat.avatar || '/img/default-avatar.png';
    } else {
        title = chat.title || 'Группа';
        var senderName = chat.lastMessageSenderName || chat.lastMessageSenderLogin || 'Сообщение';
        body  = senderName + ': ' + text;
        icon  = chat.avatar ||
            ((chat.type === 'group' || chat.type === 'groupCustom') ? '/logo.png' : '/img/default-avatar.png');
    }

    try {
        var n = new Notification(title, {
            body: body,
            icon: icon,
            tag:  chat.id
        });

        n.onclick = function () {
            window.focus();
            if (currentUser) openChat(chat);
            this.close();
        };
    } catch (e) {}
}

function processChatsForNotifications(chatsArr) {
    if (!notificationsSupported || !notificationsEnabled) return;
    if (!Array.isArray(chatsArr) || !currentUser || !currentUser.login) return;

    chatsArr.forEach(function (chat) {
        if (!chat.id || !chat.lastMessageText || !chat.lastMessageCreatedAt) return;
        if (isChatMuted(chat.id)) return;

        var chatId    = chat.id;
        var createdAt = chat.lastMessageCreatedAt;
        var prev      = lastChatMessageMap[chatId];

        if (!prev) {
            lastChatMessageMap[chatId] = {
                createdAt: createdAt,
                senderLogin: chat.lastMessageSenderLogin
            };
            return;
        }

        if (createdAt > prev.createdAt) {
            lastChatMessageMap[chatId] = {
                createdAt: createdAt,
                senderLogin: chat.lastMessageSenderLogin
            };
            if (chat.lastMessageSenderLogin !== currentUser.login) {
                showChatNotification(chat);
            }
        }
    });
}

async function pollChatsForNotifications() {
    if (!currentUser || !currentUser.login) return;
    if (!notificationsSupported || Notification.permission !== 'granted') return;

    try {
        var resp = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: currentUser.login })
        });
        var data = await resp.json();
        if (!resp.ok) return;

        var chatsArr = data.chats || [];
        lastChats = chatsArr.slice();
        processChatsForNotifications(chatsArr);
    } catch (e) {}
}

function startNotificationPolling() {
    if (!notificationsSupported) return;
    ensureNotificationPermission();

    if (Notification.permission !== 'granted') return;
    notificationsEnabled = true;

    if (chatNotifyInterval) clearInterval(chatNotifyInterval);

    pollChatsForNotifications();
    chatNotifyInterval = setInterval(pollChatsForNotifications, 5000);
}

function stopNotificationPolling() {
    if (chatNotifyInterval) {
        clearInterval(chatNotifyInterval);
        chatNotifyInterval = null;
    }
}

// ---------- WEB PUSH И ИНИЦИАЛИЗАЦИЯ SERVICE WORKER ----------

async function handleOpenChatFromPush(chatId) {
    if (!chatId) return;

    if (!currentUser || !currentUser.login) {
        window._pendingChatIdFromPush = chatId;
        return;
    }

    if (!lastChats || !lastChats.length) {
        try {
            await reloadChatList();
        } catch (e) {}
    }

    var chat = lastChats && lastChats.find(function (ch) { return ch.id === chatId; });

    if (!chat) {
        try {
            await reloadChatList();
            chat = lastChats && lastChats.find(function (ch) { return ch.id === chatId; });
        } catch (e2) {}
    }

    if (chat) openChat(chat);
}

async function initPushForCurrentUser() {
    if (!pushSupported) {
        startNotificationPolling();
        return;
    }
    if (!currentUser || !currentUser.login) return;
    if (!('Notification' in window)) return;

    try {
        var permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
            startNotificationPolling();
            return;
        }

        var reg = await navigator.serviceWorker.register('/sw.js');

        var sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                login: currentUser.login,
                subscription: sub
            })
        });

        pushSubscribed = true;
        stopNotificationPolling();
    } catch (e) {
        startNotificationPolling();
    }
}

// ---------- РЕНДЕР ЧАТОВ (ГЛАВНЫЙ СПИСОК) ----------

function buildChatSubtitle(chat) {
    if (!chat || !currentUser) {
        return chat && chat.subtitle ? chat.subtitle : '';
    }

    var text = '';
    var att  = chat.lastMessageAttachmentType;

    if (chat.lastMessageText) {
        var parsed = parseReplyWrappedText(chat.lastMessageText || '');
        text = String(parsed.mainText || '').replace(/\s+/g, ' ').trim();
    }

    if (!text && att) {
        if (att === 'image')      text = '[Фото]';
        else if (att === 'video') text = '[Видео]';
        else if (att === 'file')  text = '[Файл]';
        else if (att === 'audio') text = 'Голосовое сообщение';
    }
    if (!text) return chat.subtitle || '';

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
    if (full.length > maxLen) full = full.slice(0, maxLen - 3) + '...';

    return full;
}

function renderOrCreateChatItem(chat) {
    if (!chat || !chatList) return null;

    var item = chatItemsById[chat.id];

    if (!item) {
        item = document.createElement('div');
        item.className = 'chat-item';

        var avatarWrapper = document.createElement('div');
        avatarWrapper.className = 'chat-avatar';

        var img = document.createElement('img');
        img.alt = chat.title || '';
        avatarWrapper.appendChild(img);

        var body = document.createElement('div');
        body.className = 'chat-body';

        var title = document.createElement('div');
        title.className = 'chat-title';

        var subtitle = document.createElement('div');
        subtitle.className = 'chat-subtitle';

        body.appendChild(title);
        body.appendChild(subtitle);

        var meta = document.createElement('div');
        meta.className = 'chat-meta';

        item.appendChild(avatarWrapper);
        item.appendChild(body);
        item.appendChild(meta);

        item.addEventListener('click', function () {
            if (suppressChatClick) {
                suppressChatClick = false;
                return;
            }
            openChat(chat);
        });

        var mouseLongPressTimer = null;
        item.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            mouseLongPressTimer = setTimeout(function () {
                showChatContextMenu(chat);
                suppressChatClick = true;
            }, 600);
        });
        ['mouseup','mouseleave'].forEach(function (ev) {
            item.addEventListener(ev, function () {
                if (mouseLongPressTimer) {
                    clearTimeout(mouseLongPressTimer);
                    mouseLongPressTimer = null;
                }
            });
        });

        var touchLongPressTimer = null;
        item.addEventListener('touchstart', function () {
            touchLongPressTimer = setTimeout(function () {
                showChatContextMenu(chat);
                suppressChatClick = true;
            }, 600);
        }, { passive: true });

        item.addEventListener('touchmove', function () {
            if (touchLongPressTimer) {
                clearTimeout(touchLongPressTimer);
                touchLongPressTimer = null;
            }
        }, { passive: true });

        item.addEventListener('touchend', function () {
            if (touchLongPressTimer) {
                clearTimeout(touchLongPressTimer);
                touchLongPressTimer = null;
            }
        });

        chatItemsById[chat.id] = item;
    }

    var avatarWrapperEl = item.querySelector('.chat-avatar');
    var imgEl           = avatarWrapperEl ? avatarWrapperEl.querySelector('img') : null;
    var titleEl         = item.querySelector('.chat-title');
    var subtitleEl      = item.querySelector('.chat-subtitle');
    var metaEl          = item.querySelector('.chat-meta');

    if (titleEl) {
        titleEl.innerHTML = '';
        var titleSpan = document.createElement('span');
        titleSpan.textContent = chat.title || '';
        titleEl.appendChild(titleSpan);

        if (isChatMuted(chat.id)) {
            var muteIcon = document.createElement('img');
            muteIcon.className = 'chat-muted-icon';
            muteIcon.src = 'icons/mute.png';
            muteIcon.alt = 'Muted';
            muteIcon.onerror = function () { this.style.display = 'none'; };
            titleEl.appendChild(muteIcon);
        }
    }

    if (subtitleEl) {
        subtitleEl.textContent = buildChatSubtitle(chat);
    }

    if (imgEl) {
        var defaultUserAvatar  = '/img/default-avatar.png';
        var defaultGroupAvatar = '/group avatar.png';
        var src;

        if (chat.avatar) {
            src = chat.avatar;
        } else if (chat.type === 'group' || chat.type === 'groupCustom') {
            src = defaultGroupAvatar;
        } else {
            src = defaultUserAvatar;
        }

        imgEl.src = src;
        imgEl.alt = chat.title || '';
        imgEl.onerror = function () {
            this.onerror = null;
            if (chat.type === 'group' || chat.type === 'groupCustom') {
                this.src = defaultGroupAvatar;
            } else {
                this.src = defaultUserAvatar;
            }
        };
    }

    if (metaEl) {
        metaEl.innerHTML = '';
        if (chat.unreadCount && chat.unreadCount > 0) {
            var badge = document.createElement('div');
            badge.className = 'chat-unread-badge';
            badge.textContent = chat.unreadCount > 99 ? '99+' : chat.unreadCount;
            metaEl.appendChild(badge);
        }
    }

    item.classList.toggle('chat-pinned', isChatPinned(chat.id));

    return item;
}

function renderChatListFromLastChats() {
    if (!chatList) return;

    chatList.innerHTML = '';
    if (!lastChats || !lastChats.length) return;

    var term = (currentChatSearch || '').trim().toLowerCase();

    lastChats.forEach(function (chat) {
        if (term) {
            var title = (chat.title || '').toLowerCase();
            if (title.indexOf(term) === -1) return;
        }
        var item = renderOrCreateChatItem(chat);
        if (item) chatList.appendChild(item);
    });
}

async function reloadChatList() {
    if (!currentUser || !currentUser.login || !chatList) return;

    try {
        var resp = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: currentUser.login })
        });
        var data = await resp.json();

        if (!resp.ok || !data.ok) {
            showNetworkErrorBanner(data.error || 'Ошибка загрузки чатов');
            return;
        }

        var chatsArr = data.chats || [];

        chatsArr.sort(function (a, b) {
            var ap = isChatPinned(a.id) ? 1 : 0;
            var bp = isChatPinned(b.id) ? 1 : 0;
            if (ap !== bp) return bp - ap;
            var ad = a.lastMessageCreatedAt || '';
            var bd = b.lastMessageCreatedAt || '';
            if (ad === bd) return 0;
            return ad > bd ? -1 : 1;
        });

        lastChats = chatsArr.slice();

        var idSet = new Set(chatsArr.map(function (c) { return c.id; }));
        Object.keys(chatItemsById).forEach(function (id) {
            if (!idSet.has(id)) {
                delete chatItemsById[id];
            }
        });

        renderChatListFromLastChats();
    } catch (e) {
        console.warn('reloadChatList network error:', e);
        showNetworkErrorBanner('Сетевая ошибка при загрузке чатов');
    }
}

// ---------- ПАРТНЕР В ЛИЧНОМ ЧАТЕ ----------

function getChatPartnerLogin(chat) {
    if (!chat || !currentUser) return null;
    var roleLower = (currentUser.role || '').toLowerCase();

    if (chat.type === 'personal') {
        return chat.partnerLogin || null;
    }

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

    // если из модалки группы, прячем её на время
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

        if (!resp.ok || !data.ok) {
            alert(data.error || 'Не удалось получить данные пользователя');
            return;
        }

        var user = data;

        // Аватар
        if (chatUserAvatar) {
            var src = user.avatar || '/img/default-avatar.png';
            chatUserAvatar.src = src;
            chatUserAvatar.onerror = function () {
                this.onerror = null;
                this.src = '/img/default-avatar.png';
            };
        }

        // Имя
        if (chatUserName) {
            var fullName = '';
            if (user.firstName) fullName += user.firstName + ' ';
            if (user.lastName)  fullName += user.lastName;
            chatUserName.textContent = fullName.trim();
        }

        // ID
        if (chatUserId) {
            if (user.publicId) {
                chatUserId.style.display = '';
                chatUserId.textContent   = 'ID: ' + user.publicId;
            } else {
                chatUserId.style.display = 'none';
                chatUserId.textContent   = '';
            }
        }

        // Команда
        if (chatUserTeam) {
            chatUserTeam.textContent = user.team || '';
        }

        // ДР
        if (chatUserDob) {
            if (user.dob) {
                chatUserDob.style.display = '';
                chatUserDob.textContent   = formatDateForProfile(user.dob);
            } else {
                chatUserDob.style.display = 'none';
                chatUserDob.textContent   = '';
            }
        }

        // кнопки по умолчанию скрыты
        if (chatUserBackBtn)   { chatUserBackBtn.style.display   = 'none'; chatUserBackBtn.onclick   = null; }
        if (chatUserWriteBtn)  { chatUserWriteBtn.style.display  = 'none'; chatUserWriteBtn.onclick  = null; }
        if (chatUserRemoveBtn) { chatUserRemoveBtn.style.display = 'none'; chatUserRemoveBtn.onclick = null; }

        // если открыто из модалки группы
        if (userInfoFromGroup) {
            if (chatUserBackBtn) {
                chatUserBackBtn.style.display = '';
                chatUserBackBtn.onclick = function () {
                    hideChatUserModal();
                    if (groupModal) groupModal.classList.add('visible');
                };
            }

            if (chatUserWriteBtn && currentUser && currentUser.login) {
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

            if (chatUserRemoveBtn && currentUser && currentChat && currentChat.type === 'groupCustom') {
                var roleLower = (currentUser.role || '').toLowerCase();
                if (roleLower === 'trainer' || roleLower === 'тренер') {
                    chatUserRemoveBtn.style.display = '';
                    chatUserRemoveBtn.onclick = async function () {
                        try {
                            var resp3 = await fetch('/api/group/remove-member', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    login: currentUser.login,
                                    chatId: currentChat.id,
                                    targetLogin: user.login
                                })
                            });
                            var d3 = await resp3.json();
                            if (!resp3.ok || !d3.ok) {
                                alert(d3.error || 'Ошибка удаления участника');
                                return;
                            }
                            hideChatUserModal();
                            await openGroupModal();
                        } catch (e3) {
                            alert('Сетевая ошибка при удалении участника');
                        }
                    };
                }
            }
        }

        // вложения: только если модалка открыта ИЗ чата (а не из списка участников)
        if (!userInfoFromGroup &&
            chatUserAttachments && chatUserMediaGrid && chatUserFilesList && chatUserAudioList) {

            chatUserAttachments.style.display = 'flex';

            var userTabs = {
                mediaTab: chatUserMediaTab,
                filesTab: chatUserFilesTab,
                audioTab: chatUserAudioTab
            };

            await loadAttachmentsForCurrentChat(
                chatUserAttachments,
                chatUserMediaGrid,
                chatUserFilesList,
                chatUserAudioList,
                userTabs
            );
        } else if (chatUserAttachments) {
            chatUserAttachments.style.display = 'none';
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

    var defaultGroupAvatar = '/group avatar.png';

    if (groupAddAvatar) {
        groupAddAvatar.src = currentGroupInfo.avatar || defaultGroupAvatar;
        groupAddAvatar.onerror = function () {
            this.onerror = null;
            this.src = defaultGroupAvatar;
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

    var defaultGroupAvatar = '/group avatar.png';

    try {
        var resp = await fetch('/api/group/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: currentChat.id })
        });
        var data = await resp.json();

        if (!resp.ok || !data.ok) {
            alert(data.error || 'Не удалось получить информацию о группе');
            return;
        }

        var groupName      = data.name   || currentChat.id || '';
        var groupAvatarUrl = data.avatar || defaultGroupAvatar;
        var members        = data.members || [];
        var membersCount   = data.membersCount || members.length;

        if (groupAvatar) {
            groupAvatar.src = groupAvatarUrl;
            groupAvatar.onerror = function () {
                this.onerror = null;
                this.src = defaultGroupAvatar;
            };
        }

        if (groupNameTitle) groupNameTitle.textContent = groupName;

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
        if (groupNameSaveBtn) groupNameSaveBtn.style.display = 'none';

        if (groupMembersCount) {
            groupMembersCount.textContent = membersCount + ' участников';
        }

        if (groupMembersList) {
            groupMembersList.innerHTML = '';
            members.forEach(function (m) {
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

        var roleLower = (currentUser.role || '').toLowerCase();
        var isTrainer = (roleLower === 'trainer' || roleLower === 'тренер');

        if (editGroupAvatarBtn) editGroupAvatarBtn.style.display = isTrainer ? '' : 'none';
        if (editGroupNameBtn)   editGroupNameBtn.style.display   = isTrainer ? '' : 'none';
        if (groupAddMemberBtn)  groupAddMemberBtn.style.display  = isTrainer ? '' : 'none';

        // вложения для этого группового чата
        if (groupAttachments && groupMediaGrid && groupFilesList && groupAudioList) {
            groupAttachments.style.display = 'flex';

            var groupTabs = {
                mediaTab: groupMediaTab,
                filesTab: groupFilesTab,
                audioTab: groupAudioTab
            };

            await loadAttachmentsForCurrentChat(
                groupAttachments,
                groupMediaGrid,
                groupFilesList,
                groupAudioList,
                groupTabs
            );
        }

        hideGroupAddModal();
        groupModal.classList.add('visible');
    } catch (e) {
        alert('Сетевая ошибка при загрузке группы');
    }
}

// ---------- FEED / ЛЕНТА ----------

var feedList      = document.getElementById('feedList');
var createPostBtn = document.getElementById('createPostBtn');

function renderFeedPost(post) {
    if (!feedList || !post) return;

    var card = document.createElement('div');
    card.className = 'feed-post';

    card.dataset.postId   = String(post.id);
    card.dataset.postText = post.text || '';

    var header = document.createElement('div');
    header.className = 'feed-post-header';

    var aw = document.createElement('div');
    aw.className = 'feed-post-avatar-wrapper';

    var img = document.createElement('img');
    img.className = 'feed-post-avatar';
    img.src = '/logo.png';
    img.onerror = function () { this.onerror = null; this.src = '/logo.png'; };
    aw.appendChild(img);

    var nameEl = document.createElement('div');
    nameEl.className = 'feed-post-author';
    nameEl.textContent = 'Vinyl Dance Family';

    header.appendChild(aw);
    header.appendChild(nameEl);

    var imgPost = null;
    if (post.imageUrl) {
        imgPost = document.createElement('img');
        imgPost.className = 'feed-post-image';
        imgPost.src = post.imageUrl;
        imgPost.onerror = function () { this.style.display = 'none'; };
    }

    var textEl = document.createElement('div');
    textEl.className = 'feed-post-text';
    textEl.textContent = post.text || '';

    var footer = document.createElement('div');
    footer.className = 'feed-post-footer';

    var dateEl = document.createElement('div');
    dateEl.className = 'feed-post-date';
    dateEl.textContent = formatDateTime(post.createdAt);

    footer.appendChild(dateEl);

    card.appendChild(header);
    if (imgPost) card.appendChild(imgPost);
    card.appendChild(textEl);
    card.appendChild(footer);

    var pressTimer = null;

    function startPressTimer() {
        if (!currentUser || !currentUser.role) return;
        var roleLower = currentUser.role.toLowerCase();
        if (roleLower !== 'trainer' && roleLower !== 'тренер') return;

        pressTimer = setTimeout(function () {
            openInlinePostEditor(card);
        }, 600);
    }
    function clearPressTimer() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    }

    card.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        startPressTimer();
    });
    card.addEventListener('mouseup', clearPressTimer);
    card.addEventListener('mouseleave', clearPressTimer);

    card.addEventListener('touchstart', function () {
        startPressTimer();
    }, { passive:true });
    card.addEventListener('touchmove', clearPressTimer, { passive:true });
    card.addEventListener('touchend', clearPressTimer);
    card.addEventListener('touchcancel', clearPressTimer);

    feedList.appendChild(card);
}

function openInlinePostEditor(card) {
    if (!card || !currentUser || !currentUser.login) return;
    if (card.querySelector('.feed-post-edit-wrapper')) return;

    var textEl = card.querySelector('.feed-post-text');
    if (!textEl) return;

    var oldText = card.dataset.postText || textEl.textContent || '';
    var postId  = card.dataset.postId;
    if (!postId) {
        alert('Не удалось определить ID поста');
        return;
    }

    textEl.style.display = 'none';

    var wrap = document.createElement('div');
    wrap.className = 'feed-post-edit-wrapper';

    var ta = document.createElement('textarea');
    ta.className = 'feed-post-edit-input';
    ta.value = oldText;
    wrap.appendChild(ta);

    var actions = document.createElement('div');
    actions.className = 'feed-post-edit-actions';

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'feed-post-edit-btn feed-post-edit-cancel';
    cancelBtn.textContent = 'Отмена';

    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'feed-post-edit-btn feed-post-edit-delete';
    deleteBtn.textContent = 'Удалить';

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'feed-post-edit-btn feed-post-edit-save';
    saveBtn.textContent = 'Сохранить';

    actions.appendChild(cancelBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(saveBtn);
    wrap.appendChild(actions);

    textEl.parentNode.insertBefore(wrap, textEl.nextSibling);

    cancelBtn.onclick = function () {
        wrap.remove();
        textEl.style.display = '';
    };

    saveBtn.onclick = async function () {
        var newText = ta.value.trim();
        if (!newText) {
            alert('Текст поста не может быть пустым');
            return;
        }
        try {
            var resp = await fetch('/api/feed/edit', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                    login:  currentUser.login,
                    postId: Number(postId),
                    text:   newText
                })
            });
            var data = await resp.json();
            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка редактирования поста');
                return;
            }
            card.dataset.postText = newText;
            textEl.textContent    = newText;
            wrap.remove();
            textEl.style.display = '';
        } catch (e) {
            alert('Сетевая ошибка при редактировании поста');
        }
    };

    deleteBtn.onclick = async function () {
        try {
            var resp = await fetch('/api/feed/delete', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                    login:  currentUser.login,
                    postId: Number(postId)
                })
            });
            var data = await resp.json();
            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка удаления поста');
                return;
            }
            if (card.parentNode) card.parentNode.removeChild(card);
        } catch (e) {
            alert('Сетевая ошибка при удалении поста');
        }
    };

    ta.focus();
}

async function loadFeed() {
    if (!currentUser || !currentUser.login || !feedList) return;

    try {
        var resp = await fetch('/api/feed/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: currentUser.login })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка загрузки ленты');
            return;
        }

        var posts = data.posts || [];
        feedList.innerHTML = '';
        posts.forEach(renderFeedPost);
    } catch (e) {
        alert('Сетевая ошибка при загрузке ленты');
    }
}

function openFeedScreen() {
    if (!feedScreen) return;
    if (!currentUser) {
        alert('Сначала войдите в аккаунт');
        return;
    }

    if (mainScreen)        mainScreen.style.display        = 'none';
    if (chatScreen)        chatScreen.style.display        = 'none';
    if (profileScreen)     profileScreen.style.display     = 'none';
    if (createGroupScreen) createGroupScreen.style.display = 'none';

    feedScreen.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'flex';

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();
    stopChatListPolling();

    setNavActive('list');

    if (createPostBtn) {
        var roleLower = (currentUser.role || '').toLowerCase();
        createPostBtn.style.display =
            (roleLower === 'trainer' || roleLower === 'тренер') ? 'block' : 'none';
    }

    loadFeed();
}

// ---------- ЭКРАНЫ: ПОСЛЕ ЛОГИНА / ЧАТ / ПРОФИЛЬ / СОЗДАНИЕ ГРУППЫ ----------

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
    if (mainScreen)       mainScreen.style.display       = 'none';

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();

    if (bottomNav) bottomNav.style.display = 'flex';

    loadPinnedChatsForUser();
    await loadMutedChats();

    openFeedScreen();

    await reloadChatList();
    startChatListPolling();

    initPushForCurrentUser();

    if (window._pendingChatIdFromPush) {
        var cid = window._pendingChatIdFromPush;
        window._pendingChatIdFromPush = null;
        handleOpenChatFromPush(cid);
    }
}

async function openChatsScreen() {
    if (!mainScreen) return;

    if (feedScreen)        feedScreen.style.display        = 'none';
    if (chatScreen)        chatScreen.style.display        = 'none';
    if (profileScreen)     profileScreen.style.display     = 'none';
    if (createGroupScreen) createGroupScreen.style.display = 'none';

    mainScreen.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'flex';

    setNavActive('home');

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();

    await reloadChatList();
    startChatListPolling();
}

async function openChat(chat) {
    if (!chatScreen) return;

    currentChat = chat;

    if (mainScreen)        mainScreen.style.display        = 'none';
    if (feedScreen)        feedScreen.style.display        = 'none';
    if (profileScreen)     profileScreen.style.display     = 'none';
    if (createGroupScreen) createGroupScreen.style.display = 'none';

    chatScreen.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'none';
    setNavActive('home');

    if (chatHeaderTitle) {
        chatHeaderTitle.textContent = chat.title || 'Чат';
    }

    var defaultGroupAvatar = '/group avatar.png';
    var defaultUserAvatar  = '/img/default-avatar.png';
    var avatar;

    if (chat.type === 'group') {
        avatar = defaultGroupAvatar;
    } else if (chat.type === 'groupCustom') {
        avatar = chat.avatar || defaultGroupAvatar;
    } else {
        avatar = chat.avatar || defaultUserAvatar;
    }

    if (chatHeaderAvatar) {
        chatHeaderAvatar.src = avatar;
        chatHeaderAvatar.onerror = function () {
            this.onerror = null;
            if (chat.type === 'group' || chat.type === 'groupCustom') {
                this.src = defaultGroupAvatar;
            } else {
                this.src = defaultUserAvatar;
            }
        };
    }

    if (chatInput) chatInput.value = '';
    if (chatContent) chatContent.innerHTML = '';
    clearReply();

    stopChatListPolling();
    stopMessagePolling();

    await loadMessages(chat.id);

    startMessagePolling();
    startChatStatusUpdates();
}

function openProfileScreen() {
    if (!profileScreen) return;

    if (feedScreen)        feedScreen.style.display        = 'none';
    if (mainScreen)        mainScreen.style.display        = 'none';
    if (chatScreen)        chatScreen.style.display        = 'none';
    if (createGroupScreen) createGroupScreen.style.display = 'none';

    profileScreen.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'flex';

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();
    stopChatListPolling();

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

    if (feedScreen)      feedScreen.style.display      = 'none';
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
    stopChatStatusUpdates();
    stopMessagePolling();
    stopChatListPolling();

    if (groupNameInput) groupNameInput.value = '';
    if (audienceParents) audienceParents.checked = false;
    if (audienceDancers) audienceDancers.checked = false;

    if (ageField) ageField.style.display = 'none';
    if (ageText)  ageText.textContent = 'Выберите возраст участников';
    if (ageValue) ageValue.value = '';
}

// ---------- КОНТЕКСТНОЕ МЕНЮ ЧАТА (МЬЮТ / ЗАКРЕП) ----------

function createChatContextMenu() {
    if (chatContextOverlay) return;

    chatContextOverlay = document.createElement('div');
    chatContextOverlay.className = 'chat-context-overlay';

    chatContextMenu = document.createElement('div');
    chatContextMenu.className = 'chat-context-menu';

    ctxPinBtn = document.createElement('button');
    ctxPinBtn.className = 'chat-context-btn';

    ctxMuteBtn = document.createElement('button');
    ctxMuteBtn.className = 'chat-context-btn';

    chatContextMenu.appendChild(ctxPinBtn);
    chatContextMenu.appendChild(ctxMuteBtn);
    chatContextOverlay.appendChild(chatContextMenu);
    document.body.appendChild(chatContextOverlay);

    chatContextOverlay.addEventListener('click', function (e) {
        if (e.target === chatContextOverlay) hideChatContextMenu();
    });

    ctxPinBtn.onclick = function () {
        if (!contextMenuTargetChat) return;
        toggleChatPin(contextMenuTargetChat);
        hideChatContextMenu();
    };

    ctxMuteBtn.onclick = async function () {
        if (!contextMenuTargetChat) return;
        await toggleChatMute(contextMenuTargetChat);
        hideChatContextMenu();
        await reloadChatList();
    };
}

function hideChatContextMenu() {
    if (chatContextOverlay) chatContextOverlay.style.display = 'none';
    contextMenuTargetChat = null;
}

function showChatContextMenu(chat) {
    if (!chat) return;
    createChatContextMenu();
    contextMenuTargetChat = chat;
    suppressChatClick = true;

    ctxPinBtn.textContent  = isChatPinned(chat.id) ? 'Открепить чат' : 'Закрепить чат';
    ctxMuteBtn.textContent = isChatMuted(chat.id) ? 'Включить уведомления' : 'Выключить уведомления';

    chatContextOverlay.style.display = 'flex';
}

async function toggleChatMute(chat) {
    if (!currentUser || !chat) return;
    var chatId   = chat.id;
    var nowMuted = isChatMuted(chatId);
    var newMuted = !nowMuted;

    try {
        var resp = await fetch('/api/chat/mute/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: chatId,
                muted:  newMuted
            })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка изменения уведомлений');
            return;
        }

        // После успешного изменения на сервере — перечитываем mute‑список
        await loadMutedChats();
    } catch (e) {
        alert('Сетевая ошибка при изменении уведомлений');
    }
}

function toggleChatPin(chat) {
    if (!chat) return;
    var chatId = chat.id;
    if (isChatPinned(chatId)) {
        delete pinnedChats[chatId];
    } else {
        pinnedChats[chatId] = true;
    }
    savePinnedChatsForUser();
    reloadChatList();
}

async function leaveGroup(chat) {
    if (!currentUser || !currentUser.login || !chat) return;
    if (!confirm('Выйти из этой группы?')) return;

    try {
        var resp = await fetch('/api/group/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                login: currentUser.login,
                chatId: chat.id
            })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка выхода из группы');
            return;
        }
        hideChatContextMenu();
        await reloadChatList();
    } catch (e) {
        alert('Сетевая ошибка при выходе из группы');
    }
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
        if (feedScreen)  feedScreen.style.display  = 'none';
        if (bottomNav)   bottomNav.style.display   = 'flex';
        currentChat = null;
        if (chatContent) chatContent.innerHTML = '';
        setNavActive('home');
        hideChatUserModal();
        hideGroupModal();
        hideGroupAddModal();
        clearReply();
        stopChatStatusUpdates();
        stopMessagePolling();
        await reloadChatList();
        startChatListPolling();
    });
}

// поиск по чатам
if (chatSearchInput) {
    chatSearchInput.addEventListener('input', function () {
        currentChatSearch = this.value;
        renderChatListFromLastChats();
    });
}

// нижняя навигация
if (navHomeBtn && mainScreen) {
    navHomeBtn.addEventListener('click', function () {
        openChatsScreen();
    });
}

if (navListBtn && feedScreen) {
    navListBtn.addEventListener('click', function () {
        openFeedScreen();
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

    if (currentChat.type === 'trainer' || currentChat.type === 'personal') {
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

// ПРОФИЛЬ: выход из аккаунта
if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            // игнорируем сетевую ошибку при логауте
        }

        // Сброс клиентского состояния
        currentUser          = null;
        currentChat          = null;
        chatRenderState      = {};
        messagesById         = {};
        pendingAttachments   = [];
        currentReplyTarget   = null;
        mutedChats           = {};
        pinnedChats          = {};
        lastChats            = [];

        stopChatListPolling();
        stopMessagePolling();
        stopChatStatusUpdates();
        stopNotificationPolling();

        if (chatContent) chatContent.innerHTML = '';
        if (chatList)    chatList.innerHTML    = '';
        if (feedList)    feedList.innerHTML    = '';

        // Скрываем все экраны
        if (profileScreen)     profileScreen.style.display     = 'none';
        if (mainScreen)        mainScreen.style.display        = 'none';
        if (chatScreen)        chatScreen.style.display        = 'none';
        if (createGroupScreen) createGroupScreen.style.display = 'none';
        if (feedScreen)        feedScreen.style.display        = 'none';

        // Показываем welcome
        if (welcomeScreen)     welcomeScreen.style.display     = 'flex';
        if (bottomNav)         bottomNav.style.display         = 'none';

        document.body.classList.add('welcome-active');

        // Сброс иконок навигации
        setNavActive('home');
    });
}

// редактирование аватара группы
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
            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка сохранения аватара группы');
                return;
            }

            if (data.avatar && groupAvatar) {
                groupAvatar.src = data.avatar;
                groupAvatar.onerror = function () {
                    this.onerror = null;
                    this.src = '/logo.png';
                };
            }

            if (currentChat && currentChat.type === 'groupCustom' && currentChat.id === currentGroupName) {
                currentChat.avatar = data.avatar || currentChat.avatar;
                if (chatHeaderAvatar) {
                    chatHeaderAvatar.src = currentChat.avatar || '/logo.png';
                    chatHeaderAvatar.onerror = function () {
                        this.onerror = null;
                        this.src = '/logo.png';
                    };
                }
            }

            await reloadChatList();
        } catch (e) {
            alert('Сетевая ошибка при сохранении аватара группы');
        } finally {
            this.value = '';
        }
    });
}

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

        var oldName = currentGroupName;

        try {
            var resp = await fetch('/api/group/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login:  currentUser.login,
                    oldName: oldName,
                    newName: newName
                })
            });
            var data = await resp.json();
            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка переименования группы');
                return;
            }

            currentGroupName = data.newName || newName;

            // обновляем UI названия
            if (groupNameTitle)  groupNameTitle.textContent  = currentGroupName;
            if (chatHeaderTitle) chatHeaderTitle.textContent = currentGroupName;

            // обновляем текущий чат
            if (currentChat) {
                currentChat.id    = currentGroupName;
                currentChat.title = currentGroupName;
            }

            // обновляем инфу о группе в модалке
            if (currentGroupInfo) currentGroupInfo.name = currentGroupName;

            // переносим PIN со старого id на новый
            if (pinnedChats && pinnedChats[oldName]) {
                delete pinnedChats[oldName];
                pinnedChats[currentGroupName] = true;
                savePinnedChatsForUser();
            }

            // перезагружаем mute‑состояния с сервера (chat_mutes уже обновлены на бэке)
            await loadMutedChats();

            groupNameEditInput.style.display = 'none';
            groupNameSaveBtn.style.display   = 'none';

            // перерисовываем список чатов (чтобы sort по pinned/mute сработал)
            await reloadChatList();
        } catch (e) {
            alert('Сетевая ошибка при переименовании группы');
        }
    });
}

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

if (groupAddSubmitBtn && groupAddUserIdInput) {
    groupAddSubmitBtn.addEventListener('click', async function () {
        if (!currentUser || !currentUser.login || !currentChat) {
            alert('Нет данных текущей группы или пользователя');
            return;
        }

        var idVal = groupAddUserIdInput.value.trim();
        if (!idVal) {
            alert('Введите ID участника');
            return;
        }
        if (idVal.length !== 7) {
            alert('ID должен содержать 7 цифр');
            return;
        }

        try {
            var resp = await fetch('/api/group/add-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login: currentUser.login,
                    chatId: currentChat.id,
                    publicId: idVal
                })
            });
            var data = await resp.json();

            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка добавления участника');
                return;
            }

            hideGroupAddModal();
            await openGroupModal();
        } catch (e) {
            alert('Сетевая ошибка при добавлении участника');
        }
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

            await openChatsScreen();
        } catch (e) {
            alert('Сетевая ошибка при создании группы');
        }
    });
}

// ------- РЕГИСТРАЦИЯ / ЛОГИН -------

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
            roleValue.value      = value;
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

// ВВОД ЛОГИНА / ПАРОЛЯ НА ЭКРАНЕ ВХОДА
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

// КНОПКА "Продолжить" НА ЭКРАНЕ ВХОДА
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

// отправка сообщения в чате
if (chatInputForm && chatInput) {
    chatInputForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!currentChat || !currentUser) return;

        var baseText  = chatInput.value.trim();
        var finalText = baseText;

        if (currentReplyTarget) {
            var sName  = currentReplyTarget.senderName  || currentReplyTarget.senderLogin || '';
            var sLogin = currentReplyTarget.senderLogin || '';

            var quoted = String(currentReplyTarget.text || '').replace(/\s+/g, ' ').trim();
            if (quoted.length > 80) quoted = quoted.slice(0, 77) + '…';
            quoted = quoted.replace(/\n/g, ' ');

            var replyId = currentReplyTarget && currentReplyTarget.id ? currentReplyTarget.id : null;
            var header  = replyId ? ('[r:' + replyId + ']') : '[r]';

            finalText = header + sName + '\n' + sLogin + '\n' + quoted + '\n[/r]\n' + baseText;
        }

        if (pendingAttachments && pendingAttachments.length) {
            try {
                for (var i = 0; i < pendingAttachments.length; i++) {
                    var att = pendingAttachments[i];

                    var formData = new FormData();
                    formData.append('file',  att.file);
                    formData.append('login', currentUser.login);
                    formData.append('chatId', currentChat.id);

                    if (i === pendingAttachments.length - 1) {
                        formData.append('text', finalText);
                    } else {
                        formData.append('text', '');
                    }

                    var resp = await fetch('/api/messages/send-file', {
                        method: 'POST',
                        body: formData
                    });
                    var data = await resp.json();

                    if (!resp.ok || !data.ok) {
                        alert(data.error || 'Ошибка отправки файла');
                        break;
                    }
                }
            } catch (e2) {
                alert('Сетевая ошибка при отправке файла');
            }

            pendingAttachments = [];
            renderAttachPreviewBar();

            chatInput.value = '';
            if (typeof autoResizeChatInput === 'function') {
                autoResizeChatInput();
            }
            clearReply();

            await refreshMessages(false);
            if (chatContent) chatContent.scrollTop = chatContent.scrollHeight;
            return;
        }

        if (!finalText) return;

        var payload = {
            chatId:      currentChat.id,
            senderLogin: currentUser.login,
            text:        finalText
        };

        try {
            var resp = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            var data = await resp.json();

            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка отправки сообщения');
                return;
            }

            chatInput.value = '';
            if (typeof autoResizeChatInput === 'function') autoResizeChatInput();
            clearReply();

            await refreshMessages(false);
            if (chatContent) chatContent.scrollTop = chatContent.scrollHeight;
        } catch (e2) {
            alert('Сетевая ошибка при отправке сообщения');
        }
    });
}

// ---------- refreshMessages / refreshMessagesKeepingMessage ----------

var chatRenderState = chatRenderState || {};
var messagesById    = messagesById    || {};

async function refreshMessages(preserveScroll) {
    if (!chatContent || !currentUser || !currentUser.login || !currentChat) return;
    var chatId = currentChat.id;
    if (!chatId) return;

    var prevScrollTop    = chatContent.scrollTop;
    var prevScrollHeight = chatContent.scrollHeight;
    var clientHeight     = chatContent.clientHeight;
    var fromBottom       = prevScrollHeight - (prevScrollTop + clientHeight);

    try {
        var resp = await fetch('/api/messages/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: chatId,
                login:  currentUser.login
            })
        });
        var data = await resp.json();

        if (!resp.ok || !data.ok) {
            console.warn('Ошибка загрузки сообщений:', data.error || '');
            return;
        }

        var messages     = data.messages || [];
        var count        = messages.length;
        var lastId       = count ? messages[count - 1].id : 0;
        var myLastReadId = data.myLastReadId || 0;

        var state = chatRenderState[chatId] || {
            initialized:             false,
            lastId:                  0,
            pinnedId:                null,
            firstUnreadId:           null,
            needScrollToFirstUnread: false
        };

        var needFullRerender =
            !state.initialized || preserveScroll || state.needScrollToFirstUnread;

        var pinnedMsg = messages.find(function (m) { return m.is_pinned; });
        var pinnedId  = pinnedMsg ? pinnedMsg.id : null;

        if (needFullRerender) {
            messagesById = {};
            messages.forEach(function (m) { messagesById[m.id] = m; });

            if (state.needScrollToFirstUnread) {
                var firstUnreadId = null;

                if (currentUser) {
                    for (var i = 0; i < messages.length; i++) {
                        var msg = messages[i];
                        if (msg.sender_login === currentUser.login) continue;
                        if (!myLastReadId || msg.id > myLastReadId) {
                            firstUnreadId = msg.id;
                            break;
                        }
                    }
                }
                state.firstUnreadId = firstUnreadId;
            }

            chatContent.innerHTML = '';

            var firstUnreadIdForRender = state.firstUnreadId;

            messages.forEach(function (m) {
                if (firstUnreadIdForRender && m.id === firstUnreadIdForRender) {
                    var sep = document.createElement('div');
                    sep.className = 'msg-unread-separator';
                    var span = document.createElement('span');
                    span.textContent = 'Непрочитанные сообщения';
                    sep.appendChild(span);
                    chatContent.appendChild(sep);
                }
                renderMessage(m);
            });

            if (typeof renderPinnedTop === 'function') {
                renderPinnedTop(pinnedMsg);
            }

            var newScrollHeight = chatContent.scrollHeight;

            if (state.needScrollToFirstUnread) {
                var targetMsgId = state.firstUnreadId;

                function scrollToTarget() {
                    if (!chatContent) return;

                    var target = null;
                    if (targetMsgId) {
                        target = chatContent.querySelector(
                            '.msg-item[data-msg-id="' + targetMsgId + '"]'
                        );
                    }
                    if (!target) {
                        target = chatContent.querySelector('.msg-unread-separator');
                    }

                    if (!target) {
                        chatContent.scrollTop = chatContent.scrollHeight;
                        return;
                    }

                    var pinnedH = 0;
                    if (pinnedTopBar && pinnedTopBar.style.display !== 'none') {
                        pinnedH = pinnedTopBar.getBoundingClientRect().height || 0;
                    }
                    var extra = 8;
                    var top = target.offsetTop - pinnedH - extra;
                    if (top < 0) top = 0;
                    chatContent.scrollTop = top;
                }

                scrollToTarget();
                setTimeout(scrollToTarget, 300);
                setTimeout(scrollToTarget, 800);

                state.needScrollToFirstUnread = false;
            } else if (preserveScroll) {
                if (fromBottom <= 80) chatContent.scrollTop = newScrollHeight;
                else chatContent.scrollTop = prevScrollTop;
            } else {
                chatContent.scrollTop = newScrollHeight;
            }

            state.initialized = true;
            state.lastId      = lastId;
            state.pinnedId    = pinnedId;
            chatRenderState[chatId] = state;

            updateReadStatusInDom(messages);
            await markChatRead(chatId);
            return;
        }

        var newMessages = messages.filter(function (m) {
            return m.id > state.lastId;
        });

        if (newMessages.length) {
            newMessages.forEach(function (m) {
                messagesById[m.id] = m;
                renderMessage(m);
            });
            state.lastId = lastId;

            if (fromBottom <= 80) {
                chatContent.scrollTop = chatContent.scrollHeight;
            }
        }

        if (state.pinnedId !== pinnedId) {
            state.pinnedId = pinnedId;
            if (typeof renderPinnedTop === 'function') {
                renderPinnedTop(pinnedMsg);
            }
        }

        chatRenderState[chatId] = state;

        updateReadStatusInDom(messages);
        await markChatRead(chatId);
    } catch (e) {
        console.error('refreshMessages error:', e);
        console.warn('Сетевая ошибка при загрузке сообщений');
    }
}

async function refreshMessagesKeepingMessage(messageId) {
    if (!chatContent || !currentUser || !currentUser.login || !currentChat) {
        await refreshMessages(true);
        return;
    }
    if (!messageId) {
        await refreshMessages(true);
        return;
    }

    var elBefore = chatContent.querySelector('.msg-item[data-msg-id="' + messageId + '"]');
    var offsetFromTop = 0;
    if (elBefore) {
        offsetFromTop = elBefore.offsetTop - chatContent.scrollTop;
    }

    await refreshMessages(true);

    var elAfter = chatContent.querySelector('.msg-item[data-msg-id="' + messageId + '"]');
    if (elAfter) {
        var newTop = elAfter.offsetTop - offsetFromTop;
        if (newTop < 0) newTop = 0;
        chatContent.scrollTop = newTop;
    }
}

// ---------- FEED: МОДАЛКА СОЗДАНИЯ ПОСТА ----------

function showPostModal() {
    if (!postModal) return;
    postModal.classList.add('visible');

    currentPostImageFile = null;
    if (postImageInput)    postImageInput.value = '';
    if (postImagePreview)  postImagePreview.style.display = 'none';
    if (postTextInput)     postTextInput.value = '';
}

function hidePostModal() {
    if (!postModal) return;
    postModal.classList.remove('visible');
    currentPostImageFile = null;
}

if (createPostBtn) {
    createPostBtn.addEventListener('click', function () {
        if (!currentUser || !currentUser.login) {
            alert('Сначала войдите в аккаунт');
            return;
        }
        var roleLower = (currentUser.role || '').toLowerCase();
        if (roleLower !== 'trainer' && roleLower !== 'тренер') {
            alert('Создавать посты могут только тренера');
            return;
        }
        showPostModal();
    });
}

if (postCancelBtn) {
    postCancelBtn.addEventListener('click', function () {
        hidePostModal();
    });
}

if (postModal) {
    var postBackdrop = postModal.querySelector('.post-modal-backdrop');
    if (postBackdrop) {
        postBackdrop.addEventListener('click', function () {
            hidePostModal();
        });
    }
}

if (postImageBtn && postImageInput) {
    postImageBtn.addEventListener('click', function () {
        postImageInput.click();
    });

    postImageInput.addEventListener('change', function () {
        var file = this.files && this.files[0];
        currentPostImageFile = file || null;

        if (file && postImagePreview && postImagePreviewImg) {
            var url = URL.createObjectURL(file);
            postImagePreviewImg.src = url;
            postImagePreview.style.display = 'block';
        } else if (postImagePreview) {
            postImagePreview.style.display = 'none';
        }
    });
}

if (postSubmitBtn) {
    postSubmitBtn.addEventListener('click', async function () {
        if (!currentUser || !currentUser.login) {
            alert('Сначала войдите в аккаунт');
            return;
        }
        var roleLower = (currentUser.role || '').toLowerCase();
        if (roleLower !== 'trainer' && roleLower !== 'тренер') {
            alert('Создавать посты могут только тренера');
            return;
        }

        var text = postTextInput ? postTextInput.value.trim() : '';
        if (!text) {
            alert('Введите текст поста');
            return;
        }

        var formData = new FormData();
        formData.append('login', currentUser.login);
        formData.append('text', text);
        if (currentPostImageFile) {
            formData.append('image', currentPostImageFile);
        }

        try {
            var resp = await fetch('/api/feed/create', {
                method: 'POST',
                body: formData
            });
            var data = await resp.json();
            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка создания поста');
                return;
            }

            hidePostModal();
            await loadFeed();
        } catch (e) {
            alert('Сетевая ошибка при создании поста');
        }
    });
}

// ---------- FORWARD МОДАЛКА КНОПКИ ----------

if (forwardCancelBtn) {
    forwardCancelBtn.addEventListener('click', function () {
        closeForwardModal();
    });
}
if (forwardModal) {
    var forwardBackdrop = forwardModal.querySelector('.forward-backdrop');
    if (forwardBackdrop) {
        forwardBackdrop.addEventListener('click', function () {
            closeForwardModal();
        });
    }
}
if (forwardSubmitBtn) {
    forwardSubmitBtn.addEventListener('click', async function () {
        if (!currentForwardMsg || !currentUser || !currentUser.login) return;

        var targets = Object.keys(forwardSelected).filter(function (id) { return forwardSelected[id]; });
        if (!targets.length) return;

        try {
            var resp = await fetch('/api/messages/forward', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login:         currentUser.login,
                    messageId:     currentForwardMsg.id,
                    targetChatIds: targets
                })
            });
            var data = await resp.json();
            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка пересылки сообщения');
                return;
            }

            closeForwardModal();

            if (currentChat && targets.indexOf(String(currentChat.id)) !== -1) {
                await refreshMessages(true);
            }
        } catch (e) {
            alert('Сетевая ошибка при пересылке');
        }
    });
}

// ---------- СООБЩЕНИЯ ОТ SERVICE WORKER ----------

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (event) {
        if (!event.data || !event.data.type) return;

        if (event.data.type === 'OPEN_CHAT') {
            var chatId = event.data.chatId;
            if (!chatId) return;
            handleOpenChatFromPush(chatId);
        }
    });
}

// ---------- ОБРАБОТКА ?chatId= В URL ----------

(function () {
    try {
        if (!('URLSearchParams' in window)) return;
        var params = new URLSearchParams(window.location.search);
        var cid = params.get('chatId');
        if (cid) {
            window._pendingChatIdFromPush = cid;
        }
    } catch (e) {}
})();

// ---------- ОБРАБОТЧИКИ МИКРОФОНА / СВАЙП ----------

// Кнопка микрофона: старт / стоп записи (ОДИН обработчик)
if (chatMicBtn) {
    chatMicBtn.onclick = function () {
        if (!isRecordingVoice) {
            startVoiceRecording();
        } else {
            stopVoiceRecording(true); // остановить и отправить
        }
    };
}

// свайп вправо по input‑бару во время записи = отмена
if (chatInputForm) {
    chatInputForm.addEventListener('touchstart', function (e) {
        if (!isRecordingVoice) return;
        var t = e.touches[0];
        recordTouchStartX = t.clientX;
    }, { passive: true });

    chatInputForm.addEventListener('touchmove', function (e) {
        if (!isRecordingVoice || recordTouchStartX == null) return;
        var t  = e.touches[0];
        var dx = t.clientX - recordTouchStartX;
        if (dx > 60) {
            stopVoiceRecording(false);  // отмена, без отправки
            recordTouchStartX = null;
            if (voiceTimerEl) voiceTimerEl.textContent = 'Отменено';
        }
    }, { passive: true });

    chatInputForm.addEventListener('touchend', function () {
        recordTouchStartX = null;
    });
    chatInputForm.addEventListener('touchcancel', function () {
        recordTouchStartX = null;
    });
}