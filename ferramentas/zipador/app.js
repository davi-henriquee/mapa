(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const files = []; let busy = false, cancelled = false, downloadUrl = null, nextId = 0;
  const MAX_TOTAL = 500 * 1024 * 1024, MAX_FILE = 40 * 1024 * 1024;
  const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;
  const isOptimizableImage = file => IMAGE_RE.test(file.name);
  const formatSize = n => n < 1024 * 1024 ? `${(n / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB` : `${(n / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  const totalSize = () => files.reduce((sum, item) => sum + item.file.size, 0);
  function message(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); $('message').hidden = !text; }
  function resetDownload() { if (downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl = null; $('download-again').hidden = true; $('download-again').removeAttribute('href'); }
  function updateName() { const output = $('filename'); if (output) output.textContent = $('property-number').value.trim() ? MapaZip.archiveName($('property-number').value, $('description').value) : 'numero-do-imovel.zip'; }
  function setBusy(value) { busy = value; $('controls').disabled = value; $('zip-form').setAttribute('aria-busy', String(value)); }
  function checkCancelled() { if (cancelled) throw new DOMException('Operação cancelada.', 'AbortError'); }
  function progress(value, text) { $('progress').value = value; $('progress-text').textContent = text; }
  async function loadImage(file) {
    const url = URL.createObjectURL(file), img = new Image();
    try { img.src = url; await img.decode(); if (!img.naturalWidth || !img.naturalHeight) throw new Error(); return { img, release: () => { img.src = ''; URL.revokeObjectURL(url); } }; }
    catch { URL.revokeObjectURL(url); throw new Error(`Não foi possível abrir “${file.name}”. Converta essa foto para JPG, PNG ou WebP e tente novamente.`); }
  }
  function canvasBlob(canvas, quality) { return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('O navegador não conseguiu converter uma das imagens.')), 'image/jpeg', quality)); }
  async function thumbnail(file) {
    const { img, release } = await loadImage(file);
    try {
      if (img.naturalWidth * img.naturalHeight > 60000000) throw new Error(`“${file.name}” excede 60 megapixels. Reduza suas dimensões antes de adicionar.`);
      const canvas = document.createElement('canvas'), scale = Math.min(1, 260 / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await canvasBlob(canvas, .75); canvas.width = canvas.height = 0; return URL.createObjectURL(blob);
    } finally { release(); }
  }
  function render() {
    $('count').textContent = `${files.length} ${files.length === 1 ? 'item' : 'itens'}`;
    $('total-size').textContent = `${formatSize(totalSize())} em arquivos originais`; $('photos-toolbar').hidden = !files.length;
    $('photo-grid').replaceChildren();
    for (const item of files) {
      const li = document.createElement('li'); li.className = 'photo';
      let visual;
      if (item.preview) {
        visual = document.createElement('img'); visual.src = item.preview; visual.alt = item.file.name; visual.loading = 'lazy';
      } else {
        visual = document.createElement('div'); visual.className = 'file-placeholder';
        const extension = item.file.name.includes('.') ? item.file.name.split('.').pop() : 'ARQ';
        visual.textContent = extension.slice(0, 5) || 'ARQ'; visual.setAttribute('aria-label', `Arquivo ${item.file.name}`);
      }
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remover ${item.file.name}`);
      remove.addEventListener('click', () => { if (busy) return; const i = files.findIndex(f => f.id === item.id); if (files[i].preview) URL.revokeObjectURL(files[i].preview); files.splice(i, 1); resetDownload(); message(''); render(); });
      const name = document.createElement('span'); name.className = 'photo-name'; name.textContent = item.file.name; name.title = item.file.name;
      const size = document.createElement('small'); size.textContent = formatSize(item.file.size); li.append(visual, remove, name, size); $('photo-grid').append(li);
    }
  }
  async function addFiles(list) {
    if (busy || !list.length) return;
    setBusy(true); resetDownload(); const problems = []; let added = 0, duplicates = 0;
    try {
      for (const file of list) {
        if (files.some(x => x.file.name === file.name && x.file.size === file.size && x.file.lastModified === file.lastModified)) { duplicates++; continue; }
        if (files.length >= 200) { problems.push('Limite de 200 itens atingido.'); break; }
        if (file.size > MAX_FILE || totalSize() + file.size > MAX_TOTAL) { problems.push(`“${file.name}”: limite de 40 MB por arquivo ou 500 MB no total excedido.`); continue; }
        message(`Preparando arquivos… ${added + 1}`);
        try { const preview = isOptimizableImage(file) ? await thumbnail(file) : null; files.push({ id: ++nextId, file, preview }); added++; }
        catch (error) { problems.push(error.message); }
      }
    } finally { setBusy(false); $('file-input').value = ''; render(); }
    message([added ? `${added} ${added === 1 ? 'item adicionado' : 'itens adicionados'}.` : '', duplicates ? `${duplicates} repetido(s) ignorado(s).` : '', ...problems].filter(Boolean).join(' '), problems.length > 0);
  }
  async function optimize(file, maxSize, quality) {
    const { img, release } = await loadImage(file);
    try {
      const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight)), canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const converted = await canvasBlob(canvas, quality); canvas.width = canvas.height = 0;
      return converted.size < file.size ? { blob: converted, name: file.name.replace(/\.[^.]+$/, '') + '.jpg' } : { blob: file, name: file.name };
    } finally { release(); }
  }
  $('add-files').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', event => addFiles(Array.from(event.target.files)));
  let dragDepth = 0;
  const drop = $('drop-zone');
  drop.addEventListener('dragenter', event => { event.preventDefault(); if (!busy) { dragDepth++; drop.classList.add('dragging'); } });
  drop.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = busy ? 'none' : 'copy'; });
  drop.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; drop.classList.remove('dragging'); } });
  drop.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; drop.classList.remove('dragging'); addFiles(Array.from(event.dataTransfer.files)); });
  window.addEventListener('dragover', event => event.preventDefault()); window.addEventListener('drop', event => event.preventDefault());
  $('clear-files').addEventListener('click', () => { files.forEach(x => { if (x.preview) URL.revokeObjectURL(x.preview); }); files.length = 0; resetDownload(); message(''); render(); });
  for (const id of ['property-number', 'description']) $(id).addEventListener('input', () => { $(id).setCustomValidity(''); updateName(); resetDownload(); message(''); });
  $('settings-toggle').addEventListener('click', () => { const open = $('settings').hidden; $('settings').hidden = !open; $('settings-toggle').setAttribute('aria-expanded', String(open)); $('settings-toggle').textContent = open ? 'Fechar' : 'Ajustar'; });
  function compressionChanged() {
    const enabled = $('compress').checked;
    $('max-size').disabled = $('quality').disabled = !enabled;
    $('compression-summary').textContent = enabled ? `Até ${Number($('max-size').value).toLocaleString('pt-BR')} px · qualidade ${Math.round(Number($('quality').value) * 100)}%` : 'Fotos originais, sem conversão';
    resetDownload(); message('');
  }
  for (const id of ['compress', 'max-size', 'quality']) $(id).addEventListener('change', compressionChanged);
  $('cancel').addEventListener('click', () => { cancelled = true; $('cancel').disabled = true; $('progress-text').textContent = 'Cancelando…'; });
  $('zip-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    if (!$('property-number').value.trim()) { $('property-number').setCustomValidity('Informe o número do imóvel.'); $('property-number').reportValidity(); return; }
    if (!files.length) { message('Adicione pelo menos um arquivo para criar o ZIP.', true); $('add-files').focus(); return; }
    setBusy(true); cancelled = false; resetDownload(); message(''); $('progress-area').hidden = false; $('cancel').disabled = false;
    const compress = $('compress').checked, maxSize = Number($('max-size').value), quality = Number($('quality').value);
    const name = MapaZip.archiveName($('property-number').value, $('description').value);
    try {
      const processed = [], usedNames = new Set(); let processedBytes = 0;
      for (let i = 0; i < files.length; i++) {
        checkCancelled(); progress(i / files.length * 80, `${compress && isOptimizableImage(files[i].file) ? 'Otimizando' : 'Preparando'} arquivo ${i + 1} de ${files.length}…`);
        const file = files[i].file, result = compress && isOptimizableImage(file) ? await optimize(file, maxSize, quality) : { blob: file, name: file.name };
        checkCancelled();
        const dot = result.name.lastIndexOf('.');
        const rawBase = dot > 0 ? result.name.slice(0, dot) : result.name;
        const ext = dot > 0 ? result.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) : '';
        const base = MapaZip.safeName(rawBase, 'arquivo');
        let entryName = ext ? `${base}.${ext}` : base, n = 2;
        if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(entryName)) entryName = `_${entryName}`;
        const uniqueBase = ext ? entryName.slice(0, -(ext.length + 1)) : entryName;
        while (usedNames.has(entryName.toLowerCase())) entryName = `${uniqueBase} (${n++})${ext ? `.${ext}` : ''}`;
        usedNames.add(entryName.toLowerCase()); processed.push({ blob: result.blob, name: entryName }); processedBytes += result.blob.size;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const blob = await MapaZip.makeZip(processed, (done, count) => progress(80 + done / count * 20, `Montando ZIP… ${done} de ${count}`), checkCancelled);
      checkCancelled(); downloadUrl = URL.createObjectURL(blob); const link = $('download-again'); link.href = downloadUrl; link.download = name; link.hidden = false; link.click();
      const saved = Math.max(0, Math.round((1 - processedBytes / totalSize()) * 100));
      message(`ZIP pronto! ${files.length} ${files.length === 1 ? 'item' : 'itens'} · ${formatSize(blob.size)}.${compress ? ` Redução de ${saved}% no tamanho total dos arquivos.` : ' Arquivos originais preservados.'} Se o download não iniciar, use o link abaixo.`);
    } catch (error) { message(error.name === 'AbortError' ? 'Operação cancelada. Seus arquivos continuam aqui.' : `Não foi possível gerar o ZIP. ${error.message}`, error.name !== 'AbortError'); }
    finally { setBusy(false); $('progress-area').hidden = true; $('cancel').disabled = false; }
  });
  updateName();
})();
