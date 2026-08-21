const REPOSITORY = "hy-mary/photo-candidates";
const BRANCH = "main";
const IMAGE_EXTENSIONS = /\.(avif|gif|jpe?g|png|webp)$/i;

const categories = [
  { id: "01-top-banner", title: "상단 현수막", spec: "2670 × 445 mm", folder: "01-top-banner", mockup: "wide-banner" },
  { id: "02-right-banner", title: "우측 현수막", spec: "1120 × 1450 mm", folder: "02-right-banner", mockup: "wall-banner" },
  { id: "03-x-banner", title: "X배너", spec: "600 × 1800 mm", folder: "03-x-banner", mockup: "x-banner" },
  { id: "04-round-sticker", title: "원형 스티커", spec: "Ø 55 mm", folder: "04-round-sticker", mockup: "sticker" },
  { id: "05-frame-photos", title: "액자 사진 4장", spec: "고화질 JPG · 4장", folder: "05-frame-photos", mockup: "frame" },
  { id: "06-wonderpick-photos", title: "원더픽 사진 4장", spec: "사진 · 4장", folder: "06-wonderpick-photos", mockup: "photo-print" },
];

const elements = {
  categoryList: document.querySelector("#category-list"),
  categoryTitle: document.querySelector("#category-title"),
  categorySpec: document.querySelector("#category-spec"),
  selectedLabel: document.querySelector("#selected-label"),
  mockupScene: document.querySelector("#mockup-scene"),
  previewImage: document.querySelector("#preview-image"),
  previewPlaceholder: document.querySelector("#preview-placeholder"),
  photoCount: document.querySelector("#photo-count"),
  galleryStatus: document.querySelector("#gallery-status"),
  gallery: document.querySelector("#gallery"),
  emptyState: document.querySelector("#empty-state"),
};

const state = { category: categories[0], photos: [], selectedIndex: -1, requestId: 0 };

function naturalSort(a, b) {
  return a.name.localeCompare(b.name, "ko", { numeric: true, sensitivity: "base" });
}

function renderNavigation() {
  elements.categoryList.replaceChildren(...categories.map((category) => {
    const link = document.createElement("a");
    link.href = `#${category.id}`;
    link.dataset.category = category.id;
    link.textContent = category.title;
    return link;
  }));
}

function updateNavigation() {
  document.querySelectorAll(".category-list a").forEach((link) => {
    const active = link.dataset.category === state.category.id;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function resetPreview() {
  state.selectedIndex = -1;
  elements.previewImage.removeAttribute("src");
  elements.previewImage.alt = "";
  elements.previewImage.classList.remove("is-visible");
  elements.previewPlaceholder.classList.remove("is-hidden");
  elements.selectedLabel.textContent = "아래에서 사진을 선택해주세요";
}

function selectPhoto(index) {
  const photo = state.photos[index];
  if (!photo) return;
  state.selectedIndex = index;
  elements.previewImage.src = photo.url;
  elements.previewImage.alt = `${state.category.title}에 적용한 후보 ${index + 1}`;
  elements.previewImage.classList.add("is-visible");
  elements.previewPlaceholder.classList.add("is-hidden");
  elements.selectedLabel.textContent = `후보 ${index + 1} · ${photo.name}`;
  document.querySelectorAll(".candidate-card").forEach((card, cardIndex) => {
    const selected = cardIndex === index;
    card.classList.toggle("is-selected", selected);
    card.querySelector("button").setAttribute("aria-pressed", String(selected));
  });
  elements.mockupScene.scrollIntoView({ behavior: "smooth", block: "center" });
}

function setCategory(category) {
  state.category = category;
  elements.categoryTitle.textContent = category.title;
  elements.categorySpec.textContent = category.spec;
  elements.mockupScene.dataset.type = category.mockup;
  document.title = `${category.title} · 사진 적용 예시`;
  resetPreview();
  updateNavigation();
  loadPhotos(category);
}

function setLoading() {
  elements.gallery.replaceChildren();
  elements.emptyState.classList.add("is-hidden");
  elements.galleryStatus.className = "gallery-status";
  elements.galleryStatus.textContent = "사진 목록을 확인하고 있습니다.";
  elements.photoCount.textContent = "0장";
}

async function loadPhotos(category) {
  const requestId = ++state.requestId;
  setLoading();
  const endpoint = `https://api.github.com/repos/${REPOSITORY}/contents/${category.folder}?ref=${BRANCH}`;
  try {
    const response = await fetch(endpoint, { cache: "no-store", headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw new Error(`GitHub 응답 ${response.status}`);
    const items = await response.json();
    if (requestId !== state.requestId) return;
    state.photos = items
      .filter((item) => item.type === "file" && IMAGE_EXTENSIONS.test(item.name))
      .sort(naturalSort)
      .map((item) => ({ name: item.name, url: item.download_url }));
    renderGallery();
  } catch (error) {
    if (requestId !== state.requestId) return;
    state.photos = [];
    elements.gallery.replaceChildren();
    elements.galleryStatus.className = "gallery-status is-error";
    elements.galleryStatus.textContent = "사진 폴더를 불러오지 못했습니다.";
    elements.emptyState.classList.remove("is-hidden");
    console.error(error);
  }
}

function renderGallery() {
  elements.gallery.replaceChildren();
  elements.photoCount.textContent = `${state.photos.length}장`;
  elements.galleryStatus.className = "gallery-status is-hidden";

  if (state.photos.length === 0) {
    elements.emptyState.classList.remove("is-hidden");
    return;
  }

  elements.emptyState.classList.add("is-hidden");
  const cards = state.photos.map((photo, index) => {
    const article = document.createElement("article");
    article.className = "candidate-card";
    article.innerHTML = `
      <button type="button" aria-label="후보 ${index + 1}을 ${state.category.title}에 적용" aria-pressed="false">
        <span class="candidate-image"><img src="${photo.url}" alt="후보 ${index + 1}" loading="lazy" decoding="async" /></span>
        <span class="candidate-info"><strong>${index + 1}</strong><span>${photo.name}</span></span>
      </button>`;
    article.querySelector("button").addEventListener("click", () => selectPhoto(index));
    return article;
  });
  elements.gallery.replaceChildren(...cards);
  selectPhoto(0);
}

function activateFromHash() {
  const id = location.hash.slice(1);
  setCategory(categories.find((category) => category.id === id) || categories[0]);
}

window.addEventListener("hashchange", activateFromHash);
renderNavigation();
activateFromHash();
