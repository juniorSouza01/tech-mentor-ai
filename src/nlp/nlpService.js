const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
const use = require('@tensorflow-model/universal-sentence-encoder');
const fs = require('fs');
const path = require('path');

let encoder;
let intents;
let labels;
let model;

const INTENTS_FILE_PATH = path.join(__dirname, '../../intents.json'); 
const MODEL_SAVE_PATH = 'file://./src/models/intent_classifier';
const MODEL_LOAD_PATH = 'file://./src/models/intent_classifier/model.json';


async function loadDataAndTrain() {
    console.log('Carregando dados de intenções...');
    
    const rawData = fs.readFileSync(INTENTS_FILE_PATH);
    intents = JSON.parse(rawData);

    const sentences = intents.map(item => item.text);
    labels = [...new Set(intents.map(item => item.intent))]; 
    
    const y_labels = intents.map(item => labels.indexOf(item.intent));

    console.log('Carregando Universal Sentence Encoder...');
    encoder = await use.load();
    console.log('Encoder carregado.');

    console.log('Gerando embeddings para as sentenças de treinamento...');
    const embeddings = await encoder.embed(sentences);
    const xs = embeddings;
    const ys = tf.oneHot(tf.tensor1d(y_labels, 'int32'), labels.length);


    console.log('Construindo modelo de classificação de intenção...');
    model = tf.sequential();
    model.add(tf.layers.dense({inputShape: [xs.shape[1]], units: 128, activation: 'relu'}));
    model.add(tf.layers.dense({ units: labels.length, activation: 'softmax'}));


    model.compile({
        optimizer: tf.train.adam(),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
    });

    console.log('Iniciando treinamento do modelo de intenção');
    await model.fit(xs, ys, {
        epochs: 50,
        batchSize: 16,
        callbacks: {
            onEpochEnd: (epoch, log) => {
                console.log(`Epoch ${epoch + 1}: loss = ${log.loss.toFixed(4)}, accuracy = ${log.acc.toFixed(4)}`);
            }
        }
    });

    console.log('Modelo de intenção treinado com sucesso!');
    await model.save(MODEL_SAVE_PATH); 
    console.log('Modelo de intenção salvo.')

}


async function loadModelAndEncoder() {
    console.log('Carregando modelo de intenção e encoder...');
    encoder = await use.load();
    model = await tf.loadLayersModel(MODEL_LOAD_PATH); 

    const rawData = fs.readFileSync(INTENTS_FILE_PATH); 
    intents = JSON.parse(rawData);
    labels = [...new Set(intents.map(item => item.intent))];
    console.log('Modelo e encoder carregados.');
}


async function predictIntent(text){
    if (!model){
        console.warn('Modelo não carregado. Tentando carregar...');
        await loadDataAndTrain(); 
    }
    if(!encoder){
        console.warn("Encoder não carregado. Tentando carregar...");
        await loadModelAndEncoder();
    }

    const embedding = await encoder.embed([text]);
    const prediction = model.predict(embedding);
    const intentIndex = prediction.argMax(-1).dataSync()[0];
    const confidence = prediction.dataSync()[intentIndex];
    const predictedIntent = labels[intentIndex];

    let entity = null;
    
    for (const item of intents) {
        if (item.text === text && item.entity) {
            entity = item.entity;
            break;
        }
    }
    
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


(async () => {
    const localModelPath = path.join(__dirname, './src/models/intent_classifier/model.json');

    if (fs.existsSync(localModelPath)) {
        try {
            await loadModelAndEncoder();
            console.log("Modelo de intenção carregado do disco.");
        } catch (error) {
            console.warn("Erro ao carregar o modelo, mesmo com o arquivo existente. Tentando treinar novo modelo...");
            await loadDataAndTrain();
        }
    } else {
        console.warn("Modelo de intenção não encontrado no disco. Treinando novo modelo...");
        await loadDataAndTrain();
    }
})();


module.exports = {
    predictIntent,
};