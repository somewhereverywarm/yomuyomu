/**
 * よむよむ - 子供向け文字読み上げアプリ
 * 
 * 機能:
 * 1. カメラで撮影
 * 2. Claude Vision APIで文字認識
 * 3. Web Speech APIで読み上げ
 */

// ========================================
// 要素の取得
// ========================================

const elements = {
    cameraPreview: document.getElementById('camera-preview'),
    captureCanvas: document.getElementById('capture-canvas'),
    captureBtn: document.getElementById('capture-btn'),
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

// ========================================
// 状態管理
// ========================================

const state = {
    stream: null,
    isSpeaking: false,
    utterance: null,
    lastImageData: null,
    cameraReady: false
};

// ========================================
// 定数
// ========================================

const STORAGE_KEY = 'yomuyomu_api_key';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// ========================================
// 初期化
// ========================================

async function init() {
    console.log('アプリ初期化開始');
    
    // APIキーを読み込み
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) {
        elements.apiKeyInput.value = savedKey;
    }

    // イベントリスナーを設定
    setupEventListeners();

    // カメラを起動
    await startCamera();

    // Service Workerを登録（相対パス）
    registerServiceWorker();
    
    console.log('アプリ初期化完了');
}

// ========================================
// カメラ機能
// ========================================

async function startCamera() {
    console.log('カメラ起動開始');
    
    // カメラAPIが利用可能かチェック
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('このブラウザはカメラをサポートしていません');
        alert('このブラウザはカメラをサポートしていません');
        return;
    }

    try {
        // 背面カメラを優先
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        console.log('カメラ許可をリクエスト中...');
        state.stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('カメラストリーム取得成功');
        
        elements.cameraPreview.srcObject = state.stream;
        
        // ビデオの再生開始を待つ
        elements.cameraPreview.onloadedmetadata = () => {
            console.log('カメラプレビュー準備完了');
            state.cameraReady = true;
        };

    } catch (error) {
        console.error('カメラの起動に失敗:', error);
        
        let message = 'カメラの起動に失敗しました。\n\n';
        
        if (error.name === 'NotAllowedError') {
            message += '【原因】カメラの使用が許可されていません。\n\n';
            message += '【対処法】\n';
            message += '1. iPhoneの「設定」を開く\n';
            message += '2.「Safari」をタップ\n';
            message += '3.「カメラ」を「許可」に設定\n';
            message += '4. このページを再読み込み';
        } else if (error.name === 'NotFoundError') {
            message += '【原因】カメラが見つかりません。';
        } else if (error.name === 'NotReadableError') {
            message += '【原因】カメラが他のアプリで使用中です。';
        } else {
            message += '【エラー】' + error.message;
        }
        
        alert(message);
    }
}

function captureImage() {
    if (!state.cameraReady) {
        alert('カメラがまだ準備できていません。少し待ってからもう一度お試しください。');
        return null;
    }
    
    const video = elements.cameraPreview;
    const canvas = elements.captureCanvas;
    const ctx = canvas.getContext('2d');

    // キャンバスサイズをビデオに合わせる
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // ビデオフレームをキャンバスに描画
    ctx.drawImage(video, 0, 0);

    // Base64形式で取得（JPEG、品質80%）
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    state.lastImageData = imageData;

    return imageData;
}

// ========================================
// Claude API連携
// ========================================

async function recognizeText(imageBase64) {
    const apiKey = localStorage.getItem(STORAGE_KEY);
    
    if (!apiKey) {
        throw new Error('APIキーが設定されていません');
    }

    // Base64のプレフィックスを除去
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const requestBody = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
            {
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
            }
        ]
    };

    const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API エラー: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

// ========================================
// 音声読み上げ
// ========================================

function speakText(text) {
    // 既存の読み上げを停止
    stopSpeaking();

    // 日本語音声を取得
    const voices = speechSynthesis.getVoices();
    const japaneseVoice = voices.find(voice => voice.lang.startsWith('ja')) || voices[0];

    // 読み上げ設定
    state.utterance = new SpeechSynthesisUtterance(text);
    state.utterance.voice = japaneseVoice;
    state.utterance.lang = 'ja-JP';
    state.utterance.rate = 0.9;  // 少しゆっくり（子供向け）
    state.utterance.pitch = 1.1; // 少し高め（親しみやすく）

    // イベントハンドラ
    state.utterance.onstart = () => {
        state.isSpeaking = true;
        showReading();
    };

    state.utterance.onend = () => {
        state.isSpeaking = false;
        hideAllOverlays();
    };

    state.utterance.onerror = (event) => {
        console.error('読み上げエラー:', event);
        state.isSpeaking = false;
        showError();
    };

    // 読み上げ開始
    speechSynthesis.speak(state.utterance);
}

function stopSpeaking() {
    if (state.isSpeaking) {
        speechSynthesis.cancel();
        state.isSpeaking = false;
    }
}

// ========================================
// UI制御
// ========================================

function showLoading() {
    hideAllOverlays();
    elements.loadingOverlay.classList.remove('hidden');
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
    elements.readingOverlay.classList.add('hidden');
    elements.errorOverlay.classList.add('hidden');
}

// ========================================
// メイン処理
// ========================================

async function handleCapture() {
    console.log('撮影ボタンが押されました');
    
    // APIキーチェック
    if (!localStorage.getItem(STORAGE_KEY)) {
        console.log('APIキーが未設定 - 設定画面を表示');
        showSettings();
        return;
    }

    // カメラ準備チェック
    if (!state.cameraReady) {
        alert('カメラがまだ準備できていません。');
        return;
    }

    try {
        // ローディング表示
        showLoading();

        // 画像をキャプチャ
        const imageData = captureImage();
        if (!imageData) {
            showError();
            return;
        }

        // Claude APIで文字認識
        const recognizedText = await recognizeText(imageData);
        console.log('認識結果:', recognizedText);

        // 音声で読み上げ
        speakText(recognizedText);

    } catch (error) {
        console.error('処理エラー:', error);
        alert('エラー: ' + error.message);
        showError();
    }
}

// ========================================
// イベントリスナー
// ========================================

function setupEventListeners() {
    // 撮影ボタン
    elements.captureBtn.addEventListener('click', handleCapture);

    // 停止ボタン
    elements.stopBtn.addEventListener('click', () => {
        stopSpeaking();
        hideAllOverlays();
    });

    // リトライボタン
    elements.retryBtn.addEventListener('click', () => {
        hideAllOverlays();
    });

    // 設定ボタン
    elements.settingsBtn.addEventListener('click', showSettings);

    // 設定を閉じる
    elements.closeSettings.addEventListener('click', hideSettings);

    // 設定オーバーレイの背景クリックで閉じる
    elements.settingsOverlay.addEventListener('click', (e) => {
        if (e.target === elements.settingsOverlay) {
            hideSettings();
        }
    });

    // APIキー保存
    elements.saveApiKey.addEventListener('click', () => {
        const apiKey = elements.apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem(STORAGE_KEY, apiKey);
            hideSettings();
            // 保存成功のフィードバック（軽い振動）
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            alert('APIキーを保存しました');
        } else {
            alert('APIキーを入力してください');
        }
    });

    // 音声リストの読み込み（iOS対策）
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices();
    };
}

// ========================================
// Service Worker
// ========================================

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            // 相対パスで登録
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker 登録完了:', registration);
        } catch (error) {
            console.log('Service Worker 登録失敗:', error);
        }
    }
}

// ========================================
// アプリ起動
// ========================================

// DOMContentLoaded時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
