/**
 * よむよむ - 子供向け文字読み上げアプリ
 * iOS対応版：読み上げはユーザータップで開始
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
    recognizedText: ''  // 認識したテキストを保存
};

const STORAGE_KEY = 'yomuyomu_api_key';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// ========================================
// 初期化
// ========================================

function init() {
    console.log('アプリ初期化開始');
    
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) {
        elements.apiKeyInput.value = savedKey;
    }

    setupEventListeners();
    
    // 音声を事前にロード
    speechSynthesis.getVoices();
    
    console.log('アプリ初期化完了');
}

// ========================================
// カメラ機能
// ========================================

async function startCamera() {
    if (state.cameraReady && state.stream) {
        return true;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('このブラウザはカメラをサポートしていません');
        return false;
    }

    try {
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        state.stream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.cameraPreview.srcObject = state.stream;
        
        await elements.cameraPreview.play();
        
        state.cameraReady = true;
        console.log('カメラ準備完了');
        return true;

    } catch (error) {
        console.error('カメラエラー:', error);
        alert('カメラの起動に失敗しました。\n設定でカメラを許可してください。');
        return false;
    }
}

function captureImage() {
    const video = elements.cameraPreview;
    const canvas = elements.captureCanvas;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.8);
}

// ========================================
// Claude API
// ========================================

async function recognizeText(imageBase64) {
    const apiKey = localStorage.getItem(STORAGE_KEY);
    
    if (!apiKey) {
        throw new Error('APIキーが設定されていません');
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: 'image/jpeg',
                            data: base64Data
                        }
                    },
                    {
                        type: 'text',
                        text: `この画像に写っている文字をすべて読み取ってください。

【重要な指示】
- 縦書き・横書きが混在している場合も、自然な読み順で読み取ってください
- 新聞記事の場合は、見出し→本文の順で読み取ってください
- 絵本の場合は、ページの流れに沿って読み取ってください
- ふりがな（ルビ）がある場合は、ふりがなを優先して読んでください
- 読み取った文字だけを出力し、説明や注釈は不要です
- 文字が見つからない場合は「もじが みつからなかったよ」と答えてください`
                    }
                ]
            }]
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API エラー: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

// ========================================
// 音声読み上げ（iOSはユーザータップから呼ぶ必要あり）
// ========================================

function speakText(text) {
    stopSpeaking();

    const voices = speechSynthesis.getVoices();
    const japaneseVoice = voices.find(v => v.lang.startsWith('ja')) || voices[0];

    console.log('読み上げ開始:', text.substring(0, 30) + '...');

    state.utterance = new SpeechSynthesisUtterance(text);
    state.utterance.voice = japaneseVoice;
    state.utterance.lang = 'ja-JP';
    state.utterance.rate = 0.9;
    state.utterance.pitch = 1.1;

    state.utterance.onstart = () => {
        state.isSpeaking = true;
        showReading();
    };

    state.utterance.onend = () => {
        state.isSpeaking = false;
        hideAllOverlays();
    };

    state.utterance.onerror = (event) => {
        console.error('読み上げエラー:', event.error);
        state.isSpeaking = false;
        hideAllOverlays();
    };

    speechSynthesis.speak(state.utterance);
}

function stopSpeaking() {
    speechSynthesis.cancel();
    state.isSpeaking = false;
}

// ========================================
// UI制御
// ========================================

function showLoading() {
    hideAllOverlays();
    elements.loadingOverlay.classList.remove('hidden');
}

function showReady() {
    hideAllOverlays();
    elements.readyOverlay.classList.remove('hidden');
}

function showReading() {
    hideAllOverlays();
    elements.readingOverlay.classList.remove('hidden');
}

function showError() {
    hideAllOverlays();
    elements.errorOverlay.classList.remove('hidden');
}

function showSettings() {
    elements.settingsOverlay.classList.remove('hidden');
}

function hideSettings() {
    elements.settingsOverlay.classList.add('hidden');
}

function hideAllOverlays() {
    elements.loadingOverlay.classList.add('hidden');
    elements.readyOverlay.classList.add('hidden');
    elements.readingOverlay.classList.add('hidden');
    elements.errorOverlay.classList.add('hidden');
}

// ========================================
// メイン処理
// ========================================

async function handleCapture() {
    // カメラ起動
    if (!state.cameraReady) {
        await startCamera();
        return;
    }

    // APIキーチェック
    if (!localStorage.getItem(STORAGE_KEY)) {
        showSettings();
        return;
    }

    try {
        showLoading();

        const imageData = captureImage();
        const text = await recognizeText(imageData);
        
        console.log('認識完了:', text.substring(0, 50));
        
        // テキストを保存して、再生ボタン画面を表示
        state.recognizedText = text;
        showReady();

    } catch (error) {
        console.error('エラー:', error);
        alert('エラー: ' + error.message);
        showError();
    }
}

// 再生ボタン押下時（iOSではここでspeakを呼ぶ必要あり）
function handlePlay() {
    if (state.recognizedText) {
        speakText(state.recognizedText);
    }
}

// ========================================
// イベントリスナー
// ========================================

function setupEventListeners() {
    // 撮影ボタン
    elements.captureBtn.addEventListener('click', handleCapture);

    // 再生ボタン（iOS対応：ユーザータップで音声開始）
    elements.playBtn.addEventListener('click', handlePlay);

    // 停止ボタン
    elements.stopBtn.addEventListener('click', () => {
        stopSpeaking();
        hideAllOverlays();
    });

    // リトライボタン
    elements.retryBtn.addEventListener('click', hideAllOverlays);

    // 設定
    elements.settingsBtn.addEventListener('click', showSettings);
    elements.closeSettings.addEventListener('click', hideSettings);
    
    elements.settingsOverlay.addEventListener('click', (e) => {
        if (e.target === elements.settingsOverlay) {
            hideSettings();
        }
    });

    elements.saveApiKey.addEventListener('click', () => {
        const apiKey = elements.apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem(STORAGE_KEY, apiKey);
            hideSettings();
        }
    });

    // 音声リスト読み込み
    speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices();
    };
}

// ========================================
// 起動
// ========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
