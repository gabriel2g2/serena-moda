const supabaseClient = window.serenaSupabase;
const catalog = document.getElementById("productCatalog");
const productModal = document.getElementById("productModal");
const cartDrawer = document.getElementById("cartDrawer");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const adminModal = document.getElementById("adminModal");
const adminProduct = document.getElementById("adminProduct");
const customerModal = document.getElementById("customerModal");
let cart = [];
let selectedProduct = null;
let products = [];
let customer = JSON.parse(localStorage.getItem("serena-customer") || "null");

document.getElementById("newsletterForm").addEventListener("submit", (event) => {
  event.preventDefault();
  showMessage("formMessage", "Obrigada! Seu cadastro foi recebido.");
  event.target.reset();
});

function formatPrice(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function showMessage(id, text) {
  document.getElementById(id).textContent = text;
}

function productCards() {
  return [...document.querySelectorAll(".product-card")];
}

function filterCatalog(selected) {
  document.querySelectorAll(".catalog-filter").forEach((item) => item.classList.toggle("active", item.dataset.filter === selected));
  productCards().forEach((card) => { card.hidden = selected !== "todos" && card.dataset.category !== selected; });
  catalog.scrollTo({ left: 0, behavior: "smooth" });
}

function addProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.id = product.id || "";
  card.dataset.category = product.category;
  card.dataset.price = product.price ?? "";
  card.innerHTML = `<img src="${product.image_url || product.image}" alt="${product.name}"><div class="product-info"><span>${product.category}</span><h3>${product.name}</h3><strong>Ver produto</strong></div>`;
  catalog.appendChild(card);
}

async function loadProducts() {
  if (!supabaseClient) {
    showMessage("formMessage", "Configuração do Supabase não encontrada.");
    return;
  }
  const { data, error } = await supabaseClient.from("products").select("id,name,category,image_url,price").eq("active", true).order("created_at", { ascending: false });
  if (error) {
    console.error("Não foi possível carregar produtos do Supabase:", error);
    showMessage("formMessage", "Não foi possível carregar o catálogo online.");
    return;
  }
  if (!data.length) return;
  catalog.innerHTML = "";
  products = data;
  data.forEach(addProductCard);
}

function openProduct(card) {
  const image = card.querySelector("img");
  const price = Number(card.dataset.price) || 0;
  const name = card.querySelector("h3").textContent;
  const category = card.querySelector("span").textContent;
  document.getElementById("modalProductImage").src = image.src;
  document.getElementById("modalProductImage").alt = image.alt;
  document.getElementById("modalProductCategory").textContent = category;
  document.getElementById("modalProductName").textContent = name;
  document.getElementById("modalProductPrice").textContent = price ? formatPrice(price) : "Preço a definir";
  selectedProduct = { id: card.dataset.id || image.src, name, category, image: image.src, price };
  productModal.classList.add("is-open");
  productModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

catalog.addEventListener("click", (event) => {
  const card = event.target.closest(".product-card");
  if (card) openProduct(card);
});
document.querySelectorAll(".catalog-filter").forEach((filter) => filter.addEventListener("click", () => filterCatalog(filter.dataset.filter)));
document.querySelectorAll("[data-category-filter]").forEach((category) => category.addEventListener("click", () => filterCatalog(category.dataset.categoryFilter)));
document.querySelector(".catalog-prev").addEventListener("click", () => catalog.scrollBy({ left: -290, behavior: "smooth" }));
document.querySelector(".catalog-next").addEventListener("click", () => catalog.scrollBy({ left: 290, behavior: "smooth" }));

function closeProductModal() {
  productModal.classList.remove("is-open");
  productModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}
document.querySelectorAll("[data-close-modal]").forEach((element) => element.addEventListener("click", closeProductModal));

function renderCart() {
  cartItems.innerHTML = cart.length ? "" : '<p class="cart-empty">Sua sacola está vazia.</p>';
  cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `<img src="${item.image}" alt="${item.name}"><div class="cart-item-info"><strong>${item.name}</strong><small>${item.category}</small><span>${item.price ? formatPrice(item.price) : "Preço a definir"}</span><div class="quantity-control"><button data-action="decrease" aria-label="Diminuir quantidade">−</button><b>${item.quantity}</b><button data-action="increase" aria-label="Aumentar quantidade">+</button><button class="remove-item" data-action="remove">Remover</button></div></div>`;
    row.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => updateCart(item.id, button.dataset.action)));
    cartItems.appendChild(row);
  });
  const pendingPrice = cart.some((item) => !item.price);
  cartTotal.textContent = pendingPrice ? "Preço a definir" : formatPrice(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
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
function openCart() { cartDrawer.classList.add("is-open"); cartDrawer.setAttribute("aria-hidden", "false"); document.body.classList.add("modal-open"); }
function closeCart() { cartDrawer.classList.remove("is-open"); cartDrawer.setAttribute("aria-hidden", "true"); document.body.classList.remove("modal-open"); }
document.getElementById("addToCartButton").addEventListener("click", () => {
  const existing = cart.find((item) => item.id === selectedProduct.id);
  if (existing) existing.quantity += 1; else cart.push({ ...selectedProduct, quantity: 1 });
  renderCart(); closeProductModal(); openCart();
});
document.getElementById("cartButton").addEventListener("click", openCart);
document.querySelectorAll("[data-close-cart]").forEach((element) => element.addEventListener("click", closeCart));
document.getElementById("checkoutButton").addEventListener("click", () => { if (cart.length) alert("O checkout será conectado na próxima etapa."); });

function updateCustomerHeader() {
  const nameDisplay = document.getElementById("customerNameDisplay");
  nameDisplay.textContent = customer ? customer.name.split(" ")[0] : "";
  nameDisplay.hidden = !customer;
  document.getElementById("customerAccountButton").setAttribute("aria-label", customer ? `Minha conta: ${customer.name}` : "Minha conta");
}
function renderCustomerAccount() {
  const guestView = document.getElementById("customerGuestView");
  const loggedView = document.getElementById("customerLoggedView");
  guestView.hidden = Boolean(customer);
  loggedView.hidden = !customer;
  if (!customer) return;
  document.getElementById("customerGreeting").textContent = customer.name.split(" ")[0];
  document.getElementById("customerCode").textContent = customer.code;
  document.getElementById("customerHistory").hidden = true;
}
function openCustomerModal() {
  renderCustomerAccount();
  customerModal.classList.add("is-open");
  customerModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}
function closeCustomerModal() {
  customerModal.classList.remove("is-open");
  customerModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}
document.getElementById("customerAccountButton").addEventListener("click", openCustomerModal);
document.querySelectorAll("[data-close-customer]").forEach((element) => element.addEventListener("click", closeCustomerModal));
document.getElementById("customerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  customer = Object.fromEntries(formData.entries());
  customer.code = `SERENA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  localStorage.setItem("serena-customer", JSON.stringify(customer));
  updateCustomerHeader();
  renderCustomerAccount();
});
document.getElementById("customerCartButton").addEventListener("click", () => { closeCustomerModal(); openCart(); });
document.getElementById("customerHistoryButton").addEventListener("click", () => {
  const history = document.getElementById("customerHistory");
  history.hidden = false;
  history.innerHTML = '<p><i class="bi bi-info-circle me-2"></i>Você ainda não possui compras registradas. Seus pedidos aparecerão aqui após a finalização da compra.</p>';
});
document.getElementById("customerLogout").addEventListener("click", () => {
  customer = null;
  localStorage.removeItem("serena-customer");
  updateCustomerHeader();
  closeCustomerModal();
});

function openAdmin() { adminModal.classList.add("is-open"); adminModal.setAttribute("aria-hidden", "false"); document.body.classList.add("modal-open"); updateAdminProducts(); }
function closeAdmin() { adminModal.classList.remove("is-open"); adminModal.setAttribute("aria-hidden", "true"); document.body.classList.remove("modal-open"); }
function updateAdminProducts() {
  adminProduct.innerHTML = "";
  productCards().forEach((card) => {
    const option = document.createElement("option");
    option.value = card.dataset.id;
    option.textContent = card.querySelector("h3").textContent;
    option.dataset.price = card.dataset.price;
    adminProduct.appendChild(option);
  });
}
document.getElementById("adminButton").addEventListener("click", openAdmin);
document.querySelectorAll("[data-close-admin]").forEach((element) => element.addEventListener("click", closeAdmin));
document.getElementById("adminLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) { showMessage("loginMessage", "Supabase não está configurado."); return; }
  const email = document.getElementById("adminUser").value.trim();
  const password = document.getElementById("adminPassword").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) { showMessage("loginMessage", "Não foi possível entrar. Confira e-mail e senha."); return; }
  document.getElementById("loginView").hidden = true;
  document.getElementById("adminView").hidden = false;
  updateAdminProducts();
});
adminProduct.addEventListener("change", () => {
  const option = adminProduct.selectedOptions[0];
  document.getElementById("adminPrice").value = option?.dataset.price || "";
});
document.getElementById("priceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = adminProduct.value;
  const price = Number(document.getElementById("adminPrice").value);
  if (!id || Number.isNaN(price) || price < 0) { showMessage("adminMessage", "Selecione um produto e informe um preço válido."); return; }
  const { error } = await supabaseClient.from("products").update({ price }).eq("id", id);
  if (error) { showMessage("adminMessage", "Não foi possível salvar o preço."); return; }
  const card = document.querySelector(`.product-card[data-id="${CSS.escape(id)}"]`);
  if (card) card.dataset.price = price;
  adminProduct.selectedOptions[0].dataset.price = price;
  showMessage("adminMessage", "Preço salvo no Supabase.");
});
document.getElementById("newProductImage").addEventListener("change", (event) => {
  const file = event.target.files[0];
  const preview = document.getElementById("newProductPreview");
  if (!file) { preview.hidden = true; return; }
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});
document.getElementById("newProductForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("newProductName").value.trim();
  const category = document.getElementById("newProductCategory").value;
  const file = document.getElementById("newProductImage").files[0];
  const priceValue = document.getElementById("newProductPrice").value;
  const price = priceValue ? Number(priceValue) : null;
  if (!name || !file) { showMessage("newProductMessage", "Informe o nome e escolha uma imagem."); return; }
  const filePath = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const upload = await supabaseClient.storage.from("products").upload(filePath, file, { upsert: false, contentType: file.type });
  if (upload.error) { showMessage("newProductMessage", "Não foi possível enviar a imagem."); return; }
  const { data: publicUrl } = supabaseClient.storage.from("products").getPublicUrl(filePath);
  const insert = await supabaseClient.from("products").insert({ name, category, image_url: publicUrl.publicUrl, price }).select().single();
  if (insert.error) { showMessage("newProductMessage", "Imagem enviada, mas não foi possível salvar o produto."); return; }
  addProductCard(insert.data);
  products.push(insert.data);
  updateAdminProducts();
  showMessage("newProductMessage", "Produto salvo no Supabase.");
  event.target.reset();
  document.getElementById("newProductPreview").hidden = true;
});
document.getElementById("deleteProductButton").addEventListener("click", async () => {
  const id = adminProduct.value;
  const name = adminProduct.selectedOptions[0]?.textContent;
  if (!id || !window.confirm(`Excluir "${name}" da loja?`)) return;
  const { error } = await supabaseClient.from("products").update({ active: false }).eq("id", id);
  if (error) { showMessage("adminMessage", "Não foi possível excluir o produto."); return; }
  document.querySelector(`.product-card[data-id="${CSS.escape(id)}"]`)?.remove();
  updateAdminProducts();
  showMessage("adminMessage", "Produto excluído do catálogo.");
});
document.getElementById("adminLogout").addEventListener("click", async () => {
  await supabaseClient?.auth.signOut();
  document.getElementById("adminView").hidden = true;
  document.getElementById("loginView").hidden = false;
  document.getElementById("adminLoginForm").reset();
  closeAdmin();
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeProductModal(); closeCart(); closeAdmin(); closeCustomerModal(); } });
renderCart();
updateCustomerHeader();
loadProducts();
if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) {
      document.getElementById("loginView").hidden = true;
      document.getElementById("adminView").hidden = false;
      updateAdminProducts();
    }
  });
}
