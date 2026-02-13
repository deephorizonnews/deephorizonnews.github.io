import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, query, orderBy, limit, getDocs, startAfter, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CONFIGURAÇÃO DO FIREBASE ---
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
let postsLoaded = false; // Trava para evitar carregamento duplicado

// --- AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
    const adminControls = document.getElementById('admin-controls');
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');

    if (user) {
        isAdmin = (user.email === ADMIN_EMAIL);
        userInfo.innerText = user.email;
        loginBtn.innerText = "Logout";
        loginBtn.onclick = () => signOut(auth).then(() => location.reload());
        if (isAdmin) adminControls.style.display = 'block';
    } else {
        isAdmin = false;
        loginBtn.innerText = "Login with Google";
        loginBtn.onclick = () => signInWithPopup(auth, provider);
        adminControls.style.display = 'none';
    }
    
    // Carrega os posts apenas uma vez após checar o status de admin
    if (!postsLoaded) {
        loadPosts();
        postsLoaded = true;
    }
});

// --- CARREGAMENTO DE POSTS ---
async function loadPosts(isNextPage = false) {
    let q = query(collection(db, "posts"), orderBy("date", "desc"), limit(6));
    
    if (isNextPage && lastVisiblePost) {
        q = query(collection(db, "posts"), orderBy("date", "desc"), startAfter(lastVisiblePost), limit(6));
    }
    
    const snap = await getDocs(q);
    if (snap.empty) {
        if (isNextPage) document.getElementById('load-more').style.display = 'none';
        return;
    }
    
    lastVisiblePost = snap.docs[snap.docs.length - 1];
    const feed = document.getElementById('blog-feed');

    snap.forEach(docSnap => {
        const p = docSnap.data();
        const id = docSnap.id;
        
        // Estrutura do Card com o botão "X" e menu de Admin
        feed.innerHTML += `
            <article class="blog-card" onclick="togglePost(event, this)">
                <div class="close-post" onclick="closePost(event, this.parentElement)">&times;</div>
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
                ${p.image ? `<div class="card-image"><img src="${p.image}" alt="news"></div>` : ''}
            </article>`;
    });
    document.getElementById('load-more').style.display = 'block';
}

// --- CONTROLE DE INTERFACE (ABRIR/FECHAR) ---
window.togglePost = (e, el) => {
    // Não abre o post se clicar nos menus de admin ou no botão fechar
    if (e.target.closest('.admin-menu-container') || e.target.classList.contains('close-post')) return;
    
    if (!el.classList.contains('active')) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.closePost = (e, el) => {
    e.stopPropagation(); // Impede que o clique dispare o togglePost
    el.classList.remove('active');
    // Rola de volta para o card para o usuário não se perder
    window.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
};

window.toggleOptionsMenu = (e) => {
    e.stopPropagation();
    // Fecha outros menus que possam estar abertos
    document.querySelectorAll('.admin-options').forEach(m => m.style.display = 'none');
    const menu = e.currentTarget.nextElementSibling;
    menu.style.display = 'block';
};

// --- OPERAÇÕES DE ADMIN (FIREBASE) ---
window.toggleAdminPanel = () => {
    const p = document.getElementById('admin-panel');
    const isVisible = p.style.display === 'block';
    p.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        document.getElementById('panel-title').innerText = "Create New Post";
        document.getElementById('edit-id').value = "";
    }
};

window.savePost = async () => {
    if (!isAdmin) return alert("Unauthorized");
    
    const id = document.getElementById('edit-id').value;
    const data = {
        title: document.getElementById('post-title').value,
        image: document.getElementById('post-image').value,
        content: document.getElementById('post-body').value,
        date: new Date()
    };

    try {
        if (id) {
            await updateDoc(doc(db, "posts", id), data);
        } else {
            await addDoc(collection(db, "posts"), data);
        }
        location.reload();
    } catch (error) {
        console.error("Error saving post:", error);
        alert("Failed to save. Check your permissions.");
    }
};

window.editPost = async (e, id) => {
    e.stopPropagation();
    const snap = await getDoc(doc(db, "posts", id));
    if (snap.exists()) {
        const p = snap.data();
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('panel-title').innerText = "Edit Post";
        document.getElementById('edit-id').value = id;
        document.getElementById('post-title').value = p.title;
        document.getElementById('post-image').value = p.image;
        document.getElementById('post-body').value = p.content;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.deletePost = async (e, id) => {
    e.stopPropagation();
    if (isAdmin && confirm("Are you sure you want to delete this post?")) {
        await deleteDoc(doc(db, "posts", id));
        location.reload();
    }
};

// Fechar menus de admin ao clicar fora
window.onclick = () => {
    document.querySelectorAll('.admin-options').forEach(m => m.style.display = 'none');
};

// Exportar funções para o escopo global (necessário para o HTML ler o módulo)
window.loadPosts = loadPosts;
