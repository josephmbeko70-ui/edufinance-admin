import { initializeApp, getApps } from 'firebase/app'
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth'
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

// Même persistance locale que l’espace Pro. Les deux applications
// partagent le même hôte GitHub Pages.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
})
export const db = getFirestore(app)
export default app