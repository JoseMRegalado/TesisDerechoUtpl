/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'jmregaladov@gmail.com',
        pass: 'theflash'
    }
});

exports.sendEmail = functions.https.onCall((data, context) => {
    const mailOptions = {
        from: 'jmrgaladov@gmail.com',
        to: data.to,
        subject: data.subject,
        text: data.text
    };

    return transporter.sendMail(mailOptions)
        .then(() => {
            return { message: 'Correo enviado con éxito' };
        })
        .catch((error) => {
            throw new functions.https.HttpsError('internal', error.toString());
        });
});


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
