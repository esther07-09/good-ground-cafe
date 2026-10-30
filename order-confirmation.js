const confirmationStorageKey = "good-ground-last-order";
const confirmationCard = document.querySelector("#confirmation-card");
const noOrder = document.querySelector("#no-order");
const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

let order;
try {
  order = JSON.parse(sessionStorage.getItem(confirmationStorageKey) || "null");
} catch {
  order = null;
}

if (!order || !Array.isArray(order.items) || order.items.length === 0) {
  noOrder.hidden = false;
} else {
  confirmationCard.hidden = false;
  document.querySelector("#customer-name").textContent = order.name;
  document.querySelector("#order-number").textContent = order.number;
  document.querySelector("#sms-customer-name").textContent = order.name;
  document.querySelector("#sms-order-number").textContent = order.number;
  document.querySelector("#sms-phone-number").textContent = order.phone;
  document.querySelector("#estimated-time").textContent = String(order.estimatedMinutes);
  document.querySelector("#order-total").textContent = rupees.format(order.total);
  document.querySelector("#delivery-address").textContent = `${order.address}\n${order.city}, ${order.pincode}`;
  document.querySelector("#fulfillment").textContent = order.fulfillment;
  document.querySelector("#phone-number").textContent = order.phone;
  document.querySelector("#payment-method").textContent = order.payment;

  const items = document.querySelector("#order-items");
  order.items.forEach((item) => {
    const row = document.createElement("li");
    row.className = "order-item";
    const name = document.createElement("p");
    name.className = "item-name";
    name.textContent = item.name;
    const quantity = document.createElement("span");
    quantity.className = "item-quantity";
    quantity.textContent = `Qty ${item.quantity}`;
    const price = document.createElement("strong");
    price.className = "item-price";
    price.textContent = rupees.format(item.price * item.quantity);
    row.append(name, quantity, price);
    items.append(row);
  });
}