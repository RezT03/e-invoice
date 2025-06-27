const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const invoiceRoutes = require('./routes/invoice');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_key',
  resave: false,
  saveUninitialized: true
}));

app.use('/invoice', invoiceRoutes);
app.use('/admin', authRoutes);

app.get('/', (req, res) => {
  res.redirect('/admin/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
