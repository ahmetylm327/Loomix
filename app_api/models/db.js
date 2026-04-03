const mongoose = require('mongoose');
require('dotenv').config();

const dbURI = process.env.MONGODB_URI;

mongoose.connect(dbURI);

mongoose.connection.on('connected', () => {
    console.log('Mongoose veritabanına başarıyla bağlandı.');
});

mongoose.connection.on('error', (err) => {
    console.log('Mongoose bağlantı hatası: ' + err);
});

require('./personel');
require('./mesai');
require('./odeme');
require('./cari');
require('./urun');
require('./uretim');
require('./kullanici');