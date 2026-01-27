// admin/js/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyBez4la0MLHbwGhctmyB6ba1DdNJ4Jzzs4",
  authDomain: "littleleaf-admin.firebaseapp.com",
  projectId: "littleleaf-admin",
  storageBucket: "littleleaf-admin.appspot.com",
  messagingSenderId: "45608196538",
  appId: "1:45608196538:web:f9e478a41a96ab9af1a583",
  measurementId: "G-RPNWB9MZP3"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
