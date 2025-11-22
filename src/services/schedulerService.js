const cron = require('node-cron');
const WebSocket = require('ws');
const questions = require('../../data/questions.json');
const techUpdates = require('../../data/techUpdates.json');

const clients = new Set();


function addClient(ws) {
    clients.add(ws);
    console.log('Novo cliente adicionado ao agendamento.');

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Cliente desconectado e removido do agendamento.');
    });
}

function broadcast(data) {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function startScheduling() {
    console.log('Iniciando agendamento de mensagens (Cron Jobs)...');
    cron.schedule('*/5 * * * *', () => {
        if (clients.size > 0) {
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
            const message = `Hora de praticar! ${randomQuestion.question}`;
            
            broadcast({
                text: message, 
                type: 'scheduled_question',
                topic: randomQuestion.topic
            });
            
            console.log(`Pergunta enviada para ${clients.size} cliente(s).`);
        }
    });

    cron.schedule('*/10 * * * *', () => {
        if (clients.size > 0) {
            const randomUpdate = techUpdates[Math.floor(Math.random() * techUpdates.length)];
            const message = `Fique por dentro: ${randomUpdate.content}`;
            
            broadcast({
                text: message, 
                type: 'scheduled_update',
                topic: randomUpdate.topic
            });

            console.log(`Atualização enviada para ${clients.size} cliente(s).`);
        }
    });
}

module.exports = {
    addClient,
    startScheduling,
};