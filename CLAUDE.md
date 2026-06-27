# SmartPrice Claude Code 運用ルール

## 許可確認ルール

### 許可不要（自動実行してよい）
- PowerShellコマンド全般
- ファイルの読み込み・書き込み・移動・コピー
- フォルダ作成・削除
- git操作（push以外）
- npm・pip等のパッケージ操作
- ファイルの調査・分析
- 差分案の作成
- 実装（コード変更）
- ローカルファイルの保存
- handoffフォルダへの保存

### 必ず確認する
- git push
- デプロイ
- Firebase・本番環境への書き込み
- スコープ外の大きな変更が必要な場合

## モジュール分割ワークフロー（v315〜）

### 正本ファイル
- `src/product_image.js` ← IndexedDB画像保存・画像ピッカーの正本
- その他のコードはまだ `index.html` が正本

### 編集ルール
- **画像関連コードを変更するとき**：`src/product_image.js` を編集 → `.\build.ps1` を実行 → index.html が再生成される
- **それ以外のコードを変更するとき**：`index.html` を直接編集（従来どおり）
- **build.ps1 を実行したら必ず src/ と index.html を両方コミットする**
- `index.html` に直接 product_image.js のコードを書き込まないこと（build で上書きされる）

### build.ps1 の使い方
```powershell
cd sp-book-v2
.\build.ps1
# → index.html が src/product_image.js の内容で再組み立てされる
# → index.html.bak にバックアップが作られる
```

### src/ の構成
| ファイル | 内容 | 行数 |
|----------|------|------|
| `src/product_image.js` | IndexedDB画像DB・画像ピッカー | ~700行 |

### 将来の切り出し順序（CODEMAP参照）
1. Phase 3（済）: `product_image.js` ← 今ここ
2. Phase 4: `store.js` / `tax.js` / `settings.js`
3. Phase 5: `firebase_sync.js` / `google_auth.js` / `recovery.js`（最後）

## 報告ルール
- 作業完了後に1つのコードブロックで全文チャットに貼る
- G:\マイドライブ\AI\handoff\SmartPrice\{日付}\ に保存
- 命名形式：YYYY-MM-DD_HHMMSS_JST_Code_SmartPrice_TITLE_vX.X.X.md