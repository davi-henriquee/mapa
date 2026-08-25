(function () {
  "use strict";

  const MAX_FILE_SIZE = 30 * 1024 * 1024;
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const fileCard = document.getElementById("file-card");
  const fileName = document.getElementById("file-name");
  const fileSize = document.getElementById("file-size");
  const removeButton = document.getElementById("remove-button");
  const convertButton = document.getElementById("convert-button");
  const buttonLabel = convertButton.querySelector(".button-label");
  const statusCard = document.getElementById("status-card");
  const statusIcon = document.getElementById("status-icon");
  const statusTitle = document.getElementById("status-title");
  const statusMessage = document.getElementById("status-message");
  const downloadAgain = document.getElementById("download-again");

  let selectedFile = null;
  let currentDownloadUrl = null;
  let currentDownloadName = null;

  function formatBytes(bytes) {
    if (bytes === 0) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** unitIndex;
    return `${value.toFixed(unitIndex === 0 || value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function isDocx(file) {
    return Boolean(file && /\.docx$/i.test(file.name));
  }

  function setFile(file) {
    clearStatus();

    if (!isDocx(file)) {
      showStatus(
        "error",
        "Formato não compatível",
        "Escolha um arquivo com a extensão .docx.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showStatus(
        "error",
        "Arquivo muito grande",
        "Escolha um documento de até 30 MB.",
      );
      return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    fileCard.hidden = false;
    convertButton.disabled = false;
    dropZone.setAttribute("aria-label", `Arquivo selecionado: ${file.name}. Clique para trocar.`);
  }

  function clearFile() {
    selectedFile = null;
    fileInput.value = "";
    fileCard.hidden = true;
    fileName.textContent = "";
    fileSize.textContent = "";
    convertButton.disabled = true;
    dropZone.removeAttribute("aria-label");
    clearStatus();
  }

  function showStatus(type, title, message, canDownload) {
    statusCard.hidden = false;
    statusCard.classList.toggle("is-error", type === "error");
    statusIcon.textContent = type === "error" ? "!" : "✓";
    statusTitle.textContent = title;
    statusMessage.textContent = message;
    downloadAgain.hidden = !canDownload;
  }

  function clearStatus() {
    statusCard.hidden = true;
    statusCard.classList.remove("is-error");
    downloadAgain.hidden = true;
  }

  function setBusy(isBusy) {
    convertButton.classList.toggle("is-loading", isBusy);
    convertButton.disabled = isBusy || !selectedFile;
    dropZone.setAttribute("aria-busy", String(isBusy));
    buttonLabel.textContent = isBusy ? "Convertendo documento..." : "Converter para DOC";
  }

  function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[character];
    });
  }

  function buildWordDocument(content, title) {
    return `\ufeff<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="Conversor documentos Superlógica">
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page WordSection1 { size: 595.3pt 841.9pt; margin: 70.85pt; }
    div.WordSection1 { page: WordSection1; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.35; color: #111; }
    h1 { font-size: 20pt; } h2 { font-size: 16pt; } h3 { font-size: 13pt; }
    table { border-collapse: collapse; max-width: 100%; }
    td, th { border: 1px solid #b7b7b7; padding: 5pt; vertical-align: top; }
    img { max-width: 100%; height: auto; }
    p { margin: 0 0 8pt; }
  </style>
</head>
<body><div class="WordSection1">${content}</div></body>
</html>`;
  }

  function createDownload(blob, name) {
    if (currentDownloadUrl) URL.revokeObjectURL(currentDownloadUrl);
    currentDownloadUrl = URL.createObjectURL(blob);
    currentDownloadName = name;
    startDownload();
  }

  function startDownload() {
    if (!currentDownloadUrl || !currentDownloadName) return;
    const link = document.createElement("a");
    link.href = currentDownloadUrl;
    link.download = currentDownloadName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function convertDocument() {
    if (!selectedFile) return;

    if (!window.mammoth || typeof window.mammoth.convertToHtml !== "function") {
      showStatus(
        "error",
        "Conversor indisponível",
        "Reabra a pasta completa do site e tente novamente.",
      );
      return;
    }

    clearStatus();
    setBusy(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = await window.mammoth.convertToHtml(
        { arrayBuffer: arrayBuffer },
        {
          styleMap: [
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Subtitle'] => h2:fresh",
          ],
        },
      );

      const baseName = selectedFile.name.replace(/\.docx$/i, "");
      const safeBaseName = baseName.replace(/[\\/:*?"<>|]/g, "-").trim() || "documento";
      const outputName = `${safeBaseName}.doc`;
      const wordDocument = buildWordDocument(result.value, baseName);
      const blob = new Blob([wordDocument], {
        type: "application/msword;charset=utf-8",
      });

      createDownload(blob, outputName);

      const hasWarnings = result.messages.some(function (message) {
        return message.type === "warning";
      });
      showStatus(
        "success",
        "Documento convertido",
        hasWarnings
          ? "Download iniciado. Alguns estilos muito específicos podem ter sido simplificados."
          : "O download do arquivo DOC foi iniciado automaticamente.",
        true,
      );
    } catch (error) {
      console.error(error);
      showStatus(
        "error",
        "Não foi possível converter",
        "Verifique se o arquivo DOCX está íntegro e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  dropZone.addEventListener("click", function () {
    fileInput.click();
  });

  dropZone.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  ["dragenter", "dragover"].forEach(function (eventName) {
    dropZone.addEventListener(eventName, function (event) {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach(function (eventName) {
    dropZone.addEventListener(eventName, function (event) {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");
    });
  });

  dropZone.addEventListener("drop", function (event) {
    const file = event.dataTransfer.files[0];
    if (file) setFile(file);
  });

  fileInput.addEventListener("change", function () {
    const file = fileInput.files[0];
    if (file) setFile(file);
  });

  removeButton.addEventListener("click", function (event) {
    event.stopPropagation();
    clearFile();
  });

  convertButton.addEventListener("click", convertDocument);
  downloadAgain.addEventListener("click", startDownload);

  window.addEventListener("beforeunload", function () {
    if (currentDownloadUrl) URL.revokeObjectURL(currentDownloadUrl);
  });
})();
