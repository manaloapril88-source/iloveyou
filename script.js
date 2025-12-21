const logsContainer = document.getElementById('logs');
const typingElement = document.getElementById('typing');
const typingSound = document.getElementById('typingSound');
const alarmSound = document.getElementById('alarmSound');
const victimCam = document.getElementById('victimCam');

let deviceInfo = "Unknown Device";
let ipAddress = "Unknown IP";
let locationInfo = "Unknown Location";

// Detect device brand/model more accurately
function detectDevice() {
    const ua = navigator.userAgent.toLowerCase();
    let brand = "Unknown";
    let model = "Device";

    if (ua.includes('iphone')) { brand = "Apple iPhone"; model = ua.match(/iphone os \d+/) ? "iPhone" : "iPhone"; }
    else if (ua.includes('ipad')) { brand = "Apple iPad"; }
    else if (ua.includes('mac')) { brand = "Apple Mac"; }
    else if (ua.includes('samsung')) { brand = "Samsung"; model = ua.match(/sm-[a-z0-9]+/) ? ua.match(/sm-[a-z0-9]+/)[0].toUpperCase() : "Galaxy"; }
    else if (ua.includes('xiaomi') || ua.includes('redmi') || ua.includes('poco')) { brand = "Xiaomi/Redmi/POCO"; }
    else if (ua.includes('oppo') || ua.includes('realme')) { brand = ua.includes('realme') ? "Realme" : "OPPO"; model = ua.match(/(c\d+|rmx\d+)/) ? ua.match(/(c\d+|rmx\d+)/)[0].toUpperCase() : "Device"; }
    else if (ua.includes('vivo')) { brand = "Vivo"; }
    else if (ua.includes('huawei') || ua.includes('honor')) { brand = ua.includes('honor') ? "Honor" : "Huawei"; }
    else { brand = "Android Device"; }

    deviceInfo = `${brand} ${model}`;
}

// Get IP + Location using free API (no key, accurate)
async function getIPLocation() {
    try {
        const res = await fetch('https://ip-api.com/json/');
        const data = await res.json();
        if (data.status === 'success') {
            ipAddress = data.query;
            locationInfo = `${data.city}, ${data.regionName}, ${data.country}`;
        }
    } catch (e) {
        locationInfo = "Hidden (VPN Detected?)";
    }
}

// Open front camera (prank - they see themselves)
async function activateCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" } // Front camera
        });
        victimCam.srcObject = stream;
        victimCam.style.display = 'block';
    } catch (err) {
        addLog("<span class='warning'>[DENIED] Camera access blocked!</span>");
    }
}

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
            setTimeout(callback, 600);
        }
    }, 40);
}

// Add log
function addLog(line, delay = 1200) {
    setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'line';
        div.innerHTML = line;
        logsContainer.appendChild(div);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        if (line.includes('COMPROMISED') || line.includes('CAMERA')) {
            alarmSound.play();
        }
    }, delay);
}

// Start the prank
window.onload = async () => {
    document.documentElement.requestFullscreen();

    detectDevice();
    await getIPLocation();

    addLog("[SYSTEM] Critical security vulnerability detected...", 1000);
    addLog("[SCAN] Initializing remote access protocol...", 2000);
    addLog(`[TARGET] Device detected: ${deviceInfo}`, 3000);
    addLog(`[IP] Your IP: ${ipAddress}`, 4000);
    addLog(`[LOCATION] Approximate location: ${locationInfo}`, 5000);
    addLog("[BREACH] Firewall bypassed...", 6000);
    addLog("[ACCESS] Gaining full system control...", 7000);
    addLog("[ROOT] Root access obtained", 8000);
    addLog("[CAMERA] Activating front camera feed...", 9000);
    activateCamera(); // Open camera here
    addLog("<span class='warning'>[LIVE FEED] Victim visible!</span>", 10000);
    addLog("[EXFIL] Extracting photos & messages...", 11000);
    addLog("[BANK] Accessing GCash/Maya accounts...", 12000);
    addLog("<span class='warning'>[CRITICAL] DEVICE FULLY COMPROMISED</span>", 14000);
    addLog("<span class='warning'>[ALERT] DO NOT TURN OFF YOUR PHONE</span>", 15000);
    addLog("Just kidding! 😂 This was a PRANK!", 18000);
    addLog("Gotcha bad! Send this to your friends para matakot din 😈", 19000);
};
