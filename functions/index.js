const functions = require('firebase-functions')
const admin = require('firebase-admin')
const mimeTypes = require('mimetypes')
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

exports.createProject = functions.https.onCall(async (data, context) => {
    checkAuthentication(context)
    dataValidator(data, {
        title: 'string',
        desc: 'string',
        username: 'string',
        image: 'string'
    })
    const mimeType = data.image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1];
    const base64EncodedImageString = data.image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = new Buffer(base64EncodedImageString, 'base64');

    const filename = `projects/${data.title}.${mimeTypes.detectExtension(mimeType)}`;
    const file = admin.storage().bucket().file(filename);
    await file.save(imageBuffer, { contentType: 'image/jpeg' });
    const fileUrl = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' }).then(urls => urls[0]);

    return admin.firestore().collection('projects').add({
        title: data.title,
        author: data.username,
        description: data.desc,
        isPublic: true,
        owner: context.auth.uid,
        imgUrl: fileUrl,
        createdAt: admin.firestore.Timestamp.now()
    })

})

exports.createPublicProfile = functions.https.onCall(async (data, context) => {
    checkAuthentication(context)
    dataValidator(data, {
        email: 'string',
        username: 'string'
    })
    admin.firestore().collection('users').doc(context.auth.uid).set({
        username: data.username,
        email: data.email,
        numberOfPosts: 0,
        numberOfComments: 0
    })
})    

exports.postComment = functions.https.onCall(async (data, context) => {
    checkAuthentication(context)
    dataValidator(data, {
        username: 'string',
        message: 'string',
        id: 'string'
    })
    
    db.collection('projects').doc(data.id).collection('comments').add({
        message: data.message,
        authorId: context.auth.uid,
        author: data.username,
        createdAt: admin.firestore.Timestamp.now()
    })

    db.collection('users').doc(context.auth.uid).update({
        numberOfComments: admin.firestore.FieldValue.increment(1)
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