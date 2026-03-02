'use strict';
/*
APP: Smart Price
VERSION: v0.7.8
DATE(JST): 2026-02-27 12:10 JST
TITLE: SAFE MODE 最小構成（H：分類別集計）
AUTHOR: ChatGPT_Yui
BUILD_PARAM: ?b=2026-03-02_2054_safemode-j_modal_probe_deleg
DEBUG_PARAM: &debug=1
POLICY: SAFE MODE / 最小構成 / 外部依存なし
*/
(function(){
  // v0.7.7: early placeholders (prevent TypeError/ReferenceError)
  try{
    if(typeof window.openEditPurchase!=='function') window.openEditPurchase=function(){ };
    if(typeof window.openEditStore!=='function') window.openEditStore=function(){ };
    if(typeof window.openEditProduct!=='function') window.openEditProduct=function(){ };
  }catch(e){}
  var APP={NAME:'Smart Price',VERSION:'v0.7.8',AUTHOR:'ChatGPT_Yui',TITLE:'SAFE MODE 最小構成（H：分類別集計）'};
  var META_KEY='sp_safemode_meta_v1';
  var PURCHASE_KEY='sp_safemode_purchases_v1', STORE_KEY='sp_safemode_stores_v1', PRODUCT_KEY='sp_safemode_products_v1';
  var params=new URLSearchParams(location.search);
  var BUILD=(params.get('b')||'no-b').trim();
  var DEBUG=(params.get('debug')==='1');
  var FULL=APP.VERSION+' ['+BUILD+']';
  var JS_BUILD='2026-03-02_2054_safemode-j_modal_probe_deleg';

  // v0.7.5: capture runtime errors for report (no DevTools needed)
  var __lastError = '';
  window.addEventListener('error', function(ev){
    try{
      var msg = (ev && ev.message) ? String(ev.message) : 'error';
      var src = (ev && ev.filename) ? String(ev.filename).split('/').slice(-1)[0] : '';
      var ln  = (ev && ev.lineno) ? String(ev.lineno) : '';
      __lastError = msg + (src?(' @'+src+':'+ln):'');
      setStatus('エラー検出：'+msg);
      updateDebug();
    }catch(e){}
  });

  document.getElementById('vAppVersion').textContent=APP.VERSION;
  document.getElementById('vBuild').textContent=BUILD;

  var elTbody=document.getElementById('purchaseTbody');
  var elEmpty=document.getElementById('emptyState');
  var elStatus=document.getElementById('statusText');

  var statTodayTotal=document.getElementById('statTodayTotal');
  var statTodayCount=document.getElementById('statTodayCount');
  var statMonthTotal=document.getElementById('statMonthTotal');
  var statMonthCount=document.getElementById('statMonthCount');
  var statAllCount=document.getElementById('statAllCount');
  var storeTotalTbody=document.getElementById('storeTotalTbody');
  var catTotalTbody=document.getElementById('catTotalTbody');

  var fNewStoreName=document.getElementById('fNewStoreName');
  var fNewStoreNote=document.getElementById('fNewStoreNote');
  var btnAddStore=document.getElementById('btnAddStore');
  var selStore=document.getElementById('selStore');
  var storeChips=document.getElementById('storeChips');
  var storeTbody=document.getElementById('storeTbody');
  var storeDatalist=document.getElementById('storeDatalist');

  var fNewProductName=document.getElementById('fNewProductName');
  var fNewProductCat=document.getElementById('fNewProductCat');
  var btnAddProduct=document.getElementById('btnAddProduct');
  var selProduct=document.getElementById('selProduct');
  var productChips=document.getElementById('productChips');
  var productTbody=document.getElementById('productTbody');
  var productDatalist=document.getElementById('productDatalist');

  var fDate=document.getElementById('fDate');
  var fStore=document.getElementById('fStore');
  var fName=document.getElementById('fName');
  var fPrice=document.getElementById('fPrice');
  var fQty=document.getElementById('fQty');
  var fNote=document.getElementById('fNote');

  var btnAdd=document.getElementById('btnAdd');
  var btnSeed=document.getElementById('btnSeed');
  var btnClear=document.getElementById('btnClear');

  var btnExport=document.getElementById('btnExport');
  var fileImport=document.getElementById('fileImport');
  var btnPasteToggle=document.getElementById('btnPasteToggle');
  var pasteBox=document.getElementById('pasteBox');
  var pasteText=document.getElementById('pasteText');
  var btnPasteImport=document.getElementById('btnPasteImport');
  var btnPasteClear=document.getElementById('btnPasteClear');

  // v0.7.0: edit modal (安全な削除)
  var editModal = document.getElementById('editModal');
  var editBackdrop = document.getElementById('editBackdrop');
  var btnEditClose = document.getElementById('btnEditClose');
  var editTitle = document.getElementById('editTitle');
  var editHint = document.getElementById('editHint');

  var eDate = document.getElementById('eDate');
  var eStore = document.getElementById('eStore');
  var eName = document.getElementById('eName');
  var ePrice = document.getElementById('ePrice');
  var eQty = document.getElementById('eQty');
  var eNote = document.getElementById('eNote');

  var eMasterName = document.getElementById('eMasterName');
  var eMasterMeta = document.getElementById('eMasterMeta');

  var editRowDate = document.getElementById('editRowDate');
  var editRowNums = document.getElementById('editRowNums');
  var editRowMaster = document.getElementById('editRowMaster');

  var btnEditSave = document.getElementById('btnEditSave');
  var btnEditDelete = document.getElementById('btnEditDelete');

  var __edit = {type:'', id:''};

  function ensureModalExists(){
    // もし index.html 側が更新されていない等でモーダル要素が無い場合でも、JS側で生成して復旧する
    if(editModal && btnEditClose && btnEditSave && btnEditDelete) try{ editModal.style.zIndex='99999'; editModal.style.position='fixed'; }catch(e){}
    return true;

    var existing = document.getElementById('editModal');
    if(!existing){
      var wrap = document.createElement('div');
      wrap.innerHTML = '<div class="modal" id="editModal" hidden aria-hidden="true">'+
        '<div class="modal__backdrop" id="editBackdrop"></div>'+
        '<div class="modal__panel" role="dialog" aria-modal="true" aria-label="edit panel">'+
          '<div class="modal__head">'+
            '<div class="modal__title" id="editTitle">編集</div>'+
            '<button class="btn btn--sub modal__close" type="button" id="btnEditClose">閉じる</button>'+
          '</div>'+
          '<div class="modal__body">'+
            '<div class="modal__note" id="editHint">-</div>'+
            '<div class="form__row" id="editRowDate">'+
              '<label class="field"><div class="field__k">日付</div><input class="field__v" type="date" id="eDate"></label>'+
              '<label class="field"><div class="field__k">店</div><input class="field__v" type="text" id="eStore" list="storeDatalist"></label>'+
              '<label class="field field--wide"><div class="field__k">商品</div><input class="field__v" type="text" id="eName" list="productDatalist"></label>'+
            '</div>'+
            '<div class="form__row" id="editRowNums">'+
              '<label class="field"><div class="field__k">価格</div><input class="field__v" type="number" id="ePrice" inputmode="numeric"></label>'+
              '<label class="field"><div class="field__k">個数</div><input class="field__v" type="number" id="eQty" inputmode="numeric" min="1"></label>'+
              '<label class="field field--wide"><div class="field__k">メモ</div><input class="field__v" type="text" id="eNote"></label>'+
            '</div>'+
            '<div class="form__row" id="editRowMaster">'+
              '<label class="field field--wide"><div class="field__k">名前</div><input class="field__v" type="text" id="eMasterName"></label>'+
              '<label class="field field--wide"><div class="field__k">分類/メモ</div><input class="field__v" type="text" id="eMasterMeta"></label>'+
            '</div>'+
          '</div>'+
          '<div class="modal__foot">'+
            '<button class="btn" type="button" id="btnEditSave">保存</button>'+
            '<button class="btn btn--danger" type="button" id="btnEditDelete">削除</button>'+
          '</div>'+
        '</div>'+
      '</div>';
      document.body.appendChild(wrap.firstChild);
    }
  function publishGlobals(){
    try{
      // overwrite with real functions (function declarations are hoisted in this file)
      window.openEditPurchase = openEditPurchase;
      window.openEditStore = openEditStore;
      window.openEditProduct = openEditProduct;
      window.ensureModalExists = ensureModalExists;
    }catch(e){}
  }


    // refs を取り直す（var で宣言済みなので代入のみ）
    editModal = document.getElementById('editModal');
    editBackdrop = document.getElementById('editBackdrop');
    btnEditClose = document.getElementById('btnEditClose');
    editTitle = document.getElementById('editTitle');
    editHint = document.getElementById('editHint');

    eDate = document.getElementById('eDate');
    eStore = document.getElementById('eStore');
    eName = document.getElementById('eName');
    ePrice = document.getElementById('ePrice');
    eQty = document.getElementById('eQty');
    eNote = document.getElementById('eNote');

    eMasterName = document.getElementById('eMasterName');
    eMasterMeta = document.getElementById('eMasterMeta');

    editRowDate = document.getElementById('editRowDate');
    editRowNums = document.getElementById('editRowNums');
    editRowMaster = document.getElementById('editRowMaster');

    btnEditSave = document.getElementById('btnEditSave');
    btnEditDelete = document.getElementById('btnEditDelete');

    if(!editModal || !btnEditClose || !btnEditSave || !btnEditDelete){
      setStatus('編集画面の初期化に失敗しました（ファイル差し替えを確認してください）');
      return false;
    }
    try{ editModal.style.zIndex='99999'; editModal.style.position='fixed'; }catch(e){}
    return true;
  }




  var dbgPanel=document.getElementById('debugPanel');
  var vFull=document.getElementById('vFullVersion');
  var vPurchaseKey=document.getElementById('vPurchaseKey');
  var vStoreKey=document.getElementById('vStoreKey');
  var vProductKey=document.getElementById('vProductKey');
  var vPurchaseCount=document.getElementById('vPurchaseCount');
  var vStoreCount=document.getElementById('vStoreCount');
  var vProductCount=document.getElementById('vProductCount');
  var vCatRows=document.getElementById('vCatRows');
  var vTodayTotal=document.getElementById('vTodayTotal');
  var vMonthTotal=document.getElementById('vMonthTotal');
  var vLastExport=document.getElementById('vLastExport');
  var vLastImport=document.getElementById('vLastImport');
  var vUrl=document.getElementById('vUrl');
  var vUa=document.getElementById('vUa');
  var vNow=document.getElementById('vNow');
  var diagText=document.getElementById('diagText');
  var btnCopyDiag=document.getElementById('btnCopyDiag');
  var btnModalTest=document.getElementById('btnModalTest');

  var purchases=[], stores=[], products=[];
  var lastExportAt='', lastImportAt='';
  var cachedToday=0, cachedMonth=0, cachedCatRows=0;

  function norm(s){return String(s||'').trim();}
  function key(s){return norm(s).toLowerCase();}
  function setStatus(s){elStatus.textContent=s||'';}
  // v0.6.6: ブラウザの alert/confirm を使わない（2回操作で確定）
  var __confirmKey = '';
  var __confirmUntil = 0;
  var __armedEl = null;

  function armVisual(el){
    try{
      if(__armedEl && __armedEl !== el){
        __armedEl.classList.remove('sp-armed');
      }
      __armedEl = el || null;
      if(el){
        el.classList.add('sp-armed');
        setTimeout(function(){ try{ el.classList.remove('sp-armed'); }catch(e){} }, 900);
      }
    }catch(e){}
  }

  function flash(el){
    try{
      el.classList.remove('sp-flash');
      void el.offsetWidth;
      el.classList.add('sp-flash');
      setTimeout(function(){ try{ el.classList.remove('sp-flash'); }catch(e){} }, 320);
    }catch(e){}
  }
  // v0.7.2: dblclick不発の保険（クリック2回で編集）
  var __rowClick = {key:'', t:0};
  function click2Edit(type, id, el, openFn){
    var key = type + ':' + id;
    var now = Date.now();
    if(__rowClick.key === key && (now - __rowClick.t) <= 650){
      __rowClick.key=''; __rowClick.t=0;
      if(openFn){ try{ if(typeof openFn==='function'){ openFn(id); } else { setStatus('編集関数が未初期化です（openFn）'); } }catch(e){ setStatus('編集を開けません（openFn）'); } }
      return;
    }
    __rowClick.key = key;
    __rowClick.t = now;
    try{ flash(el); }catch(e){}
    setStatus('選択しました。もう一度クリックで編集（ダブルクリックでもOK）');
    setTimeout(function(){
  // v0.7.7: early placeholders (prevent TypeError/ReferenceError)
  try{
    if(typeof window.openEditPurchase!=='function') window.openEditPurchase=function(){ };
    if(typeof window.openEditStore!=='function') window.openEditStore=function(){ };
    if(typeof window.openEditProduct!=='function') window.openEditProduct=function(){ };
  }catch(e){}
      if(__rowClick.key === key && (Date.now() - __rowClick.t) > 650){
        __rowClick.key=''; __rowClick.t=0;
      }
    }, 700);
  }



  function requireConfirm(key, message, el){
    var now = Date.now();
    if(__confirmKey === key && now < __confirmUntil){
      __confirmKey = '';
      __confirmUntil = 0;
      return true;
    }
  function openModal(){
    editModal.hidden=false;
    try{ editModal.scrollIntoView({block:'center'}); }catch(e){}
    editModal.setAttribute('aria-hidden','false');
    try{ document.body.style.overflow='hidden'; }catch(e){}
    // focus close button
    setTimeout(function(){ try{ btnEditClose.focus(); }catch(e){} }, 0);
  }
  function closeModal(){
    editModal.hidden=true;
    editModal.setAttribute('aria-hidden','true');
    __edit={type:'',id:''};
    __confirmKey=''; __confirmUntil=0;
    try{ document.body.style.overflow=''; }catch(e){}
  }

  function setEditMode(mode){
    // mode: purchase / store / product
    editRowDate.hidden = (mode!=='purchase');
    editRowNums.hidden = (mode!=='purchase');
    editRowMaster.hidden = (mode==='purchase');
  }

  function fillPurchase(r){
    eDate.value = (r.date||todayISO());
    eStore.value = (r.store||'');
    eName.value  = (r.name||'');
    ePrice.value = (r.price==null? '' : String(r.price));
    eQty.value   = (r.qty==null? '1' : String(r.qty));
    eNote.value  = (r.note||'');
  }

  function openEditPurchase(id){
    setStatus('編集を開きます…');
    if(!ensureModalExists()) return;
    var r = purchases.find(function(x){return x.id===id;});
    if(!r) return;
    __edit={type:'purchase', id:id};
    setEditMode('purchase');
    editTitle.textContent = '購入の編集';
    editHint.textContent = '保存で更新／削除は「削除」ボタンを2回で確定（ブラウザダイアログ無し）';
    fillPurchase(r);
    openModal();
  }

  function openEditStore(id){
    if(!ensureModalExists()) return;
    var s = stores.find(function(x){return x.id===id;});
    if(!s) return;
    __edit={type:'store', id:id};
    setEditMode('store');
    editTitle.textContent = '店の編集';
    editHint.textContent = '保存で更新／削除は「削除」ボタンを2回で確定';
    eMasterName.value = s.name||'';
    eMasterMeta.value = s.note||'';
    openModal();
  }

  function openEditProduct(id){
    if(!ensureModalExists()) return;
    var p = products.find(function(x){return x.id===id;});
    if(!p) return;
    __edit={type:'product', id:id};
    setEditMode('product');
    editTitle.textContent = '商品の編集';
    editHint.textContent = '保存で更新／削除は「削除」ボタンを2回で確定';
    eMasterName.value = p.name||'';
    eMasterMeta.value = p.cat||'';
    openModal();
  }

  function saveEdit(){
    if(!__edit.type) return;
    if(__edit.type==='purchase'){
      var id=__edit.id;
      var r = purchases.find(function(x){return x.id===id;});
      if(!r) return;
      var obj = validatePurchase({
        id: id,
        date: eDate.value || todayISO(),
        store: (eStore.value||'').trim(),
        name: (eName.value||'').trim(),
        price: Number(ePrice.value||0),
        qty: Number(eQty.value||1),
        note: (eNote.value||'').trim()
      });
      if(!obj){ setStatus('保存できません：必須項目（店/商品/価格）を確認'); return; }
      // update
      r.date=obj.date; r.store=obj.store; r.name=obj.name; r.price=obj.price; r.qty=obj.qty; r.note=obj.note;
      sortPurchases();
      var syncChanged = syncMastersFromPurchases();
      if(syncChanged){ sortByName(stores); sortByName(products); }
      saveAll();
      renderPurchases(); rebuildStorePickers();
    // v0.7.8: event delegation (tbody-level)
    if(!__delegationInstalled){
      __delegationInstalled=true;
      function bindDelegation(tbody, type, openFn){
        if(!tbody) return;
        tbody.addEventListener('click', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          click2Edit(type, tr.dataset.id, tr, openFn);
        }, true);
        tbody.addEventListener('dblclick', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          try{ openFn(tr.dataset.id); }catch(e){ setStatus('編集を開けません（dblclick）'); }
        }, true);
      }
      bindDelegation(purchaseBody, 'purchase', window.openEditPurchase);
      bindDelegation(storeBody, 'store', window.openEditStore);
      bindDelegation(productBody, 'product', window.openEditProduct);
    }
 rebuildProductPickers(); computeStats(); updateDebug();
      setStatus('更新しました（購入）');
      closeModal();
      return;
    }
    if(__edit.type==='store'){
      var id=__edit.id;
      var s=stores.find(function(x){return x.id===id;});
      if(!s) return;
      var name=(eMasterName.value||'').trim();
      if(!name){ setStatus('保存できません：店名が空です'); return; }
      s.name=name;
      s.note=(eMasterMeta.value||'').trim();
      sortByName(stores);
      saveAll(); rebuildStorePickers();
    // v0.7.8: event delegation (tbody-level)
    if(!__delegationInstalled){
      __delegationInstalled=true;
      function bindDelegation(tbody, type, openFn){
        if(!tbody) return;
        tbody.addEventListener('click', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          click2Edit(type, tr.dataset.id, tr, openFn);
        }, true);
        tbody.addEventListener('dblclick', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          try{ openFn(tr.dataset.id); }catch(e){ setStatus('編集を開けません（dblclick）'); }
        }, true);
      }
      bindDelegation(purchaseBody, 'purchase', window.openEditPurchase);
      bindDelegation(storeBody, 'store', window.openEditStore);
      bindDelegation(productBody, 'product', window.openEditProduct);
    }
 computeStats(); updateDebug();
      setStatus('更新しました（店）');
      closeModal();
      return;
    }
    if(__edit.type==='product'){
      var id=__edit.id;
      var p=products.find(function(x){return x.id===id;});
      if(!p) return;
      var name=(eMasterName.value||'').trim();
      if(!name){ setStatus('保存できません：商品名が空です'); return; }
      p.name=name;
      p.cat=(eMasterMeta.value||'').trim();
      sortByName(products);
      saveAll(); rebuildProductPickers(); computeStats(); updateDebug();
      setStatus('更新しました（商品）');
      closeModal();
      return;
    }
  }

  function deleteEdit(){
    if(!__edit.type) return;
    var id=__edit.id;
    if(__edit.type==='purchase'){
      var r=purchases.find(function(x){return x.id===id;});
      if(!r) return;
      var summary='削除（購入）：'+(r.date||'')+' '+(r.store||'')+' '+(r.name||'');
      if(!requireConfirm('delPurchaseModal:'+id, summary, btnEditDelete)) return;
      purchases=purchases.filter(function(x){return x.id!==id;});
      saveAll(); renderPurchases(); computeStats(); updateDebug();
      setStatus('削除しました（購入）');
      closeModal();
      return;
    }
    if(__edit.type==='store'){
      var s=stores.find(function(x){return x.id===id;});
      if(!s) return;
      var summary='削除（店）：'+(s.name||'');
      if(!requireConfirm('delStoreModal:'+id, summary, btnEditDelete)) return;
      stores=stores.filter(function(x){return x.id!==id;});
      saveAll(); rebuildStorePickers();
    // v0.7.8: event delegation (tbody-level)
    if(!__delegationInstalled){
      __delegationInstalled=true;
      function bindDelegation(tbody, type, openFn){
        if(!tbody) return;
        tbody.addEventListener('click', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          click2Edit(type, tr.dataset.id, tr, openFn);
        }, true);
        tbody.addEventListener('dblclick', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          try{ openFn(tr.dataset.id); }catch(e){ setStatus('編集を開けません（dblclick）'); }
        }, true);
      }
      bindDelegation(purchaseBody, 'purchase', window.openEditPurchase);
      bindDelegation(storeBody, 'store', window.openEditStore);
      bindDelegation(productBody, 'product', window.openEditProduct);
    }
 computeStats(); updateDebug();
      setStatus('削除しました（店）');
      closeModal();
      return;
    }
    if(__edit.type==='product'){
      var p=products.find(function(x){return x.id===id;});
      if(!p) return;
      var summary='削除（商品）：'+(p.name||'');
      if(!requireConfirm('delProductModal:'+id, summary, btnEditDelete)) return;
      products=products.filter(function(x){return x.id!==id;});
      saveAll(); rebuildProductPickers(); computeStats(); updateDebug();
      setStatus('削除しました（商品）');
      closeModal();
      return;
    }
  }

    __confirmKey = key;
    __confirmUntil = now + 4500;
    setStatus(message + '（もう一度で確定）');
    if(el) armVisual(el);
    return false;
  }

  document.addEventListener('keydown', function(e){
    if(e && e.key === 'Escape'){
      __confirmKey = '';
      __confirmUntil = 0;
      setStatus('キャンセルしました');
      if(__armedEl){ try{ __armedEl.classList.remove('sp-armed'); }catch(_){} }
    }
  });

  function safeParse(s){try{return JSON.parse(s);}catch(e){return null;}}
  function todayISO(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function yen(n){var x=Number(n);if(!Number.isFinite(x))x=0;return x.toLocaleString('ja-JP')+'円';}

  function validatePurchase(r){if(!r||typeof r!=='object')return null;
    var o={id:String(r.id||''),date:String(r.date||''),store:String(r.store||''),name:String(r.name||''),price:Number(r.price),qty:Number(r.qty),note:String(r.note||'')};
    if(!o.id)return null; if(!Number.isFinite(o.price))o.price=0; if(!Number.isFinite(o.qty)||o.qty<=0)o.qty=1; return o;}
  function validateStore(r){if(!r||typeof r!=='object')return null; var n=norm(r.name); if(!n)return null; return {id:String(r.id||('s-'+Date.now().toString(36))),name:n,note:norm(r.note)};}
  function validateProduct(r){if(!r||typeof r!=='object')return null; var n=norm(r.name); if(!n)return null; return {id:String(r.id||('g-'+Date.now().toString(36))),name:n,cat:norm(r.cat)};}
  function sortPurchases(){purchases.sort(function(a,b){if(a.date!==b.date)return a.date<b.date?1:-1; return a.id<b.id?1:-1;});}
  function sortByName(list){list.sort(function(a,b){var A=key(a.name),B=key(b.name);if(A<B)return-1;if(A>B)return 1;return 0;});}
  function loadList(k,validator){var raw=localStorage.getItem(k); if(!raw)return []; var p=safeParse(raw); if(!Array.isArray(p))return []; var out=[]; for(var i=0;i<p.length;i++){var v=validator(p[i]); if(v)out.push(v);} return out;}
  function loadMeta(){
    var raw = localStorage.getItem(META_KEY);
    if(!raw) return {lastExportAt:'', lastImportAt:''};
    var p = safeParse(raw);
    if(!p || typeof p!=='object') return {lastExportAt:'', lastImportAt:''};
    return {lastExportAt: String(p.lastExportAt||''), lastImportAt: String(p.lastImportAt||'')};
  }
  function saveMeta(){
    localStorage.setItem(META_KEY, JSON.stringify({lastExportAt:lastExportAt||'', lastImportAt:lastImportAt||''}));
  }


  function saveAll(){localStorage.setItem(PURCHASE_KEY,JSON.stringify(purchases));localStorage.setItem(STORE_KEY,JSON.stringify(stores));localStorage.setItem(PRODUCT_KEY,JSON.stringify(products)); saveMeta();}

  // autosync
  function ensureStoreName(name){name=norm(name); if(!name)return false; var k=key(name); if(stores.some(function(s){return key(s.name)===k;}))return false;
    stores.push({id:'s-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),name:name,note:''}); sortByName(stores); return true;}
  function ensureProductName(name){name=norm(name); if(!name)return false; var k=key(name); if(products.some(function(p){return key(p.name)===k;}))return false;
    products.push({id:'g-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),name:name,cat:''}); sortByName(products); return true;}
  function syncMastersFromPurchases(){var changed=false; for(var i=0;i<purchases.length;i++){var r=purchases[i]; if(ensureStoreName(r.store))changed=true; if(ensureProductName(r.name))changed=true;} return changed;}
  function findProductByName(name){var k=key(name); for(var i=0;i<products.length;i++){ if(key(products[i].name)===k) return products[i]; } return null; }

  function requestDeletePurchaseById(id, rowEl){
    var r = purchases.find(function(x){ return x.id===id; });
    if(!r) return;

    var summary = '削除：' + (r.date||'') + ' ' + (r.store||'') + ' ' + (r.name||'');
    if(!requireConfirm('delPurchase:'+id, summary, rowEl)) return;

    purchases = purchases.filter(function(x){ return x.id!==id; });
    saveAll();
    renderPurchases();
    computeStats();
    updateDebug();
    setStatus('削除しました（購入 ' + purchases.length + '件）');
  }

  function renderPurchases(){
    elTbody.innerHTML='';
    if(!purchases.length){ elEmpty.hidden=false; return; }
    elEmpty.hidden=true;

    var frag=document.createDocumentFragment();
    for(var i=0;i<purchases.length;i++){
      var r=purchases[i];
      var tr=document.createElement('tr');
      tr.dataset.id = r.id;

      // v0.7.2: クリック2回で編集（dblclick不発の保険）
      tr.addEventListener('click', function(){
        click2Edit('purchase', this.dataset.id, this, window.openEditPurchase);
      });

      // PC: ダブルクリック
      tr.addEventListener('dblclick', function(){
        window.openEditPurchase(this.dataset.id);
      });

      // PC: 右クリック
      tr.addEventListener('contextmenu', function(e){
        e.preventDefault();
        window.openEditPurchase(this.dataset.id);
      });

      // モバイル: 長押し（約0.65秒）
      var pressTimer = null;
      tr.addEventListener('pointerdown', function(){
        var id = this.dataset.id;
        pressTimer = setTimeout(function(){
  // v0.7.7: early placeholders (prevent TypeError/ReferenceError)
  try{
    if(typeof window.openEditPurchase!=='function') window.openEditPurchase=function(){ };
    if(typeof window.openEditStore!=='function') window.openEditStore=function(){ };
    if(typeof window.openEditProduct!=='function') window.openEditProduct=function(){ };
  }catch(e){}
          window.openEditPurchase(id);
        }, 650);
      });
      tr.addEventListener('pointerup', function(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } });
      tr.addEventListener('pointercancel', function(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } });
      tr.addEventListener('pointerleave', function(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } });

      var td=document.createElement('td'); td.textContent=r.date||''; tr.appendChild(td);
      td=document.createElement('td'); td.textContent=r.store||''; tr.appendChild(td);
      td=document.createElement('td'); td.textContent=r.name||''; tr.appendChild(td);
      td=document.createElement('td'); td.className='colNum'; td.textContent=yen(r.price); tr.appendChild(td);
      td=document.createElement('td'); td.className='colNum'; td.textContent=String(r.qty||''); tr.appendChild(td);
      td=document.createElement('td'); td.textContent=r.note||''; tr.appendChild(td);

      frag.appendChild(tr);
    }
    elTbody.appendChild(frag);
  }

  function computeStats(){var today=todayISO(), month=today.slice(0,7);
    var tSum=0,tCnt=0,mSum=0,mCnt=0;
    var storeMap=Object.create(null);
    var catMap=Object.create(null);

    for(var i=0;i<purchases.length;i++){var r=purchases[i]; var line=Number(r.price)*Number(r.qty||1); if(!Number.isFinite(line))line=0;
      if(r.date===today){tSum+=line; tCnt++;}
      if(String(r.date||'').slice(0,7)===month){mSum+=line; mCnt++;
        var s=r.store||'(不明)'; if(!storeMap[s])storeMap[s]={total:0,count:0}; storeMap[s].total+=line; storeMap[s].count++;
        var p=findProductByName(r.name);
        var c=(p && norm(p.cat)) ? norm(p.cat) : '(未分類)';
        if(!catMap[c])catMap[c]={total:0,count:0}; catMap[c].total+=line; catMap[c].count++;
      }
    }

    cachedToday=tSum; cachedMonth=mSum;

    statTodayTotal.textContent=yen(tSum); statTodayCount.textContent='件数：'+tCnt+'件';
    statMonthTotal.textContent=yen(mSum); statMonthCount.textContent='件数：'+mCnt+'件';
    statAllCount.textContent=String(purchases.length);

    // store
    storeTotalTbody.innerHTML='';
    var sEntries=Object.keys(storeMap).map(function(k){return {name:k,total:storeMap[k].total,count:storeMap[k].count};});
    sEntries.sort(function(a,b){return b.total-a.total;});
    var frag=document.createDocumentFragment();
    if(!sEntries.length){var tr=document.createElement('tr'); var td=document.createElement('td'); td.textContent='今月のデータがありません'; td.colSpan=3; tr.appendChild(td); frag.appendChild(tr);}
    else {
      for(var j=0;j<sEntries.length;j++){var e=sEntries[j]; var tr=document.createElement('tr');
        var td=document.createElement('td'); td.textContent=e.name; tr.appendChild(td);
        td=document.createElement('td'); td.className='colNum'; td.textContent=yen(e.total); tr.appendChild(td);
        td=document.createElement('td'); td.className='colNum'; td.textContent=String(e.count); tr.appendChild(td);
        frag.appendChild(tr);
      }
    }
    storeTotalTbody.appendChild(frag);

    // category
    catTotalTbody.innerHTML='';
    var cEntries=Object.keys(catMap).map(function(k){return {name:k,total:catMap[k].total,count:catMap[k].count};});
    cEntries.sort(function(a,b){return b.total-a.total;});
    cachedCatRows=cEntries.length;
    var frag2=document.createDocumentFragment();
    if(!cEntries.length){var tr2=document.createElement('tr'); var td2=document.createElement('td'); td2.textContent='今月のデータがありません'; td2.colSpan=3; tr2.appendChild(td2); frag2.appendChild(tr2);}
    else {
      for(var k=0;k<cEntries.length;k++){var e2=cEntries[k]; var tr3=document.createElement('tr');
        var td3=document.createElement('td'); td3.textContent=e2.name; tr3.appendChild(td3);
        td3=document.createElement('td'); td3.className='colNum'; td3.textContent=yen(e2.total); tr3.appendChild(td3);
        td3=document.createElement('td'); td3.className='colNum'; td3.textContent=String(e2.count); tr3.appendChild(td3);
        frag2.appendChild(tr3);
      }
    }
    catTotalTbody.appendChild(frag2);
  }

  function rebuildStorePickers(){selStore.innerHTML='<option value="">（選ぶと「店」に入ります）</option>'; storeChips.innerHTML=''; storeTbody.innerHTML=''; storeDatalist.innerHTML='';
    if(!stores.length)return;
    var fragChip=document.createDocumentFragment(), fragTable=document.createDocumentFragment(), fragDl=document.createDocumentFragment();
    for(var i=0;i<stores.length;i++){var s=stores[i];
      var opt=document.createElement('option'); opt.value=s.id; opt.textContent=s.name; selStore.appendChild(opt);

      // チップ：選択のみ（削除ボタンなし）
      var chip=document.createElement('div'); chip.className='chip'; chip.dataset.id=s.id; chip.appendChild(document.createTextNode(s.name));
      chip.addEventListener('click',function(){var id=this.dataset.id; var found=stores.find(function(t){return t.id===id;}); if(found){fStore.value=found.name; flash(fStore); setStatus('店を入力しました：'+found.name);}});
      fragChip.appendChild(chip);

      // 表：行操作で削除（誤操作防止）
      var tr=document.createElement('tr'); tr.dataset.id=s.id;
      tr.addEventListener('click', function(){ click2Edit('store', this.dataset.id, this, window.openEditStore); });

      tr.addEventListener('dblclick', function(){ window.openEditStore(this.dataset.id); });
      tr.addEventListener('contextmenu', function(e){ e.preventDefault(); window.openEditStore(this.dataset.id); });

      var pressTimer=null;
      tr.addEventListener('pointerdown', function(){ var el=this; var id=this.dataset.id; pressTimer=setTimeout(function(){ window.openEditStore(id); }, 650); });
      tr.addEventListener('pointerup', function(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } });
      tr.addEventListener('pointercancel', function(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } });
      tr.addEventListener('pointerleave', function(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } });

      var td=document.createElement('td'); td.textContent=s.name; tr.appendChild(td);
      td=document.createElement('td'); td.textContent=s.note||''; tr.appendChild(td);
      td=document.createElement('td'); td.className='miniAct'; td.textContent=''; tr.appendChild(td);

      fragTable.appendChild(tr);

      var o=document.createElement('option'); o.value=s.name; fragDl.appendChild(o);
    }
    storeChips.appendChild(fragChip); storeTbody.appendChild(fragTable); storeDatalist.appendChild(fragDl);
  }

  function rebuildProductPickers(){selProduct.innerHTML='<option value="">（選ぶと「商品」に入ります）</option>'; productChips.innerHTML=''; productTbody.innerHTML=''; productDatalist.innerHTML='';
    if(!products.length)return;
    var fragChip=document.createDocumentFragment(), fragTable=document.createDocumentFragment(), fragDl=document.createDocumentFragment();
    for(var i=0;i<products.length;i++){var p=products[i];
      var opt=document.createElement('option'); opt.value=p.id; opt.textContent=p.name; selProduct.appendChild(opt);

      // チップ：選択のみ（削除ボタンなし）
      var chip=document.createElement('div'); chip.className='chip'; chip.dataset.id=p.id; chip.appendChild(document.createTextNode(p.name));
      chip.addEventListener('click',function(){var id=this.dataset.id; var found=products.find(function(t){return t.id===id;}); if(found){fName.value=found.name; flash(fName); setStatus('商品を入力しました：'+found.name);}});
      fragChip.appendChild(chip);

      // 表：行操作で削除（誤操作防止）
      var tr=document.createElement('tr'); tr.dataset.id=p.id;
      tr.addEventListener('click', function(){ click2Edit('product', this.dataset.id, this, window.openEditProduct); });

      tr.addEventListener('dblclick', function(){ window.openEditProduct(this.dataset.id); });
      tr.addEventListener('contextmenu', function(e){ e.preventDefault(); window.openEditProduct(this.dataset.id); });

      var pressTimer=null;
      tr.addEventListener('pointerdown', function(){ var el=this; var id=this.dataset.id; pressTimer=setTimeout(function(){ window.openEditProduct(id); }, 650); });
      tr.addEventListener('pointerup', function(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } });
      tr.addEventListener('pointercancel', function(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } });
      tr.addEventListener('pointerleave', function(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } });

      var td=document.createElement('td'); td.textContent=p.name; tr.appendChild(td);
      td=document.createElement('td'); td.textContent=p.cat||''; tr.appendChild(td);
      td=document.createElement('td'); td.className='miniAct'; td.textContent=''; tr.appendChild(td);

      fragTable.appendChild(tr);

      var o=document.createElement('option'); o.value=p.name; fragDl.appendChild(o);
    }
    productChips.appendChild(fragChip); productTbody.appendChild(fragTable); productDatalist.appendChild(fragDl);
  }

  function addStore(){var name=norm(fNewStoreName.value), note=norm(fNewStoreNote.value);
    if(!name)return setStatus('店名が未入力です'); var k=key(name); if(stores.some(function(s){return key(s.name)===k;}))return setStatus('同じ店名がすでにあります');
    stores.push({id:'s-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),name:name,note:note});
    sortByName(stores); saveAll(); rebuildStorePickers();
    // v0.7.8: event delegation (tbody-level)
    if(!__delegationInstalled){
      __delegationInstalled=true;
      function bindDelegation(tbody, type, openFn){
        if(!tbody) return;
        tbody.addEventListener('click', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          click2Edit(type, tr.dataset.id, tr, openFn);
        }, true);
        tbody.addEventListener('dblclick', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          try{ openFn(tr.dataset.id); }catch(e){ setStatus('編集を開けません（dblclick）'); }
        }, true);
      }
      bindDelegation(purchaseBody, 'purchase', window.openEditPurchase);
      bindDelegation(storeBody, 'store', window.openEditStore);
      bindDelegation(productBody, 'product', window.openEditProduct);
    }
 computeStats(); updateDebug();
    setStatus('店を追加しました（'+stores.length+'件）'); fNewStoreName.value=''; fNewStoreNote.value=''; fNewStoreName.focus();
  }
  function deleteStore(id, btnEl){
    var s = stores.find(function(x){return x.id===id;}); if(!s) return;
    if(!requireConfirm('delStore:'+id, '店を削除：'+s.name, btnEl)) return;
    stores = stores.filter(function(x){return x.id!==id;});
    saveAll(); rebuildStorePickers();
    // v0.7.8: event delegation (tbody-level)
    if(!__delegationInstalled){
      __delegationInstalled=true;
      function bindDelegation(tbody, type, openFn){
        if(!tbody) return;
        tbody.addEventListener('click', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          click2Edit(type, tr.dataset.id, tr, openFn);
        }, true);
        tbody.addEventListener('dblclick', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          try{ openFn(tr.dataset.id); }catch(e){ setStatus('編集を開けません（dblclick）'); }
        }, true);
      }
      bindDelegation(purchaseBody, 'purchase', window.openEditPurchase);
      bindDelegation(storeBody, 'store', window.openEditStore);
      bindDelegation(productBody, 'product', window.openEditProduct);
    }
 computeStats(); updateDebug();
    setStatus('店を削除しました（'+stores.length+'件）');
  }

  function addOrUpdateProduct(){var name=norm(fNewProductName.value), cat=norm(fNewProductCat.value);
    if(!name)return setStatus('商品名が未入力です');
    var k=key(name);
    var existing=products.find(function(p){return key(p.name)===k;});
    if(existing){
      if(cat && existing.cat!==cat) {
        existing.cat=cat;
        sortByName(products);
        saveAll(); rebuildProductPickers(); computeStats(); updateDebug();
        setStatus('分類を更新しました（'+existing.name+' → '+cat+'）');
      } else {
        setStatus('同じ商品名がすでにあります（分類が空なら入れて更新できます）');
      }
      fNewProductName.value=''; fNewProductCat.value=''; fNewProductName.focus();
      return;
    }
    products.push({id:'g-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),name:name,cat:cat});
    sortByName(products); saveAll(); rebuildProductPickers(); computeStats(); updateDebug();
    setStatus('商品を追加しました（'+products.length+'件）'); fNewProductName.value=''; fNewProductCat.value=''; fNewProductName.focus();
  }

  function deleteProduct(id, btnEl){
    var p = products.find(function(x){return x.id===id;}); if(!p) return;
    if(!requireConfirm('delProduct:'+id, '商品を削除：'+p.name, btnEl)) return;
    products = products.filter(function(x){return x.id!==id;});
    saveAll(); rebuildProductPickers(); computeStats(); updateDebug();
    setStatus('商品を削除しました（'+products.length+'件）');
  }

  function addPurchase(){var date=norm(fDate.value), store=norm(fStore.value), name=norm(fName.value);
    var price=Number(norm(fPrice.value)), qty=Number(norm(fQty.value)), note=norm(fNote.value);
    if(!date)return setStatus('日付が未入力です'); if(!store)return setStatus('店が未入力です'); if(!name)return setStatus('商品が未入力です');
    if(!Number.isFinite(price)||price<0)return setStatus('価格が不正です'); if(!Number.isFinite(qty)||qty<=0)return setStatus('個数が不正です');

    purchases.push({id:'r-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),date:date,store:store,name:name,price:price,qty:qty,note:note});
    sortPurchases();

    var masterChanged=false;
    if(ensureStoreName(store)) masterChanged=true;
    if(ensureProductName(name)) masterChanged=true;

    saveAll();
    renderPurchases();
    if(masterChanged){rebuildStorePickers();
    // v0.7.8: event delegation (tbody-level)
    if(!__delegationInstalled){
      __delegationInstalled=true;
      function bindDelegation(tbody, type, openFn){
        if(!tbody) return;
        tbody.addEventListener('click', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          click2Edit(type, tr.dataset.id, tr, openFn);
        }, true);
        tbody.addEventListener('dblclick', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          try{ openFn(tr.dataset.id); }catch(e){ setStatus('編集を開けません（dblclick）'); }
        }, true);
      }
      bindDelegation(purchaseBody, 'purchase', window.openEditPurchase);
      bindDelegation(storeBody, 'store', window.openEditStore);
      bindDelegation(productBody, 'product', window.openEditProduct);
    }
 rebuildProductPickers();}
    computeStats(); updateDebug();

    fName.value=''; fPrice.value=''; fNote.value=''; fName.focus();
    setStatus('保存しました（購入 '+purchases.length+'件）');
  }

  function seedAll(){
    if(!requireConfirm('seedAll', '確認：ダミーデータ投入（5秒以内にもう一度）', btnSeed)) return;
    var t=todayISO();
    purchases=[
      {id:'r-001',date:t,store:'カスミ',name:'牛乳 1L',price:238,qty:1,note:'SAFE MODE ダミー'},
      {id:'r-002',date:t,store:'ヨークベニマル',name:'食パン 6枚',price:178,qty:1,note:''},
      {id:'r-003',date:t,store:'ドラッグストア',name:'シャンプー 詰替',price:598,qty:1,note:'値上がり確認'}
    ].map(validatePurchase).filter(Boolean);
    stores=[
      {id:'s-001',name:'カスミ',note:'よく行く'},
      {id:'s-002',name:'ヨークベニマル',note:''},
      {id:'s-003',name:'ドラッグストア',note:'日用品'}
    ].map(validateStore).filter(Boolean);
    products=[
      {id:'g-001',name:'牛乳 1L',cat:'食品'},
      {id:'g-002',name:'食パン 6枚',cat:'食品'},
      {id:'g-003',name:'シャンプー 詰替',cat:'日用品'}
    ].map(validateProduct).filter(Boolean);
    sortPurchases(); sortByName(stores); sortByName(products);
    saveAll(); renderPurchases(); rebuildStorePickers();
    // v0.7.8: event delegation (tbody-level)
    if(!__delegationInstalled){
      __delegationInstalled=true;
      function bindDelegation(tbody, type, openFn){
        if(!tbody) return;
        tbody.addEventListener('click', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          click2Edit(type, tr.dataset.id, tr, openFn);
        }, true);
        tbody.addEventListener('dblclick', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          try{ openFn(tr.dataset.id); }catch(e){ setStatus('編集を開けません（dblclick）'); }
        }, true);
      }
      bindDelegation(purchaseBody, 'purchase', window.openEditPurchase);
      bindDelegation(storeBody, 'store', window.openEditStore);
      bindDelegation(productBody, 'product', window.openEditProduct);
    }
 rebuildProductPickers(); computeStats(); updateDebug();
    setStatus('ダミー投入完了（購入 '+purchases.length+'／店 '+stores.length+'／商品 '+products.length+'）');
  }

  function clearAll(){
    if(!requireConfirm('clearAll', '確認：全消去（購入・店・商品）5秒以内にもう一度', btnClear)) return;
    purchases=[]; stores=[]; products=[];
    localStorage.removeItem(PURCHASE_KEY); localStorage.removeItem(STORE_KEY); localStorage.removeItem(PRODUCT_KEY);
    renderPurchases(); rebuildStorePickers();
    // v0.7.8: event delegation (tbody-level)
    if(!__delegationInstalled){
      __delegationInstalled=true;
      function bindDelegation(tbody, type, openFn){
        if(!tbody) return;
        tbody.addEventListener('click', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          click2Edit(type, tr.dataset.id, tr, openFn);
        }, true);
        tbody.addEventListener('dblclick', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          try{ openFn(tr.dataset.id); }catch(e){ setStatus('編集を開けません（dblclick）'); }
        }, true);
      }
      bindDelegation(purchaseBody, 'purchase', window.openEditPurchase);
      bindDelegation(storeBody, 'store', window.openEditStore);
      bindDelegation(productBody, 'product', window.openEditProduct);
    }
 rebuildProductPickers(); computeStats(); updateDebug();
    setStatus('全消去しました');
  }

  function buildExportPayload(){return {
      app:APP.NAME, version:APP.VERSION, build:BUILD, exportedAt:new Date().toISOString(),
      keys:{purchases:PURCHASE_KEY,stores:STORE_KEY,products:PRODUCT_KEY},
      purchases:purchases, stores:stores, products:products
    };}
  function downloadJson(obj, filename){var json=JSON.stringify(obj,null,2);
    var blob=new Blob([json],{type:'application/json'}); var url=URL.createObjectURL(blob);
    var a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  function downloadBlob(blob, filename){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1200);
  }
  function pad2(n){ return String(n).padStart(2,'0'); }
  function csvEscape(v){
    var s = (v===null||v===undefined) ? '' : String(v);
    if (s.indexOf('"')>=0) s = s.replace(/"/g,'""');
    if (/[",\n\r]/.test(s)) s = '"' + s + '"';
    return s;
  }
  function buildPurchasesCsv(){
    var headers = ['date','store','name','category','price','qty','line_total','note'];
    var rows = [headers.join(',')];
    for (var i=0; i<purchases.length; i++){
      var r = purchases[i];
      var p = findProductByName(r.name);
      var cat = (p && norm(p.cat)) ? norm(p.cat) : '';
      var line = Number(r.price) * Number(r.qty || 1);
      if (!Number.isFinite(line)) line = 0;
      var cols = [
        r.date||'',
        r.store||'',
        r.name||'',
        cat,
        String(Number(r.price)||0),
        String(Number(r.qty)||1),
        String(line),
        r.note||''
      ].map(csvEscape);
      rows.push(cols.join(','));
    }
    return rows.join('\r\n');
  }
  function exportJson(){
    var payload = buildExportPayload();
    var d = new Date();
    var y = d.getFullYear(), m = pad2(d.getMonth()+1), dd = pad2(d.getDate());
    var hh = pad2(d.getHours()), mm = pad2(d.getMinutes());
    var base = 'smartprice_safemode_export_' + y + m + dd + '_' + hh + mm;

    // JSON（復元用）
    var json = JSON.stringify(payload, null, 2);
    downloadBlob(new Blob([json], {type:'application/json'}), base + '.json');

    // CSV（Excel用：UTF-8 BOM）
    var csv = buildPurchasesCsv();
    var bom = '\ufeff';
    downloadBlob(new Blob([bom + csv], {type:'text/csv'}), base + '_purchases.csv');

    lastExportAt = payload.exportedAt; saveMeta();
    setStatus('エクスポートしました（JSON＋CSV）購入 '+purchases.length+'／店 '+stores.length+'／商品 '+products.length);
    updateDebug();
  }

  function normalizeArray(obj, field){if(!obj||typeof obj!=='object')return null; return Array.isArray(obj[field])?obj[field]:null;}
  function confirmReplace(){ return true; }

  function importFromObject(obj){
    // 受け付け形式：
    // A) {purchases:[], stores:[], products:[]}（完全）
    // B) purchases配列（購入だけ）
    // C) products配列（商品マスタだけ）
    // D) stores配列（店マスタだけ）
    var type = '';
    var pList=null, sList=null, gList=null;

    if(Array.isArray(obj)){
      var first = obj[0] || {};
      if(first && (first.date || first.store || first.price!=null)){
        type='purchases';
        pList = obj.map(validatePurchase).filter(Boolean);
      }else if(first && (first.cat!=null) && (first.name!=null)){
        type='products';
        gList = obj.map(validateProduct).filter(Boolean);
      }else if(first && (first.name!=null)){
        type='stores';
        sList = obj.map(validateStore).filter(Boolean);
      }else{
        setStatus('インポート失敗：配列の種類が判定できません（購入/店/商品）');
        return false;
      }
    }else{
      var purchaseArr = (Array.isArray(obj.purchases)? obj.purchases : null);
      var storeArr = normalizeArray(obj,'stores');
      var prodArr  = normalizeArray(obj,'products');
      if(purchaseArr){ type='all'; pList = purchaseArr.map(validatePurchase).filter(Boolean); }
      if(storeArr){ sList = storeArr.map(validateStore).filter(Boolean); }
      if(prodArr){ gList = prodArr.map(validateProduct).filter(Boolean); }

      if(!pList && (sList || gList)){ type='masters'; }
      if(!pList && !sList && !gList){
        setStatus('インポート失敗：purchases/stores/products が見つかりません');
        return false;
      }
    }

    var msg = '';
    var key = '';

    if(type==='purchases'){
      msg = 'インポート（購入のみ）' + pList.length + '件';
      key = 'import:purchases:' + pList.length;
      if(!requireConfirm(key, msg, btnPasteImport)) return false;
      purchases = pList;
    }else if(type==='products'){
      msg = 'インポート（商品マスタ）' + gList.length + '件';
      key = 'import:products:' + gList.length;
      if(!requireConfirm(key, msg, btnPasteImport)) return false;
      products = gList;
    }else if(type==='stores'){
      msg = 'インポート（店マスタ）' + sList.length + '件';
      key = 'import:stores:' + sList.length;
      if(!requireConfirm(key, msg, btnPasteImport)) return false;
      stores = sList;
    }else{
      var pc = pList ? pList.length : purchases.length;
      var sc = sList ? sList.length : stores.length;
      var gc = gList ? gList.length : products.length;
      msg = 'インポート（置換）購入 ' + pc + '／店 ' + sc + '／商品 ' + gc;
      key = 'import:all:' + pc + ':' + sc + ':' + gc;
      if(!requireConfirm(key, msg, btnPasteImport)) return false;

      if(pList) purchases = pList;
      if(sList) stores = sList;
      if(gList) products = gList;
    }

    sortPurchases(); sortByName(stores); sortByName(products);

    var syncChanged = syncMastersFromPurchases();
    if(syncChanged){ sortByName(stores); sortByName(products); }

    saveAll();
    renderPurchases(); rebuildStorePickers();
    // v0.7.8: event delegation (tbody-level)
    if(!__delegationInstalled){
      __delegationInstalled=true;
      function bindDelegation(tbody, type, openFn){
        if(!tbody) return;
        tbody.addEventListener('click', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          click2Edit(type, tr.dataset.id, tr, openFn);
        }, true);
        tbody.addEventListener('dblclick', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          try{ openFn(tr.dataset.id); }catch(e){ setStatus('編集を開けません（dblclick）'); }
        }, true);
      }
      bindDelegation(purchaseBody, 'purchase', window.openEditPurchase);
      bindDelegation(storeBody, 'store', window.openEditStore);
      bindDelegation(productBody, 'product', window.openEditProduct);
    }
 rebuildProductPickers(); computeStats();

    lastImportAt = new Date().toISOString(); saveMeta();
    setStatus('インポート完了。再表示します…');
    updateDebug();

    setTimeout(function(){ try{ location.reload(); }catch(e){} }, 350);
    return true;
  }
  function importJsonText(text){
    var t = String(text||'');
    t = t.replace(/^\ufeff/,'').trim(); // BOM/空白除去

    if(/^date,store,name,category,price/i.test(t)){
      setStatus('これはCSVです。インポートは JSON（.json） を選んでください');
      return;
    }

    var obj = safeParse(t);
    if(!obj){
      var head = t.slice(0,24).replace(/\s+/g,' ');
      setStatus('インポート失敗：JSONが壊れています（先頭：'+head+'…）');
      return;
    }
    importFromObject(obj);
  }

  function handleImportFile(file){
    if(!file) return;
    var reader=new FileReader();
    reader.onload=function(){
      var t = String(reader.result||'');
      pasteBox.hidden = false;
      pasteText.value = t;

      var name = (file && file.name) ? file.name : '';
      if(/\.csv$/i.test(name)){
        setStatus('CSVを読み込みました（これはインポートできません）。JSON（.json）を選んでください');
      }else{
        setStatus('JSONを読み込みました：'+name+'。貼り付け欄の「この内容でインポート」を2回押すと確定');
      }
      try{ pasteText.focus(); }catch(e){}
    };
    reader.onerror=function(){ setStatus('インポート失敗：ファイル読込に失敗しました'); };
    reader.readAsText(file);
  }

  function togglePaste(){pasteBox.hidden=!pasteBox.hidden; if(!pasteBox.hidden)pasteText.focus();}
  function pasteImport(){var t=norm(pasteText.value); if(!t)return setStatus('貼り付けが空です'); importJsonText(t);}
  function pasteClear(){pasteText.value=''; setStatus('貼り付けを消しました');}

  function buildDiagText(){var now=new Date(); var lines=[];
    lines.push('【Smart Price SAFE MODE 診断ログ】');
    lines.push('VERSION: '+APP.VERSION);
    lines.push('BUILD(b): '+BUILD);
    lines.push('FULL: '+FULL);
    lines.push('PURCHASE_KEY: '+PURCHASE_KEY);
    lines.push('STORE_KEY: '+STORE_KEY);
    lines.push('PRODUCT_KEY: '+PRODUCT_KEY);
    lines.push('PURCHASE_COUNT: '+purchases.length);
    lines.push('STORE_COUNT: '+stores.length);
    lines.push('PRODUCT_COUNT: '+products.length);
    lines.push('CAT_ROWS: '+cachedCatRows);
    lines.push('TODAY_TOTAL: '+yen(cachedToday));
    lines.push('MONTH_TOTAL: '+yen(cachedMonth));
    lines.push('LAST_EXPORT: '+(lastExportAt||'-'));
    lines.push('LAST_IMPORT: '+(lastImportAt||'-'));
    lines.push('URL: '+location.href);
    lines.push('UA: '+navigator.userAgent);
    lines.push('NOW: '+now.toISOString());
    lines.push('');
    lines.push('POLICY: SW/Cache/APIなし（SAFE MODE）');
    return lines.join('\n');
  }
  function updateDebug(){if(!DEBUG)return;
    vFull.textContent=FULL;
    vPurchaseKey.textContent=PURCHASE_KEY;
    vStoreKey.textContent=STORE_KEY;
    vProductKey.textContent=PRODUCT_KEY;
    vPurchaseCount.textContent=String(purchases.length);
    vStoreCount.textContent=String(stores.length);
    vProductCount.textContent=String(products.length);
    vCatRows.textContent=String(cachedCatRows);
    vTodayTotal.textContent=yen(cachedToday);
    vMonthTotal.textContent=yen(cachedMonth);
    vLastExport.textContent=lastExportAt||'-';
    vLastImport.textContent=lastImportAt||'-';
    vUrl.textContent=location.href;
    vUa.textContent=navigator.userAgent;
    vNow.textContent=new Date().toISOString();
    diagText.textContent=buildDiagText();
  }
  function copyDiag(){
    var text = buildDiagText();
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){
  // v0.7.7: early placeholders (prevent TypeError/ReferenceError)
  try{
    if(typeof window.openEditPurchase!=='function') window.openEditPurchase=function(){ };
    if(typeof window.openEditStore!=='function') window.openEditStore=function(){ };
    if(typeof window.openEditProduct!=='function') window.openEditProduct=function(){ };
  }catch(e){}
        setStatus('診断ログをコピーしました');
      }).catch(function(){
  // v0.7.7: early placeholders (prevent TypeError/ReferenceError)
  try{
    if(typeof window.openEditPurchase!=='function') window.openEditPurchase=function(){ };
    if(typeof window.openEditStore!=='function') window.openEditStore=function(){ };
    if(typeof window.openEditProduct!=='function') window.openEditProduct=function(){ };
  }catch(e){}
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text){
    var ta=document.createElement('textarea');
    ta.value=text;
    ta.style.position='fixed';
    ta.style.left='-9999px';
    document.body.appendChild(ta);
    ta.select();
    try{
      document.execCommand('copy');
      setStatus('診断ログをコピーしました');
    }catch(e){
      setStatus('コピーできませんでした（手動でコピーしてください）');
    }
    document.body.removeChild(ta);
  }

  function init(){
    var __delegationInstalled = false;
    try{ if(typeof publishGlobals==='function'){ publishGlobals(); } }catch(e){ setStatus('起動ガード：publishGlobalsで例外'); }fDate.value=todayISO();
    var meta = loadMeta(); lastExportAt = meta.lastExportAt||''; lastImportAt = meta.lastImportAt||'';
    purchases=loadList(PURCHASE_KEY,validatePurchase);
    stores=loadList(STORE_KEY,validateStore);
    products=loadList(PRODUCT_KEY,validateProduct);
    sortPurchases(); sortByName(stores); sortByName(products);

    var changed=syncMastersFromPurchases();
    if(changed){saveAll();}

    renderPurchases(); rebuildStorePickers();
    // v0.7.8: event delegation (tbody-level)
    if(!__delegationInstalled){
      __delegationInstalled=true;
      function bindDelegation(tbody, type, openFn){
        if(!tbody) return;
        tbody.addEventListener('click', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          click2Edit(type, tr.dataset.id, tr, openFn);
        }, true);
        tbody.addEventListener('dblclick', function(ev){
          var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
          if(!tr) return;
          try{ openFn(tr.dataset.id); }catch(e){ setStatus('編集を開けません（dblclick）'); }
        }, true);
      }
      bindDelegation(purchaseBody, 'purchase', window.openEditPurchase);
      bindDelegation(storeBody, 'store', window.openEditStore);
      bindDelegation(productBody, 'product', window.openEditProduct);
    }
 rebuildProductPickers(); computeStats();

    if(DEBUG){dbgPanel.hidden=false; btnCopyDiag.addEventListener('click',copyDiag);}
    updateDebug();
    setStatus('読込完了（購入 '+purchases.length+'／店 '+stores.length+'／商品 '+products.length+'）');

    btnAddStore.addEventListener('click',addStore);
    selStore.addEventListener('change',function(){var id=selStore.value; var found=stores.find(function(s){return s.id===id;}); if(found){fStore.value=found.name; flash(fStore); setStatus('店を入力しました：'+found.name);} selStore.value='';});

    btnAddProduct.addEventListener('click',addOrUpdateProduct);
    selProduct.addEventListener('change',function(){var id=selProduct.value; var found=products.find(function(p){return p.id===id;}); if(found){fName.value=found.name; flash(fName); setStatus('商品を入力しました：'+found.name);} selProduct.value='';});

    btnAdd.addEventListener('click',addPurchase);
    btnSeed.addEventListener('click',seedAll);
    btnClear.addEventListener('click',clearAll);

    btnExport.addEventListener('click',exportJson);
    fileImport.addEventListener('change',function(e){var file=e.target.files&&e.target.files[0]; handleImportFile(file); e.target.value='';});

    btnPasteToggle.addEventListener('click',togglePaste);
    btnPasteImport.addEventListener('click',pasteImport);
    btnPasteClear.addEventListener('click',pasteClear);

    [fName,fPrice,fNote].forEach(function(el){el.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault(); addPurchase();}});});
 
    // edit modal events (v0.7.1: guard)
    if(ensureModalExists()){
      btnEditClose.addEventListener('click', closeModal);
      editBackdrop.addEventListener('click', closeModal);
      btnEditSave.addEventListener('click', saveEdit);
      btnEditDelete.addEventListener('click', deleteEdit);

      document.addEventListener('keydown', function(e){
        if(!editModal.hidden && e && e.key==='Escape'){ closeModal(); }
      });
    }

  }


  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();

  // v0.7.3: publish edit funcs (ReferenceError対策)
  try{
    window.openEditPurchase = openEditPurchase;
    window.openEditStore = openEditStore;
    window.openEditProduct = openEditProduct;
    window.ensureModalExists = ensureModalExists;
    window.openModal = openModal;
  }catch(e){}
})();


// v0.7.5: alias (typo protection)
try{ if(typeof window.publishGlobals!=='function' && typeof publishGlobals==='function'){ window.publishGlobals = publishGlobals; } }catch(e){}

  // v0.7.8: modal probe (debug-only button)
  function modalProbe(){
    try{ publishGlobals(); }catch(e){}
    try{ ensureModalExists(); }catch(e){ setStatus('モーダル生成に失敗'); return; }
    // Try open first available item by priority
    try{
      if(purchases && purchases.length){ window.openEditPurchase(purchases[0].id); return; }
      if(stores && stores.length){ window.openEditStore(stores[0].id); return; }
      if(products && products.length){ window.openEditProduct(products[0].id); return; }
      setStatus('モーダル検証：対象データがありません');
    }catch(e){
      setStatus('モーダル検証：例外');
    }
  }
