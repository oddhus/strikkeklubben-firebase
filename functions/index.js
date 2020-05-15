const functions = require('firebase-functions')
const admin = require('firebase-admin')
const moment = require('moment')
admin.initializeApp()


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

const db = admin.firestore()

// exports.createProfile = functions.auth
//   .user()
//   .onCreate((userRecord, context) => {
//     return admin
//       .database()
//       .ref(`/userProfile/${userRecord.data.uid}`)
//       .set({
//         email: userRecord.data.email
//     });
// });

exports.createPublicProfile = functions.https.onCall((data, context) => {
    checkAuthentication(context)
    dataValidator(data, {
        email: 'string',
        username: 'string'
    })
    admin.firestore().collection('users').doc(context.auth.uid).set({
        username: data.username,
        email: data.email
    })
})

exports.postComment = functions.https.onCall(async (data, context) => {
    checkAuthentication(context)
    dataValidator(data, {
        message: 'string',
        id: 'string'
    })
    const snapshot = await db.collection('users').doc(context.auth.uid).get()
    const username = await snapshot.data().username
    return db.collection('projects').doc(data.id).collection('comments').add({
        message: data.message,
        authorId: context.auth.uid,
        author: username,
        createdAt: admin.firestore.Timestamp.now()
    })
})

function dataValidator(data, validKeys) {
    if(Object.keys(data).length !== Object.keys(validKeys).length){
        throw new functions.https.HttpsError('invalid-argument',
        'Data object contains invalid number of properties')
    } else {
        for (const key in data) {
            if(!validKeys[key] || typeof data[key] !== validKeys[key]){
                throw new functions.https.HttpsError('invalid-argument',
                'Data object contains invalid properties')
            }
        }
    }

}

function checkAuthentication(context) {
    if(!context.auth){
        throw new functions.https.HttpsError('unauthenticated',
        'You must be signed inn to use this feature')
    }
}