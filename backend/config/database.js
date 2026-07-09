const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const getDatabaseConfig = () => {
  const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;

  if (connectionUrl) {
    return connectionUrl;
  }

  const isLocalDatabase = ['localhost', '127.0.0.1'].includes(process.env.DB_HOST);
  const port = process.env.DB_PORT || (isLocalDatabase ? 3306 : undefined);

  if (!port) {
    console.error(
      'Konfigurasi database belum lengkap: DB_PORT wajib diisi untuk host database non-lokal.',
    );
    return null;
  }

  return {
    host: process.env.DB_HOST,
    port: Number(port),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000,
  };
};

const databaseConfig = getDatabaseConfig();
const db = databaseConfig
  ? mysql.createPool(databaseConfig)
  : {
      query(sql, values, callback) {
        const handler = typeof values === 'function' ? values : callback;
        handler(new Error('Konfigurasi database belum lengkap. Isi DB_PORT terlebih dahulu.'));
      },
    };

if (databaseConfig) {
  db.getConnection((err, connection) => {
    if (err) {
      console.error('Koneksi database gagal:', err.message);

      if (err.code === 'ETIMEDOUT') {
        console.error('Periksa DB_HOST dan DB_PORT. Untuk Railway, gunakan host dan port dari Public Networking.');
      }

      return;
    }

    console.log('Berhasil terhubung ke database MySQL');
    connection.release();
  });
}


module.exports = db;
