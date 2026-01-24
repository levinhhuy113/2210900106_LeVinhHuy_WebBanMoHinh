require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
const exphbs = require('express-handlebars');
const helpers = require('./helpers/helpers');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const { attachUserIfLoggedIn } = require('./middlewares/checkAuth');

const database = require('./config/database');

var app = express();


app.engine('hbs', exphbs.engine({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: [
    path.join(__dirname, 'views/partials'),
  ],
  helpers: helpers
}));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use(attachUserIfLoggedIn);
app.use("/", require("./routes/web/auth/index"));
app.use("/", require("./routes/web/user/index"));
app.use("/admin", require("./routes/web/admin/index"));
app.use("/api", require("./routes/api/index"));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

database();

module.exports = app;
