# 📖 よむよむ

**写真を撮ると文字を読み上げてくれるアプリ**

4歳のお子さんでも直感的に使える、シンプルな読み上げアプリです。

## ✨ 特徴

- 📸 **カメラで撮影** → 自動で文字を認識
- 🔊 **音声で読み上げ** → 日本語に対応
- 🎨 **文字のないUI** → アイコンだけで操作可能
- 📰 **縦書き・横書き対応** → 新聞も絵本もOK

## 🚀 使い方

1. アプリを開く
2. 大きな丸ボタンをタップして撮影
3. 自動で読み上げ開始！
4. 止めたいときは □ ボタンをタップ

## 🔧 セットアップ

### 1. Anthropic APIキーの取得

1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. アカウントを作成またはログイン
3. APIキーを作成してコピー

### 2. アプリにAPIキーを設定

1. アプリ右上の ⋮ ボタンをタップ
2. 🔑 欄にAPIキーを貼り付け
3. ✓ ボタンで保存

## 📱 iPhoneへのインストール

1. Safariでアプリを開く
2. 共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」を選択
4. 「追加」をタップ

これでホーム画面にアプリアイコンが追加されます！

## 💻 開発

### ローカルで実行

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start
```

ブラウザで http://localhost:8080 を開く

### 技術スタック

- **フロントエンド**: HTML5, CSS3, JavaScript (Vanilla)
- **文字認識**: Claude Vision API (claude-sonnet-4-20250514)
- **音声合成**: Web Speech API
- **PWA**: Service Worker, Web App Manifest

## 📝 ライセンス

MIT License

## 🙏 クレジット

- 文字認識: [Anthropic Claude API](https://www.anthropic.com/)
