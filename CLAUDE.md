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

## 報告ルール
- 作業完了後に1つのコードブロックで全文チャットに貼る
- G:\マイドライブ\AI\handoff\SmartPrice\{日付}\ に保存
- 命名形式：YYYY-MM-DD_HHMMSS_JST_Code_SmartPrice_TITLE_vX.X.X.md