'use strict';
/*
APP: Smart Price
VERSION: v0.1.0
DATE(JST): 2026-02-26 21:49 JST
TITLE: SAFE MODE 最小構成（A：表示のみ）
AUTHOR: ChatGPT_Yui
CHANGES:
- SAFE MODE表示（SW/キャッシュ/外部APIなし）
- VERSION SSOT（表示の正本を1ヶ所に固定）
- ダミー購入履歴の表示（テーブル）
- debug=1時のみ診断パネル表示（UA/URLパラメータ/時刻）
BUILD_PARAM: ?b=2026-02-26_2149_safemode-a
DEBUG_PARAM: &debug=1
POLICY: SAFE MODE / 最小構成 / 外部依存なし
*/

(function(){
  // ---------------------------
  // VERSION SSOT（正本はここだけ）
  // ---------------------------
  const APP = {
    NAME: 'Smart Price',
    VERSION: 'v0.1.0',
    AUTHOR: 'ChatGPT_Yui',
    TITLE: 'SAFE MODE 最小構成（A：表示のみ）'
  };

  // URLパラメータ
  const params = new URLSearchParams(location.search);
  const BUILD = (params.get('b') || 'no-b').trim();
  const DEBUG = (params.get('debug') === '1');

  const FULL_VERSION = `${APP.VERSION} [${BUILD}]`;

  // ---------------------------
  // DOM
  // ---------------------------
  const elAppVersion = document.getElementById('vAppVersion');
  const elBuild = document.getElementById('vBuild');
  const elFullVersion = document.getElementById('vFullVersion');
  const elUrl = document.getElementById('vUrl');
  const elUa = document.getElementById('vUa');
  const elNow = document.getElementById('vNow');
  const elDebugPanel = document.getElementById('debugPanel');
  const elDiagText = document.getElementById('diagText');
  const elTbody = document.getElementById('purchaseTbody');
  const elEmpty = document.getElementById('emptyState');

  const btnReload = document.getElementById('btnReload');
  const btnCopyDiag = document.getElementById('btnCopyDiag');

  // ---------------------------
  // ダミーデータ（A段階：表示のみ）
  // ---------------------------
  function getDummyPurchases(){
    return [
      {
        id: 'p-001',
        date: '2026-02-25',
        store: 'カスミ',
        name: '牛乳 1L',
        price: 238,
        qty: 1,
        note: 'SAFE MODE ダミー'
      },
      {
        id: 'p-002',
        date: '2026-02-26',
        store: 'ヨークベニマル',
        name: '食パン 6枚',
        price: 178,
        qty: 1,
        note: ''
      },
      {
        id: 'p-003',
        date: '2026-02-26',
        store: 'ドラッグストア',
        name: 'シャンプー 詰替',
        price: 598,
        qty: 1,
        note: '値上がり確認'
      }
    ];
  }

  // ---------------------------
  // 描画
  // ---------------------------
  function yen(n){
    const x = Number(n);
    if (!Number.isFinite(x)) return '-';
    return x.toLocaleString('ja-JP') + '円';
  }

  function renderRows(rows){
    elTbody.innerHTML = '';
    if (!rows || rows.length === 0){
      elEmpty.hidden = false;
      return;
    }
    elEmpty.hidden = true;

    const frag = document.createDocumentFragment();
    for (const r of rows){
      const tr = document.createElement('tr');

      const tdDate = document.createElement('td');
      tdDate.textContent = r.date || '';
      tr.appendChild(tdDate);

      const tdStore = document.createElement('td');
      tdStore.textContent = r.store || '';
      tr.appendChild(tdStore);

      const tdName = document.createElement('td');
      tdName.textContent = r.name || '';
      tr.appendChild(tdName);

      const tdPrice = document.createElement('td');
      tdPrice.className = 'colNum';
      tdPrice.textContent = yen(r.price);
      tr.appendChild(tdPrice);

      const tdQty = document.createElement('td');
      tdQty.className = 'colNum';
      tdQty.textContent = String(r.qty ?? '');
      tr.appendChild(tdQty);

      const tdNote = document.createElement('td');
      tdNote.textContent = r.note || '';
      tr.appendChild(tdNote);

      frag.appendChild(tr);
    }
    elTbody.appendChild(frag);
  }

  // ---------------------------
  // 診断
  // ---------------------------
  function buildDiagText(){
    const now = new Date();
    const lines = [];
    lines.push('【Smart Price SAFE MODE 診断ログ】');
    lines.push('VERSION: ' + APP.VERSION);
    lines.push('BUILD(b): ' + BUILD);
    lines.push('FULL: ' + FULL_VERSION);
    lines.push('URL: ' + location.href);
    lines.push('UA: ' + navigator.userAgent);
    lines.push('NOW: ' + now.toISOString());
    lines.push('');
    lines.push('POLICY: SW/Cache/APIなし（SAFE MODE）');
    return lines.join('\n');
  }

  async function copyToClipboard(text){
    try {
      await navigator.clipboard.writeText(text);
      alert('コピーしました');
    } catch (e) {
      // clipboard APIが無い/拒否された場合のフォールバック
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        alert('コピーしました');
      } catch (e2) {
        alert('コピーできませんでした。\n手動で選択してコピーしてください。');
      }
      document.body.removeChild(ta);
    }
  }

  // ---------------------------
  // 初期化
  // ---------------------------
  function init(){
    elAppVersion.textContent = APP.VERSION;
    elBuild.textContent = BUILD;

    // ダミー表示
    renderRows(getDummyPurchases());

    // debug=1 のときだけ表示
    if (DEBUG){
      elDebugPanel.hidden = false;
      elFullVersion.textContent = FULL_VERSION;
      elUrl.textContent = location.href;
      elUa.textContent = navigator.userAgent;
      elNow.textContent = new Date().toISOString();

      const diag = buildDiagText();
      elDiagText.textContent = diag;

      btnCopyDiag.addEventListener('click', () => copyToClipboard(diag));
    }

    btnReload.addEventListener('click', () => {
      renderRows(getDummyPurchases());
      if (DEBUG){
        const diag = buildDiagText();
        elDiagText.textContent = diag;
      }
    });
  }

  // DOMContentLoaded待ち（deferなのでほぼ不要だが保険）
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
