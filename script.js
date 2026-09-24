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
function isAdminUser(user) {
  return user?.app_metadata?.role === "admin";
}
let cart = [];
let selectedProduct = null;
let selectedVariant = null;
let selectedModel = "";
let selectedColor = "";
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
    const image = document.createElement("img");
    image.src = safeImageUrl(product.image_url);
    image.alt = product.name;
    const text = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = product.name;
    const detail = document.createElement("small");
    detail.textContent = `${product.category}${product.color ? ` · ${product.color}` : ""}`;
    text.append(name, detail);
    const arrow = document.createElement("i");
    arrow.className = "bi bi-arrow-up-right";
    result.append(image, text, arrow);
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

function safeImageUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return ["https:", "http:", "file:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function addProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.id = product.id || "";
  card.dataset.category = product.category;
  card.dataset.price = product.price ?? "";
  const image = document.createElement("img");
  image.src = safeImageUrl(product.image_url || product.image);
  image.alt = product.name;
  const info = document.createElement("div");
  info.className = "product-info";
  const category = document.createElement("span");
  category.textContent = product.category;
  const name = document.createElement("h3");
  name.textContent = product.name;
  const action = document.createElement("strong");
  action.textContent = "Ver produto";
  info.append(category, name, action);
  card.append(image, info);
  catalog.appendChild(card);
}

async function loadProducts() {
  if (!supabaseClient) {
    showMessage("formMessage", "Configuração do Supabase não encontrada.");
    return;
  }
  let { data, error } = await supabaseClient.from("products").select("id,name,category,image_url,price,description,color,sizes,variants").eq("active", true).order("created_at", { ascending: false });
  if (error?.code === "42703") {
    ({ data, error } = await supabaseClient.from("products").select("id,name,category,image_url,price,description,color,sizes").eq("active", true).order("created_at", { ascending: false }));
  }
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
  const variants = Array.isArray(product.variants) && product.variants.length ? product.variants : [{
    model: "",
    color: product.color || "",
    sizes,
    availableSizes: sizes
  }];
  renderProductGallery(product, variants);
  selectedVariant = variants[0];
  selectedModel = "";
  selectedColor = "";
  const meta = document.getElementById("modalProductMeta");
  meta.replaceChildren();
  if (product.color && variants.length === 1) {
    const color = document.createElement("span");
    const colorLabel = document.createElement("b");
    colorLabel.textContent = "Cor: ";
    color.appendChild(colorLabel);
    color.append(document.createTextNode(product.color));
    meta.appendChild(color);
  }

  if (sizes.length && variants.length === 1) {
    const size = document.createElement("span");
    const sizeLabel = document.createElement("b");
    sizeLabel.textContent = "Tamanhos: ";
    size.appendChild(sizeLabel);
    size.append(document.createTextNode(sizes.join(", ")));
    meta.appendChild(size);
  }
  document.getElementById("modalProductPrice").textContent = price ? formatPrice(price) : "Preço a definir";
  selectedProduct = { id: card.dataset.id || image.src, name, category, image: image.src, price, description: product.description || "", color: product.color || "", sizes, variants };
  renderProductOptions();
  productModal.classList.add("is-open");
  productModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function updateSelectedVariantDisplay() {
  if (!selectedProduct || !selectedVariant) return;
  const modalImage = document.getElementById("modalProductImage");
  const variantImage = safeImageUrl(selectedVariant.image_url);
  if (variantImage) modalImage.src = variantImage;
  const meta = document.getElementById("modalProductMeta");
  meta.replaceChildren();
  const details = [
    ["Modelo", selectedVariant.model],
    ["Cor", selectedVariant.color || selectedProduct.color]
  ].filter(([, value]) => value);
  details.forEach(([label, value]) => {
    const detail = document.createElement("span");
    const detailLabel = document.createElement("b");
    detailLabel.textContent = `${label}: `;
    detail.append(detailLabel, document.createTextNode(value));
    meta.appendChild(detail);
  });
}

function renderProductGallery(product, variants) {
  const gallery = document.getElementById("productGallery");
  gallery.replaceChildren();
  const images = [product.image_url, ...variants.map((variant) => variant.image_url)].filter(Boolean).filter((url, index, list) => list.indexOf(url) === index);
  images.forEach((url, index) => {
    const thumbnail = document.createElement("button");
    thumbnail.type = "button";
    thumbnail.className = `product-gallery-thumb${index === 0 ? " is-selected" : ""}`;
    thumbnail.setAttribute("aria-label", `Ver foto ${index + 1}`);
    const image = document.createElement("img");
    image.src = safeImageUrl(url);
    image.alt = `${product.name} - foto ${index + 1}`;
    thumbnail.appendChild(image);
    thumbnail.addEventListener("click", () => {
      document.getElementById("modalProductImage").src = image.src;
      gallery.querySelectorAll(".product-gallery-thumb").forEach((item) => item.classList.remove("is-selected"));
      thumbnail.classList.add("is-selected");
    });
    gallery.appendChild(thumbnail);
  });
}

function parseSizes(value) {
  return value.split(",").map((size) => size.trim()).filter(Boolean);
}

function normalizeVariants(variants, color, sizes) {
  if (!Array.isArray(variants) || !variants.length) return [];
  return variants.map((variant) => ({
    model: String(variant.model || "").trim(),
    color: String(variant.color || color || "").trim(),
    sizes: Array.isArray(variant.sizes) && variant.sizes.length ? variant.sizes : sizes,
    availableSizes: Array.isArray(variant.availableSizes) && variant.availableSizes.length ? variant.availableSizes : (Array.isArray(variant.sizes) ? variant.sizes : sizes),
    stock: variant.stock === undefined || variant.stock === "" ? undefined : Math.max(0, Number(variant.stock) || 0),
    stockBySize: variant.stockBySize && typeof variant.stockBySize === "object" ? variant.stockBySize : {},
    image_url: String(variant.image_url || "").trim()
  }));
}

function variantStockEntries(variant) {
  const storedStock = variant.stockBySize && typeof variant.stockBySize === "object" ? variant.stockBySize : {};
  if (Object.keys(storedStock).length) return storedStock;
  const legacyEntries = (Array.isArray(variant.sizes) ? variant.sizes : []).map((entry) => String(entry).split(":"));
  return Object.fromEntries(legacyEntries.filter(([size, stock]) => size && /^\d+$/.test(stock || "")).map(([size, stock]) => [size.trim(), Number(stock)]));
}

function renderVariantEditor(containerId, variants = []) {
  const container = document.getElementById(containerId);
  container.replaceChildren();
  const rows = variants.length ? variants : [{}];
  rows.forEach((variant) => {
    const row = document.createElement("div");
    row.className = "admin-variant-row";
    row.innerHTML = '<label>Modelo<input data-variant="model" placeholder="Ex.: Clássico"></label><label>Cor<input data-variant="color" placeholder="Ex.: Azul"></label><label>Foto da variação<input data-variant="image" type="file" accept="image/*"><small class="variant-image-name"></small></label><label>Tamanhos<input data-variant="sizes" placeholder="P, M, G"></label><label>Estoque<input data-variant="stock" placeholder="10, 5, 0" inputmode="numeric"></label><button class="admin-remove-variant" type="button" aria-label="Remover variação"><i class="bi bi-trash"></i></button>';
    row.querySelector('[data-variant="model"]').value = variant.model || "";
    row.querySelector('[data-variant="color"]').value = variant.color || "";
    row.dataset.imageUrl = variant.image_url || "";
    row.querySelector(".variant-image-name").textContent = variant.image_url ? "Foto cadastrada. Escolha outra para substituir." : "Nenhuma foto cadastrada.";
    const stockBySize = variantStockEntries(variant);
    const sizes = Object.keys(stockBySize).length ? Object.keys(stockBySize) : (Array.isArray(variant.sizes) ? variant.sizes : []);
    row.querySelector('[data-variant="sizes"]').value = sizes.join(", ");
    row.querySelector('[data-variant="stock"]').value = sizes.map((size) => stockBySize[size] ?? variant.stock ?? 0).join(", ");
    row.querySelector('[data-variant="image"]').addEventListener("change", (event) => {
      row.querySelector(".variant-image-name").textContent = event.target.files[0]?.name || (variant.image_url ? "Foto cadastrada." : "Nenhuma foto cadastrada.");
    });
    row.querySelector(".admin-remove-variant").addEventListener("click", () => {
      if (container.children.length > 1) row.remove();
    });
    container.appendChild(row);
  });
}

function readVariantEditor(containerId, fallbackColor, fallbackSizes) {
  return [...document.getElementById(containerId).children].map((row) => {
    const model = row.querySelector('[data-variant="model"]').value.trim();
    const color = row.querySelector('[data-variant="color"]').value.trim() || fallbackColor;
    const sizeValues = parseSizes(row.querySelector('[data-variant="sizes"]').value).map((size) => size.split(":")[0].trim());
    const stockValues = parseSizes(row.querySelector('[data-variant="stock"]').value);
    const stockBySize = {};
    let stockInvalid = false;
    if (sizeValues.length !== stockValues.length) stockInvalid = true;
    sizeValues.forEach((size, index) => {
      const rawStock = stockValues[index];
      if (/^\d+$/.test(rawStock || "")) stockBySize[size] = Number(rawStock);
      else stockInvalid = true;
    });
    const sizes = sizeValues.length ? sizeValues : fallbackSizes;
    return {
      model, color, sizes,
      availableSizes: sizes.filter((size) => stockBySize[size] > 0),
      stockBySize, stockInvalid,
      stock: Object.values(stockBySize).reduce((total, value) => total + value, 0),
      image_url: row.dataset.imageUrl || "",
      imageFile: row.querySelector('[data-variant="image"]').files[0] || null
    };
  }).filter((variant) => variant.model || variant.color || variant.sizes.length);
}

function variantProductFields(variants) {
  const color = variants.find((variant) => variant.color)?.color || "";
  const sizes = [...new Set(variants.flatMap((variant) => variant.sizes || []))];
  return { color, sizes };
}

function renderProductOptions() {
  const options = document.getElementById("productOptions");
  const addButton = document.getElementById("addToCartButton");
  options.replaceChildren();
  const variants = selectedProduct?.variants || [];
  const models = [...new Set(variants.map((variant) => variant.model).filter(Boolean))];
  const colors = [...new Set(variants.map((variant) => variant.color).filter(Boolean))];
  const isVariantAvailable = (variant) => variant.available !== false && (variant.stock === undefined || variant.stock > 0);
  const hasStockForSize = (variant, size) => {
    const stockBySize = variantStockEntries(variant);
    if (Object.keys(stockBySize).length) return Number(stockBySize[size] ?? 0) > 0;
    return (!variant.sizes?.length || variant.sizes.includes(size)) && (variant.stock === undefined || variant.stock > 0);
  };
  const activeVariant = variants.find((variant) =>
    (!selectedModel || variant.model === selectedModel) &&
    (!selectedColor || variant.color === selectedColor) &&
    (!selectedVariant?.selectedSize || hasStockForSize(variant, selectedVariant.selectedSize))
  ) || selectedVariant || variants[0];
  selectedVariant = activeVariant;
  updateSelectedVariantDisplay();
  const sizes = [...new Set(variants.flatMap((variant) => variant.sizes || []).filter(Boolean))];
  const availableSizes = sizes.filter((size) => variants.some((variant) => isVariantAvailable(variant) && hasStockForSize(variant, size)));
  const addOption = (label, values, property, unavailableValues = []) => {
    const availableValues = values.filter((value) => !unavailableValues.includes(value));
    if (property !== "size" && availableValues.length <= 1) return;
    if (!values.length) return;
    const fieldset = document.createElement("fieldset");
    fieldset.className = "product-option-group";
    const legend = document.createElement("legend");
    legend.textContent = label;
    fieldset.appendChild(legend);
    values.forEach((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "product-option";
      button.textContent = value;
      button.dataset.option = property;
      button.disabled = unavailableValues.includes(value);
      button.classList.toggle("is-selected", (property === "model" && selectedModel === value) || (property === "color" && selectedColor === value) || (property === "size" && selectedVariant?.selectedSize === value));
      button.addEventListener("click", () => {
        if (property === "model") {
          selectedModel = value;
          selectedVariant = variants.find((variant) => variant.model === value && (!selectedColor || variant.color === selectedColor)) ||
            variants.find((variant) => variant.model === value);
          selectedVariant.selectedSize = "";
          renderProductOptions();
        } else if (property === "color") {
          selectedColor = value;
          selectedVariant = variants.find((variant) => variant.color === value && (!selectedModel || variant.model === selectedModel) && hasStockForSize(variant, selectedVariant.selectedSize)) ||
            variants.find((variant) => variant.color === value);
          if (selectedVariant) selectedVariant.selectedSize = document.querySelector('.product-option[data-option="size"].is-selected')?.textContent || "";
          renderProductOptions();
        } else {
          selectedVariant.selectedSize = value;
          const matchingVariants = variants.filter((variant) => isVariantAvailable(variant) && hasStockForSize(variant, value));
          if (matchingVariants.length === 1) selectedColor = matchingVariants[0].color || "";
          selectedVariant = matchingVariants.find((variant) => !selectedColor || variant.color === selectedColor) || matchingVariants[0] || selectedVariant;
          renderProductOptions();
        }

      });
      fieldset.appendChild(button);
    });
    options.appendChild(fieldset);
  };
  addOption("Cor", selectedVariant?.selectedSize ? colors : [], "color", colors.filter((color) => !variants.some((variant) => variant.color === color && hasStockForSize(variant, selectedVariant.selectedSize) && isVariantAvailable(variant))));
  addOption("Tamanho", sizes, "size", sizes.filter((size) => !availableSizes.includes(size) || !hasStockForSize(activeVariant, size)));
  const valid = isVariantAvailable(activeVariant) && (!sizes.length || Boolean(activeVariant?.selectedSize));
  addButton.disabled = !valid;
  document.getElementById("productSelectionMessage").textContent = valid ? "" : "Selecione um tamanho disponível para continuar.";
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
  cartItems.replaceChildren();
  if (!cart.length) {
    const empty = document.createElement("p");
    empty.className = "cart-empty";
    empty.textContent = "Sua sacola está vazia.";
    cartItems.appendChild(empty);
  }
  cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    const image = document.createElement("img");
    image.src = safeImageUrl(item.image);
    image.alt = item.name;
    const info = document.createElement("div");
    info.className = "cart-item-info";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const category = document.createElement("small");
    const choices = [item.model, item.color, item.size].filter(Boolean).join(" · ");
    category.textContent = choices ? `${item.category} · ${choices}` : item.category;
    const price = document.createElement("span");
    price.textContent = item.price ? formatPrice(item.price) : "Preço a definir";
    const controls = document.createElement("div");
    controls.className = "quantity-control";
    const decrease = document.createElement("button");
    decrease.dataset.action = "decrease";
    decrease.setAttribute("aria-label", "Diminuir quantidade");
    decrease.textContent = "−";
    const quantity = document.createElement("b");
    quantity.textContent = item.quantity;
    const increase = document.createElement("button");
    increase.dataset.action = "increase";
    increase.setAttribute("aria-label", "Aumentar quantidade");
    increase.textContent = "+";
    const remove = document.createElement("button");
    remove.className = "remove-item";
    remove.dataset.action = "remove";
    remove.textContent = "Remover";
    controls.append(decrease, quantity, increase, remove);
    info.append(name, category, price, controls);
    row.append(image, info);
    row.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => updateCart(item.id, button.dataset.action)));
    cartItems.appendChild(row);
  });
  const pendingPrice = cart.some((item) => !item.price);
  cartTotal.textContent = pendingPrice ? "Preço a definir" : formatPrice(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
  document.querySelector(".bag-count").textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  syncCart();
}
async function syncCart() {
  if (!customer?.id || !supabaseClient) return;
  const { error } = await supabaseClient.rpc("save_customer_cart", {
    cart_data: cart.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      variantKey: item.variantKey || "",
      variant: { model: item.model || "", color: item.color || "", size: item.size || "" }
    }))
  });
  if (error) console.error("Não foi possível sincronizar a sacola:", error);
}
async function loadCustomerCart() {
  if (!customer?.id || !supabaseClient) return;
  const { data, error } = await supabaseClient.rpc("load_customer_cart");
  if (error) {
    console.error("Não foi possível carregar a sacola:", error);
    return;
  }
  cart = (data || []).map((saved) => {
    const product = products.find((item) => item.id === saved.id);
    return product ? {
      id: product.id, name: product.name, category: product.category, image: product.image_url,
      price: Number(product.price) || 0, quantity: saved.quantity,
      ...(saved.variant || {}), variantKey: JSON.stringify(saved.variant || {})
    } : null;
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
  if (!selectedProduct || !selectedVariant || (selectedVariant.sizes?.length && !selectedVariant.selectedSize)) return;
  const variantKey = JSON.stringify({ model: selectedVariant.model || "", color: selectedVariant.color || "", size: selectedVariant.selectedSize || "" });
  const item = { ...selectedProduct, ...selectedVariant, size: selectedVariant.selectedSize || "", variantKey, quantity: 1 };
  const existing = cart.find((cartItem) => cartItem.id === selectedProduct.id && cartItem.variantKey === variantKey);
  if (existing) existing.quantity += 1; else cart.push(item);
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
    order_data: {
      subtotal,
      shipping: shippingEstimate,
      total: subtotal + shippingEstimate,
      shipping_address: {
        zip: customer.zip, state: customer.state, city: customer.city,
        address: customer.address, number: customer.number,
        complement: customer.complement, neighborhood: customer.neighborhood
      },
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        variant: { model: item.model || "", color: item.color || "", size: item.size || "" }
      }))
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
  const { error: loginError } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("customerLoginEmail").value,
    password: document.getElementById("customerLoginPassword").value
  });
  if (loginError) {
    message.textContent = "E-mail ou senha inválidos.";
    return;
  }
  const { data, error } = await supabaseClient.rpc("get_customer_profile");
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
  const password = formValues.password;
  delete formValues.password;
  const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email: formValues.email, password });
  if (authError) {
    document.getElementById("customerMessage").textContent = "Não foi possível criar a conta. Verifique o e-mail e tente novamente.";
    return;
  }
  if (!authData.session) {
    document.getElementById("customerMessage").textContent = "Conta criada. Confirme seu e-mail para continuar.";
    return;
  }
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
  const { data, error } = await supabaseClient.rpc("list_customer_orders");
  if (error) {
    console.error("Não foi possível carregar compras:", error);
    history.innerHTML = "<p>Não foi possível carregar suas compras.</p>";
    return;
  }
  history.replaceChildren();
  if (!data?.length) {
    const empty = document.createElement("p");
    empty.textContent = "Você ainda não possui compras registradas.";
    history.appendChild(empty);
    return;
  }
  data.forEach((order) => {
    const date = new Date(order.created_at).toLocaleDateString("pt-BR");
    const items = order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ");
    const article = document.createElement("article");
    const title = document.createElement("strong");
    title.textContent = `Pedido de ${date}`;
    const itemList = document.createElement("small");
    itemList.textContent = items;
    const total = document.createElement("span");
    total.textContent = `${formatPrice(Number(order.total))} · ${order.status === "pending" ? "Aguardando confirmação" : order.status}`;
    article.append(title, document.createElement("br"), itemList, document.createElement("br"), total);
    history.appendChild(article);
  });
});
document.getElementById("customerLogout").addEventListener("click", () => {
  customer = null;
  localStorage.removeItem("serena-customer");
  supabaseClient?.auth.signOut();
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
  document.getElementById("adminProductCategory").value = product.category || "outras";
  document.getElementById("adminPrice").value = product.price ?? "";
  document.getElementById("adminProductDescription").value = product.description || "";
  renderVariantEditor("adminVariants", normalizeVariants(product.variants, product.color, product.sizes || []));
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
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!isAdminUser(sessionData.session?.user)) {
    await supabaseClient.auth.signOut();
    showMessage("loginMessage", "Esta conta não possui permissão administrativa.");
    return;
  }
  document.getElementById("loginView").hidden = true;
  document.getElementById("adminView").hidden = false;
  updateAdminProducts();
});
adminProduct.addEventListener("change", () => {
  populateAdminProduct();
});
document.getElementById("addAdminVariant").addEventListener("click", () => {
  const current = readVariantEditor("adminVariants", "", []);
  renderVariantEditor("adminVariants", [...current, {}]);
});
document.getElementById("addNewVariant").addEventListener("click", () => {
  const current = readVariantEditor("newVariants", "", []);
  renderVariantEditor("newVariants", [...current, {}]);
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
  if (!id || !product || Number.isNaN(price) || price < 0) { showMessage("adminMessage", "Selecione um produto e informe um preço válido."); return; }
  const variants = readVariantEditor("adminVariants", product.color || "", product.sizes || []);
  if (variants.some((variant) => variant.stockInvalid || Object.values(variant.stockBySize).some((stock) => !Number.isInteger(stock) || stock < 0))) { showMessage("adminMessage", "O estoque deve usar números inteiros iguais ou maiores que zero."); return; }
  if (!await prepareVariantImages(variants, "adminMessage")) return;
  const variantsToSave = variants.map(({ stockInvalid, imageFile, ...variant }) => variant);
  const productFields = variantProductFields(variantsToSave);
  const updates = { name: document.getElementById("adminProductName").value.trim(), category: document.getElementById("adminProductCategory").value, description: document.getElementById("adminProductDescription").value.trim(), color: productFields.color, sizes: productFields.sizes, variants: variantsToSave, price };
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
  if (error) {
    console.error("Não foi possível salvar o produto:", error);
    showMessage("adminMessage", error.code === "PGRST116" ? "Sessão sem permissão administrativa. Saia e entre novamente com a conta administradora." : "Não foi possível salvar as alterações.");
    return;
  }
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
  const variants = readVariantEditor("newVariants", "", []);
  if (!name || !file || price === null || Number.isNaN(price) || price < 0) { showMessage("newProductMessage", "Informe nome, imagem e um preço válido."); return; }
  if (variants.some((variant) => variant.stockInvalid || Object.values(variant.stockBySize).some((stock) => !Number.isInteger(stock) || stock < 0))) { showMessage("newProductMessage", "O estoque deve usar números inteiros iguais ou maiores que zero."); return; }
  if (!await prepareVariantImages(variants, "newProductMessage")) return;
  const variantsToSave = variants.map(({ stockInvalid, imageFile, ...variant }) => variant);
  const filePath = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const upload = await supabaseClient.storage.from("products").upload(filePath, file, { upsert: false, contentType: file.type });
  if (upload.error) { showMessage("newProductMessage", "Não foi possível enviar a imagem."); return; }
  const { data: publicUrl } = supabaseClient.storage.from("products").getPublicUrl(filePath);
  const productFields = variantProductFields(variantsToSave);
  const insert = await supabaseClient.from("products").insert({ name, category, image_url: publicUrl.publicUrl, price, description: document.getElementById("newProductDescription").value.trim(), color: productFields.color, sizes: productFields.sizes, variants: variantsToSave }).select().single();
  if (insert.error) { showMessage("newProductMessage", "Imagem enviada, mas não foi possível salvar o produto."); return; }
  addProductCard(insert.data);
  products.push(insert.data);
  updateAdminProducts();
  showMessage("newProductMessage", "Produto salvo no Supabase.");
  event.target.reset();
  document.getElementById("newProductPreview").hidden = true;
  renderVariantEditor("newVariants");
});
document.getElementById("deleteProductButton").addEventListener("click", async () => {
  const id = adminProduct.value;
  const name = adminProduct.selectedOptions[0]?.textContent;
  if (!id || !window.confirm(`Remover "${name}" da vitrine? O produto será ocultado, sem apagar pedidos antigos.`)) return;
  const { error } = await supabaseClient.from("products").update({ active: false }).eq("id", id);
  if (error) { showMessage("adminMessage", "Não foi possível remover o produto da vitrine."); return; }
  document.querySelector(`.product-card[data-id="${CSS.escape(id)}"]`)?.remove();
  updateAdminProducts();
  showMessage("adminMessage", "Produto removido da vitrine.");
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
renderVariantEditor("newVariants");
loadProducts().then(() => loadCustomerCart());
if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (!session || isAdminUser(session.user)) return;
    const { data } = await supabaseClient.rpc("get_customer_profile");
    if (data) {
      customer = { ...data, shipping: null };
      localStorage.setItem("serena-customer", JSON.stringify(customer));
      updateCustomerHeader();
    }
  });
  supabaseClient.auth.getSession().then(({ data }) => {
    if (isAdminUser(data.session?.user)) {
      document.getElementById("loginView").hidden = true;
      document.getElementById("adminView").hidden = false;
      updateAdminProducts();
    }
  });
}

async function prepareVariantImages(variants, messageId) {
  for (const variant of variants) {
    if (!variant.imageFile) {
      delete variant.imageFile;
      delete variant.stockInvalid;
      continue;
    }
    const filePath = `products/${crypto.randomUUID()}-${variant.imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const upload = await supabaseClient.storage.from("products").upload(filePath, variant.imageFile, { upsert: false, contentType: variant.imageFile.type });
    if (upload.error) {
      console.error("Não foi possível enviar a foto da variação:", upload.error);
      showMessage(messageId, "Não foi possível enviar uma das fotos das variações.");
      return false;
    }
    variant.image_url = supabaseClient.storage.from("products").getPublicUrl(filePath).data.publicUrl;
    delete variant.imageFile;
    delete variant.stockInvalid;
  }
  return true;
}
