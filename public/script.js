// script.js
const GROQ_API_KEY = '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';
const GROQ_MODEL = "llama-3.1-70b-versatile"; // mas stable na model, pwede mo palitan

let currentChatId = null;
let chats = [];
let currentUser = null;
let recognition = null;
let isRecording = false;

// Simple hash para sa password (local lang naman)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// Tabs switch
document.getElementById('show-register').addEventListener('click', () => {
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('show-register').classList.add('active');
    document.getElementById('show-login').classList.remove('active');
});

document.getElementById('show-login').addEventListener('click', () => {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('show-login').classList.add('active');
    document.getElementById('show-register').classList.remove('active');
});

// Register
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const age = parseInt(document.getElementById('reg-age').value);
    const gender = document.getElementById('reg-gender').value;
    const password = document.getElementById('reg-password').value;

    if (!name || isNaN(age) || !gender || !password) {
        alert('Lahat ng field kailangan punan!');
        return;
    }

    let users = JSON.parse(localStorage.getItem('convoUsers') || '{}');

    if (users[name]) {
        alert('May ganitong pangalan na! Mag-log in ka na lang.');
        return;
    }

    users[name] = {
        passwordHash: simpleHash(password),
        age: age,
        gender: gender
    };
    localStorage.setItem('convoUsers', JSON.stringify(users));

    currentUser = { name, age, gender };
    localStorage.setItem('currentConvoUser', JSON.stringify(currentUser));

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initApp();
});

// Login
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const password = document.getElementById('login-password').value;

    const users = JSON.parse(localStorage.getItem('convoUsers') || '{}');
    const user = users[name];

    if (!user || user.passwordHash !== simpleHash(password)) {
        alert('Mali ang pangalan o password!');
        return;
    }

    currentUser = { name, age: user.age, gender: user.gender };
    localStorage.setItem('currentConvoUser', JSON.stringify(currentUser));

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initApp();
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm('Mag-log out? Mawawala ang session mo.')) {
        localStorage.removeItem('currentConvoUser');
        location.reload();
    }
});

// Chat functions
function createNewChat() {
    const newChat = {
        id: Date.now().toString(),
        title: 'Bagong Usapan',
        messages: []
    };
    chats.unshift(newChat);
    saveChats();
    currentChatId = newChat.id;
    renderChatList();
    renderCurrentChat();
}

function renderChatList() {
    const list = document.getElementById('chat-list');
    list.innerHTML = '';
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        div.innerHTML = `
            <span>${chat.title}</span>
            <button class="delete-btn">🗑️</button>
        `;
        div.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            if (confirm('I-delete ang usapang ito?')) {
                chats = chats.filter(c => c.id !== chat.id);
                saveChats();
                if (currentChatId === chat.id) createNewChat();
                renderChatList();
            }
        };
        div.onclick = () => {
            currentChatId = chat.id;
            renderChatList();
            renderCurrentChat();
        };
        list.appendChild(div);
    });
}

function renderCurrentChat() {
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;

    document.getElementById('current-chat-title').textContent = chat.title;

    const window = document.getElementById('chat-window');
    window.innerHTML = '';

    chat.messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.role}`;
        div.innerHTML = `<p>${msg.content.replace(/\n/g, '<br>')}</p>`;
        window.appendChild(div);
    });

    window.scrollTop = window.scrollHeight;
}

async function sendMessage(text) {
    if (!text.trim()) return;

    const chat = chats.find(c => c.id === currentChatId);
    chat.messages.push({ role: 'user', content: text });
    renderCurrentChat();
    saveChats();

    const loading = document.createElement('div');
    loading.className = 'message assistant';
    loading.innerHTML = '<p><em>Iniisip ko...</em></p>';
    document.getElementById('chat-window').appendChild(loading);
    loading.scrollIntoView();

    const systemPrompt = {
        role: 'system',
        content: `Ikaw ay friendly na AI na tinatawag na Convo AI. Ang user ay si ${currentUser.name}, ${currentUser.age} taong gulang, ${currentUser.gender}. Mag-usap kayo nang natural sa Filipino o English.`
    };

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [systemPrompt, ...chat.messages]
            })
        });

        const data = await response.json();
        document.getElementById('chat-window').removeChild(loading);

        chat.messages.push({ role: 'assistant', content: data.content });
        renderCurrentChat();
        saveChats();

        speak(data.content);

        if (chat.messages.length === 2) {
            chat.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
            renderChatList();
        }
    } catch (err) {
        console.error(err);
        loading.innerHTML = '<p><em>May error. Subukan ulit.</em></p>';
    }
}

function speak(text) {
    if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'fil-PH';
        u.rate = 1.1;
        speechSynthesis.speak(u);
    }
}

// Voice input
function initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('Walang voice support sa browser mo.');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'fil-PH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = e => {
        const transcript = e.results[0][0].transcript;
        document.getElementById('message-input').value = transcript;
        sendMessage(transcript);
    };

    recognition.onend = () => {
        isRecording = false;
        document.getElementById('voice-input-btn').classList.remove('recording');
    };

    document.getElementById('voice-input-btn').onclick = () => {
        if (isRecording) {
            recognition.stop();
        } else {
            isRecording = true;
            document.getElementById('voice-input-btn').classList.add('recording');
            recognition.start();
        }
    };
}

function loadChats() {
    const key = `convoChats_${currentUser.name}`;
    const saved = localStorage.getItem(key);
    chats = saved ? JSON.parse(saved) : [];
    if (chats.length === 0) createNewChat();
}

function saveChats() {
    const key = `convoChats_${currentUser.name}`;
    localStorage.setItem(key, JSON.stringify(chats));
}

function initApp() {
    currentUser = JSON.parse(localStorage.getItem('currentConvoUser'));

    document.getElementById('user-display-name').textContent = currentUser.name;
    document.getElementById('user-age-gender').textContent = `${currentUser.age} • ${currentUser.gender}`;

    loadChats();
    renderChatList();
    renderCurrentChat();

    document.getElementById('new-chat-btn').onclick = createNewChat;

    document.getElementById('send-btn').onclick = () => {
        const input = document.getElementById('message-input');
        sendMessage(input.value);
        input.value = '';
    };

    document.getElementById('message-input').onkeypress = e => {
        if (e.key === 'Enter') {
            sendMessage(e.target.value);
            e.target.value = '';
        }
    };

    document.getElementById('clear-chat-btn').onclick = () => {
        if (confirm('I-clear lahat ng mensahe dito?')) {
            const chat = chats.find(c => c.id === currentChatId);
            chat.messages = [];
            saveChats();
            renderCurrentChat();
        }
    };

    initVoice();
}

// On load
window.onload = () => {
    if (localStorage.getItem('currentConvoUser')) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        initApp();
    }
};
