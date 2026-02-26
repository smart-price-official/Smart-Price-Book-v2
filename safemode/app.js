'use strict';
/*
APP: Smart Price
VERSION: v0.5.0
DATE(JST): 2026-02-27 01:10 JST
TITLE: SAFE MODE 最小構成（E：商品マスター）
AUTHOR: ChatGPT_Yui
CHANGES:
- D（店マスター）をベースに「商品マスター（よく買う品）」を追加
- 商品の追加/削除/一覧（チップ）＋ドロップダウン選択で商品入力を補助
- JSONエクスポート/インポートに products を追加（無ければ既存products維持）
- debug=1診断に PRODUCT_COUNT を追加
BUILD_PARAM: ?b=2026-02-27_0110_safemode-e_products
DEBUG_PARAM: &debug=1
POLICY: SAFE MODE / 最小構成 / 外部依存なし
*/

(function(){
  var APP = { NAME: 'Smart Price', VERSION: 'v0.5.0', AUTHOR: 'ChatGPT_Yui', TITLE: 'SAFE MODE 最小構成（E：商品マスター）' };
  var PURCHASE_KEY = 'sp_safemode_purchases_v1';
  var STORE_KEY = 'sp_safemode_stores_v1';
  var PRODUCT_KEY = 'sp_safemode_products_v1';

  var params = new URLSearchParams(location.search);
  var BUILD = (params.get('b') || 'no-b').trim();
  var DEBUG = (params.get('debug') === '1');
  var FULL_VERSION = APP.VERSION + ' [' + BUILD + ']';

  // ---- DOM
  var elAppVersion = document.getElementById('vAppVersion');
  var elBuild = document.getElementById('vBuild');
  var elTbody = document.getElementById('purchaseTbody');
  var elEmpty = document.getElementById('emptyState');
  var elStatus = document.getElementById('statusText');

  // store master
  var fNewStoreName = document.getElementById('fNewStoreName');
  var fNewStoreNote = document.getElementById('fNewStoreNote');
  var btnAddStore = document.getElementById('btnAddStore');
  var selStore = document.getElementById('selStore');
  var storeChips = document.getElementById('storeChips');
  var storeTbody = document.getElementById('storeTbody');
  var storeDatalist = document.getElementById('storeDatalist');

  // product master
  var fNewProductName = document.getElementById('fNewProductName');
  var fNewProductCat = document.getElementById('fNewProductCat');
  var btnAddProduct = document.getElementById('btnAddProduct');
  var selProduct = document.getElementById('selProduct');
  var productChips = document.getElementById('productChips');
  var productTbody = document.getElementById('productTbody');
  var productDatalist = document.getElementById('productDatalist');

  // purchase form
  var fDate = document.getElementById('fDate');
  var fStore = document.getElementById('fStore');
  var fName = document.getElementById('fName');
  var fPrice = document.getElementById('fPrice');
  var fQty = document.getElementById('fQty');
  var fNote = document.getElementById('fNote');

  var btnAdd = document.getElementById('btnAdd');
  var btnSeed = document.getElementById('btnSeed');
  var btnClear = document.getElementById('btnClear');

  // export/import
  var btnExport = document.getElementById('btnExport');
  var fileImport = document.getElementById('fileImport');
  var btnPasteToggle = document.getElementById('btnPasteToggle');
  var pasteBox = document.getElementById('pasteBox');
  var pasteText = document.getElementById('pasteText');
  var btnPasteImport = document.getElementById('btnPasteImport');
  var btnPasteClear = document.getElementById('btnPasteClear');

  // debug
  var elDebugPanel = document.getElementById('debugPanel');
  var elFullVersion = document.getElementById('vFullVersion');
  var elPurchaseKey = document.getElementById('vPurchaseKey');
  var elStoreKey = document.getElementById('vStoreKey');
  var elProductKey = document.getElementById('vProductKey');
  var elPurchaseCount = document.getElementById('vPurchaseCount');
  var elStoreCount = document.getElementById('vStoreCount');
  var elProductCount = document.getElementById('vProductCount');
  var elLastExport = document.getElementById('vLastExport');
  var elLastImport = document.getElementById('vLastImport');
  var elUrl = document.getElementById('vUrl');
  var elUa = document.getElementById('vUa');
  var elNow = document.getElementById('vNow');
  var elDiagText = document.getElementById('diagText');
  var btnCopyDiag = document.getElementById('btnCopyDiag');

  // ---- state
  var purchases = [];
  var stores = [];   // id,name,note
  var products = []; // id,name,cat
  var lastExportAt = '';
  var lastImportAt = '';

  // ---- utils
  function todayISO(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function yen(n){
    var x = Number(n);
    if (!Number.isFinite(x)) return '-';
    return x.toLocaleString('ja-JP') + '円';
  }
  function setStatus(msg){ elStatus.textContent = msg || ''; }
  function safeParse(json){ try { return JSON.parse(json); } catch (e) { return null; } }
  function norm(s){ return String(s||'').trim(); }
  function normKey(s){ return norm(s).toLowerCase(); }

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
    var name = norm(r.name);
    if (!name) return null;
    return {
      id: String(r.id || ('s-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6))),
      name: name,
      note: norm(r.note)
    };
  }

  function validateProduct(r){
    if (!r || typeof r !== 'object') return null;
    var name = norm(r.name);
    if (!name) return null;
    return {
      id: String(r.id || ('g-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6))),
      name: name,
      cat: norm(r.cat)
    };
  }

  function sortPurchasesDesc(){
    purchases.sort(function(a,b){
      if (a.date !== b.date) return (a.date < b.date) ? 1 : -1;
      return (a.id < b.id) ? 1 : -1;
    });
  }

  function sortByName(list){
    list.sort(function(a,b){
      var A = normKey(a.name), B = normKey(b.name);
      if (A < B) return -1;
      if (A > B) return 1;
      return 0;
    });
  }

  // ---- render purchases
  function renderPurchases(){
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

  // ---- store pickers
  function rebuildStorePickers(){
    selStore.innerHTML = '<option value="">（選ぶと「店」に入ります）</option>';
    storeChips.innerHTML = '';
    storeTbody.innerHTML = '';
    storeDatalist.innerHTML = '';

    if (!stores || stores.length === 0) return;

    var fragChip = document.createDocumentFragment();
    var fragTable = document.createDocumentFragment();
    var fragDl = document.createDocumentFragment();

    for (var i=0; i<stores.length; i++) {
      var s = stores[i];

      var opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      selStore.appendChild(opt);

      var chip = document.createElement('div');
      chip.className = 'chip';
      chip.title = 'クリックで「店」に入ります';
      chip.dataset.id = s.id;
      chip.appendChild(document.createTextNode(s.name));

      var x = document.createElement('button');
      x.className = 'chip__x';
      x.type = 'button';
      x.textContent = '×';
      x.title = '削除';
      x.dataset.id = s.id;
      chip.appendChild(x);

      chip.addEventListener('click', function(e){
        if (e.target && e.target.classList && e.target.classList.contains('chip__x')) return;
        var id = this.dataset.id;
        var found = stores.find(function(t){ return t.id === id; });
        if (found) {
          fStore.value = found.name;
          setStatus('店を入力しました：' + found.name);
        }
      });

      x.addEventListener('click', function(e){
        e.stopPropagation();
        deleteStore(this.dataset.id);
      });

      fragChip.appendChild(chip);

      var tr = document.createElement('tr');
      var tdN = document.createElement('td'); tdN.textContent = s.name; tr.appendChild(tdN);
      var tdNote = document.createElement('td'); tdNote.textContent = s.note || ''; tr.appendChild(tdNote);
      var tdAct = document.createElement('td'); tdAct.className = 'miniAct';
      var btn = document.createElement('button');
      btn.className = 'miniBtn'; btn.type = 'button'; btn.textContent = '削除';
      btn.dataset.id = s.id;
      btn.addEventListener('click', function(){ deleteStore(this.dataset.id); });
      tdAct.appendChild(btn);
      tr.appendChild(tdAct);
      fragTable.appendChild(tr);

      var o = document.createElement('option');
      o.value = s.name;
      fragDl.appendChild(o);
    }

    storeChips.appendChild(fragChip);
    storeTbody.appendChild(fragTable);
    storeDatalist.appendChild(fragDl);
  }

  // ---- product pickers
  function rebuildProductPickers(){
    selProduct.innerHTML = '<option value="">（選ぶと「商品」に入ります）</option>';
    productChips.innerHTML = '';
    productTbody.innerHTML = '';
    productDatalist.innerHTML = '';

    if (!products || products.length === 0) return;

    var fragChip = document.createDocumentFragment();
    var fragTable = document.createDocumentFragment();
    var fragDl = document.createDocumentFragment();

    for (var i=0; i<products.length; i++) {
      var p = products[i];

      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      selProduct.appendChild(opt);

      var chip = document.createElement('div');
      chip.className = 'chip';
      chip.title = 'クリックで「商品」に入ります';
      chip.dataset.id = p.id;
      chip.appendChild(document.createTextNode(p.name));

      var x = document.createElement('button');
      x.className = 'chip__x';
      x.type = 'button';
      x.textContent = '×';
      x.title = '削除';
      x.dataset.id = p.id;
      chip.appendChild(x);

      chip.addEventListener('click', function(e){
        if (e.target && e.target.classList && e.target.classList.contains('chip__x')) return;
        var id = this.dataset.id;
        var found = products.find(function(t){ return t.id === id; });
        if (found) {
          fName.value = found.name;
          setStatus('商品を入力しました：' + found.name);
        }
      });

      x.addEventListener('click', function(e){
        e.stopPropagation();
        deleteProduct(this.dataset.id);
      });

      fragChip.appendChild(chip);

      var tr = document.createElement('tr');
      var tdN = document.createElement('td'); tdN.textContent = p.name; tr.appendChild(tdN);
      var tdC = document.createElement('td'); tdC.textContent = p.cat || ''; tr.appendChild(tdC);
      var tdAct = document.createElement('td'); tdAct.className = 'miniAct';
      var btn = document.createElement('button');
      btn.className = 'miniBtn'; btn.type = 'button'; btn.textContent = '削除';
      btn.dataset.id = p.id;
      btn.addEventListener('click', function(){ deleteProduct(this.dataset.id); });
      tdAct.appendChild(btn);
      tr.appendChild(tdAct);
      fragTable.appendChild(tr);

      var o = document.createElement('option');
      o.value = p.name;
      fragDl.appendChild(o);
    }

    productChips.appendChild(fragChip);
    productTbody.appendChild(fragTable);
    productDatalist.appendChild(fragDl);
  }

  // ---- storage
  function loadList(key, validator){
    var raw = localStorage.getItem(key);
    if (!raw) return [];
    var parsed = safeParse(raw);
    if (!Array.isArray(parsed)) return [];
    var list = [];
    for (var i=0; i<parsed.length; i++) {
      var v = validator(parsed[i]);
      if (v) list.push(v);
    }
    return list;
  }

  function saveAll(){
    localStorage.setItem(PURCHASE_KEY, JSON.stringify(purchases));
    localStorage.setItem(STORE_KEY, JSON.stringify(stores));
    localStorage.setItem(PRODUCT_KEY, JSON.stringify(products));
  }

  // ---- store actions
  function addStore(){
    var name = norm(fNewStoreName.value);
    var note = norm(fNewStoreNote.value);
    if (!name) return setStatus('店名が未入力です');

    var k = normKey(name);
    var exists = stores.some(function(s){ return normKey(s.name) === k; });
    if (exists) return setStatus('同じ店名がすでにあります');

    stores.push({ id: 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6), name: name, note: note });
    sortByName(stores);
    saveAll();
    rebuildStorePickers();
    updateDebug();
    setStatus('店を追加しました（' + stores.length + '件）');

    fNewStoreName.value = '';
    fNewStoreNote.value = '';
    fNewStoreName.focus();
  }

  function deleteStore(id){
    var s = stores.find(function(x){ return x.id === id; });
    if (!s) return;
    if (!confirm('店を削除します：' + s.name + '\nよろしいですか？')) return;
    stores = stores.filter(function(x){ return x.id !== id; });
    saveAll();
    rebuildStorePickers();
    updateDebug();
    setStatus('店を削除しました（' + stores.length + '件）');
  }

  // ---- product actions
  function addProduct(){
    var name = norm(fNewProductName.value);
    var cat = norm(fNewProductCat.value);
    if (!name) return setStatus('商品名が未入力です');

    var k = normKey(name);
    var exists = products.some(function(p){ return normKey(p.name) === k; });
    if (exists) return setStatus('同じ商品名がすでにあります');

    products.push({ id: 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6), name: name, cat: cat });
    sortByName(products);
    saveAll();
    rebuildProductPickers();
    updateDebug();
    setStatus('商品を追加しました（' + products.length + '件）');

    fNewProductName.value = '';
    fNewProductCat.value = '';
    fNewProductName.focus();
  }

  function deleteProduct(id){
    var p = products.find(function(x){ return x.id === id; });
    if (!p) return;
    if (!confirm('商品を削除します：' + p.name + '\nよろしいですか？')) return;
    products = products.filter(function(x){ return x.id !== id; });
    saveAll();
    rebuildProductPickers();
    updateDebug();
    setStatus('商品を削除しました（' + products.length + '件）');
  }

  // ---- purchase actions
  function addPurchase(){
    var date = norm(fDate.value);
    var store = norm(fStore.value);
    var name = norm(fName.value);
    var price = Number(norm(fPrice.value));
    var qty = Number(norm(fQty.value));
    var note = norm(fNote.value);

    if (!date) return setStatus('日付が未入力です');
    if (!store) return setStatus('店が未入力です');
    if (!name) return setStatus('商品が未入力です');
    if (!Number.isFinite(price) || price < 0) return setStatus('価格が不正です');
    if (!Number.isFinite(qty) || qty <= 0) return setStatus('個数が不正です');

    var id = 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6);
    purchases.push({ id:id, date:date, store:store, name:name, price:price, qty:qty, note:note });
    sortPurchasesDesc();
    saveAll();
    renderPurchases();
    updateDebug();

    fName.value = '';
    fPrice.value = '';
    fNote.value = '';
    fName.focus();

    setStatus('保存しました（購入 ' + purchases.length + '件）');
  }

  function seedAll(){
    if (!confirm('ダミーデータを投入して保存します。\n購入＋店＋商品 を入れます。よろしいですか？')) return;

    purchases = [
      { id:'r-001', date:'2026-02-25', store:'カスミ', name:'牛乳 1L', price:238, qty:1, note:'SAFE MODE ダミー' },
      { id:'r-002', date:'2026-02-26', store:'ヨークベニマル', name:'食パン 6枚', price:178, qty:1, note:'' },
      { id:'r-003', date:'2026-02-26', store:'ドラッグストア', name:'シャンプー 詰替', price:598, qty:1, note:'値上がり確認' }
    ].map(validatePurchase).filter(Boolean);

    stores = [
      { id:'s-001', name:'カスミ', note:'よく行く' },
      { id:'s-002', name:'ヨークベニマル', note:'' },
      { id:'s-003', name:'ドラッグストア', note:'日用品' }
    ].map(validateStore).filter(Boolean);

    products = [
      { id:'g-001', name:'牛乳 1L', cat:'食品' },
      { id:'g-002', name:'食パン 6枚', cat:'食品' },
      { id:'g-003', name:'シャンプー 詰替', cat:'日用品' }
    ].map(validateProduct).filter(Boolean);

    sortPurchasesDesc();
    sortByName(stores);
    sortByName(products);
    saveAll();

    renderPurchases();
    rebuildStorePickers();
    rebuildProductPickers();
    updateDebug();
    setStatus('ダミー投入完了（購入 ' + purchases.length + '／店 ' + stores.length + '／商品 ' + products.length + '）');
  }

  function clearAll(){
    if (!confirm('全消去します。\n購入・店・商品 の保存も消えます。\nよろしいですか？')) return;
    purchases = [];
    stores = [];
    products = [];
    localStorage.removeItem(PURCHASE_KEY);
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(PRODUCT_KEY);
    renderPurchases();
    rebuildStorePickers();
    rebuildProductPickers();
    updateDebug();
    setStatus('全消去しました');
  }

  // ---- export/import
  function buildExportPayload(){
    return {
      app: APP.NAME,
      version: APP.VERSION,
      build: BUILD,
      exportedAt: new Date().toISOString(),
      keys: { purchases: PURCHASE_KEY, stores: STORE_KEY, products: PRODUCT_KEY },
      purchases: purchases,
      stores: stores,
      products: products
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
    setStatus('エクスポートしました（購入 ' + purchases.length + '／店 ' + stores.length + '／商品 ' + products.length + '）');
    updateDebug();
  }

  function normalizeArray(obj, field){
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj[field])) return obj[field];
    return null;
  }

  function confirmReplace(pc, sc, gc, hasS, hasP){
    var msg = 'インポートすると現在のデータを置き換えます。\n';
    msg += '購入：' + pc + '件\n';
    msg += '店：' + (hasS ? (sc + '件（置換）') : '（このJSONに無い → そのまま）') + '\n';
    msg += '商品：' + (hasP ? (gc + '件（置換）') : '（このJSONに無い → そのまま）') + '\n';
    msg += 'よろしいですか？';
    return confirm(msg);
  }

  function importFromObject(obj){
    var purchaseArr = Array.isArray(obj) ? obj : (Array.isArray(obj.purchases) ? obj.purchases : null);
    if (!purchaseArr) {
      setStatus('インポート失敗：purchases が見つかりません');
      return false;
    }

    var storeArr = Array.isArray(obj) ? null : normalizeArray(obj, 'stores');
    var prodArr  = Array.isArray(obj) ? null : normalizeArray(obj, 'products');

    var pList = purchaseArr.map(validatePurchase).filter(Boolean);
    var sList = storeArr ? storeArr.map(validateStore).filter(Boolean) : null;
    var gList = prodArr  ? prodArr.map(validateProduct).filter(Boolean) : null;

    if (!confirmReplace(pList.length, (sList? sList.length: stores.length), (gList? gList.length: products.length), !!sList, !!gList)) return false;

    purchases = pList;
    if (sList) stores = sList;
    if (gList) products = gList;

    sortPurchasesDesc();
    sortByName(stores);
    sortByName(products);
    saveAll();

    renderPurchases();
    rebuildStorePickers();
    rebuildProductPickers();

    lastImportAt = new Date().toISOString();
    setStatus('インポートしました（購入 ' + purchases.length + '／店 ' + stores.length + '／商品 ' + products.length + '）');
    updateDebug();
    return true;
  }

  function importJsonText(text){
    var obj = safeParse(text);
    if (!obj) return setStatus('インポート失敗：JSONが壊れています');
    importFromObject(obj);
  }

  function handleImportFile(file){
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      var text = String(reader.result || '');
      importJsonText(text);
    };
    reader.onerror = function(){ setStatus('インポート失敗：ファイル読込に失敗しました'); };
    reader.readAsText(file);
  }

  function togglePaste(){
    pasteBox.hidden = !pasteBox.hidden;
    if (!pasteBox.hidden) pasteText.focus();
  }
  function pasteImport(){
    var text = norm(pasteText.value);
    if (!text) return setStatus('貼り付けが空です');
    importJsonText(text);
  }
  function pasteClear(){
    pasteText.value = '';
    setStatus('貼り付けを消しました');
  }

  // ---- debug
  function buildDiagText(){
    var now = new Date();
    var lines = [];
    lines.push('【Smart Price SAFE MODE 診断ログ】');
    lines.push('VERSION: ' + APP.VERSION);
    lines.push('BUILD(b): ' + BUILD);
    lines.push('FULL: ' + FULL_VERSION);
    lines.push('PURCHASE_KEY: ' + PURCHASE_KEY);
    lines.push('STORE_KEY: ' + STORE_KEY);
    lines.push('PRODUCT_KEY: ' + PRODUCT_KEY);
    lines.push('PURCHASE_COUNT: ' + purchases.length);
    lines.push('STORE_COUNT: ' + stores.length);
    lines.push('PRODUCT_COUNT: ' + products.length);
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
    elPurchaseKey.textContent = PURCHASE_KEY;
    elStoreKey.textContent = STORE_KEY;
    elProductKey.textContent = PRODUCT_KEY;
    elPurchaseCount.textContent = String(purchases.length);
    elStoreCount.textContent = String(stores.length);
    elProductCount.textContent = String(products.length);
    elLastExport.textContent = lastExportAt || '-';
    elLastImport.textContent = lastImportAt || '-';
    elUrl.textContent = location.href;
    elUa.textContent = navigator.userAgent;
    elNow.textContent = new Date().toISOString();
    elDiagText.textContent = buildDiagText();
  }

  function copyDiag(){
    var text = buildDiagText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
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

  // ---- init
  function init(){
    elAppVersion.textContent = APP.VERSION;
    elBuild.textContent = BUILD;
    fDate.value = todayISO();

    purchases = loadList(PURCHASE_KEY, validatePurchase);
    stores = loadList(STORE_KEY, validateStore);
    products = loadList(PRODUCT_KEY, validateProduct);

    sortPurchasesDesc();
    sortByName(stores);
    sortByName(products);

    renderPurchases();
    rebuildStorePickers();
    rebuildProductPickers();

    if (DEBUG) {
      elDebugPanel.hidden = false;
      btnCopyDiag.addEventListener('click', copyDiag);
    }
    updateDebug();
    setStatus('読込完了（購入 ' + purchases.length + '／店 ' + stores.length + '／商品 ' + products.length + '）');

    btnAddStore.addEventListener('click', addStore);
    selStore.addEventListener('change', function(){
      var id = selStore.value;
      var found = stores.find(function(s){ return s.id === id; });
      if (found) {
        fStore.value = found.name;
        setStatus('店を入力しました：' + found.name);
      }
      selStore.value = '';
    });

    btnAddProduct.addEventListener('click', addProduct);
    selProduct.addEventListener('change', function(){
      var id = selProduct.value;
      var found = products.find(function(p){ return p.id === id; });
      if (found) {
        fName.value = found.name;
        setStatus('商品を入力しました：' + found.name);
      }
      selProduct.value = '';
    });

    btnAdd.addEventListener('click', addPurchase);
    btnSeed.addEventListener('click', seedAll);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
