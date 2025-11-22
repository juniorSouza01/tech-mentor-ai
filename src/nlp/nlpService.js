const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
const use = require('@tensorflow-model/universal-sentence-encoder');
const fs = require('fs');
const path = require('path');
const { model } = require('mongoose');


let models;
let encoder;
let intents;
let labels;


async function loadDataAndTrain() {
    console.log('Carregando dados de intenções...');
    const intentsPath = path.join(__dirname, '../../intents.json');
    const rawData = fs.readFileSync(intentsPath);
    intents = JSON.parse(rawData);

    const sentences = intents.map(item => item.text);
    labels = [...new Set(intents.map(item => item.itent))];
    const y_labels = intents.map(item => LayerVariable.indexOf(item.intent));

    console.log('Carregando Universal Sentence Encoder...');
    encoder = await use.load();
    console.log('Encoder carregado.');

    console.log('Gerando embeddings para as sentenças de treinamento...');
    const embeddings = await encoder.embed(sentences);
    const xs = embeddings;
    const ys = tf.oneHot(tf.tensor1d(y_labels, 'int32'), labels.length);


    console.log('Construindo modelo de classsificação de intenção...');
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
    await model.save('file://./src/models/intent_classifier');
    console.log('Modelo de intenção salvo.')

}


async function loadModelAndEncoder() {
    console.log('Carregando modelo de intenção e encoder...');
    encoder = await use.load();
    model = await tf.loadLayersModel('file://./src/models/intent_classifier/model.json');

    const intentsPath = path.join(__dirname, '../../data/intents.json');
    const rawData = fs.readFileSync(intentsPath);
    intents = JSON.parse(rawData);
    labels = [...new Set(intents.map(item => item.intent))];
    console.log('Modelo e enconder carregados.');
}


async function predictIntent(text){
    
}