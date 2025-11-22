require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const { predictIntent } = require('./nlp/nlpService');
const { generateResponse} = require('./nlp/responseGenerator');
const { addClient, startScheduling } = require('./src/services/schedulerService');

const userContexts = {};


app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'public')));

if(process.env.DB_URI) {
    mongoose.connect(process.env.DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Conectado ao mongo'))
    .catch(err => console.error('deu red com o mongo: ', err));
}


app.get('/', (req, res) => {
    res.send('TechMentor AI está na ativa');
});


//lógica do webSocket
wss.on('connection', ws => {
    console.log('cliente conectado via websocket');
    addClient(ws);

    const clientId = Math.random().toString(36).substring(7);
    userContexts[clientId] = { history: [] };

    ws.on('message', async message => {
        console.log(`recebido ${message}`);
        try{
            const userMessage = JSON.parse(message);
            const aiResponde = await processUserMessage(userMessage.text);
            ws.send(JSON.stringify({text: aiResponde}));

            userContexts[clientId].history.push({ role: 'user', text: userMessage.text });
            const aiResponse = await processUserMessage(userMessage.text, userContexts[clientId].history);
            userContexts[clientId].history.push({ role: 'ai', text: aiResponse });
            ws.send(JSON.stringify({ text: aiResponse }));
        } catch (error){
            console.error('erro ao processar mensagem do websocket: ', error);
            ws.send(JSON.stringify({text: 'desculpe, houve um erro.'}));
        }
    });

    ws.on('close', () => {
        console.log('cliente desconectado via websocket');
    });

    ws.send(JSON.stringify({text: 'Olá! Sou seu TechMentor AI. Como posso te ajudar hoje?'}));
});



const PORT = process.env.PORT || 3000;
server.LISTEN(PORT, () => {
    console.log(`Server rodando na port ${PORT}`);
    console.log(`Acesse http://localhost:${PORT}`);
    startScheduling();
});


async function processUserMessage(message) {
    console.log(`Processando mensagem: "${message}"`);
    const { intent, entity, confidence } = await predictIntent(message);
    console.log(`Intenção prevista: ${intent} (Confiança: ${confidence.toFixed(2)}), Entidade: ${entity}`);

    // Um threshold de confiança para ser mais assertivo
    if (confidence < 0.7) {
        return 'Não tenho certeza do que você quis dizer. Poderia ser mais claro?';
    }

    return generateResponse(intent, entity);
}