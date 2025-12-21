const logsContainer = document.getElementById('logs');
const typingElement = document.getElementById('typing');
const typingSound = document.getElementById('typingSound');
const alarmSound = document.getElementById('alarmSound');
const prompt = document.getElementById('prompt');

let deviceBrand = "Unknown Device";
let deviceModel = "Generic";

// Detect device brand/model (very accurate sa mobile!)
function detectDevice() {
    const ua = navigator.userAgent.toLowerCase();
    
    if (ua.includes('iphone')) {
        deviceBrand = "Apple iPhone";
        const modelMatch = ua.match(/iphone \d+/);
        deviceModel = modelMatch ? modelMatch[0].replace('iphone ', 'iPhone ') : "iPhone";
    } else if (ua.includes('ipad')) {
        deviceBrand = "Apple iPad";
        deviceModel = "iPad";
    } else if (ua.includes('samsung')) {
        deviceBrand = "Samsung";
        deviceModel = ua.match(/sm-[a-z0-9]+/) ? ua.match(/sm-[a-z0-9]+/)[0].toUpperCase() : "Galaxy Device";
    } else if (ua.includes('xiaomi') || ua.includes('redmi') || ua.includes('poco')) {
        deviceBrand = "Xiaomi/Redmi/POCO";
    } else if (ua.includes('oppo') || ua.includes('realme')) {
        deviceBrand = ua.includes('realme') ? "Realme" : "OPPO";
        const modelMatch = ua.match(/(c\d+|rmx\d+)/);
        deviceModel = modelMatch ? modelMatch[0].toUpperCase() : "Device";
    } else if (ua.includes('vivo')) {
        deviceBrand = "Vivo";
    } else if (ua.includes('huawei') || ua.includes('honor')) {
        deviceBrand = ua.includes('honor') ? "Honor" : "Huawei";
    } else {
        deviceBrand = "Android Device";
    }
}

// Fake logs array
const hackLogs = [
    "[INIT] Initializing system breach...",
    "[SCAN] Scanning device information...",
    `[DETECTED] Device: ${deviceBrand} ${deviceModel}`,
    "[SUCCESS] Device fingerprint acquired",
    "[BREACH] Bypassing Android/iOS security protocols...",
    "[ACCESS] Gaining root/admin privileges...",
    "[ROOT] Root access GRANTED",
    "[EXFIL] Accessing camera module...",
    "[SUCCESS] Front camera accessed",
    "[EXFIL] Accessing photo gallery...",
    "[FOUND] 2,847 photos detected",
    "[EXFIL] Accessing contacts...",
    "[FOUND] 312 contacts extracted",
    "[EXFIL] Accessing messages...",
    "[EXFIL] Accessing banking apps...",
    "[WARNING] GCash/Maya/BPI detected",
    "[EXFIL] Extracting login credentials...",
    "[UPLOAD] Sending data to remote server...",
    "[PROGRESS] 45% complete...",
    "[PROGRESS] 78% complete...",
    "[PROGRESS] 99% complete...",
    "<span class='warning'>[CRITICAL] YOUR DEVICE HAS BEEN FULLY COMPROMISED</span>",
    "<span class='warning'>[ALERT] ALL DATA HAS BEEN UPLOADED</span>",
    "<span class='warning'>[FINAL] DO NOT TURN OFF YOUR DEVICE</span>",
    "Just kidding! 😈 This was a prank!",
    "Gotcha! Send this to your friends HAHAHA"
];

// Typewriter effect
function typeLine(text, callback) {
    typingSound.play();
    let i = 0;
    typingElement.innerHTML = '';
    const interval = setInterval(() => {
        if (i < text.length) {
            typingElement.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(interval);
            typingSound.pause();
            typingSound.currentTime = 0;
            setTimeout(callback, 500);
        }
    }, 30);
}

// Add log line
function addLog(line, delay = 1000) {
    setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'line';
        div.innerHTML = line;
        logsContainer.appendChild(div);
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        if (line.includes('COMPROMISED') || line.includes('ALERT')) {
            alarmSound.play();
        }
        
        if (logsContainer.children.length < hackLogs.length) {
            typeLine('hack --target=' + deviceModel.toLowerCase() + ' --full-access', () => {
                addLog(hackLogs[logsContainer.children.length]);
            });
        } else {
            // End of prank
            setTimeout(() => {
                alert("PRANK SUCCESSFUL! 😂\n\nSend this link to your friends para matakot din sila!");
            }, 3000);
        }
    }, delay);
}

// Start prank
window.onload = () => {
    // Fullscreen agad
    document.documentElement.requestFullscreen?.() ||
    document.documentElement.webkitRequestFullscreen?.() ||
    document.documentElement.msRequestFullscreen?.();

    detectDevice();
    
    // Start with first lines
    addLog("[SYSTEM] Critical security update required", 1000);
    addLog("[CONNECTING] Establishing secure connection...", 2000);
    addLog("[AUTH] Authenticating with device...", 3000);
    addLog(`[SUCCESS] Connected to ${deviceBrand} ${deviceModel}`, 4000);
    
    setTimeout(() => {
        addLog(hackLogs[0], 0);
    }, 5000);
};
