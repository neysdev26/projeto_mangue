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

    // Lógica original para carregar artigos
    if (document.getElementById('container-artigos')) {
        carregarArtigos();
    }
});

// Função original para carregar artigos mantida intacta
function carregarArtigos() {
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

// Configurar o worker do PDF.js (necessário para processamento)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

// Função para carregar o PDF
async function loadPDF(pdfPath) {
  // Carregar o PDF
  const loadingTask = pdfjsLib.getDocument(pdfPath);
  const pdf = await loadingTask.promise;

  // Configurações iniciais
  let currentPage = 1;
  const canvas = document.getElementById('pdf-canvas');
  const ctx = canvas.getContext('2d');
  const pageNumSpan = document.getElementById('page-num');

  // Renderizar a primeira página
  renderPage(pdf, currentPage, canvas, ctx);

  // Botões de navegação
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage(pdf, currentPage, canvas, ctx);
      pageNumSpan.textContent = `Página: ${currentPage}`;
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    if (currentPage < pdf.numPages) {
      currentPage++;
      renderPage(pdf, currentPage, canvas, ctx);
      pageNumSpan.textContent = `Página: ${currentPage}`;
    }
  });
}

// Função para renderizar uma página do PDF
async function renderPage(pdf, pageNum, canvas, ctx) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });

  // Ajustar o tamanho do canvas
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // Renderizar a página no canvas
  await page.render({
    canvasContext: ctx,
    viewport: viewport
  }).promise;
}

// Carregar o PDF quando a página for carregada
window.addEventListener('DOMContentLoaded', () => {
  // Substitua pelo caminho do seu PDF
  loadPDF('assets/artigos/Power_BI.pdf');
});