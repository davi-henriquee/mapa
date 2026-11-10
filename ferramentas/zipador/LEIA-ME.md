# Zipador de arquivos — Mapa Imobiliária

Abra `index.html` na pasta do site, usando uma versão atual do Microsoft Edge, Google Chrome ou Firefox. Não precisa instalar nada. Os arquivos HTML, CSS, JavaScript e a pasta assets precisam ficar juntos. O site funciona sem internet e não envia arquivos para servidores.

1. Informe o número do imóvel (campo de texto; preserva zeros iniciais e letras).
2. Se quiser, preencha uma descrição.
3. Clique em Escolher arquivo para abrir o seletor do Windows. É possível selecionar várias imagens e documentos, acrescentar mais depois ou arrastar arquivos para a área indicada.
4. Confira as miniaturas e cartões de extensão. Remova itens pelo × ou use Remover todas.
5. Clique em Zipar e baixar arquivos. O navegador baixa o ZIP ou pergunta onde salvar, conforme suas configurações.

Exemplos: `001245_Apartamento Centro.zip` ou `001245.zip` sem descrição. Espaços e acentos são preservados. Caracteres proibidos em nomes de arquivos do Windows são substituídos por hífen.

## Redução das imagens

Ativada por padrão: até 1.920 pixels no lado maior, qualidade JPEG de 80%. Em Ajustar, escolha 1.280, 1.920 ou 2.560 pixels e qualidade de 65%, 80% ou 90%. A proporção é preservada e imagens pequenas não são ampliadas. A porcentagem é um parâmetro de codificação JPEG, não uma promessa de redução de tamanho.

Imagens convertidas viram JPEG; transparências recebem fundo branco. Se o JPEG for maior ou igual ao original, o arquivo original é mantido (nesse caso também pode manter dimensões maiores que o limite escolhido). As imagens convertidas não preservam os metadados originais. Desative a opção para guardar arquivos originais, inclusive seus metadados. Arquivos com nomes iguais recebem sufixos para evitar substituições dentro do ZIP.

Qualquer tipo de arquivo pode ser incluído. JPG/JPEG, PNG, WebP e AVIF podem ser reduzidos pelo navegador; documentos e outros formatos são preservados sem alteração. Imagens animadas ou formatos não compatíveis com a redução também são mantidos como arquivos comuns. Limites: 200 itens, 40 MB por arquivo, 500 MB somados e 60 megapixels por imagem otimizada. Processamento e ZIP acontecem na memória do dispositivo; em dispositivos com pouca memória, use lotes menores.

## Arquivos

- `index.html`: página.
- `styles.css`: aparência e adaptação a celular.
- `app.js`: seleção, miniaturas, otimização e download.
- `zip.js`: criação do ZIP padrão com CRC-32 e nomes UTF-8.
- `assets/wallpaper.jpeg`: fundo fornecido.

Não há dependências externas, rastreamento, banco de dados ou etapa de compilação. Para hospedar, envie esses arquivos juntos a qualquer hospedagem estática. O ZIP usa o modo STORE; a economia possível vem da redução das imagens compatíveis.
