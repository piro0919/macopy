# Macopy

macOS 専用の軽量クリップボード履歴マネージャー。Clipy からインスピレーションを得た、シンプルさとスピードを重視したアプリケーション。

## プロジェクト構造

```
macopy/
├── main/           # Electron メインプロセス
│   ├── main.ts     # エントリーポイント（トレイ、グローバルショートカット、クリップボード監視）
│   └── preload.js  # Context Isolation 用セキュリティブリッジ
├── renderer/       # React レンダラープロセス
│   ├── App.tsx     # メインコンポーネント（キーボード/マウス操作、IPC通信）
│   ├── index.tsx   # エントリーポイント
│   └── *.css       # スタイル（CSS Modules）
├── lp/             # ランディングページ（Next.js）
├── scripts/        # ビルド用スクリプト
├── assets/         # アイコン、画像アセット
└── dist/           # ビルド出力
```

## 技術スタック

- **言語**: TypeScript (strict mode)
- **フロントエンド**: React 19 + Vite
- **デスクトップ**: Electron 35
- **ネイティブ**: Swift (ClipboardWatcher), uiohook-napi
- **ランディングページ**: Next.js 15 + Framer Motion

## 開発コマンド

```bash
# 開発サーバー起動（ホットリロード）
npm run dev

# Vite + Electron 並行実行
npm run start

# フルビルド（アプリケーションパッケージング）
npm run build

# メインプロセスのみビルド
npm run build-main

# Electron 起動
npm run electron
```

## アーキテクチャ

### IPC 通信
- メインプロセス ↔ レンダラー間は `contextBridge` 経由で `window.macopy` API を公開
- ホワイトリスト方式でセキュリティを確保

### 主要機能
1. **クリップボード監視**: Swift/uiohook-napi でシステムレベル監視
2. **履歴管理**: electron-store で最新10アイテムを永続化
3. **ペースト自動化**: AppleScript で Command+V をシミュレート
4. **ポップアップUI**: Frameless ウィンドウでカーソル位置に表示

## コーディング規約

- ESLint + Prettier + Stylelint でコード品質管理
- 従来型コミットメッセージ形式（commitlint）
- パスエイリアス: `@/` → `renderer/`

## 必要な権限（macOS）

- Accessibility: ペースト自動化に必要
- Screen Recording: アプリ検出用（オプション）

## 注意事項

- macOS 専用（ARM64 ビルド対応）
- Node.js LTS 対応
- Electron の Context Isolation が有効
