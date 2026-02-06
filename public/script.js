// script.js
// =================== CONFIG ===================
const GROQ_MODEL = "openai/gpt-oss-120b"; // Gamitin ang model na binigay mo
// ==============================================

let currentChatId = null;
let chats = [];
let userName = '';
let userEmail = '';
let recognition = null;
let isRecording = false;

// Google Sign-In handler
function handleCredentialResponse(response) {
    const responsePayload = parseJwt(response.credential);
    
    userName = responsePayload.name;
    userEmail = responsePayload.email;
    
    // Save to localStorage
    localStorage.setItem('userName', userName);
    localStorage.setItem('userEmail', userEmail);
    
    // Hide login, show app
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    // Init the app
    initApp();
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Load chats from localStorage
function loadChats() {
    const savedChats = localStorage.getItem('convoChats');
    chats = savedChats ? JSON.parse(savedChats) : [];
    if (chats.length === 0) {
        createNewChat();
    }
}

// Save chats
function saveChats() {
    localStorage.setItem('convoChats', JSON.stringify(chats));
}

// Create new chat
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

// Render chat list
function renderChatList() {
    const chatListEl = document.getElementById('chat-list');
    chatListEl.innerHTML = '';
    
    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.innerHTML = `
            <span>${chat.title}</span>
            <button class="delete-btn" onclick="deleteChat('${chat.id}'); event.stopImmediatePropagation();">🗑️</button>
        `;
        item.onclick = () => {
            currentChatId = chat.id;
            renderChatList();
            renderCurrentChat();
        };
        chatListEl.appendChild(item);
    });
}

// Delete chat
window.deleteChat = function(chatId) {
    if (confirm('Sigurado ka bang gusto mong i-delete itong usapan?')) {
        chats = chats.filter(c => c.id !== chatId);
        saveChats();
        if (currentChatId === chatId) {
            currentChatId = chats[0] ? chats[0].id : null;
        }
        renderChatList();
        renderCurrentChat();
    }
};

// Render current chat messages
function renderCurrentChat() {
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    document.getElementById('current-chat-title').textContent = chat.title;
    
    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = '';
    
    chat.messages.forEach(msg => {
        const msgEl = document.createElement('div');
        msgEl.className = `message ${msg.role}`;
        msgEl.innerHTML = `<p>${msg.content}</p>`;
        chatWindow.appendChild(msgEl);
    });
    
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Send message
async function sendMessage(text) {
    if (!text.trim()) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // Add user message
    chat.messages.push({ role: 'user', content: text });
    renderCurrentChat();
    saveChats();
    
    // Show loading
    const loadingEl = document.createElement('div');
    loadingEl.className = 'message assistant';
    loadingEl.innerHTML = `<p><em>Iniisip ko...</em></p>`;
    const chatWindow = document.getElementById('chat-window');
    chatWindow.appendChild(loadingEl);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // Prepare messages for Groq (with system prompt)
    const systemPrompt = {
        role: 'system',
        content: `Ikaw ay isang friendly at matulungin na conversational AI na tinatawag na Convo AI. Ang pangalan ng user ay ${userName}. Mag-usap tayo nang natural sa Filipino o English depende sa user. Huwag kang magbigay ng medical o legal advice.`
    };
    
    const apiMessages = [systemPrompt, ...chat.messages];
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages: apiMessages })
        });
        
        const data = await response.json();
        
        // Remove loading
        chatWindow.removeChild(loadingEl);
        
        // Add AI response
        chat.messages.push({ role: 'assistant', content: data.content });
        renderCurrentChat();
        saveChats();
        
        // Speak the response
        speakResponse(data.content);
        
        // Update title if it's the first response
        if (chat.messages.length === 2) {
            chat.title = text.length > 35 ? text.substring(0, 32) + '...' : text;
            renderChatList();
        }
    } catch (error) {
        console.error('Error:', error);
        chatWindow.removeChild(loadingEl);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'message assistant';
        errorMsg.innerHTML = `<p><em>May mali. Subukan ulit.</em></p>`;
        chatWindow.appendChild(errorMsg);
    }
}

// Speak response using TTS
function speakResponse(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fil-PH'; // Filipino if available, else en-US
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        speechSynthesis.speak(utterance);
    }
}

// Voice input
function initVoiceRecognition() {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
        console.warn('Browser mo ay walang suporta sa Speech-to-Text');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'fil-PH'; // Filipino support if available
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('message-input');
        input.value = transcript;
        sendMessage(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error('STT Error:', event.error);
        isRecording = false;
        document.getElementById('voice-input-btn').classList.remove('recording');
    };
    
    recognition.onend = () => {
        isRecording = false;
        document.getElementById('voice-input-btn').classList.remove('recording');
    };
}

document.getElementById('voice-input-btn').addEventListener('click', () => {
    if (!recognition) {
        alert('Ang browser mo ay hindi sumusuporta sa voice input.');
        return;
    }
    
    if (isRecording) {
        recognition.stop();
        return;
    }
    
    isRecording = true;
    document.getElementById('voice-input-btn').classList.add('recording');
    recognition.start();
});

// Init app
function initApp() {
    userName = localStorage.getItem('userName');
    userEmail = localStorage.getItem('userEmail');
    
    // Display user info
    document.getElementById('user-display-name').textContent = userName;
    document.getElementById('user-email').textContent = userEmail;
    
    loadChats();
    renderChatList();
    renderCurrentChat();
    
    // Event listeners
    document.getElementById('new-chat-btn').addEventListener('click', () => {
        createNewChat();
    });
    
    document.getElementById('send-btn').addEventListener('click', () => {
        const input = document.getElementById('message-input');
        sendMessage(input.value);
        input.value = '';
    });
    
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(e.target.value);
            e.target.value = '';
        }
    });
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        if (confirm('Sigurado ka bang gusto mong mag-sign out?')) {
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            document.getElementById('app').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
        }
    });
    
    document.getElementById('clear-chat-btn').addEventListener('click', () => {
        if (confirm('I-clear ang lahat ng mensahe sa usapang ito?')) {
            const chat = chats.find(c => c.id === currentChatId);
            if (chat) {
                chat.messages = [];
                saveChats();
                renderCurrentChat();
            }
        }
    });
    
    // Init voice
    initVoiceRecognition();
}

// Auto-login if already signed in
window.onload = () => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        initApp();
    } else {
        // Google Sign-In is initialized automatically by the script tag
    }
};
