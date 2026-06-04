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