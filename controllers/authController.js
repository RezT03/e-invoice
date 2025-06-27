const db = require('../db/connection');
const bcrypt = require('bcrypt');

exports.showLogin = (req, res) => {
  res.render('pages/login', { error: null });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await db.execute('SELECT * FROM admins WHERE username = ?', [username]);

  if (rows.length && await bcrypt.compare(password, rows[0].password)) {
    req.session.admin = true;
    res.redirect('/invoice/history');
  } else {
    res.render('pages/login', { error: 'Username atau password salah' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
};
