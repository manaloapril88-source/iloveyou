const logsContainer = document.getElementById('logs');
const typingElement = document.getElementById('typing');
const typingSound = document.getElementById('typingSound');
const alarmSound = document.getElementById('alarmSound');
const victimCam = document.getElementById('victimCam');

let deviceInfo = "Unknown Device";
let ipAddress = "Hidden (Blocked/VPN)";
let locationInfo = "Hidden Location";

// Improved device detection
function detectDevice() {
    const ua = navigator.userAgent.toLowerCase();
    let brand = "Unknown";
    let model = "";

    if (ua.includes('windows')) { brand = "Windows"; model = "Laptop/PC"; }
    else if (ua.includes('mac os')) { brand = "Apple MacBook"; }
    else if (ua.includes('linux')) { brand = "Linux"; model = "PC"; }
    else if (ua.includes('iphone')) { brand = "Apple iPhone"; model = ua.match(/iphone \d+/) ? "iPhone" : ""; }
    else if (ua.includes('ipad')) { brand = "Apple iPad"; }
    else if (ua.includes('samsung')) { brand = "Samsung"; model = ua.match(/sm-[a-z0-9]+/) ? ua.match(/sm-[a-z0-9]+/)[0].toUpperCase() : "Galaxy"; }
    else if (ua.includes('realme')) { brand = "Realme"; model = ua.match(/rmx\d+|c\d+/) ? ua.match(/rmx\d+|c\d+/)[0].toUpperCase() : "Device"; }
    else if (ua.includes('oppo')) { brand = "OPPO"; }
    else if (ua.includes('xiaomi') || ua.includes('redmi') || ua.includes('poco')) { brand = "Xiaomi/Redmi/POCO"; }
    else if (ua.includes('vivo')) { brand = "Vivo"; }
    else if (ua.includes('huawei') || ua.includes('honor')) { brand = ua.includes('honor') ? "Honor" : "Huawei"; }
    else { brand = "Android Device"; }

    deviceInfo = `${brand} ${model}`.trim();
}

// Reliable free IP + Location API (2025 working)
async function getIPLocation() {
    try {
        const res = await fetch('https://freeipapi.com/api/json');
        const data = await res.json();
        ipAddress = data.ipAddress || "Unknown IP";
        locationInfo = `${data.cityName || ''}, ${data.regionName || ''}, ${data.countryName || ''}`.replace(/^, |, $/g, '');
        if (!locationInfo) locationInfo = "Hidden Location";
    } catch (e) {
        console.log("API error, using fallback");
        ipAddress = "Blocked by Firewall";
        locationInfo = "VPN Detected";
    }
}

// Activate front camera
async function activateCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        victimCam.srcObject = stream;
        victimCam.style.display = 'block';
        addLog("<span class='warning'>[LIVE FEED] Victim visible on camera!</span>", 1000);
    } catch (err) {
        addLog("<span class='warning'>[DENIED] Camera access blocked by user!</span>", 1000);
    }
}

// Add log function
function addLog(line, delay = 1500) {
    setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'line';
        div.innerHTML = line;
        logsContainer.appendChild(div);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        if (line.includes('CRITICAL') || line.includes('LIVE')) {
            alarmSound.play();
        }
    }, delay);
}

// Start prank
window.onload = async () => {
    // Fullscreen
    document.documentElement.requestFullscreen?.();

    typingSound.play();

    detectDevice();
    await getIPLocation();

    addLog("[SYSTEM] Critical security vulnerability detected...", 1000);
    addLog("[SCAN] Initializing remote access protocol...", 2500);
    addLog(`[TARGET] Device detected: ${deviceInfo}`, 4000);
    addLog(`[IP] Your IP Address: ${ipAddress}`, 5500);
    addLog(`[LOCATION] Approximate location: ${locationInfo}`, 7000);
    addLog("[BREACH] Bypassing firewall and encryption...", 8500);
    addLog("[ACCESS] Gaining root/admin privileges...", 10000);
    addLog("[ROOT] Full system access GRANTED", 11500);
    addLog("[CAMERA] Activating front camera...", 13000);
    activateCamera();
    addLog("[EXFIL] Extracting gallery, messages, and contacts...", 15000);
    addLog("[BANK] Accessing GCash, Maya, BPI apps...", 16500);
    addLog("<span class='warning'>[CRITICAL] DEVICE FULLY COMPROMISED</span>", 18000);
    addLog("<span class='warning'>[ALERT] DO NOT TURN OFF YOUR DEVICE</span>", 19500);
    addLog("Just kidding! 😂 This was a PRANK!", 22000);
    addLog("Gotcha! Send this link to your friends para matakot din sila 😈", 23500);

    typingSound.pause();
};
