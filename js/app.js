const catalogueUrl = './catalogue/export.csv';
const defaultImage = 'https://via.placeholder.com/640x480.png?text=Image+indisponible';

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const numberFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantityFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dimensionFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const UNIT_FILTER_ALL = '__all__';
const UNIT_FILTER_NONE = '__none__';
const UNIT_LABEL_PIECE = 'Pièce';
const UNIT_LABEL_AREA = 'm²';

const state = {
  catalogue: [],
  filtered: [],
  catalogueById: new Map(),
  quote: new Map(),
  categories: [],
  units: [],
  selectedCategories: new Set(),
  selectedUnit: '__all__',
  searchQuery: '',
  discountRate: 0,
  vatRate: 0.2,
  generalComment: '',
  splitInstance: null,
  lastFocusElement: null,
  categoryMenuOpen: false,
};

const elements = {
  layout: document.getElementById('main-layout'),
  cataloguePanel: document.getElementById('catalogue-panel'),
  quotePanel: document.getElementById('quote-panel'),
  search: document.getElementById('search'),
  unitFilter: document.getElementById('unit-filter'),
  categoryFilterButton: document.getElementById('category-filter-button'),
  categoryFilterMenu: document.getElementById('category-filter-menu'),
  categoryFilterLabel: document.getElementById('category-filter-label'),
  categoryFilterOptions: document.getElementById('category-filter-options'),
  categoryFilterClear: document.getElementById('category-filter-clear'),
  categoryFilterClose: document.getElementById('category-filter-close'),
  productGrid: document.getElementById('product-grid'),
  productFeedback: document.getElementById('product-feedback'),
  productTemplate: document.getElementById('product-card-template'),
  quoteTemplate: document.getElementById('quote-item-template'),
  quoteList: document.getElementById('quote-list'),
  quoteEmpty: document.getElementById('quote-empty'),
  headerDiscount: document.getElementById('header-discount'),
  discount: document.getElementById('discount'),
  generalComment: document.getElementById('general-comment'),
  summarySubtotal: document.getElementById('summary-subtotal'),
  summaryDiscount: document.getElementById('summary-discount'),
  summaryNetProducts: document.getElementById('summary-net-products'),
  summaryEcotax: document.getElementById('summary-ecotax'),
  summaryNet: document.getElementById('summary-net'),
  summaryVat: document.getElementById('summary-vat'),
  summaryTotal: document.getElementById('summary-total'),
  generatePdf: document.getElementById('generate-pdf'),
  modalBackdrop: document.getElementById('product-modal'),
  modalImage: document.getElementById('product-modal-image'),
  modalTitle: document.getElementById('product-modal-title'),
  modalReference: document.getElementById('product-modal-reference'),
  modalDescription: document.getElementById('product-modal-description'),
  modalCategory: document.getElementById('product-modal-category'),
  modalUnit: document.getElementById('product-modal-unit'),
  modalWeight: document.getElementById('product-modal-weight'),
  modalEcotax: document.getElementById('product-modal-ecotax'),
  modalScore: document.getElementById('product-modal-score'),
  modalLink: document.getElementById('product-modal-link'),
  modalClose: document.getElementById('product-modal-close'),
  currentYear: document.getElementById('current-year'),
};

document.addEventListener('DOMContentLoaded', () => {
  loadCatalogue();
  elements.search?.addEventListener('input', handleSearch);
  elements.headerDiscount?.addEventListener('input', handleDiscountChange);
  elements.unitFilter?.addEventListener('change', handleUnitFilterChange);
  elements.generalComment?.addEventListener('input', handleGeneralCommentChange);
  elements.generatePdf?.addEventListener('click', generatePdf);
  setupModal();
  setupResponsiveSplit();
  setupCategoryFilter();
  if (elements.currentYear) {
    elements.currentYear.textContent = new Date().getFullYear();
  }
  window.addEventListener('resize', setupResponsiveSplit);
  syncDiscountInputs();
});

function setupResponsiveSplit() {
  const shouldSplit = window.innerWidth >= 1024;
  if (shouldSplit && !state.splitInstance && typeof window.Split === 'function') {
    state.splitInstance = window.Split(['#catalogue-panel', '#quote-panel'], {
      sizes: [60, 40],
      minSize: [320, 320],
      gutterSize: 12,
      snapOffset: 0,
    });
  }

  if (!shouldSplit && state.splitInstance) {
    state.splitInstance.destroy();
    state.splitInstance = null;
    elements.cataloguePanel.style.removeProperty('width');
    elements.cataloguePanel.style.removeProperty('flex-basis');
    elements.cataloguePanel.style.removeProperty('left');
    elements.cataloguePanel.style.removeProperty('right');
    elements.quotePanel.style.removeProperty('width');
    elements.quotePanel.style.removeProperty('flex-basis');
    elements.quotePanel.style.removeProperty('left');
    elements.quotePanel.style.removeProperty('right');
  }
}

async function loadCatalogue() {
  toggleFeedback('Chargement du catalogue en cours...', 'info');
  try {
    const response = await fetch(catalogueUrl);
    if (!response.ok) {
      throw new Error(`Impossible de charger le fichier (${response.status})`);
    }
    const csvText = await response.text();
    const entries = parseCsv(csvText);
    state.catalogue = entries
      .map(toProduct)
      .filter((item) => item && item.name);
    state.catalogue.forEach((product) => state.catalogueById.set(product.id, product));
    state.categories = deriveCategories(state.catalogue);
    state.units = deriveUnits(state.catalogue);
    populateCategoryFilter();
    populateUnitFilter();
    applyFilters();
    toggleFeedback('', 'hide');
  } catch (error) {
    console.error(error);
    toggleFeedback("Une erreur est survenue lors du chargement du catalogue. Vérifiez le fichier CSV et réessayez.", 'error');
  }
}

function parseCsv(text, delimiter = ';') {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines.shift(), delimiter).map(slugifyHeader);
  return lines.map((line) => {
    const cells = splitCsvLine(line, delimiter);
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = normaliseCsvValue(cells[index]);
    });
    return entry;
  });
}

function splitCsvLine(line, delimiter) {
  const cells = [];
  let current = '';
  let insideQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const nextChar = line[index + 1];
      if (insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      cells.push(current.trim().replace(/^\"|\"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim().replace(/^\"|\"$/g, ''));
  return cells;
}

function normaliseCsvValue(value) {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^null$/i.test(trimmed)) {
    return '';
  }
  return trimmed;
}

function slugifyHeader(header) {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function normaliseUnitLabel(unit) {
  if (!unit) return '';
  const numeric = Number(unit);
  if (Number.isFinite(numeric)) {
    return numeric === 3 ? UNIT_LABEL_AREA : UNIT_LABEL_PIECE;
  }
  const cleaned = unit
    .replace(/m2/gi, 'm²')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  if (/^piece$/i.test(cleaned) || /^pi[eè]ce$/i.test(cleaned) || /^u(nit[eé])?$/i.test(cleaned)) {
    return UNIT_LABEL_PIECE;
  }
  return cleaned;
}

function formatUnitLabel(unit) {
  if (!unit) return "À l'unité";
  if (unit === UNIT_LABEL_PIECE) return UNIT_LABEL_PIECE;
  if (unit === UNIT_LABEL_AREA) return UNIT_LABEL_AREA;
  return unit;
}

function getUnitFilterValue(unit) {
  if (!unit) return UNIT_FILTER_NONE;
  return unit;
}

function getQuantityMode(unit) {
  if (!unit) return 'unit';
  const numeric = Number(unit);
  if (Number.isFinite(numeric)) {
    return numeric === 3 ? 'area' : 'unit';
  }
  const normalised = normaliseUnitLabel(unit).toLowerCase();
  if (normalised.includes('m2') || normalised.includes('m²')) {
    return 'area';
  }
  return 'unit';
}

function normaliseScore(value) {
  if (!value) return '';
  const trimmed = String(value).trim().toUpperCase();
  if (!trimmed) return '';
  if (!/^[A-E]$/.test(trimmed)) {
    return '';
  }
  return trimmed;
}

function toProduct(entry) {
  if (!entry || !entry.ref) return null;
  const reference = entry.ref;
  const name = entry.design || reference;
  const description = '';
  const price = parseFrenchNumber(entry.prix || '0');
  const image = entry.image || '';
  const link = entry.url || '';
  const rawUnit = entry.unite || '';
  const unit = normaliseUnitLabel(rawUnit) || UNIT_LABEL_PIECE;
  const quantityMode = getQuantityMode(rawUnit || unit);
  const category = entry.categorie || '';
  const weight = parseFrenchNumber(entry.poids || '0');
  const ecotax = parseFrenchNumber(entry.ecotaxe || '0');
  const score = normaliseScore(entry.score);
  return {
    id: reference,
    reference,
    name,
    description,
    price,
    priceLabel: currencyFormatter.format(price),
    unit,
    quantityMode,
    image,
    link,
    category,
    weight,
    ecotax,
    score,
  };
}

function handleSearch(event) {
  const query = event.target.value.trim().toLowerCase();
  state.searchQuery = query;
  applyFilters();
}

function applyFilters() {
  const selectedCategories = state.selectedCategories;
  const query = state.searchQuery;
  const selectedUnit = state.selectedUnit;
  state.filtered = state.catalogue.filter((product) => {
    const matchesSearch = !query || `${product.name} ${product.reference}`.toLowerCase().includes(query);
    const matchesCategory = !selectedCategories.size || (product.category && selectedCategories.has(product.category));
    const productUnitValue = getUnitFilterValue(product.unit);
    const matchesUnit =
      selectedUnit === UNIT_FILTER_ALL ||
      (selectedUnit === UNIT_FILTER_NONE && productUnitValue === UNIT_FILTER_NONE) ||
      (selectedUnit !== UNIT_FILTER_ALL && selectedUnit === productUnitValue);
    return matchesSearch && matchesCategory && matchesUnit;
  });
  renderProducts();
}

function renderProducts() {
  const { productGrid } = elements;
  productGrid.innerHTML = '';
  if (!state.filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500';
    empty.textContent = 'Aucun produit ne correspond à votre recherche.';
    productGrid.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const product of state.filtered) {
    const card = elements.productTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector('.product-image');
    image.src = product.image || defaultImage;
    image.alt = product.name;
    image.addEventListener('error', () => {
      image.src = defaultImage;
    });

    card.querySelector('.product-reference').textContent = product.reference;
    card.querySelector('.product-name').textContent = product.name;

    const descriptionElement = card.querySelector('.product-description');
    if (product.description) {
      descriptionElement.textContent = product.description;
      descriptionElement.style.display = '';
    } else {
      descriptionElement.textContent = '';
      descriptionElement.style.display = 'none';
    }

    const categoryBadge = card.querySelector('.product-category-badge');
    categoryBadge.classList.remove('is-muted');
    if (product.category) {
      categoryBadge.textContent = product.category;
    } else {
      categoryBadge.textContent = 'Divers';
      categoryBadge.classList.add('is-muted');
    }

    const scoreBadge = card.querySelector('.product-score-badge');
    applyScoreBadge(scoreBadge, product.score);

    const weightElement = card.querySelector('.product-weight');
    if (weightElement) {
      weightElement.textContent = formatWeight(product.weight);
    }

    const ecotaxElement = card.querySelector('.product-ecotax');
    if (ecotaxElement) {
      ecotaxElement.textContent = formatEcotaxPerUnit(product);
    }

    const formattedUnit = formatUnitLabel(product.unit);
    const unitLabel = product.unit ? ` / ${formattedUnit}` : '';
    const priceLabel = `${currencyFormatter.format(product.price)}${unitLabel}`;
    const discountedPrice = calculateDiscountedValue(product.price);
    const discountedLabel = `${currencyFormatter.format(discountedPrice)}${unitLabel}`;

    const originalPriceElement = card.querySelector('.product-price-original');
    const discountedPriceElement = card.querySelector('.product-price-discounted');
    if (state.discountRate > 0) {
      originalPriceElement.textContent = priceLabel;
      originalPriceElement.style.display = 'block';
      discountedPriceElement.textContent = discountedLabel;
    } else {
      originalPriceElement.textContent = '';
      originalPriceElement.style.display = 'none';
      discountedPriceElement.textContent = priceLabel;
    }

    const unit = card.querySelector('.product-unit');
    unit.textContent = `Unité de vente : ${formattedUnit}`;

    const viewButton = card.querySelector('.view-details');
    viewButton.dataset.productId = product.id;
    viewButton.addEventListener('click', () => openProductModal(product));

    const addButton = card.querySelector('.add-to-quote');
    addButton.dataset.productId = product.id;
    addButton.addEventListener('click', () => addToQuote(product.id));

    fragment.appendChild(card);
  }
  productGrid.appendChild(fragment);
}

function addToQuote(productId) {
  const product = state.catalogueById.get(productId);
  if (!product) return;
  const existing = state.quote.get(productId);
  if (existing) {
    if (existing.quantityMode === 'unit') {
      existing.quantity += 1;
    }
  } else {
    state.quote.set(productId, {
      ...product,
      quantity: 1,
      length: product.quantityMode === 'area' ? 1 : undefined,
      width: product.quantityMode === 'area' ? 1 : undefined,
      comment: '',
      expanded: false,
    });
  }
  renderQuote();
}

function renderQuote() {
  if (!state.quote.size) {
    elements.quoteEmpty.classList.remove('hidden');
    elements.quoteList.classList.add('hidden');
    elements.quoteList.innerHTML = '';
  } else {
    elements.quoteEmpty.classList.add('hidden');
    elements.quoteList.classList.remove('hidden');
    const fragment = document.createDocumentFragment();
    for (const item of state.quote.values()) {
      const node = elements.quoteTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.expanded = item.expanded ? 'true' : 'false';
      const nameElement = node.querySelector('.quote-name');
      const referenceElement = node.querySelector('.quote-reference');
      nameElement.textContent = item.name;
      referenceElement.textContent = item.reference;

      const toggleButton = node.querySelector('.toggle-details');
      toggleButton.setAttribute('aria-expanded', String(Boolean(item.expanded)));
      toggleButton.addEventListener('click', () => toggleQuoteItem(item.id));

      const summaryQuantity = node.querySelector('[data-role="summary-quantity"]');
      const summaryTotalContainer = node.querySelector('[data-role="summary-total"]');
      const summaryTotalOriginal = summaryTotalContainer.querySelector('.summary-total-original');
      const summaryTotalDiscounted = summaryTotalContainer.querySelector('.summary-total-discounted');
      const lineTotalContainer = node.querySelector('.line-total');
      const lineTotalOriginal = lineTotalContainer.querySelector('.line-total-original');
      const lineTotalDiscounted = lineTotalContainer.querySelector('.line-total-discounted');
      const unitPriceContainer = node.querySelector('.unit-price');
      const unitPriceOriginal = unitPriceContainer.querySelector('.unit-price-original');
      const unitPriceDiscounted = unitPriceContainer.querySelector('.unit-price-discounted');
      const quantityValueElements = node.querySelectorAll('[data-role="quantity-value"]');
      const quantityUnitElements = node.querySelectorAll('[data-role="quantity-unit"]');
      const ecotaxTotalElement = node.querySelector('.quote-ecotax');
      const ecotaxUnitElement = node.querySelector('.quote-ecotax-unit');
      const unitLabel =
        item.quantityMode === 'area' ? item.unit || 'm²' : item.unit || "à l'unité";
      quantityUnitElements.forEach((element) => {
        element.textContent = unitLabel;
      });

      const unitControls = node.querySelector('[data-mode="unit"]');
      const areaControls = node.querySelector('[data-mode="area"]');
      const dimensions = node.querySelector('.quote-dimensions');

      const updatePriceDisplays = () => {
        const quantityValue = item.quantity || 0;
        const lineSubtotal = item.price * quantityValue;
        const discountedUnit = calculateDiscountedValue(item.price);
        const discountedLineSubtotal = calculateDiscountedValue(lineSubtotal);
        const ecotaxTotal = calculateEcotaxTotal(item);
        const formattedUnitOriginal = currencyFormatter.format(item.price);
        const formattedUnitDiscounted = currencyFormatter.format(discountedUnit);
        const originalWithEcotax = lineSubtotal + ecotaxTotal;
        const discountedWithEcotax = discountedLineSubtotal + ecotaxTotal;
        const formattedLineOriginal = currencyFormatter.format(originalWithEcotax);
        const formattedLineDiscounted = currencyFormatter.format(discountedWithEcotax);

        if (state.discountRate > 0) {
          unitPriceOriginal.textContent = formattedUnitOriginal;
          unitPriceOriginal.style.display = 'block';
          lineTotalOriginal.textContent = formattedLineOriginal;
          lineTotalOriginal.style.display = 'block';
          summaryTotalOriginal.textContent = formattedLineOriginal;
          summaryTotalOriginal.style.display = 'block';
          unitPriceDiscounted.textContent = formattedUnitDiscounted;
          lineTotalDiscounted.textContent = formattedLineDiscounted;
          summaryTotalDiscounted.textContent = formattedLineDiscounted;
        } else {
          unitPriceOriginal.textContent = '';
          unitPriceOriginal.style.display = 'none';
          lineTotalOriginal.textContent = '';
          lineTotalOriginal.style.display = 'none';
          summaryTotalOriginal.textContent = '';
          summaryTotalOriginal.style.display = 'none';
          unitPriceDiscounted.textContent = formattedUnitOriginal;
          lineTotalDiscounted.textContent = formattedLineOriginal;
          summaryTotalDiscounted.textContent = formattedLineOriginal;
        }

        if (ecotaxTotalElement) {
          const ecotaxLabel = currencyFormatter.format(ecotaxTotal);
          ecotaxTotalElement.textContent = ecotaxTotal > 0 ? `+ ${ecotaxLabel} HT` : `${ecotaxLabel} HT`;
        }
        if (ecotaxUnitElement) {
          const unitEcotax = Number(item.ecotax) || 0;
          ecotaxUnitElement.textContent = `${currencyFormatter.format(unitEcotax)} HT / ${getEcotaxUnitLabel(item)}`;
          ecotaxUnitElement.style.display = 'block';
        }
      };

      const updateSummaryDisplays = () => {
        summaryQuantity.textContent = formatQuantityLabel(item);
        updatePriceDisplays();
      };

      if (item.quantityMode === 'area') {
        unitControls.classList.add('hidden');
        areaControls.classList.remove('hidden');
        const lengthInput = areaControls.querySelector('.length-input');
        const widthInput = areaControls.querySelector('.width-input');
        lengthInput.value = item.length ?? 1;
        widthInput.value = item.width ?? 1;

        const refreshArea = (shouldUpdateSummary = true) => {
          const length = Math.max(0, parseFrenchNumber(lengthInput.value));
          const width = Math.max(0, parseFrenchNumber(widthInput.value));
          item.length = length;
          item.width = width;
          const area = Number.isFinite(length * width) ? length * width : 0;
          item.quantity = area;
          quantityValueElements.forEach((element) => {
            element.textContent = quantityFormatter.format(area);
          });
          if (length > 0 && width > 0) {
            dimensions.textContent = `Dimensions : ${dimensionFormatter.format(length)} m x ${dimensionFormatter.format(width)} m`;
          } else {
            dimensions.textContent = 'Dimensions : à préciser';
          }
          updateSummaryDisplays();
          if (shouldUpdateSummary) {
            updateSummary();
          }
        };

        lengthInput.addEventListener('input', () => refreshArea(true));
        widthInput.addEventListener('input', () => refreshArea(true));
        refreshArea(false);
      } else {
        areaControls.classList.add('hidden');
        unitControls.classList.remove('hidden');
        dimensions.textContent = '';
        quantityValueElements.forEach((element) => {
          element.textContent = quantityFormatter.format(item.quantity);
        });
        unitControls.querySelector('.decrease').addEventListener('click', () => changeQuantity(item.id, -1));
        unitControls.querySelector('.increase').addEventListener('click', () => changeQuantity(item.id, 1));
        updateSummaryDisplays();
      }

      const commentField = node.querySelector('.quote-comment');
      commentField.value = item.comment || '';
      commentField.addEventListener('input', (event) => {
        item.comment = event.target.value;
      });

      node.querySelector('.remove-item').addEventListener('click', () => removeItem(item.id));
      fragment.appendChild(node);
    }
    elements.quoteList.innerHTML = '';
    elements.quoteList.appendChild(fragment);
  }
  updateSummary();
}

function changeQuantity(productId, delta) {
  const item = state.quote.get(productId);
  if (!item || item.quantityMode !== 'unit') return;
  item.quantity = Math.max(1, item.quantity + delta);
  renderQuote();
}

function toggleQuoteItem(productId) {
  const item = state.quote.get(productId);
  if (!item) return;
  item.expanded = !item.expanded;
  renderQuote();
}

function removeItem(productId) {
  state.quote.delete(productId);
  renderQuote();
}

function handleDiscountChange(event) {
  const inputValue = parseFloat(String(event.target.value).replace(',', '.'));
  const normalised = Number.isNaN(inputValue) || inputValue < 0 ? 0 : Math.min(inputValue, 100);
  updateDiscountRate(normalised);
}

function updateDiscountRate(rate) {
  state.discountRate = rate;
  syncDiscountInputs();
  renderProducts();
  renderQuote();
}

function syncDiscountInputs() {
  if (elements.headerDiscount) {
    elements.headerDiscount.value = String(state.discountRate);
  }
  if (elements.discount) {
    elements.discount.value = quantityFormatter.format(state.discountRate);
  }
}

function calculateDiscountedValue(amount) {
  const rate = state.discountRate / 100;
  const discounted = amount * (1 - rate);
  if (!Number.isFinite(discounted) || discounted < 0) {
    return 0;
  }
  return discounted;
}

function calculateEcotaxTotal(item) {
  if (!item) return 0;
  const ecotax = Number(item.ecotax) || 0;
  const quantity = Number(item.quantity) || 0;
  const total = ecotax * quantity;
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return total;
}

function getEcotaxUnitLabel(item) {
  if (!item) return UNIT_LABEL_PIECE.toLowerCase();
  const unit = item.unit || '';
  if (item.quantityMode === 'area') {
    return unit || UNIT_LABEL_AREA;
  }
  if (!unit) {
    return UNIT_LABEL_PIECE.toLowerCase();
  }
  if (unit === UNIT_LABEL_PIECE) {
    return UNIT_LABEL_PIECE.toLowerCase();
  }
  return unit;
}

function formatEcotaxPerUnit(product) {
  if (!product) return `${currencyFormatter.format(0)} HT / ${UNIT_LABEL_PIECE.toLowerCase()}`;
  const amount = Number(product.ecotax) || 0;
  return `${currencyFormatter.format(amount)} HT / ${getEcotaxUnitLabel(product)}`;
}

function formatWeight(weight) {
  if (!Number.isFinite(weight) || weight <= 0) {
    return 'Non communiqué';
  }
  return `${numberFormatter.format(weight)} kg`;
}

function applyScoreBadge(element, score) {
  if (!element) return;
  const hasScore = Boolean(score);
  const scoreKey = hasScore ? score.toLowerCase() : 'none';
  element.dataset.score = scoreKey;
  const label = hasScore ? `Indice Positiv'ID : ${score}` : "Indice Positiv'ID : Non noté";
  element.textContent = label;
  element.setAttribute('aria-label', label);
}

function handleGeneralCommentChange(event) {
  state.generalComment = event.target.value;
}

function updateSummary() {
  const items = Array.from(state.quote.values());
  const subtotalProducts = items.reduce((total, item) => total + item.price * (item.quantity || 0), 0);
  const discountAmount = subtotalProducts * (state.discountRate / 100);
  const netProducts = subtotalProducts - discountAmount;
  const totalEcotax = items.reduce((total, item) => total + calculateEcotaxTotal(item), 0);
  const baseHt = netProducts + totalEcotax;
  const vat = baseHt * state.vatRate;
  const total = baseHt + vat;
  if (elements.summarySubtotal) {
    elements.summarySubtotal.textContent = currencyFormatter.format(subtotalProducts);
  }
  if (elements.summaryDiscount) {
    elements.summaryDiscount.textContent = `-${currencyFormatter.format(discountAmount)}`;
  }
  if (elements.summaryNetProducts) {
    elements.summaryNetProducts.textContent = currencyFormatter.format(netProducts);
  }
  if (elements.summaryEcotax) {
    elements.summaryEcotax.textContent = currencyFormatter.format(totalEcotax);
  }
  if (elements.summaryNet) {
    elements.summaryNet.textContent = currencyFormatter.format(baseHt);
  }
  if (elements.summaryVat) {
    elements.summaryVat.textContent = currencyFormatter.format(vat);
  }
  if (elements.summaryTotal) {
    elements.summaryTotal.textContent = currencyFormatter.format(total);
  }
}

function generatePdf() {
  if (!state.quote.size) {
    toggleFeedback('Ajoutez au moins un article avant de générer le devis.', 'warning');
    return;
  }
  toggleFeedback('', 'hide');
  const items = Array.from(state.quote.values());
  const subtotalProducts = items.reduce((sum, item) => sum + item.price * (item.quantity || 0), 0);
  const discountAmount = subtotalProducts * (state.discountRate / 100);
  const netProducts = subtotalProducts - discountAmount;
  const totalEcotax = items.reduce((sum, item) => sum + calculateEcotaxTotal(item), 0);
  const baseHt = netProducts + totalEcotax;
  const vat = baseHt * state.vatRate;
  const total = baseHt + vat;

  const issueDate = new Date();
  const issueDateLabel = issueDate.toLocaleDateString('fr-FR');
  const validityDate = new Date(issueDate);
  validityDate.setDate(validityDate.getDate() + 30);
  const validityLabel = validityDate.toLocaleDateString('fr-FR');
  const quoteNumber = `DEV-${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, '0')}${String(issueDate.getDate()).padStart(2, '0')}-${String(issueDate.getHours()).padStart(2, '0')}${String(issueDate.getMinutes()).padStart(2, '0')}`;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 120, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('DEVIS PROFESSIONNEL', margin, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`Référence : ${quoteNumber}`, margin, 88);
  doc.text(`Date d'édition : ${issueDateLabel}`, margin, 106);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Deviseur Express', pageWidth - margin, 52, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('12 avenue des Solutions\n75000 Paris\ncontact@deviseurexpress.fr\n+33 1 23 45 67 89', pageWidth - margin, 72, {
    align: 'right',
  });

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  let y = 150;
  doc.text('Informations client', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Nom du client\nAdresse\nCode postal - Ville\nclient@email.com', margin, y + 18);

  const infoX = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Conditions du devis', infoX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Validité de l'offre : ${validityLabel}`, infoX, y + 18);
  doc.text('Conditions de paiement : 30% à la commande, solde à la livraison', infoX, y + 36, {
    maxWidth: pageWidth - infoX - margin,
  });
  doc.text(`Remise appliquée : ${numberFormatter.format(state.discountRate)} %`, infoX, y + 54);

  const body = items.map((item) => {
    const quantityDetails =
      item.quantityMode === 'area'
        ? `${dimensionFormatter.format(item.length || 0)} m x ${dimensionFormatter.format(item.width || 0)} m = ${quantityFormatter.format(item.quantity || 0)} ${item.unit || 'm²'}`
        : `${quantityFormatter.format(item.quantity || 0)} ${item.unit || ''}`.trim();

    const designationLines = [item.name];
    const weightLabel = formatWeight(item.weight);
    if (weightLabel !== 'Non communiqué') {
      designationLines.push(`Poids unitaire : ${weightLabel}`);
    }
    const ecotaxPerUnit = `${currencyFormatter.format(Number(item.ecotax) || 0)} HT / ${getEcotaxUnitLabel(item)}`;
    designationLines.push(`Éco-participation : ${ecotaxPerUnit}`);
    if (item.score) {
      designationLines.push(`Indice Positiv'ID : ${item.score}`);
    }
    if (item.comment) {
      designationLines.push(`Commentaire : ${item.comment}`);
    }
    if (item.link) {
      designationLines.push(`Lien : ${item.link}`);
    }

    const quantityValue = item.quantity || 0;
    const baseSubtotal = item.price * quantityValue;
    const discountedUnit = calculateDiscountedValue(item.price);
    const discountedSubtotal = calculateDiscountedValue(baseSubtotal);
    const ecotaxTotal = calculateEcotaxTotal(item);
    const lineTotal = discountedSubtotal + ecotaxTotal;

    if (state.discountRate > 0) {
      designationLines.push(`Prix unitaire avant remise : ${currencyFormatter.format(item.price)} HT`);
    }

    return [
      item.reference,
      designationLines.join('\n'),
      quantityDetails,
      currencyFormatter.format(discountedUnit),
      currencyFormatter.format(lineTotal),
    ];
  });

  doc.autoTable({
    startY: y + 90,
    head: [['Référence', 'Désignation', 'Détails quantités', 'PU HT', 'Total HT']],
    body,
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6, textColor: [30, 41, 59] },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 160 },
      2: { cellWidth: 150 },
      3: { halign: 'right', cellWidth: 60 },
      4: { halign: 'right', cellWidth: 60 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  const summaryStartY = doc.lastAutoTable.finalY + 24;
  doc.autoTable({
    startY: summaryStartY,
    head: [['Récapitulatif', 'Montant']],
    body: [
      ['Total HT produits', currencyFormatter.format(subtotalProducts)],
      [`Remise (${numberFormatter.format(state.discountRate)} %)`, `-${currencyFormatter.format(discountAmount)}`],
      ['Total HT après remise', currencyFormatter.format(netProducts)],
      ['Éco-participation', currencyFormatter.format(totalEcotax)],
      ['Base HT à facturer', currencyFormatter.format(baseHt)],
      [`TVA (${numberFormatter.format(state.vatRate * 100)} %)`, currencyFormatter.format(vat)],
      ['Total TTC', currencyFormatter.format(total)],
    ],
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6, textColor: [30, 41, 59] },
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 200 },
      1: { halign: 'right', cellWidth: 120 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.row.section === 'body' && data.row.index === data.table.body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [226, 232, 240];
      }
    },
  });

  let closingY = doc.lastAutoTable.finalY + 28;
  if (state.generalComment && state.generalComment.trim().length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Commentaire général', margin, closingY);
    closingY += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(state.generalComment.trim(), margin, closingY, {
      maxWidth: pageWidth - margin * 2,
    });
    closingY += 24;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.text("Merci pour votre confiance. Ce devis reste modifiable jusqu'à validation écrite.", margin, closingY);
  closingY += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    'Nos équipes restent disponibles pour toute précision technique ou logistique concernant les produits listés.',
    margin,
    closingY,
    { maxWidth: pageWidth - margin * 2 },
  );

  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      doc.setPage(pageNumber);
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Deviseur Express - SAS au capital de 50 000 € - SIRET 123 456 789 00000', margin, pageHeight - 36);
      doc.text('12 avenue des Solutions, 75000 Paris - www.deviseurexpress.fr', margin, pageHeight - 22);
      doc.text(`Document généré le ${issueDateLabel}`, pageWidth - margin, pageHeight - 36, { align: 'right' });
      doc.text(`Page ${pageNumber}/${pageCount}`, pageWidth - margin, pageHeight - 22, { align: 'right' });
    }
    doc.setTextColor(30, 41, 59);
  };

  addFooter();
  doc.save(`devis-${quoteNumber}.pdf`);
}

function toggleFeedback(message, type = 'info') {
  const box = elements.productFeedback;
  if (!box) return;
  if (!message || type === 'hide') {
    box.classList.add('hidden');
    box.textContent = '';
    return;
  }
  const styles = {
    info: 'rounded-2xl px-6 py-4 text-sm shadow-sm bg-blue-50 text-blue-700 border border-blue-100',
    warning: 'rounded-2xl px-6 py-4 text-sm shadow-sm bg-amber-50 text-amber-700 border border-amber-100',
    error: 'rounded-2xl px-6 py-4 text-sm shadow-sm bg-rose-50 text-rose-700 border border-rose-100',
  };
  box.className = styles[type] || styles.info;
  box.textContent = message;
  box.classList.remove('hidden');
}

function parseFrenchNumber(value) {
  if (!value) return 0;
  const normalised = String(value).replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(normalised);
  return Number.isFinite(parsed) ? parsed : 0;
}

function setupModal() {
  if (!elements.modalBackdrop) return;

  elements.modalClose.addEventListener('click', closeProductModal);
  elements.modalBackdrop.addEventListener('click', (event) => {
    if (event.target === elements.modalBackdrop) {
      closeProductModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.modalBackdrop.dataset.open === 'true') {
      closeProductModal();
    }
  });
}

function openProductModal(product) {
  if (!elements.modalBackdrop) return;
  state.lastFocusElement = document.activeElement;
  const imageUrl = product.image || defaultImage;
  elements.modalImage.src = imageUrl;
  elements.modalImage.alt = product.name;
  elements.modalImage.addEventListener('error', () => {
    elements.modalImage.src = defaultImage;
  }, { once: true });

  elements.modalTitle.textContent = product.name;
  elements.modalReference.textContent = product.reference;
  if (elements.modalDescription) {
    if (product.description) {
      elements.modalDescription.textContent = product.description;
      elements.modalDescription.style.display = '';
    } else {
      elements.modalDescription.textContent = '';
      elements.modalDescription.style.display = 'none';
    }
  }

  if (elements.modalCategory) {
    elements.modalCategory.textContent = product.category || 'Non renseignée';
  }
  if (elements.modalUnit) {
    elements.modalUnit.textContent = formatUnitLabel(product.unit);
  }
  if (elements.modalWeight) {
    elements.modalWeight.textContent = formatWeight(product.weight);
  }
  if (elements.modalEcotax) {
    elements.modalEcotax.textContent = formatEcotaxPerUnit(product);
  }
  if (elements.modalScore) {
    elements.modalScore.textContent = product.score || 'Non noté';
  }

  if (product.link) {
    elements.modalLink.href = product.link;
    elements.modalLink.classList.remove('hidden');
  } else {
    elements.modalLink.classList.add('hidden');
    elements.modalLink.removeAttribute('href');
  }

  elements.modalBackdrop.dataset.open = 'true';
  document.body.style.overflow = 'hidden';
  elements.modalClose.focus();
}

function closeProductModal() {
  if (!elements.modalBackdrop) return;
  elements.modalBackdrop.dataset.open = 'false';
  document.body.style.removeProperty('overflow');
  if (state.lastFocusElement && typeof state.lastFocusElement.focus === 'function') {
    state.lastFocusElement.focus();
  }
}

function deriveCategories(items) {
  const set = new Set();
  items.forEach((item) => {
    if (item.category) {
      set.add(item.category);
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

function deriveUnits(items) {
  const set = new Set();
  items.forEach((item) => {
    set.add(item.unit || '');
  });
  return Array.from(set).sort((a, b) => formatUnitLabel(a).localeCompare(formatUnitLabel(b), 'fr', { sensitivity: 'base' }));
}

function setupCategoryFilter() {
  if (!elements.categoryFilterButton || !elements.categoryFilterMenu) return;
  elements.categoryFilterButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleCategoryMenu();
  });
  elements.categoryFilterClose?.addEventListener('click', () => {
    closeCategoryMenu();
  });
  elements.categoryFilterClear?.addEventListener('click', () => {
    clearCategorySelection();
  });
  document.addEventListener('click', handleCategoryMenuOutsideClick);
  document.addEventListener('keydown', handleCategoryMenuKeydown);
}

function populateCategoryFilter() {
  if (!elements.categoryFilterOptions) return;
  elements.categoryFilterOptions.innerHTML = '';
  if (!state.categories.length) {
    const empty = document.createElement('p');
    empty.className = 'text-xs text-slate-500';
    empty.textContent = 'Aucune catégorie détectée dans le catalogue.';
    elements.categoryFilterOptions.appendChild(empty);
    updateCategoryFilterLabel();
    return;
  }
  const fragment = document.createDocumentFragment();
  state.categories.forEach((category) => {
    const label = document.createElement('label');
    label.className = 'category-option';
    label.addEventListener('click', (event) => event.stopPropagation());
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = category;
    checkbox.checked = state.selectedCategories.has(category);
    checkbox.addEventListener('click', (event) => event.stopPropagation());
    checkbox.addEventListener('change', (event) => handleCategoryCheckboxChange(event, label));
    const text = document.createElement('span');
    text.textContent = category;
    label.append(checkbox, text);
    if (checkbox.checked) {
      label.classList.add('is-active');
    }
    fragment.appendChild(label);
  });
  elements.categoryFilterOptions.appendChild(fragment);
  updateCategoryFilterLabel();
}

function populateUnitFilter() {
  const select = elements.unitFilter;
  if (!select) return;
  select.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = UNIT_FILTER_ALL;
  defaultOption.textContent = 'Toutes les unités';
  select.appendChild(defaultOption);

  const availableValues = new Set([UNIT_FILTER_ALL]);
  state.units.forEach((unit) => {
    const option = document.createElement('option');
    option.value = getUnitFilterValue(unit);
    option.textContent = formatUnitLabel(unit);
    select.appendChild(option);
    availableValues.add(option.value);
  });

  if (!availableValues.has(state.selectedUnit)) {
    state.selectedUnit = UNIT_FILTER_ALL;
  }
  select.value = state.selectedUnit;
}

function handleUnitFilterChange(event) {
  const value = event.target?.value ?? UNIT_FILTER_ALL;
  state.selectedUnit = value;
  applyFilters();
}

function handleCategoryCheckboxChange(event, label) {
  const checkbox = event.target;
  if (!(checkbox instanceof HTMLInputElement)) return;
  if (checkbox.checked) {
    state.selectedCategories.add(checkbox.value);
    label.classList.add('is-active');
  } else {
    state.selectedCategories.delete(checkbox.value);
    label.classList.remove('is-active');
  }
  updateCategoryFilterLabel();
  applyFilters();
}

function updateCategoryFilterLabel() {
  if (!elements.categoryFilterLabel) return;
  const count = state.selectedCategories.size;
  if (!count) {
    elements.categoryFilterLabel.textContent = 'Toutes les catégories';
    return;
  }
  if (count === 1) {
    const first = state.selectedCategories.values().next().value;
    elements.categoryFilterLabel.textContent = `Catégorie : ${first}`;
    return;
  }
  elements.categoryFilterLabel.textContent = `${count} catégories sélectionnées`;
}

function clearCategorySelection() {
  state.selectedCategories.clear();
  const checkboxes = elements.categoryFilterOptions?.querySelectorAll('input[type="checkbox"]');
  checkboxes?.forEach((checkbox) => {
    checkbox.checked = false;
    checkbox.parentElement?.classList.remove('is-active');
  });
  updateCategoryFilterLabel();
  applyFilters();
}

function toggleCategoryMenu() {
  if (state.categoryMenuOpen) {
    closeCategoryMenu();
  } else {
    openCategoryMenu();
  }
}

function openCategoryMenu() {
  if (!elements.categoryFilterMenu || !elements.categoryFilterButton) return;
  elements.categoryFilterMenu.dataset.open = 'true';
  elements.categoryFilterButton.setAttribute('aria-expanded', 'true');
  state.categoryMenuOpen = true;
}

function closeCategoryMenu() {
  if (!elements.categoryFilterMenu || !elements.categoryFilterButton) return;
  elements.categoryFilterMenu.dataset.open = 'false';
  elements.categoryFilterButton.setAttribute('aria-expanded', 'false');
  state.categoryMenuOpen = false;
}

function handleCategoryMenuOutsideClick(event) {
  if (!state.categoryMenuOpen) return;
  if (!elements.categoryFilterMenu || !elements.categoryFilterButton) return;
  const target = event.target;
  if (target instanceof Node) {
    if (
      !elements.categoryFilterMenu.contains(target) &&
      !elements.categoryFilterButton.contains(target)
    ) {
      closeCategoryMenu();
    }
  }
}

function handleCategoryMenuKeydown(event) {
  if (event.key === 'Escape' && state.categoryMenuOpen) {
    closeCategoryMenu();
    elements.categoryFilterButton?.focus();
  }
}

function formatQuantityLabel(item) {
  const quantity = quantityFormatter.format(item.quantity || 0);
  if (item.quantityMode === 'area') {
    const unit = item.unit || 'm²';
    return `${quantity} ${unit}`;
  }
  if (!item.unit || /unité/i.test(item.unit)) {
    return `${quantity} u.`;
  }
  return `${quantity} ${item.unit}`;
}
