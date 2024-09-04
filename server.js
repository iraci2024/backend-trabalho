// server.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const cors = require('cors');
const File = require('./models/File');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Conexão com MongoDB
mongoose.connect('mongodb://localhost:27017/fileUploads', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB conectado!'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Configuração do Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: async (req, file, cb) => {
        const randomName = crypto.randomBytes(12).toString('hex');
        const extension = path.extname(file.originalname);
        const fileName = `${randomName}${extension}`;

        // Salva no MongoDB
        await File.create({
            originalName: file.originalname,
            fileName: fileName,
        });

        cb(null, fileName);
    }
});

const upload = multer({ storage });

// Rota para upload de arquivos
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ fileName: req.file.filename, url: `/uploads/${req.file.filename}` });
});

// Servir arquivos e contar downloads
app.get('/uploads/:fileName', async (req, res) => {
    const fileName = req.params.fileName;
    const fileRecord = await File.findOne({ fileName });

    if (fileRecord) {
        fileRecord.downloadCount++;
        await fileRecord.save();

        res.sendFile(path.join(__dirname, 'uploads', fileName));
    } else {
        res.status(404).send('Arquivo não encontrado');
    }
});

// Rota para retornar o contador de downloads
app.get('/download-count/:fileName', async (req, res) => {
    const fileName = req.params.fileName;
    const fileRecord = await File.findOne({ fileName });

    if (fileRecord) {
        res.json({ fileName, count: fileRecord.downloadCount });
    } else {
        res.status(404).send('Arquivo não encontrado');
    }
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
