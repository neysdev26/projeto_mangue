// Configurar o worker do PDF.js (DEVE SER O PRIMEIRO COMANDO)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

// Lógica para o menu lateral
document.addEventListener('DOMContentLoaded', function() {
    const abrirMenu = document.getElementById('abrir-menu');
    const fecharMenu = document.getElementById('fechar-menu');
    const menuLateral = document.getElementById('menu-lateral');

    if (abrirMenu && fecharMenu && menuLateral) {
        abrirMenu.addEventListener('click', function() {
            menuLateral.classList.add('active');
        });

        fecharMenu.addEventListener('click', function() {
            menuLateral.classList.remove('active');
        });
    }

    // Fechar menu ao clicar fora
    document.addEventListener('click', function(event) {
        if (!menuLateral.contains(event.target) && !abrirMenu.contains(event.target)) {
            menuLateral.classList.remove('active');
        }
    });

    // Verifica se existe o container de artigos e carrega-os
    if (document.getElementById('container-artigos')) {
        carregarArtigosLegado(); // Função antiga (para artigos HTML)
    }

    if (document.getElementById('artigos-lista')) {
        carregarArtigosPDF(); // Função nova (para PDFs)
    }
});

// Função antiga para carregar artigos HTML (mantida para compatibilidade)
function carregarArtigosLegado() {
    fetch('artigos.json')
        .then(response => response.json())
        .then(artigos => {
            const container = document.getElementById('container-artigos');

            if (!artigos || artigos.length === 0) {
                container.innerHTML = '<p class="mensagem-vazia">Nenhum artigo encontrado.</p>';
                return;
            }

            artigos.forEach(artigo => {
                const card = document.createElement('article');
                card.className = 'artigo-card';

                const data = new Date(artigo.dataPublicacao);
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                const dataFormatada = data.toLocaleDateString('pt-BR', options);

                card.innerHTML = `
                    <h3>${artigo.titulo}</h3>
                    <p class="data-publicacao">${dataFormatada}</p>
                    <p class="resumo">${artigo.resumo}</p>
                    <button class="btn-leia-mais" data-artigo="${artigo.conteudo}">Ler Artigo Completo</button>
                    <div class="conteudo-artigo" style="display: none;"></div>
                `;

                container.appendChild(card);
            });

            // Adiciona evento de clique aos botões
            document.querySelectorAll('.btn-leia-mais').forEach(botao => {
                botao.addEventListener('click', function() {
                    const artigoPath = this.getAttribute('data-artigo');
                    const conteudoDiv = this.nextElementSibling;

                    if (conteudoDiv.style.display === 'none') {
                        if (conteudoDiv.innerHTML === '') {
                            fetch(artigoPath)
                                .then(response => response.text())
                                .then(html => {
                                    const parser = new DOMParser();
                                    const doc = parser.parseFromString(html, 'text/html');
                                    const conteudo = doc.querySelector('body').innerHTML;
                                    conteudoDiv.innerHTML = conteudo;
                                    this.textContent = 'Ocultar Artigo';
                                    conteudoDiv.style.display = 'block';
                                });
                        } else {
                            this.textContent = 'Ocultar Artigo';
                            conteudoDiv.style.display = 'block';
                        }
                    } else {
                        this.textContent = 'Ler Artigo Completo';
                        conteudoDiv.style.display = 'none';
                    }
                });
            });
        })
        .catch(error => {
            console.error('Erro:', error);
            document.getElementById('container-artigos').innerHTML =
                '<p class="erro">Erro ao carregar artigos. Tente novamente mais tarde.</p>';
        });
}

// Função nova para carregar artigos em PDF
async function carregarArtigosPDF() {
    try {
        const response = await fetch('artigos.json');
        const artigos = await response.json();
        const artigosLista = document.getElementById('artigos-lista');

        artigos.forEach(artigo => {
            const artigoDiv = document.createElement('div');
            artigoDiv.className = 'artigo';

            // Verificar se o arquivo está corrompido
            if (artigo.corrompido) {
                artigoDiv.innerHTML = `
                    <h2>${artigo.titulo}</h2>
                    <p><strong>Autor:</strong> ${artigo.autor}</p>
                    <p><strong>Descrição:</strong> ${artigo.descricao}</p>
                    <p class="arquivo-corrompido">⚠️ Arquivo corrompido ou vazio. Não é possível exibir.</p>
                `;
            } else {
                artigoDiv.innerHTML = `
                    <h2>${artigo.titulo}</h2>
                    <p><strong>Autor:</strong> ${artigo.autor}</p>
                    <p><strong>Descrição:</strong> ${artigo.descricao}</p>
                    <p><strong>Páginas:</strong> ${artigo.paginas} | <strong>Ano:</strong> ${artigo.ano}</p>
                    <div class="pdf-container">
                        <canvas class="pdf-canvas" data-pdf="${artigo.arquivo}"></canvas>
                        <div class="pdf-controls">
                            <button class="prev-page">Página Anterior</button>
                            <span class="page-num">Página: 1</span>
                            <button class="next-page">Próxima Página</button>
                        </div>
                    </div>
                `;
            }

            artigosLista.appendChild(artigoDiv);
        });

        // Carregar os PDFs após criar os elementos HTML
        carregarPDFs();

    } catch (error) {
        console.error('Erro ao carregar artigos:', error);
        document.getElementById('artigos-lista').innerHTML = `
            <p class="erro">Erro ao carregar a lista de artigos. Tente novamente mais tarde.</p>
        `;
    }
}

// Função para carregar e exibir os PDFs
async function carregarPDFs() {
    document.querySelectorAll('.pdf-canvas').forEach(canvas => {
        const pdfPath = canvas.getAttribute('data-pdf');
        const controls = canvas.nextElementSibling;
        const pageNumSpan = controls.querySelector('.page-num');
        const prevBtn = controls.querySelector('.prev-page');
        const nextBtn = controls.querySelector('.next-page');

        let currentPage = 1;

        pdfjsLib.getDocument(pdfPath).promise.then(pdf => {
            renderPage(pdf, currentPage, canvas);

            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderPage(pdf, currentPage, canvas);
                    pageNumSpan.textContent = `Página: ${currentPage}`;
                }
            });

            nextBtn.addEventListener('click', () => {
                if (currentPage < pdf.numPages) {
                    currentPage++;
                    renderPage(pdf, currentPage, canvas);
                    pageNumSpan.textContent = `Página: ${currentPage}`;
                }
            });
        }).catch(error => {
            console.error('Erro ao carregar PDF:', error);
            canvas.parentElement.innerHTML = `
                <p class="arquivo-corrompido">⚠️ Não foi possível carregar o PDF. Arquivo corrompido ou inexistente.</p>
            `;
        });
    });
}

// Função para renderizar uma página do PDF
async function renderPage(pdf, pageNum, canvas) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    await page.render({
        canvasContext: ctx,
        viewport: viewport
    }).promise;
}