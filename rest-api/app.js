const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Loomix API Sunucusu Calisiyor! - Ahmet Yilmaz');
});

const PORT = 9000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla başlatıldı`);
});