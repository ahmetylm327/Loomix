# Node.js tabanını kullan
FROM node:18-alpine

# Çalışma dizinini ayarla
WORKDIR /app

# Sadece bağımlılık dosyalarını kopyala ve yükle (hız kazandırır)
COPY package*.json ./
RUN npm install

# Projenin geri kalan kodlarını kopyala
COPY . .

# Expo'nun kullandığı 8081 portunu dışarı aç
EXPOSE 8081

# Uygulamayı web modunda başlat (Docker içinden erişimi kolaylaştırır)
CMD ["npm", "run", "web"]