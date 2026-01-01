"use strict";

var STORAGE_KEY = 'yomuyomu_api_key';
var CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
var cameraReady = false;
var stream = null;
var recognizedText = '';

window.onerror = function(msg, url, line) {
    alert('JSエラー: ' + msg + ' (行' + line + ')');
    return false;
};

document.addEventListener('DOMContentLoaded', function() {
    alert('アプリ起動');
    
    var captureBtn = document.getElementById('capture-btn');
    var playBtn = document.getElementById('play-btn');
    var stopBtn = document.getElementById('stop-btn');
    var retryBtn = document.getElementById('retry-btn');
    var settingsBtn = document.getElementById('settings-btn');
    var closeSettings = document.getElementById('close-settings');
    var saveApiKey = document.getElementById('save-api-key');
    var apiKeyInput = document.getElementById('api-key-input');
    var cameraPreview = document.getElementById('camera-preview');
    var captureCanvas = document.getElementById('capture-canvas');
    
    var loadingOverlay = document.getElementById('loading-overlay');
    var readyOverlay = document.getElementById('ready-overlay');
    var readingOverlay = document.getElementById('reading-overlay');
    var errorOverlay = document.getElementById('error-overlay');
    var settingsOverlay = document.getElementById('settings-overlay');
    
    var savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) apiKeyInput.value = savedKey;
    
    speechSynthesis.getVoices();
    
    function hideAll() {
        loadingOverlay.className = 'overlay hidden';
        readyOverlay.className = 'overlay hidden';
        readingOverlay.className = 'overlay hidden';
        errorOverlay.className = 'overlay hidden';
    }
    
    function startCamera() {
        alert('カメラ起動開始');
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then(function(s) {
            stream = s;
            cameraPreview.srcObject = stream;
            cameraPreview.play();
            cameraReady = true;
            alert('カメラ起動成功');
        })
        .catch(function(err) { alert('カメラエラー: ' + err.message); });
    }
    
    function capture() {
        var ctx = captureCanvas.getContext('2d');
        captureCanvas.width = cameraPreview.videoWidth;
        captureCanvas.height = cameraPreview.videoHeight;
        ctx.drawImage(cameraPreview, 0, 0);
        return captureCanvas.toDataURL('image/jpeg', 0.7);
    }
    
    function callAPI(imageData) {
        var apiKey = localStorage.getItem(STORAGE_KEY);
        var base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
        alert('API呼び出し中...');
        
        fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                messages: [{ role: 'user', content: [
                    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
                    { type: 'text', text: 'あなたはOCRです。画像内の文字を一字一句そのまま書き起こしてください。要約・説明・解釈は絶対にしないでください。見出し、本文、キャプションなど、見える文字をすべてそのまま出力してください。縦書きは上から下、右から左の順で読んでください。' }
                ]}]
            })
        })
        .then(function(res) {
            alert('API応答: ' + res.status);
            if (!res.ok) throw new Error('API error ' + res.status);
            return res.json();
        })
        .then(function(data) {
            recognizedText = data.content[0].text;
            alert('認識: ' + recognizedText.substring(0, 30));
            hideAll();
            readyOverlay.className = 'overlay';
        })
        .catch(function(err) {
            alert('APIエラー: ' + err.message);
            hideAll();
            errorOverlay.className = 'overlay';
        });
    }
    
    function speak() {
        var u = new SpeechSynthesisUtterance(recognizedText);
        u.lang = 'ja-JP';
        u.rate = 0.9;
        u.onstart = function() { hideAll(); readingOverlay.className = 'overlay'; };
        u.onend = function() { hideAll(); };
        speechSynthesis.speak(u);
    }
    
    captureBtn.onclick = function() {
        alert('撮影ボタン');
        if (!cameraReady) { startCamera(); return; }
        if (!localStorage.getItem(STORAGE_KEY)) { settingsOverlay.className = 'overlay'; return; }
        hideAll();
        loadingOverlay.className = 'overlay';
        var img = capture();
        alert('画像サイズ: ' + Math.round(img.length/1024) + 'KB');
        callAPI(img);
    };
    
    playBtn.onclick = function() { speak(); };
    stopBtn.onclick = function() { speechSynthesis.cancel(); hideAll(); };
    retryBtn.onclick = function() { hideAll(); };
    settingsBtn.onclick = function() { settingsOverlay.className = 'overlay'; };
    closeSettings.onclick = function() { settingsOverlay.className = 'overlay hidden'; };
    saveApiKey.onclick = function() {
        var key = apiKeyInput.value.trim();
        if (key) { localStorage.setItem(STORAGE_KEY, key); settingsOverlay.className = 'overlay hidden'; alert('保存しました'); }
    };
});