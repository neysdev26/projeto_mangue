// Configurar o worker do PDF.js (DEVE SER A PRIMEIRA LINHA)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

// Lógica do menu lateral (mantida)
document.addEventListener('DOMContentLoaded', function() {
    const abrirMenu = document.getElementById('abrir-menu');
    const fecharMenu = document.getElementById('fechar-menu');
    const menuLateral = document.getElementById('menu-lateral');

    if (abrirMenu && fecharMenu && menuLateral) {
        abrirMenu.addEventListener('click', () => menuLateral.classList.add('active'));
        fecharMenu.addEventListener('click', () => menuLateral.classList.remove('active'));
    }

    document.addEventListener('click', function(event) {
        if (!menuLateral.contains(event.target) && !abrirMenu.contains(event.target)) {
            menuLateral.classList.remove('active');
        }
    });

    // Carregar artigos (unificado)
    if (document.getElementById('container-artigos')) {
        carregarArtigosUnificado();
    }
});

// Função principal que carrega e exibe todos os artigos (HTML + PDF)
async function carregarArtigosUnificado() {
    try {
        const response = await fetch('artigos.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const artigos = await response.json();
        const container = document.getElementById('container-artigos');
        container.innerHTML = '';

        if (!artigos.length) {
            container.innerHTML = '<p class="mensagem-vazia">Nenhum artigo encontrado.</p>';
            return;
        }

        artigos.forEach(artigo => {
            const card = document.createElement('article');
            card.className = 'artigo-card';

            const data = new Date(artigo.dataPublicacao);
            const dataFormatada = data.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

            // Monta o card com as informações básicas
            let cardHTML = `
                <h3>${escapeHTML(artigo.titulo)}</h3>
                <p class="data-publicacao">${dataFormatada}</p>
                <p class="resumo">${escapeHTML(artigo.resumo)}</p>
            `;
            // Se for PDF, exibe autor/páginas/ano (opcional)
            if (artigo.tipo === 'pdf') {
                cardHTML += `
                    <p class="meta-pdf">
                        <strong>Autor:</strong> ${escapeHTML(artigo.autor || 'Desconhecido')} | 
                        <strong>Páginas:</strong> ${artigo.paginas || '?'} | 
                        <strong>Ano:</strong> ${artigo.ano || '-'}
                    </p>
                `;
            }

            // Botão e div do conteúdo (com ID único)
            const artigoId = `artigo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            cardHTML += `
                <button class="btn-leia-mais" data-tipo="${artigo.tipo}" data-conteudo="${artigo.conteudo}" data-id="${artigoId}" aria-expanded="false">
                    Ler Artigo Completo
                </button>
                <div id="${artigoId}" class="conteudo-artigo" style="display: none;"></div>
            `;
            card.innerHTML = cardHTML;
            container.appendChild(card);
        });

        // Usa event delegation para os botões (funciona mesmo com novos cards)
        container.addEventListener('click', async (e) => {
            const botao = e.target.closest('.btn-leia-mais');
            if (!botao) return;
            e.preventDefault();
            await toggleArtigo(botao);
        });

    } catch (error) {
        console.error('Erro ao carregar artigos:', error);
        document.getElementById('container-artigos').innerHTML = '<p class="erro">Erro ao carregar artigos. Tente novamente mais tarde.</p>';
    }
}

// Alterna entre exibir e ocultar o conteúdo do artigo (HTML ou PDF)
async function toggleArtigo(botao) {
    const tipo = botao.getAttribute('data-tipo');
    const conteudoPath = botao.getAttribute('data-conteudo');
    const artigoId = botao.getAttribute('data-id');
    const conteudoDiv = document.getElementById(artigoId);
    const expanded = botao.getAttribute('aria-expanded') === 'true';

    // Se já estiver expandido, apenas recolhe
    if (expanded) {
        conteudoDiv.style.display = 'none';
        botao.setAttribute('aria-expanded', 'false');
        botao.textContent = 'Ler Artigo Completo';
        return;
    }

    // Se ainda não foi carregado, carrega conforme o tipo
    if (conteudoDiv.innerHTML.trim() === '') {
        botao.disabled = true;
        botao.textContent = 'Carregando...';
        conteudoDiv.style.display = 'block';
        conteudoDiv.innerHTML = '<div class="loading-spinner">Carregando conteúdo...</div>';

        try {
            if (tipo === 'html') {
                await carregarArtigoHTML(conteudoPath, conteudoDiv);
            } else if (tipo === 'pdf') {
                await carregarArtigoPDF(conteudoPath, conteudoDiv);
            } else {
                conteudoDiv.innerHTML = '<p class="erro">Tipo de artigo desconhecido.</p>';
            }
        } catch (error) {
            console.error('Falha ao carregar:', error);
            conteudoDiv.innerHTML = '<p class="erro">Erro ao carregar o artigo. Verifique o arquivo.</p>';
        } finally {
            botao.disabled = false;
            botao.textContent = 'Ocultar Artigo Completo';
            botao.setAttribute('aria-expanded', 'true');
        }
    } else {
        // Já carregado, apenas exibe
        conteudoDiv.style.display = 'block';
        botao.textContent = 'Ocultar Artigo Completo';
        botao.setAttribute('aria-expanded', 'true');
    }
}

// Carrega um artigo HTML via fetch e insere no div
async function carregarArtigoHTML(caminho, containerDiv) {
    const response = await fetch(caminho);
    if (!response.ok) throw new Error(`HTTP ${response.status} ao buscar ${caminho}`);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const corpo = doc.body.innerHTML;
    containerDiv.innerHTML = corpo;
}

// Carrega um PDF e exibe com PDF.js (controles de página)
async function carregarArtigoPDF(caminho, containerDiv) {
    // Cria a estrutura do visualizador PDF
    containerDiv.innerHTML = `
        <div class="pdf-visualizador">
            <canvas class="pdf-canvas"></canvas>
            <div class="pdf-controls">
                <button class="prev-page" disabled>◀ Anterior</button>
                <span class="page-info">Página <span class="page-num">1</span> de <span class="page-count">?</span></span>
                <button class="next-page" disabled>Próxima ▶</button>
            </div>
        </div>
    `;

    const canvas = containerDiv.querySelector('.pdf-canvas');
    const prevBtn = containerDiv.querySelector('.prev-page');
    const nextBtn = containerDiv.querySelector('.next-page');
    const pageNumSpan = containerDiv.querySelector('.page-num');
    const pageCountSpan = containerDiv.querySelector('.page-count');

    let pdfDoc = null;
    let currentPage = 1;

    try {
        // Carrega o documento PDF
        pdfDoc = await pdfjsLib.getDocument(caminho).promise;
        pageCountSpan.textContent = pdfDoc.numPages;
        renderPage(pdfDoc, currentPage, canvas);

        // Habilita os botões de acordo com a página
        function updateButtons() {
            prevBtn.disabled = (currentPage <= 1);
            nextBtn.disabled = (currentPage >= pdfDoc.numPages);
        }
        updateButtons();

        // Eventos dos botões
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage(pdfDoc, currentPage, canvas);
                pageNumSpan.textContent = currentPage;
                updateButtons();
            }
        });
        nextBtn.addEventListener('click', () => {
            if (currentPage < pdfDoc.numPages) {
                currentPage++;
                renderPage(pdfDoc, currentPage, canvas);
                pageNumSpan.textContent = currentPage;
                updateButtons();
            }
        });
    } catch (error) {
        console.error('Erro ao carregar PDF:', error);
        containerDiv.innerHTML = `<p class="erro">❌ Não foi possível carregar o PDF. Arquivo pode estar corrompido ou caminho incorreto.</p>`;
    }
}

// Função auxiliar para renderizar uma página do PDF no canvas
async function renderPage(pdf, pageNum, canvas) {
    const page = await pdf.getPage(pageNum);
    const scale = 1.5; // Ajuste conforme desejar
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
}

// Previne injeção de HTML nos títulos e resumos
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}