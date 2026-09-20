document.getElementById("newsletterForm").addEventListener("submit", (event) => {
  event.preventDefault();
  document.getElementById("formMessage").textContent = "Obrigada! Seu cadastro foi recebido.";
  event.target.reset();
});

const catalog = document.getElementById("productCatalog");
const productModal = document.getElementById("productModal");
const cartDrawer = document.getElementById("cartDrawer");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const storedPrices = JSON.parse(localStorage.getItem("serena-prices") || "{}");
const storedProducts = JSON.parse(localStorage.getItem("serena-products") || "[]");
const deletedProducts = JSON.parse(localStorage.getItem("serena-deleted-products") || "[]");
const adminCredentials = { user: "admin", password: "serena123" };
let cart = [];
let selectedProduct = null;

function formatPrice(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function productCards() {
  return [...document.querySelectorAll(".product-card")];
}

function filterCatalog(selected) {
  document.querySelectorAll(".catalog-filter").forEach((item) => item.classList.toggle("active", item.dataset.filter === selected));
  productCards().forEach((card) => {
    card.hidden = selected !== "todos" && card.dataset.category !== selected;
  });
  catalog.scrollTo({ left: 0, behavior: "smooth" });
}

function openProduct(card) {
  const image = card.querySelector("img");
  const name = card.querySelector(".product-info h3").textContent;
  const category = card.querySelector(".product-info span").textContent;
  const price = Number(card.dataset.price) || 0;
  document.getElementById("modalProductImage").src = image.src;
  document.getElementById("modalProductImage").alt = image.alt;
  document.getElementById("modalProductCategory").textContent = category;
  document.getElementById("modalProductName").textContent = name;
  document.getElementById("modalProductPrice").textContent = price ? formatPrice(price) : "Preço a definir";
  selectedProduct = { id: image.src, name, category, image: image.src, price };
  productModal.classList.add("is-open");
  productModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

catalog.addEventListener("click", (event) => {
  const card = event.target.closest(".product-card");
  if (card) openProduct(card);
});

document.querySelectorAll(".catalog-filter").forEach((filter) => {
  filter.addEventListener("click", () => {
    filterCatalog(filter.dataset.filter);
  });
});

document.querySelectorAll("[data-category-filter]").forEach((category) => {
  category.addEventListener("click", () => filterCatalog(category.dataset.categoryFilter));
});

document.querySelector(".catalog-prev").addEventListener("click", () => catalog.scrollBy({ left: -290, behavior: "smooth" }));
document.querySelector(".catalog-next").addEventListener("click", () => catalog.scrollBy({ left: 290, behavior: "smooth" }));

function closeProductModal() {
  productModal.classList.remove("is-open");
  productModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

document.querySelectorAll("[data-close-modal]").forEach((element) => element.addEventListener("click", closeProductModal));

function renderCart() {
  cartItems.innerHTML = "";
  if (!cart.length) {
    cartItems.innerHTML = '<p class="cart-empty">Sua sacola está vazia.</p>';
  } else {
    cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `<img src="${item.image}" alt="${item.name}"><div class="cart-item-info"><strong>${item.name}</strong><small>${item.category}</small><span>${item.price ? formatPrice(item.price) : "Preço a definir"}</span><div class="quantity-control"><button data-action="decrease" aria-label="Diminuir quantidade">−</button><b>${item.quantity}</b><button data-action="increase" aria-label="Aumentar quantidade">+</button><button class="remove-item" data-action="remove">Remover</button></div></div>`;
      row.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => updateCart(item.id, button.dataset.action)));
      cartItems.appendChild(row);
    });
  }
  const pendingPrice = cart.some((item) => !item.price);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotal.textContent = pendingPrice ? "Preço a definir" : formatPrice(total);
  document.querySelector(".bag-count").textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCart(id, action) {
  const item = cart.find((product) => product.id === id);
  if (!item) return;
  if (action === "increase") item.quantity += 1;
  if (action === "decrease") item.quantity -= 1;
  if (action === "remove" || item.quantity < 1) cart = cart.filter((product) => product.id !== id);
  renderCart();
}

function openCart() {
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

document.getElementById("addToCartButton").addEventListener("click", () => {
  const existing = cart.find((item) => item.id === selectedProduct.id);
  if (existing) existing.quantity += 1;
  else cart.push({ ...selectedProduct, quantity: 1 });
  renderCart();
  closeProductModal();
  openCart();
});
document.getElementById("cartButton").addEventListener("click", openCart);
document.querySelectorAll("[data-close-cart]").forEach((element) => element.addEventListener("click", closeCart));
document.getElementById("checkoutButton").addEventListener("click", () => {
  if (cart.length) alert("Seu pedido será finalizado quando os preços forem cadastrados.");
});

const adminModal = document.getElementById("adminModal");
const adminProduct = document.getElementById("adminProduct");

function openAdmin() {
  adminModal.classList.add("is-open");
  adminModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  updateAdminProducts();
}
function closeAdmin() {
  adminModal.classList.remove("is-open");
  adminModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}
function updateAdminProducts() {
  adminProduct.innerHTML = "";
  productCards().forEach((card) => {
    const option = document.createElement("option");
    option.value = card.querySelector("h3").textContent;
    option.textContent = option.value;
    adminProduct.appendChild(option);
  });
}
function applyStoredPrices() {
  productCards().forEach((card) => {
    const name = card.querySelector("h3").textContent;
    if (storedPrices[name] !== undefined) card.dataset.price = storedPrices[name];
  });
}
function addProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.category = product.category;
  card.dataset.price = product.price || 0;
  card.innerHTML = `<img src="${product.image}" alt="${product.name}"><div class="product-info"><span>${product.category}</span><h3>${product.name}</h3><strong>Ver produto</strong></div>`;
  catalog.appendChild(card);
}

document.getElementById("adminButton").addEventListener("click", openAdmin);
document.querySelectorAll("[data-close-admin]").forEach((element) => element.addEventListener("click", closeAdmin));
document.getElementById("adminLoginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const valid = document.getElementById("adminUser").value.trim() === adminCredentials.user && document.getElementById("adminPassword").value === adminCredentials.password;
  document.getElementById("loginMessage").textContent = valid ? "" : "Usuário ou senha inválidos.";
  if (valid) {
    document.getElementById("loginView").hidden = true;
    document.getElementById("adminView").hidden = false;
    updateAdminProducts();
  }
});
adminProduct.addEventListener("change", () => {
  const card = productCards().find((item) => item.querySelector("h3").textContent === adminProduct.value);
  document.getElementById("adminPrice").value = card && Number(card.dataset.price) ? card.dataset.price : "";
});
document.getElementById("priceForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const card = productCards().find((item) => item.querySelector("h3").textContent === adminProduct.value);
  const price = Number(document.getElementById("adminPrice").value);
  if (!card || Number.isNaN(price) || price < 0) return;
  card.dataset.price = price;
  storedPrices[adminProduct.value] = price;
  localStorage.setItem("serena-prices", JSON.stringify(storedPrices));
  document.getElementById("adminMessage").textContent = "Preço salvo com sucesso.";
});
document.getElementById("newProductForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("newProductName").value.trim();
  const category = document.getElementById("newProductCategory").value;
  const imageInput = document.getElementById("newProductImage");
  const imageFile = imageInput.files[0];
  const price = Number(document.getElementById("newProductPrice").value) || 0;
  if (!name || !imageFile) return;
  if (!imageFile.type.startsWith("image/")) {
    document.getElementById("newProductMessage").textContent = "Escolha um arquivo de imagem válido.";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const product = { name, category, image: reader.result, price };
    addProductCard(product);
    storedProducts.push(product);
    localStorage.setItem("serena-products", JSON.stringify(storedProducts));
    updateAdminProducts();
    document.getElementById("newProductMessage").textContent = "Produto adicionado e salvo neste navegador.";
    event.target.reset();
    document.getElementById("newProductPreview").hidden = true;
  };
  reader.onerror = () => {
    document.getElementById("newProductMessage").textContent = "Não foi possível ler a imagem escolhida.";
  };
  reader.readAsDataURL(imageFile);
});
document.getElementById("newProductImage").addEventListener("change", (event) => {
  const file = event.target.files[0];
  const preview = document.getElementById("newProductPreview");
  if (!file) {
    preview.hidden = true;
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});
document.getElementById("deleteProductButton").addEventListener("click", () => {
  const productName = adminProduct.value;
  const card = productCards().find((item) => item.querySelector("h3").textContent === productName);
  if (!card || !window.confirm(`Excluir "${productName}" da loja?`)) return;
  card.remove();
  const storedIndex = storedProducts.findIndex((item) => item.name === productName);
  if (storedIndex >= 0) {
    storedProducts.splice(storedIndex, 1);
    localStorage.setItem("serena-products", JSON.stringify(storedProducts));
  } else if (!deletedProducts.includes(productName)) {
    deletedProducts.push(productName);
    localStorage.setItem("serena-deleted-products", JSON.stringify(deletedProducts));
  }
  delete storedPrices[productName];
  localStorage.setItem("serena-prices", JSON.stringify(storedPrices));
  updateAdminProducts();
  document.getElementById("adminMessage").textContent = "Produto excluído com sucesso.";
});
document.getElementById("adminLogout").addEventListener("click", () => {
  document.getElementById("adminView").hidden = true;
  document.getElementById("loginView").hidden = false;
  document.getElementById("adminLoginForm").reset();
  closeAdmin();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeProductModal();
    closeCart();
    closeAdmin();
  }
});
applyStoredPrices();
storedProducts.forEach((product) => {
  if (!deletedProducts.includes(product.name)) addProductCard(product);
});
productCards().forEach((card) => {
  if (deletedProducts.includes(card.querySelector("h3").textContent)) card.remove();
});
renderCart();
