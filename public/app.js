// app.js — PART 1/4

console.log('app.js loaded');

// ---------- ВИБРАЦИЯ ----------
function vibrate(pattern) {
    if (!navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch(e) {}
}

// ---------- ГЛОБАЛЬНЫЕ ЗАПРЕТЫ / ЖЕСТЫ ----------
//
// РАНЕЕ: глобально запрещали contextmenu + copy/cut/paste.
// Оставляем код, но по умолчанию выключаем, чтобы не ломать UX.

var GLOBAL_CONTEXT_LOCK_ENABLED = false;

// Системное контекстное меню отключаем ВЕЗДЕ,
// кроме полей ввода текста и contenteditable (если включено флагом)
if (GLOBAL_CONTEXT_LOCK_ENABLED) {
    document.addEventListener('contextmenu', function (e) {
        var t = e.target;
        if (
            t &&
            (t.tagName === 'INPUT' ||
             t.tagName === 'TEXTAREA' ||
             t.isContentEditable)
        ) {
            return;
        }
        e.preventDefault();
    });

    // Запрет copy / cut / paste вне текстовых полей
    ['copy', 'cut', 'paste'].forEach(function (evt) {
        document.addEventListener(evt, function (e) {
            var t = e.target;
            if (
                t &&
                (t.tagName === 'INPUT' ||
                 t.tagName === 'TEXTAREA' ||
                 t.isContentEditable)
            ) {
                return;
            }
            e.preventDefault();
        });
    });
}

// ---------- АВТО-ВОССТАНОВЛЕНИЕ СЕССИИ / СПЛЭШ ----------

// beforeinstallprompt для Android/Chrome
window.addEventListener('beforeinstallprompt', function (e) {
    // Chrome по умолчанию показывает свой баннер — отключим
    e.preventDefault();
    deferredInstallPrompt = e;

    // Если экран инструкции уже загружен — показываем кнопку установки
    if (installInstallBtn) {
        installInstallBtn.style.display = 'block';
    }
});

window.addEventListener('load', function () {
    var splash  = document.getElementById('splash');
    var welcome = document.getElementById('welcome');

    (async function () {
        var t0 = Date.now();

        // пробуем восстановить сессию
        var restored = await tryRestoreSession();

        // минимальная пауза, чтобы не мигало (400ms)
        var elapsed   = Date.now() - t0;
        var minDelay  = 400;
        if (elapsed < minDelay) {
            await new Promise(function (r) { setTimeout(r, minDelay - elapsed); });
        }

        if (splash)  splash.style.display  = 'none';
        if (welcome) welcome.style.display = 'none';

        if (!restored) {
            if (welcome) welcome.style.display = 'flex';
            document.body.classList.add('welcome-active');
        } else {
            document.body.classList.remove('welcome-active');
        }
        maybeShowInstallScreen();
    })();
});

// РЕГИСТРАЦИЯ service worker РАНЬШЕ (для PWA/кэша, не только для пушей)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function(e){
        console.warn('SW register error:', e);
    });
}

// ---------- ГЛОБАЛЬНОЕ СОСТОЯНИЕ ----------

// Определяем, запущено ли приложение как standalone PWA (iOS/Android)
var IS_STANDALONE_PWA =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator && window.navigator.standalone === true);

// Определяем, что это iOS (для особой обработки скачивания медиа)
var IS_IOS =
    /iP(hone|od|ad)/i.test(navigator.userAgent) ||
    (navigator.userAgent.indexOf('Mac') !== -1 && 'ontouchend' in document);

// состояние рендера сообщений по чатам
// chatRenderState[chatId] = {
//   initialized: bool,
//   lastId:      number | 0,
//   oldestId:    number | null,
//   pinnedId:    number | null,
//   hasMore:     bool
// }
var chatRenderState = {};
var messagesById    = {};
var lastRenderedChatId = null;

var isLoadingOlderMessages = false;

var msgCtxOpenedAt = 0; // время последнего открытия меню сообщений

// состояние поиска по чатам
var chatSearchInput   = document.getElementById('chatSearchInput');
var currentChatSearch = '';

var installScreen      = document.getElementById('installScreen');
var installContinueBtn = document.getElementById('installContinueBtn');
var installInstallBtn  = document.getElementById('installInstallBtn');
var installDontShow    = document.getElementById('installDontShow');

var deferredInstallPrompt = null;

// вложения в модалке пользователя
var chatUserAttachments   = document.getElementById('chatUserAttachments');
var chatUserMediaTab      = document.getElementById('chatUserMediaTab');
var chatUserFilesTab      = document.getElementById('chatUserFilesTab');
var chatUserAudioTab      = document.getElementById('chatUserAudioTab');
var chatUserMediaGrid     = document.getElementById('chatUserMediaGrid');
var chatUserAudioList     = document.getElementById('chatUserAudioList');

var keyboardOffset = 0;

// вложения в модалке группы
var groupAttachments      = document.getElementById('groupAttachments');
var groupMembersTab       = document.getElementById('groupMembersTab');
var groupMediaTab         = document.getElementById('groupMediaTab');
var groupFilesTab         = document.getElementById('groupFilesTab');
var groupAudioTab         = document.getElementById('groupAudioTab');
var groupMembersPane      = document.getElementById('groupMembersPane');
var groupMediaGrid        = document.getElementById('groupMediaGrid');
var groupAudioList        = document.getElementById('groupAudioList');
var groupBackBtn          = document.getElementById('groupBackBtn');

// текущее проигрываемое аудио в списках вложений (в модалках)
var currentAttachmentAudio     = null;
var currentAttachmentAudioIcon = null;

// FEED CONTEXT MENU (пока не используется как отдельная сущность)
var feedContextOverlay = null;
var feedContextMenu    = null;
var feedCtxEditBtn     = null;
var feedCtxDeleteBtn   = null;
var currentFeedPostCtx = null;
var feedInitialized = false;

var backToMainFromChat = document.getElementById('backToMainFromChat');

// ЭКРАНЫ
var welcomeScreen      = document.getElementById('welcome');
var registerScreen     = document.getElementById('registerScreen');
var parentInfoScreen   = document.getElementById('parentInfoScreen');
var dancerInfoScreen   = document.getElementById('dancerInfoScreen');
var loginScreen        = document.getElementById('loginScreen');
var mainScreen         = document.getElementById('mainScreen');   // список чатов
var chatScreen         = document.getElementById('chatScreen');
var profileScreen      = document.getElementById('profileScreen');
var plusScreen        = document.getElementById('plusScreen');
var createGroupScreen  = document.getElementById('createGroupScreen');
var feedScreen         = document.getElementById('feedScreen');    // лента (главный экран)
var bottomNav          = document.getElementById('bottomNav');

// PLUS SCREEN
var friendIdInput            = document.getElementById('friendIdInput');
var friendAddBtn             = document.getElementById('friendAddBtn');
var openCreateGroupScreenBtn = document.getElementById('openCreateGroupScreenBtn');
var backFromCreateGroup      = document.getElementById('backFromCreateGroup');

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

// ЛОГИН-ЭКРАН
var loginScreenLogin    = document.getElementById('loginScreenLogin');
var loginScreenPassword = document.getElementById('loginScreenPassword');
var loginContinueBtn    = document.getElementById('loginContinueBtn');
var loginScreenTotp     = document.getElementById('loginScreenTotp');
var loginScreenTotpField= document.getElementById('loginScreenTotpField');

// ЧАТ
var chatList         = document.getElementById('chatList');
var chatHeaderTitle  = document.getElementById('chatHeaderTitle');
var chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
var chatHeaderStatus = document.getElementById('chatHeaderStatus');
var chatContent      = document.querySelector('.chat-content');

// ----- ЧЕРНОВИКИ СООБЩЕНИЙ -----
var chatDrafts = {};           // { chatId: 'текст черновика' }
var chatDraftSaveTimer = null;
var DRAFTS_STORAGE_PREFIX = 'chat_drafts_v1_';

function getDraftsStorageKey() {
    if (!currentUser || !currentUser.login) return null;
    return DRAFTS_STORAGE_PREFIX + String(currentUser.login).toLowerCase();
}

function loadChatDraftsForUser() {
    chatDrafts = {};
    var key = getDraftsStorageKey();
    if (!key) return;
    try {
        var raw = localStorage.getItem(key);
        if (!raw) return;
        var obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
            chatDrafts = obj;
        }
    } catch (e) {
        chatDrafts = {};
    }
}

function saveChatDraftsForUser() {
    var key = getDraftsStorageKey();
    if (!key) return;
    try {
        var data = JSON.stringify(chatDrafts || {});
        localStorage.setItem(key, data);
    } catch (e) {}
}

function scheduleSaveCurrentChatDraft() {
    if (!chatInput || !currentChat || !currentChat.id) return;

    var text = chatInput.value || '';

    if (!chatDrafts) chatDrafts = {};
    if (text.trim()) {
        chatDrafts[currentChat.id] = text;
    } else {
        delete chatDrafts[currentChat.id];
    }

    if (chatDraftSaveTimer) clearTimeout(chatDraftSaveTimer);
    chatDraftSaveTimer = setTimeout(saveChatDraftsForUser, 400);
}

if (chatContent) {
    chatContent.addEventListener('scroll', async function () {
        if (!currentChat || !currentUser || !currentUser.login) return;
        var state = chatRenderState[currentChat.id];
        if (!state || !state.initialized || !state.hasMore || isLoadingOlderMessages) return;

        // Загружаем старые сообщения только если прокрутка близко к верху
        if (chatContent.scrollTop > 80) return;

        isLoadingOlderMessages = true;
        try {
            var beforeId = state.oldestId;
            if (!beforeId) {
                state.hasMore = false;
                return;
            }

            // Находим первый "видимый" msg-item, чтобы привязать к нему якорь
            var items = chatContent.querySelectorAll('.msg-item');
            var anchorEl = null;
            for (var i = 0; i < items.length; i++) {
                var el = items[i];
                var top = el.offsetTop;
                if (top >= chatContent.scrollTop - 2) {
                    anchorEl = el;
                    break;
                }
            }
            var anchorId = anchorEl ? anchorEl.dataset.msgId : null;
            var anchorOffset = anchorEl ? (anchorEl.offsetTop - chatContent.scrollTop) : 0;

            var page = await fetchMessagesPage(currentChat.id, beforeId, 40);
            if (!page) return;

            var msgs = page.messages || [];
            if (!msgs.length) {
                state.hasMore = false;
                return;
            }

            state.oldestId = msgs[0].id;
            state.hasMore  = !!page.hasMore;

            var firstMsgEl = chatContent.querySelector('.msg-item');

            // добавляем старые сообщения, но визуально вставляем их сверху
            msgs.forEach(function (m) {
                if (messagesById[m.id]) return;
                messagesById[m.id] = m;

                renderMessage(m); // добавилось в конец
                var el = chatContent.querySelector('.msg-item[data-msg-id="' + m.id + '"]');
                if (el) {
                    if (firstMsgEl) {
                        chatContent.insertBefore(el, firstMsgEl);
                    } else {
                        chatContent.appendChild(el);
                        firstMsgEl = el;
                    }
                }
            });

            // возвращаем пользователя к тому же сообщению (якорю)
            if (anchorId) {
                var newAnchor = chatContent.querySelector('.msg-item[data-msg-id="' + anchorId + '"]');
                if (newAnchor) {
                    chatContent.scrollTop = newAnchor.offsetTop - anchorOffset;
                }
            }
        } finally {
            isLoadingOlderMessages = false;
        }
    });
}

var chatInputForm    = document.getElementById('chatInputForm');
var chatInput        = document.getElementById('chatInput');
var chatAttachBtn    = document.getElementById('chatAttachBtn');
var chatAttachInput  = document.getElementById('chatAttachInput');
var attachPreviewBar = document.getElementById('attachPreviewBar');

// MEDIA VIEWER
var mediaViewer      = document.getElementById('mediaViewer');
var mediaViewerImg   = document.getElementById('mediaViewerImg');
var mediaViewerVideo = document.getElementById('mediaViewerVideo');
var mediaViewerContent = mediaViewer ? mediaViewer.querySelector('.media-viewer-content') : null;

// кастомный контролбар медиавьюера
var mediaViewerCloseBtn    = document.getElementById('mediaViewerCloseBtn');
var mediaViewerTitle       = document.getElementById('mediaViewerTitle');
var mediaViewerPlayPause   = document.getElementById('mediaViewerPlayPause');
var mediaViewerTimelineFill= document.getElementById('mediaViewerTimelineFill');
var mediaViewerTimelineThumb = document.getElementById('mediaViewerTimelineThumb');
var mediaViewerCurrentTime = document.getElementById('mediaViewerCurrentTime');
var mediaViewerTotalTime   = document.getElementById('mediaViewerTotalTime');
var mediaViewerControls    = document.getElementById('mediaViewerControls');

var mediaMsgOverlay = null;
var mediaMsgPreview = null;
var mediaMsgMenu    = null;
var currentMediaMsg = null;

var mediaViewerLoader   = document.getElementById('mediaViewerLoader');

var currentMediaSourceRect = null;
var mediaSwipeStartY = null;
var mediaSwipeDy     = 0;
var mediaViewerIsVideo = false;
var mediaViewerHideUiTimer = null;
var mediaViewerUiVisible = false;

// Зум в медиавьюере
var mediaViewerScale = 1;
var mediaViewerStartScale = 1;
var mediaViewerPanX = 0;
var mediaViewerPanY = 0;
var mediaViewerStartPanX = 0;
var mediaViewerStartPanY = 0;
var mediaViewerPinchStartDist = null;
var mediaViewerLastTouchX = null;
var mediaViewerLastTouchY = null;

// интервалы
var chatStatusInterval   = null;
var messagePollInterval  = null;
var chatListPollInterval = null;

// Notification API
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
var profileAdminBtn  = document.getElementById('profileAdminBtn');

// ADMIN SCREEN
var adminScreen     = document.getElementById('adminScreen');
var adminDbSelect   = document.getElementById('adminDbSelect');
var adminSqlInput   = document.getElementById('adminSqlInput');
var adminSqlRunBtn  = document.getElementById('adminSqlRunBtn');
var adminSqlResult  = document.getElementById('adminSqlResult');

// Admin: пользователи и журнал
var adminUserSearch     = document.getElementById('adminUserSearch');
var adminUserRoleFilter = document.getElementById('adminUserRoleFilter');
var adminUserReloadBtn  = document.getElementById('adminUserReloadBtn');
var adminUsersList      = document.getElementById('adminUsersList');

var adminAuditSearch    = document.getElementById('adminAuditSearch');
var adminAuditReloadBtn = document.getElementById('adminAuditReloadBtn');
var adminAuditList      = document.getElementById('adminAuditList');

var adminUiDbSelect    = document.getElementById('adminUiDbSelect');
var adminTableSelect   = document.getElementById('adminTableSelect');
var adminLoadTableBtn  = document.getElementById('adminLoadTableBtn');
var adminTableContainer= document.getElementById('adminTableContainer');

var admin2faStatus     = document.getElementById('admin2faStatus');
var admin2faEnableBtn  = document.getElementById('admin2faEnableBtn');
var admin2faDisableBtn = document.getElementById('admin2faDisableBtn');
var admin2faSetup      = document.getElementById('admin2faSetup');
var admin2faSecret     = document.getElementById('admin2faSecret');
var admin2faCode       = document.getElementById('admin2faCode');
var admin2faConfirmBtn = document.getElementById('admin2faConfirmBtn');

var admin2faSecret     = document.getElementById('admin2faSecret');

var adminTableLimitInput = document.getElementById('adminTableLimitInput');
var adminLoadMoreBtn     = document.getElementById('adminLoadMoreBtn');

// состояние пагинации
var adminTableCurrentDb     = 'main';
var adminTableCurrentTable  = '';
var adminTableCurrentLimit  = 200;
var adminTableCurrentOffset = 0;
var adminTableCurrentRows   = [];
var adminTableCurrentCols   = [];
var adminTableCurrentPk     = null;

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

var groupAgeLabel     = document.getElementById('groupAgeLabel');
var currentGroupAge   = null;
var currentGroupAudience = null;



// СОЗДАНИЕ ГРУППЫ
var groupNameInput  = document.getElementById('groupNameInput');
var audienceParents = document.getElementById('audienceParents');
var audienceDancers = document.getElementById('audienceDancers');
var ageField        = document.getElementById('ageField');
var ageText         = document.getElementById('ageText');
var ageValue        = document.getElementById('ageValue');
var createGroupBtn  = document.getElementById('createGroupBtn');

// Голосовые сообщения
var hasMediaDevices      = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
var mediaRecorderSupport = typeof window.MediaRecorder !== 'undefined';
var canUseLiveVoiceRecording = hasMediaDevices && mediaRecorderSupport;

var chatSendBtn   = document.getElementById('chatSendBtn');
var chatMicBtn    = document.getElementById('chatMicBtn');
var voiceRecordUi = document.getElementById('voiceRecordUi');
var voiceWaveLive = document.getElementById('voiceWaveLive');
var voiceTimerEl  = document.getElementById('voiceTimer');
var voiceFileInput= document.getElementById('voiceFileInput');

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

// текущее проигрываемое голосовое сообщение
var currentVoiceAudio   = null;
var currentVoicePlayBtn = null;

var ws = null;
var wsReconnectTimer = null;

// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
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

var swipeActive = false;
var swipeLastDx = 0;
var swipeVibratedReply = false;

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

// МЬЮТЫ / ЗАКРЕПЫ / КОНТЕКСТНОЕ МЕНЮ ЧАТА
var mutedChats  = {}; // { chatId: true }
var pinnedChats = {}; // { chatId: true }

var chatContextOverlay    = null;
var chatContextMenu       = null;
var ctxPinBtn             = null;
var ctxMuteBtn            = null;
var contextMenuTargetChat = null;
var contextMenuTargetChatItem = null;
var suppressChatClick     = false;

// КОНТЕКСТНОЕ МЕНЮ СООБЩЕНИЙ
var msgContextOverlay = null;
var msgContextMenu    = null;
var msgCtxReplyBtn    = null;
var msgCtxEditBtn     = null;
var msgCtxDeleteBtn   = null;
var msgCtxForwardBtn  = null;
var msgCtxDownloadBtn = null;
var msgCtxCopyBtn     = null;
var msgCtxEmojiRow    = null;
var currentMsgContext = null;
var currentMsgContextItem = null;
var msgReactionsList  = ['❤️','👍','👎','😂','🔥'];

// флаг: нужно проигнорировать первый click по оверлею после открытия меню
var suppressNextMsgOverlayClick = false;

// СЕТЕВОЙ БАННЕР
var networkBanner      = document.getElementById('networkBanner');
var networkBannerTimer = null;

// ПЕРЕСЫЛКА
var forwardModal      = document.getElementById('forwardModal');
var forwardList       = document.getElementById('forwardList');
var forwardCancelBtn  = document.getElementById('forwardCancelBtn');
var forwardSubmitBtn  = document.getElementById('forwardSubmitBtn');
var currentForwardMsg = null;
var forwardSelected   = {}; // { chatId: true }

// для фикса "подпрыгивания" при первой загрузке чата
var chatJustOpenedAt = 0;

var chatLoadingOverlay = document.getElementById('chatLoadingOverlay');

var voiceRecordHint = document.querySelector('.voice-record-hint');

var suppressFeedReloadUntil = 0; // тайм-аут, пока не перерисовывать ленту по feedUpdated



// --- управление микрофоном: удержание + свайп влево для отмены ---

var micTouchStartX = null;
var micTouchStartY = null;
var micGestureActive = false;

function patchMessageDomFromData(msg) {
    if (!chatContent || !msg) return;

    var item = chatContent.querySelector('.msg-item[data-msg-id="' + msg.id + '"]');
    if (!item) return;

    var bubble = item.querySelector('.msg-bubble');
    if (!bubble) return;

    // разбор текста с [r]...[/r]
    var parsed  = parseReplyWrappedText(msg.text || '');
    var mainText = (typeof parsed.mainText === 'string') ? parsed.mainText : (msg.text || '');
    var cleanMain = (mainText || '').toString();

    // Обновляем текст
    var textDiv = bubble.querySelector('.msg-text');
    if (textDiv) {
        linkifyText(textDiv, cleanMain);
    }
    item.dataset.msgText = cleanMain;

    // Обновляем "(изменено)"
    var metaLine = bubble.querySelector('.msg-meta');
    if (metaLine) {
        var editedSpan = metaLine.querySelector('.msg-edited');
        if (msg.edited) {
            if (!editedSpan) {
                editedSpan = document.createElement('span');
                editedSpan.className = 'msg-edited';
                editedSpan.textContent = ' (изменено)';
                metaLine.appendChild(editedSpan);
            }
        } else if (editedSpan) {
            editedSpan.parentNode.removeChild(editedSpan);
        }
    }

    // Обновляем реакции
    var reactRow = bubble.querySelector('.msg-reactions');
    var list = msg.reactions || [];
    if (!list.length) {
        if (reactRow && reactRow.parentNode) reactRow.parentNode.removeChild(reactRow);
    } else {
        if (!reactRow) {
            reactRow = document.createElement('div');
            reactRow.className = 'msg-reactions';
            bubble.appendChild(reactRow);
        }
        reactRow.innerHTML = '';
        list.forEach(function (r) {
            var sp = document.createElement('span');
            sp.className = 'msg-reaction';
            if (msg.myReaction === r.emoji) sp.classList.add('my');
            sp.textContent = r.emoji + ' ' + r.count;
            reactRow.appendChild(sp);
        });
    }

    // Обновляем кэш msgInfo внутри элемента (если есть)
    if (item._msgInfo) {
        item._msgInfo.text       = cleanMain;
        item._msgInfo.reactions  = msg.reactions || [];
        item._msgInfo.myReaction = msg.myReaction || null;
    }
}

function isCurrentUserAdmin(){
    return currentUser && (currentUser.role || '').toLowerCase() === 'admin';
}

function escapeHtml(str){
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, function(ch){
        switch(ch){
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return ch;
        }
    });
}

function maybeShowInstallScreen() {
    console.log('maybeShowInstallScreen: start', {
        hasInstallScreen: !!installScreen,
        IS_STANDALONE_PWA: IS_STANDALONE_PWA
    });

    if (!installScreen) return;

    // Если приложение уже установлено как standalone PWA — инструкцию не показываем
    if (IS_STANDALONE_PWA) {
        console.log('maybeShowInstallScreen: standalone PWA, skip');
        return;
    }

    // Пока ОТКЛЮЧАЕМ проверку localStorage, чтобы точно увидеть экран
    // try {
    //     var skip = localStorage.getItem('installGuideHidden');
    //     if (skip === '1') {
    //         console.log('maybeShowInstallScreen: hidden by user');
    //         return;
    //     }
    // } catch (e) {}

    installScreen.style.display = 'flex';
    installScreen.setAttribute('aria-hidden','false');
    try { window.scrollTo(0, 0); } catch (e) {}

    // Если beforeinstallprompt уже был — покажем кнопку установки
    if (deferredInstallPrompt && installInstallBtn) {
        installInstallBtn.style.display = 'block';
    }

    console.log('maybeShowInstallScreen: shown');
}

function ensureMediaMsgOverlay(){
    if (mediaMsgOverlay) return;

    mediaMsgOverlay = document.createElement('div');
    mediaMsgOverlay.className = 'media-msg-overlay';

    mediaMsgPreview = document.createElement('div');
    mediaMsgPreview.className = 'media-msg-preview';

    mediaMsgMenu = document.createElement('div');
    mediaMsgMenu.className = 'media-msg-menu';

    mediaMsgOverlay.appendChild(mediaMsgPreview);
    mediaMsgOverlay.appendChild(mediaMsgMenu);

    document.body.appendChild(mediaMsgOverlay);

    // клик по фону (но не по меню) — закрыть
    mediaMsgOverlay.addEventListener('click', function(e){
        if (e.target === mediaMsgOverlay) {
            hideMediaMsgOverlay();
        }
    });
}

function hideMediaMsgOverlay(){
    if (!mediaMsgOverlay) return;
    mediaMsgOverlay.classList.remove('visible');
    mediaMsgPreview.innerHTML = '';
    mediaMsgMenu.innerHTML    = '';

    if (currentMediaMsg && currentMediaMsg.item) {
        currentMediaMsg.item.classList.remove('msg-media-hidden');
    }
    currentMediaMsg = null;
}

function initGroupAgeEditing() {
    if (!groupAgeLabel) return;

    groupAgeLabel.addEventListener('click', async function () {
        if (!currentUser || !currentUser.login || !currentGroupName) return;

        var roleLower = (currentUser.role || '').toLowerCase();
        if (roleLower !== 'trainer' && roleLower !== 'тренер') return;

        // Только для кастомных групп и только для audience = dancers
        if (currentChat && currentChat.type !== 'groupCustom') return;
        if (currentGroupAudience !== 'dancers') return;

        var allowedAges = ['5+','7+','9+','10+','12+','14+','18+'];
        var current = currentGroupAge || '';
        var input = prompt(
            'Введите возраст для группы (варианты: ' + allowedAges.join(', ') + ')',
            current
        );
        if (!input) return;
        input = input.trim();
        if (!allowedAges.includes(input)) {
            alert('Некорректный возраст. Используйте: ' + allowedAges.join(', '));
            return;
        }

        try {
            var resp = await fetch('/api/group/set-age', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login: currentUser.login,
                    groupName: currentGroupName,
                    age: input
                })
            });
            var data = await resp.json();
            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка изменения возраста');
                return;
            }

            currentGroupAge = data.age || input;
            if (groupAgeLabel) {
                groupAgeLabel.textContent = currentGroupAge;
            }

            // обновим список чатов, чтобы подзаголовки были актуальны
            await reloadChatList();
        } catch (e) {
            alert('Сетевая ошибка при изменении возраста группы');
        }
    });
}

function showMediaContextMenu(msgInfo, item){
    ensureMediaMsgOverlay();
    if (!mediaMsgOverlay || !mediaMsgPreview || !mediaMsgMenu) return;
    if (!msgInfo || !item) return;

    currentMediaMsg = { info: msgInfo, item: item };

    var type   = msgInfo.attachmentType || item.dataset.msgAttachmentType || '';
    var attUrl = msgInfo.attachmentUrl  || item.dataset.msgAttachmentUrl  || '';

    // Пытаемся взять URL превью (для видео) из messagesById
    var previewUrl = null;
    if (messagesById && msgInfo.id && messagesById[msgInfo.id]) {
        previewUrl = messagesById[msgInfo.id].attachment_preview || null;
    }

    mediaMsgPreview.innerHTML = '';
    mediaMsgMenu.innerHTML    = '';

    var mediaEl = item.querySelector('.msg-attachment-image') ||
                item.querySelector('.msg-attachment-video');
    if (!mediaEl) {
        // fallback в обычное меню, но с флагом, чтобы избежать рекурсии
        msgInfo._disableMediaMenu = true;
        showMsgContextMenu(msgInfo, item);
        delete msgInfo._disableMediaMenu;
        return;
    }

    // Скрываем оригинал под overlay
    item.classList.add('msg-media-hidden');

    var rect = mediaEl.getBoundingClientRect();
    var vw   = window.innerWidth  || 375;
    var vh   = window.innerHeight || 667;

    var startTop    = rect.top;
    var startLeft   = rect.left;
    var startWidth  = rect.width;
    var startHeight = rect.height;

    // Создаём превью КАРТИНКУ.
    // Для фото – само изображение,
    // Для видео – jpeg-превью, если есть, иначе сам видео-файл (покажется первый кадр).
    var inner = document.createElement('img');
    inner.style.width      = '100%';
    inner.style.height     = '100%';
    inner.style.objectFit  = 'contain';
    inner.style.display    = 'block';
    inner.src = (type === 'video' && previewUrl) ? previewUrl : attUrl;
    inner.onerror = function () { this.style.display = 'none'; };

    mediaMsgPreview.innerHTML = '';
    mediaMsgPreview.appendChild(inner);

    mediaMsgPreview.style.top    = startTop   + 'px';
    mediaMsgPreview.style.left   = startLeft  + 'px';
    mediaMsgPreview.style.width  = startWidth + 'px';
    mediaMsgPreview.style.height = startHeight+ 'px';
    mediaMsgPreview.style.opacity= '1';

    mediaMsgOverlay.classList.add('visible');

    // Целевое положение — сверху по центру
    var targetWidth  = Math.min(startWidth || (vw * 0.9), vw * 0.9);
    var aspect       = (startHeight > 0 && startWidth > 0) ? (startWidth / startHeight) : 1;
    if (!isFinite(aspect) || aspect <= 0) aspect = 1;

    var targetHeight = targetWidth / aspect;
    if (targetHeight > vh * 0.5) {
        targetHeight = vh * 0.5;
        targetWidth  = targetHeight * aspect;
    }

    var targetTop  = 80; // отступ сверху
    var targetLeft = (vw - targetWidth) / 2;

    // Плавная анимация в следующий кадр
    requestAnimationFrame(function(){
        mediaMsgPreview.style.top    = targetTop   + 'px';
        mediaMsgPreview.style.left   = targetLeft  + 'px';
        mediaMsgPreview.style.width  = targetWidth + 'px';
        mediaMsgPreview.style.height = targetHeight+ 'px';

        var menuTop = targetTop + targetHeight + 12;
        mediaMsgMenu.style.top = menuTop + 'px';
    });

    // Собираем кнопки меню (Открыть, Ответить, Переслать, Скачать, Закрепить, Редактировать, Удалить, реакции)
    buildMediaMsgMenuButtons(msgInfo, type, attUrl);
}

async function adminLoad2faStatus() {
    if (!isCurrentUserAdmin() || !admin2faStatus) return;
    try {
        var resp = await fetch('/api/admin/2fa/status', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({})
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            admin2faStatus.textContent = data.error || 'Ошибка загрузки статуса 2FA';
            if (admin2faSetup) admin2faSetup.style.display = 'none';
            return;
        }

        if (data.enabled) {
            admin2faStatus.textContent = 'Состояние: 2FA включена';
            if (admin2faEnableBtn)  admin2faEnableBtn.style.display  = 'none';
            if (admin2faDisableBtn) admin2faDisableBtn.style.display = '';
            if (admin2faSetup)      admin2faSetup.style.display      = 'none';
        } else {
            admin2faStatus.textContent = 'Состояние: 2FA выключена';
            if (admin2faEnableBtn)  admin2faEnableBtn.style.display  = '';
            if (admin2faDisableBtn) admin2faDisableBtn.style.display = 'none';
            if (admin2faSetup)      admin2faSetup.style.display      = 'none';
        }

        if (admin2faCode) admin2faCode.value = '';
    } catch (e) {
        admin2faStatus.textContent = 'Сетевая ошибка при загрузке статуса 2FA';
        if (admin2faSetup) admin2faSetup.style.display = 'none';
    }
}

async function adminStart2faSetup() {
    if (!isCurrentUserAdmin() || !admin2faSetup || !admin2faSecret) return;
    try {
        var resp = await fetch('/api/admin/2fa/create-secret', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({})
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка генерации секрета 2FA');
            return;
        }
        admin2faSecret.textContent = data.base32 || '';
        if (admin2faSetup) admin2faSetup.style.display = 'block';
        if (admin2faCode) admin2faCode.value = '';
        admin2faStatus.textContent = 'Секрет сгенерирован. Добавьте его в приложение и введите код ниже.';
        if (admin2faEnableBtn)  admin2faEnableBtn.style.display  = 'none';
        if (admin2faDisableBtn) admin2faDisableBtn.style.display = 'none';
    } catch (e) {
        alert('Сетевая ошибка при генерации секрета 2FA');
    }
}

async function adminConfirm2fa() {
    if (!isCurrentUserAdmin() || !admin2faCode) return;
    var code = admin2faCode.value.trim();
    if (!/^\d{6}$/.test(code)) {
        alert('Введите 6‑значный код из приложения');
        return;
    }
    try {
        var resp = await fetch('/api/admin/2fa/confirm', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({ code: code })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка подтверждения 2FA');
            return;
        }
        alert('2FA включена');
        adminLoad2faStatus();
    } catch (e) {
        alert('Сетевая ошибка при подтверждении 2FA');
    }
}

async function adminDisable2fa() {
    if (!isCurrentUserAdmin()) return;
    if (!confirm('Выключить 2FA для этого администратора?')) return;
    try {
        var resp = await fetch('/api/admin/2fa/disable', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({})
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка отключения 2FA');
            return;
        }
        alert('2FA выключена');
        adminLoad2faStatus();
    } catch (e) {
        alert('Сетевая ошибка при отключении 2FA');
    }
}

// Админ: 2FA
if (admin2faEnableBtn) {
    admin2faEnableBtn.addEventListener('click', function () {
        if (!isCurrentUserAdmin()) {
            alert('Доступ только для администратора');
            return;
        }
        adminStart2faSetup();
    });
}
if (admin2faConfirmBtn) {
    admin2faConfirmBtn.addEventListener('click', function () {
        if (!isCurrentUserAdmin()) {
            alert('Доступ только для администратора');
            return;
        }
        adminConfirm2fa();
    });
}
if (admin2faDisableBtn) {
    admin2faDisableBtn.addEventListener('click', function () {
        if (!isCurrentUserAdmin()) {
            alert('Доступ только для администратора');
            return;
        }
        adminDisable2fa();
    });
}
if (admin2faCode) {
    admin2faCode.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 6);
    });
}

function buildMediaMsgMenuButtons(msgInfo, type, attUrl){
    function addBtn(text, cls, handler){
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'media-msg-menu-btn' + (cls ? ' ' + cls : '');
        b.textContent = text;
        b.addEventListener('click', function(e){
            e.stopPropagation();
            hideMediaMsgOverlay();
            handler && handler();
        });
        mediaMsgMenu.appendChild(b);
    }

    // очищаем меню перед построением
    mediaMsgMenu.innerHTML = '';

    var isMe = currentUser &&
        String(msgInfo.senderLogin).toLowerCase() === String(currentUser.login).toLowerCase();

    // Открыть в полноэкранном просмотре
    addBtn('Открыть', '', function () {
        openMediaViewer(attUrl, type === 'video' ? 'video' : 'image');
    });

    // Ответить
    addBtn('Ответить', '', function () {
        startReplyForMessage({
            id:             msgInfo.id,
            senderLogin:    msgInfo.senderLogin,
            senderName:     msgInfo.senderName,
            text:           msgInfo.text,
            attachmentType: msgInfo.attachmentType
        });
    });

    // Переслать
    addBtn('Переслать', '', function () {
        forwardMessage(msgInfo);
    });

    // Скачать / открыть файл
    addBtn('Скачать', '', function () {
        downloadMessageAttachment(msgInfo);
    });

    // Закрепить / открепить
// Редактировать / удалить — только свои
    if (isMe) {
        addBtn('Редактировать', '', function () {
            editMessage(msgInfo);
        });
        addBtn('Удалить', 'media-msg-menu-btn-danger', function () {
            deleteMessage(msgInfo);
        });
    }

    // ВМЕСТО "Отмена": строка реакций
    var emojiRow = document.createElement('div');
    emojiRow.className = 'msg-context-emoji-row';

    (msgReactionsList || ['❤️','👍','👎','😂','🔥']).forEach(function (em) {
        var span = document.createElement('span');
        span.className = 'msg-context-emoji';
        span.textContent = em;
        span.addEventListener('click', function(e){
            e.stopPropagation();
            hideMediaMsgOverlay();
            reactToMessage(msgInfo, em);
        });
        emojiRow.appendChild(span);
    });

    mediaMsgMenu.appendChild(emojiRow);
}

function attachIdCopyHandler(el) {
    if (!el) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', function () {
        var text = el.textContent || '';
        var match = text.match(/\d{5,}/); // ищем хотя бы 5 подряд идущих цифр
        if (!match) return;
        var id = match[0];

        function done() { showInfoBanner('ID скопирован'); }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(id).then(done).catch(done);
        } else {
            var ta = document.createElement('textarea');
            ta.value = id;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta);
            done();
        }
    });
}

// Вызов
attachIdCopyHandler(profileIdEl);
attachIdCopyHandler(chatUserId);

// Копировать секрет 2FA по клику
if (admin2faSecret) {
    admin2faSecret.style.cursor = 'pointer';
    admin2faSecret.title = 'Нажмите, чтобы скопировать';

    admin2faSecret.addEventListener('click', function () {
        var text = admin2faSecret.textContent || '';
        if (!text.trim()) return;

        function done() {
            if (typeof showInfoBanner === 'function') {
                showInfoBanner('Секрет скопирован в буфер');
            } else {
                alert('Секрет скопирован');
            }
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(done);
        } else {
            // fallback для старых браузеров
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta);
            done();
        }
    });
}

function applyAdminTableFilters() {
    if (!adminTableContainer) return;

    // Собираем фильтры вида { colName: 'значение' }
    var filters = {};
    var filterInputs = adminTableContainer.querySelectorAll('.admin-table-filter-input');
    for (var i = 0; i < filterInputs.length; i++) {
        var inp = filterInputs[i];
        var col = inp.dataset.col;
        if (!col) continue;
        var val = (inp.value || '').toLowerCase();
        filters[col] = val;
    }

    var rows = adminTableContainer.querySelectorAll('.admin-table tbody tr[data-row-id]');
    for (var r = 0; r < rows.length; r++) {
        var tr = rows[r];
        var rowId = tr.getAttribute('data-row-id');
        if (!rowId || rowId === '__new__') continue; // новую строку не фильтруем

        var visible = true;

        // Проверяем каждое непустое условие фильтра
        for (var colName in filters) {
            if (!filters.hasOwnProperty(colName)) continue;
            var f = filters[colName];
            if (!f) continue;

            // ищем в строке input с data-col=colName
            var cellInputs = tr.querySelectorAll('.admin-table-input');
            var cellVal = '';
            for (var j = 0; j < cellInputs.length; j++) {
                var ci = cellInputs[j];
                if (ci.dataset.col === colName) {
                    cellVal = (ci.value || '').toLowerCase();
                    break;
                }
            }

            if (cellVal.indexOf(f) === -1) {
                visible = false;
                break;
            }
        }

        tr.style.display = visible ? '' : 'none';
    }
}

function applyKeyboardOffset() {
    var offset = keyboardOffset || 0;

    if (chatInputForm) chatInputForm.style.transform = offset ? ('translateY(-' + offset + 'px)') : '';
    if (replyBar)      replyBar.style.transform      = offset ? ('translateY(-' + offset + 'px)') : '';
    if (attachPreviewBar) attachPreviewBar.style.transform = offset ? ('translateY(-' + offset + 'px)') : '';

    updateFloatingBarsPosition();
}

if (window.visualViewport) {
    visualViewport.addEventListener('resize', function () {
        // На многих браузерах высота visualViewport уменьшается при появлении клавиатуры
        var offset = window.innerHeight - visualViewport.height;
        keyboardOffset = offset > 0 ? offset : 0;
        applyKeyboardOffset();
    });

    visualViewport.addEventListener('scroll', function () {
        // На iOS иногда ещё и сдвигается сам visual viewport
        var offset = window.innerHeight - visualViewport.height;
        keyboardOffset = offset > 0 ? offset : 0;
        applyKeyboardOffset();
    });
}

// На фокус в textarea скроллим контент к низу
if (chatInput) {
    chatInput.addEventListener('focus', function () {
        if (chatContent) {
            chatContent.scrollTop = chatContent.scrollHeight;
        }
    });
    chatInput.addEventListener('blur', function () {
        keyboardOffset = 0;
        applyKeyboardOffset();
    });
}

function connectWebSocket() {
    if (!('WebSocket' in window)) return;
    if (!currentUser || !currentUser.login) return;

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
    }

    var protocol = (location.protocol === 'https:') ? 'wss:' : 'ws:';
    var wsUrl    = protocol + '//' + location.host + '/ws';

    try {
        ws = new WebSocket(wsUrl);
    } catch (e) {
        return;
    }

    ws.onopen = function () {
        try {
            ws.send(JSON.stringify({
                type: 'auth',
                login: currentUser.login
            }));
        } catch (e) {}
    };

    ws.onmessage = function (ev) {
        var data;
        try {
            data = JSON.parse(ev.data);
        } catch (e) {
            return;
        }

        if (data.type === 'chatUpdated' && data.chatId) {
            if (currentChat && currentChat.id === data.chatId) {
                refreshMessages(false);
            }
            reloadChatList();
        } else if (data.type === 'feedUpdated') {
            if (feedScreen && feedScreen.style.display !== 'none') {
                var now = Date.now();
                // если только что сами лайкали пост – не перерисовываем ленту
                if (now < suppressFeedReloadUntil) return;
                loadFeed();
            }
        }
    };

    ws.onclose = function () {
        ws = null;
        if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
        if (currentUser && currentUser.login) {
            wsReconnectTimer = setTimeout(connectWebSocket, 3000);
        }
    };

    ws.onerror = function () {
        try { ws.close(); } catch (e) {}
    };
}

async function fetchMessagesPage(chatId, beforeId, limit) {
    if (!currentUser || !currentUser.login || !chatId) return null;
    try {
        var body = {
            login: currentUser.login,
            chatId: chatId
        };
        if (beforeId) body.beforeId = beforeId;
        if (limit)    body.limit    = limit;

        var resp = await fetch('/api/messages/page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            console.warn('/api/messages/page error:', data.error || resp.status);
            return null;
        }
        return data; // { ok, messages, hasMore, myLastReadId, pinnedId }
    } catch (e) {
        console.error('fetchMessagesPage error:', e);
        return null;
    }
}

// Fallback через системный аудиорекордер (на случай отсутствия MediaRecorder)
function startSystemVoiceFileChooser() {
    if (!currentChat || !currentUser || !currentUser.login) {
        alert('Сначала выберите чат');
        return;
    }
    if (!voiceFileInput) {
        alert('Голосовые на этом устройстве недоступны.');
        return;
    }
    voiceFileInput.click();
}

function setChatLoading(isLoading) {
    if (!chatLoadingOverlay) return;
    if (isLoading) {
        chatLoadingOverlay.classList.add('show');
    } else {
        chatLoadingOverlay.classList.remove('show');
    }
}

// обработка файла из системного рекордера
if (voiceFileInput) {
    voiceFileInput.addEventListener('change', async function () {
        var file = this.files && this.files[0];
        this.value = '';
        if (!file || !currentChat || !currentUser || !currentUser.login) return;

        var sizeMB = file.size / (1024 * 1024);
        if (sizeMB > 20) {
            alert('Аудио больше 20 МБ и не будет отправлено.');
            return;
        }

        var formData = new FormData();
        formData.append('file',  file);
        formData.append('login', currentUser.login);
        formData.append('chatId', currentChat.id);
        formData.append('text',  '');

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
    });
}

// --- управление микрофоном: удержание + свайп влево для отмены ---

if (chatMicBtn) {
    // ТАЧ‑устройства: удержание для записи
    chatMicBtn.addEventListener('touchstart', function (e) {
        if (!canUseLiveVoiceRecording) {
            startSystemVoiceFileChooser();
            return;
        }
        if (isRecordingVoice) return;

        var t = e.touches[0];
        micTouchStartX = t.clientX;
        micTouchStartY = t.clientY;
        micGestureActive = true;

        chatMicBtn.classList.add('mic-pressed');
        if (chatInputForm) chatInputForm.classList.add('recording');
        startVoiceRecording();
    }, { passive:true });

    chatMicBtn.addEventListener('touchmove', function (e) {
        if (!micGestureActive || !isRecordingVoice) return;
        var t  = e.touches[0];
        var dx = t.clientX - micTouchStartX;
        var dy = t.clientY - micTouchStartY;

        // если вертикальное движение больше — считаем, что жест не про отмену
        if (Math.abs(dy) > Math.abs(dx)) {
            updateVoiceCancelPreview(0);
            return;
        }

        updateVoiceCancelPreview(dx);

        // Если сильно ушли влево — отменяем запись
        if (dx < -80) {
            micGestureActive = false;
            stopVoiceRecording(false);
            if (voiceTimerEl) voiceTimerEl.textContent = 'Отменено';
            showInfoBanner('Голосовое отменено');
        }
    }, { passive:true });

    chatMicBtn.addEventListener('touchend', function () {
        if (!micGestureActive) return;
        micGestureActive = false;

        if (isRecordingVoice) {
            // обычное отпускание — отправляем голосовое
            stopVoiceRecording(true);
        } else {
            updateVoiceCancelPreview(0);
        }
    });

    // В PWA / некоторых браузерах вместо touchend приходит touchcancel,
    // поэтому здесь тоже считаем это нормальным отпусканием, а не отменой.
    chatMicBtn.addEventListener('touchcancel', function () {
        if (!micGestureActive) return;
        micGestureActive = false;

        if (isRecordingVoice) {
            // считаем, что пользователь просто отпустил кнопку
            stopVoiceRecording(true);
        } else {
            updateVoiceCancelPreview(0);
        }
    });

    // Десктоп (мышь): нажал — пишет, отпустил — отправил
    chatMicBtn.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;

        if (!canUseLiveVoiceRecording) {
            startSystemVoiceFileChooser();
            return;
        }
        if (isRecordingVoice) return;

        chatMicBtn.classList.add('mic-pressed');
        if (chatInputForm) chatInputForm.classList.add('recording');
        startVoiceRecording();
    });

    chatMicBtn.addEventListener('mouseup', function (e) {
        if (e.button !== 0) return;

        if (isRecordingVoice) {
            stopVoiceRecording(true);
        } else {
            updateVoiceCancelPreview(0);
        }
    });
}

// свайп вправо для закрытия чата (контролируемый, на всю ширину)
var chatSwipeStartX = null;
var chatSwipeStartY = null;
var chatSwipeDx     = 0;

function anyTopModalVisible() {
    if (chatUserModal && chatUserModal.classList.contains('visible')) return true;
    if (groupModal && groupModal.classList.contains('visible')) return true;
    if (groupAddModal && groupAddModal.classList.contains('visible')) return true;
    if (forwardModal && forwardModal.classList.contains('visible')) return true;
    if (postModal && postModal.classList.contains('visible')) return true;
    return false;
}

if (chatScreen) {
    chatScreen.addEventListener('touchstart', function (e) {
        if (!chatScreen.classList.contains('chat-screen-visible')) return;
        if (anyTopModalVisible()) return;
        if (e.touches.length !== 1) return;

        var t = e.touches[0];
        chatSwipeStartX = t.clientX;
        chatSwipeStartY = t.clientY;
        chatSwipeDx     = 0;

        // на время жеста убираем transition, чтобы не мешал
        chatScreen.style.transition = 'none';

        // Показываем mainScreen под chatScreen сразу, чуть затемнённым
        if (mainScreen) {
            mainScreen.style.display       = 'flex';
            mainScreen.style.opacity       = '0.6';
            mainScreen.style.transition    = 'none';
            mainScreen.style.pointerEvents = 'none'; // не перехватываем клики во время свайпа
        }
    }, { passive:true });

    chatScreen.addEventListener('touchmove', function (e) {
        if (chatSwipeStartX == null) return;
        var t  = e.touches[0];
        var dx = t.clientX - chatSwipeStartX;
        var dy = t.clientY - chatSwipeStartY;

        // свайп должен быть вправо и более горизонтальный, чем вертикальный
        if (dx <= 0 || Math.abs(dy) > Math.abs(dx)) {
            chatSwipeDx = 0;
            chatScreen.style.transform = 'translateX(0px)';
            if (mainScreen) mainScreen.style.opacity = '0.6';
            return;
        }

        chatSwipeDx = dx;
        var maxW    = window.innerWidth || 375;
        var translate = Math.min(dx, maxW);
        chatScreen.style.transform = 'translateX(' + translate + 'px)';

        // Показываем mainScreen под chatScreen и плавно осветляем его
        if (mainScreen) {
            mainScreen.style.display  = 'flex';
            mainScreen.style.transition = 'none';
            // 0 -> затемнён (0.6), 1 -> полностью виден (1.0)
            var progress = Math.min(translate / maxW, 1);
            var opacity  = 0.6 + progress * 0.4;
            mainScreen.style.opacity = opacity;
        }
    }, { passive:true });

    function finishChatSwipe(shouldClose) {
        if (!chatScreen) return;

        var duration = 250;
        chatScreen.style.transition = 'transform 0.25s cubic-bezier(.4,0,.2,1)';

        if (shouldClose) {
            // плавно доводим экран до правого края и осветляем mainScreen
            var maxW = window.innerWidth || 375;
            chatScreen.style.transform = 'translateX(' + maxW + 'px)';
            if (mainScreen) {
                mainScreen.style.transition    = 'opacity 0.25s ease-out';
                mainScreen.style.opacity       = '1';
                mainScreen.style.pointerEvents = 'auto'; // восстанавливаем клики
            }
            setTimeout(function () {
                chatScreen.style.transition = '';
                chatScreen.style.transform  = '';
                if (mainScreen) {
                    mainScreen.style.transition    = '';
                    mainScreen.style.opacity       = '';
                    mainScreen.style.pointerEvents = '';
                }
                closeChatScreenToMain();
            }, duration);
        } else {
            // возвращаем назад — скрываем mainScreen обратно
            chatScreen.style.transform = 'translateX(0px)';
            if (mainScreen) {
                mainScreen.style.transition    = 'opacity 0.25s ease-out';
                mainScreen.style.opacity       = '0';
                mainScreen.style.pointerEvents = 'none'; // сразу убираем клики
            }
            setTimeout(function () {
                chatScreen.style.transition = '';
                if (mainScreen) {
                    mainScreen.style.transition    = '';
                    mainScreen.style.opacity       = '';
                    mainScreen.style.pointerEvents = '';
                    // скрываем mainScreen если чат всё ещё открыт
                    if (chatScreen.classList.contains('chat-screen-visible')) {
                        mainScreen.style.display = 'none';
                    }
                }
            }, duration);
        }

        chatSwipeStartX = chatSwipeStartY = null;
        chatSwipeDx     = 0;
    }

    chatScreen.addEventListener('touchend', function () {
        if (chatSwipeStartX == null) return;

        var maxW    = window.innerWidth || 375;
        var current = Math.min(Math.max(chatSwipeDx, 0), maxW);
        var threshold = maxW * 0.25; // 25% ширины — порог закрытия

        var shouldClose = current >= threshold;
        finishChatSwipe(shouldClose);
    });

    chatScreen.addEventListener('touchcancel', function () {
        if (chatSwipeStartX == null) return;
        finishChatSwipe(false);
    });
}

function cleanupAttachmentObjectUrl(att) {
    if (!att || !att.url) return;
    if (att.type === 'image' || att.type === 'video') {
        try {
            URL.revokeObjectURL(att.url);
        } catch (e) {}
    }
}


function initAttachmentTabs() {
    // Модалка пользователя
    if (chatUserAttachments && chatUserMediaTab && chatUserAudioTab) {
        var userTabs = {
            mediaTab: chatUserMediaTab,
            audioTab: chatUserAudioTab
        };

        chatUserMediaTab.addEventListener('click', function (e) {
            e.stopPropagation();
            setAttachmentsTab(chatUserAttachments, userTabs, 'media');
        });
chatUserAudioTab.addEventListener('click', function (e) {
            e.stopPropagation();
            setAttachmentsTab(chatUserAttachments, userTabs, 'audio');
        });

        setAttachmentsTab(chatUserAttachments, userTabs, 'media');
    }

    // Модалка группы
    if (groupAttachments && groupMembersTab && groupMediaTab && groupAudioTab) {
        var groupTabs = {
            membersTab: groupMembersTab,
            mediaTab:   groupMediaTab,
            audioTab:   groupAudioTab
        };

        groupMembersTab.addEventListener('click', function (e) {
            e.stopPropagation();
            setAttachmentsTab(groupAttachments, groupTabs, 'members');
        });

        groupMediaTab.addEventListener('click', function (e) {
            e.stopPropagation();
            setAttachmentsTab(groupAttachments, groupTabs, 'media');
        });
groupAudioTab.addEventListener('click', function (e) {
            e.stopPropagation();
            setAttachmentsTab(groupAttachments, groupTabs, 'audio');
        });

        setAttachmentsTab(groupAttachments, groupTabs, 'members');
    }
}

// ---------- СЕТЕВОЙ БАННЕР ----------

function markFieldError(inputEl) {
    if (!inputEl) return;
    var wrap = inputEl.closest('.field') || inputEl;
    wrap.classList.add('field-error');

    try {
        inputEl.focus();
    } catch (e) {}

    setTimeout(function () {
        wrap.classList.remove('field-error');
    }, 2000);
}

function showNetworkErrorBanner(message) {
    if (!networkBanner) return;
    networkBanner.textContent = message || 'Проблемы с сетью';
    networkBanner.classList.add('show');

    if (networkBannerTimer) clearTimeout(networkBannerTimer);
    networkBannerTimer = setTimeout(function () {
        if (networkBanner) networkBanner.classList.remove('show');
    }, 2000);
}

// Информационный баннер (синий) — для "ID скопирован" и т.п.
function showInfoBanner(message) {
    if (!networkBanner) return;
    networkBanner.textContent = message || '';
    networkBanner.classList.add('info', 'show');

    if (networkBannerTimer) clearTimeout(networkBannerTimer);
    networkBannerTimer = setTimeout(function () {
        if (networkBanner) networkBanner.classList.remove('show', 'info');
    }, 2000);
}

// ---------- TOAST / ЗАМЕНА alert ----------

function showToast(message) {
    showNetworkErrorBanner(message);
}

// Перехватываем все alert в приложении
window.alert = showToast;

// ---------- ВОССТАНОВЛЕНИЕ СЕССИИ ----------

async function tryRestoreSession() {
    try {
        var resp = await fetch('/api/session/me', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
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

var VAPID_PUBLIC_KEY = 'BHkZdAiNhzJk7XFS-lX7tHaA9hoCdejv2WVNjPmhquDmUeMXwHW7RiJF87dy9l2xAjQfE3-DkFY-BVDbW2c0iAs';
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

// ---------- ХЕЛПЕРЫ ДЛЯ МЕДИА / ВЛОЖЕНИЙ ----------

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

        if (diff > 40) {
            mediaWrapper.classList.add('with-blur');
        } else {
            mediaWrapper.classList.remove('with-blur');
        }
    }

    if (mediaEl.tagName.toLowerCase() === 'video') {
        if (mediaEl.readyState >= 1) {
            requestAnimationFrame(updateBlur);
        } else {
            mediaEl.addEventListener('loadedmetadata', function () {
                requestAnimationFrame(updateBlur);
            }, { once:true });
        }
    } else {
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

// ---------- ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК В МОДАЛКАХ ВЛОЖЕНИЙ ----------

function setAttachmentsTab(container, tabs, activeKey) {
    if (!container || !tabs) return;

    container.classList.remove(
        'chat-attachments-show-files',
        'chat-attachments-show-audio',
        'chat-attachments-show-members'
    );

    if (activeKey === 'files') {
        container.classList.add('chat-attachments-show-files');
    } else if (activeKey === 'audio') {
        container.classList.add('chat-attachments-show-audio');
    } else if (activeKey === 'members') {
        container.classList.add('chat-attachments-show-members');
    }

    if (tabs.membersTab) tabs.membersTab.classList.toggle('chat-attachments-tab-active', activeKey === 'members');
    if (tabs.mediaTab)   tabs.mediaTab.classList.toggle('chat-attachments-tab-active', activeKey === 'media');
    if (tabs.audioTab)   tabs.audioTab.classList.toggle('chat-attachments-tab-active', activeKey === 'audio');
}

function formatSizeMBVal(v) {
    var val = v || 0;
    if (val < 0.1) val = 0.1;
    return val.toFixed(1) + ' МБ';
}


function renderChatAttachmentsInto(mediaArr, filesArr, audioArr, mediaGrid, filesList, audioList) {
    if (mediaGrid) mediaGrid.innerHTML = '';
    if (filesList) filesList.innerHTML = '';
    if (audioList) audioList.innerHTML = '';

    // МЕДИА
    if (mediaGrid) {
        (mediaArr || []).forEach(function (m) {
            if (!m.url) return;

            var cell = document.createElement('div');
            cell.className = 'chat-media-item';

            var img = document.createElement('img');
            img.className = 'chat-media-img';
            // важное: используем превью, если оно есть (для видео / в будущем для фото)
            img.src = m.preview || m.url;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.onerror = function () { this.style.display = 'none'; };
            cell.appendChild(img);

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

    // ФАЙЛЫ
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
                if (!f.url) return;

                // Открываем файл в НОВОЙ вкладке / странице (без download атрибута)
                var aTag = document.createElement('a');
                aTag.href = f.url;
                aTag.target = '_blank';
                document.body.appendChild(aTag);
                aTag.click();
                document.body.removeChild(aTag);

                row.dataset.downloaded = '1';
                icon.classList.add('downloaded');
            });
            filesList.appendChild(row);
        });
    }

    // АУДИО
    if (audioList) {
        (audioArr || []).forEach(function (a) {
            if (!a.url) return;

            var row = document.createElement('div');
            row.className = 'chat-file-item';

            var icon = document.createElement('div');
            icon.className = 'chat-file-icon chat-audio-icon';

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

            var audioEl = new Audio(a.url);
            audioEl.preload = 'metadata';

            function stopCurrentAttachmentAudio() {
                if (currentAttachmentAudio && currentAttachmentAudio !== audioEl) {
                    try { currentAttachmentAudio.pause(); } catch (e) {}
                }
                if (currentAttachmentAudioIcon && currentAttachmentAudioIcon !== icon) {
                    currentAttachmentAudioIcon.classList.remove('playing');
                }
            }

            row.addEventListener('click', function () {
                if (audioEl.paused) {
                    stopCurrentAttachmentAudio();
                    audioEl.play().catch(function(){});
                    icon.classList.add('playing');
                    currentAttachmentAudio     = audioEl;
                    currentAttachmentAudioIcon = icon;
                } else {
                    audioEl.pause();
                    icon.classList.remove('playing');
                    if (currentAttachmentAudio === audioEl) {
                        currentAttachmentAudio     = null;
                        currentAttachmentAudioIcon = null;
                    }
                }
            });

            audioEl.addEventListener('ended', function () {
                icon.classList.remove('playing');
                if (currentAttachmentAudio === audioEl) {
                    currentAttachmentAudio     = null;
                    currentAttachmentAudioIcon = null;
                }
            });

            audioList.appendChild(row);
        });
    }
}

/**
 * Загрузка вложений для текущего чата и рендер
 * initialTab: 'media' | 'files' | 'audio' | 'members'
 */
async function loadAttachmentsForCurrentChat(container, mediaGrid, audioList, tabs, initialTab) {
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
            null,
            audioList
        );

        if (tabs && initialTab) {
            setAttachmentsTab(container, tabs, initialTab);
        } else if (tabs) {
            setAttachmentsTab(container, tabs, 'media');
        }
    } catch (e) {
        console.warn('loadAttachmentsForCurrentChat error:', e);
    }
}

// ---------- ГОЛОСОВАЯ ЗАПИСЬ ----------

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
        var rms = Math.sqrt(sum / voiceDataArray.length);

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

async function startVoiceRecording() {
    if (!hasMediaDevices) {
        alert('Этот браузер не даёт доступ к микрофону (getUserMedia недоступен).');
        return;
    }
    if (!mediaRecorderSupport) {
        alert(
            'На этом устройстве нет поддержки записи аудио (MediaRecorder). ' +
            'Голосовые будут работать, например, в Chrome/Edge/Firefox на Android или на компьютере.'
        );
        return;
    }
    if (isRecordingVoice) return;

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
        alert('Нет доступа к микрофону');
        return;
    }

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

function stopVoiceRecording(send) {
    if (!isRecordingVoice) return;

    isRecordingVoice = false;
    voiceSendPlanned = !!send;

    if (chatInputForm) {
        chatInputForm.classList.remove('recording');
        chatInputForm.classList.remove('recording-cancel-preview');
    }
    if (chatMicBtn) {
        chatMicBtn.classList.remove('mic-pressed');
    }
    updateVoiceCancelPreview(0);

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try { mediaRecorder.stop(); } catch (e) {}
    }

    if (mediaStream) {
        try {
            mediaStream.getTracks().forEach(function (t) {
                try { t.stop(); } catch (e) {}
            });
        } catch (e) {}
        mediaStream = null;
    }

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

    // Отбрасываем совсем пустые записи
    if (!blob || !blob.size || blob.size < 2000) { // ~2 КБ
        return;
    }

    var fileName = 'voice-' + Date.now() + '.webm';
    var file = new File([blob], fileName, { type: 'audio/webm' });

    var formData = new FormData();
    formData.append('file', file);
    formData.append('login', currentUser.login);
    formData.append('chatId', currentChat.id);
    formData.append('text', '');

    try {
        setChatLoading(true);

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
        if (chatContent) {
            chatContent.scrollTop = chatContent.scrollHeight;
        }
    } catch (e) {
        alert('Сетевая ошибка при отправке голосового сообщения');
    } finally {
        setChatLoading(false);
    }
}

// ---------- ХЕЛПЕРЫ ДЛЯ REPLY / СКРОЛЛА / ДАТ ----------

function scrollToRepliedMessage(replyInfo) {
    if (!chatContent || !replyInfo) return;

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
    if (!chatInputForm || !chatContent) return;

    var inputRect   = chatInputForm.getBoundingClientRect();
    var inputHeight = inputRect.height || 0;

    var attachH = 0;
    if (attachPreviewBar) {
        if (attachPreviewBar.style.display !== 'none') {
            var ar = attachPreviewBar.getBoundingClientRect();
            attachH = ar.height || 0;
        }
        attachPreviewBar.style.bottom = inputHeight + 'px';
    }

    var replyH = 0;
    if (replyBar) {
        if (replyBar.style.display !== 'none') {
            var rr = replyBar.getBoundingClientRect();
            replyH = rr.height || 0;
        }
        replyBar.style.bottom = (inputHeight + attachH) + 'px';
    }

    var bottom = inputHeight + attachH + replyH + (keyboardOffset || 0);
    chatContent.style.bottom = bottom + 'px';
}

function updateChatTopForPinned() {
    if (!chatContent) return;

    var baseTop = 64; // высота шапки
    var extra   = 0;

    if (pinnedTopBar && pinnedTopBar.style.display !== 'none') {
        var pr = pinnedTopBar.getBoundingClientRect();
        extra = pr.height || 0;
    }

    chatContent.style.top = (baseTop + extra) + 'px';
}

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

// управление кнопкой отправки
function updateSendButtonState() {
    if (!chatInputForm) return;

    var hasText = chatInput && chatInput.value.trim().length > 0;
    var hasAtt  = pendingAttachments && pendingAttachments.length > 0;

    if (hasText || hasAtt) {
        chatInputForm.classList.add('can-send');
    } else {
        chatInputForm.classList.remove('can-send');
    }
}

function autoResizeChatInput() {
    if (!chatInput) return;
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

function keepKeyboardAfterSend() {
    if (!chatInput) return;

    // Фокусируем textarea чуть позже, чтобы не мешать обработчику submit
    // и чтобы сработало на мобильных
    setTimeout(function () {
        try {
            chatInput.focus();
        } catch (e) {}
    }, 50);
}

// авто-ресайз textarea + сохранение черновика
if (chatInput) {
    chatInput.addEventListener('input', function () {
        autoResizeChatInput();
        scheduleSaveCurrentChatDraft();
    });
    autoResizeChatInput();
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
    return value.replace(/[^А-Яа-яЁё\s-]/g, '').slice(0, 30);
}

// Форматирование названия команды для отображения
function formatTeamDisplayName(team) {
    if (!team) return '';
    var t = String(team);

    // если есть кириллица — показываем как есть
    if (/[А-Яа-яЁё]/.test(t)) return t;

    // slug/latin: vinyl-dance-family -> Vinyl Dance Family
    var parts = t.split(/[-_]+/).filter(Boolean);
    if (!parts.length) return t;
    return parts.map(function (p) {
        return p.charAt(0).toUpperCase() + p.slice(1);
    }).join(' ');
}

// ---------- MEDIA VIEWER (КАСТОМНЫЙ ПЛЕЕР КАК НА iOS) ----------

function resetMediaViewerZoom() {
    mediaViewerScale = 1;
    mediaViewerPanX = 0;
    mediaViewerPanY = 0;
    mediaViewerStartScale = 1;
    mediaViewerStartPanX = 0;
    mediaViewerStartPanY = 0;
    mediaViewerPinchStartDist = null;
    mediaViewerLastTouchX = null;
    mediaViewerLastTouchY = null;

    if (mediaViewerImg) {
        mediaViewerImg.style.transform = '';
    }
    if (mediaViewerVideo) {
        mediaViewerVideo.style.transform = '';
    }
}

function applyMediaViewerTransform() {
    var target = mediaViewerIsVideo ? mediaViewerVideo : mediaViewerImg;
    if (!target) return;
    var s = mediaViewerScale;
    var x = mediaViewerPanX;
    var y = mediaViewerPanY;
    target.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + s + ')';
}

function resetMediaViewerUi() {
    if (!mediaViewer) return;
    if (mediaViewerImg)   {
        mediaViewerImg.style.display   = 'none';
        mediaViewerImg.src = '';
        mediaViewerImg.style.transform = '';
    }
    if (mediaViewerVideo) {
        mediaViewerVideo.style.display = 'none';
        mediaViewerVideo.pause();
        mediaViewerVideo.src = '';
        mediaViewerVideo.style.transform = '';
    }
    if (mediaViewerPlayPause) {
        mediaViewerPlayPause.classList.remove('play', 'pause');
    }
    if (mediaViewerTimelineFill) mediaViewerTimelineFill.style.width = '0%';
    if (mediaViewerTimelineThumb) mediaViewerTimelineThumb.style.left = '0%';
    if (mediaViewerCurrentTime) mediaViewerCurrentTime.textContent = '0:00';
    if (mediaViewerTotalTime) mediaViewerTotalTime.textContent   = '0:00';
    mediaViewerIsVideo = false;
    mediaViewerUiVisible = false;
    if (mediaViewerControls) {
        mediaViewerControls.style.display = 'none';
        mediaViewerControls.classList.remove('media-viewer-controls-visible');
    }
    if (mediaViewerLoader) mediaViewerLoader.classList.remove('show');
    mediaViewerIsVideo = false;

    resetMediaViewerZoom();
}

function showMediaViewerControls() {
    if (!mediaViewerIsVideo || !mediaViewerControls) return;
    mediaViewerControls.style.display = 'flex';
    mediaViewerControls.classList.add('media-viewer-controls-visible');
    mediaViewerUiVisible = true;

    if (mediaViewerHideUiTimer) clearTimeout(mediaViewerHideUiTimer);
    mediaViewerHideUiTimer = setTimeout(function () {
        hideMediaViewerControls();
    }, 2500);
}

function hideMediaViewerControls() {
    if (!mediaViewerIsVideo || !mediaViewerControls) return;
    mediaViewerControls.classList.remove('media-viewer-controls-visible');
    mediaViewerUiVisible = false;
    if (mediaViewerHideUiTimer) {
        clearTimeout(mediaViewerHideUiTimer);
        mediaViewerHideUiTimer = null;
    }
}

function toggleMediaViewerPlayPause() {
    if (!mediaViewerIsVideo || !mediaViewerVideo) return;
    if (mediaViewerVideo.paused) {
        mediaViewerVideo.play().catch(function(){});
        if (mediaViewerPlayPause) {
            mediaViewerPlayPause.classList.remove('play');
            mediaViewerPlayPause.classList.add('pause');
        }
    } else {
        mediaViewerVideo.pause();
        if (mediaViewerPlayPause) {
            mediaViewerPlayPause.classList.remove('pause');
            mediaViewerPlayPause.classList.add('play');
        }
    }
}

function openMediaViewer(url, type, sourceEl) {
    if (!mediaViewer || !mediaViewerContent || !mediaViewerImg || !mediaViewerVideo) return;

    currentMediaSourceRect = sourceEl && sourceEl.getBoundingClientRect ? sourceEl.getBoundingClientRect() : null;

    mediaViewer.classList.add('visible');
    resetMediaViewerUi();

    mediaViewerContent.style.transform = 'translate3d(0,0,0) scale(1)';

    if (currentMediaSourceRect) {
        var rect = currentMediaSourceRect;
        var vw   = window.innerWidth  || 375;
        var vh   = window.innerHeight || 667;

        var srcCenterX = rect.left + rect.width  / 2;
        var srcCenterY = rect.top  + rect.height / 2;
        var dstCenterX = vw / 2;
        var dstCenterY = vh / 2;

        var translateX = srcCenterX - dstCenterX;
        var translateY = srcCenterY - dstCenterY;

        var scaleX = rect.width  / vw;
        var scaleY = rect.height / vh;
        var scale  = Math.max(scaleX, scaleY);
        if (!isFinite(scale) || scale <= 0) scale = 0.3;

        mediaViewerContent.style.transform =
            'translate3d(' + translateX + 'px,' + translateY + 'px,0) scale(' + scale + ')';

        requestAnimationFrame(function () {
            mediaViewerContent.style.transform = 'translate3d(0,0,0) scale(1)';
        });
    }

    resetMediaViewerZoom();

    if (type === 'image') {
        mediaViewerIsVideo = false;
        mediaViewerImg.src = url;
        mediaViewerImg.style.display = 'block';
        if (mediaViewerControls) mediaViewerControls.style.display = 'none';
        if (mediaViewerTitle) mediaViewerTitle.textContent = 'Фото';
    } else if (type === 'video') {
        mediaViewerIsVideo = true;
        mediaViewerVideo.src = url;
        mediaViewerVideo.style.display = 'block';
        mediaViewerVideo.muted    = false;
        mediaViewerVideo.controls = false;
        mediaViewerVideo.setAttribute('playsinline','true');
        mediaViewerVideo.setAttribute('webkit-playsinline','true');
        mediaViewerVideo.currentTime = 0;
        if (mediaViewerLoader) {
            mediaViewerLoader.classList.add('show');
        }

        if (mediaViewerControls) {
            mediaViewerControls.style.display = 'flex';
            mediaViewerControls.classList.remove('media-viewer-controls-visible');
        }
        if (mediaViewerTitle) mediaViewerTitle.textContent = 'Видео';

        // сбрасываем старые обработчики прогресса, чтобы они не накапливались
        mediaViewerVideo.ontimeupdate = null;
        mediaViewerVideo.onended      = null;

        mediaViewerVideo.addEventListener('loadedmetadata', function onMeta() {
            mediaViewerVideo.removeEventListener('loadedmetadata', onMeta);
            var dur = mediaViewerVideo.duration;
            if (mediaViewerTotalTime) mediaViewerTotalTime.textContent = formatSecondsToMMSS(dur);
            if (mediaViewerCurrentTime) mediaViewerCurrentTime.textContent = '0:00';
        });

        mediaViewerVideo.addEventListener('canplay', function onCanPlay() {
            mediaViewerVideo.removeEventListener('canplay', onCanPlay);
            if (mediaViewerLoader) {
                mediaViewerLoader.classList.remove('show');
            }
        });

        mediaViewerVideo.addEventListener('error', function () {
            if (mediaViewerLoader) {
                mediaViewerLoader.classList.remove('show');
            }
        });

        // обновление таймлайна и времени — единичный обработчик
        mediaViewerVideo.ontimeupdate = function () {
            var cur = mediaViewerVideo.currentTime || 0;
            var dur = mediaViewerVideo.duration || 0;
            if (mediaViewerCurrentTime) {
                mediaViewerCurrentTime.textContent = formatSecondsToMMSS(cur);
            }
            if (dur && mediaViewerTimelineFill && mediaViewerTimelineThumb) {
                var ratio = Math.max(0, Math.min(1, cur / dur));
                var pct   = ratio * 100;
                mediaViewerTimelineFill.style.width = pct + '%';
                mediaViewerTimelineThumb.style.left = pct + '%';
            }
        };

        mediaViewerVideo.onended = function () {
            if (mediaViewerPlayPause) {
                mediaViewerPlayPause.classList.remove('pause');
                mediaViewerPlayPause.classList.add('play');
            }
        };

        mediaViewerVideo.play().then(function () {
            if (mediaViewerLoader) mediaViewerLoader.classList.remove('show');
            if (mediaViewerPlayPause) {
                mediaViewerPlayPause.classList.remove('play');
                mediaViewerPlayPause.classList.add('pause');
            }
            showMediaViewerControls();
        }).catch(function(){
            if (mediaViewerLoader) mediaViewerLoader.classList.remove('show');
            if (mediaViewerPlayPause) {
                mediaViewerPlayPause.classList.remove('pause');
                mediaViewerPlayPause.classList.add('play');
            }
            showMediaViewerControls();
        });
    }
}

function closeMediaViewer() {
    if (!mediaViewer || !mediaViewerContent || !mediaViewerImg || !mediaViewerVideo) return;

    if (mediaViewerHideUiTimer) {
        clearTimeout(mediaViewerHideUiTimer);
        mediaViewerHideUiTimer = null;
    }

    if (currentMediaSourceRect) {
        var rect = currentMediaSourceRect;
        var vw   = window.innerWidth  || 375;
        var vh   = window.innerHeight || 667;

        var srcCenterX = rect.left + rect.width  / 2;
        var srcCenterY = rect.top  + rect.height / 2;
        var dstCenterX = vw / 2;
        var dstCenterY = vh / 2;

        var translateX = srcCenterX - dstCenterX;
        var translateY = srcCenterY - dstCenterY;

        var scaleX = rect.width  / vw;
        var scaleY = rect.height / vh;
        var scale  = Math.max(scaleX, scaleY);
        if (!isFinite(scale) || scale <= 0) scale = 0.3;

        mediaViewerContent.style.transform =
            'translate3d(' + translateX + 'px,' + translateY + 'px,0) scale(' + scale + ')';

        setTimeout(function () {
            mediaViewer.classList.remove('visible');
            mediaViewerContent.style.transform = 'translate3d(0,0,0) scale(1)';
            resetMediaViewerUi();
            currentMediaSourceRect = null;
        }, 220);
    } else {
        mediaViewer.classList.remove('visible');
        resetMediaViewerUi();
        currentMediaSourceRect = null;
    }
}

// Служебная функция для зума: дистанция между двумя тачами
function distanceBetweenTouches(t1, t2) {
    var dx = t1.clientX - t2.clientX;
    var dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx*dx + dy*dy);
}

// события медиавьюера
(function initMediaViewerEvents(){
    if (!mediaViewer) return;

    var backdrop = mediaViewer.querySelector('.media-viewer-backdrop');
    if (backdrop){
        backdrop.addEventListener('click', closeMediaViewer);
    }
    mediaViewer.addEventListener('click', function(e){
        if (e.target === mediaViewer) closeMediaViewer();
    });

    if (mediaViewerCloseBtn) {
        mediaViewerCloseBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            closeMediaViewer();
        });
    }

    // Нажатие по видео: если меню скрыто — показать меню, если видно — переключить play/pause
    if (mediaViewerVideo) {
        mediaViewerVideo.addEventListener('click', function(e){
            e.stopPropagation();
            if (!mediaViewerIsVideo) return;

            if (!mediaViewerUiVisible) {
                showMediaViewerControls();
            } else {
                toggleMediaViewerPlayPause();
                showMediaViewerControls(); // обновим таймер скрытия
            }
        });
    }

    // свайп вниз для закрытия
    if (mediaViewerContent) {
        var mvStartY = null;
        var mvDy     = 0;

        mediaViewerContent.addEventListener('touchstart', function(e){
            if (e.touches.length !== 1) return;
            mvStartY = e.touches[0].clientY;
            mvDy = 0;
            mediaViewerContent.style.transition = 'none';
        }, { passive:true });

        mediaViewerContent.addEventListener('touchmove', function(e){
            if (mvStartY == null) return;
            var y = e.touches[0].clientY;
            mvDy = y - mvStartY;
            if (mvDy <= 0) return; // только вниз

            e.preventDefault();
            var translate = mvDy;
            mediaViewerContent.style.transform = 'translate3d(0,' + translate + 'px,0)';
        }, { passive:false });

        function finishMediaSwipe() {
            if (mvStartY == null) return;
            mediaViewerContent.style.transition = 'transform 0.2s ease-out';
            var threshold = (window.innerHeight || 600) * 0.25;
            if (mvDy > threshold) {
                mediaViewerContent.style.transform = 'translate3d(0,100%,0)';
                setTimeout(function(){
                    mediaViewerContent.style.transition = '';
                    mediaViewerContent.style.transform = 'translate3d(0,0,0)';
                    closeMediaViewer();
                }, 180);
            } else {
                mediaViewerContent.style.transform = 'translate3d(0,0,0)';
                setTimeout(function(){
                    mediaViewerContent.style.transition = '';
                }, 200);
            }
            mvStartY = null;
            mvDy = 0;
        }

        mediaViewerContent.addEventListener('touchend', function(){
            finishMediaSwipe();
        }, { passive:true });

        mediaViewerContent.addEventListener('touchcancel', function(){
            finishMediaSwipe();
        }, { passive:true });
    }

    if (mediaViewerPlayPause) {
        mediaViewerPlayPause.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMediaViewerPlayPause();
            showMediaViewerControls();
        });
    }

    var timelineTrack = mediaViewerControls ?
        mediaViewerControls.querySelector('.media-viewer-timeline-track') : null;

    function seekInMedia(e) {
        if (!mediaViewerIsVideo || !timelineTrack || !mediaViewerVideo.duration) return;
        var rect = timelineTrack.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var ratio = Math.max(0, Math.min(1, x / rect.width));
        mediaViewerVideo.currentTime = ratio * mediaViewerVideo.duration;
        showMediaViewerControls();
    }

    if (timelineTrack) {
        timelineTrack.addEventListener('click', function (e) {
            e.stopPropagation();
            seekInMedia(e);
        });
        timelineTrack.addEventListener('touchstart', function (e) {
            e.stopPropagation();
            var t = e.touches[0];
            seekInMedia(t);
        }, { passive:true });
        timelineTrack.addEventListener('touchmove', function (e) {
            e.stopPropagation();
            var t = e.touches[0];
            seekInMedia(t);
        }, { passive:true });
    }

    // ЗУМ / ПАНОРАМА для фото/видео
    function attachZoomHandlers(target) {
        if (!target) return;

        target.addEventListener('touchstart', function(e){
            if (e.touches.length === 1) {
                mediaViewerLastTouchX = e.touches[0].clientX;
                mediaViewerLastTouchY = e.touches[0].clientY;
                mediaViewerStartPanX = mediaViewerPanX;
                mediaViewerStartPanY = mediaViewerPanY;
                mediaViewerPinchStartDist = null;
            } else if (e.touches.length === 2) {
                var d = distanceBetweenTouches(e.touches[0], e.touches[1]);
                mediaViewerPinchStartDist = d;
                mediaViewerStartScale = mediaViewerScale;
            }
        }, { passive:true });

        target.addEventListener('touchmove', function(e){
            if (e.touches.length === 2 && mediaViewerPinchStartDist) {
                e.preventDefault();
                var d2 = distanceBetweenTouches(e.touches[0], e.touches[1]);
                if (!d2) return;
                var ratio = d2 / mediaViewerPinchStartDist;
                var newScale = mediaViewerStartScale * ratio;
                if (newScale < 1) newScale = 1;
                if (newScale > 4) newScale = 4;
                mediaViewerScale = newScale;
                applyMediaViewerTransform();
            } else if (e.touches.length === 1 && mediaViewerScale > 1) {
                e.preventDefault();
                var t = e.touches[0];
                var dx = t.clientX - mediaViewerLastTouchX;
                var dy = t.clientY - mediaViewerLastTouchY;
                mediaViewerPanX = mediaViewerStartPanX + dx;
                mediaViewerPanY = mediaViewerStartPanY + dy;
                applyMediaViewerTransform();
            }
        }, { passive:false });

        target.addEventListener('touchend', function(e){
            if (e.touches.length === 0) {
                mediaViewerPinchStartDist = null;
                mediaViewerLastTouchX = null;
                mediaViewerLastTouchY = null;
            }
        }, { passive:true });
    }

    attachZoomHandlers(mediaViewerImg);
    attachZoomHandlers(mediaViewerVideo);
})();

// ---------- PREVIEW ВЛОЖЕНИЙ В ИНПУТ-БАРЕ ----------

function renderAttachPreviewBar() {
    if (!attachPreviewBar) return;

    function formatSizeMB(v) {
        var val = v || 0;
        if (val < 0.1) val = 0.1;
        return val.toFixed(1) + ' МБ';
    }

    if (!pendingAttachments.length) {
        attachPreviewBar.style.display = 'none';
        attachPreviewBar.innerHTML = '';

        updateFloatingBarsPosition();
        updateSendButtonState();
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
            imgThumb.loading = 'lazy';
            imgThumb.decoding = 'async';
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
            cleanupAttachmentObjectUrl(att);

            pendingAttachments = pendingAttachments.filter(function (p) {
                return p.id !== att.id;
            });
            renderAttachPreviewBar();
        });

        item.appendChild(removeBtn);
        attachPreviewBar.appendChild(item);
    });

    updateFloatingBarsPosition();
    updateSendButtonState();
}

// инициализация выбора вложений в чате
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
                // Файлы (не фото/видео) не принимаем
                alert('Можно отправлять только фото и видео.');
                return;
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

// ---------- ЦВЕТА ДЛЯ ГРУПП ----------

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

// ---------- НАВИГАЦИЯ BOTTOM BAR С АНИМАЦИЕЙ ----------

function showBottomNav() {
    if (!bottomNav) return;
    bottomNav.style.display = 'flex';
    bottomNav.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
        bottomNav.classList.add('bottom-nav-visible');
    });
}

function hideBottomNav() {
    if (!bottomNav) return;
    bottomNav.classList.remove('bottom-nav-visible');
    bottomNav.setAttribute('aria-hidden', 'true');
    setTimeout(function () {
        if (!bottomNav.classList.contains('bottom-nav-visible')) {
            bottomNav.style.display = 'none';
        }
    }, 260);
}

function setNavActive(tab) {
    if (!navHomeIcon || !navProfileIcon || !navAddIcon || !navListIcon) return;

    // базовые (неактивные) иконки
    navHomeIcon.src   = 'icons/home-gray.png';
    navProfileIcon.src= 'icons/user.png';
    navAddIcon.src    = 'icons/plus.png';
    navListIcon.src   = 'icons/list-gray.png';

    // убираем active‑класс со всех кнопок
    if (navHomeBtn)    navHomeBtn.classList.remove('nav-btn-active');
    if (navProfileBtn) navProfileBtn.classList.remove('nav-btn-active');
    if (navAddBtn)     navAddBtn.classList.remove('nav-btn-active');
    if (navListBtn)    navListBtn.classList.remove('nav-btn-active');

    if (tab === 'profile') {
        navProfileIcon.src = 'icons/user-active.png';
        if (navProfileBtn) navProfileBtn.classList.add('nav-btn-active');
    } else if (tab === 'plus') {
        navAddIcon.src = 'icons/plus-active.png';
        if (navAddBtn) navAddBtn.classList.add('nav-btn-active');
    } else if (tab === 'chats') {
        navHomeIcon.src = 'icons/home.png';
        if (navHomeBtn) navHomeBtn.classList.add('nav-btn-active');
    } else if (tab === 'feed') {
        navListIcon.src = 'icons/list.png';
        if (navListBtn) navListBtn.classList.add('nav-btn-active');
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
        profileTeamEl.textContent   = formatTeamDisplayName(currentUser.team || '');
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

    // Кнопка "Админ‑панель" только для admin
    if (profileAdminBtn) {
        var roleLower2 = (currentUser.role || '').toLowerCase();
        profileAdminBtn.style.display = (roleLower2 === 'admin') ? '' : 'none';
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

// ---------- ПАРСИНГ [r]...[/r] ДЛЯ ОТВЕТОВ ----------

function parseReplyWrappedText(raw) {
    var res = { mainText: raw || '', reply: null };
    if (typeof raw !== 'string') return res;

    var m = raw.match(/^\s*\[r(?::(\d+))?\]([\s\S]*?)\[\/r\]\s*([\s\S]*)$/);
    if (!m) {
        if (raw.indexOf('[r') !== -1 && raw.indexOf('[/r]') !== -1) {
            var cleaned = raw.replace(/^\s*\[r(?::\d+)?\][\s\S]*?\[\/r\]\s*/,'');
            res.mainText = cleaned;
        }
        return res;
    }

    var idStr  = m[1];
    var meta   = m[2] || '';
    var after  = m[3] || '';

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
    res.mainText = after;
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
    swipeActive = true;
    swipeLastDx = 0;
}

function onMsgTouchMove(e) {
    if (!swipeActive || !swipeItem) return;

    var t  = e.touches[0];
    var dx = t.clientX - swipeStartX;
    var dy = t.clientY - swipeStartY;

    if (Math.abs(dy) > Math.abs(dx)) {
        return;
    }

    var col = swipeItem.querySelector('.msg-col');
    if (!col) return;

    // Ответ — свайп ВЛЕВО (dx отрицательный)
    if (dx >= 0) {
        swipeLastDx = 0;
        col.style.transition = 'transform 0.15s ease-out';
        col.style.transform  = 'translateX(0)';
        return;
    }

    swipeLastDx = dx;
    // вибрация один раз при достижении порога ответа (-40px)
    if (dx < -40 && !swipeVibratedReply) {
        swipeVibratedReply = true;
        vibrate(30);
    } else if (dx >= -40) {
        swipeVibratedReply = false;
    }
    var translate = Math.max(dx, -80);
    col.style.transition = 'none';
    col.style.transform  = 'translateX(' + translate + 'px)';
}

function onMsgTouchEnd() {
    if (!swipeItem) {
        swipeActive = false;
        return;
    }

    var col = swipeItem.querySelector('.msg-col');

    if (col) {
        col.style.transition = 'transform 0.15s ease-out';
        col.style.transform  = 'translateX(0)';
        setTimeout(function () {
            if (col) col.style.transition = '';
        }, 200);
    }

    if (swipeLastDx < -40) {
        startReplyFromElement(swipeItem);
    }

    swipeActive = false;
    swipeItem   = null;
    swipeLastDx = 0;
    swipeVibratedReply = false;
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

// app.js — PART 2/4

// ---------- РЕНДЕР СООБЩЕНИЯ (включая голосовые / видео‑таймер) ----------

// Заменяет URL в тексте на кликабельные <a>, без innerHTML (безопасно)
function linkifyText(container, text) {
    container.innerHTML = '';
    if (!text) return;

    var str = String(text);
    // Ищем http/https ссылки
    var urlRegex = /(\bhttps?:\/\/[^\s]+)/gi;
    var lastIndex = 0;
    var match;

    while ((match = urlRegex.exec(str)) !== null) {
        var url  = match[0];
        var idx  = match.index;

        // Текст до ссылки
        if (idx > lastIndex) {
            container.appendChild(
                document.createTextNode(str.slice(lastIndex, idx))
            );
        }

        // Сама ссылка
        var a = document.createElement('a');
        a.href = url;
        a.textContent = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'msg-link';
        container.appendChild(a);

        lastIndex = idx + url.length;
    }

    // Хвост после последней ссылки
    if (lastIndex < str.length) {
        container.appendChild(
            document.createTextNode(str.slice(lastIndex))
        );
    }
}

function renderMessage(msg, opts) {
    if (!chatContent) return;

    opts = opts || {};

    var parsed    = parseReplyWrappedText(msg.text || '');
    var replyInfo = parsed.reply;
    var mainText  = parsed.mainText;

    if (replyInfo && replyInfo.messageId && messagesById && messagesById[replyInfo.messageId]) {
        var target  = messagesById[replyInfo.messageId];
        var tParsed = parseReplyWrappedText(target.text || '');
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

    var isPending = !!msg.pending;

    if (isPending) {
        item.classList.add('msg-pending');
    }

    var isMe = currentUser && msg.sender_login === currentUser.login;
    if (isMe) item.classList.add('msg-me');
    else      item.classList.add('msg-other');

    var hasAttachment = !!msg.attachment_url;
    var hasText       = !!(mainText && String(mainText).trim().length > 0);

    var col = document.createElement('div');
    col.className = 'msg-col';

    // reply-block
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
            imgAtt.loading = 'lazy';
            imgAtt.decoding = 'async';
            imgAtt.onerror = function () { this.style.display = 'none'; };
            imgAtt.addEventListener('click', function (e) {
                if (item && item._suppressNextMediaClick) {
                    item._suppressNextMediaClick = false;
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                openMediaViewer(msg.attachment_url, 'image', imgAtt);
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
            videoAtt.setAttribute('playsinline','true');
            videoAtt.setAttribute('webkit-playsinline','true');
            videoAtt.preload     = 'metadata';
            videoAtt.autoplay    = true;
            videoAtt.controls    = false;

            var durLabel = document.createElement('div');
            durLabel.className = 'msg-video-duration';
            durLabel.textContent = '0:00 / 0:00';
            mediaWrapper.appendChild(durLabel);

            var totalDuration = 0;

            videoAtt.addEventListener('loadedmetadata', function () {
                if (!isNaN(videoAtt.duration) && isFinite(videoAtt.duration)) {
                    totalDuration = videoAtt.duration;
                    if (totalDuration < 1) totalDuration = 1;
                    durLabel.textContent = '0:00 / ' + formatSecondsToMMSS(totalDuration);
                }
                videoAtt.play().catch(function(){});
            });

            videoAtt.addEventListener('timeupdate', function () {
                if (!totalDuration || isNaN(totalDuration)) return;
                var cur = Math.max(0, videoAtt.currentTime);
                durLabel.textContent = formatSecondsToMMSS(cur) + ' / ' + formatSecondsToMMSS(totalDuration);
            });

            videoAtt.addEventListener('ended', function () {
                if (totalDuration) {
                    durLabel.textContent = formatSecondsToMMSS(totalDuration) + ' / ' + formatSecondsToMMSS(totalDuration);
                }
            });

            videoAtt.addEventListener('click', function (e) {
                if (item && item._suppressNextMediaClick) {
                    item._suppressNextMediaClick = false;
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }
                e.stopPropagation();
                e.preventDefault();
                openMediaViewer(msg.attachment_url, 'video', videoAtt);
            });

            mediaWrapper.appendChild(videoAtt);
        }

        col.appendChild(mediaWrapper);
    }

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

        var totalDurationA = 0;

        audio.addEventListener('loadedmetadata', function () {
            if (!isNaN(audio.duration) && isFinite(audio.duration)) {
                totalDurationA = audio.duration;
                if (totalDurationA < 1) totalDurationA = 1; // минимум 1 секунда
                timeLabel.textContent = formatSecondsToMMSS(totalDurationA);
            }
        });

        audio.addEventListener('timeupdate', function () {
            if (!totalDurationA || isNaN(totalDurationA)) return;
            var current = Math.max(0, audio.currentTime);
            var ratio = current / totalDurationA;
            var playedCount = Math.round(bars.length * ratio);
            bars.forEach(function(b, idx){
                if (idx < playedCount) b.classList.add('played');
                else b.classList.remove('played');
            });
            // Показываем прошедшее время
            timeLabel.textContent = formatSecondsToMMSS(current);
        });

        audio.addEventListener('ended', function () {
            playBtn.classList.remove('playing');
            bars.forEach(function(b){ b.classList.remove('played'); });
            if (totalDurationA) {
                timeLabel.textContent = formatSecondsToMMSS(totalDurationA);
            }
            if (currentVoiceAudio === audio) {
                currentVoiceAudio   = null;
                currentVoicePlayBtn = null;
            }
        });

        playBtn.addEventListener('click', function (e) {
            e.stopPropagation();

            if (audio.paused) {
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
            if (!totalDurationA || isNaN(totalDurationA)) return;
            var rect = wave.getBoundingClientRect();
            var x = ev.clientX - rect.left;
            var ratio = Math.max(0, Math.min(1, x / rect.width));
            audio.currentTime = ratio * totalDurationA;
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

        // При клике по файлу — инициируем скачивание
        fileBox.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!msg.attachment_url) return;

            var aTag = document.createElement('a');
            aTag.href = msg.attachment_url;
            aTag.download = msg.attachment_name || '';
            document.body.appendChild(aTag);
            aTag.click();
            document.body.removeChild(aTag);
        });

        bubble.appendChild(fileBox);
    }

    var textDiv = document.createElement('div');
    textDiv.className = 'msg-text';
    if (hasText) {
        textDiv.textContent = mainText;
    }
    bubble.appendChild(textDiv);

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

    // Чек‑марки показываем только для своих и не для pending
    if (isMe && !isPending) {
        var checksSpan = document.createElement('span');
        checksSpan.className = 'msg-checks';
        checksSpan.textContent = msg.read_by_all ? '✓✓' : '✓';
        metaLine.appendChild(checksSpan);
    }

    bubble.appendChild(metaLine);

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

    item.dataset.msgId             = msg.id;
    item.dataset.msgText           = mainText;
    item.dataset.msgSenderLogin    = msg.sender_login;
    item.dataset.msgSenderName     = msg.sender_name || msg.sender_login || '';
    item.dataset.msgAttachmentType = msg.attachment_type || '';
    item.dataset.msgAttachmentUrl  = msg.attachment_url || '';

    item.addEventListener('touchstart', onMsgTouchStart, { passive: true });
    item.addEventListener('touchmove',  onMsgTouchMove,  { passive: true });
    item.addEventListener('touchend',   onMsgTouchEnd);
    item.addEventListener('touchcancel',onMsgTouchEnd);

    attachMessageInteractions(item, msg);

    adjustMediaBlurForMessage(item);

    // Компенсация "подпрыгивания" при догрузке фото/видео
    if (chatContent && msg.attachment_type && (msg.attachment_type === 'image' || msg.attachment_type === 'video')) {
        var mediaEl = null;
        if (msg.attachment_type === 'image') {
            mediaEl = item.querySelector('.msg-attachment-image');
        } else if (msg.attachment_type === 'video') {
            mediaEl = item.querySelector('.msg-attachment-video');
        }

        if (mediaEl) {
            var adjust = function () {
                if (!chatContent) return;

                // Если это наше сообщение — всегда держим у низа
                var isMeNow = currentUser && msg.sender_login === currentUser.login;
                if (isMeNow) {
                    chatContent.scrollTop = chatContent.scrollHeight;
                    return;
                }

                // Для чужих — только если были близко к низу / чат только что открыт
                var fromBottom = chatContent.scrollHeight - (chatContent.scrollTop + chatContent.clientHeight);
                var justOpened = Date.now() - chatJustOpenedAt < 1500;
                if (fromBottom <= 80 || justOpened) {
                    chatContent.scrollTop = chatContent.scrollHeight;
                }
            };

            if (mediaEl.tagName.toLowerCase() === 'img') {
                if (mediaEl.complete) {
                    adjust();
                } else {
                    mediaEl.addEventListener('load', adjust, { once:true });
                }
            } else {
                if (mediaEl.readyState >= 1) {
                    adjust();
                } else {
                    mediaEl.addEventListener('loadedmetadata', adjust, { once:true });
                }
            }
        }
    }

    // Плавное появление нового сообщения (можно отключать)
    if (opts.skipAnimation) {
        item.classList.add('msg-visible');
    } else {
        requestAnimationFrame(function () {
            item.classList.add('msg-visible');
        });
    }
}



function renderPinnedTop(msg) {
    if (!pinnedTopBar) return;

    if (!msg) {
        pinnedTopBar.classList.remove('pinned-visible');
        pinnedTopBar.innerHTML = '';
        updateChatTopForPinned();
        return;
    }

    var parsed   = parseReplyWrappedText(msg.text || '');
    var mainText = (typeof parsed.mainText === 'string') ? parsed.mainText : (msg.text || '');
    var text     = String(mainText || '').replace(/\s+/g, ' ').trim();

    if (!text) {
        if (msg.attachment_type === 'image')      text = '[Фото]';
        else if (msg.attachment_type === 'video') text = '[Видео]';
        else if (msg.attachment_type === 'file')  text = '[Файл]';
        else if (msg.attachment_type === 'audio') text = 'Голосовое сообщение';
    }

    if (text.length > 80) text = text.slice(0, 77) + '…';

    pinnedTopBar.innerHTML = '';

    var labelEl = document.createElement('div');
    labelEl.className = 'pinned-top-label';
    labelEl.textContent = 'Закреплённое сообщение';

    var textEl = document.createElement('div');
    textEl.className = 'pinned-top-text';
    textEl.textContent = text;

    pinnedTopBar.appendChild(labelEl);
    pinnedTopBar.appendChild(textEl);

    pinnedTopBar.classList.add('pinned-visible');

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
    updateChatTopForPinned();
}

// ---------- КОПИРОВАНИЕ ТЕКСТА СООБЩЕНИЯ ----------

function copyMessageText(msgInfo) {
    if (!msgInfo) return;
    var text = msgInfo.text || '';
    if (!text && msgInfo.attachmentType) {
        if (msgInfo.attachmentType === 'image')      text = '[Фото]';
        else if (msgInfo.attachmentType === 'video') text = '[Видео]';
        else if (msgInfo.attachmentType === 'file')  text = '[Файл]';
        else if (msgInfo.attachmentType === 'audio') text = 'Голосовое сообщение';
    }
    if (!text) return;

    function done() {
        if (typeof showInfoBanner === 'function') {
            showInfoBanner('Текст скопирован');
        }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        done();
    }
}

// === КОНТЕКСТНОЕ МЕНЮ СООБЩЕНИЙ ===

function createMsgContextMenu() {
    if (msgContextOverlay) return;

    msgContextOverlay = document.createElement('div');
    msgContextOverlay.className = 'msg-context-overlay';

    msgContextMenu = document.createElement('div');
    msgContextMenu.className = 'msg-context-menu';

    msgCtxEmojiRow = document.createElement('div');
    msgCtxEmojiRow.className = 'msg-context-emoji-row';
    ['👍','❤️','😂','😮','😢','🔥'].forEach(function(em) {
        var sp = document.createElement('span');
        sp.className = 'msg-context-emoji';
        sp.textContent = em;
        sp.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!currentMsgContext) return;
            reactToMessage(currentMsgContext, em);
            hideMsgContextMenu();
        });
        msgCtxEmojiRow.appendChild(sp);
    });

    msgCtxReplyBtn = document.createElement('button');
    msgCtxReplyBtn.className = 'msg-context-btn';
    msgCtxReplyBtn.textContent = 'Ответить';

    msgCtxForwardBtn = document.createElement('button');
    msgCtxForwardBtn.className = 'msg-context-btn';
    msgCtxForwardBtn.textContent = 'Переслать';

    msgCtxDownloadBtn = document.createElement('button');
    msgCtxDownloadBtn.className = 'msg-context-btn';
    msgCtxDownloadBtn.textContent = 'Скачать';

    msgCtxCopyBtn = document.createElement('button');
    msgCtxCopyBtn.className = 'msg-context-btn';
    msgCtxCopyBtn.textContent = 'Копировать текст';

    msgCtxEditBtn = document.createElement('button');
    msgCtxEditBtn.className = 'msg-context-btn';
    msgCtxEditBtn.textContent = 'Редактировать';

    msgCtxDeleteBtn = document.createElement('button');
    msgCtxDeleteBtn.className = 'msg-context-btn msg-context-btn-danger';
    msgCtxDeleteBtn.textContent = 'Удалить';

    msgContextMenu.appendChild(msgCtxEmojiRow);
    msgContextMenu.appendChild(msgCtxReplyBtn);
    msgContextMenu.appendChild(msgCtxForwardBtn);
    msgContextMenu.appendChild(msgCtxDownloadBtn);
    msgContextMenu.appendChild(msgCtxCopyBtn);
    msgContextMenu.appendChild(msgCtxEditBtn);
    msgContextMenu.appendChild(msgCtxDeleteBtn);

    msgContextOverlay.appendChild(msgContextMenu);

    (chatScreen || document.body).appendChild(msgContextOverlay);

    // Клик по фону: закрываем меню (с задержкой после открытия)
    msgContextOverlay.addEventListener('click', function (e) {
        if (e.target !== msgContextOverlay) return;

        var elapsed = Date.now() - msgCtxOpenedAt;
        if (elapsed < 400) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        hideMsgContextMenu();
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
msgCtxDownloadBtn.onclick = function () {
        if (!currentMsgContext) return;
        downloadMessageAttachment(currentMsgContext);
        hideMsgContextMenu();
    };

    msgCtxCopyBtn.onclick = function () {
        if (!currentMsgContext) return;
        copyMessageText(currentMsgContext);
        hideMsgContextMenu();
    };
}

// скачивание / открытие вложения сообщения
function downloadMessageAttachment(msgInfo) {
    if (!msgInfo || !msgInfo.attachmentUrl) return;

    var url  = msgInfo.attachmentUrl;
    var type = msgInfo.attachmentType || '';
    var fileName = msgInfo.attachmentName || '';

    if (!fileName) {
        if (type === 'image')      fileName = 'photo.jpg';
        else if (type === 'video') fileName = 'video.mp4';
        else if (type === 'audio') fileName = 'audio.m4a';
        else                       fileName = 'file';
    }

    // На iOS (особенно в PWA) атрибут download и программный клик по ссылке
    // почти не работают. Вместо этого открываем медиа в Safari / новом окне,
    // а пользователь сохраняет через меню «Поделиться».
    if (IS_IOS && (type === 'image' || type === 'video' || type === 'audio')) {
        try {
            var opened = window.open(url, '_blank');
            if (!opened) {
                // Если блокируется попап — навигируемся в это же окно
                window.location.href = url;
            }
        } catch (e) {
            window.location.href = url;
        }

        if (typeof showInfoBanner === 'function') {
            var hint;
            if (type === 'image') {
                hint = 'Фото открыто. Нажмите «Поделиться» → «Сохранить изображение», чтобы сохранить в галерею.';
            } else if (type === 'video') {
                hint = 'Видео открыто. Нажмите «Поделиться» → «Сохранить видео», чтобы сохранить в галерею.';
            } else {
                hint = 'Файл открыт. Используйте меню «Поделиться», чтобы сохранить.';
            }
            showInfoBanner(hint);
        }
        return;
    }

    // На остальных платформах пробуем стандартный download
    var link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);

    try {
        link.click();
        if (typeof showInfoBanner === 'function') {
            showInfoBanner('Скачивание началось');
        }
    } catch (e) {
        // Fallback: просто открываем файл, чтобы пользователь мог его сохранить
        window.location.href = url;
        if (typeof showInfoBanner === 'function') {
            showInfoBanner('Файл открыт. Сохраните его вручную.');
        }
    } finally {
        document.body.removeChild(link);
    }
}

// === ОБРАБОТЧИКИ ДЛЯ СООБЩЕНИЙ ===

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

    // ПК: правый клик
    item.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        showMsgContextMenu(item._msgInfo, item);
    });

    // --- LONG PRESS: мышь ---
    var mouseTimer = null;
    item.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;

        mouseTimer = setTimeout(function () {
            item.classList.add('msg-item-pressed');
            showMsgContextMenu(item._msgInfo, item);
        }, 300);
    });

    ['mouseup','mouseleave'].forEach(function (ev) {
        item.addEventListener(ev, function () {
            if (mouseTimer) {
                clearTimeout(mouseTimer);
                mouseTimer = null;
            }
            if (!msgContextOverlay || !msgContextOverlay.classList.contains('visible')) {
                item.classList.remove('msg-item-pressed');
            }
        });
    });

    // --- LONG PRESS: тач ---
    var touchTimer = null;

    item.addEventListener('touchstart', function (e) {
        touchTimer = setTimeout(function () {
            vibrate(40);
            item.classList.add('msg-item-pressed');
            showMsgContextMenu(item._msgInfo, item);
        }, 300);
    }, { passive: false });

    item.addEventListener('touchmove', function (e) {
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
        if (!msgContextOverlay || !msgContextOverlay.classList.contains('visible')) {
            item.classList.remove('msg-item-pressed');
        }
    }, { passive: false });

    item.addEventListener('touchend', function (e) {
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }

        if (msgContextOverlay &&
            msgContextOverlay.classList.contains('visible') &&
            currentMsgContextItem === item) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!msgContextOverlay || !msgContextOverlay.classList.contains('visible')) {
            item.classList.remove('msg-item-pressed');
        }
    }, { passive: false });

    // Двойной клик / даблтап — только реакция ❤️
    item.addEventListener('dblclick', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!item._msgInfo) return;
        reactToMessage(item._msgInfo, '❤️');
    });
}

function hideMsgContextMenu() {
    if (!msgContextOverlay || !msgContextMenu) return;

    msgContextMenu.classList.remove('open');
    msgContextOverlay.classList.remove('visible');

    if (currentMsgContextItem) {
        currentMsgContextItem.classList.remove('msg-item-pressed');
        if (currentMsgContextItem._oldZIndex !== undefined) {
            currentMsgContextItem.style.zIndex = currentMsgContextItem._oldZIndex || '';
            delete currentMsgContextItem._oldZIndex;
        } else {
            currentMsgContextItem.style.zIndex = '';
        }
        currentMsgContextItem = null;
    }
    currentMsgContext = null;
}

// Позиционирование меню сообщений с возможным скроллом
function showMsgContextMenu(msgInfo, item) {
    if (!msgInfo || !currentUser || !item) return;

    // Для фото/видео — отдельное медиа-меню, если флаг не запрещает
    if (!msgInfo._disableMediaMenu &&
        (msgInfo.attachmentType === 'image' || msgInfo.attachmentType === 'video')) {
        showMediaContextMenu(msgInfo, item);
        return;
    }

    createMsgContextMenu();

    msgCtxOpenedAt = Date.now();

    currentMsgContext     = msgInfo;
    currentMsgContextItem = item;

    // подавляем следующий клик по медиа (чтобы не открыть viewer сразу после long-press)
    item._suppressNextMediaClick = true;

    var isMe          = String(msgInfo.senderLogin).toLowerCase() === String(currentUser.login).toLowerCase();
    var hasText       = msgInfo.text && String(msgInfo.text).trim().length > 0;
    var hasAttachment = !!msgInfo.attachmentType;

    // какие вложения можем скачивать
    var canDownload =
        hasAttachment &&
        (msgInfo.attachmentType === 'file' ||
         msgInfo.attachmentType === 'image' ||
         msgInfo.attachmentType === 'video');

    if (item._oldZIndex === undefined) {
        item._oldZIndex = item.style.zIndex || '';
    }
    item.style.zIndex = '9999';

    // видимость кнопок
    msgCtxEditBtn.style.display   = (isMe && (hasText || hasAttachment)) ? '' : 'none';
    msgCtxDeleteBtn.style.display = isMe ? '' : 'none';
    msgCtxDownloadBtn.style.display = (canDownload && msgInfo.attachmentUrl) ? '' : 'none';
    msgCtxCopyBtn.style.display     = hasText ? '' : 'none';

    msgContextOverlay.classList.add('visible');
    msgContextMenu.classList.remove('open');

    function positionMenu(allowScroll, stage) {
        if (!msgContextMenu || !currentMsgContextItem) return;

        stage = stage || 0;

        var refEl = currentMsgContextItem.querySelector('.msg-col') ||
                    currentMsgContextItem.querySelector('.msg-bubble') ||
                    currentMsgContextItem;

        var rect = refEl.getBoundingClientRect();
        var vh   = window.innerHeight || document.documentElement.clientHeight || 600;

        var menuH  = msgContextMenu.offsetHeight || 160;
        var margin = 8;

        var headerH = 64;
        var pinnedH = 0;
        if (pinnedTopBar && pinnedTopBar.style.display !== 'none') {
            var pr = pinnedTopBar.getBoundingClientRect();
            pinnedH = pr.height || 0;
        }
        var safeTop = headerH + pinnedH + 16;

        var bottomReserve = 8;
        if (chatInputForm) {
            var ir = chatInputForm.getBoundingClientRect();
            bottomReserve += ir.height || 0;
        }
        if (attachPreviewBar && attachPreviewBar.style.display !== 'none') {
            var ar = attachPreviewBar.getBoundingClientRect();
            bottomReserve += ar.height || 0;
        }
        if (replyBar && replyBar.style.display !== 'none') {
            var rr = replyBar.getBoundingClientRect();
            bottomReserve += rr.height || 0;
        }
        var safeBottom = bottomReserve;

        var spaceAbove = rect.top    - safeTop;
        var spaceBelow = vh - safeBottom - rect.bottom;

        if (allowScroll && chatContent && stage === 0 &&
            (spaceBelow < menuH + margin)) {

            var desiredBottom = vh - safeBottom - menuH - margin;
            var delta = (rect.bottom - desiredBottom);

            chatContent.scrollTo({
                top: chatContent.scrollTop + delta,
                behavior: 'smooth'
            });

            setTimeout(function () {
                positionMenu(true, 1);
            }, 260);
            return;
        }

        if (allowScroll && chatContent && stage === 1 &&
            (spaceAbove < menuH + margin)) {

            var desiredTop = safeTop + margin + menuH;
            var deltaTop   = (desiredTop - rect.top);

            chatContent.scrollTo({
                top: chatContent.scrollTop - deltaTop,
                behavior: 'smooth'
            });

            setTimeout(function () {
                positionMenu(false, 2);
            }, 260);
            return;
        }

        var top;
        if (spaceBelow >= menuH + margin) {
            top = rect.bottom + margin;
        } else if (spaceAbove >= menuH + margin) {
            top = rect.top - menuH - margin;
        } else {
            top = (vh - menuH) / 2;
        }

        var minTop = safeTop;
        var maxTop = vh - safeBottom - menuH;
        if (maxTop < minTop) maxTop = minTop;
        if (top < minTop) top = minTop;
        if (top > maxTop) top = maxTop;

        msgContextMenu.style.top = top + 'px';

        if (isMe) {
            msgContextMenu.style.right = '12px';
            msgContextMenu.style.left  = 'auto';
            msgContextMenu.style.transformOrigin = 'top right';
        } else {
            msgContextMenu.style.left  = '12px';
            msgContextMenu.style.right = 'auto';
            msgContextMenu.style.transformOrigin = 'top left';
        }

        requestAnimationFrame(function () {
            msgContextMenu.classList.add('open');
        });
    }

    requestAnimationFrame(function () {
        positionMenu(true);
    });
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
                // Анимация удаления + локальное обновление
                animateMessageRemoveById(msgInfo.id);
            } else {
                var fullText = newText;
                if (msgInfo.reply) {
                    var r = msgInfo.reply;
                    var rName  = (r.senderName  || r.senderLogin || '').trim();
                    var rLogin = (r.senderLogin || '').trim();
                    var rText  = String(r.text || '').replace(/\s+/g,' ').trim();

                    // если есть числовой ID исходного сообщения – сохраняем его в [r:ID]
                    var header;
                    if (r.messageId && /^\d+$/.test(String(r.messageId))) {
                        header = '[r:' + String(r.messageId) + ']';
                    } else {
                        header = '[r]';
                    }

                    fullText =
                        header + rName + '\n' +
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

                // Успех — сразу обновляем UI локально (реальное время)
                bubble.removeChild(wrap);
                textEl.style.display = '';
                metaEl.style.display = '';

                msgInfo.text = newText;
                item.dataset.msgText = newText;
                textEl.textContent = newText;

                var metaLine = bubble.querySelector('.msg-meta');
                if (metaLine) {
                    var editedMark = metaLine.querySelector('.msg-edited');
                    if (!editedMark) {
                        editedMark = document.createElement('span');
                        editedMark.className = 'msg-edited';
                        editedMark.textContent = ' (изменено)';
                        metaLine.appendChild(editedMark);
                    }
                }

                currentEditingMsgId = null;
                startMessagePolling();

                // Небольшой мягкий рефреш, чтобы подтянуть возможные новые сообщения,
                // но без резкого "дёрганья" — позицию сохраняем
                await refreshMessagesKeepingMessage(msgInfo.id);
            }
        } catch (e) {
            alert('Сетевая ошибка при редактировании');
        }
    };

    ta.focus();
}

// Анимация удаления и последующий refresh
function animateMessageRemoveById(messageId) {
    if (!chatContent || !messageId) return;
    var item = chatContent.querySelector('.msg-item[data-msg-id="' + messageId + '"]');
    if (!item) {
        refreshMessages(true);
        return;
    }
    item.style.transition = 'opacity 0.18s ease-out, transform 0.18s ease-out';
    item.style.opacity = '0';
    item.style.transform = 'translateY(4px)';
    setTimeout(function () {
        if (item && item.parentNode) item.parentNode.removeChild(item);
        refreshMessages(true);
    }, 180);
}

// app.js — PART 3/4

// ---------- DELETE / REACT / PIN ----------

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
        animateMessageRemoveById(msgInfo.id);
    } catch (e) {
        alert('Сетевая ошибка при удалении');
    }
}

async function reactToMessage(msgInfo, emoji) {
    if (!currentUser || !currentUser.login || !chatContent) return;

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

        // обновляем только одно сообщение в DOM (реальное время)
        var item = chatContent.querySelector('.msg-item[data-msg-id="' + msgInfo.id + '"]');
        if (!item) return;

        var bubble = item.querySelector('.msg-bubble');
        if (!bubble) return;

        var reactRow = bubble.querySelector('.msg-reactions');
        if (!data.reactions || !data.reactions.length) {
            if (reactRow && reactRow.parentNode) reactRow.parentNode.removeChild(reactRow);
        } else {
            if (!reactRow) {
                reactRow = document.createElement('div');
                reactRow.className = 'msg-reactions';
                bubble.appendChild(reactRow);
            }
            reactRow.innerHTML = '';
            (data.reactions || []).forEach(function (r) {
                var sp = document.createElement('span');
                sp.className = 'msg-reaction';
                if (data.myReaction === r.emoji) sp.classList.add('my');
                sp.textContent = r.emoji + ' ' + r.count;
                reactRow.appendChild(sp);
            });
        }

        // обновляем локально msgInfo и item._msgInfo
        msgInfo.reactions = data.reactions || [];
        msgInfo.myReaction = data.myReaction || null;
        if (item._msgInfo) {
            item._msgInfo.reactions = msgInfo.reactions;
            item._msgInfo.myReaction = msgInfo.myReaction;
        }
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

        // мягко подтягиваем состояние (закреплённое сверху), сохраняя позицию
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
    if (!chatContent || !currentUser || !currentUser.login || !chatId) return;

    // Инициализируем состояние для чата
    chatRenderState[chatId] = {
        initialized: false,
        lastId:      0,
        oldestId:    null,
        pinnedId:    null,
        hasMore:     true
    };
    messagesById = {};

    // Загружаем первую страницу (последние 30 сообщений)
    var page = await fetchMessagesPage(chatId, null, 30);
    if (!page) {
        chatContent.innerHTML = '';
        return;
    }

    var msgs  = page.messages || [];
    var state = chatRenderState[chatId];

    chatContent.innerHTML = '';
    var unreadInserted = false;
    var myLastReadId   = page.myLastReadId || 0;

    // pinned
    state.pinnedId = page.pinnedId || null;
    var pinnedMsg = null;

    msgs.forEach(function (m) {
        messagesById[m.id] = m;
        if (state.pinnedId && m.id === state.pinnedId) pinnedMsg = m;
    });
// рендер сообщений + "Непрочитанные" в нужном месте
    msgs.forEach(function (m) {
        if (!unreadInserted && myLastReadId && m.id > myLastReadId) {
            var sep = document.createElement('div');
            sep.className = 'msg-unread-separator';
            var span = document.createElement('span');
            span.textContent = 'Непрочитанные';
            sep.appendChild(span);
            chatContent.appendChild(sep);
            unreadInserted = true;
        }
        renderMessage(m);
    });

    // обновляем state
    if (msgs.length) {
        state.initialized = true;
        state.lastId   = msgs[msgs.length - 1].id;
        state.oldestId = msgs[0].id;
    } else {
        state.initialized = true;
        state.lastId   = 0;
        state.oldestId = null;
    }
    state.hasMore = !!page.hasMore;

    // запоминаем, какой чат сейчас реально отрисован
    lastRenderedChatId = chatId;

    // прокручиваем в самый низ
    chatContent.scrollTop = chatContent.scrollHeight;

    // обновляем статус прочитанности и отмечаем прочтение
    updateReadStatusInDom(msgs);
    await markChatRead(chatId);
}

function startMessagePolling() {
    if (messagePollInterval) clearInterval(messagePollInterval);

    messagePollInterval = setInterval(async function () {
        if (!chatContent || !currentUser || !currentUser.login || !currentChat) return;
        var fromBottom = chatContent.scrollHeight - (chatContent.scrollTop + chatContent.clientHeight);
        if (fromBottom > 80) return;

        await refreshMessages(false);
    }, 5000);
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
            ((chat.type === 'group' || chat.type === 'groupCustom') ? '/group-avatar.png' : '/default-avatar.png');
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

// ---------- WEB PUSH / SERVICE WORKER ----------

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

        var reg = await navigator.serviceWorker.ready;

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

// ---------- РЕНДЕР СПИСКА ЧАТОВ ----------

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

// карта id -> DOM-элемент уже есть выше: var chatItemsById = {};

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
        img.loading = 'lazy';
        img.decoding = 'async';
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

        // обычный клик — открыть чат
        item.addEventListener('click', function () {
            // если меню открыто на этом же чате — закрываем и ОТКРЫВАЕМ чат
            if (chatContextOverlay &&
                chatContextOverlay.classList.contains('visible') &&
                contextMenuTargetChatItem === item) {
                hideChatContextMenu();
                openChat(chat);
                return;
            }

            if (suppressChatClick) {
                suppressChatClick = false;
                return;
            }
            openChat(chat);
        });

        // Правый клик — тоже контекстное меню
        item.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            showChatContextMenu(chat, item);
        });

        // long-press (мышь)
        var mouseTimer = null;
        item.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;

            mouseTimer = setTimeout(function () {
                item.classList.add('chat-item-pressed');
                showChatContextMenu(chat, item);
                suppressChatClick = true;
            }, 300);
        });
        ['mouseup','mouseleave'].forEach(function (ev) {
            item.addEventListener(ev, function () {
                if (mouseTimer) {
                    clearTimeout(mouseTimer);
                    mouseTimer = null;
                }
                if (!chatContextOverlay || !chatContextOverlay.classList.contains('visible')) {
                    item.classList.remove('chat-item-pressed');
                }
            });
        });

        var touchTimer = null;
        item.addEventListener('touchstart', function () {
            touchTimer = setTimeout(function () {
                item.classList.add('chat-item-pressed');
                showChatContextMenu(chat, item);
                suppressChatClick = true;
            }, 300);
        }, { passive: true });

        item.addEventListener('touchmove', function () {
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
            if (!chatContextOverlay || !chatContextOverlay.classList.contains('visible')) {
                item.classList.remove('chat-item-pressed');
            }
        }, { passive: true });

        item.addEventListener('touchend', function () {
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
            if (!chatContextOverlay || !chatContextOverlay.classList.contains('visible')) {
                item.classList.remove('chat-item-pressed');
            }
        });

        chatItemsById[chat.id] = item;

        // Плавное появление только при первом создании
        item._appeared = false;
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
        var defaultGroupAvatar = '/group-avatar.png';
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
// первый раз после создания — мягко показать
    if (!item._appeared) {
        item._appeared = true;
        requestAnimationFrame(function () {
            item.classList.add('chat-item-visible');
        });
    }

    return item;
}

function renderChatListFromLastChats() {
    if (!chatList) return;

    chatList.innerHTML = '';
    if (!lastChats || !lastChats.length) {
        var empty = document.createElement('div');
        empty.style.padding = '24px 16px';
        empty.style.color = 'rgba(255,255,255,0.6)';
        empty.style.fontSize = '14px';
        empty.textContent = 'У вас пока нет чатов.';
        chatList.appendChild(empty);
        return;
    }

    var term = (currentChatSearch || '').trim().toLowerCase();
    var appended = 0;

    lastChats.forEach(function (chat) {
        if (term) {
            var title = (chat.title || '').toLowerCase();
            if (title.indexOf(term) === -1) return;
        }
        var item = renderOrCreateChatItem(chat);
        if (item) {
            chatList.appendChild(item);
            appended++;
        }
    });

    // Если чаты есть, но под фильтр ничего не подошло — показываем сообщение
    if (!appended) {
        var empty = document.createElement('div');
        empty.style.padding = '24px 16px';
        empty.style.color = 'rgba(255,255,255,0.6)';
        empty.style.fontSize = '14px';
        empty.textContent = 'Ничего не найдено';
        chatList.appendChild(empty);
    }
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

    // Личные чаты: partnerLogin всегда логин собеседника
    if (chat.type === 'personal') {
        return chat.partnerLogin || null;
    }

    if (chat.type === 'trainer') {
        // В тренерском чате есть два логина: trainerLogin и partnerLogin.
        // Собеседник — тот, кто НЕ равен текущему пользователю.
        var me = String(currentUser.login || '').toLowerCase();
        var t  = chat.trainerLogin ? String(chat.trainerLogin).toLowerCase() : null;
        var p  = chat.partnerLogin ? String(chat.partnerLogin).toLowerCase() : null;

        if (t && t !== me) return chat.trainerLogin;
        if (p && p !== me) return chat.partnerLogin;

        // fallback: если что-то пошло не так, вернём хоть что-то
        return chat.partnerLogin || chat.trainerLogin || null;
    }

    return null;
}

// app.js — PART 4/4

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
        const resp = await fetch('/api/user/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: login })
        });
        const data = await resp.json();

        if (!resp.ok || !data.ok) {
            alert(data.error || 'Не удалось получить данные пользователя');
            return;
        }

        const user        = data;
        const targetLogin = user.login || login;
        const card        = chatUserModal.querySelector('.chat-user-modal-card');

        if (chatUserAvatar) {
            let src = user.avatar || '/img/default-avatar.png';
            chatUserAvatar.onerror = function () {
                this.onerror = null;
                this.src = '/group-avatar.png';
            };
            chatUserAvatar.src = src;
        }

        if (chatUserName) {
            let fullName = '';
            if (user.firstName) fullName += user.firstName + ' ';
            if (user.lastName)  fullName += user.lastName;
            chatUserName.textContent = fullName.trim() || targetLogin;
        }

        if (chatUserId) {
            if (user.publicId) {
                chatUserId.style.display = '';
                chatUserId.textContent   = 'ID: ' + user.publicId;
            } else {
                chatUserId.style.display = 'none';
                chatUserId.textContent   = '';
            }
        }

        if (chatUserTeam) {
            chatUserTeam.textContent = formatTeamDisplayName(user.team || '');
        }

        if (chatUserDob) {
            if (user.dob) {
                chatUserDob.style.display = '';
                chatUserDob.textContent   = formatDateForProfile(user.dob);
            } else {
                chatUserDob.style.display = 'none';
                chatUserDob.textContent   = '';
            }
        }

        const isSelf = currentUser && targetLogin &&
                       String(currentUser.login).toLowerCase() === String(targetLogin).toLowerCase();

        if (chatUserBackBtn) {
            chatUserBackBtn.style.display = 'flex';
            chatUserBackBtn.onclick = function (e) {
                e.stopPropagation();
                hideChatUserModal();
                if (userInfoFromGroup && groupModal) {
                    groupModal.classList.add('visible');
                }
            };
        }

        if (chatUserWriteBtn && card) {
            chatUserWriteBtn.style.display = 'none';
            chatUserWriteBtn.onclick = null;

            if (!isSelf && currentUser && currentUser.login && userInfoFromGroup) {
                if (chatUserAttachments) {
                    card.insertBefore(chatUserWriteBtn, chatUserAttachments);
                } else if (chatUserDob) {
                    card.insertBefore(chatUserWriteBtn, chatUserDob.nextSibling);
                } else {
                    card.appendChild(chatUserWriteBtn);
                }

                chatUserWriteBtn.style.display = '';
                chatUserWriteBtn.onclick = async function (e) {
                    e.stopPropagation();
                    try {
                        const resp2 = await fetch('/api/chat/personal', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                login: currentUser.login,
                                targetLogin: targetLogin
                            })
                        });
                        const d2 = await resp2.json();
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

        if (chatUserRemoveBtn) {
            if (isSelf ||
                !currentUser || !currentUser.login ||
                !currentChat || currentChat.type !== 'groupCustom') {
                chatUserRemoveBtn.style.display = 'none';
                chatUserRemoveBtn.onclick = null;
            } else {
                const roleLower = (currentUser.role || '').toLowerCase();
                if (roleLower === 'trainer' || roleLower === 'тренер') {
                    chatUserRemoveBtn.style.display = '';
                    chatUserRemoveBtn.onclick = async function (e) {
                        e.stopPropagation();
                        try {
                            const resp3 = await fetch('/api/group/remove-member', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    login: currentUser.login,
                                    chatId: currentChat.id,
                                    targetLogin: targetLogin
                                })
                            });
                            const d3 = await resp3.json();
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
                } else {
                    chatUserRemoveBtn.style.display = 'none';
                    chatUserRemoveBtn.onclick = null;
                }
            }
        }

        if (!userInfoFromGroup &&
            chatUserAttachments && chatUserMediaGrid && chatUserAudioList) {

            chatUserAttachments.style.display = 'flex';

            const userTabs = {
                mediaTab: chatUserMediaTab,
                audioTab: chatUserAudioTab
            };

            await loadAttachmentsForCurrentChat(
                chatUserAttachments,
                chatUserMediaGrid,
                chatUserAudioList,
                userTabs,
                'media'
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

    var partnerLogin = null;

    if (currentChat.type === 'personal') {
        // личный чат
        partnerLogin = currentChat.partnerLogin || null;
    } else if (currentChat.type === 'trainer') {
        // тренерский чат: в объекте чата есть trainerLogin и partnerLogin
        var me = String(currentUser.login || '').toLowerCase();

        if (currentChat.trainerLogin &&
            String(currentChat.trainerLogin).toLowerCase() !== me) {
            partnerLogin = currentChat.trainerLogin;
        } else if (currentChat.partnerLogin &&
                   String(currentChat.partnerLogin).toLowerCase() !== me) {
            partnerLogin = currentChat.partnerLogin;
        }
    }

    if (!partnerLogin) return;

    try {
        await openUserInfoModal(partnerLogin, false);
    } catch (e) {
        console.error('openChatUserModal error:', e);
        // минимальный фолбэк
        if (chatUserName) chatUserName.textContent = partnerLogin;
        if (chatUserModal) chatUserModal.classList.add('visible');
    }
}

// ---------- МОДАЛКА ГРУППЫ ----------

function hideGroupModal() {
    if (groupModal) groupModal.classList.remove('visible');
}

if (groupBackBtn && groupModal) {
    groupBackBtn.onclick = function (e) {
        e.stopPropagation();
        hideGroupModal();
    };
}

function hideGroupAddModal() {
    if (groupAddModal) groupAddModal.classList.remove('visible');
}

function showGroupAddModal() {
    if (!groupAddModal || !currentGroupName || !currentGroupInfo) return;

    var defaultGroupAvatar = '/group-avatar.png';

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

    groupAddModal.classList.add('visible');
}

async function openGroupModal() {
    if (!groupModal || !currentChat || !currentUser) return;
    if (currentChat.type !== 'group' && currentChat.type !== 'groupCustom') return;

    var defaultGroupAvatar = '/group-avatar.png';

    try {
        var resp = await fetch('/api/group/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: currentChat.id, login: currentUser.login })
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

        currentGroupName     = groupName;
        currentGroupAudience = data.audience || null;
        currentGroupAge      = data.age || null;
        currentGroupInfo     = {
            name: groupName,
            avatar: groupAvatarUrl,
            membersCount: membersCount
        };

        if (groupAvatar) {
            groupAvatar.src = groupAvatarUrl;
            groupAvatar.onerror = function () {
                this.onerror = null;
                this.src = defaultGroupAvatar;
            };
        }

        if (groupNameTitle) {
            groupNameTitle.textContent = groupName;
        }

        if (groupAgeLabel) {
            if (currentGroupAudience === 'dancers' && currentGroupAge) {
                groupAgeLabel.textContent = currentGroupAge;
                groupAgeLabel.style.display = 'inline-block';
            } else {
                groupAgeLabel.textContent = '';
                groupAgeLabel.style.display = 'none';
            }
        }

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
                img.loading = 'lazy';
                img.decoding = 'async';
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

        if (groupAttachments && groupMediaGrid && groupAudioList) {
            groupAttachments.style.display = 'flex';

            var groupTabs = {
                membersTab: groupMembersTab,
                mediaTab:   groupMediaTab,
                audioTab:   groupAudioTab
            };

            await loadAttachmentsForCurrentChat(
                groupAttachments,
                groupMediaGrid,
                groupAudioList,
                groupTabs,
                'members'
            );
        }

        hideGroupAddModal();
        groupModal.classList.add('visible');
    } catch (e) {
        alert('Сетевая ошибка при загрузке группы');
    }
}

// свайп закрытия модалок
function initModalSwipeClose(modalEl, hideFn, cardSelector) {
    if (!modalEl || !hideFn) return;

    var startX = null;
    var startY = null;
    var dx     = 0;

    var cardEl = cardSelector ? modalEl.querySelector(cardSelector) : null;

    modalEl.addEventListener('touchstart', function (e) {
        var isVisible = modalEl.classList.contains('visible') || modalEl.style.display === 'flex';
        if (!isVisible) return;
        if (e.touches.length !== 1) return;

        var t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        dx     = 0;

        if (cardEl) cardEl.style.transition = 'none';
        e.stopPropagation();
    }, { passive:true });

    modalEl.addEventListener('touchmove', function (e) {
        if (startX == null) return;
        var t  = e.touches[0];
        var mx = t.clientX - startX;
        var my = t.clientY - startY;
        e.stopPropagation();

        if (mx <= 0 || Math.abs(my) > Math.abs(mx)) {
            dx = 0;
            if (cardEl) cardEl.style.transform = 'translateX(0px)';
            return;
        }

        dx = mx;
        var maxW     = window.innerWidth || 375;
        var translate = Math.min(mx, maxW);
        if (cardEl) cardEl.style.transform = 'translateX(' + translate + 'px)';
    }, { passive:true });

    function finishModalSwipe(shouldClose) {
        if (cardEl) {
            cardEl.style.transition = 'transform 0.2s ease-out';
            var maxW = window.innerWidth || 375;

            if (shouldClose) {
                cardEl.style.transform = 'translateX(' + maxW + 'px)';
                setTimeout(function () {
                    cardEl.style.transform = '';
                    cardEl.style.transition = '';
                    hideFn();
                }, 180);
            } else {
                cardEl.style.transform = 'translateX(0px)';
                setTimeout(function () {
                    cardEl.style.transition = '';
                }, 180);
            }
        } else {
            if (shouldClose) hideFn();
        }
        startX = startY = null;
        dx     = 0;
    }

    modalEl.addEventListener('touchend', function (e) {
        if (startX == null) return;
        e.stopPropagation();

        var maxW     = window.innerWidth || 375;
        var current  = Math.min(Math.max(dx, 0), maxW);
        var threshold = maxW * 0.25;

        var shouldClose = current >= threshold;
        finishModalSwipe(shouldClose);
    });

    modalEl.addEventListener('touchcancel', function (e) {
        if (startX == null) return;
        e.stopPropagation();
        finishModalSwipe(false);
    });
}

initModalSwipeClose(chatUserModal, hideChatUserModal, '.chat-user-modal-card');
initModalSwipeClose(groupModal, hideGroupModal, '.group-modal-card');
initModalSwipeClose(groupAddModal, hideGroupAddModal, '.group-add-modal-card');

// ---------- FEED / ЛЕНТА ----------

function renderFeedPost(post) {
    if (!feedList || !post) return;

    var card = document.createElement('div');
    card.className = 'feed-post';

    card.dataset.postId   = String(post.id);
    card.dataset.postText = post.text || '';

    // HEADER
    var header = document.createElement('div');
    header.className = 'feed-post-header';

    var aw = document.createElement('div');
    aw.className = 'feed-post-avatar-wrapper';

    var img = document.createElement('img');
    img.className = 'feed-post-avatar';
    img.src = '/group-avatar.png';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = function () {
        this.onerror = null;
        this.src = '/group-avatar.png';
    };
    aw.appendChild(img);

    var nameEl = document.createElement('div');
    nameEl.className = 'feed-post-author';
    nameEl.textContent = 'Vinyl Dance Family';

    header.appendChild(aw);
    header.appendChild(nameEl);

    // КАРТИНКА ПОСТА
    var imgPost = null;
    if (post.imageUrl) {
        imgPost = document.createElement('img');
        imgPost.className = 'feed-post-image';
        imgPost.src = post.imageUrl;
        imgPost.loading = 'lazy';
        imgPost.decoding = 'async';
        imgPost.onerror = function () { this.style.display = 'none'; };
    }

    // ТЕКСТ
    var textEl = document.createElement('div');
    textEl.className = 'feed-post-text';
    textEl.textContent = post.text || '';

    // FOOTER
    var footer = document.createElement('div');
    footer.className = 'feed-post-footer';

    // ЛАЙК
    var likesRow = document.createElement('div');
    likesRow.className = 'feed-post-likes';

    var likePill = document.createElement('div');
    likePill.className = 'feed-like-pill';

    function renderLikeState(liked, count) {
        if (count < 0) count = 0;

        if (count === 0) {
            likePill.textContent = '❤️';
        } else {
            likePill.textContent = '❤️ ' + String(count);
        }

        if (liked) {
            likePill.classList.add('liked');
        } else {
            likePill.classList.remove('liked');
        }
    }

    renderLikeState(!!post.likedByMe, post.likesCount || 0);

    async function toggleLike() {
        if (!currentUser || !currentUser.login) return;
        try {
            var resp = await fetch('/api/feed/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login: currentUser.login,
                    postId: Number(post.id)
                })
            });
            var data = await resp.json();
            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка лайка');
                return;
            }

            // локально сразу обновляем лайк
            renderLikeState(data.liked, data.likesCount || 0);

            // в течение 2 секунд игнорируем feedUpdated по WebSocket,
            // чтобы не было мигания ленты
            suppressFeedReloadUntil = Date.now() + 2000;
        } catch (e) {
            alert('Сетевая ошибка при лайке');
        }
    }

    likePill.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleLike();
    });

    likesRow.appendChild(likePill);

    var dateEl = document.createElement('div');
    dateEl.className = 'feed-post-date';
    dateEl.textContent = formatDateTime(post.createdAt);

    footer.appendChild(likesRow);
    footer.appendChild(dateEl);

    // СБОРКА КАРТОЧКИ
    card.appendChild(header);
    if (imgPost) card.appendChild(imgPost);
    card.appendChild(textEl);
    card.appendChild(footer);

    // LONG‑PRESS для тренеров -> inline editor
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
    }, { passive: true });
    card.addEventListener('touchmove', clearPressTimer, { passive: true });
    card.addEventListener('touchend', clearPressTimer);
    card.addEventListener('touchcancel', clearPressTimer);

    // ДАБЛ‑ТАП по карточке -> лайк
    var lastTapTime = 0;
    card.addEventListener('click', function () {
        var now = Date.now();
        if (now - lastTapTime < 300) {
            toggleLike();
        }
        lastTapTime = now;
    });

    feedList.appendChild(card);

    // Плавное появление поста
    requestAnimationFrame(function () {
        card.classList.add('feed-post-visible');
    });
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
        if (!posts.length) {
            var empty = document.createElement('div');
            empty.style.padding = '16px';
            empty.style.color   = 'rgba(255,255,255,0.7)';
            empty.style.fontSize= '14px';
            empty.textContent   = 'В ленте пока нет постов.';
            feedList.appendChild(empty);
            return;
        }
        posts.forEach(renderFeedPost);
    } catch (e) {
        alert('Сетевая ошибка при загрузке ленты');
    }
}

// ---------- ЭКРАНЫ: ПОСЛЕ ЛОГИНА / ЧАТ / ПРОФИЛЬ / СОЗДАНИЕ ГРУППЫ ----------

function hideAllMainScreens() {
    // 1) Сначала снимаем фокус, чтобы он не остался в скрытом экране
    try {
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
    } catch (e) {}

    function hideScreen(el) {
        if (!el) return;
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
    }

    hideScreen(welcomeScreen);
    hideScreen(registerScreen);
    hideScreen(parentInfoScreen);
    hideScreen(dancerInfoScreen);
    hideScreen(loginScreen);
    hideScreen(feedScreen);
    hideScreen(mainScreen);
    hideScreen(chatScreen);
    hideScreen(profileScreen);
    hideScreen(createGroupScreen);
    hideScreen(plusScreen);
    hideScreen(adminScreen);
    // bottomNav НЕ трогаем здесь — им управляют showBottomNav/hideBottomNav
}

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

    loadChatDraftsForUser();

    feedInitialized = false;


    hideAllMainScreens();
    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();

    showBottomNav();

    loadPinnedChatsForUser();
    await loadMutedChats();

    // Главный экран: ЛЕНТА постов
    await openFeedScreen();

    initPushForCurrentUser();

    if (window._pendingChatIdFromPush) {
        var cid = window._pendingChatIdFromPush;
        window._pendingChatIdFromPush = null;
        handleOpenChatFromPush(cid);
    }
    connectWebSocket();
}

async function openChatsScreen() {
    if (!mainScreen) return;

    hideAllMainScreens();

    mainScreen.style.display = 'flex';
    mainScreen.setAttribute('aria-hidden','false');
    showBottomNav();
    setNavActive('chats');

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();

    // всегда с верха
    try { window.scrollTo(0, 0); } catch (e) {}

    await reloadChatList();
    startChatListPolling();
}

async function openFeedScreen() {
    if (!feedScreen) return;
    if (!currentUser) {
        alert('Сначала войдите в аккаунт');
        return;
    }

    hideAllMainScreens();

    feedScreen.style.display = 'flex';
    feedScreen.setAttribute('aria-hidden','false');
    showBottomNav();
    setNavActive('feed');

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();
    stopChatListPolling();

    // всегда с верха
    try { window.scrollTo(0, 0); } catch (e) {}

    // Показ/скрытие кнопки "Создать пост"
    if (createPostBtn) {
        var roleLower = (currentUser.role || '').toLowerCase();
        createPostBtn.style.display =
            (roleLower === 'trainer' || roleLower === 'тренер' || roleLower === 'admin')
            ? 'block'
            : 'none';
    }

    // ВСЕГДА перезагружаем ленту при входе
    try {
        await loadFeed();
    } catch (e) {
        // loadFeed внутри уже показывает алерты при ошибке
    }

    // флаг feedInitialized можно вообще не использовать, но если где-то проверяешь — оставим true
    feedInitialized = true;
}

async function openChat(chat) {
    if (!chatScreen) return;
    if (!chat || !chat.id) return;

    // Проверяем, можно ли переиспользовать уже отрисованный DOM этого чата
    var state = chatRenderState[chat.id];
    var canReuseDom = !!(state && state.initialized && lastRenderedChatId === chat.id);

    currentChat = chat;

    hideAllMainScreens();

    // Чат‑экран активен
    chatScreen.style.display = 'flex';
    chatScreen.setAttribute('aria-hidden','false');
    chatScreen.classList.remove('chat-screen-visible');
    chatScreen.style.transform = '';
    requestAnimationFrame(function () {
        chatScreen.classList.add('chat-screen-visible');
    });

    hideBottomNav();
    setNavActive('chats');

    chatJustOpenedAt = Date.now();

    if (chatHeaderTitle) {
        chatHeaderTitle.textContent = chat.title || 'Чат';
    }

    var defaultGroupAvatar = '/group-avatar.png';
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

    if (chatInput) {
        var draftText = (chatDrafts && chat && chat.id && chatDrafts[chat.id]) || '';
        chatInput.value = draftText;
        autoResizeChatInput();
        updateSendButtonState();
    }
    clearReply();

    // Всегда останавливаем поллинг списка и сообщений
    stopChatListPolling();
    stopMessagePolling();

    // Если нельзя переиспользовать DOM (новый чат или мы были в другом чате) —
    // грузим сообщения с нуля
    if (!canReuseDom) {
        if (chatContent) {
            chatContent.innerHTML = '';
            chatContent.scrollTop = 0;
            chatContent.style.opacity = '0';
        }

        setChatLoading(true);
        try {
            await loadMessages(chat.id);
        } finally {
            setChatLoading(false);
            if (chatContent) {
                chatContent.style.opacity = '1';
                chatContent.scrollTop = chatContent.scrollHeight;
            }
        }
    } else {
        // Чат уже был загружен и DOM соответствует этому чату:
        // просто показываем его, слегка обновив сообщения
        if (chatContent) {
            chatContent.style.opacity = '1';
        }
        await refreshMessages(false);
        if (chatContent) chatContent.scrollTop = chatContent.scrollHeight;
    }

    startMessagePolling();
    startChatStatusUpdates();
}

function closeChatScreenToMain() {
    if (!chatScreen) return;
    if (chatScreen) {
        chatScreen.classList.remove('chat-screen-visible');
        chatScreen.style.display = 'none';
        chatScreen.setAttribute('aria-hidden','true');
    }

    // Гарантированно снимаем состояние загрузки и показываем контент
    try {
        setChatLoading(false);
    } catch (e) {}
    if (chatContent) {
        chatContent.style.opacity = '1';
    }
    if (chatInput) {
        try { chatInput.blur(); } catch (e) {}
    }


    currentChat = null;

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();

    // Показываем экран с чатами
    if (mainScreen) {
        hideAllMainScreens();                    // скрываем все...
        mainScreen.style.display = 'flex';       // ...но затем явно включаем список чатов
        mainScreen.setAttribute('aria-hidden','false');
    }

    showBottomNav();
    setNavActive('chats'); // чаты (домик)

    reloadChatList();
    startChatListPolling();
}

function openProfileScreen() {
    if (!profileScreen) return;

    hideAllMainScreens();

    profileScreen.style.display = 'flex';
    profileScreen.setAttribute('aria-hidden','false');
    showBottomNav();
    setNavActive('profile');

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();
    stopChatListPolling();

    // всегда с верха
    try { window.scrollTo(0, 0); } catch (e) {}

    updateProfileUI();
}
function openCreateGroupScreen() {
    if (!createGroupScreen) return;

    if (!currentUser || !currentUser.role) {
        alert('Группы могут создавать только тренера или админ');
        return;
    }

    var roleLower = (currentUser.role || '').toLowerCase();
    if (roleLower !== 'trainer' && roleLower !== 'тренер' && roleLower !== 'admin') {
        alert('Группы могут создавать только тренера или админ');
        return;
    }

    hideAllMainScreens();

    createGroupScreen.style.display = 'block';
    createGroupScreen.setAttribute('aria-hidden','false');
    showBottomNav();
    setNavActive('plus');

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();
    stopChatListPolling();

    // Сразу скроллим в начало, чтобы стрелка была наверху экрана
    try {
        window.scrollTo(0, 0);
    } catch (e) {}

    // Очистка формы
    if (groupNameInput) groupNameInput.value = '';
    if (audienceParents) audienceParents.checked = false;
    if (audienceDancers) audienceDancers.checked = false;

    if (ageField) ageField.style.display = 'none';
    if (ageText)  ageText.textContent = 'Выберите возраст участников';
    if (ageValue) ageValue.value = '';
}

function openPlusScreen() {
    if (!plusScreen) return;
    if (!currentUser || !currentUser.login) {
        alert('Сначала войдите в аккаунт');
        return;
    }

    hideAllMainScreens();

    plusScreen.style.display = 'block';
    plusScreen.setAttribute('aria-hidden','false');
    showBottomNav();
    setNavActive('plus');

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();
    stopChatListPolling();

    // всегда с верха
    try { window.scrollTo(0, 0); } catch (e) {}

    if (openCreateGroupScreenBtn) {
        var roleLower = (currentUser.role || '').toLowerCase();
        var canCreateGroup =
            roleLower === 'trainer' ||
            roleLower === 'тренер' ||
            roleLower === 'admin';

        openCreateGroupScreenBtn.style.display = canCreateGroup ? 'block' : 'none';
    }
}

// нижняя навигация: плюс
if (navAddBtn) {
    navAddBtn.addEventListener('click', function () {
        openPlusScreen();
    });
}

function openAdminScreen() {
    if (!adminScreen) return;
    if (!currentUser || (currentUser.role || '').toLowerCase() !== 'admin') {
        alert('Доступ только для администратора');
        return;
    }

    hideAllMainScreens();

    adminScreen.style.display = 'flex';
    adminScreen.setAttribute('aria-hidden','false');
    showBottomNav();

    hideChatUserModal();
    hideGroupModal();
    hideGroupAddModal();
    clearReply();
    stopChatStatusUpdates();
    stopMessagePolling();
    stopChatListPolling();

    setNavActive('profile');

    if (adminSqlResult) {
        adminSqlResult.textContent = 'Результат будет показан здесь';
    }
    if (adminTableContainer) {
        adminTableContainer.innerHTML =
            '<span style="font-size:12px;color:rgba(255,255,255,0.7);">Выберите базу и таблицу, затем нажмите «Загрузить».</span>';
    }
    if (adminUiDbSelect) {
        adminUiDbSelect.value = 'main';
    }

    // табличный редактор
    if (isCurrentUserAdmin()) {
        adminLoadTables();
        adminLoadUsers();
        adminLoadAudit();
        adminLoad2faStatus();
    }
}

async function adminLoadTables() {
    if (!isCurrentUserAdmin() || !adminUiDbSelect || !adminTableSelect) return;

    adminTableCurrentOffset = 0;
    adminTableCurrentRows   = [];
    adminTableCurrentCols   = [];
    adminTableCurrentPk     = null;

    var dbName = adminUiDbSelect.value || 'main';
    try {
        var resp = await fetch('/api/admin/tables', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({ db: dbName })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка загрузки списка таблиц');
            return;
        }
        adminTableSelect.innerHTML = '<option value="">— выберите —</option>';
        (data.tables || []).forEach(function(name){
            var opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            adminTableSelect.appendChild(opt);
        });
        if (adminTableContainer) {
            adminTableContainer.innerHTML =
                '<span style="font-size:12px;color:rgba(255,255,255,0.7);">Выберите таблицу и нажмите «Загрузить».</span>';
        }
    } catch (e) {
        alert('Сетевая ошибка при загрузке списка таблиц');
    }
}

async function adminLoadTableData(reset) {
    if (!isCurrentUserAdmin() || !adminUiDbSelect || !adminTableSelect || !adminTableContainer) return;

    var dbName = adminUiDbSelect.value || 'main';
    var table  = adminTableSelect.value;
    if (!table) {
        alert('Сначала выберите таблицу');
        return;
    }

    var lim = adminTableLimitInput ? parseInt(adminTableLimitInput.value, 10) : 100;
    if (!lim || lim <= 0) lim = 100;
    if (lim > 1000) lim = 1000;

    if (reset) {
        adminTableCurrentOffset = 0;
        adminTableCurrentRows   = [];
        adminTableCurrentCols   = [];
        adminTableCurrentPk     = null;
    }

    try {
        var resp = await fetch('/api/admin/table-data', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({
                db: dbName,
                table: table,
                limit: lim,
                offset: adminTableCurrentOffset
            })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка загрузки данных таблицы');
            return;
        }

        var newRows = data.rows || [];

        if (reset) {
            adminTableCurrentRows = newRows;
        } else {
            adminTableCurrentRows = adminTableCurrentRows.concat(newRows);
        }

        adminTableCurrentCols   = data.columns    || [];
        adminTableCurrentPk     = data.primaryKey || null;
        adminTableCurrentDb     = data.db         || dbName;
        adminTableCurrentTable  = data.table      || table;
        adminTableCurrentLimit  = lim;
        adminTableCurrentOffset = adminTableCurrentOffset + newRows.length;

        renderAdminTable(adminTableCurrentTable, adminTableCurrentCols, adminTableCurrentRows, adminTableCurrentPk);

        if (!newRows.length && !reset) {
            alert('Больше строк нет');
        }
    } catch (e) {
        alert('Сетевая ошибка при загрузке данных таблицы');
    }
}


function renderAdminTable(tableName, columns, rows, primaryKey) {
    if (!adminTableContainer) return;
    if (!columns.length) {
        adminTableContainer.innerHTML =
            '<span style="font-size:12px;color:rgba(255,255,255,0.7);">В таблице нет колонок.</span>';
        return;
    }

    var html = [];
    html.push('<div style="font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:4px;">Таблица: ' +
        escapeHtml(tableName) + '</div>');

    // Таблица существующих строк
    html.push('<table class="admin-table"><thead>');

    // Заголовки
    html.push('<tr>');
    columns.forEach(function (col) {
        html.push('<th>' + escapeHtml(col) + '</th>');
    });
    html.push('<th>Действия</th>');
    html.push('</tr>');

    // Фильтры
    html.push('<tr>');
    columns.forEach(function (col) {
        html.push(
            '<th><input class="admin-table-filter-input" ' +
            'data-col="' + escapeHtml(col) + '" placeholder="Фильтр"></th>'
        );
    });
    html.push('<th></th>');
    html.push('</tr>');

    html.push('</thead><tbody>');

    (rows || []).forEach(function (row) {
        var rowId = (primaryKey && row[primaryKey] != null) ? String(row[primaryKey]) : '';
        html.push('<tr data-row-id="' + escapeHtml(rowId) + '">');
        columns.forEach(function (col) {
            var val = row[col];
            var disabled = (col === primaryKey) ? ' disabled' : '';
            html.push(
                '<td><input class="admin-table-input" data-col="' + escapeHtml(col) +
                '" value="' + escapeHtml(val == null ? '' : val) + '"' + disabled + '></td>'
            );
        });

        // Кнопки Сохранить / Удалить (удаление только если есть PK)
        html.push('<td class="admin-table-row-actions">');
        html.push('<button type="button" class="admin-table-small-btn admin-row-save-btn">Сохранить</button>');
        if (primaryKey) {
            html.push(
                '<button type="button" class="admin-table-small-btn admin-table-small-btn-danger admin-row-delete-btn">' +
                'Удалить</button>'
            );
        }
        html.push('</td>');

        html.push('</tr>');
    });

    html.push('</tbody></table>');

    // Новая строка
    html.push('<div class="admin-table-newrow-label">Новая строка:</div>');
    html.push('<table class="admin-table"><tbody><tr data-row-id="__new__">');
    columns.forEach(function (col) {
        var disabled = (col === primaryKey) ? ' disabled' : '';
        html.push(
            '<td><input class="admin-table-input" data-col="' + escapeHtml(col) +
            '" value=""' + disabled + '></td>'
        );
    });
    html.push(
        '<td class="admin-table-row-actions">' +
        '<button type="button" class="admin-table-small-btn admin-row-insert-btn">Добавить</button>' +
        '</td>'
    );
    html.push('</tr></tbody></table>');

    adminTableContainer.innerHTML = html.join('');

    // обработчики фильтра
    var filterInputs = adminTableContainer.querySelectorAll('.admin-table-filter-input');
    for (var i = 0; i < filterInputs.length; i++) {
        filterInputs[i].addEventListener('input', function () {
            applyAdminTableFilters();
        });
    }
}

async function adminLoadUsers() {
    if (!isCurrentUserAdmin() || !adminUsersList) return;

    var q    = adminUserSearch     ? adminUserSearch.value.trim()     : '';
    var role = adminUserRoleFilter ? adminUserRoleFilter.value.trim() : '';

    try {
        var resp = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({ q: q, role: role })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка загрузки пользователей');
            return;
        }
        renderAdminUsers(data.users || []);
    } catch (e) {
        alert('Сетевая ошибка при загрузке пользователей');
    }
}

function renderAdminUsers(users) {
    if (!adminUsersList) return;

    if (!users.length) {
        adminUsersList.innerHTML =
            '<span style="font-size:12px;color:rgba(255,255,255,0.7);">Пользователи не найдены.</span>';
        return;
    }

    var html = [];
    users.forEach(function(u){
        var fullName = ((u.firstName || '') + ' ' + (u.lastName || '')).trim();
        html.push('<div class="admin-user-card" data-login="' + escapeHtml(u.login) + '">');

        html.push('<div class="admin-user-header">');
        html.push('<div class="admin-user-login">' + escapeHtml(u.login) + '</div>');
        if (u.publicId) {
            html.push('<div class="admin-user-publicid">ID: ' + escapeHtml(u.publicId) + '</div>');
        }
        html.push('</div>');

        if (fullName) {
            html.push('<div class="admin-user-name">' + escapeHtml(fullName) + '</div>');
        }

        html.push('<div class="admin-user-meta">');

        html.push('<label><span>Роль:</span>' +
            '<select class="admin-user-role-select">' +
            '<option value="parent"'   + ((u.role || '').toLowerCase()==='parent'   ? ' selected':'') + '>parent</option>' +
            '<option value="dancer"'   + ((u.role || '').toLowerCase()==='dancer'   ? ' selected':'') + '>dancer</option>' +
            '<option value="trainer"'  + ((u.role || '').toLowerCase()==='trainer'  ? ' selected':'') + '>trainer</option>' +
            '<option value="тренер"'   + ((u.role || '').toLowerCase()==='тренер'   ? ' selected':'') + '>тренер</option>' +
            '<option value="admin"'    + ((u.role || '').toLowerCase()==='admin'    ? ' selected':'') + '>admin</option>' +
            '</select></label>');

        html.push('<label><span>Команда:</span>' +
            '<input type="text" class="admin-user-team-input" value="' + escapeHtml(u.team || '') + '"></label>');

        html.push('<button type="button" class="admin-user-save-btn">Сохранить</button>');

        html.push('</div>'); // meta
        html.push('</div>'); // card
    });

    adminUsersList.innerHTML = html.join('');
}

async function adminSaveUserCard(cardEl) {
    if (!cardEl) return;
    var login = cardEl.dataset.login;
    if (!login) return;

    var roleSel = cardEl.querySelector('.admin-user-role-select');
    var teamInp = cardEl.querySelector('.admin-user-team-input');
    var newRole = roleSel ? roleSel.value.trim() : '';
    var newTeam = teamInp ? teamInp.value.trim() : '';

    try {
        var resp = await fetch('/api/admin/user/update', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({ login: login, role: newRole, team: newTeam })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка сохранения пользователя');
            return;
        }
        alert('Изменения сохранены');
        // перечитывать список необязательно, но можно:
        // adminLoadUsers();
    } catch (e) {
        alert('Сетевая ошибка при сохранении пользователя');
    }
}

async function adminLoadAudit() {
    if (!isCurrentUserAdmin() || !adminAuditList) return;

    var q = adminAuditSearch ? adminAuditSearch.value.trim() : '';

    try {
        var resp = await fetch('/api/admin/audit', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({ q: q, limit: 200 })
        });
        var data = await resp.json();
        if (!resp.ok || !data.ok) {
            alert(data.error || 'Ошибка загрузки журнала');
            return;
        }
        renderAdminAudit(data.entries || []);
    } catch (e) {
        alert('Сетевая ошибка при загрузке журнала');
    }
}

function renderAdminAudit(entries) {
    if (!adminAuditList) return;

    if (!entries.length) {
        adminAuditList.innerHTML =
            '<span style="font-size:12px;color:rgba(255,255,255,0.7);">Пока нет записей журнала.</span>';
        return;
    }

    var html = [];
    entries.forEach(function(e){
        html.push('<div class="admin-audit-entry">');

        html.push('<div class="admin-audit-line1">');
        html.push('<span>' + escapeHtml(e.createdAt || '') + '</span>');
        html.push('<span>' + escapeHtml(e.actorLogin || '') + '</span>');
        html.push('</div>');

        html.push('<div class="admin-audit-line2">');
        html.push('<strong>' + escapeHtml(e.action || '') + '</strong>');
        if (e.targetType || e.targetId) {
            html.push(' &mdash; ' + escapeHtml(e.targetType || '') +
                (e.targetId ? (' [' + escapeHtml(e.targetId) + ']') : ''));
        }
        html.push('</div>');

        if (e.details) {
            html.push('<div class="admin-audit-details">' +
                escapeHtml(e.details) + '</div>');
        }

        html.push('</div>');
    });

    adminAuditList.innerHTML = html.join('');
}

// === КОНТЕКСТНОЕ МЕНЮ ЧАТОВ ===

function createChatContextMenu() {
    if (chatContextOverlay) return;

    chatContextOverlay = document.createElement('div');
    chatContextOverlay.className = 'chat-context-overlay';

    chatContextMenu = document.createElement('div');
    chatContextMenu.className = 'chat-context-menu';
    chatContextMenu.appendChild(ctxMuteBtn);
    chatContextOverlay.appendChild(chatContextMenu);
    document.body.appendChild(chatContextOverlay);

    chatContextOverlay.addEventListener('click', function (e) {
        if (e.target === chatContextOverlay) hideChatContextMenu();
    });
ctxMuteBtn.onclick = async function () {
        if (!contextMenuTargetChat) return;
        await toggleChatMute(contextMenuTargetChat);
        hideChatContextMenu();
        await reloadChatList();
    };
}

function showChatContextMenu(chat, item) {
    if (!chat || !item) return;
    createChatContextMenu();

    contextMenuTargetChat = chat;
    contextMenuTargetChatItem = item;
if (ctxMuteBtn) {
        ctxMuteBtn.textContent = isChatMuted(chat.id) ? 'Включить уведомления' : 'Выключить уведомления';
    }

    chatContextOverlay.classList.add('visible');
    chatContextMenu.classList.remove('open');

    var rect = item.getBoundingClientRect();
    var vw = window.innerWidth || 375;
    var vh = window.innerHeight || 667;

    var menuW = chatContextMenu.offsetWidth || 240;
    var menuH = chatContextMenu.offsetHeight || 120;
    var margin = 8;

    var spaceBelow = vh - rect.bottom - 16;
    var spaceAbove = rect.top - 16;

    var top;
    if (spaceBelow >= menuH + margin) {
        top = rect.bottom + margin;
    } else if (spaceAbove >= menuH + margin) {
        top = rect.top - menuH - margin;
    } else {
        top = (vh - menuH) / 2;
    }

    var centerX = rect.left + rect.width / 2;
    var left = centerX - menuW / 2;
    if (left < 12) left = 12;
    if (left + menuW > vw - 12) left = vw - 12 - menuW;

    chatContextMenu.style.left = left + 'px';
    chatContextMenu.style.top  = top  + 'px';

    requestAnimationFrame(function () {
        chatContextMenu.classList.add('open');
    });
}

function hideChatContextMenu() {
    if (!chatContextOverlay || !chatContextMenu) return;

    chatContextMenu.classList.remove('open');
    chatContextOverlay.classList.remove('visible');

    if (contextMenuTargetChatItem) {
        contextMenuTargetChatItem.classList.remove('chat-item-pressed');
        contextMenuTargetChatItem = null;
    }
    contextMenuTargetChat = null;
    suppressChatClick = false;
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

// Кнопка "Админ‑панель" в профиле
if (profileAdminBtn) {
    profileAdminBtn.addEventListener('click', function () {
        openAdminScreen();
    });
}

// Админ-экран: загрузка списка таблиц при смене БД
if (adminUiDbSelect) {
    adminUiDbSelect.addEventListener('change', function () {
        if (isCurrentUserAdmin()) {
            adminLoadTables();
        }
    });
}

// Админ-экран: кнопка "Загрузить" таблицу
if (adminLoadTableBtn) {
    adminLoadTableBtn.addEventListener('click', function () {
        adminLoadTableData();
    });
}

// Админ-экран: выбор таблицы из списка (можно автозагружать)
if (adminTableSelect) {
    adminTableSelect.addEventListener('change', function () {
        // можно сразу подгружать
        // adminLoadTableData();
    });
}

// Админ-экран: обработка кликов по кнопкам "Сохранить" и "Добавить" внутри таблицы
if (adminTableContainer) {
    adminTableContainer.addEventListener('click', async function (e) {
        var saveBtn   = e.target.closest('.admin-row-save-btn');
        var insertBtn = e.target.closest('.admin-row-insert-btn');
        var deleteBtn = e.target.closest('.admin-row-delete-btn');

        if (!saveBtn && !insertBtn && !deleteBtn) return;

        if (!isCurrentUserAdmin()) {
            alert('Доступ только для администратора');
            return;
        }

        var tr = e.target.closest('tr');
        if (!tr) return;

        var dbName  = adminUiDbSelect ? (adminUiDbSelect.value || 'main') : 'main';
        var table   = adminTableSelect ? adminTableSelect.value : '';
        if (!table) {
            alert('Сначала выберите таблицу');
            return;
        }

        // Удаление строки
        if (deleteBtn) {
            var delId = tr.dataset.rowId;
            if (!delId || delId === '__new__') {
                alert('Нельзя удалить эту строку (нет первичного ключа)');
                return;
            }
            if (!confirm('Удалить эту строку?')) return;

            try {
                var respDel = await fetch('/api/admin/table-delete', {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json' },
                    body: JSON.stringify({ db: dbName, table: table, id: delId })
                });
                var dataDel = await respDel.json();
                if (!respDel.ok || !dataDel.ok) {
                    alert(dataDel.error || 'Ошибка удаления строки');
                    return;
                }
                alert('Строка удалена');
                // перезагрузим таблицу с нуля
                adminLoadTableData(true);
            } catch (errDel) {
                alert('Сетевая ошибка при удалении строки');
            }
            return;
        }

        // Для сохранения / вставки собираем данные из инпутов
        var inputs = tr.querySelectorAll('.admin-table-input');
        var rowData = {};
        inputs.forEach(function (inp) {
            var col = inp.dataset.col;
            if (!col) return;
            if (inp.disabled) return; // pk не трогаем
            rowData[col] = inp.value;
        });

        try {
            // Добавление новой строки
            if (insertBtn) {
                var respIns = await fetch('/api/admin/table-insert', {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json' },
                    body: JSON.stringify({ db: dbName, table: table, row: rowData })
                });
                var dataIns = await respIns.json();
                if (!respIns.ok || !dataIns.ok) {
                    alert(dataIns.error || 'Ошибка добавления строки');
                    return;
                }
                alert('Строка добавлена (ID: ' + (dataIns.lastID || 'unknown') + ')');
                adminLoadTableData(true);
            }
            // Обновление существующей строки
            else if (saveBtn) {
                var rowId = tr.dataset.rowId;
                if (!rowId || rowId === '__new__') {
                    alert('Нет первичного ключа для обновления строки');
                    return;
                }
                var respUp = await fetch('/api/admin/table-update', {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json' },
                    body: JSON.stringify({ db: dbName, table: table, id: rowId, updates: rowData })
                });
                var dataUp = await respUp.json();
                if (!respUp.ok || !dataUp.ok) {
                    alert(dataUp.error || 'Ошибка обновления строки');
                    return;
                }
                alert('Строка обновлена');
                adminLoadTableData(true);
            }
        } catch (err) {
            alert('Сетевая ошибка при изменении таблицы');
        }
    });
}

// Табличный редактор: смена БД
if (adminUiDbSelect) {
    adminUiDbSelect.addEventListener('change', function () {
        if (isCurrentUserAdmin()) {
            adminLoadTables();
        }
    });
}

// Табличный редактор: кнопка "Загрузить" (с нуля)
if (adminLoadTableBtn) {
    adminLoadTableBtn.addEventListener('click', function () {
        adminLoadTableData(true);
    });
}

// Табличный редактор: "Ещё" (следующая пачка)
if (adminLoadMoreBtn) {
    adminLoadMoreBtn.addEventListener('click', function () {
        if (!adminTableCurrentTable) {
            alert('Сначала загрузите таблицу');
            return;
        }
        adminLoadTableData(false);
    });
}

// ---------- НАВИГАЦИЯ / КНОПКИ ----------

// Регистрация / логин
var registerBtn = document.getElementById('registerBtn');
if (registerBtn && welcomeScreen && registerScreen) {
    registerBtn.addEventListener('click', function () {
        hideAllMainScreens();
        registerScreen.style.display = 'block';
        registerScreen.setAttribute('aria-hidden','false');
    });
}

var loginBtn = document.getElementById('loginBtn');
if (loginBtn && welcomeScreen && loginScreen) {
    loginBtn.addEventListener('click', function () {
        hideAllMainScreens();
        loginScreen.style.display = 'block';
        loginScreen.setAttribute('aria-hidden','false');
    });
}

var backBtn = document.getElementById('backToWelcome');
if (backBtn && welcomeScreen && registerScreen) {
    backBtn.addEventListener('click', function () {
        hideAllMainScreens();
        welcomeScreen.style.display = 'flex';
        welcomeScreen.setAttribute('aria-hidden','false');
    });
}

var backToWelcomeFromLoginBtn = document.getElementById('backToWelcomeFromLogin');
if (backToWelcomeFromLoginBtn && welcomeScreen && loginScreen) {
    backToWelcomeFromLoginBtn.addEventListener('click', function () {
        hideAllMainScreens();
        welcomeScreen.style.display = 'flex';
        welcomeScreen.setAttribute('aria-hidden','false');
    });
}

var backToRegisterBtn = document.getElementById('backToRegister');
if (backToRegisterBtn && registerScreen && parentInfoScreen) {
    backToRegisterBtn.addEventListener('click', function () {
        hideAllMainScreens();
        registerScreen.style.display   = 'block';
        registerScreen.setAttribute('aria-hidden','false');
    });
}

var backToRegisterFromDancerBtn = document.getElementById('backToRegisterFromDancer');
if (backToRegisterFromDancerBtn && registerScreen && dancerInfoScreen) {
    backToRegisterFromDancerBtn.addEventListener('click', function () {
        hideAllMainScreens();
        registerScreen.style.display   = 'block';
        registerScreen.setAttribute('aria-hidden','false');
    });
}

if (backToMainFromChat && chatScreen) {
    backToMainFromChat.addEventListener('click', function () {
        closeChatWithSlideRight();
    });
}

function closeChatWithSlideRight() {
    if (!chatScreen) return;

    var duration = 250;
    var maxW     = window.innerWidth || 375;

    chatScreen.style.transition = 'transform 0.25s cubic-bezier(.4,0,.2,1)';
    chatScreen.style.transform  = 'translateX(' + maxW + 'px)';

    setTimeout(function () {
        chatScreen.style.transition = '';
        chatScreen.style.transform  = '';
        closeChatScreenToMain();
    }, duration);
}

// поиск по чатам
if (chatSearchInput) {
    chatSearchInput.addEventListener('input', function () {
        currentChatSearch = this.value;
        renderChatListFromLastChats();
    });
}

// нижняя навигация
// Домик — ЧАТЫ
if (navHomeBtn && mainScreen) {
    navHomeBtn.addEventListener('click', function () {
        openChatsScreen();
    });
}

// Список — ЛЕНТА
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
        openPlusScreen();
    });
}

// клик по шапке чата
var chatHeaderEl = document.querySelector('.chat-header');
if (chatHeaderEl) {
    chatHeaderEl.addEventListener('click', function (e) {
        // Если нажали на кнопку "назад" — не открываем модалку
        if (e.target.closest('.chat-back')) return;
        if (!currentChat) return;

        // Личные чаты / тренерские — модалка пользователя
        if (currentChat.type === 'trainer' || currentChat.type === 'personal') {
            openChatUserModal();
        }
        // Группы — модалка группы
        else if (currentChat.type === 'group' || currentChat.type === 'groupCustom') {
            openGroupModal();
        }
    });
}

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
                await reloadChatList();
            }
        } catch (e) {
            alert('Сетевая ошибка при сохранении фотографии');
        } finally {
            this.value = '';
        }
    });
}

// ПРОФИЛЬ: выход из аккаунта + очистка кэша
if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {}

        currentUser          = null;
        currentChat          = null;
        chatRenderState      = {};
        messagesById         = {};
        pendingAttachments   = [];
        currentReplyTarget   = null;
        mutedChats           = {};
        pinnedChats          = {};
        lastChats            = [];
        lastChatMessageMap   = {};

        stopChatListPolling();
        stopMessagePolling();
        stopChatStatusUpdates();
        stopNotificationPolling();

        if (chatContent) chatContent.innerHTML = '';
        if (chatList)    chatList.innerHTML    = '';
        if (feedList)    feedList.innerHTML    = '';

        lastRenderedChatId   = null;
        feedInitialized      = false;

        hideAllMainScreens();
        if (welcomeScreen) {
            welcomeScreen.style.display = 'flex';
            welcomeScreen.setAttribute('aria-hidden','false');
        }
        hideBottomNav();

        document.body.classList.add('welcome-active');

        setNavActive('chats');

        // Очистка localStorage (включая пины и прочий кэш)
        try {
            localStorage.clear();
        } catch (e) {}

        // Очистка Cache Storage (PWA кэши)
        if (window.caches && typeof caches.keys === 'function') {
            caches.keys().then(function (keys) {
                keys.forEach(function (key) {
                    caches.delete(key).catch(function(){});
                });
            }).catch(function(){});
        }

        if (ws) {
            try { ws.close(); } catch (e) {}
            ws = null;
        }
        if (wsReconnectTimer) {
            clearTimeout(wsReconnectTimer);
            wsReconnectTimer = null;
        }
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
                    this.src = '/group-avatar.png';
                };
            }

            if (currentChat && currentChat.type === 'groupCustom' && currentChat.id === currentGroupName) {
                currentChat.avatar = data.avatar || currentChat.avatar;
                if (chatHeaderAvatar) {
                    chatHeaderAvatar.src = currentChat.avatar || '/group-avatar.png';
                    chatHeaderAvatar.onerror = function () {
                        this.onerror = null;
                        this.src = '/group-avatar.png';
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

            if (groupNameTitle)  groupNameTitle.textContent  = currentGroupName;
            if (chatHeaderTitle) chatHeaderTitle.textContent = currentGroupName;

            if (currentChat) {
                currentChat.id    = currentGroupName;
                currentChat.title = currentGroupName;
            }

            if (currentGroupInfo) currentGroupInfo.name = currentGroupName;

            if (pinnedChats && pinnedChats[oldName]) {
                delete pinnedChats[oldName];
                pinnedChats[currentGroupName] = true;
                savePinnedChatsForUser();
            }

            await loadMutedChats();

            groupNameEditInput.style.display = 'none';
            groupNameSaveBtn.style.display   = 'none';

            await reloadChatList();
        } catch (e) {
            alert('Сетевая ошибка при переименовании группы');
        }
    });
}

if (groupAddMemberBtn) {
    groupAddMemberBtn.addEventListener('click', function () {
        if (!currentGroupName) return;
        showGroupAddModal();
    });
}

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

var createGroupForm = document.querySelector('.create-group-form');
if (createGroupForm && createGroupBtn) {
    createGroupForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!currentUser) {
            alert('Авторизуйтесь, чтобы создавать группы');
            return;
        }
        var roleLower = (currentUser.role || '').toLowerCase();
        if (roleLower !== 'trainer' && roleLower !== 'тренер' && roleLower !== 'admin') {
            alert('Группы могут создавать только тренера и админ');
            return;
        }

        var name = groupNameInput ? groupNameInput.value.trim() : '';
        var audience = audienceParents && audienceParents.checked ? 'parents'
                      : audienceDancers && audienceDancers.checked ? 'dancers'
                      : '';

        var age = ageValue ? ageValue.value : '';

        if (!name) {
            alert('Введите название группы');
            if (groupNameInput) markFieldError(groupNameInput);
            return;
        }

        if (!audience) {
            alert('Выберите, для кого группа');
            if (audienceParents) {
                markFieldError(audienceParents.closest('.radio-option') || audienceParents);
            }
            return;
        }

        if (audience === 'dancers' && !age) {
            alert('Выберите возраст участников');
            if (ageField) markFieldError(ageField);
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

            if (!resp.ok || !data.ok) {
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

// Обработка сабмита формы регистрации (поддержка Enter)
if (registerForm && loginInput && passwordInput && roleValue && registerScreen) {
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var login    = loginInput.value.trim();
        var password = passwordInput.value;
        var role     = roleValue.value;

        if (!login || !password || !role) {
            alert('Заполните логин, пароль и выберите роль');

            if (!login) {
                markFieldError(loginInput);
            } else if (!password) {
                markFieldError(passwordInput);
            } else {
                markFieldError(roleSelect);
            }
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

        hideAllMainScreens();

        if (role === 'parent' && parentInfoScreen) {
            parentInfoScreen.style.display = 'block';
            parentInfoScreen.setAttribute('aria-hidden','false');
            if (dancerInfoScreen) dancerInfoScreen.style.display = 'none';
            return;
        }

        if (role === 'dancer' && dancerInfoScreen) {
            dancerInfoScreen.style.display = 'block';
            dancerInfoScreen.setAttribute('aria-hidden','false');
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

var parentFormEl = document.querySelector('.parent-form');
if (parentFormEl && parentFirstNameInput && parentLastNameInput && teamValue) {
    parentFormEl.addEventListener('submit', async function (e) {
        e.preventDefault();
        var firstName = parentFirstNameInput.value.trim();
        var lastName  = parentLastNameInput.value.trim();
        var team      = teamValue.value;

        if (!firstName || !lastName || !team) {
            alert('Заполните имя, фамилию и выберите команду');

            if (!firstName) {
                markFieldError(parentFirstNameInput);
            } else if (!lastName) {
                markFieldError(parentLastNameInput);
            } else {
                markFieldError(teamSelect);
            }
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

            if (!response.ok || !data.ok) {
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
        if (typeof dancerDobInput.showPicker === 'function') {
            dancerDobInput.showPicker();
        } else {
            dancerDobInput.click();
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

var dancerFormEl = document.querySelector('.dancer-form');
if (dancerFormEl && dancerFirstNameInput && dancerLastNameInput && dancerTeamValue && dancerDobInput) {
    dancerFormEl.addEventListener('submit', async function (e) {
        e.preventDefault();
        var firstName = dancerFirstNameInput.value.trim();
        var lastName  = dancerLastNameInput.value.trim();
        var team      = dancerTeamValue.value;
        var dob       = dancerDobInput.value;

        if (!firstName || !lastName || !team || !dob) {
            alert('Заполните имя, фамилию, выберите команду и дату рождения');

            if (!firstName) {
                markFieldError(dancerFirstNameInput);
            } else if (!lastName) {
                markFieldError(dancerLastNameInput);
            } else if (!team) {
                markFieldError(dancerTeamSelect);
            } else {
                markFieldError(dancerDobField);
            }
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

            if (!response.ok || !data.ok) {
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

if (loginScreenTotp) {
    loginScreenTotp.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 6);
    });
}

var loginForm = document.querySelector('.login-form');
if (loginForm && loginScreenLogin && loginScreenPassword) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var login    = loginScreenLogin.value.trim();
        var password = loginScreenPassword.value;
        var code2fa  = loginScreenTotp ? loginScreenTotp.value.trim() : '';

        if (!login || !password) {
            alert('Введите логин и пароль');

            if (!login) {
                markFieldError(loginScreenLogin);
            } else {
                markFieldError(loginScreenPassword);
            }
            return;
        }

        try {
            var resp = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login:    login,
                    password: password,
                    code:     code2fa
                })
            });
            var data = await resp.json();

            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка входа');

                // показать и активировать 2FA-поле только если сервер его требует
                if (data.error &&
                    (data.error.indexOf('2FA') !== -1 || data.error.indexOf('код') !== -1)) {

                    if (loginScreenTotpField) {
                        loginScreenTotpField.style.display = '';
                    }
                    if (loginScreenTotp) {
                        try { loginScreenTotp.focus(); } catch (e2) {}
                    }
                }
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

function showLoginScreen() {
    hideAllMainScreens();
    if (loginScreen) {
        loginScreen.style.display = 'block';
        loginScreen.setAttribute('aria-hidden','false');
    }
    if (loginScreenTotpField) {
        loginScreenTotpField.style.display = 'none';
    }
}
// ---------- ОТПРАВКА СООБЩЕНИЯ ----------

if (chatInputForm && chatInput) {
    chatInputForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!currentChat || !currentUser) return;

        var baseText  = chatInput.value.trim();
        var finalText = baseText;

        // ---- REPLY ----
        if (currentReplyTarget) {
            var sName  = currentReplyTarget.senderName  || currentReplyTarget.senderLogin || '';
            var sLogin = currentReplyTarget.senderLogin || '';

            var quoted = String(currentReplyTarget.text || '').replace(/\s+/g, ' ').trim();
            if (quoted.length > 80) quoted = quoted.slice(0, 77) + '…';
            quoted = quoted.replace(/\n/g, ' ');

            // ID сообщения, но используем его только если он числовой
            var rawReplyId = currentReplyTarget.id;
            var numericReplyId = null;
            if (typeof rawReplyId === 'number') {
                numericReplyId = String(rawReplyId);
            } else if (typeof rawReplyId === 'string' && /^\d+$/.test(rawReplyId)) {
                numericReplyId = rawReplyId;
            }

            // Если numericReplyId нет (например, tmp-file-...), используем простой [r] без ID
            var header = numericReplyId ? ('[r:' + numericReplyId + ']') : '[r]';

            finalText =
                header + sName + '\n' +
                sLogin + '\n' +
                quoted + '\n[/r]\n' +
                baseText;
        }

        // ---------- ОТПРАВКА С ВЛОЖЕНИЯМИ (фото/видео/файлы) ----------
        if (pendingAttachments && pendingAttachments.length) {
            var usedAttachments = pendingAttachments.slice();
            pendingAttachments = [];
            renderAttachPreviewBar(); // очищаем превью сразу

            // имя отправителя
            var senderName = ((currentUser.firstName || '') + ' ' + (currentUser.lastName || '')).trim() || currentUser.login;

            // создаём оптимистичные сообщения для каждого файла
            var tempIds = [];

            usedAttachments.forEach(function (att, index) {
                var tempId = 'tmp-file-' + Date.now() + '-' + Math.random().toString(16).slice(2);
                tempIds.push(tempId);

                var textForThis = (index === usedAttachments.length - 1) ? finalText : '';

                var tempMsg = {
                    id: tempId,
                    chat_id: currentChat.id,
                    sender_login: currentUser.login,
                    sender_name: senderName,
                    text: textForThis,
                    created_at: new Date().toISOString(),
                    attachment_type: att.type,
                    attachment_url:  att.url,
                    attachment_name: att.name,
                    attachment_size: att.sizeMB,
                    edited: false,
                    read_by_all: false,
                    reactions: [],
                    myReaction: null,
                    pending: true
                };

                renderMessage(tempMsg);
            });

            if (chatContent) chatContent.scrollTop = chatContent.scrollHeight;

            // очищаем input и reply сразу
            chatInput.value = '';
            autoResizeChatInput();
            clearReply();
            keepKeyboardAfterSend();
            if (currentChat && currentChat.id && chatDrafts) {
                delete chatDrafts[currentChat.id];
                saveChatDraftsForUser();
            }

            try {
                for (var i = 0; i < usedAttachments.length; i++) {
                    var att = usedAttachments[i];

                    var formData = new FormData();
                    formData.append('file',  att.file);
                    formData.append('login', currentUser.login);
                    formData.append('chatId', currentChat.id);

                    if (i === usedAttachments.length - 1) {
                        formData.append('text', finalText || '');
                    } else {
                        formData.append('text', '');
                    }

                    var resp = await fetch('/api/messages/send-file', {
                        method: 'POST',
                        body: formData
                    });
                    var data = await resp.json();

                    if (!resp.ok || !data.ok) {
                        tempIds.forEach(function (id) {
                            var el = chatContent && chatContent.querySelector('.msg-item[data-msg-id="' + id + '"]');
                            if (el && el.parentNode) el.parentNode.removeChild(el);
                        });
                        alert(data.error || 'Ошибка отправки файла');
                        return;
                    }
                }

                await refreshMessages(false);
                if (chatContent) chatContent.scrollTop = chatContent.scrollHeight;
            } catch (e2) {
                tempIds.forEach(function (id) {
                    var el = chatContent && chatContent.querySelector('.msg-item[data-msg-id="' + id + '"]');
                    if (el && el.parentNode) el.parentNode.removeChild(el);
                });
                alert('Сетевая ошибка при отправке файла');
            } finally {
                usedAttachments.forEach(function (a) {
                    cleanupAttachmentObjectUrl(a);
                });
            }

            return;
        }

        // ---------- ТОЛЬКО ТЕКСТ ----------
        if (!finalText) return;

        // Оптимистичное временное сообщение
        var tempId = 'tmp-' + Date.now() + '-' + Math.random().toString(16).slice(2);

        var senderName = ((currentUser.firstName || '') + ' ' + (currentUser.lastName || '')).trim() || currentUser.login;

        var tempMsg = {
            id: tempId,
            chat_id: currentChat.id,
            sender_login: currentUser.login,
            sender_name: senderName,
            text: finalText,
            created_at: new Date().toISOString(),
            attachment_type: null,
            attachment_url: null,
            edited: false,
            read_by_all: false,
            reactions: [],
            myReaction: null,
            pending: true
        };

        renderMessage(tempMsg);
        if (chatContent) chatContent.scrollTop = chatContent.scrollHeight;

        // очищаем input и reply сразу
        chatInput.value = '';
        autoResizeChatInput();
        clearReply();
        keepKeyboardAfterSend();
        if (currentChat && currentChat.id && chatDrafts) {
            delete chatDrafts[currentChat.id];
            saveChatDraftsForUser();
        }

        var payload = {
            chatId:      currentChat.id,
            senderLogin: currentUser.login,
            text:        finalText
        };

        try {
            var resp2 = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            var data2 = await resp2.json();

            if (!resp2.ok || !data2.ok) {
                var tempElErr = chatContent && chatContent.querySelector('.msg-item[data-msg-id="' + tempId + '"]');
                if (tempElErr && tempElErr.parentNode) tempElErr.parentNode.removeChild(tempElErr);
                alert(data2.error || 'Ошибка отправки сообщения');
                return;
            }

            await refreshMessages(false);
            if (chatContent) chatContent.scrollTop = chatContent.scrollHeight;
        } catch (e2) {
            var tempElCatch = chatContent && chatContent.querySelector('.msg-item[data-msg-id="' + tempId + '"]');
            if (tempElCatch && tempElCatch.parentNode) tempElCatch.parentNode.removeChild(tempElCatch);
            alert('Сетевая ошибка при отправке сообщения');
        }
    });
}

// ---------- ЗАГРУЗКА СООБЩЕНИЙ / refreshMessages ----------

// локи, чтобы не было одновременных refresh по одному чату
var refreshingMessagesByChat = {};
var queuedRefreshByChat = {};

async function refreshMessages(preserveScroll) {
    if (!chatContent || !currentUser || !currentUser.login || !currentChat) return;
    var chatId = currentChat.id;
    if (!chatId) return;

    var state = chatRenderState[chatId];

    // если состояние не инициализировано — грузим первую страницу
    if (!state || !state.initialized) {
        await loadMessages(chatId);
        return;
    }

    // если уже идёт refresh для этого чата — просто отмечаем, что нужен ещё один
    if (refreshingMessagesByChat[chatId]) {
        queuedRefreshByChat[chatId] = true;
        return;
    }
    refreshingMessagesByChat[chatId] = true;
    queuedRefreshByChat[chatId]      = false;

    // запоминаем текущую позицию скролла
    var prevScrollTop = chatContent.scrollTop;

    try {
        // Берём последние до 80 сообщений
        var page = await fetchMessagesPage(chatId, null, 80);
        if (!page) return;

        var msgs = page.messages || [];
        if (!msgs.length) return;

        // Pinned
        var newPinnedId = page.pinnedId || null;
        if (newPinnedId !== state.pinnedId) {
            state.pinnedId = newPinnedId;
            var pinnedMsg = null;
            msgs.forEach(function (m) {
                messagesById[m.id] = m;
                if (newPinnedId && m.id === newPinnedId) pinnedMsg = m;
            });
            if (!pinnedMsg && newPinnedId && messagesById[newPinnedId]) {
                pinnedMsg = messagesById[newPinnedId];
            }
}

        // обновляем статусы прочтения
        updateReadStatusInDom(msgs);
        await markChatRead(chatId);

        // ОБНОВЛЯЕМ УЖЕ СУЩЕСТВУЮЩИЕ сообщения в DOM (текст, "(изменено)", реакции)
        msgs.forEach(function (m) {
            messagesById[m.id] = m;
            patchMessageDomFromData(m);
        });

        var fromBottom = chatContent.scrollHeight - (chatContent.scrollTop + chatContent.clientHeight);
        var justOpened = Date.now() - chatJustOpenedAt < 1500;
        var shouldStickToBottom = (fromBottom <= 80 || justOpened);

        var maxExistingId = state.lastId || 0;
        var newMessages = msgs.filter(function (m) { return m.id > maxExistingId; });

        if (!newMessages.length) {
            return;
        }

        // есть ли среди новых сообщения от самого пользователя
        var hadOwnNew = newMessages.some(function (m) {
            return currentUser && m.sender_login === currentUser.login;
        });

        // если были pending-сообщения — убираем их
        if (hadOwnNew && chatContent) {
            var pendings = chatContent.querySelectorAll('.msg-item.msg-pending');
            pendings.forEach(function (el) {
                if (el && el.parentNode) el.parentNode.removeChild(el);
            });
        }

        // рендерим новые сообщения
        newMessages.forEach(function (m) {
            if (chatContent.querySelector('.msg-item[data-msg-id="' + m.id + '"]')) {
                return;
            }

            messagesById[m.id] = m;

            var skipAnim = currentUser && m.sender_login === currentUser.login;
            renderMessage(m, { skipAnimation: skipAnim });

            state.lastId = Math.max(state.lastId || 0, m.id);
            if (!state.oldestId) state.oldestId = m.id;
        });

        // позиционирование скролла
        if (shouldStickToBottom) {
            chatContent.scrollTop = chatContent.scrollHeight;
        } else if (preserveScroll) {
            chatContent.scrollTop = prevScrollTop;
        }
    } catch (e) {
        console.error('refreshMessages error:', e);
    } finally {
        refreshingMessagesByChat[chatId] = false;

        // если пока мы обновляли чат, пришли ещё обновления — запускаем refresh ещё раз
        if (queuedRefreshByChat[chatId]) {
            queuedRefreshByChat[chatId] = false;
            // важно: не сохраняем scroll, чтобы новые сообщения внизу были видны
            refreshMessages(false);
        }
    }
}

async function refreshMessagesKeepingMessage(messageId) {
    await refreshMessages(false);
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
        if (roleLower !== 'trainer' && roleLower !== 'тренер' && roleLower !== 'admin') {
            alert('Создавать посты могут только тренера и админ');
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
        if (roleLower !== 'trainer' && roleLower !== 'тренер' && roleLower !== 'admin') {
            alert('Создавать посты могут только тренера и админ');
            return;
        }

        var text = postTextInput ? postTextInput.value.trim() : '';
        if (!text) {
            alert('Введите текст поста');
            if (postTextInput) markFieldError(postTextInput);
            return;
        }

        var formData = new FormData();
        formData.append('login', currentUser.login);
        formData.append('text', text);
        if (currentPostImageFile) {
            formData.append('image', currentPostImageFile);
        }

        // СРАЗУ закрываем модалку
        hidePostModal();

        // Показываем синий баннер "Публикация..."
        if (networkBanner) {
            if (networkBannerTimer) clearTimeout(networkBannerTimer);
            networkBanner.textContent = 'Публикация...';
            networkBanner.classList.add('info', 'show');
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

            await loadFeed();
        } catch (e) {
            alert('Сетевая ошибка при создании поста');
        } finally {
            // Убираем баннер "Публикация..."
            if (networkBanner) {
                networkBanner.classList.remove('show', 'info');
            }
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

if (profileAdminBtn) {
    profileAdminBtn.addEventListener('click', function () {
        openAdminScreen();
    });
}

if (adminSqlRunBtn && adminSqlInput && adminDbSelect && adminSqlResult) {
    adminSqlRunBtn.addEventListener('click', async function () {
        var sql = adminSqlInput.value;
        var dbName = adminDbSelect.value || 'main';
        sql = (sql || '').trim();
        if (!sql) {
            alert('Введите SQL‑запрос');
            return;
        }

        try {
            var resp = await fetch('/api/admin/sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ db: dbName, sql: sql })
            });
            var data = await resp.json();
            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка выполнения запроса');
                return;
            }
            adminSqlResult.textContent = JSON.stringify(data.result, null, 2);
        } catch (e) {
            alert('Сетевая ошибка при выполнении запроса');
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

// ---------- ПРЕВЬЮ ОТМЕНЫ ЗАПИСИ ГОЛОСОВОГО ----------

function updateVoiceCancelPreview(dx) {
    if (!voiceRecordUi || !chatInputForm) return;

    // нет записи — сбрасываем всё
    if (!isRecordingVoice) {
        voiceRecordUi.style.transform = '';
        voiceRecordUi.style.backgroundColor = 'rgba(63,63,63,0.95)';
        chatInputForm.classList.remove('recording-cancel-preview');
        if (voiceRecordHint) {
            voiceRecordHint.textContent = 'Свайп влево — отмена';
        }
        return;
    }

    // свайп вправо или нет смещения — обычный режим
    if (dx >= 0) {
        voiceRecordUi.style.transform = '';
        voiceRecordUi.style.backgroundColor = 'rgba(63,63,63,0.95)';
        chatInputForm.classList.remove('recording-cancel-preview');
        if (voiceRecordHint) {
            voiceRecordHint.textContent = 'Свайп влево — отмена';
        }
        return;
    }

    var p = Math.max(0, Math.min(1, (-dx) / 80));   // 0..1
    var translate = -14 * p;

    voiceRecordUi.style.transform = 'translateX(' + translate + 'px)';
    voiceRecordUi.style.backgroundColor = 'rgba(63,63,63,0.95)';

    if (p > 0.35) {
        chatInputForm.classList.add('recording-cancel-preview');
        if (voiceRecordHint) {
            voiceRecordHint.textContent = 'Отпустите, чтобы отменить';
        }
    } else {
        chatInputForm.classList.remove('recording-cancel-preview');
        if (voiceRecordHint) {
            voiceRecordHint.textContent = 'Свайп влево — отмена';
        }
    }
}

// ESC для закрытия модалок / reply / медиавьюера
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    if (mediaViewer && mediaViewer.classList.contains('visible')) {
        closeMediaViewer();
        return;
    }
    if (forwardModal && forwardModal.classList.contains('visible')) {
        closeForwardModal();
        return;
    }
    if (postModal && postModal.classList.contains('visible')) {
        hidePostModal();
        return;
    }
    if (chatUserModal && chatUserModal.classList.contains('visible')) {
        hideChatUserModal();
        return;
    }
    if (groupAddModal && groupAddModal.classList.contains('visible')) {
        hideGroupAddModal();
        return;
    }
    if (groupModal && groupModal.classList.contains('visible')) {
        hideGroupModal();
        return;
    }
    if (replyBar && replyBar.style.display === 'flex') {
        clearReply();
        return;
    }
});

// Дополнительная обёртка над setChatLoading, чтобы скрывать инпут чата полностью
(function enhanceSetChatLoadingVisibility(){
    if (typeof setChatLoading !== 'function') return;
    var orig = setChatLoading;
    setChatLoading = function(isLoading) {
        orig(isLoading);
        if (chatInputForm) {
            chatInputForm.style.opacity = isLoading ? '0.6' : '1';
        }
        // replyBar и attachPreviewBar оставляем как есть, чтобы пользователь видел, что именно отправляется
    };
})();

// Переход с плюс-экрана к экрану создания группы
if (openCreateGroupScreenBtn) {
    openCreateGroupScreenBtn.addEventListener('click', function () {
        openCreateGroupScreen();
    });
}

// Назад с экрана создания группы на плюс-экран
if (backFromCreateGroup) {
    backFromCreateGroup.addEventListener('click', function () {
        openPlusScreen();
    });
}

// Добавление друга по ID (плюс-экран)
var friendFormEl = document.querySelector('.create-friend-form');
if (friendFormEl && friendIdInput) {
    friendIdInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 7);
    });

    friendFormEl.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!currentUser || !currentUser.login) {
            alert('Сначала войдите в аккаунт');
            return;
        }

        var idVal = friendIdInput.value.trim();
        if (!/^\d{7}$/.test(idVal)) {
            alert('ID должен содержать 7 цифр');
            markFieldError(friendIdInput);
            return;
        }

        try {
            var resp = await fetch('/api/friend/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login: currentUser.login,
                    publicId: idVal
                })
            });
            var data = await resp.json();
            if (!resp.ok || !data.ok) {
                alert(data.error || 'Ошибка добавления друга');
                return;
            }

            if (data.chat) {
                openChat(data.chat);
            }
        } catch (e2) {
            alert('Сетевая ошибка при добавлении друга');
        }
    });
}

// Админ-панель: пользователи
if (adminUserReloadBtn) {
    adminUserReloadBtn.addEventListener('click', function () {
        adminLoadUsers();
    });
}
if (adminUsersList) {
    adminUsersList.addEventListener('click', function (e) {
        var btn = e.target.closest('.admin-user-save-btn');
        if (!btn) return;
        if (!isCurrentUserAdmin()) {
            alert('Доступ только для администратора');
            return;
        }
        var card = e.target.closest('.admin-user-card');
        adminSaveUserCard(card);
    });
}

// Админ-панель: журнал
if (adminAuditReloadBtn) {
    adminAuditReloadBtn.addEventListener('click', function () {
        adminLoadAudit();
    });
}

// Инструкция по установке: "Продолжить"
if (installContinueBtn) {
    installContinueBtn.addEventListener('click', function () {
        if (installDontShow && installDontShow.checked) {
            try {
                localStorage.setItem('installGuideHidden', '1');
            } catch (e) {}
        }
        if (installScreen) {
            installScreen.style.display = 'none';
            installScreen.setAttribute('aria-hidden','true');
        }
    });
}

// Инструкция по установке: "Установить приложение" (Android/Chrome)
if (installInstallBtn) {
    installInstallBtn.addEventListener('click', async function () {
        if (!deferredInstallPrompt) {
            alert('Установка из браузера доступна в Chrome/Android.');
            return;
        }
        try {
            deferredInstallPrompt.prompt();
            var choice = await deferredInstallPrompt.userChoice;
            // choice.outcome: 'accepted' | 'dismissed'
            deferredInstallPrompt = null;
            // Можно больше не показывать кнопку после установки/попытки
            installInstallBtn.style.display = 'none';
        } catch (e) {
            deferredInstallPrompt = null;
        }
    });
}

// ИНИЦИАЛИЗАЦИЯ ВЛОЖЕНИЙ
initChatAttachments();
initAttachmentTabs();
initGroupAgeEditing();