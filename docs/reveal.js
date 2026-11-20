const gift = window.weddingGift;
const byId = (id) => document.getElementById(id);
const hero = byId("hero");
const card = byId("card");
const stage = card.closest(".card-stage");
const cardTurn = card.querySelector(".card-turn");
const cardTrigger = byId("card-trigger");
const hotelDetails = byId("hotel-details");
const hotelInfo = byId("hotel-info");
const hotelPanel = byId("hotel-panel");
const announcement = byId("announcement");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const REVEAL_FALLBACK_MS = 2800;
let revealed = false;
let openingTurn;
let openingTimer;
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
  stage.removeAttribute("style");
  hero.style.removeProperty("--coast-x");
  hero.style.removeProperty("--coast-y");
  card.classList.remove("is-tracking", "is-pressing");
}

function finishReveal() {
  clearTimeout(openingTimer);
  if (!hotelDetails.hidden) return;

  card.classList.add("card-settled");
  hotelDetails.hidden = false;
  announcement.textContent = `${gift.title}. ${byId("voucher-kicker").textContent}. ${gift.subtitle}. ${byId("voucher-delivery").textContent}`;
}

function toggleGift(point) {
  revealed = !revealed;
  resetLight();
  hero.classList.toggle("is-revealed", revealed);
  cardTrigger.setAttribute("aria-pressed", String(revealed));

  if (!revealed) {
    clearTimeout(openingTimer);
    openingTurn = undefined;
    if (hotelDetails.contains(document.activeElement)) {
      cardTrigger.focus({ preventScroll: true });
    }
    setHotelInfo(false);
    hotelDetails.hidden = true;
    card.classList.remove("card-settled");
    card.style.removeProperty("--spark-x");
    card.style.removeProperty("--spark-y");
    announcement.textContent = "Vorderseite der Karte.";
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
  // Phones can drop or freeze the turn transition (backgrounded tab, an
  // interrupted animation), so the voucher must never stay hidden behind it.
  openingTimer = setTimeout(() => {
    if (revealed && openingTurn === turn) finishReveal();
  }, REVEAL_FALLBACK_MS);
  turn.finished.then(() => {
    if (revealed && openingTurn === turn) finishReveal();
  }, () => {});
}

function setHotelInfo(open) {
  hotelInfo.setAttribute("aria-expanded", String(open));
  hotelPanel.hidden = !open;
  // Safari does not focus a button on click, so the disclosure gets focus itself.
  if (open) hotelInfo.focus({ preventScroll: true });
}

function toggleHotelInfo() {
  setHotelInfo(hotelPanel.hidden);
  resetLight();
}

const inRect = (rect, x, y) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
// Keyboard and assistive-tech activation arrives as a click at 0/0 without a
// real pointer position, so those must never be position-routed.
const withoutPoint = (event) => !event.clientX && !event.clientY;

function controlAt(event) {
  if (hotelDetails.hidden || withoutPoint(event)) return null;

  const { clientX: x, clientY: y } = event;
  if (!hotelPanel.hidden && inRect(hotelPanel.getBoundingClientRect(), x, y)) return hotelPanel;
  if (inRect(hotelInfo.getBoundingClientRect(), x, y)) return hotelInfo;
  return null;
}

/* The hotel controls are painted on top of the full-size flip button, but a
   phone can still hand the tap to the flip button underneath. Routing the tap
   by position in the capture phase means the flip button never sees a tap
   that belongs to the hotel controls, whatever the engine hit-tests. */
window.addEventListener("click", (event) => {
  if (event.target.closest?.("#hotel-details")) return;

  const control = controlAt(event);
  if (!control) return;

  event.preventDefault();
  event.stopPropagation();
  if (control === hotelPanel) setHotelInfo(false);
  else toggleHotelInfo();
}, true);

cardTrigger.addEventListener("click", (event) => {
  if (dragged) {
    dragged = false;
    return;
  }
  if (!hotelPanel.hidden) {
    setHotelInfo(false);
    return;
  }
  toggleGift(event.detail > 0 ? pointOnCard(event) : null);
});
cardTrigger.disabled = false;

hotelInfo.addEventListener("click", toggleHotelInfo);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || hotelPanel.hidden) return;
  event.preventDefault();
  setHotelInfo(false);
  hotelInfo.focus({ preventScroll: true });
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
  stage.style.setProperty("--tilt-x", `${allowTilt ? (0.5 - y) * 22 : 0}deg`);
  stage.style.setProperty("--tilt-y", `${allowTilt ? (x - 0.5) * 30 : 0}deg`);
  stage.style.setProperty("--light-x", `${x * 100}%`);
  stage.style.setProperty("--light-y", `${y * 100}%`);
  stage.style.setProperty("--foil-x", `${100 - x * 100}%`);
  stage.style.setProperty("--foil-y", `${100 - y * 100}%`);

  if (revealed) {
    hero.style.setProperty("--coast-x", `${(0.5 - x) * 12}px`);
    hero.style.setProperty("--coast-y", `${(0.5 - y) * 10}px`);
  }
}

function overHotelControl(event) {
  if (hotelDetails.hidden) return false;
  const { clientX: x, clientY: y } = event;
  return inRect(hotelInfo.getBoundingClientRect(), x, y)
    || (!hotelPanel.hidden && inRect(hotelPanel.getBoundingClientRect(), x, y));
}

cardTrigger.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || !hotelPanel.hidden) return;
  dragged = false;
  if (event.pointerType === "mouse" || overHotelControl(event)) return;
  touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
  card.classList.add("is-pressing");
  if (!reducedMotion.matches) trackLight(event, false);
});

stage.addEventListener("pointermove", (event) => {
  if (!event.isPrimary || !hotelPanel.hidden || overHotelControl(event)) return;
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
stage.addEventListener("pointerleave", (event) => {
  if (event.pointerType === "mouse") resetLight();
});
reducedMotion.addEventListener("change", () => {
  resetLight();
  if (reducedMotion.matches && revealed) finishReveal();
});
