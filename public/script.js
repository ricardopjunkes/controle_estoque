
const mensagemDashboard = document.getElementById('mensagemDashboard');
const tabela = document.getElementById('tabelaProdutos');

const botaoNovoProduto = document.getElementById('botaoNovoProduto');
const botaoCancelarProduto = document.getElementById('botaoCancelarProduto');
const formularioProduto = document.getElementById('formularioProduto');
const formNovoProduto = document.getElementById('formNovoProduto');
const campoCategoria = document.getElementById('categoriaProduto');
const mensagemProduto = document.getElementById('mensagemProduto');

const formularioEdicao = document.getElementById('formularioEdicao');
const formEditarProduto = document.getElementById('formEditarProduto');
const botaoCancelarEdicao = document.getElementById('botaoCancelarEdicao');
const campoCategoriaEdicao = document.getElementById('editarCategoriaProduto');
const mensagemEdicao = document.getElementById('mensagemEdicao');

const pesquisaProdutos = document.getElementById('pesquisaProdutos');

let produtosCarregados = [];
let categoriasCarregadas = [];
let produtosComEstoqueBaixo = [];

// Formata valores em reais.
function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Carrega categorias para os formulários.
async function carregarCategorias() {
    const resposta = await fetch('/categorias');

    if (!resposta.ok) {
        throw new Error('Não foi possível carregar as categorias.');
    }

    categoriasCarregadas = await resposta.json();

    preencherCategorias(campoCategoria);
    preencherCategorias(campoCategoriaEdicao);
}

function preencherCategorias(campo) {
    campo.innerHTML = '';

    const opcaoInicial = document.createElement('option');
    opcaoInicial.value = '';
    opcaoInicial.textContent = 'Selecione uma categoria';
    campo.appendChild(opcaoInicial);

    categoriasCarregadas.forEach(categoria => {
        const opcao = document.createElement('option');
        opcao.value = categoria.id;
        opcao.textContent = categoria.nome;
        campo.appendChild(opcao);
    });
}

// Carrega os dados do dashboard e da tabela.
async function carregarDashboard() {
    mensagemDashboard.textContent = '';

    try {
        const [resProdutos, resCategorias, resEstoqueBaixo] =
            await Promise.all([
                fetch('/produtos'),
                fetch('/categorias'),
                fetch('/relatorios/estoque-baixo')
            ]);

        if (!resProdutos.ok || !resCategorias.ok || !resEstoqueBaixo.ok) {
            throw new Error('Não foi possível carregar os dados.');
        }

        produtosCarregados = await resProdutos.json();
        categoriasCarregadas = await resCategorias.json();

        const estoqueBaixo = await resEstoqueBaixo.json();

        produtosComEstoqueBaixo = Array.isArray(estoqueBaixo)
            ? estoqueBaixo
            : [];

        document.getElementById('totalProdutos').textContent =
            produtosCarregados.length;

        document.getElementById('totalCategorias').textContent =
            categoriasCarregadas.length;

        const totalUnidades = produtosCarregados.reduce((total, produto) => {
            return total + Number(produto.quantidade || 0);
        }, 0);

        document.getElementById('totalUnidades').textContent = totalUnidades;

        document.getElementById('estoqueBaixo').textContent =
            produtosComEstoqueBaixo.length;

        renderizarProdutos();

    } catch (erro) {
        console.error('Erro ao carregar dashboard:', erro);

        mensagemDashboard.textContent =
            'Não foi possível carregar os dados. Confira se o servidor está funcionando.';

        tabela.innerHTML = `
            <tr>
                <td colspan="6" class="loading">
                    Erro ao carregar os produtos.
                </td>
            </tr>
        `;
    }
}

// Verifica se o produto aparece na lista de estoque baixo.
function produtoEstaComEstoqueBaixo(produto) {
    return produtosComEstoqueBaixo.some(item =>
        String(item.id) === String(produto.id)
    );
}

// Renderiza a tabela e aplica a pesquisa.
function renderizarProdutos() {
    const termo = pesquisaProdutos.value.trim().toLowerCase();

    const produtosFiltrados = produtosCarregados.filter(produto =>
        String(produto.nome || '').toLowerCase().includes(termo)
    );

    tabela.innerHTML = '';

    if (produtosFiltrados.length === 0) {
        const linha = document.createElement('tr');
        const celula = document.createElement('td');

        celula.colSpan = 6;
        celula.className = 'loading';
        celula.textContent = produtosCarregados.length === 0
            ? 'Nenhum produto cadastrado.'
            : 'Nenhum produto encontrado.';

        linha.appendChild(celula);
        tabela.appendChild(linha);
        return;
    }

    produtosFiltrados.forEach(produto => {
        const linha = document.createElement('tr');

        const nome = document.createElement('td');
        nome.textContent = produto.nome;

        const categoria = document.createElement('td');
        categoria.textContent = produto.categoria || 'Sem categoria';

        const preco = document.createElement('td');
        preco.textContent = formatarPreco(produto.preco);

        const quantidade = document.createElement('td');
        quantidade.textContent = produto.quantidade;

        const status = document.createElement('td');
        const estoqueBaixo = produtoEstaComEstoqueBaixo(produto);

        const etiqueta = document.createElement('span');
        etiqueta.className = estoqueBaixo
            ? 'status-badge status-low'
            : 'status-badge status-ok';
        etiqueta.textContent = estoqueBaixo ? 'Estoque baixo' : 'Normal';

        status.appendChild(etiqueta);

        const acoes = document.createElement('td');

        const botaoEditar = document.createElement('button');
        botaoEditar.type = 'button';
        botaoEditar.className = 'secondary-button action-button';
        botaoEditar.textContent = 'Editar';
        botaoEditar.addEventListener('click', () => abrirEdicao(produto));

        const botaoExcluir = document.createElement('button');
        botaoExcluir.type = 'button';
        botaoExcluir.className = 'delete-button action-button';
        botaoExcluir.textContent = 'Excluir';
        botaoExcluir.addEventListener('click', () => excluirProduto(produto));

        acoes.append(botaoEditar, botaoExcluir);
        linha.append(nome, categoria, preco, quantidade, status, acoes);
        tabela.appendChild(linha);
    });
}

// Pesquisa em tempo real.
pesquisaProdutos.addEventListener('input', renderizarProdutos);

// Abre o formulário de cadastro.
botaoNovoProduto.addEventListener('click', async () => {
    formularioEdicao.hidden = true;
    formularioProduto.hidden = false;
    mensagemProduto.textContent = '';

    try {
        await carregarCategorias();

        if (categoriasCarregadas.length === 0) {
            mensagemProduto.textContent =
                'Cadastre uma categoria antes de cadastrar um produto.';
        }
    } catch (erro) {
        mensagemProduto.textContent = erro.message;
    }
});

// Fecha o formulário de cadastro.
botaoCancelarProduto.addEventListener('click', () => {
    formularioProduto.hidden = true;
    formNovoProduto.reset();
    mensagemProduto.textContent = '';
});

// Cadastra um produto.
formNovoProduto.addEventListener('submit', async evento => {
    evento.preventDefault();
    mensagemProduto.textContent = 'Salvando produto...';

    const produto = {
        nome: document.getElementById('nomeProduto').value.trim(),
        preco: Number(document.getElementById('precoProduto').value),
        quantidade: Number(
            document.getElementById('quantidadeProduto').value
        ),
        categoria_id: Number(campoCategoria.value)
    };

    if (!produto.nome || !produto.categoria_id) {
        mensagemProduto.textContent =
            'Preencha todos os campos e selecione uma categoria.';
        return;
    }

    try {
        const resposta = await fetch('/produtos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(produto)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Não foi possível cadastrar.');
        }

        formNovoProduto.reset();
        await carregarDashboard();

        mensagemProduto.textContent = 'Produto cadastrado com sucesso!';
        mensagemProduto.classList.add('message-success');
    } catch (erro) {
        console.error('Erro ao cadastrar produto:', erro);
        mensagemProduto.textContent = erro.message;
        mensagemProduto.classList.remove('message-success');
    }
});

// Abre o formulário de edição.
async function abrirEdicao(produto) {
    formularioProduto.hidden = true;
    formularioEdicao.hidden = false;
    mensagemEdicao.textContent = '';

    try {
        await carregarCategorias();

        document.getElementById('editarProdutoId').value = produto.id;
        document.getElementById('editarNomeProduto').value = produto.nome;
        document.getElementById('editarPrecoProduto').value = produto.preco;
        document.getElementById('editarQuantidadeProduto').value =
            produto.quantidade;

        campoCategoriaEdicao.value =
            produto.categoria_id ?? produto.categoriaId ?? '';

        formularioEdicao.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    } catch (erro) {
        mensagemEdicao.textContent = erro.message;
    }
}

// Fecha o formulário de edição.
botaoCancelarEdicao.addEventListener('click', () => {
    formularioEdicao.hidden = true;
    formEditarProduto.reset();
    mensagemEdicao.textContent = '';
});

// Salva alterações do produto.
formEditarProduto.addEventListener('submit', async evento => {
    evento.preventDefault();
    mensagemEdicao.textContent = 'Salvando alterações...';

    const id = document.getElementById('editarProdutoId').value;

    const produto = {
        nome: document.getElementById('editarNomeProduto').value.trim(),
        preco: Number(document.getElementById('editarPrecoProduto').value),
        quantidade: Number(
            document.getElementById('editarQuantidadeProduto').value
        ),
        categoria_id: Number(campoCategoriaEdicao.value)
    };

    if (!produto.nome || !produto.categoria_id) {
        mensagemEdicao.textContent =
            'Preencha todos os campos e selecione uma categoria.';
        return;
    }

    try {
        const resposta = await fetch(`/produtos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(produto)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Não foi possível editar.');
        }

        await carregarDashboard();
        formularioEdicao.hidden = true;
        formEditarProduto.reset();
        mensagemDashboard.textContent = 'Produto atualizado com sucesso!';
    } catch (erro) {
        console.error('Erro ao editar produto:', erro);
        mensagemEdicao.textContent = erro.message;
    }
});

// Exclui um produto após confirmação.
async function excluirProduto(produto) {
    const confirmar = window.confirm(
        `Deseja realmente excluir o produto "${produto.nome}"?`
    );

    if (!confirmar) {
        return;
    }

    try {
        const resposta = await fetch(`/produtos/${produto.id}`, {
            method: 'DELETE'
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Não foi possível excluir.');
        }

        await carregarDashboard();
        mensagemDashboard.textContent = 'Produto excluído com sucesso!';
    } catch (erro) {
        console.error('Erro ao excluir produto:', erro);
        mensagemDashboard.textContent = erro.message;
    }
}

// Atualiza a tabela pelo botão.
document.getElementById('atualizarDashboard')
    .addEventListener('click', carregarDashboard);

// Carrega os dados ao abrir a página.
carregarDashboard();
