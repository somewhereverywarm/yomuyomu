"use strict";

var STORAGE_KEY = 'yomuyomu_api_key';
var VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate?key=';
var cameraReady = false;
var stream = null;
var recognizedText = '';

document.addEventListener('DOMContentLoaded', function() {
    console.log('アプリ初期化開始');
    
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
    
    console.log('アプリ初期化完了');
    
    function hideAll() {
        loadingOverlay.className = 'overlay hidden';
        readyOverlay.className = 'overlay hidden';
        readingOverlay.className = 'overlay hidden';
        errorOverlay.className = 'overlay hidden';
    }
    
    function showReady() {
        hideAll();
        readyOverlay.className = 'overlay';
        console.log('再生ボタン表示');
    }
    
    function showReading() {
        hideAll();
        readingOverlay.className = 'overlay';
    }
    
    function showError() {
        hideAll();
        errorOverlay.className = 'overlay';
    }
    
    function showLoading() {
        hideAll();
        loadingOverlay.className = 'overlay';
    }
    
    function startCamera() {
        console.log('カメラ起動中...');
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then(function(s) {
            stream = s;
            cameraPreview.srcObject = stream;
            cameraPreview.play();
            cameraReady = true;
            console.log('カメラ準備完了');
        })
        .catch(function(err) { 
            console.error('カメラエラー:', err);
            alert('カメラエラー: ' + err.message); 
        });
    }
    
    function capture() {
        var ctx = captureCanvas.getContext('2d');
        captureCanvas.width = cameraPreview.videoWidth;
        captureCanvas.height = cameraPreview.videoHeight;
        ctx.drawImage(cameraPreview, 0, 0);
        return captureCanvas.toDataURL('image/jpeg', 0.8);
    }
    
    function callVisionAPI(imageData) {
        var apiKey = localStorage.getItem(STORAGE_KEY);
        var base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
        
        console.log('Vision API呼び出し中...');
        
        var requestBody = {
            requests: [{
                image: { content: base64 },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
                imageContext: { languageHints: ['ja', 'en'] }
            }]
        };
        
        fetch(VISION_API_URL + apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        })
        .then(function(res) {
            console.log('API応答:', res.status);
            if (!res.ok) throw new Error('API error: ' + res.status);
            return res.json();
        })
        .then(function(data) {
            if (data.error) {
                alert('APIエラー: ' + data.error.message);
                showError();
                return;
            }
            
            if (data.responses && data.responses[0]) {
                var response = data.responses[0];
                if (response.error) {
                    alert('エラー: ' + response.error.message);
                    showError();
                    return;
                }
                if (response.fullTextAnnotation) {
                    recognizedText = response.fullTextAnnotation.text;
                } else if (response.textAnnotations && response.textAnnotations[0]) {
                    recognizedText = response.textAnnotations[0].description;
                } else {
                    recognizedText = 'もじが みつからなかったよ';
                }
            } else {
                recognizedText = 'もじが みつからなかったよ';
            }
            
            console.log('認識完了:', recognizedText.substring(0, 50));
            showReady();
        })
        .catch(function(err) {
            alert('通信エラー: ' + err.message);
            showError();
        });
    }
    
    function speak() {
        console.log('読み上げ開始');
        speechSynthesis.cancel();
        
        var voices = speechSynthesis.getVoices();
        var japaneseVoice = voices.find(function(v) { return v.lang.startsWith('ja'); }) || voices[0];
        
        var u = new SpeechSynthesisUtterance(recognizedText);
        u.voice = japaneseVoice;
        u.lang = 'ja-JP';
        u.rate = 0.9;
        u.pitch = 1.1;
        
        u.onstart = function() { showReading(); };
        u.onend = function() { hideAll(); };
        u.onerror = function() { hideAll(); };
        
        speechSynthesis.speak(u);
    }
    
    captureBtn.onclick = function() {
        if (!cameraReady) { startCamera(); return; }
        if (!localStorage.getItem(STORAGE_KEY)) { settingsOverlay.className = 'overlay'; return; }
        showLoading();
        callVisionAPI(capture());
    };
    
    playBtn.onclick = function() { speak(); };
    stopBtn.onclick = function() { speechSynthesis.cancel(); hideAll(); };
    retryBtn.onclick = function() { hideAll(); };
    settingsBtn.onclick = function() { settingsOverlay.className = 'overlay'; };
    closeSettings.onclick = function() { settingsOverlay.className = 'overlay hidden'; };
    saveApiKey.onclick = function() {
        var key = apiKeyInput.value.trim();
        if (key) { localStorage.setItem(STORAGE_KEY, key); settingsOverlay.className = 'overlay hidden'; }
    };
    speechSynthesis.onvoiceschanged = function() { speechSynthesis.getVoices(); };
});
```