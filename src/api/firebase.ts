import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, doc, getDoc, collection } from 'firebase/firestore'

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAWhFOG6MfpCj1w96g1cArFHOwY1pI_G8I',
  authDomain: 'summarizer-359508.firebaseapp.com',
  projectId: 'youtube-summarizer-359508',
  storageBucket: 'youtube-summarizer-359508.appspot.com',
  messagingSenderId: '915721452199',
  appId: '1:915721452199:web:edfd87dcb0ec5fbe773982',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

export const signIn = async () => {
  const credentials = await signInAnonymously(auth)
  return credentials.user
}

export const getUser = async () => {
  return auth.currentUser
}

const db = getFirestore(app)

const settingsRef = collection(db, 'settings')

type Settings = {
  apiKey: string
  model: string
  maxTokens: number
}

export const getSettings = async (id: string) => {
  const docRef = doc(settingsRef, id)
  const docSnap = await getDoc(docRef)
  return docSnap.data as unknown as Settings
}
