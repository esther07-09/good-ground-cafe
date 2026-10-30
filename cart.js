const cartStorageKey = "good-ground-cafe-cart";
const offersStorageKey = "good-ground-cafe-offers";
const offerDefinitions = {
  coffee_bogo: { title: "Buy 1 Get 1 Coffee", validUntil: "2026-12-31" },
  weekend_20: { title: "20% Off on Weekends", validUntil: "2026-12-27" },
  cake_cookie: { title: "Free Cookie with Any Cake", validUntil: "2026-11-30" },
};
const activeProductIds = new Set([
  "filter-coffee",
  "masala-chai",
  "cappuccino",
  "espresso-shot",
  "cold-coffee",
  "iced-latte",
  "vanilla-cold-brew",
  "iced-mocha",
  "veg-puff",
  "grilled-sandwich",
  "chocolate-brownie",
  "choco-chip-cookie",
  "caramel-custard",
]);
const coffeeProductIds = new Set([
  "filter-coffee",
  "cappuccino",
  "espresso-shot",
  "cold-coffee",
  "iced-latte",
  "vanilla-cold-brew",
  "iced-mocha",
]);
const cakeProductIds = new Set();
const cookieProductId = "choco-chip-cookie";

function readClaimedOffers() {
  try {
    const stored = JSON.parse(localStorage.getItem(offersStorageKey) || "[]");
    if (!Array.isArray(stored)) return [];
    return [...new Set(stored.filter((id) =>
      typeof id === "string" &&
      Object.hasOwn(offerDefinitions, id) &&
      isOfferAvailable(id)
    ))];
  } catch {
    return [];
  }
}

function readCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((item) =>
      item && typeof item.id === "string" && activeProductIds.has(item.id) &&
      typeof item.name === "string" &&
      Number.isFinite(item.price) && item.price > 0 &&
      Number.isSafeInteger(item.quantity) && item.quantity > 0
    );
  } catch {
    return [];
  }
}

let cart = readCart();
let claimedOffers = readClaimedOffers();

function cafeDateParts(date = new Date()) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
}

function localDateString(date = new Date()) {
  const { year, month, day } = cafeDateParts(date);
  return `${year}-${month}-${day}`;
}

function isOfferCurrent(offerId, date = new Date()) {
  const offer = offerDefinitions[offerId];
  return Boolean(offer && localDateString(date) <= offer.validUntil);
}

function isWeekend(date = new Date()) {
  const weekday = cafeDateParts(date).weekday;
  return weekday === "Sat" || weekday === "Sun";
}

function isOfferAvailable(offerId) {
  return offerId !== "cake_cookie" || cakeProductIds.size > 0;
}

function calculatePricing(items = cart, date = new Date()) {
  const subtotalPaise = items.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0,
  );
  const discounts = [];
  const freeItems = [];
  let fixedDiscountPaise = 0;
  const currentOffers = claimedOffers.filter((id) => isOfferCurrent(id, date));

  if (currentOffers.includes("coffee_bogo")) {
    const coffeePrices = items.flatMap((item) =>
      coffeeProductIds.has(item.id)
        ? Array(item.quantity).fill(Math.round(item.price * 100))
        : []
    );
    if (coffeePrices.length >= 2) {
      const freeCoffeePaise = Math.min(...coffeePrices);
      fixedDiscountPaise += freeCoffeePaise;
      discounts.push({ offerId: "coffee_bogo", title: offerDefinitions.coffee_bogo.title, amountPaise: freeCoffeePaise });
    }
  }

  if (currentOffers.includes("cake_cookie")) {
    const qualifyingCake = items.some((item) => cakeProductIds.has(item.id));
    if (qualifyingCake) {
      const cookie = items.find((item) => item.id === cookieProductId);
      const cookiePaise = cookie ? Math.round(cookie.price * 100) : 0;
      if (cookiePaise > 0) {
        fixedDiscountPaise += cookiePaise;
        discounts.push({ offerId: "cake_cookie", title: offerDefinitions.cake_cookie.title, amountPaise: cookiePaise });
      } else {
        const cookiePrice = 90 * 100;
        fixedDiscountPaise += cookiePrice;
        discounts.push({ offerId: "cake_cookie", title: offerDefinitions.cake_cookie.title, amountPaise: cookiePrice });
        freeItems.push({ id: cookieProductId, name: "Choco Chip Cookie", price: cookiePrice / 100, quantity: 1 });
      }
    }
  }

  if (currentOffers.includes("weekend_20") && isWeekend(date)) {
    const weekendDiscountPaise = Math.floor(
      ((subtotalPaise - fixedDiscountPaise) * 20 + 50) / 100,
    );
    if (weekendDiscountPaise > 0) {
      discounts.push({ offerId: "weekend_20", title: offerDefinitions.weekend_20.title, amountPaise: weekendDiscountPaise });
    }
  }

  const discountPaise = discounts.reduce((sum, discount) => sum + discount.amountPaise, 0);
  const discountIds = new Set(discounts.map((discount) => discount.offerId));
  const offerMessages = currentOffers
    .filter((id) => !discountIds.has(id))
    .map((id) => {
      if (id === "coffee_bogo") return { offerId: id, title: offerDefinitions[id].title, message: "Add 2 or more coffees to use this offer." };
      if (id === "weekend_20") return { offerId: id, title: offerDefinitions[id].title, message: "Applies on Saturday and Sunday only." };
      return { offerId: id, title: offerDefinitions[id].title, message: "No cake is currently on the menu, so the free cookie is not available yet." };
    });

  return {
    subtotalPaise,
    discountPaise,
    totalPaise: Math.max(0, subtotalPaise - discountPaise),
    discounts,
    freeItems,
    offerMessages,
    claimedOfferIds: currentOffers,
  };
}

function saveCart() {
  localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  updateCartCount();
  renderCart();
  renderOfferButtons();
}

function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll(".cart-count").forEach((badge) => {
    badge.textContent = String(count);
  });
  document.querySelectorAll(".cart-link").forEach((link) => {
    link.setAttribute("aria-label", `Shopping cart, ${count} ${count === 1 ? "item" : "items"}`);
  });
}

function formatRupees(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function renderCart() {
  const list = document.querySelector("#cart-items");
  if (!list) return;

  const empty = document.querySelector("#cart-empty");
  const summary = document.querySelector("#cart-summary");
  const checkout = document.querySelector("#checkout-button");
  const subtotalNode = document.querySelector("#cart-subtotal");
  const discountsNode = document.querySelector("#cart-discounts");
  const totalNode = document.querySelector("#cart-total");
  list.replaceChildren();
  empty.hidden = cart.length > 0;
  summary.hidden = cart.length === 0;
  checkout.hidden = cart.length === 0;

  cart.forEach((item) => {
    const row = document.createElement("article");
    row.className = "cart-item";

    const details = document.createElement("div");
    details.className = "cart-item-details";
    const name = document.createElement("h2");
    name.textContent = item.name;
    const unitPrice = document.createElement("p");
    unitPrice.className = "cart-unit-price";
    unitPrice.textContent = `${formatRupees(item.price)} each`;
    details.append(name, unitPrice);

    const quantity = document.createElement("div");
    quantity.className = "quantity-control";
    quantity.setAttribute("aria-label", `Quantity for ${item.name}`);
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Decrease ${item.name} quantity`);
    decrease.addEventListener("click", () => changeQuantity(item.id, -1));
    const count = document.createElement("span");
    count.textContent = String(item.quantity);
    count.setAttribute("aria-live", "polite");
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Increase ${item.name} quantity`);
    increase.addEventListener("click", () => changeQuantity(item.id, 1));
    quantity.append(decrease, count, increase);

    const lineTotal = document.createElement("strong");
    lineTotal.className = "cart-line-total";
    lineTotal.textContent = formatRupees(item.price * item.quantity);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-item";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${item.name} from cart`);
    remove.addEventListener("click", () => removeItem(item.id));

    row.append(details, quantity, lineTotal, remove);
    list.append(row);
  });

  const pricing = calculatePricing();
  if (subtotalNode) subtotalNode.textContent = formatRupees(pricing.subtotalPaise / 100);
  if (discountsNode) {
    discountsNode.replaceChildren();
    pricing.discounts.forEach((discount) => {
      const row = document.createElement("p");
      row.className = "cart-discount-row";
      const label = document.createElement("span");
      label.textContent = discount.title;
      const amount = document.createElement("strong");
      amount.textContent = `−${formatRupees(discount.amountPaise / 100)}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-offer";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => removeOffer(discount.offerId));
      row.append(label, amount, remove);
      discountsNode.append(row);
    });
    pricing.offerMessages.forEach((offer) => {
      const row = document.createElement("p");
      row.className = "cart-offer-message";
      const message = document.createElement("span");
      message.textContent = `${offer.title}: ${offer.message}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-offer";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => removeOffer(offer.offerId));
      row.append(message, remove);
      discountsNode.append(row);
    });
    claimedOffers
      .filter((id) => !pricing.claimedOfferIds.includes(id))
      .forEach((id) => {
        const row = document.createElement("p");
        row.className = "cart-offer-message";
        const message = document.createElement("span");
        message.textContent = `${offerDefinitions[id].title}: Offer expired.`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-offer";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => removeOffer(id));
        row.append(message, remove);
        discountsNode.append(row);
      });
  }
  totalNode.textContent = formatRupees(pricing.totalPaise / 100);
}

function removeOffer(offerId) {
  const updatedOffers = claimedOffers.filter((id) => id !== offerId);
  localStorage.setItem(offersStorageKey, JSON.stringify(updatedOffers));
  claimedOffers = updatedOffers;
  renderCart();
  renderOfferButtons();
}

function renderOfferButtons() {
  document.querySelectorAll(".offer-card").forEach((card) => {
    const offerId = card.dataset.offerId;
    const button = card.querySelector(".offer-button");
    const status = card.querySelector(".offer-status");
    if (!offerId || !button || !status || !offerDefinitions[offerId]) return;
    const current = isOfferCurrent(offerId);
    const claimed = claimedOffers.includes(offerId);
    const available = isOfferAvailable(offerId);
    button.disabled = !current || claimed || !available;
    button.textContent = claimed ? "Offer Claimed" : "Claim Offer";
    if (!current) {
      status.textContent = "This offer has expired.";
    } else if (!available) {
      status.textContent = "Unavailable until a cake is added to the menu.";
    } else if (claimed && offerId === "cake_cookie") {
      status.textContent = "Saved to cart. Add a cake to unlock the free cookie.";
    } else if (claimed) {
      status.textContent = "Offer saved to your cart.";
    } else {
      status.textContent = "";
    }
  });
}

document.querySelectorAll(".offer-button").forEach((button) => {
  button.addEventListener("click", () => {
    const offerId = button.closest(".offer-card")?.dataset.offerId;
    if (
      !offerId ||
      !isOfferCurrent(offerId) ||
      !isOfferAvailable(offerId) ||
      claimedOffers.includes(offerId)
    ) return;
    const updatedOffers = [...claimedOffers, offerId];
    try {
      localStorage.setItem(offersStorageKey, JSON.stringify(updatedOffers));
    } catch {
      const status = button.closest(".offer-card")?.querySelector(".offer-status");
      if (status) status.textContent = "We couldn't save this offer. Please try again.";
      return;
    }
    claimedOffers = updatedOffers;
    renderCart();
    renderOfferButtons();
  });
});

function changeQuantity(id, amount) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter((entry) => entry.id !== id);
  saveCart();
}

function removeItem(id) {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
}

document.querySelectorAll(".menu-card .add-to-cart").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".menu-card");
    const price = Number(card.querySelector(".price").dataset.inrPrice);
    const id = card.dataset.productId;
    const name = card.querySelector("h3").textContent.trim();
    const existing = cart.find((item) => item.id === id);
    if (existing) existing.quantity += 1;
    else cart.push({ id, name, price, quantity: 1 });
    saveCart();
    button.textContent = "Added to Cart";
    window.setTimeout(() => { button.textContent = "Add to Cart"; }, 1200);
  });
});

window.goodGroundCart = {
  getItems: () => cart.map((item) => ({ ...item })),
  getPricing: () => calculatePricing(),
  formatRupees,
  clear: () => {
    cart = [];
    claimedOffers = [];
    localStorage.removeItem(offersStorageKey);
    saveCart();
  },
};

updateCartCount();
renderCart();
renderOfferButtons();