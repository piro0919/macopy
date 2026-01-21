# Macopy

macOS 専用の軽量クリップボード履歴マネージャー。Clipy からインスピレーションを得た、シンプルさとスピードを重視したアプリケーション。

## プロジェクト構造

```
macopy/
├── src/            # Tauri バックエンド (Rust)
│   ├── src/
│   │   └── lib.rs  # メインロジック（トレイ、グローバルショートカット、クリップボード監視）
│   ├── Cargo.toml  # Rust 依存関係
│   └── tauri.conf.json  # Tauri 設定
├── renderer/       # React フロントエンド
│   ├── App.tsx     # メインコンポーネント（キーボード/マウス操作）
│   ├── api/tauri.ts # Tauri API ブリッジ
│   ├── index.tsx   # エントリーポイント
│   └── *.css       # スタイル（CSS Modules）
├── shared/         # 共通型定義
├── lp/             # ランディングページ（Next.js）
├── scripts/        # ビルド用スクリプト
└── assets/         # アイコン、画像アセット
```

## 技術スタック

- **言語**: TypeScript (strict mode) + Rust
- **フロントエンド**: React 19 + Vite
- **デスクトップ**: Tauri v2
- **ネイティブ**: Rust (cocoa/objc bindings for macOS APIs)
- **ランディングページ**: Next.js 15 + Framer Motion

## 開発コマンド

```bash
# 開発サーバー起動（ホットリロード）
npm run dev

# フルビルド（アプリケーションパッケージング）
npm run build

# Vite のみ起動
npm run vite:dev
```

## アーキテクチャ

### IPC 通信
- Tauri の `invoke` API でフロントエンド ↔ Rust バックエンド間を通信
- `@tauri-apps/api` パッケージを使用

### 主要機能
1. **クリップボード監視**: Rust でシステムレベル監視（macOS NSPasteboard API）
2. **履歴管理**: Tauri の設定ストアで最新10アイテムを永続化
3. **ペースト自動化**: AppleScript で Command+V をシミュレート
4. **ポップアップUI**: Frameless ウィンドウでカーソル位置に表示
5. **マルチモニター対応**: ネイティブ NSScreen API で正確な座標計算

## コーディング規約

- ESLint + Prettier + Stylelint でコード品質管理
- 従来型コミットメッセージ形式（commitlint）
- パスエイリアス: `@/` → `renderer/`

## 必要な権限（macOS）

- Accessibility: ペースト自動化に必要
- Screen Recording: アプリ検出用（オプション）

## 注意事項

- macOS 専用（ARM64 / x86_64 ビルド対応）
- Tauri v2 使用
- macos-private-api 機能が有効（透過ウィンドウ等に必要）
