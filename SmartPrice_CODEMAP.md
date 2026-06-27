# SmartPrice CODEMAP

作成日: 2026-06-27 JST  
対象: `index.html` / `sw.js`  
対象バージョン: `v23.9.314 [3140]`

## 目的

SmartPriceは単一HTMLが2万行を超えているため、毎回すべてを読むと調査コストとトークン消費が大きい。  
このCODEMAPは、次回以降の修正で「該当ブロックだけを読む」ための索引である。

v313では実際のモジュール分割やbuildスクリプト導入は行わない。

## 調査の基本手順

1. まずこの `SmartPrice_CODEMAP.md` を読む。
2. `rg -n "関数名|境界コメント" index.html` で対象範囲を探す。
3. 変更対象ブロックの前後だけ読む。
4. `saveData()` / `syncFirebase()` / `startMigration()` に触れる場合は必ず事前レビューを挟む。

## 機能ブロック一覧

| 行 | ブロック | 内容 | 危険度 |
|---:|---|---|---|
| 2742-3262 | FIREBASE CORE | Firebase初期化、Firebase接続診断、基本ユーティリティ | ★★★★☆ |
| 3266-14541 | PRODUCT IMAGE | IndexedDB画像保存、画像候補、画像取り込み、画像検索導線 | ★★★☆☆ |
| 3964-5205 | LOCAL DB AND CONFIG | `db`、設定、正規化、localStorage読み書き | ★★★★★ |
| 5209-5612 | FIREBASE SYNC | Firebase PUT/GET、同期、バックアップ呼び出し | ★★★★★ |
| 5616-6292 | BACKUP AND RECOVERY | 回復コード、バックアップ、店舗候補整理UI | ★★★★☆ |
| 6296-6617 | STORE AND TAX | 店舗候補バー、店舗税モード、EC候補 | ★★★☆☆ |
| 6621-7424 | HISTORY RENDERING | 購入履歴一覧、比較表示、価格表示 | ★★☆☆☆ |
| 7428-8609 | PRODUCT SAVE | 商品だけ登録、購入保存、履歴更新 | ★★★★★ |
| 8613-14537 | EXTERNAL PRODUCT LOOKUP | JAN検索、Yahoo/Rakuten/OFF、画像候補検索 | ★★★☆☆ |
| 14545-14774 | STORE NAME MIGRATION | 店名正規化マイグレーション | ★★★☆☆ |
| 14778-15477 | STARTUP MIGRATION | 初回移行、起動時同期、API呼び出し | ★★★★★ |
| 15481-16329 | ACCOUNT AND GOOGLE AUTH | アカウント状態、Googleログイン、Google保存確認 | ★★★★☆ |
| 16333-16554 | SETTINGS AND DANGEROUS OPERATIONS | キャッシュ削除、端末データ削除、上級者向け操作 | ★★★★☆ |
| 16558-19645 | BARCODE INPUT | 手入力、バーコード処理、商品登録フォーム | ★★★☆☆ |
| 19649-20175 | FAMILY SHARE | 家族共有、招待コード、共有グループ | ★★★★☆ |
| 20179-22546 | DEBUG AND DIAGNOSTICS | 検証ログ、商品診断、レポート、デバッグ出力 | ★★☆☆☆ |

## 主要関数一覧

| 行 | 関数/定数 | 役割 | 危険度 |
|---:|---|---|---|
| 368 | `APP_VERSION` | アプリ表示バージョン | ★☆☆☆☆ |
| 369 | `BUILD_ID` | キャッシュ更新・表示用ビルドID | ★☆☆☆☆ |
| 371 | `SP_API_URL` | SmartPrice APIベースURL | ★★★★☆ |
| 2745 | `FIREBASE_CONFIG` | Firebase接続設定 | ★★★★★ |
| 2766 | `initializeFirebase()` | Firebase SDK初期化 | ★★★★☆ |
| 3457 | `uploadImageToFirebase()` | 商品画像をFirebaseへ保存 | ★★★☆☆ |
| 3582 | `deleteImageFromFirebase()` | 商品画像をFirebaseから削除 | ★★★☆☆ |
| 4669 | `normalizeDb()` | DB構造の正規化 | ★★★★★ |
| 4799 | `saveLocalOnly()` | localStorage保存 | ★★★★★ |
| 5015 | `loadLocal()` | localStorage読込 | ★★★★★ |
| 5211 | `syncFirebasePut()` | FirebaseへPUT | ★★★★★ |
| 5415 | `syncFirebase()` | Firebase同期 | ★★★★★ |
| 5563 | `backupPurchases()` | 購入履歴バックアップ | ★★★★☆ |
| 5619 | `setRecoveryCode()` | 回復コード保存 | ★★★★☆ |
| 5644 | `recoverByCode()` | 回復コード復元 | ★★★★☆ |
| 6219 | `renderStoreCleanupPanel()` | 店舗候補整理UI | ★★☆☆☆ |
| 6298 | `renderStoreList()` | 店舗候補バー描画 | ★★★☆☆ |
| 6623 | `renderHistory()` | 購入履歴描画 | ★★☆☆☆ |
| 7430 | `saveProductMasterOnly()` | 商品だけ登録 | ★★★☆☆ |
| 7676 | `saveData()` | 購入履歴保存の中心 | ★★★★★ |
| 8616 | `lookupOffByJan()` | Open Food Facts検索 | ★★★☆☆ |
| 8799 | `lookupRakutenByJan()` | 楽天系検索プロキシ | ★★★☆☆ |
| 8932 | `lookupYahooByJan()` | Yahoo検索/API | ★★★☆☆ |
| 13272 | `fetchImageViaGasProxy()` | URL画像をプロキシ経由で取得 | ★★★☆☆ |
| 13910 | `spImportImageFromUrl()` | 画像URL貼り付け取り込み | ★★☆☆☆ |
| 13950 | `getImageCandidates()` | 画像候補収集 | ★★★☆☆ |
| 14136 | `selectImageCandidate()` | 画像候補を商品へ反映 | ★★★☆☆ |
| 14294 | `searchImageWeb()` | 外部画像検索導線 | ★★☆☆☆ |
| 14548 | `SP_STORE_RENAME_MAP` | 店名正規化辞書 | ★★★☆☆ |
| 14567 | `runStoreNameMigration()` | 店名正規化マイグレーション | ★★★☆☆ |
| 14760 | `confirmDeleteProduct()` | 商品削除確認 | ★★★☆☆ |
| 14781 | `startMigration()` | 初回移行/同期の入口 | ★★★★★ |
| 15457 | `_spApiCall()` | SmartPrice API呼び出し | ★★★★☆ |
| 15600 | `fetchGoogleCloudDb()` | Google UID側DB取得 | ★★★★☆ |
| 15606 | `putGoogleCloudDb()` | Google UID側DB保存 | ★★★★★ |
| 15709 | `handleGoogleLoginClick()` | Googleログイン処理 | ★★★★☆ |
| 15790 | `handleGoogleLogoutClick()` | Googleログアウト処理 | ★★★★☆ |
| 16339 | `clearAllCache()` | キャッシュ・データ削除系 | ★★★★☆ |
| 16565 | `openBarcodeManual()` | 手入力画面 | ★★☆☆☆ |
| 16655 | `searchByManualBarcode()` | 手入力JAN検索 | ★★★☆☆ |
| 17305 | `testFirebaseConnection()` | Firebase接続テスト | ★★☆☆☆ |
| 19668 | `spCreateFamilyInvite()` | 家族招待コード作成 | ★★★★☆ |
| 19813 | `spJoinFamilyGroup()` | 家族共有参加 | ★★★★☆ |
| 19985 | `spAcceptFamilyInvite()` | 招待承認 | ★★★★☆ |

## Firebase保存・読み込み関数

| 行 | 関数 | 説明 | 注意 |
|---:|---|---|---|
| 2766 | `initializeFirebase()` | Firebase App/Auth/Database初期化 | 設定変更は高リスク |
| 4799 | `saveLocalOnly()` | 端末内保存 | 保存構造変更は要レビュー |
| 5015 | `loadLocal()` | 端末内読込 | 読込後正規化に影響 |
| 5211 | `syncFirebasePut()` | FirebaseへPUT | 空上書き事故の再発防止対象 |
| 5415 | `syncFirebase()` | Firebaseから読み込み/同期 | 既存履歴消失リスクあり |
| 5563 | `backupPurchases()` | バックアップ作成 | 失敗時UXも重要 |
| 5619 | `setRecoveryCode()` | 回復コード登録 | UID紐付け |
| 5644 | `recoverByCode()` | 最新バックアップ復元 | merge挙動に注意 |
| 14781 | `startMigration()` | 初回移行/同期入口 | 絶対にサイレント失敗させない |
| 15600 | `fetchGoogleCloudDb()` | Googleアカウント側DB取得 | 空アカウント判定に関与 |
| 15606 | `putGoogleCloudDb()` | Googleアカウント側DB保存 | 空上書きガード必須 |
| 3457 | `uploadImageToFirebase()` | 画像保存 | 商品履歴本体とは分離 |
| 3582 | `deleteImageFromFirebase()` | 画像削除 | 商品履歴削除と混同しない |
| 19668 | `spCreateFamilyInvite()` | 家族招待作成 | 共有設計変更時に要レビュー |
| 19813 | `spJoinFamilyGroup()` | 家族共有参加 | UID/共有境界に注意 |
| 19985 | `spAcceptFamilyInvite()` | 招待承認 | 将来再設計対象 |

## 外部API呼び出し一覧

| 行 | 対象 | 用途 | 関連関数 |
|---:|---|---|---|
| 2735-2737 | Firebase SDK | Auth/Realtime Database | `initializeFirebase()` |
| 2739 | `html5-qrcode` | バーコード読取 | スキャン処理 |
| 359 | SmartPrice API | アカウント/API処理 | `_spApiCall()` |
| 8616 | Open Food Facts | JAN商品情報検索 | `lookupOffByJan()` |
| 8799 | 楽天系プロキシ | 楽天商品情報検索 | `lookupRakutenByJan()` |
| 8932 | Yahoo API/Proxy | Yahoo商品情報検索 | `lookupYahooByJan()` |
| 13272 | GAS画像プロキシ | URL画像取得 | `fetchImageViaGasProxy()` |
| 13950 | Google画像検索プロキシ | 画像候補検索 | `getImageCandidates()` |
| 17640 / 17882 | 楽天検索URL | 外部ブラウザ検索リンク | 画像/商品検索UI |

## 危険度ランク

### ★★★★★ 絶対触らない

- `saveData()`
- `syncFirebase()`
- `syncFirebasePut()`
- `startMigration()`
- `normalizeDb()`
- `saveLocalOnly()`
- `loadLocal()`
- `putGoogleCloudDb()`

触る場合は、事前設計書、レビュー、実機検証、バックアップ確認が必要。

### ★★★★☆ 慎重

- Googleログイン
- 回復コード
- `backupPurchases()`
- 家族共有
- 危険操作/リセット系

UID、Firebaseパス、localStorage削除に関わるため、変更範囲を狭くする。

### ★★★☆☆ 普通

- 商品画像
- 店舗辞書
- 税モード
- 店名正規化
- 外部API検索

データ本体を書き換える処理と表示だけの処理を分けて確認する。

### ★★☆☆☆ 安全

- 設定画面
- 履歴表示
- 店舗候補整理UI
- 商品診断表示

ただし、ボタンから危険処理を呼ぶ場合は呼び出し先の危険度を優先する。

### ★☆☆☆☆ UIのみ

- テーマ
- バナー
- ラベル
- 文言
- アイコン

データ保存処理に触れないことを確認してから変更する。

## 境界コメント

`index.html` には以下の形式で境界コメントを追加済み。

```js
// ======================
// PRODUCT IMAGE START
// ======================
```

検索例:

```powershell
rg -n "PRODUCT IMAGE START|PRODUCT IMAGE END" index.html
```

## 将来の切り出し順序

今は実装しない。将来の目安として記録する。

| Phase | 対象 | 理由 |
|---|---|---|
| Phase 2 | `product_image.js` | Firebase本体と距離があり、比較的切り出しやすい |
| Phase 3 | `store.js` / `tax.js` / `settings.js` | UI/辞書/表示ロジックを分離できる |
| Phase 4 | `firebase_sync.js` / `google_auth.js` / `recovery.js` | 最重要データ保護領域なので最後 |

## 次回以降の注意

- 購入履歴を変更する修正では、必ず `saveData()` と `syncFirebasePut()` の呼び出し経路を確認する。
- 画像修正では `PRODUCT IMAGE` と `EXTERNAL PRODUCT LOOKUP` だけを優先して読む。
- 店舗名/税表示修正では `STORE AND TAX`、`STORE NAME MIGRATION`、`HISTORY RENDERING` を読む。
- Googleログイン修正では `ACCOUNT AND GOOGLE AUTH` と `FIREBASE SYNC` を読む。
- 回復コード修正では `BACKUP AND RECOVERY` と `FIREBASE SYNC` を読む。
