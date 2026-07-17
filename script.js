// ===== JAVASCRIPT COMPLETO =====
const firebaseConfig = {
  apiKey: "AIzaSyAY3TNIPXDjYzGxUffXq1c42mOx7hh7rUo",
  authDomain: "bikeeco.firebaseapp.com",
  databaseURL: "https://bikeeco-default-rtdb.firebaseio.com",
  projectId: "bikeeco",
  storageBucket: "bikeeco.firebasestorage.app",
  messagingSenderId: "953347283032",
  appId: "1:953347283032:web:222d2d9222b6e64ca6522d",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const PARTICIPANTS_REF = database.ref("participants");
const PHONE_INDEX_REF = database.ref("phoneIndex");

const registrationForm = document.getElementById("registrationForm");
const participantsContainer = document.getElementById("participantsContainer");
const totalSpan = document.getElementById("totalParticipants");
const alreadyDiv = document.getElementById("alreadyRegistered");
const successDiv = document.getElementById("successMessage");
const submitBtn = document.getElementById("submitBtn");
const debugDiv = document.getElementById("debugInfo");
const notificationToast = document.getElementById("notification");
const errorToast = document.getElementById("errorNotification");
const notifMsg = document.getElementById("notifMessage");
const errorMsgSpan = document.getElementById("errorMessage");

function normalizePhone(phone) {
  return phone.replace(/\D/g, "");
}

function formatPhoneDisplay(phone) {
  const numbers = normalizePhone(phone);
  if (numbers.length === 11)
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  if (numbers.length === 10)
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return phone;
}

function showDebug(msg) {
  debugDiv.innerHTML = `🛠️ ${new Date().toLocaleTimeString()}: ${msg}`;
  debugDiv.classList.remove("hidden");
  setTimeout(() => debugDiv.classList.add("hidden"), 5000);
}

function showToast(message, isError = false) {
  const toast = isError ? errorToast : notificationToast;
  const msgSpan = isError ? errorMsgSpan : notifMsg;
  msgSpan.innerText = message;
  toast.style.opacity = "1";
  setTimeout(() => {
    toast.style.opacity = "0";
  }, 2800);
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
}

function renderParticipantCard(participant, index) {
  const card = document.createElement("div");
  card.className = "participant-card";
  const initials = getInitials(participant.name);
  const avatarColor = getAvatarColor(participant.name);

  card.innerHTML = `
    <div class="avatar avatar-small" style="background: linear-gradient(135deg, ${avatarColor}, #0a0a2a); box-shadow: 0 0 8px ${avatarColor}80;">
      <span style="color: white; font-weight: 900;">${initials}</span>
    </div>
    <div class="participant-info">
      <div class="participant-name">
        <span>${escapeHtml(participant.name)}</span>
        <span class="participant-number">#${index}</span>
      </div>
      <div class="participant-phone">📱 ${formatPhoneDisplay(participant.phone)}</div>
      <div class="participant-level">🚵 ${participant.level}</div>
    </div>
  `;
  return card;
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

async function fetchParticipants() {
  try {
    const snapshot =
      await PARTICIPANTS_REF.orderByChild("created_at").once("value");
    const data = snapshot.val();
    let participants = [];
    if (data) {
      participants = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
    }
    participants.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
    return participants;
  } catch (err) {
    console.error(err);
    showDebug(`Erro ao buscar: ${err.message}`);
    return [];
  }
}

async function isPhoneRegistered(phone) {
  const normalized = normalizePhone(phone);
  const snap = await PHONE_INDEX_REF.child(normalized).once("value");
  return snap.exists();
}

async function addParticipant(participantData) {
  const newRef = PARTICIPANTS_REF.push();
  const withTimestamp = {
    ...participantData,
    created_at: new Date().toISOString(),
  };
  await newRef.set(withTimestamp);
  await PHONE_INDEX_REF.child(participantData.phone).set({
    participantId: newRef.key,
    timestamp: new Date().toISOString(),
  });
  return { id: newRef.key, ...withTimestamp };
}

async function loadParticipants() {
  participantsContainer.innerHTML =
    '<div class="loading-spinner"><div class="spinner"></div><span>Atualizando...</span></div>';
  const participants = await fetchParticipants();
  participantsContainer.innerHTML = "";

  if (participants.length === 0) {
    participantsContainer.innerHTML =
      '<div class="loading-spinner">✨ Nenhum participante ainda. Seja o primeiro!</div>';
    totalSpan.innerText = "0";
    return;
  }

  totalSpan.innerText = participants.length;
  const recent = participants.slice(0, 15);
  recent.forEach((p, idx) => {
    participantsContainer.appendChild(renderParticipantCard(p, idx + 1));
  });
}

async function checkLocalStorageAndHideForm() {
  const savedPhone = localStorage.getItem("registeredPhone");
  if (savedPhone && (await isPhoneRegistered(savedPhone))) {
    alreadyDiv.classList.remove("hidden");
    registrationForm.style.display = "none";
    successDiv.classList.add("hidden");
    return true;
  }
  registrationForm.style.display = "block";
  alreadyDiv.classList.add("hidden");
  successDiv.classList.add("hidden");
  return false;
}

function setupPhoneMask() {
  const phoneInput = document.getElementById("phone");
  phoneInput.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length <= 2) e.target.value = `(${value}`;
    else if (value.length <= 7)
      e.target.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    else
      e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
  });
}

registrationForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`;

  const name = document.getElementById("name").value.trim();
  const phoneRaw = document.getElementById("phone").value;
  const level = document.getElementById("level").value;

  if (!name || name.length < 3) {
    showToast("Nome deve ter pelo menos 3 caracteres", true);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    return;
  }
  const normalizedPhone = normalizePhone(phoneRaw);
  if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
    showToast("Telefone inválido (DDD + 8 ou 9 dígitos)", true);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    return;
  }
  if (!level) {
    showToast("Selecione seu nível", true);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    return;
  }

  try {
    const already = await isPhoneRegistered(normalizedPhone);
    if (already) {
      localStorage.setItem("registeredPhone", normalizedPhone);
      alreadyDiv.classList.remove("hidden");
      registrationForm.style.display = "none";
      successDiv.classList.add("hidden");
      showToast("Este número já está inscrito!", true);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      return;
    }

    await addParticipant({
      name: name,
      phone: normalizedPhone,
      level: level,
    });

    localStorage.setItem("registeredPhone", normalizedPhone);
    registrationForm.reset();
    successDiv.classList.remove("hidden");
    alreadyDiv.classList.add("hidden");
    registrationForm.style.display = "none";
    showToast("✅ Inscrição confirmada! Te esperamos lá.", false);
    await loadParticipants();
    showDebug("Inscrição salva com sucesso");
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar. Tente novamente.", true);
    showDebug(`Erro: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});

async function init() {
  setupPhoneMask();
  await checkLocalStorageAndHideForm();
  await loadParticipants();
  showDebug("Sistema pronto • Cores personalizáveis via CSS");
  setInterval(() => loadParticipants(), 45000);
}

document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("DOMContentLoaded", init);