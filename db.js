
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'Controle de Estoque',
    user: 'postgres',
    password: 'danoninho123'
});

module.exports = pool;
