import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, query, orderBy, limit, getDocs, startAfter, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyALHh2CFuSSWI2MR6RyiqRZZf4ABnp9Zyo",
  authDomain: "deep-horizons-51171.firebaseapp.com",
  projectId: "deep-horizons-51171",
  storageBucket: "deep-horizons-51171.firebasestorage.app",
  messagingSenderId: "670734932259",
  appId: "1:670734932259:web:07dab3af4aefb077221496",
  measurementId: "G-TPLB1K4SEY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const ADMIN_EMAIL = "campameurer@gmail.com";

let lastVisiblePost = null;
let isAdmin = false;
let postsLoaded = false; // Trava para evitar duplicatas

onAuthStateChanged(auth, (user) => {
    const adminControls = document.getElementById('admin-controls');
    if (user) {
        isAdmin = (user.email === ADMIN_EMAIL);
        document.getElementById('user-info').innerText = user.email;
        document.getElementById('login-btn').innerText = "Logout";
        document.getElementById('login-btn').onclick = () => signOut(auth).then(() => location.reload());
        if (isAdmin) adminControls.style.display = 'block';
    } else {
        isAdmin = false;
        document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
    }
    
    // Só carrega os posts se ainda não foram carregados
    if (!postsLoaded) {
        loadPosts();
        postsLoaded = true;
    }
});

async function loadPosts(isNextPage = false) {
    let q = query(collection(db, "posts"), orderBy("date", "desc"), limit(6));
    if (isNextPage && lastVisiblePost) {
        q = query(collection(db, "posts"), orderBy("date", "desc"), startAfter(lastVisiblePost), limit(6));
    }
    
    const snap = await getDocs(q);
    if (snap.empty) return;
    
    lastVisiblePost = snap.docs[snap.docs.length - 1];
    const feed = document.getElementById('blog-feed');

    snap.forEach(docSnap => {
        const p = docSnap.data();
        const id = docSnap.id;
        feed.innerHTML += `
            <article class="blog-card" onclick="togglePost(event, this)">
                <span class="close-post" onclick="closePost(event, this.parentElement)">&times;</span>
                <div class="card-header">
                    <div class="admin-menu-container" style="${isAdmin ? 'display:block' : 'display:none'}">
                        <span class="admin-dots" onclick="toggleOptionsMenu(event)">⋮</span>
                        <div class="admin-options">
                            <button onclick="editPost(event, '${id}')">Edit</button>
                            <button onclick="deletePost(event, '${id}')" style="color:red">Delete</button>
                        </div>
                    </div>
                    <h3>${p.title}</h3>
                </div>
                <div class="card-content">${p.content}</div>
                ${p.image ? `<div class="card-image"><img src="${p.image}"></div>` : ''}
            </article>`;
    });
    document.getElementById('load-more').style.display = 'block';
}

window.togglePost = (e, el) => {
    if (e.target.closest('.admin-menu-container') || e.target.classList.contains('close-post')) return;
    if (!el.classList.contains('active')) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.closePost = (e, el) => {
    e.stopPropagation();
    el.classList.remove('active');
};

window.toggleOptionsMenu = (e) => {
    e.stopPropagation();
    document.querySelectorAll('.admin-options').forEach(m => m.style.display = 'none');
    const menu = e.currentTarget.nextElementSibling;
    menu.style.display = 'block';
};

window.savePost = async () => {
    if (!isAdmin) return;
    const id = document.getElementById('edit-id').value;
    const data = {
        title: document.getElementById('post-title').value,
        image: document.getElementById('post-image').value,
        content: document.getElementById('post-body').value,
        date: new Date()
    };
    if (id) await updateDoc(doc(db, "posts", id), data);
    else await addDoc(collection(db, "posts"), data);
    location.reload();
};

window.editPost = async (e, id) => {
    e.stopPropagation();
    const snap = await getDoc(doc(db, "posts", id));
    const p = snap.data();
    document.getElementById('admin-panel').style.display = 'block';
    document.getElementById('edit-id').value = id;
    document.getElementById('post-title').value = p.title;
    document.getElementById('post-image').value = p.image;
    document.getElementById('post-body').value = p.content;
    window.scrollTo(0,0);
};

window.deletePost = async (e, id) => {
    e.stopPropagation();
    if (confirm("Delete?")) { await deleteDoc(doc(db, "posts", id)); location.reload(); }
};

window.toggleAdminPanel = () => {
    const p = document.getElementById('admin-panel');
    p.style.display = p.style.display === 'block' ? 'none' : 'block';
};

window.onclick = () => document.querySelectorAll('.admin-options').forEach(m => m.style.display = 'none');
window.loadPosts = loadPosts;
