const tf = require('@tensorflow/tfjs');
const tfnode = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');
const fs = require('fs');
const path = require('path');

let encoder = null;
let model = null;
let intents = [];
let labels = [];

const INTENTS_FILE_PATH = path.join(__dirname, '../../data/intents.json');
const MODEL_DIR = path.join(__dirname, '../models/intent_classifier');
const MODEL_SAVE_PATH = `file://${MODEL_DIR}`;

function loadIntentsData() {
    const rawData = fs.readFileSync(INTENTS_FILE_PATH);
    intents = JSON.parse(rawData);
    labels = [...new Set(intents.map(item => item.intent))];
}

async function trainModel() {
    console.log('🚀 Iniciando treinamento do modelo...');
    loadIntentsData();

    const sentences = intents.map(item => item.text);
    const y_labels = intents.map(item => labels.indexOf(item.intent));

    console.log('📊 Carregando Universal Sentence Encoder...');
    encoder = await use.load();
    
    console.log('🧮 Gerando embeddings...');
    const embeddings = await encoder.embed(sentences);
    
    model = tf.sequential();
    model.add(tf.layers.dense({
        inputShape: [512], 
        units: 128, 
        activation: 'relu'
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: labels.length, activation: 'softmax'}));

    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
    });

    const ys = tf.oneHot(tf.tensor1d(y_labels, 'int32'), labels.length);

    await model.fit(embeddings, ys, {
        epochs: 60,
        batchSize: 8,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, log) => {
                if ((epoch + 1) % 10 === 0) console.log(`Epoch ${epoch + 1}: loss = ${log.loss.toFixed(4)}`);
            }
        }
    });

    console.log('💾 Salvando modelo...');
    await model.save(MODEL_SAVE_PATH);
}

async function initializeAI() {
    try {
        if (fs.existsSync(path.join(MODEL_DIR, 'model.json'))) {
            console.log('📂 Carregando modelo existente do disco...');
            encoder = await use.load();
            model = await tf.loadLayersModel(`${MODEL_SAVE_PATH}/model.json`);
            loadIntentsData();
            console.log('✅ IA Inicializada (Modelo Carregado).');
        } else {
            console.log('⚠️ Modelo não encontrado. Iniciando treinamento...');
            await trainModel();
            console.log('✅ IA Inicializada (Novo Modelo Treinado).');
        }
    } catch (error) {
        console.error('❌ Erro crítico na IA:', error);
        await trainModel();
    }
}

async function predictIntent(text) {
    if (!model || !encoder) throw new Error("IA não está pronta ainda.");

    const embedding = await encoder.embed([text]);
    const prediction = model.predict(embedding);
    const intentIndex = prediction.argMax(-1).dataSync()[0];
    const confidence = prediction.dataSync()[intentIndex];
    const predictedIntent = labels[intentIndex];

    let entity = null;
    const lowerText = text.toLowerCase();
    
    const exactMatch = intents.find(i => i.text.toLowerCase() === lowerText && i.entity);
    if (exactMatch) entity = exactMatch.entity;
    
     if (!entity) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('nodejs') || lowerText.includes('node.js')) entity = 'Node.js';
        else if (lowerText.includes('ia') || lowerText.includes('inteligencia artificial')) entity = 'Inteligência Artificial';
        else if (lowerText.includes('javascript') || lowerText.includes('js')) entity = 'JavaScript';
        else if (lowerText.includes('reconhecimento facial')) entity = 'reconhecimento facial';
        else if (lowerText.includes('leitura de placa')) entity = 'leitura de placa';
        else if (lowerText.includes('supermemory')) entity = 'supermemory';
    }

    return { intent: predictedIntent, entity, confidence };
}

module.exports = { predictIntent, initializeAI };