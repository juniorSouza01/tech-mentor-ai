require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const { predictIntent, initializeAI } = require('./nlp/nlpService');
const { generateResponse } = require('./nlp/responseGenerator');
const { addClient, startScheduling } = require('./services/schedulerService');

const userContexts = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('✅ Conectado ao MongoDB'))
        .catch(err => console.error('❌ Erro MongoDB:', err));
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Lógica WebSocket
wss.on('connection', ws => {
    console.log('🔌 Cliente conectado');
    addClient(ws);

    const clientId = Math.random().toString(36).substring(7);
    userContexts[clientId] = { history: [] };

    ws.send(JSON.stringify({ text: 'Olá! Sou seu TechMentor AI. Como posso te ajudar a evoluir hoje?' }));

    ws.on('message', async message => {
        try {
            const parsedMessage = JSON.parse(message);
            const userText = parsedMessage.text;
            
            userContexts[clientId].history.push({ role: 'user', text: userText });

            const aiResponseText = await processUserMessage(userText);

            ws.send(JSON.stringify({ text: aiResponseText }));
            
            userContexts[clientId].history.push({ role: 'ai', text: aiResponseText });

        } catch (error) {
            console.error('Erro no processamento:', error);
            ws.send(JSON.stringify({ text: 'Desculpe, meu cérebro neural falhou momentaneamente.' }));
        }
    });

    ws.on('close', () => console.log('🔌 Cliente desconectado'));
});

async function processUserMessage(message) {
    try {
        const { intent, entity, confidence } = await predictIntent(message);
        console.log(`🧠 Intent: [${intent}] | Conf: ${(confidence * 100).toFixed(1)}% | Entity: ${entity}`);

        if (confidence < 0.45) {
            return 'Ainda estou aprendendo e não entendi muito bem. Pode reformular com termos mais técnicos?';
        }
        return generateResponse(intent, entity);
    } catch (e) {
        console.error(e);
        return "Estou inicializando meus modelos neurais, tente novamente em alguns segundos.";
    }
}

const PORT = process.env.PORT || 3000;

initializeAI().then(() => {
    server.listen(PORT, () => {
        console.log(`\n🚀 TechMentor AI rodando em http://localhost:${PORT}`);
        startScheduling();
    });
});