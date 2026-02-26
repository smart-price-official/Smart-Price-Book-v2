'use strict';
/*
APP: Smart Price
VERSION: v0.3.1
DATE(JST): 2026-02-26 23:33 JST
TITLE: SAFE MODE 最小構成（C：JSON退避）
AUTHOR: ChatGPT_Yui
CHANGES:
- エクスポートが効かない問題の対策：app.js/app.css に ?b=... を付与してキャッシュ回避
- ボタンを type=button に固定（意図しない送信/リロード防止）
- C（JSONエクスポート/インポート）を継続（保存キー同一でデータ引継ぎ）
- debug=1 の診断は従来通り
BUILD_PARAM: ?b=2026-02-26_2333_safemode-c_fixcache
DEBUG_PARAM: &debug=1
POLICY: SAFE MODE / 最小構成 / 外部依存なし
*/

(function(){
  var APP = {
    NAME: 'Smart Price',
    VERSION: 'v0.3.1',
    AUTHOR: 'ChatGPT_Yui',
    TITLE: 'SAFE MODE 最小構成（C：JSON退避）'
  };
  var STORAGE_KEY = 'sp_safemode_purchases_v1';

  var params = new URLSearchParams(location.search);
  var BUILD = (params.get('b') || 'no-b').trim();
  var DEBUG = (params.get('debug') === '1');
  var FULL_VERSION = APP.VERSION + ' [' + BUILD + ']';

  var elAppVersion = document.getElementById('vAppVersion');
  var elBuild = document.getElementById('vBuild');
  var elTbody = document.getElementById('purchaseTbody');
  var elEmpty = document.getElementById('emptyState');
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

  var btnExport = document.getElementById('btnExport');
  var fileImport = document.getElementById('fileImport');
  var btnPasteToggle = document.getElementById('btnPasteToggle');
  var pasteBox = document.getElementById('pasteBox');
  var pasteText = document.getElementById('pasteText');
  var btnPasteImport = document.getElementById('btnPasteImport');
  var btnPasteClear = document.getElementById('btnPasteClear');

  var elDebugPanel = document.getElementById('debugPanel');
  var elFullVersion = document.getElementById('vFullVersion');
  var elStorageKey = document.getElementById('vStorageKey');
  var elStorageCount = document.getElementById('vStorageCount');
  var elLastExport = document.getElementById('vLastExport');
  var elLastImport = document.getElementById('vLastImport');
  var elUrl = document.getElementById('vUrl');
  var elUa = document.getElementById('vUa');
  var elNow = document.getElementById('vNow');
  var elDiagText = document.getElementById('diagText');
  var btnCopyDiag = document.getElementById('btnCopyDiag');

  var purchases = [];
  var lastExportAt = '';
  var lastImportAt = '';

  function todayISO(){
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth()+1).padStart(2,'0');
    var dd = String(d.getDate()).padStart(2,'0');
    return yyyy + '-' + mm + '-' + dd;
  }

  function yen(n){
    var x = Number(n);
    if (!Number.isFinite(x)) return '-';
    return x.toLocaleString('ja-JP') + '円';
  }

  function setStatus(msg){ elStatus.textContent = msg || ''; }

  function safeParse(json){ try { return JSON.parse(json); } catch (e) { return null; } }

  function validateRow(r){
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

  function sortPurchasesDesc(){
    purchases.sort(function(a,b){
      if (a.date !== b.date) return (a.date < b.date) ? 1 : -1;
      return (a.id < b.id) ? 1 : -1;
    });
  }

  function render(){
    elTbody.innerHTML = '';
    if (!purchases || purchases.length === 0) {
      elEmpty.hidden = false;
      return;
    }
    elEmpty.hidden = true;

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
    elTbody.appendChild(frag);
  }

  function loadFromStorage(){
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    var parsed = safeParse(raw);
    if (!Array.isArray(parsed)) return [];
    var list = [];
    for (var i=0; i<parsed.length; i++) {
      var v = validateRow(parsed[i]);
      if (v) list.push(v);
    }
    return list;
  }

  function saveToStorage(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
  }

  function getSeed(){
    return [
      { id:'p-001', date:'2026-02-25', store:'カスミ', name:'牛乳 1L', price:238, qty:1, note:'SAFE MODE ダミー' },
      { id:'p-002', date:'2026-02-26', store:'ヨークベニマル', name:'食パン 6枚', price:178, qty:1, note:'' },
      { id:'p-003', date:'2026-02-26', store:'ドラッグストア', name:'シャンプー 詰替', price:598, qty:1, note:'値上がり確認' }
    ];
  }

  function buildExportPayload(){
    return {
      app: APP.NAME,
      version: APP.VERSION,
      build: BUILD,
      exportedAt: new Date().toISOString(),
      storageKey: STORAGE_KEY,
      purchases: purchases
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
    setStatus('エクスポートしました（' + purchases.length + '件）');
    updateDebug();
  }

  function normalizeImportData(obj){
    if (Array.isArray(obj)) return obj;
    if (obj && typeof obj === 'object' && Array.isArray(obj.purchases)) return obj.purchases;
    return null;
  }

  function confirmReplace(count) {
    return confirm('インポートすると現在のデータを置き換えます。\n読み込み件数：' + count + '件\nよろしいですか？');
  }

  function importFromObject(obj){
    var arr = normalizeImportData(obj);
    if (!arr) return (setStatus('インポート失敗：形式が不正です'), false);
    var list = [];
    for (var i=0; i<arr.length; i++) {
      var v = validateRow(arr[i]);
      if (v) list.push(v);
    }
    purchases = list;
    sortPurchasesDesc();
    saveToStorage();
    render();
    lastImportAt = new Date().toISOString();
    setStatus('インポートしました（' + purchases.length + '件）');
    updateDebug();
    return true;
  }

  function importJsonText(text){
    var obj = safeParse(text);
    if (!obj) return setStatus('インポート失敗：JSONが壊れています');
    var arr = normalizeImportData(obj);
    if (!arr) return setStatus('インポート失敗：形式が不正です');
    if (!confirmReplace(arr.length)) return;
    importFromObject(obj);
  }

  function handleImportFile(file){
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      var text = String(reader.result || '');
      var obj = safeParse(text);
      if (!obj) return setStatus('インポート失敗：JSONが壊れています');
      var arr = normalizeImportData(obj);
      if (!arr) return setStatus('インポート失敗：形式が不正です');
      if (!confirmReplace(arr.length)) return;
      importFromObject(obj);
    };
    reader.onerror = function(){ setStatus('インポート失敗：ファイル読込に失敗しました'); };
    reader.readAsText(file);
  }

  function buildDiagText(){
    var now = new Date();
    var lines = [];
    lines.push('【Smart Price SAFE MODE 診断ログ】');
    lines.push('VERSION: ' + APP.VERSION);
    lines.push('BUILD(b): ' + BUILD);
    lines.push('FULL: ' + FULL_VERSION);
    lines.push('STORAGE_KEY: ' + STORAGE_KEY);
    lines.push('STORAGE_COUNT: ' + String(purchases.length));
    lines.push('LAST_EXPORT: ' + (lastExportAt || '-'));
    lines.push('LAST_IMPORT: ' + (lastImportAt || '-'));
    lines.push('URL: ' + location.href);
    lines.push('UA: ' + navigator.userAgent);
    lines.push('NOW: ' + now.toISOString());
    lines.push('');
    lines.push('POLICY: SW/Cache/APIなし（SAFE MODE）');
    return lines.join('\n');
  }

  function updateDebug(){
    if (!DEBUG) return;
    elFullVersion.textContent = FULL_VERSION;
    elStorageKey.textContent = STORAGE_KEY;
    elStorageCount.textContent = String(purchases.length);
    elLastExport.textContent = lastExportAt || '-';
    elLastImport.textContent = lastImportAt || '-';
    elUrl.textContent = location.href;
    elUa.textContent = navigator.userAgent;
    elNow.textContent = new Date().toISOString();
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

  function addPurchase(){
    var date = (fDate.value || '').trim();
    var store = (fStore.value || '').trim();
    var name = (fName.value || '').trim();
    var price = Number((fPrice.value || '').trim());
    var qty = Number((fQty.value || '').trim());
    var note = (fNote.value || '').trim();

    if (!date) return setStatus('日付が未入力です');
    if (!store) return setStatus('店が未入力です');
    if (!name) return setStatus('商品が未入力です');
    if (!Number.isFinite(price) || price < 0) return setStatus('価格が不正です');
    if (!Number.isFinite(qty) || qty <= 0) return setStatus('個数が不正です');

    var id = 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6);
    purchases.push({ id:id, date:date, store:store, name:name, price:price, qty:qty, note:note });
    sortPurchasesDesc();
    saveToStorage();
    render();
    updateDebug();

    fName.value = '';
    fPrice.value = '';
    fNote.value = '';
    fName.focus();

    setStatus('保存しました（' + STORAGE_KEY + ': ' + purchases.length + '件）');
  }

  function seedPurchases(){
    if (!confirm('ダミーデータを投入して保存します。よろしいですか？')) return;
    purchases = getSeed();
    sortPurchasesDesc();
    saveToStorage();
    render();
    updateDebug();
    setStatus('ダミーを保存しました（' + purchases.length + '件）');
  }

  function clearAll(){
    if (!confirm('全消去します。端末内の保存も消えます。よろしいですか？')) return;
    purchases = [];
    localStorage.removeItem(STORAGE_KEY);
    render();
    updateDebug();
    setStatus('全消去しました');
  }

  function togglePaste(){
    pasteBox.hidden = !pasteBox.hidden;
    if (!pasteBox.hidden) pasteText.focus();
  }

  function pasteImport(){
    var text = (pasteText.value || '').trim();
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

    purchases = loadFromStorage();
    sortPurchasesDesc();
    render();

    if (DEBUG){
      elDebugPanel.hidden = false;
      btnCopyDiag.addEventListener('click', copyDiag);
    }

    updateDebug();
    setStatus('読込完了（' + purchases.length + '件）');

    btnAdd.addEventListener('click', addPurchase);
    btnSeed.addEventListener('click', seedPurchases);
    btnClear.addEventListener('click', clearAll);

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
        if (e.key === 'Enter') {
          e.preventDefault();
          addPurchase();
        }
      });
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
