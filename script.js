const logsContainer = document.getElementById('logs');
const typingElement = document.getElementById('typing');
const typingSound = document.getElementById('typingSound');
const alarmSound = document.getElementById('alarmSound');
const victimCam = document.getElementById('victimCam');

let deviceInfo = "Unknown Device";
let osVersion = "Unknown OS";
let batteryLevel = "Unknown";
let screenRes = "Unknown";
let ramUsage = "Unknown";
let storageUsed = "Unknown";
let networkType = "Unknown";
let fakeSerial = "Unknown";
let fakeIMEI = "Unknown";
let ipAddress = "Hidden (Blocked/VPN)";
let locationInfo = "Hidden Location";

// Super accurate device detection
function detectDevice() {
    const ua = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    let brand = "Unknown Device";
    let model = "";

    // Battery (works on most phones & some laptops)
    if (navigator.getBattery) {
        navigator.getBattery().then(bat => {
            batteryLevel = Math.floor(bat.level * 100) + "%";
        });
    } else {
        batteryLevel = Math.floor(Math.random() * 60 + 20) + "%"; // Fake if not available
    }

    // Screen resolution
    screenRes = `${screen.width}x${screen.height}`;

    // Fake RAM & Storage (convincing numbers)
    ramUsage = `${Math.floor(Math.random() * 6 + 2)}GB / 8GB`;
    storageUsed = `${Math.floor(Math.random() * 80 + 40)}GB / 128GB`;

    // Network type
    if ('connection' in navigator) {
        networkType = navigator.connection?.effectiveType || "WiFi";
    } else {
        networkType = Math.random() > 0.5 ? "Mobile Data (4G/5G)" : "WiFi";
    }

    // Fake serial & IMEI
    fakeSerial = "SN" + Math.random().toString(36).substring(2, 10).toUpperCase();
    fakeIMEI = Math.floor(Math.random() * 900000000000000) + 100000000000000;

    // OS & Device detection
    if (ua.includes('iphone')) {
        brand = "Apple iPhone";
        model = ua.match(/iphone \d+/) ? ua.match(/iphone \d+/)[0].replace('iphone ', '').toUpperCase() : "iPhone";
        osVersion = "iOS " + (ua.match(/os \d+/) ? ua.match(/os \d+/)[0].replace('os ', '').replace('_', '.') : "18.1");
    } else if (ua.includes('ipad')) {
        brand = "Apple iPad";
        osVersion = "iPadOS 18";
    } else if (platform.includes('mac')) {
        brand = "Apple MacBook";
        osVersion = "macOS Ventura";
    } else if (ua.includes('windows')) {
        brand = "Windows";
        model = "Laptop/PC";
        osVersion = "Windows 11";
    } else if (ua.includes('android')) {
        if (ua.includes('realme')) {
            brand = "Realme";
            model = ua.match(/(c\d+|rmx\d+)/i) ? ua.match(/(c\d+|rmx\d+)/i)[0].toUpperCase() : "C33/C55/RMX Series";
        } else if (ua.includes('samsung')) {
            brand = "Samsung";
            model = ua.match(/sm-[a-z0-9]+/i) ? ua.match(/sm-[a-z0-9]+/i)[0].toUpperCase() : "Galaxy A/S Series";
        } else if (ua.includes('xiaomi') || ua.includes('redmi') || ua.includes('poco')) {
            brand = "Xiaomi/Redmi/POCO";
            model = "Redmi Note / POCO X Series";
        } else if (ua.includes('oppo')) {
            brand = "OPPO";
            model = "Reno/A Series";
        } else if (ua.includes('vivo')) {
            brand = "Vivo";
            model = "Y/V Series";
        } else {
            brand = "Android Phone";
            model = "Generic Model";
        }
        osVersion = "Android " + (Math.floor(Math.random() * 4) + 11); // Android 11-14
    } else {
        brand = "Unknown Device";
        osVersion = "Unknown OS";
    }

    deviceInfo = `${brand} ${model}`.trim();
}

// Get IP + Location
async function getIPLocation() {
    try {
        const res = await fetch('https://freeipapi.com/api/json');
        const data = await res.json();
        ipAddress = data.ipAddress || "Hidden IP";
        locationInfo = [data.cityName, data.regionName, data.countryName].filter(Boolean).join(', ') || "Hidden Location";
    } catch (e) {
        ipAddress = "Blocked by Firewall";
        locationInfo = "VPN Detected";
    }
}

// Activate camera
async function activateCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        victimCam.srcObject = stream;
        victimCam.style.display = 'block';
        addLog("<span class='warning'>[LIVE FEED] Victim visible on front camera!</span>", 1000);
    } catch (err) {
        addLog("<span class='warning'>[DENIED] Camera access blocked!</span>", 1000);
    }
}

// Add log
function addLog(line, delay = 1400) {
    setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'line';
        div.innerHTML = line;
        logsContainer.appendChild(div);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        if (line.includes('CRITICAL') || line.includes('LIVE') || line.includes('COMPROMISED')) {
            alarmSound.play().catch(() => {});
        }
    }, delay);
}

// Start prank
window.onload = async () => {
    document.documentElement.requestFullscreen?.();

    typingSound.volume = 0.4;
    typingSound.play().catch(() => {});

    detectDevice();
    await getIPLocation();

    addLog("[SYSTEM] Critical security vulnerability detected...", 800);
    addLog("[SCAN] Initializing remote intrusion protocol...", 2200);
    addLog(`[TARGET] Device: ${deviceInfo}`, 3600);
    addLog(`[OS] System: ${osVersion}`, 5000);
    addLog(`[SCREEN] Resolution: ${screenRes}`, 6200);
    addLog(`[BATTERY] Level: ${batteryLevel}`, 7400);
    addLog(`[MEMORY] RAM Usage: ${ramUsage}`, 8600);
    addLog(`[STORAGE] Used: ${storageUsed}`, 9800);
    addLog(`[NETWORK] Connection: ${networkType}`, 11000);
    addLog(`[SERIAL] Device Serial: ${fakeSerial}`, 12200);
    addLog(`[IMEI] Identifier: ${fakeIMEI}`, 13400);
    addLog(`[IP] Your IP Address: ${ipAddress}`, 14600);
    addLog(`[LOCATION] Approximate location: ${locationInfo}`, 15800);
    addLog("[BREACH] Firewall bypassed successfully...", 17200);
    addLog("[ACCESS] Escalating to root privileges...", 18600);
    addLog("[ROOT] Full system access GRANTED", 20000);
    addLog("[CAM
