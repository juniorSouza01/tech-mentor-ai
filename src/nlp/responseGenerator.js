const questions = require('../../data/questions.json');
const techUpdates = require('../../data/techUpdates.json');

function generateResponse(intent, entity = null) {
    switch (intent) {
        case 'saudacao':
            return 'Olá! Como posso te ajudar a aprofundar seu conhecimento em tecnologia hoje?';
        case 'aprender_tecnologia':
            if (entity) {
                return `Ótimo! Para ${entity}, você gostaria de uma introdução, conceitos avançados ou algum tópico específico?`;
            }
            return 'Sobre qual tecnologia você quer aprender?';
        case 'atualizacao_tecnologia':
            if (entity) {
                const update = techUpdates.find(u => u.topic.toLowerCase().includes(entity.toLowerCase()));
                if (update) return `Aqui está uma atualização sobre ${entity}: ${update.content}`;
                return `Desculpe, não tenho uma atualização específica para ${entity} no momento, mas posso falar sobre o geral!`;
            }
            const randomUpdate = techUpdates[Math.floor(Math.random() * techUpdates.length)];
            return `Aqui está uma atualização tecnológica: ${randomUpdate.content}`;
        case 'fazer_pergunta':
            let filteredQuestions = questions;
            if (entity) {
                filteredQuestions = questions.filter(q => q.topic.toLowerCase().includes(entity.toLowerCase()));
            }
            if (filteredQuestions.length > 0) {
                const randomQuestion = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
                return `Aqui está uma pergunta sobre ${randomQuestion.topic}: ${randomQuestion.question}`;
            }
            return 'Não tenho uma pergunta específica para esse tópico, mas que tal esta: O que é o event loop em Node.js?';
        case 'agradecimento':
            return 'De nada! Fico feliz em ajudar.';
        default:
            return 'Desculpe, não entendi. Você pode reformular sua pergunta ou me pedir algo mais específico?';
    }
}

module.exports = { generateResponse };