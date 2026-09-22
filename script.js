const supabaseClient = window.serenaSupabase;
const catalog = document.getElementById("productCatalog");
const productModal = document.getElementById("productModal");
const cartDrawer = document.getElementById("cartDrawer");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const adminModal = document.getElementById("adminModal");
const adminProduct = document.getElementById("adminProduct");
const customerModal = document.getElementById("customerModal");
const searchModal = document.getElementById("searchModal");
const searchInput = document.getElementById("productSearchInput");
const searchResults = document.getElementById("searchResults");
let cart = [];
let selectedProduct = null;
let products = [];
let customer = JSON.parse(localStorage.getItem("serena-customer") || "null");
let shippingEstimate = customer?.shipping ?? null;

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

function openSearch() {
  searchModal.classList.add("is-open");
  searchModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  searchInput.value = "";
  renderSearchResults("");
  window.setTimeout(() => searchInput.focus(), 50);
}
function closeSearch() {
  searchModal.classList.remove("is-open");
  searchModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}
function renderSearchResults(query) {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const matches = normalized ? products.filter((product) => [product.name, product.category, product.description, product.color, ...(product.sizes || [])].join(" ").toLocaleLowerCase("pt-BR").includes(normalized)) : [];
  if (!normalized) {
    searchResults.innerHTML = '<p class="search-empty">Digite para encontrar uma peça Serena.</p>';
    return;
  }
  if (!matches.length) {
    searchResults.innerHTML = '<p class="search-empty">Nenhum produto encontrado. Tente outro nome ou categoria.</p>';
    return;
  }
  searchResults.innerHTML = "";
  matches.forEach((product) => {
    const result = document.createElement("button");
    result.type = "button";
    result.className = "search-result";
    result.innerHTML = `<img src="${product.image_url}" alt=""><span><strong></strong><small></small></span><i class="bi bi-arrow-up-right"></i>`;
    result.querySelector("img").alt = product.name;
    result.querySelector("strong").textContent = product.name;
    result.querySelector("small").textContent = `${product.category}${product.color ? ` · ${product.color}` : ""}`;
    result.addEventListener("click", () => {
      closeSearch();
      const card = document.querySelector(`.product-card[data-id="${CSS.escape(product.id)}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        window.setTimeout(() => openProduct(card), 350);
      }
    });
    searchResults.appendChild(result);
  });
}
document.getElementById("searchButton").addEventListener("click", openSearch);
document.querySelectorAll("[data-close-search]").forEach((element) => element.addEventListener("click", closeSearch));
searchInput.addEventListener("input", () => renderSearchResults(searchInput.value));

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
  const { data, error } = await supabaseClient.from("products").select("id,name,category,image_url,price,description,color,sizes").eq("active", true).order("created_at", { ascending: false });
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
  const product = products.find((item) => item.id === card.dataset.id) || {};
  const price = Number(card.dataset.price) || 0;
  const name = card.querySelector("h3").textContent;
  const category = card.querySelector("span").textContent;
  document.getElementById("modalProductImage").src = image.src;
  document.getElementById("modalProductImage").alt = image.alt;
  document.getElementById("modalProductCategory").textContent = category;
  document.getElementById("modalProductName").textContent = name;
  document.getElementById("modalProductDescription").textContent = product.description || "Uma escolha Serena para deixar seus dias mais bonitos e confortáveis.";
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  document.getElementById("modalProductMeta").innerHTML = `${product.color ? `<span><b>Cor:</b> ${product.color}</span>` : ""}${sizes.length ? `<span><b>Tamanhos:</b> ${sizes.join(", ")}</span>` : ""}`;
  document.getElementById("modalProductPrice").textContent = price ? formatPrice(price) : "Preço a definir";
  selectedProduct = { id: card.dataset.id || image.src, name, category, image: image.src, price, description: product.description || "", color: product.color || "", sizes };
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
  syncCart();
}
async function syncCart() {
  if (!customer?.code || !supabaseClient) return;
  const { error } = await supabaseClient.rpc("save_customer_cart", {
    customer_code: customer.code,
    cart_data: cart.map((item) => ({ id: item.id, quantity: item.quantity }))
  });
  if (error) console.error("Não foi possível sincronizar a sacola:", error);
}
async function loadCustomerCart() {
  if (!customer?.code || !supabaseClient) return;
  const { data, error } = await supabaseClient.rpc("load_customer_cart", { customer_code: customer.code });
  if (error) {
    console.error("Não foi possível carregar a sacola:", error);
    return;
  }
  cart = (data || []).map((saved) => {
    const product = products.find((item) => item.id === saved.id);
    return product ? { id: product.id, name: product.name, category: product.category, image: product.image_url, price: Number(product.price) || 0, quantity: saved.quantity } : null;
  }).filter(Boolean);
  renderCart();
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
async function checkout() {
  if (!cart.length) return;
  if (!customer) {
    closeCart();
    openCustomerModal();
    document.getElementById("customerMessage").textContent = "Cadastre seus dados antes de finalizar o pedido.";
    return;
  }
  if (cart.some((item) => !item.price)) {
    alert("Cadastre os preços dos produtos antes de finalizar o pedido.");
    return;
  }
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (shippingEstimate === null) {
    closeCart();
    openCustomerModal();
    document.getElementById("customerMessage").textContent = "Calcule o frete antes de finalizar o pedido.";
    return;
  }
  const { error } = await supabaseClient.rpc("create_customer_order", {
    customer_code: customer.code,
    order_data: {
      subtotal,
      shipping: shippingEstimate,
      total: subtotal + shippingEstimate,
      shipping_address: {
        zip: customer.zip, state: customer.state, city: customer.city,
        address: customer.address, number: customer.number,
        complement: customer.complement, neighborhood: customer.neighborhood
      },
      items: cart.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity }))
    }
  });
  if (error) {
    console.error("Não foi possível criar o pedido:", error);
    alert("Não foi possível finalizar o pedido agora. Tente novamente.");
    return;
  }
  cart = [];
  renderCart();
  alert("Pedido registrado com sucesso! Entraremos em contato para confirmar o pagamento.");
  closeCart();
}
document.getElementById("checkoutButton").addEventListener("click", checkout);

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
const registerView = document.getElementById("customerRegisterView");
const customerLoginForm = document.getElementById("customerLoginForm");
const accessTabs = document.querySelectorAll(".customer-access-tab");
function showCustomerAccess(view) {
  const login = view === "login";
  registerView.hidden = login;
  customerLoginForm.hidden = !login;
  accessTabs.forEach((tab) => tab.classList.toggle("is-active", tab.id === (login ? "showLoginButton" : "showRegisterButton")));
  document.getElementById("customerTitle").textContent = login ? "Entrar na minha conta" : "Novo Cliente";
}
document.getElementById("showRegisterButton").addEventListener("click", () => showCustomerAccess("register"));
document.getElementById("showLoginButton").addEventListener("click", () => showCustomerAccess("login"));
customerLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.getElementById("customerLoginMessage");
  message.textContent = "Entrando...";
  const { data, error } = await supabaseClient.rpc("login_customer", {
    customer_email: document.getElementById("customerLoginEmail").value,
    customer_code: document.getElementById("customerLoginCode").value
  });
  if (error) {
    console.error("Não foi possível entrar na conta:", error);
    message.textContent = "E-mail ou código de acesso inválido.";
    return;
  }
  customer = { ...data, shipping: null };
  localStorage.setItem("serena-customer", JSON.stringify(customer));
  updateCustomerHeader();
  renderCustomerAccount();
  await loadCustomerCart();
});
const customerZip = document.getElementById("customerZip");
function cleanZip(value) {
  return value.replace(/\D/g, "").slice(0, 8);
}
function formatZip(value) {
  const digits = cleanZip(value);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}
function shippingByRegion(zip) {
  const region = zip.charAt(0);
  const rates = { "0": 14.9, "1": 14.9, "2": 19.9, "3": 21.9, "4": 27.9, "5": 29.9, "6": 31.9, "7": 24.9, "8": 22.9, "9": 24.9 };
  return rates[region] || null;
}
async function lookupZipCode() {
  const zip = cleanZip(customerZip.value);
  const status = document.getElementById("zipStatus");
  if (zip.length !== 8) return;
  status.textContent = "Consultando endereço...";
  try {
    const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
    if (!response.ok) throw new Error("Falha ao consultar CEP");
    const address = await response.json();
    if (address.erro) throw new Error("CEP não encontrado");
    document.getElementById("customerState").value = address.uf || "";
    document.getElementById("customerCity").value = address.localidade || "";
    document.getElementById("customerAddress").value = address.logradouro || "";
    document.getElementById("customerNeighborhood").value = address.bairro || "";
    status.textContent = "Endereço encontrado.";
  } catch (error) {
    status.textContent = "Não encontramos esse CEP. Confira os números.";
    console.error("Não foi possível consultar o CEP:", error);
  }
}
customerZip.addEventListener("input", () => {
  customerZip.value = formatZip(customerZip.value);
  if (cleanZip(customerZip.value).length === 8) lookupZipCode();
});
document.getElementById("calculateShippingButton").addEventListener("click", () => {
  const zip = cleanZip(customerZip.value);
  const result = document.getElementById("shippingResult");
  if (zip.length !== 8) { result.textContent = "Informe um CEP válido para calcular."; return; }
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (cart.length && cart.some((item) => !item.price)) { result.textContent = "Cadastre os preços dos produtos para calcular o frete."; return; }
  const rate = subtotal >= 199 ? 0 : shippingByRegion(zip);
  if (rate === null) { result.textContent = "Não foi possível estimar o frete para este CEP."; return; }
  shippingEstimate = rate;
  result.textContent = rate === 0 ? "Frete grátis para este pedido." : `Frete estimado: ${formatPrice(rate)}. Prazo e valor finais serão confirmados no checkout.`;
});
document.getElementById("customerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const formValues = Object.fromEntries(formData.entries());
  const { data, error } = await supabaseClient.rpc("create_customer", { customer_data: formValues });
  if (error) {
    console.error("Não foi possível cadastrar cliente:", error);
    document.getElementById("customerMessage").textContent = "Não foi possível salvar seu cadastro. Tente novamente.";
    return;
  }
  customer = { ...data, shipping: shippingEstimate };
  localStorage.setItem("serena-customer", JSON.stringify(customer));
  updateCustomerHeader();
  renderCustomerAccount();
  await loadCustomerCart();
});
document.getElementById("customerCartButton").addEventListener("click", () => { closeCustomerModal(); openCart(); });
document.getElementById("customerHistoryButton").addEventListener("click", async () => {
  const history = document.getElementById("customerHistory");
  history.hidden = false;
  history.innerHTML = "<p>Carregando compras...</p>";
  const { data, error } = await supabaseClient.rpc("list_customer_orders", { customer_code: customer.code });
  if (error) {
    console.error("Não foi possível carregar compras:", error);
    history.innerHTML = "<p>Não foi possível carregar suas compras.</p>";
    return;
  }
  history.innerHTML = data?.length ? data.map((order) => {
    const date = new Date(order.created_at).toLocaleDateString("pt-BR");
    const items = order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ");
    return `<article><strong>Pedido de ${date}</strong><br><small>${items}</small><br><span>${formatPrice(Number(order.total))} · ${order.status === "pending" ? "Aguardando confirmação" : order.status}</span></article>`;
  }).join("") : '<p><i class="bi bi-info-circle me-2"></i>Você ainda não possui compras registradas.</p>';
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
  const cards = productCards();
  cards.forEach((card) => {
    const option = document.createElement("option");
    option.value = card.dataset.id;
    option.textContent = card.querySelector("h3").textContent;
    option.dataset.price = card.dataset.price;
    option.dataset.productId = card.dataset.id;
    adminProduct.appendChild(option);
  });
  const count = document.getElementById("adminProductCount");
  if (count) count.textContent = `${cards.length} ${cards.length === 1 ? "produto" : "produtos"}`;
  const hasProducts = cards.length > 0;
  adminProduct.disabled = !hasProducts;
  document.getElementById("adminPrice").disabled = !hasProducts;
  document.getElementById("deleteProductButton").disabled = !hasProducts;
  if (hasProducts) populateAdminProduct();
}
function populateAdminProduct() {
  const product = products.find((item) => item.id === adminProduct.value) || products[0];
  if (!product) return;
  adminProduct.value = product.id;
  const imageInput = document.getElementById("adminProductImage");
  const imagePreview = document.getElementById("adminProductPreview");
  imageInput.value = "";
  imagePreview.src = product.image_url || "";
  imagePreview.hidden = !product.image_url;
  document.getElementById("adminProductName").value = product.name || "";
  document.getElementById("adminPrice").value = product.price ?? "";
  document.getElementById("adminProductDescription").value = product.description || "";
  document.getElementById("adminProductColor").value = product.color || "";
  document.getElementById("adminProductSizes").value = Array.isArray(product.sizes) ? product.sizes.join(", ") : "";
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
  populateAdminProduct();
});
document.getElementById("adminProductImage").addEventListener("change", (event) => {
  const file = event.target.files[0];
  const preview = document.getElementById("adminProductPreview");
  if (!file) {
    populateAdminProduct();
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});
document.getElementById("priceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = adminProduct.value;
  const price = Number(document.getElementById("adminPrice").value);
  const product = products.find((item) => item.id === id);
  const sizes = document.getElementById("adminProductSizes").value.split(",").map((size) => size.trim()).filter(Boolean);
  if (!id || !product || Number.isNaN(price) || price < 0) { showMessage("adminMessage", "Selecione um produto e informe um preço válido."); return; }
  const updates = { name: document.getElementById("adminProductName").value.trim(), description: document.getElementById("adminProductDescription").value.trim(), color: document.getElementById("adminProductColor").value.trim(), sizes, price };
  if (!updates.name) { showMessage("adminMessage", "Informe o nome do produto."); return; }
  const imageFile = document.getElementById("adminProductImage").files[0];
  if (imageFile) {
    showMessage("adminMessage", "Enviando nova foto...");
    const filePath = `products/${crypto.randomUUID()}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const upload = await supabaseClient.storage.from("products").upload(filePath, imageFile, { upsert: false, contentType: imageFile.type });
    if (upload.error) {
      console.error("Não foi possível enviar a nova foto:", upload.error);
      showMessage("adminMessage", "Não foi possível enviar a nova foto.");
      return;
    }
    const { data: publicUrl } = supabaseClient.storage.from("products").getPublicUrl(filePath);
    updates.image_url = publicUrl.publicUrl;
  }
  const { data: updated, error } = await supabaseClient.from("products").update(updates).eq("id", id).select().single();
  if (error) { showMessage("adminMessage", "Não foi possível salvar o preço."); return; }
  const card = document.querySelector(`.product-card[data-id="${CSS.escape(id)}"]`);
  if (card) {
    card.dataset.price = price;
    card.querySelector("h3").textContent = updated.name;
    card.querySelector("img").src = updated.image_url;
    card.querySelector("img").alt = updated.name;
  }
  Object.assign(product, updated);
  adminProduct.selectedOptions[0].textContent = updated.name;
  adminProduct.selectedOptions[0].dataset.price = price;
  document.getElementById("adminProductImage").value = "";
  document.getElementById("adminProductPreview").src = updated.image_url;
  document.getElementById("adminProductPreview").hidden = false;
  showMessage("adminMessage", "Alterações salvas no Supabase.");
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
  const sizes = document.getElementById("newProductSizes").value.split(",").map((size) => size.trim()).filter(Boolean);
  if (!name || !file) { showMessage("newProductMessage", "Informe o nome e escolha uma imagem."); return; }
  const filePath = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const upload = await supabaseClient.storage.from("products").upload(filePath, file, { upsert: false, contentType: file.type });
  if (upload.error) { showMessage("newProductMessage", "Não foi possível enviar a imagem."); return; }
  const { data: publicUrl } = supabaseClient.storage.from("products").getPublicUrl(filePath);
  const insert = await supabaseClient.from("products").insert({ name, category, image_url: publicUrl.publicUrl, price, description: document.getElementById("newProductDescription").value.trim(), color: document.getElementById("newProductColor").value.trim(), sizes }).select().single();
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
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeProductModal(); closeCart(); closeAdmin(); closeCustomerModal(); closeSearch(); } });
renderCart();
updateCustomerHeader();
loadProducts().then(() => loadCustomerCart());
if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) {
      document.getElementById("loginView").hidden = true;
      document.getElementById("adminView").hidden = false;
      updateAdminProducts();
    }
  });
}
