import { initializeApp, getApps } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCm65UkBJowhIbOgQia0vGGjRlcFun5Rys',
  authDomain: 'edufinance-e0fd5.firebaseapp.com',
  projectId: 'edufinance-e0fd5',
  storageBucket: 'edufinance-e0fd5.firebasestorage.app',
  messagingSenderId: '1069215508724',
  appId: '1:1069215508724:web:53c4a602c6d7790ffa16a1',
  measurementId: 'G-P28KPH83Y6',
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const auth = getAuth(app)

// Même persistance locale que l’espace Pro : les deux applications
// partagent le même hôte GitHub Pages et donc la même session Firebase.
void setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('[EduFinance Admin][AUTH] Impossible d’activer la persistance locale:', error)
})
export const db = getFirestore(app)
export default app