  // ======================
  // PRODUCT IMAGE START
  // ======================
  // ========= Image Store (IndexedDB) =========
  const IMG_DB_NAME = "smart_price_img_db_v1";
  const IMG_STORE = "images";
  let imgDbPromise = null;

  function openImgDb() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (imgDbPromise) return imgDbPromise;
    imgDbPromise = new Promise((resolve) => {
      const req = indexedDB.open(IMG_DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        // ✅ 保存箱が存在しない場合は必ず作成（既存ユーザーでも安全）
        if (!db.objectStoreNames.contains(IMG_STORE)) {
          try {
            db.createObjectStore(IMG_STORE);
          } catch (err) {
            console.warn('[IDB] createObjectStore failed:', err);
          }
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // ✅ 保存箱が存在することを確認（念のため）
        if (db && !db.objectStoreNames.contains(IMG_STORE)) {
          // 保存箱が無い場合は再作成を試みる
          try {
            db.close();
            indexedDB.deleteDatabase(IMG_DB_NAME);
            imgDbPromise = null; // リセット
            resolve(openImgDb()); // 再帰呼び出し
            return;
          } catch (err) {
            console.warn('[IDB] recreate failed:', err);
            resolve(null);
            return;
          }
        }
        resolve(db);
      };
      req.onerror = (e) => {
        console.warn('[IDB] open failed:', e);
        resolve(null);
      };
    });
    return imgDbPromise;
  }

  async function idbPut(key, blob) {
    const dbi = await openImgDb();
    if (!dbi) return false;
    // ✅ 保存箱の存在確認
    if (!dbi.objectStoreNames.contains(IMG_STORE)) {
      console.warn('[IDB] objectStore not found:', IMG_STORE);
      return false;
    }
    return new Promise((res) => {
      try {
        const tx = dbi.transaction(IMG_STORE, "readwrite");
        const store = tx.objectStore(IMG_STORE);
        store.put(blob, key);
        tx.oncomplete = () => {
          const jan = spJanFromImageKey(key);
          spImgInvestigationLog('[IMG-IDB-SAVE]', jan, spProductNameFromJan(jan), '', { imageKey: key, ok: true });
          res(true);
        };
        tx.onerror = (e) => {
          console.warn('[IDB] put failed:', e);
          const jan = spJanFromImageKey(key);
          spImgInvestigationLog('[IMG-IDB-SAVE]', jan, spProductNameFromJan(jan), '', { imageKey: key, ok: false });
          res(false);
        };
      } catch (err) {
        console.warn('[IDB] transaction failed:', err);
        res(false);
      }
    });
  }

  async function idbGet(key) {
    const dbi = await openImgDb();
    if (!dbi) return null;
    // ✅ 保存箱の存在確認
    if (!dbi.objectStoreNames.contains(IMG_STORE)) {
      console.warn('[IDB] objectStore not found:', IMG_STORE);
      return null;
    }
    return new Promise((res) => {
      try {
        const tx = dbi.transaction(IMG_STORE, "readonly");
        const store = tx.objectStore(IMG_STORE);
        const req = store.get(key);
        req.onsuccess = () => {
          const result = req.result || null;
          const jan = spJanFromImageKey(key);
          spImgInvestigationLog('[IMG-IDB-LOAD]', jan, spProductNameFromJan(jan), '', {
            imageKey: key,
            found: !!result,
            blobSize: result && result.size != null ? result.size : 0
          });
          res(result);
        };
        req.onerror = (e) => {
          console.warn('[IDB] get failed:', e);
          res(null);
        };
      } catch (err) {
        console.warn('[IDB] transaction failed:', err);
        res(null);
      }
    });
  }

  async function idbGetAllKeys() {
    const dbi = await openImgDb();
    if (!dbi || !dbi.objectStoreNames.contains(IMG_STORE)) return [];
    return new Promise((res) => {
      try {
        const tx = dbi.transaction(IMG_STORE, 'readonly');
        const store = tx.objectStore(IMG_STORE);
        const req = store.getAllKeys();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      } catch (err) {
        res([]);
      }
    });
  }
  try { window.idbGetAllKeys = idbGetAllKeys; } catch (_idk) {}

  function dataUrlToBlob(dataUrl) {
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8 = new Uint8Array(n);
      while (n--) u8[n] = bstr.charCodeAt(n);
      return new Blob([u8], { type: mime });
    } catch(e){ return null; }
  }

  // ✅ dataURLtoBlob（保存用、より安全な実装）
  function dataURLtoBlob(dataurl){
    try{
      const parts = String(dataurl).split(',');
      const head = parts[0] || '';
      const b64 = parts[1] || '';
      const m = head.match(/data:(.*?);base64/);
      const mime = (m && m[1]) ? m[1] : 'image/png';
      const bin = atob(b64);
      const u8 = new Uint8Array(bin.length);
      for (let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
      return new Blob([u8], { type: mime });
    }catch(e){
      return null;
    }
  }

  async function fileToThumbBlob(file, maxSide=256, quality=0.78) {
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const w = img.width, h = img.height;
          const scale = Math.min(1, maxSide / Math.max(w, h));
          const cw = Math.max(1, Math.round(w * scale));
          const ch = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = cw; canvas.height = ch;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = "#fff";
          ctx.fillRect(0,0,cw,ch);
          // ✅ EXIF情報は自動で削除される（canvas.drawImageで再描画するため）
          ctx.drawImage(img, 0,0,cw,ch);
          canvas.toBlob((blob) => {
            resolve(blob || null);
          }, 'image/jpeg', quality);
        };
        img.onerror = () => resolve(null);
        img.src = fr.result;
      };
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(file);
    });
  }

  // ========= 画像をFirebaseにアップロード（SDK版：Auth + DB Rules対応） =========
  async function uploadImageToFirebase(code, blob) {
    // Firebase SDK が有効な場合はSDK版を使用
    if (isFirebaseReady && firebaseDb && currentAuthUid) {
      try {
        // Blobをbase64に変換
        const dataUrl = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = () => reject(new Error('画像読み込み失敗'));
          fr.readAsDataURL(blob);
        });

        const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        const imageRecord = {
          owner: currentAuthUid,  // ✅ auth.uid を使用
          imageUrl: dataUrl,
          createdAt: Date.now()
        };

        // Firebase SDK（database）で保存
        const ref = firebaseDb.ref(`smart_price_images/${code}/${imageId}`);
        await ref.set(imageRecord);

        if (isDebug()) console.log('[Firebase SDK] Image uploaded:', imageId);
        return { imageId, owner: currentAuthUid };

      } catch(e) {
        if (isDebug()) console.warn('[Firebase SDK] Upload failed, fallback to REST:', e);
        // フォールバック: REST版を実行
      }
    }

    // フォールバック: REST版（従来方式）
    if (!fbUrl) {
      throw new Error('Firebase URLが設定されていません');
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error('画像読み込み失敗'));
      fr.readAsDataURL(blob);
    });

    const deviceId = getDeviceId();
    const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    const imageRecord = {
      owner: deviceId,  // レガシー: deviceId
      imageUrl: dataUrl,
      createdAt: Date.now()
    };

    const imageUrl = getImageUrl(fbUrl, code, imageId);
    await fetchWithTimeout(imageUrl, {
      method: 'PUT',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(imageRecord)
    }, 15000);

    return { imageId, owner: deviceId };
  }

  // ========= 共有画像を取得（SDK版：ランダム表示用） =========
  async function getSharedImages(code) {
    // Firebase SDK が有効な場合はSDK版を使用
    if (isFirebaseReady && firebaseDb) {
      try {
        const ref = firebaseDb.ref(`smart_price_images/${code}`);
        const snapshot = await ref.once('value');
        const data = snapshot.val();
        
        if (!data || typeof data !== 'object') return [];
        
        const images = [];
        for (const [imageId, record] of Object.entries(data)) {
          if (record && typeof record === 'object' && record.imageUrl) {
            images.push({ imageId, ...record });
          }
        }
        
        if (isDebug()) console.log('[Firebase SDK] Loaded images:', images.length);
        return images;

      } catch(e) {
        if (isDebug()) console.warn('[Firebase SDK] Get images failed, fallback to REST:', e);
        // フォールバック: REST版を実行
      }
    }

    // フォールバック: REST版（従来方式）
    if (!fbUrl) return [];
    try {
      const listUrl = getImageListUrl(fbUrl, code);
      const res = await fetchWithTimeout(listUrl, {}, 10000);
      const data = await res.json();
      if (!data || typeof data !== 'object') return [];
      
      const images = [];
      for (const [imageId, record] of Object.entries(data)) {
        if (record && typeof record === 'object' && record.imageUrl) {
          images.push({ imageId, ...record });
        }
      }
      return images;
    } catch(e) {
      if (isDebug()) console.warn('[getSharedImages]', e);
      return [];
    }
  }

  // ========= 自分の画像を取得（SDK版：owner確認） =========
  async function getMyImages(code) {
    const allImages = await getSharedImages(code);
    
    // Firebase SDK が有効な場合は auth.uid で判定
    if (isFirebaseReady && currentAuthUid) {
      return allImages.filter(img => img.owner === currentAuthUid);
    }
    
    // フォールバック: deviceId で判定
    const deviceId = getDeviceId();
    return allImages.filter(img => img.owner === deviceId);
  }

  // ========= 画像を削除（SDK版：DB Rulesで強制） =========
  async function deleteImageFromFirebase(code, imageId) {
    // Firebase SDK が有効な場合はSDK版を使用（DB Rules で権限チェック）
    if (isFirebaseReady && firebaseDb && currentAuthUid) {
      try {
        const ref = firebaseDb.ref(`smart_price_images/${code}/${imageId}`);
        
        // owner確認
        const snapshot = await ref.once('value');
        const record = snapshot.val();
        
        if (!record) {
          throw new Error('画像が見つかりません');
        }
        
        if (record.owner !== currentAuthUid) {
          throw new Error('削除権限がありません（投稿者のみ削除可能）');
        }
        
        // 削除（DB Rulesでも権限チェックされる）
        await ref.remove();
        
        if (isDebug()) console.log('[Firebase SDK] Image deleted:', imageId);
        return;

      } catch(e) {
        if (isDebug()) console.warn('[Firebase SDK] Delete failed:', e);
        throw e;  // エラーを再スロー
      }
    }

    // フォールバック: REST版（従来方式）
    if (!fbUrl) {
      throw new Error('Firebase URLが設定されていません');
    }

    // owner確認
    const imageUrl = getImageUrl(fbUrl, code, imageId);
    const res = await fetchWithTimeout(imageUrl, {}, 8000);
    const record = await res.json();
    
    if (!record || record.owner !== getDeviceId()) {
      throw new Error('削除権限がありません（投稿者のみ削除可能）');
    }

    // 削除
    await fetchWithTimeout(imageUrl, {
      method: 'DELETE'
    }, 8000);
  }

  // ✅ 画像キーの復元ロジック強化（古い紐づけも探索）
  async function applyImageKeyToImg(imgEl, key) {
    if (!imgEl || !key) {
      return Promise.reject(new Error('Invalid parameters'));
    }
    try {
      // 1. まず指定されたキーで取得
      let blob = await idbGet(key);
      if (blob) {
        const url = URL.createObjectURL(blob);
        imgEl.src = url;
        imgEl.referrerPolicy = "no-referrer";
        // メモリ解放（置換時）
        if (imgEl.dataset && imgEl.dataset.objurl) {
          try { URL.revokeObjectURL(imgEl.dataset.objurl); } catch(e) {}
        }
        imgEl.dataset.objurl = url;
        return Promise.resolve();
      }
      
      // 2. 指定されたキーが見つからない場合、古いキーを探索
      const dbi = await openImgDb();
      if (!dbi || !dbi.objectStoreNames.contains(IMG_STORE)) {
        return Promise.reject(new Error('Image not found in IndexedDB'));
      }
      
      // IndexedDBから全キーを取得
      const allKeys = await new Promise((resolve) => {
        try {
          const tx = dbi.transaction(IMG_STORE, "readonly");
          const store = tx.objectStore(IMG_STORE);
          const req = store.getAllKeys();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch(e) {
          resolve([]);
        }
      });
      
      // 3. 古いキーのパターンを試す（部分一致）
      // キーからバーコード部分を抽出（例：img_1234567890123 → 1234567890123）
      const codeMatch = key.match(/img_([0-9]+)/);
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1];
        // バーコードベースのキーを探す（img_${code} または img_${code}_*）
        const candidateKeys = allKeys.filter(k => {
          const kStr = String(k);
          return kStr.includes(code) && (kStr.startsWith('img_') || kStr.includes('_img_'));
        });
        
        // 候補キーを試す（最も長いキーから試す）
        candidateKeys.sort((a, b) => String(b).length - String(a).length);
        for (const candidateKey of candidateKeys) {
          blob = await idbGet(candidateKey);
          if (blob) {
            const url = URL.createObjectURL(blob);
            imgEl.src = url;
            imgEl.referrerPolicy = "no-referrer";
            if (imgEl.dataset && imgEl.dataset.objurl) {
              try { URL.revokeObjectURL(imgEl.dataset.objurl); } catch(e) {}
            }
            imgEl.dataset.objurl = url;
            if (isDebug()) console.log('[applyImageKeyToImg] Found old key:', candidateKey, 'for', key);
            return Promise.resolve();
          }
        }
      }
      
      // 4. それでも見つからない場合はエラー
      return Promise.reject(new Error('Image not found in IndexedDB (tried fallback)'));
    } catch(e) {
      if (isDebug()) console.warn('[applyImageKeyToImg]', e);
      return Promise.reject(e);
    }
  }

  // ========= Home Image Fix (base64 + IndexedDB対応) =========
  async function spBindItemImage(imgEl, item, last) {
    if (!imgEl || !item) return;
    
    // 優先順位：last.imageData → item.imageData → last.imageKey → item.imageKey → last.imageUrl → item.imageUrl → placeholder
    
    // 1. base64データ（imageData）があれば優先
    if (last && last.imageData && typeof last.imageData === 'string' && last.imageData.startsWith('data:')) {
      imgEl.src = last.imageData;
      return;
    }
    if (item.imageData && typeof item.imageData === 'string' && item.imageData.startsWith('data:')) {
      imgEl.src = item.imageData;
      return;
    }
    
    // 2. IndexedDB（imageKey）があれば取得
    if (last && last.imageKey && typeof last.imageKey === 'string') {
      await applyImageKeyToImg(imgEl, last.imageKey);
      return;
    }
    if (item.imageKey && typeof item.imageKey === 'string') {
      await applyImageKeyToImg(imgEl, item.imageKey);
      return;
    }
    
    // 3. HTTP/HTTPS URL（imageUrl）があれば使用
    if (last && last.imageUrl && typeof last.imageUrl === 'string' && 
        (last.imageUrl.startsWith('http://') || last.imageUrl.startsWith('https://'))) {
      imgEl.src = last.imageUrl;
      return;
    }
    if (item.imageUrl && typeof item.imageUrl === 'string' && 
        (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://'))) {
      imgEl.src = item.imageUrl;
      return;
    }
    
    // 4. どれもなければplaceholder
    imgEl.src = placeholderImg();
  }

  // ========= P0/P1: LocalStorage Cache & User Profile =========
  
  /**
   * P1: ランダムなUIDを生成（u_から始まる12文字）
   */
  function generateUid() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uid = 'u_';
    for (let i = 0; i < 10; i++) {
      uid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return uid;
  }

  /**
   * P1: ユーザープロファイルを取得（LocalStorage）
   * @returns {object} { uid, areaId, invitedBy, createdAt }
   */
  function getUserProfile() {
    try {
      const json = localStorage.getItem('smartPrice_userProfile');
      if (json) {
        const profile = JSON.parse(json);
        // 必須フィールドの検証
        if (profile.uid) {
          return profile;
        }
      }
    } catch(e) {
      if (isDebug()) console.warn('[UserProfile] Failed to load:', e);
    }
    return null;
  }

  /**
   * P1: ユーザープロファイルを保存（LocalStorage）
   * @param {object} profile { uid, areaId, invitedBy, createdAt }
   */
  function setUserProfile(profile) {
    try {
      localStorage.setItem('smartPrice_userProfile', JSON.stringify(profile));
      if (isDebug()) console.log('[UserProfile] Saved:', profile);
    } catch(e) {
      if (isDebug()) console.error('[UserProfile] Failed to save:', e);
    }
  }

  // v23.9.155: parseInviteCode旧版削除（Firebase解決版IIFEに統合済み L12427）

  /**
   * P0: JANキャッシュを取得（LocalStorage）
   * @param {string} jan 
   * @returns {object|null} { name, maker, imageUrl, imageRefType, areaId, cachedAt }
   */
  function getJanCache(jan) {
    try {
      const key = `smartPrice_jan_${jan}`;
      const json = localStorage.getItem(key);
      if (json) {
        const data = JSON.parse(json);
        // キャッシュの有効期限チェック（7日間）
        if (data.cachedAt) {
          const now = Date.now();
          const age = now - data.cachedAt;
          if (age > 7 * 24 * 60 * 60 * 1000) {
            // 期限切れ
            localStorage.removeItem(key);
            return null;
          }
        }
        return data;
      }
    } catch(e) {
      if (isDebug()) console.warn('[JanCache] Failed to load:', jan, e);
    }
    return null;
  }

  /**
   * P0: JANキャッシュを保存（LocalStorage）
   * @param {string} jan 
   * @param {object} data { name, maker, imageUrl, imageRefType, areaId, source }
   */
  function setJanCache(jan, data) {
    try {
      const userProfile = getUserProfile();
      const cacheData = {
        ...data,
        cachedAt: Date.now(),
        areaId: data.areaId || (userProfile ? userProfile.areaId : null)
      };
      const key = `smartPrice_jan_${jan}`;
      localStorage.setItem(key, JSON.stringify(cacheData));
      if (isDebug()) console.log('[JanCache] Saved:', jan, cacheData);
    } catch(e) {
      if (isDebug()) console.error('[JanCache] Failed to save:', jan, e);
    }
  }

  // ========= [lookup-aiflow] Server Confirmed Product DB (Firebase RTDB) =========
  /**
   * [lookup-aiflow] サーバー（Firebase RTDB）から確定商品データを取得する
   * パス: confirmed_products/{jan}
   * @param {string} jan
   * @returns {object|null} { confirmedName, confirmedMaker, confirmedCategory, aiNormalizedAt, aiConfidence } or null
   */
  async function lookupServerConfirmedProduct(jan) {
    if (!jan) return null;
    try {
      if (!isFirebaseReady || !firebaseDb) {
        spDbg('[LOOKUP_SERVER] Firebase not ready', { jan });
        return null;
      }
      const ref = firebaseDb.ref(`confirmed_products/${jan}`);
      const snap = await ref.once('value');
      if (!snap.exists()) {
        spDbg('[LOOKUP_SERVER] no data', { jan });
        return null;
      }
      const data = snap.val();
      if (!data || !data.confirmedName) return null;
      spDbg('[LOOKUP_SERVER_HIT]', { jan, confirmedName: data.confirmedName, confirmedMaker: data.confirmedMaker || '' });
      console.log('[LOOKUP_SERVER_HIT]', jan, data);
      return data;
    } catch(e) {
      spDbg('[LOOKUP_SERVER] error', { jan, msg: e && e.message ? e.message : String(e) });
      return null;
    }
  }

  /**
   * [lookup-aiflow] AI正規化結果をサーバー（Firebase RTDB）へ保存する
   * パス: confirmed_products/{jan}
   * @param {string} jan
   * @param {object} data { confirmedName, confirmedMaker, confirmedCategory, aiConfidence, sourceCandidates }
   */
  async function saveServerConfirmedProduct(jan, data) {
    if (!jan || !data || !data.confirmedName) return;
    try {
      if (!isFirebaseReady || !firebaseDb) {
        spDbg('[SAVE_SERVER] Firebase not ready', { jan });
        return;
      }
      const record = {
        jan: jan,
        confirmedName: data.confirmedName || '',
        confirmedMaker: data.confirmedMaker || '',
        confirmedCategory: data.confirmedCategory || '',
        aiNormalizedAt: Date.now(),
        aiConfidence: data.aiConfidence || 1.0,
        sourceCandidates: data.sourceCandidates || []
      };
      const ref = firebaseDb.ref(`confirmed_products/${jan}`);
      await ref.set(record);
      spDbg('[SAVE_SERVER] saved', { jan, confirmedName: record.confirmedName });
      console.log('[SAVE_SERVER] confirmed product saved', jan, record);
    } catch(e) {
      spDbg('[SAVE_SERVER] error', { jan, msg: e && e.message ? e.message : String(e) });
    }
  }

  /**
   * [lookup-aiflow] AI正規化をGAS経由で実行する（クライアントにAPIキーを持たない）
   * GAS URL は SP_CONFIG.kiraGasExecUrl に設定する
   * @param {string} jan
   * @param {string[]} nameCandidates 候補商品名配列
   * @param {string[]} makerCandidates 候補メーカー名配列
   * @param {string[]} sources 取得元配列 e.g. ['yahoo','rakuten']
   * @param {string} catOptions カテゴリ選択肢文字列
   * @returns {object|null} { name, maker, category } or null
   */
  async function callAiViаGas(jan, nameCandidates, makerCandidates, sources, catOptions) {
    const gasUrl = (window.SP_CONFIG && window.SP_CONFIG.kiraGasExecUrl)
      ? window.SP_CONFIG.kiraGasExecUrl.trim() : '';
    if (!gasUrl) {
      spDbg('[AI_NORMALIZE_CALL] kiraGasExecUrl not set', { jan });
      console.warn('[AI_NORMALIZE_CALL] kiraGasExecUrl が SP_CONFIG に未設定です');
      return null;
    }
    spDbg('[AI_NORMALIZE_CALL]', { jan, nameCandidates, makerCandidates, sources });
    console.log('[AI_NORMALIZE_CALL]', { jan, nameCandidates, makerCandidates, sources });
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'normalizeProduct',
          jan: jan,
          nameCandidates: nameCandidates,
          makerCandidates: makerCandidates,
          sources: sources,
          catOptions: catOptions || ''
        }),
        signal: controller.signal
      });
      clearTimeout(tid);
      if (!res.ok) {
        spDbg('[AI_NORMALIZE_CALL] GAS error', { jan, status: res.status });
        return null;
      }
      const json = await res.json();
      if (!json || !json.name) return null;
      spDbg('[AI_NORMALIZE_DONE]', { jan, name: json.name, maker: json.maker || '', category: json.category || '' });
      console.log('[AI_NORMALIZE_DONE]', jan, json);
      return json; // { name, maker, category }
    } catch(e) {
      spDbg('[AI_NORMALIZE_CALL] fetch error', { jan, msg: e && e.message ? e.message : String(e) });
      return null;
    }
  }


  // ======================
  // PRODUCT IMAGE END
  // ======================
