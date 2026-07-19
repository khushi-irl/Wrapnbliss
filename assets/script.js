/* ---------------------------------------------------------------
 * CONFIG — edit these two values after you deploy the Google Sheet
 * backend (see README.md for step-by-step instructions).
 * ------------------------------------------------------------- */
const CONFIG = {
  // Paste the Web App URL you get after deploying apps-script/Code.gs
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzlkQuw70LyKKZSPrcRD0QRg0rF_dMi0CEmjhlF94Te6BnU9ml0ULA9ckCjqLz6bvm5/exec",
  PRICE_PER_PERSON: 2499,
  GROUP_DISCOUNT_THRESHOLD: 4,
  GROUP_DISCOUNT_RATE: 0.10, // 10%
  MAX_SCREENSHOT_MB: 4,
};

const inr = (n) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

/* ---------------------------------------------------------------
 * Dynamic "extra participant" rows
 * ------------------------------------------------------------- */
const groupSizeSelect = document.getElementById("groupSize");
const extraContainer = document.getElementById("extraParticipants");

function renderExtraParticipants(size) {
  extraContainer.innerHTML = "";
  for (let i = 2; i <= size; i++) {
    const card = document.createElement("div");
    card.className = "participant-card";
    card.innerHTML = `
      <h4>Friend #${i}</h4>
      <div class="form-row two-col">
        <div>
          <label for="p${i}_name">Full name*</label>
          <input type="text" id="p${i}_name" name="p${i}_name" required />
        </div>
        <div>
          <label for="p${i}_age">Age*</label>
          <input type="number" id="p${i}_age" name="p${i}_age" min="10" max="100" required />
        </div>
      </div>
      <div class="form-row two-col">
        <div>
          <label for="p${i}_phone">Phone number <span class="optional">(optional)</span></label>
          <input type="tel" id="p${i}_phone" name="p${i}_phone" />
        </div>
        <div>
          <label for="p${i}_instagram">Instagram handle <span class="optional">(optional)</span></label>
          <input type="text" id="p${i}_instagram" name="p${i}_instagram" placeholder="@handle" />
        </div>
      </div>
    `;
    extraContainer.appendChild(card);
  }
}

/* ---------------------------------------------------------------
 * Live price summary
 * ------------------------------------------------------------- */
const sumSpots = document.getElementById("sumSpots");
const sumDiscountRow = document.getElementById("sumDiscountRow");
const sumDiscount = document.getElementById("sumDiscount");
const sumTotal = document.getElementById("sumTotal");

function calcPricing(size) {
  const subtotal = size * CONFIG.PRICE_PER_PERSON;
  const discountApplies = size >= CONFIG.GROUP_DISCOUNT_THRESHOLD;
  const discount = discountApplies ? subtotal * CONFIG.GROUP_DISCOUNT_RATE : 0;
  const total = subtotal - discount;
  return { subtotal, discountApplies, discount, total };
}

function updateSummary() {
  const size = parseInt(groupSizeSelect.value, 10) || 1;
  const { subtotal, discountApplies, discount, total } = calcPricing(size);

  sumSpots.textContent = `${size} × ${inr(CONFIG.PRICE_PER_PERSON)} = ${inr(subtotal)}`;
  sumDiscountRow.hidden = !discountApplies;
  sumDiscount.textContent = `−${inr(discount)}`;
  sumTotal.textContent = inr(total);

  renderExtraParticipants(size);
}

groupSizeSelect.addEventListener("change", updateSummary);
updateSummary();

/* ---------------------------------------------------------------
 * Pocket scroll reveal — charms spill out of the pocket once, the
 * first time it scrolls into view. No-op if the user prefers
 * reduced motion, or if IntersectionObserver isn't supported: the
 * charms just stay visible in their resting position (CSS default).
 * ------------------------------------------------------------- */
const pocketVisual = document.querySelector(".pocket-visual");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (pocketVisual && !reduceMotion && "IntersectionObserver" in window) {
  document.documentElement.classList.add("js-anim-ready");
  const pocketObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          pocketObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );
  pocketObserver.observe(pocketVisual);
}

/* ---------------------------------------------------------------
 * Form submit
 * ------------------------------------------------------------- */
const form = document.getElementById("regForm");
const submitBtn = document.getElementById("submitBtn");
const formStatus = document.getElementById("formStatus");
const successPanel = document.getElementById("successPanel");

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setStatus(message, type) {
  formStatus.textContent = message;
  formStatus.className = "form-status" + (type ? " " + type : "");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("", "");

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (CONFIG.APPS_SCRIPT_URL.includes("PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE")) {
    setStatus(
      "Registration isn't connected to the Google Sheet yet — see README.md to finish setup.",
      "error"
    );
    return;
  }

  const size = parseInt(groupSizeSelect.value, 10) || 1;
  const { subtotal, discountApplies, discount, total } = calcPricing(size);

  const screenshotFile = document.getElementById("paymentScreenshot").files[0];
  if (screenshotFile && screenshotFile.size > CONFIG.MAX_SCREENSHOT_MB * 1024 * 1024) {
    setStatus(`Payment screenshot must be under ${CONFIG.MAX_SCREENSHOT_MB}MB.`, "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    let screenshotBase64 = "";
    if (screenshotFile) {
      screenshotBase64 = await fileToBase64(screenshotFile);
    }

    const bookingId =
      "WNB-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

    const participants = [
      {
        name: document.getElementById("name").value.trim(),
        age: document.getElementById("age").value,
        phone: document.getElementById("phone").value.trim(),
        instagram: document.getElementById("instagram").value.trim(),
        email: document.getElementById("email").value.trim(),
        howFound: document.getElementById("howFound").value,
        isPrimary: true,
      },
    ];
    for (let i = 2; i <= size; i++) {
      participants.push({
        name: document.getElementById(`p${i}_name`).value.trim(),
        age: document.getElementById(`p${i}_age`).value,
        phone: document.getElementById(`p${i}_phone`).value.trim(),
        instagram: document.getElementById(`p${i}_instagram`).value.trim(),
        email: "",
        howFound: "",
        isPrimary: false,
      });
    }

    const payload = new FormData();
    payload.append("bookingId", bookingId);
    payload.append("groupSize", String(size));
    payload.append("pricePerPerson", String(CONFIG.PRICE_PER_PERSON));
    payload.append("subtotal", String(subtotal));
    payload.append("discountApplied", discountApplies ? "Yes" : "No");
    payload.append("discountAmount", String(discount));
    payload.append("totalAmount", String(total));
    payload.append("paymentRef", document.getElementById("paymentRef").value.trim());
    payload.append("paymentScreenshotBase64", screenshotBase64);
    payload.append("notes", document.getElementById("notes").value.trim());
    payload.append("participants", JSON.stringify(participants));

    // Apps Script web apps don't reliably send CORS headers back, so we
    // fire the request in no-cors mode. The POST still reaches the script
    // and the row still gets written — we just can't read the response.
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: payload,
    });

    form.hidden = true;
    successPanel.hidden = false;
    successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    setStatus("Something went wrong sending your registration. Please try again or DM @wrapnbliss.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit registration";
  }
});
