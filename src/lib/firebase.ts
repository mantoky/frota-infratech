// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Auth, browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
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

// Auth e criado sob demanda, e nao no topo do modulo.
//
// `getAuth()` valida a apiKey na hora da chamada e lanca `auth/invalid-api-key`
// se ela faltar. Como o build e `output: "export"`, cada pagina e pre-renderizada
// no Node durante o `next build` - e ali as variaveis podem nao existir. No topo
// do modulo, isso derrubava o build inteiro com um erro que nao aponta para a
// causa. Um clone limpo do repositorio, sem `.env.local`, nem compilava.
//
// Adiando para a primeira chamada, que so acontece no navegador, o build volta a
// ser independente de configuracao e um erro de chave aparece onde faz sentido:
// na tentativa de login, com mensagem propria.
let authInstance: Auth | null = null;

export function getAppAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(app);

    // Persistencia local e requisito de operacao, nao conveniencia: o app e
    // usado em mina, patio e estrada, onde a rede cai. Com a sessao no
    // IndexedDB, quem ja entrou continua funcionando offline; sem ela, uma
    // queda de sinal deslogaria o motorista no meio da retirada.
    setPersistence(authInstance, browserLocalPersistence).catch((e) => {
      console.error('Falha ao configurar persistencia de sessao', e);
    });
  }
  return authInstance;
}
