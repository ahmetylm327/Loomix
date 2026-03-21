const express = require('express');
require('./app_api/models/db');
const apiRouter = require('./app_api/routers/index');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api', apiRouter);

const PORT = 9000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});