const cartApi = window.goodGroundCart;
const checkoutItems = cartApi.getItems();
const checkoutLayout = document.querySelector("#checkout-layout");
const emptyCheckout = document.querySelector("#checkout-empty");
const summaryItems = document.querySelector("#summary-items");
const checkoutPricing = cartApi.getPricing();
const checkoutTotal = checkoutPricing.totalPaise / 100;
const pincodeInput = document.querySelector("#customer-pincode");
const pincodeError = document.querySelector("#pincode-error");
const placeOrderButton = document.querySelector(".place-order");

function updatePincodeValidity() {
  pincodeInput.value = pincodeInput.value.replace(/\D/g, "").slice(0, 6);
  const isValid = /^600\d{3}$/.test(pincodeInput.value);
  pincodeError.hidden = isValid;
  pincodeInput.setAttribute("aria-invalid", String(!isValid));
  placeOrderButton.disabled = !isValid;
  return isValid;
}

pincodeInput.addEventListener("input", updatePincodeValidity);
updatePincodeValidity();

document.querySelector("#summary-count").textContent = `${checkoutItems.reduce((sum, item) => sum + item.quantity, 0)} items`;
document.querySelector("#summary-subtotal").textContent = cartApi.formatRupees(checkoutPricing.subtotalPaise / 100);
document.querySelector("#summary-total").textContent = cartApi.formatRupees(checkoutTotal);
checkoutLayout.hidden = checkoutItems.length === 0;
emptyCheckout.hidden = checkoutItems.length !== 0;

checkoutItems.forEach((item) => {
  const row = document.createElement("div");
  row.className = "summary-item";
  const name = document.createElement("p");
  name.className = "summary-item-name";
  name.textContent = item.name;
  const quantity = document.createElement("span");
  quantity.className = "summary-item-quantity";
  quantity.textContent = `Qty ${item.quantity} · ${cartApi.formatRupees(item.price)} each`;
  const price = document.createElement("strong");
  price.className = "summary-item-price";
  price.textContent = cartApi.formatRupees(item.price * item.quantity);
  row.append(name, quantity, price);
  summaryItems.append(row);
});

checkoutPricing.freeItems.forEach((item) => {
  const row = document.createElement("div");
  row.className = "summary-item";
  const name = document.createElement("p");
  name.className = "summary-item-name";
  name.textContent = item.name;
  const quantity = document.createElement("span");
  quantity.className = "summary-item-quantity";
  quantity.textContent = `Qty ${item.quantity} · Free offer item`;
  const price = document.createElement("strong");
  price.className = "summary-item-price";
  price.textContent = cartApi.formatRupees(0);
  row.append(name, quantity, price);
  summaryItems.append(row);
});

const summaryDiscounts = document.querySelector("#summary-discounts");
checkoutPricing.discounts.forEach((discount) => {
  const row = document.createElement("p");
  row.className = "summary-discount";
  const label = document.createElement("span");
  label.textContent = discount.title;
  const amount = document.createElement("strong");
  amount.textContent = `−${cartApi.formatRupees(discount.amountPaise / 100)}`;
  row.append(label, amount);
  summaryDiscounts.append(row);
});
checkoutPricing.offerMessages.forEach((offer) => {
  const row = document.createElement("p");
  row.className = "summary-offer-message";
  row.textContent = `${offer.title}: ${offer.message}`;
  summaryDiscounts.append(row);
});

document.querySelector("#checkout-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!updatePincodeValidity()) {
    pincodeInput.focus();
    return;
  }
  if (!form.reportValidity() || checkoutItems.length === 0) return;

  const formData = new FormData(form);
  placeOrderButton.disabled = true;
  try {
    const response = await fetch("http://127.0.0.1:5000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name").trim(),
        phone: formData.get("phone").trim(),
        email: formData.get("email").trim(),
        address: formData.get("address").trim(),
        pincode: formData.get("pincode").trim(),
        items: checkoutItems,
        offers: checkoutPricing.claimedOfferIds,
        total: checkoutTotal,
        payment: formData.get("payment"),
      }),
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The server returned an invalid response. Please try again.");
    }
    if (!response.ok) {
      throw new Error(result.error || "We couldn't place your order. Please try again.");
    }

    const order = {
      number: result.order_number,
      name: formData.get("name").trim(),
      phone: formData.get("phone").trim(),
      email: formData.get("email").trim(),
      address: formData.get("address").trim(),
      city: "Chennai",
      pincode: formData.get("pincode").trim(),
      fulfillment: formData.get("fulfillment"),
      payment: formData.get("payment"),
      items: checkoutItems,
      total: checkoutTotal,
      discount: checkoutPricing.discountPaise / 100,
      offers: checkoutPricing.claimedOfferIds,
      estimatedMinutes: 30,
    };
    try {
      sessionStorage.setItem("good-ground-last-order", JSON.stringify(order));
    } catch {
      const error = document.querySelector("#checkout-error");
      error.textContent = `Your order ${result.order_number} was placed, but we couldn't save its confirmation. Please contact the cafe.`;
      error.hidden = false;
      return;
    }
    cartApi.clear();
    window.location.href = "order-confirmation.html";
  } catch (requestError) {
    const error = document.querySelector("#checkout-error");
    error.textContent = requestError instanceof Error
      ? requestError.message
      : "We couldn't place your order. Please check your connection and try again.";
    error.hidden = false;
    placeOrderButton.disabled = !updatePincodeValidity();
  }
});