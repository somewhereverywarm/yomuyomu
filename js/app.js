/**
 * よむよむ - デバッグ版
 */

const elements = {
    cameraPreview: document.getElementById('camera-preview'),
    captureCanvas: document.getElementById('capture-canvas'),
    captureBtn: document.getElementById('capture-btn'),
    readyOverlay: document.getElementById('ready-overlay'),
    playBtn: document.getElementById('play-btn'),
    readingOverlay: document.getElementById('reading-overlay'),
    stopBtn: document.getElementById('stop-btn'),
    loadingOverlay: document.getElementById('loading-overlay'),
    errorOverlay: document.getElementById('error-overlay'),
    retryBtn: document.getElementById('retry-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsOverlay: document.getElementById('settings-overlay'),
    closeSettings: document.getElementById('close-settings'),
    apiKeyInput: document.getElementById('api-key-input'),
    saveApiKey: document.getElementById('save-api-key')
};

const state = {
    stream: null,
    isSpeaking: false,
    utterance: null,
    cameraReady: false,
    recognizedText: ''
};

const STORAGE_KEY = 'yomuyomu_api_key';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// デバッグ用ステータス表示
function showStatus(message) {
    console.log(message);
    let statusEl = document.getElementById('debug-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'debug-status';
        statusEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px;border-radius:10px;z-index:9999;max-width:80%;text-align:center;font-size:14px;';
        document.body.appendChild(statusEl);
    }
    statusEl.textContent = message;
    statusEl.style.display = 'block';
}

function hideStatus() {
    const statusEl = document.getElementById('debug-status');
    if (statusEl) statusEl.style.display = 'none';
}

function init() {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) elements.apiKeyInput.value = savedKey;
    setupEventListeners();
    speechSynthesis.getVoices();
}

async function startCamera() {
    if (state.cameraReady && state.stream) return true;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('カメラがサポートされていません');
        return false;
    }

    try {
        showStatus('カメラを起動中...');
        state.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: