
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = require('./db');

// Testar conexão com o PostgreSQL
pool.query('SELECT NOW()')
    .then(resultado => {
        console.log('Conectado ao PostgreSQL!');
        console.log(resultado.rows[0]);
    })
    .catch(erro => {
        console.log('Erro ao conectar:', erro.message);
    });

// Rota inicial
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

// GET - Listar categorias
app.get('/categorias', async (req, res) => {
    try {
        const resultado = await pool.query(
            'SELECT * FROM categorias ORDER BY nome'
        );

        res.json(resultado.rows);

    } catch (erro) {
        console.error(erro);

        res.status(500).json({
            erro: 'Erro ao buscar categorias'
        });
    }
});


 // POST - Cadastrar categoria
app.post('/categorias', async (req, res) => {
    const { nome } = req.body;

    if (!nome || !nome.trim()) {
        return res.status(400).json({
            erro: 'O nome da categoria é obrigatório'
        });
    }

    try {
        const resultado = await pool.query(
            'INSERT INTO categorias (nome) VALUES ($1) RETURNING *',
            [nome.trim()]
        );

        res.status(201).json(resultado.rows[0]);

    } catch (erro) {
        console.error(erro);

        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Já existe uma categoria com esse nome'
            });
        }

        res.status(500).json({
            erro: 'Erro ao cadastrar categoria'
        });
    }
});


 // PUT - Atualizar categoria
app.put('/categorias/:id', async (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;

    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
            erro: 'ID inválido'
        });
    }

    if (!nome || !nome.trim()) {
        return res.status(400).json({
            erro: 'O nome da categoria é obrigatório'
        });
    }

    try {
        const resultado = await pool.query(
            'UPDATE categorias SET nome = $1 WHERE id = $2 RETURNING *',
            [nome.trim(), id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Categoria não encontrada'
            });
        }

        res.json(resultado.rows[0]);

    } catch (erro) {
        console.error(erro);

        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Já existe uma categoria com esse nome'
            });
        }

        res.status(500).json({
            erro: 'Erro ao atualizar categoria'
        });
    }
});



 // DELETE - Excluir categoria
app.delete('/categorias/:id', async (req, res) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
            erro: 'ID inválido'
        });
    }

    try {
        const resultado = await pool.query(
            'DELETE FROM categorias WHERE id = $1 RETURNING *',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Categoria não encontrada'
            });
        }

        res.json({
            mensagem: 'Categoria excluída com sucesso',
            categoria: resultado.rows[0]
        });

    } catch (erro) {
        console.error(erro);

        if (erro.code === '23503') {
            return res.status(409).json({
                erro: 'Não é possível excluir esta categoria porque existem produtos vinculados a ela'
            });
        }

        res.status(500).json({
            erro: 'Erro ao excluir categoria'
        });
    }
});






// GET - Listar produtos
app.get('/produtos', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                produtos.id,
                produtos.nome,
                produtos.preco,
                produtos.quantidade,
                categorias.nome AS categoria
            FROM produtos
            INNER JOIN categorias
                ON produtos.categoria_id = categorias.id
        `);

        res.json(resultado.rows);

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: 'Erro ao buscar produtos'
        });
    }
});

// GET - Buscar um produto específico pelo ID
app.get('/produtos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                erro: 'ID deve ser um número inteiro positivo'
            });
        }

        const resultado = await pool.query(
            `SELECT
                produtos.id,
                produtos.nome,
                produtos.preco,
                produtos.quantidade,
                categorias.nome AS categoria
            FROM produtos
            INNER JOIN categorias
                ON produtos.categoria_id = categorias.id
            WHERE produtos.id = $1`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado'
            });
        }

        res.json(resultado.rows[0]);

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: 'Erro ao buscar produto'
        });
    }
});

// POST - Cadastrar produto
app.post('/produtos', async (req, res) => {
    try {
        const { nome, preco, quantidade, categoria_id } = req.body;

        const categoria = await pool.query(
    'SELECT id FROM categorias WHERE id = $1',
    [categoria_id]
);

if (categoria.rows.length === 0) {
    return res.status(400).json({
        erro: 'Categoria não encontrada'
    });
}

if (
    typeof nome !== 'string' ||
    nome.trim() === '' ||
    preco == null ||
    quantidade == null ||
    categoria_id == null
) {
    return res.status(400).json({
        erro: 'Preencha todos os campos corretamente'
    });
}

    if (
        !Number.isFinite(Number(preco)) ||
        !Number.isFinite(Number(quantidade)) ||
        Number(preco) < 0 ||
        Number(quantidade) < 0
) {
        return res.status(400).json({
            erro: 'Preço e quantidade devem ser números não negativos'
        });
}

    if (
        !Number.isInteger(Number(quantidade)) ||
        !Number.isInteger(Number(categoria_id)) ||
        Number(categoria_id) <= 0
) {
        return res.status(400).json({
            erro: 'Quantidade e categoria devem ser números inteiros válidos'
        });
}

        const resultado = await pool.query(
            `INSERT INTO produtos (nome, preco, quantidade, categoria_id)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [nome, preco, quantidade, categoria_id]
        );

        res.status(201).json(resultado.rows[0]);

} catch (erro) {
    console.error(erro);

    if (erro.code === '23505') {
        return res.status(409).json({
            erro: 'Já existe uma categoria com esse nome'
        });
    }

    res.status(500).json({
        erro: 'Erro ao cadastrar categoria'
    });
}
});

// PUT - Atualizar produto pelo ID
app.put('/produtos/:id', async (req, res) => {

    try {
        const { id } = req.params;
        if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({
        erro: 'ID deve ser um número inteiro positivo'
    });
}
        const { nome, preco, quantidade, categoria_id } = req.body;


        if (!nome || preco == null || quantidade == null || !categoria_id) {
            return res.status(400).json({
                erro: 'Preencha todos os campos'
            });
        }

        if (preco < 0 || quantidade < 0) {
            return res.status(400).json({
                erro: 'Preço e quantidade não podem ser negativos'
            });
        }
    const categoria = await pool.query(
    'SELECT id FROM categorias WHERE id = $1',
    [categoria_id]
);

if (categoria.rows.length === 0) {
    return res.status(400).json({
        erro: 'Categoria não encontrada'
    });
}

        const resultado = await pool.query(
            `UPDATE produtos
             SET nome = $1,
                 preco = $2,
                 quantidade = $3,
                 categoria_id = $4
             WHERE id = $5
             RETURNING *`,
            [nome, preco, quantidade, categoria_id, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado'
            });
        }

        res.json(resultado.rows[0]);

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: 'Erro ao atualizar produto'
        });
    }
});

// DELETE - Excluir produto pelo ID
app.delete('/produtos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({
        erro: 'ID deve ser um número inteiro positivo'
    });
}

        const resultado = await pool.query(
            'DELETE FROM produtos WHERE id = $1 RETURNING *',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado'
            });
        }

        res.json({
            mensagem: 'Produto excluído com sucesso',
            produto: resultado.rows[0]
        });

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: 'Erro ao excluir produto'
        });
    }
});

// GET - Listar movimentações
app.get('/movimentacoes', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                movimentacoes.id,
                produtos.nome AS produto,
                movimentacoes.tipo,
                movimentacoes.quantidade,
                movimentacoes.data_movimentacao
            FROM movimentacoes
            INNER JOIN produtos
                ON movimentacoes.produto_id = produtos.id
            ORDER BY movimentacoes.id DESC
        `);

        res.json(resultado.rows);

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: 'Erro ao buscar movimentações'
        });
    }
});

// POST - Registrar entrada ou saída de estoque
app.post('/movimentacoes', async (req, res) => {
    const cliente = await pool.connect();

    try {
        const { produto_id, tipo, quantidade } = req.body;

        if (
            !Number.isInteger(Number(produto_id)) ||
            Number(produto_id) <= 0 ||
            !Number.isInteger(Number(quantidade)) ||
            Number(quantidade) <= 0 ||
            !['entrada', 'saida'].includes(tipo)
        ) {
            return res.status(400).json({
                erro: 'Informe um produto válido, o tipo entrada ou saida e uma quantidade inteira positiva'
            });
        }

        await cliente.query('BEGIN');

        const produto = await cliente.query(
            'SELECT id, quantidade FROM produtos WHERE id = $1 FOR UPDATE',
            [produto_id]
        );

        if (produto.rows.length === 0) {
            await cliente.query('ROLLBACK');

            return res.status(404).json({
                erro: 'Produto não encontrado'
            });
        }

        const estoqueAtual = produto.rows[0].quantidade;

        if (tipo === 'saida' && estoqueAtual < quantidade) {
            await cliente.query('ROLLBACK');

            return res.status(400).json({
                erro: 'Estoque insuficiente'
            });
        }

        const alteracao = tipo === 'entrada'
            ? quantidade
            : -quantidade;

        await cliente.query(
            `UPDATE produtos
             SET quantidade = quantidade + $1
             WHERE id = $2`,
            [alteracao, produto_id]
        );

        const movimentacao = await cliente.query(
            `INSERT INTO movimentacoes (produto_id, tipo, quantidade)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [produto_id, tipo, quantidade]
        );

        await cliente.query('COMMIT');

        res.status(201).json({
            mensagem: 'Movimentação registrada com sucesso',
            movimentacao: movimentacao.rows[0]
        });

    } catch (erro) {
        await cliente.query('ROLLBACK');

        console.error(erro);

        res.status(500).json({
            erro: 'Erro ao registrar movimentação'
        });

    } finally {
        cliente.release();
    }
});

// GET - Relatório de valor do estoque
app.get('/relatorios/estoque', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                nome,
                preco,
                quantidade,
                preco * quantidade AS valor_em_estoque
            FROM produtos
            ORDER BY nome
        `);

        res.json(resultado.rows);

    } catch (erro) {
        console.error(erro);

        res.status(500).json({
            erro: 'Erro ao gerar relatório de estoque'
        });
    }
});

// GET - Resumo geral do estoque
app.get('/relatorios/resumo', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                COUNT(*) AS total_produtos,
                COALESCE(SUM(quantidade), 0) AS unidades_em_estoque,
                COALESCE(SUM(preco * quantidade), 0) AS valor_total_estoque
            FROM produtos
        `);

        res.json(resultado.rows[0]);

    } catch (erro) {
        console.error(erro);

        res.status(500).json({
            erro: 'Erro ao gerar resumo do estoque'
        });
    }
});

// GET - Produtos com estoque baixo
app.get('/relatorios/estoque-baixo', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                nome,
                quantidade
            FROM produtos
            WHERE quantidade < 10
            ORDER BY quantidade ASC
        `);

        res.json(resultado.rows);

    } catch (erro) {
        console.error(erro);

        res.status(500).json({
            erro: 'Erro ao consultar produtos com estoque baixo'
        });
    }
});

// Iniciar servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
