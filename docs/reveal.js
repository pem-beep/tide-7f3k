const gift = window.weddingGift;
const byId = (id) => document.getElementById(id);
const hero = byId("hero");
const card = byId("card");
const tilt = card.querySelector(".card-tilt");
const cardTurn = card.querySelector(".card-turn");
const cardTrigger = byId("card-trigger");
const hotelDetails = byId("hotel-details");
const hotelSummary = hotelDetails.querySelector("summary");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let revealed = false;
let openingTurn;
let touch = null;
let dragged = false;

const couple = gift.couple.trim();
if (couple) {
  const greetingNames = byId("congratulations");
  greetingNames.textContent = "Für " + couple;
  greetingNames.hidden = false;
}
byId("message").textContent = gift.message;
byId("voucher-title").textContent = gift.title;
byId("voucher-subtitle").textContent = gift.subtitle;

function resetLight() {
  tilt.removeAttribute("style");
  hero.style.removeProperty("--coast-x");
  hero.style.removeProperty("--coast-y");
  card.classList.remove("is-tracking", "is-pressing");
}

function finishReveal() {
  if (!hotelDetails.hidden) return;

  card.classList.add("card-settled");
  hotelDetails.hidden = false;
  byId("announcement").textContent = `${gift.title}. ${byId("voucher-kicker").textContent}. ${gift.subtitle}. ${byId("voucher-delivery").textContent}`;
}

function toggleGift(point) {
  revealed = !revealed;
  resetLight();
  hero.classList.toggle("is-revealed", revealed);
  cardTrigger.setAttribute("aria-pressed", String(revealed));

  if (!revealed) {
    openingTurn = undefined;
    if (hotelDetails.contains(document.activeElement)) {
      cardTrigger.focus({ preventScroll: true });
    }
    hotelDetails.open = false;
    hotelDetails.hidden = true;
    card.classList.remove("card-settled");
    card.style.removeProperty("--spark-x");
    card.style.removeProperty("--spark-y");
    byId("announcement").textContent = "Vorderseite der Karte.";
    return;
  }

  if (point) {
    card.style.setProperty("--spark-x", `${point.x * 100}%`);
    card.style.setProperty("--spark-y", `${point.y * 100}%`);
  }

  const turn = cardTurn.getAnimations?.()[0];
  openingTurn = turn;
  if (!turn) {
    finishReveal();
    return;
  }
  turn.finished.then(() => {
    if (revealed && openingTurn === turn) finishReveal();
  }, () => {});
}

card.addEventListener("click", (event) => {
  if (dragged && event.detail > 0) {
    dragged = false;
    return;
  }
  toggleGift(event.detail > 0 ? pointOnCard(event) : null);
});
cardTrigger.disabled = false;

hotelDetails.addEventListener("toggle", resetLight);
hotelDetails.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !hotelDetails.open) return;
  event.preventDefault();
  hotelDetails.open = false;
  hotelSummary.focus({ preventScroll: true });
});

function pointOnCard(event) {
  const bounds = card.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
  return { x, y };
}

function trackLight(event, allowTilt) {
  const { x, y } = pointOnCard(event);

  card.classList.add("is-tracking");
  tilt.style.setProperty("--tilt-x", `${allowTilt ? (0.5 - y) * 22 : 0}deg`);
  tilt.style.setProperty("--tilt-y", `${allowTilt ? (x - 0.5) * 30 : 0}deg`);
  tilt.style.setProperty("--light-x", `${x * 100}%`);
  tilt.style.setProperty("--light-y", `${y * 100}%`);
  tilt.style.setProperty("--foil-x", `${100 - x * 100}%`);
  tilt.style.setProperty("--foil-y", `${100 - y * 100}%`);

  if (revealed) {
    hero.style.setProperty("--coast-x", `${(0.5 - x) * 12}px`);
    hero.style.setProperty("--coast-y", `${(0.5 - y) * 10}px`);
  }
}

card.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || hotelDetails.open) return;
  dragged = false;
  if (event.pointerType === "mouse") return;
  touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
  card.classList.add("is-pressing");
  if (!reducedMotion.matches) trackLight(event, false);
});

card.addEventListener("pointermove", (event) => {
  if (!event.isPrimary || hotelDetails.open) return;
  if (touch?.id === event.pointerId) {
    dragged ||= Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 9;
  } else if (event.pointerType !== "mouse") {
    return;
  }
  if (!reducedMotion.matches) trackLight(event, event.pointerType === "mouse" || dragged);
});

function endTouch(event) {
  if (touch?.id !== event.pointerId) return;
  touch = null;
  resetLight();
}

card.addEventListener("pointerup", endTouch);
card.addEventListener("pointercancel", endTouch);
card.addEventListener("pointerleave", (event) => {
  if (event.pointerType === "mouse") resetLight();
});
reducedMotion.addEventListener("change", () => {
  resetLight();
  if (reducedMotion.matches && revealed) finishReveal();
});
