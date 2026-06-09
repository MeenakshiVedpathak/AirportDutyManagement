const admin = require('firebase-admin');
const path = require('path');

let bucket;

const getBucket = () => {
  if (bucket) return bucket;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(
        path.join(__dirname, '..', 'serviceAccountKey.json')
      ),
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
    });
  }

  bucket = admin.storage().bucket();
  return bucket;
};

const uploadPdfToFirebase = async (base64Data, filename, dutyId) => {
  const b = getBucket();
  const buffer = Buffer.from(base64Data, 'base64');
  const destination = `duties/${dutyId}/${Date.now()}_${filename}`;
  const file = b.file(destination);

  await file.save(buffer, {
    metadata: { contentType: 'application/pdf' },
  });

  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${b.name}/${destination}`;
  return { url: publicUrl, destination };
};

const deletePdfFromFirebase = async (destination) => {
  try {
    const b = getBucket();
    await b.file(destination).delete();
  } catch (_) {}
};

module.exports = { uploadPdfToFirebase, deletePdfFromFirebase };
