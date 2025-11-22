require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());


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

    ws.on('message', async message => {
        console.log(`recebido ${message}`);
        try{
            const userMessage = JSON.parse(message);
            const aiResponde = await processUserMessage(userMessage.text);
            ws.send(JSON.stringify({text: aiResponde}));
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
});



//função mock temporária

async function processUserMessage(message){
    if(message.toLowerCase().includes('Olá')){
        return 'Olá! Em que tópico de tecnologia você gostaria de se aprofundar hoje?';
    }
    if(message.toLowerCase().includes('ia')){
        return 'IA é um campo fascinante! Você quer saber sobre Machine Learning, Deep Learning ou Redes Neurais?';
    }
    return `Você disse: "${message}". Estou aprendendo a processar isso.`;
}