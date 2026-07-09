const db = require('../config/database');

exports.getBuku = (req, res) => {
  const sql = 'SELECT * FROM buku';

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: 'Gagal mengambil data buku',
        error: err,
      });
    }

    res.json(results);
  });
};
