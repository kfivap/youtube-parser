// Импортировать модуль mongoose
var mongoose = require('mongoose');

// Установим подключение по умолчанию
var mongoDB = 'mongodb://127.0.0.1/youtube';
mongoose.connect(mongoDB);
// Позволим Mongoose использовать глобальную библиотеку промисов
mongoose.Promise = global.Promise;
// Получение подключения по умолчанию
var db = mongoose.connection;

// Привязать подключение к событию ошибки  (получать сообщения об ошибках подключения)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

module.exports = db