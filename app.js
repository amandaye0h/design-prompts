const grid = document.getElementById("prompt-grid");
const filtersEl = document.getElementById("filters");
const searchInput = document.getElementById("search");
const emptyEl = document.getElementById("empty");
const toast = document.getElementById("toast");

let prompts = [];
let activeCategory = "All";
let toastTimer;

async function init() {
  const res = await fetch("./prompts.json");
  prompts = await res.json();
  renderFilters();
  render();
  searchInput.addEventListener("input", render);
}

function categories() {
  return ["All", ...new Set(prompts.map((p) => p.category))];
}

function renderFilters() {
  filtersEl.innerHTML = "";
  for (const category of categories()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-btn";
    btn.textContent = category;
    btn.setAttribute("aria-pressed", String(category === activeCategory));
    btn.addEventListener("click", () => {
      activeCategory = category;
      renderFilters();
      render();
    });
    filtersEl.appendChild(btn);
  }
}

function filteredPrompts() {
  const query = searchInput.value.trim().toLowerCase();
  return prompts.filter((prompt) => {
    const inCategory =
      activeCategory === "All" || prompt.category === activeCategory;
    if (!inCategory) return false;
    if (!query) return true;
    const haystack = `${prompt.title} ${prompt.category} ${prompt.prompt}`.toLowerCase();
    return haystack.includes(query);
  });
}

function render() {
  const items = filteredPrompts();
  grid.innerHTML = "";
  emptyEl.hidden = items.length > 0;

  for (const prompt of items) {
    const card = document.createElement("article");
    card.className = "prompt-card";
    card.innerHTML = `
      <div class="prompt-meta">
        <span class="category">${escapeHtml(prompt.category)}</span>
      </div>
      <h2>${escapeHtml(prompt.title)}</h2>
      <p class="prompt-body">${escapeHtml(prompt.prompt)}</p>
      <button type="button" class="copy-btn">Copy prompt</button>
    `;

    const copyBtn = card.querySelector(".copy-btn");
    copyBtn.addEventListener("click", async () => {
      await copyText(prompt.prompt);
      copyBtn.textContent = "Copied";
      copyBtn.classList.add("is-copied");
      showToast();
      window.setTimeout(() => {
        copyBtn.textContent = "Copy prompt";
        copyBtn.classList.remove("is-copied");
      }, 1600);
    });

    grid.appendChild(card);
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "absolute";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
  }
}

function showToast() {
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => {
      toast.hidden = true;
    }, 200);
  }, 1600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

init();
