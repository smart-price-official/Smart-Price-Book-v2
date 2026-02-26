'use strict';
/*
APP: Smart Price
VERSION: v0.4.0
DATE(JST): 2026-02-27 00:33 JST
TITLE: SAFE MODE 最小構成（D：店マスター）
AUTHOR: ChatGPT_Yui
CHANGES:
- 店マスター追加（localStorage）：よく行く店を登録/削除
- 購入フォームの「店」は入力のまま、候補（datalist）に店マスターを反映
- JSONエクスポート/インポートを拡張：purchases + stores を退避/復元（旧形式も受け入れ）
- debug=1診断に stores 件数を追加
BUILD_PARAM: ?b=2026-02-27_0033_safemode-d_stores
DEBUG_PARAM: &debug=1
POLICY: SAFE MODE / 最小構成 / 外部依存なし
*/

(function(){
  var APP = {
    NAME: 'Smart Price',
    VERSION: 'v0.4.0',
    AUTHOR: 'ChatGPT_Yui',
    TITLE: 'SAFE MODE 最小構成（D：店マスター）'
  };

  var PURCHASES_KEY = 'sp_safemode_purchases_v1';
  var STORES_KEY = 'sp_safemode_stores_v1';

  var params = new URLSearchParams(location.search);
  var BUILD = (params.get('b') || 'no-b').trim();
  var DEBUG = (params.get('debug') === '1');
  var FULL_VERSION = APP.VERSION + ' [' + BUILD + ']';

  // DOM (header)
  var elAppVersion = document.getElementById('vAppVersion');
  var elBuild = document.getElementById('vBuild');

  // DOM (purchase)
  var elPurchTbody = document.getElementById('purchaseTbody');
  var elPurchEmpty = document.getElementById('emptyState');
  var elStatus = document.getElementById('statusText');

  var fDate = document.getElementById('fDate');
  var fStore = document.getElementById('fStore');
  var fName = document.getElementById('fName');
  var fPrice = document.getElementById('fPrice');
  var fQty = document.getElementById('fQty');
  var fNote = document.getElementById('fNote');

  var btnAdd = document.getElementById('btnAdd');
  var btnSeed = document.getElementById('btnSeed');
  var btnClear = document.getElementById('btnClear');

  // DOM (store master)
  var elStoreList = document.getElementById('storeList');
  var sName = document.getElementById('sName');
  var sNote = document.getElementById('sNote');
  var btnStoreAdd = document.getElementById('btnStoreAdd');
  var btnStoreSeed = document.getElementById('btnStoreSeed');
  var elStoreStatus = document.getElementById('storeStatus');
  var elStoreTbody = document.getElementById('storeTbody');
  var elStoreEmpty = document.getElementById('storeEmpty');

  // DOM (export/import)
  var btnExport = document.getElementById('btnExport');
  var fileImport = document.getElementById('fileImport');
  var btnPasteToggle = document.getElementById('btnPasteToggle');
  var pasteBox = document.getElementById('pasteBox');
  var pasteText = document.getElementById('pasteText');
  var btnPasteImport = document.getElementById('btnPasteImport');
  var btnPasteClear = document.getElementById('btnPasteClear');

  // DOM (debug)
  var elDebugPanel = document.getElementById('debugPanel');
  var elFullVersion = document.getElementById('vFullVersion');
  var elPurchKey = document.getElementById('vPurchKey');
  var elStoreKey = document.getElementById('vStoreKey');
  var elPurchCount = document.getElementById('vPurchCount');
  var elStoreCount = document.getElementById('vStoreCount');
  var elLastExport = document.getElementById('vLastExport');
  var elLastImport = document.getElementById('vLastImport');
  var elUrl = document.getElementById('vUrl');
  var elUa = document.getElementById('vUa');
  var elNow = document.getElementById('vNow');
  var elDiagText = document.getElementById('diagText');
  var btnCopyDiag = document.getElementById('btnCopyDiag');

  // State
  var purchases = []; // purchase rows
  var stores = [];    // store rows
  var lastExportAt = '';
  var lastImportAt = '';

  // Utils
  function todayISO(){
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth()+1).padStart(2,'0');
    var dd = String(d.getDate()).padStart(2,'0');
    return yyyy + '-' + mm + '-' + dd;
  }

  function nowISO(){ return new Date().toISOString(); }

  function yen(n){
    var x = Number(n);
    if (!Number.isFinite(x)) return '-';
    return x.toLocaleString('ja-JP') + '円';
  }

  function setStatus(msg){ elStatus.textContent = msg || ''; }
  function setStoreStatus(msg){ elStoreStatus.textContent = msg || ''; }

  function safeParse(json){ try { return JSON.parse(json); } catch (e) { return null; } }
  function normText(s){ return String(s || '').trim(); }

  function validatePurchase(r){
    if (!r || typeof r !== 'object') return null;
    var out = {
      id: String(r.id || ''),
      date: String(r.date || ''),
      store: String(r.store || ''),
      name: String(r.name || ''),
      price: Number(r.price),
      qty: Number(r.qty),
      note: String(r.note || '')
    };
    if (!out.id) return null;
    if (!Number.isFinite(out.price)) out.price = 0;
    if (!Number.isFinite(out.qty) || out.qty <= 0) out.qty = 1;
    return out;
  }

  function validateStore(r){
    if (!r || typeof r !== 'object') return null;
    var name = normText(r.name);
    if (!name) return null;
    var out = {
      id: String(r.id || ''),
      name: name,
      note: String(r.note || '')
    };
    if (!out.id) out.id = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6);
    return out;
  }

  function sortPurchasesDesc(){
    purchases.sort(function(a,b){
      if (a.date !== b.date) return (a.date < b.date) ? 1 : -1;
      return (a.id < b.id) ? 1 : -1;
    });
  }

  function sortStores(){
    stores.sort(function(a,b){ return a.name.localeCompare(b.name, 'ja'); });
  }

  // Render
  function renderPurchases(){
    elPurchTbody.innerHTML = '';
    if (!purchases || purchases.length === 0) {
      elPurchEmpty.hidden = false;
      return;
    }
    elPurchEmpty.hidden = true;

    var frag = document.createDocumentFragment();
    for (var i=0; i<purchases.length; i++) {
      var r = purchases[i];
      var tr = document.createElement('tr');

      var tdDate = document.createElement('td'); tdDate.textContent = r.date || ''; tr.appendChild(tdDate);
      var tdStore = document.createElement('td'); tdStore.textContent = r.store || ''; tr.appendChild(tdStore);
      var tdName = document.createElement('td'); tdName.textContent = r.name || ''; tr.appendChild(tdName);

      var tdPrice = document.createElement('td'); tdPrice.className = 'colNum'; tdPrice.textContent = yen(r.price); tr.appendChild(tdPrice);
      var tdQty = document.createElement('td'); tdQty.className = 'colNum'; tdQty.textContent = String(r.qty ?? ''); tr.appendChild(tdQty);

      var tdNote = document.createElement('td'); tdNote.textContent = r.note || ''; tr.appendChild(tdNote);

      frag.appendChild(tr);
    }
    elPurchTbody.appendChild(frag);
  }

  function renderStores(){
    elStoreList.innerHTML = '';
    for (var i=0; i<stores.length; i++) {
      var opt = document.createElement('option');
      opt.value = stores[i].name;
      elStoreList.appendChild(opt);
    }

    elStoreTbody.innerHTML = '';
    if (!stores || stores.length === 0) {
      elStoreEmpty.hidden = false;
      return;
    }
    elStoreEmpty.hidden = true;

    var frag = document.createDocumentFragment();
    for (var j=0; j<stores.length; j++) {
      (function(store){
        var tr = document.createElement('tr');

        var tdName = document.createElement('td'); tdName.textContent = store.name; tr.appendChild(tdName);
        var tdNote = document.createElement('td'); tdNote.textContent = store.note || ''; tr.appendChild(tdNote);

        var tdAct = document.createElement('td'); tdAct.className = 'colNum';
        var btnDel = document.createElement('button');
        btnDel.className = 'btn btn--danger';
        btnDel.type = 'button';
        btnDel.textContent = '削除';
        btnDel.addEventListener('click', function(){
          if (!confirm('店「' + store.name + '」を削除します。よろしいですか？')) return;
          stores = stores.filter(function(x){ return x.id !== store.id; });
          saveStores();
          renderStores();
          updateDebug();
          setStoreStatus('削除しました（' + stores.length + '件）');
        });
        tdAct.appendChild(btnDel);
        tr.appendChild(tdAct);

        frag.appendChild(tr);
      })(stores[j]);
    }
    elStoreTbody.appendChild(frag);
  }

  // Storage
  function loadPurchases(){
    var raw = localStorage.getItem(PURCHASES_KEY);
    if (!raw) return [];
    var parsed = safeParse(raw);
    if (!Array.isArray(parsed)) return [];
    var list = [];
    for (var i=0; i<parsed.length; i++) {
      var v = validatePurchase(parsed[i]);
      if (v) list.push(v);
    }
    return list;
  }

  function savePurchases(){ localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases)); }

  function loadStores(){
    var raw = localStorage.getItem(STORES_KEY);
    if (!raw) return [];
    var parsed = safeParse(raw);
    if (!Array.isArray(parsed)) return [];
    var list = [];
    for (var i=0; i<parsed.length; i++) {
      var v = validateStore(parsed[i]);
      if (v) list.push(v);
    }
    return list;
  }

  function saveStores(){ localStorage.setItem(STORES_KEY, JSON.stringify(stores)); }

  // Seed
  function seedPurchases(){
    return [
      { id:'p-001', date:'2026-02-25', store:'カスミ', name:'牛乳 1L', price:238, qty:1, note:'SAFE MODE ダミー' },
      { id:'p-002', date:'2026-02-26', store:'ヨークベニマル', name:'食パン 6枚', price:178, qty:1, note:'' },
      { id:'p-003', date:'2026-02-26', store:'ドラッグストア', name:'シャンプー 詰替', price:598, qty:1, note:'値上がり確認' }
    ];
  }

  function seedStores(){
    return [
      { id:'s-001', name:'カスミ', note:'よく行く' },
      { id:'s-002', name:'ヨークベニマル', note:'' },
      { id:'s-003', name:'ドラッグストア', note:'日用品' }
    ];
  }

  // Export / Import
  function buildExportPayload(){
    return {
      app: APP.NAME,
      version: APP.VERSION,
      build: BUILD,
      exportedAt: nowISO(),
      keys: {
        purchasesKey: PURCHASES_KEY,
        storesKey: STORES_KEY
      },
      purchases: purchases,
      stores: stores
    };
  }

  function downloadJson(obj, filename){
    var json = JSON.stringify(obj, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  function exportJson(){
    var payload = buildExportPayload();
    var stamp = new Date();
    var y = stamp.getFullYear();
    var m = String(stamp.getMonth()+1).padStart(2,'0');
    var d = String(stamp.getDate()).padStart(2,'0');
    var hh = String(stamp.getHours()).padStart(2,'0');
    var mm = String(stamp.getMinutes()).padStart(2,'0');
    var fname = 'smartprice_safemode_export_' + y + m + d + '_' + hh + mm + '.json';
    downloadJson(payload, fname);
    lastExportAt = payload.exportedAt;
    setStatus('エクスポートしました（購入 ' + purchases.length + '件 / 店 ' + stores.length + '件）');
    updateDebug();
  }

  function normalizeImportPayload(obj){
    if (Array.isArray(obj)) {
      return { purchases: obj, stores: null };
    }
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj.purchases)) {
        return { purchases: obj.purchases, stores: Array.isArray(obj.stores) ? obj.stores : null };
      }
    }
    return null;
  }

  function confirmReplace(pCount, sCountNullable){
    var msg = 'インポートすると現在のデータを置き換えます。\n'
            + '購入：' + pCount + '件\n';
    if (sCountNullable !== null) msg += '店：' + sCountNullable + '件\n';
    msg += 'よろしいですか？';
    return confirm(msg);
  }

  function applyImport(obj){
    var norm = normalizeImportPayload(obj);
    if (!norm) {
      setStatus('インポート失敗：形式が不正です');
      return false;
    }

    var pList = [];
    for (var i=0; i<norm.purchases.length; i++) {
      var v = validatePurchase(norm.purchases[i]);
      if (v) pList.push(v);
    }

    var sList = null;
    if (norm.stores !== null) {
      sList = [];
      for (var j=0; j<norm.stores.length; j++) {
        var sv = validateStore(norm.stores[j]);
        if (sv) sList.push(sv);
      }
    }

    if (!confirmReplace(pList.length, (sList===null ? null : sList.length))) return false;

    purchases = pList;
    sortPurchasesDesc();
    savePurchases();

    if (sList !== null) {
      stores = sList;
      sortStores();
      saveStores();
    }

    renderPurchases();
    renderStores();

    lastImportAt = nowISO();
    setStatus('インポートしました（購入 ' + purchases.length + '件 / 店 ' + stores.length + '件）');
    updateDebug();
    return true;
  }

  function handleImportFile(file){
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      var text = String(reader.result || '');
      var obj = safeParse(text);
      if (!obj) return setStatus('インポート失敗：JSONが壊れています');
      applyImport(obj);
    };
    reader.onerror = function(){ setStatus('インポート失敗：ファイル読込に失敗しました'); };
    reader.readAsText(file);
  }

  function importJsonText(text){
    var obj = safeParse(text);
    if (!obj) return setStatus('インポート失敗：JSONが壊れています');
    applyImport(obj);
  }

  // Debug
  function buildDiagText(){
    var lines = [];
    lines.push('【Smart Price SAFE MODE 診断ログ】');
    lines.push('VERSION: ' + APP.VERSION);
    lines.push('BUILD(b): ' + BUILD);
    lines.push('FULL: ' + FULL_VERSION);
    lines.push('PURCHASES_KEY: ' + PURCHASES_KEY);
    lines.push('STORES_KEY: ' + STORES_KEY);
    lines.push('PURCHASES_COUNT: ' + purchases.length);
    lines.push('STORES_COUNT: ' + stores.length);
    lines.push('LAST_EXPORT: ' + (lastExportAt || '-'));
    lines.push('LAST_IMPORT: ' + (lastImportAt || '-'));
    lines.push('URL: ' + location.href);
    lines.push('UA: ' + navigator.userAgent);
    lines.push('NOW: ' + nowISO());
    lines.push('');
    lines.push('POLICY: SW/Cache/APIなし（SAFE MODE）');
    return lines.join('\n');
  }

  function updateDebug(){
    if (!DEBUG) return;
    elFullVersion.textContent = FULL_VERSION;
    elPurchKey.textContent = PURCHASES_KEY;
    elStoreKey.textContent = STORES_KEY;
    elPurchCount.textContent = String(purchases.length);
    elStoreCount.textContent = String(stores.length);
    elLastExport.textContent = lastExportAt || '-';
    elLastImport.textContent = lastImportAt || '-';
    elUrl.textContent = location.href;
    elUa.textContent = navigator.userAgent;
    elNow.textContent = nowISO();
    elDiagText.textContent = buildDiagText();
  }

  function copyDiag(){
    var text = buildDiagText();
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ alert('コピーしました'); }).catch(function(){ fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); alert('コピーしました'); }
    catch (e) { alert('コピーできませんでした。\n手動で選択してコピーしてください。'); }
    document.body.removeChild(ta);
  }

  // Actions
  function addPurchase(){
    var date = normText(fDate.value);
    var store = normText(fStore.value);
    var name = normText(fName.value);
    var price = Number(normText(fPrice.value));
    var qty = Number(normText(fQty.value));
    var note = normText(fNote.value);

    if (!date) return setStatus('日付が未入力です');
    if (!store) return setStatus('店が未入力です');
    if (!name) return setStatus('商品が未入力です');
    if (!Number.isFinite(price) || price < 0) return setStatus('価格が不正です');
    if (!Number.isFinite(qty) || qty <= 0) return setStatus('個数が不正です');

    var id = 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6);
    purchases.push({ id:id, date:date, store:store, name:name, price:price, qty:qty, note:note });
    sortPurchasesDesc();
    savePurchases();
    renderPurchases();
    updateDebug();

    fName.value = '';
    fPrice.value = '';
    fNote.value = '';
    fName.focus();

    setStatus('保存しました（購入 ' + purchases.length + '件）');
  }

  function addStore(){
    var name = normText(sName.value);
    var note = normText(sNote.value);
    if (!name) return setStoreStatus('店名が未入力です');

    var exists = stores.some(function(x){ return x.name.toLowerCase() === name.toLowerCase(); });
    if (exists) return setStoreStatus('同じ店名が既にあります');

    var id = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6);
    stores.push({ id:id, name:name, note:note });
    sortStores();
    saveStores();
    renderStores();
    updateDebug();

    sName.value = '';
    sNote.value = '';
    sName.focus();

    setStoreStatus('追加しました（' + stores.length + '件）');
  }

  function storeSeed(){
    if (!confirm('店のダミーを投入します。よろしいですか？（既存の店は残します）')) return;
    var seeds = seedStores();
    for (var i=0; i<seeds.length; i++) {
      var sn = seeds[i].name;
      var exists = stores.some(function(x){ return x.name.toLowerCase() === sn.toLowerCase(); });
      if (!exists) stores.push(seeds[i]);
    }
    sortStores();
    saveStores();
    renderStores();
    updateDebug();
    setStoreStatus('ダミーを投入しました（' + stores.length + '件）');
  }

  function seedAll(){
    if (!confirm('ダミーデータ（購入＋店）を投入して保存します。よろしいですか？')) return;
    purchases = seedPurchases();
    stores = seedStores();
    sortPurchasesDesc();
    sortStores();
    savePurchases();
    saveStores();
    renderPurchases();
    renderStores();
    updateDebug();
    setStatus('ダミーを保存しました（購入 ' + purchases.length + '件 / 店 ' + stores.length + '件）');
  }

  function clearAll(){
    if (!confirm('全消去します。購入と店、両方の端末内保存を消します。よろしいですか？')) return;
    purchases = [];
    stores = [];
    localStorage.removeItem(PURCHASES_KEY);
    localStorage.removeItem(STORES_KEY);
    renderPurchases();
    renderStores();
    updateDebug();
    setStatus('全消去しました');
    setStoreStatus('');
  }

  function togglePaste(){
    pasteBox.hidden = !pasteBox.hidden;
    if (!pasteBox.hidden) pasteText.focus();
  }

  function pasteImport(){
    var text = normText(pasteText.value);
    if (!text) return setStatus('貼り付けが空です');
    importJsonText(text);
  }

  function pasteClear(){
    pasteText.value = '';
    setStatus('貼り付けを消しました');
  }

  function init(){
    elAppVersion.textContent = APP.VERSION;
    elBuild.textContent = BUILD;
    fDate.value = todayISO();

    purchases = loadPurchases();
    stores = loadStores();
    sortPurchasesDesc();
    sortStores();

    renderPurchases();
    renderStores();

    if (DEBUG){
      elDebugPanel.hidden = false;
      btnCopyDiag.addEventListener('click', copyDiag);
    }
    updateDebug();

    setStatus('読込完了（購入 ' + purchases.length + '件 / 店 ' + stores.length + '件）');

    btnAdd.addEventListener('click', addPurchase);
    btnSeed.addEventListener('click', seedAll);
    btnClear.addEventListener('click', clearAll);

    btnStoreAdd.addEventListener('click', addStore);
    btnStoreSeed.addEventListener('click', storeSeed);

    btnExport.addEventListener('click', exportJson);
    fileImport.addEventListener('change', function(e){
      var file = e.target.files && e.target.files[0];
      handleImportFile(file);
      e.target.value = '';
    });
    btnPasteToggle.addEventListener('click', togglePaste);
    btnPasteImport.addEventListener('click', pasteImport);
    btnPasteClear.addEventListener('click', pasteClear);

    [fName, fPrice, fNote].forEach(function(el){
      el.addEventListener('keydown', function(e){
        if (e.key === 'Enter') { e.preventDefault(); addPurchase(); }
      });
    });
    [sName, sNote].forEach(function(el){
      el.addEventListener('keydown', function(e){
        if (e.key === 'Enter') { e.preventDefault(); addStore(); }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
