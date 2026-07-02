// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate required config values. Acesso via process.env[chave-dinamica] nao
// e substituido em build-time pelo Next.js (so process.env.NEXT_PUBLIC_X
// literal e substituido) - checar direto no objeto ja resolvido evita falsos
// positivos de "variavel faltando" mesmo quando o valor esta correto.
const requiredConfig: [string, string | undefined][] = [
    ['NEXT_PUBLIC_FIREBASE_API_KEY', firebaseConfig.apiKey],
    ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
    ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket],
    ['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId],
    ['NEXT_PUBLIC_FIREBASE_APP_ID', firebaseConfig.appId],
];

for (const [name, value] of requiredConfig) {
    if (!value) {
        console.warn(`Missing required environment variable: ${name}`);
    }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
