(() => {
  "use strict";

  // Le numéro WhatsApp du salon, au format international sans signe +.
  const WHATSAPP_NUMBER = "2250584887016";
  const CART_KEY = "klassc_cart_v1";
  const FAVORITES_KEY = "klassc_favorites_v1";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const serviceCards = $$(".service-card");
  const modalBackdrop = $("#modal-backdrop");
  const modalContent = $("#modal-content");
  const modalTitle = $("#modal-title");
  const toast = $("#toast");
  let cart = readStorage(CART_KEY, []);
  let favorites = readStorage(FAVORITES_KEY, []);

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (_) {
      return fallback;
    }
  }
  function saveStorage() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (_) {
      // Le site reste utilisable même si le navigateur bloque le stockage local.
    }
  }
  function money(amount) {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  }
  function getProduct(card) {
    return {
      id: card.dataset.id,
      name: card.dataset.name,
      price: Number(card.dataset.price || 0)
    };
  }
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2300);
  }
  function updateCounts() {
    $("#cart-count").textContent = cart.reduce((sum, item) => sum + item.qty, 0);
    $("#favorite-count").textContent = favorites.length;
    serviceCards.forEach(card => {
      const isFavorite = favorites.includes(card.dataset.id);
      const button = $(".favorite-toggle", card);
      button.classList.toggle("is-favorite", isFavorite);
      button.textContent = isFavorite ? "♥" : "♡";
      button.setAttribute("aria-pressed", String(isFavorite));
    });
    saveStorage();
  }
  function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) existing.qty += 1;
    else cart.push({ ...product, qty: 1 });
    updateCounts();
    showToast(product.name + " ajouté au panier.");
  }
  function toggleFavorite(product) {
    if (favorites.includes(product.id)) {
      favorites = favorites.filter(id => id !== product.id);
      showToast(product.name + " retiré des favoris.");
    } else {
      favorites.push(product.id);
      showToast(product.name + " ajouté aux favoris.");
    }
    updateCounts();
  }
  function openModal(title, content) {
    modalTitle.textContent = title;
    modalContent.innerHTML = content;
    modalBackdrop.classList.add("is-open");
    modalBackdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $("#modal-close").focus();
  }
  function closeModal() {
    modalBackdrop.classList.remove("is-open");
    modalBackdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
  function openCart() {
    if (!cart.length) {
      openModal("TON PANIER", '<div class="empty-state">Ton panier est vide pour le moment.<br>Choisis une prestation dans la section « Les prestations ».</div><button class="modal-primary" data-action="browse">DÉCOUVRIR LES PRESTATIONS</button>');
      return;
    }
    const items = cart.map(item => `
      <div class="modal-item">
        <div><strong>${escapeHTML(item.name)}</strong><small>${money(item.price)} · Quantité : ${item.qty}</small></div>
        <div><strong>${money(item.price * item.qty)}</strong><button data-action="remove-cart" data-id="${escapeHTML(item.id)}">Retirer</button></div>
      </div>`).join("");
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    openModal("TON PANIER", `<div class="modal-list">${items}</div><div class="modal-total"><span>TOTAL INDICATIF</span><strong>${money(total)}</strong></div><p class="form-note">Tarifs indicatifs à confirmer avec le salon. La réservation sera préparée dans WhatsApp.</p><button class="modal-primary" data-action="checkout">CONTINUER SUR WHATSAPP ↗</button><button class="modal-secondary" data-action="clear-cart">Vider le panier</button>`);
  }
  function openFavorites() {
    const products = favorites.map(id => serviceCards.map(getProduct).find(item => item.id === id)).filter(Boolean);
    if (!products.length) {
      openModal("MES FAVORIS", '<div class="empty-state">Tu n’as pas encore de favoris.<br>Appuie sur le cœur d’une prestation pour la retrouver ici.</div><button class="modal-primary" data-action="browse">VOIR LES PRESTATIONS</button>');
      return;
    }
    const items = products.map(item => `
      <div class="modal-item">
        <div><strong>${escapeHTML(item.name)}</strong><small>${money(item.price)}</small></div>
        <div><button data-action="favorite-cart" data-id="${escapeHTML(item.id)}">Ajouter au panier</button><button data-action="remove-favorite" data-id="${escapeHTML(item.id)}">♥ Retirer</button></div>
      </div>`).join("");
    openModal("MES FAVORIS", `<div class="modal-list">${items}</div><p class="form-note">Tes favoris sont conservés sur ce navigateur.</p>`);
  }
  function openOrderForm() {
    const selected = cart.length ? cart.map(item => `${item.name} x${item.qty} (${money(item.price * item.qty)})`).join(", ") : "";
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    openModal("RÉSERVE TON CRÉNEAU", `
      <form class="order-form" id="order-form">
        <div class="form-field"><label for="client-name">Ton nom *</label><input id="client-name" name="name" autocomplete="name" required placeholder="Ex. Koffi Jean"></div>
        <div class="form-field"><label for="client-phone">Ton téléphone *</label><input id="client-phone" name="phone" autocomplete="tel" required inputmode="tel" placeholder="Ex. 07 00 00 00 00"></div>
        <div class="form-field"><label for="appointment-date">Date souhaitée *</label><input id="appointment-date" name="date" type="date" required min="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-field"><label for="appointment-time">Heure souhaitée</label><select id="appointment-time" name="time"><option value="">À confirmer</option><option>08:00 - 10:00</option><option>10:00 - 12:00</option><option>12:00 - 14:00</option><option>14:00 - 16:00</option><option>16:00 - 18:00</option></select></div>
        <div class="form-field full"><label for="client-service">Prestation souhaitée</label><select id="client-service" name="service"><option value="">À discuter avec le salon</option>${serviceCards.map(card => `<option value="${escapeHTML(card.dataset.name)}" ${selected.includes(card.dataset.name) ? "selected" : ""}>${escapeHTML(card.dataset.name)} — ${money(Number(card.dataset.price))}</option>`).join("")}<option value="Plusieurs prestations">Plusieurs prestations / panier</option></select></div>
        <div class="form-field full"><label for="client-message">Précisions (facultatif)</label><textarea id="client-message" name="message" placeholder="Style souhaité, précision sur la réservation…">${escapeHTML(selected ? "Panier : " + selected : "")}</textarea></div>
        <div class="form-field full"><p class="form-note">En envoyant, WhatsApp s’ouvrira avec ton message prérempli. Tu devras appuyer sur « Envoyer » dans WhatsApp. Le rendez-vous n’est confirmé qu’après réponse du salon.${cart.length ? " Total indicatif du panier : " + money(total) + "." : ""}</p></div>
        <div class="form-field full"><button class="modal-primary" type="submit">ENVOYER MA DEMANDE SUR WHATSAPP ↗</button></div>
      </form>`);
    const dateInput = $("#appointment-date");
    if (dateInput) dateInput.value = "";
    $("#order-form").addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const message = [
        "Bonjour Klass C Attoban, je souhaite demander une réservation.",
        `Nom : ${data.get("name")}`,
        `Téléphone : ${data.get("phone")}`,
        `Date souhaitée : ${data.get("date")}`,
        `Heure souhaitée : ${data.get("time") || "À confirmer"}`,
        `Prestation : ${data.get("service") || "À discuter"}`,
        data.get("message") ? `Précisions : ${data.get("message")}` : "",
        cart.length ? `Panier : ${cart.map(item => `${item.name} x${item.qty}`).join(", ")}` : "",
        "Merci de me confirmer le tarif et la disponibilité."
      ].filter(Boolean).join("\n");
      openWhatsApp(message);
    });
  }
  function openWhatsApp(message) {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Cartes de prestations
  serviceCards.forEach(card => {
    const product = getProduct(card);
    $(".add-cart", card).addEventListener("click", () => addToCart(product));
    $(".favorite-toggle", card).addEventListener("click", () => toggleFavorite(product));
    $(".quick-order", card).addEventListener("click", () => {
      addToCart(product);
      openOrderForm();
    });
  });

  // Menu hamburger accessible sur téléphone et tablette
  const hamburger = $("#hamburger");
  const navMenu = $("#nav-menu");
  hamburger.addEventListener("click", () => {
    const opened = navMenu.classList.toggle("is-open");
    hamburger.setAttribute("aria-expanded", String(opened));
    hamburger.setAttribute("aria-label", opened ? "Fermer le menu" : "Ouvrir le menu");
  });
  $$(".nav-link", navMenu).forEach(link => link.addEventListener("click", () => {
    navMenu.classList.remove("is-open");
    hamburger.setAttribute("aria-expanded", "false");
  }));

  $("#open-cart").addEventListener("click", openCart);
  $("#open-favorites").addEventListener("click", openFavorites);
  ["open-order", "hero-order", "contact-order"].forEach(id => $("#" + id).addEventListener("click", openOrderForm));
  $("#modal-close").addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", event => {
    if (event.target === modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modalBackdrop.classList.contains("is-open")) closeModal();
  });

  // Actions des boutons dans les fenêtres modales
  modalContent.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === "browse") {
      closeModal();
      $("#prestations").scrollIntoView({ behavior: "smooth" });
    } else if (action === "remove-cart") {
      cart = cart.filter(item => item.id !== id);
      updateCounts();
      openCart();
    } else if (action === "clear-cart") {
      cart = [];
      updateCounts();
      openCart();
    } else if (action === "checkout") {
      openOrderForm();
    } else if (action === "remove-favorite") {
      favorites = favorites.filter(itemId => itemId !== id);
      updateCounts();
      openFavorites();
    } else if (action === "favorite-cart") {
      const product = serviceCards.map(getProduct).find(item => item.id === id);
      if (product) addToCart(product);
      openFavorites();
    }
  });

  $("#year").textContent = new Date().getFullYear();
  updateCounts();
})();