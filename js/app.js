const catalogueUrl = './catalogue/export.csv';
const defaultImage = 'https://via.placeholder.com/640x480.png?text=Image+indisponible';
const brandLogoAssetPath = 'media/ID%20GROUP.png';

const COMPANY_IDENTITY = {
  name: 'ID GROUP',
  legal: [
    'SASU au capital de 1 000 000 €',
    'RCS Chambéry',
    'N° SIRET : 403 401 854 00035',
    'N° EORI : FR403401854',
    'N.A.F. : 4669B',
    'TVA intracommunautaire : FR12403401854',
  ],
  contacts: [
    {
      title: 'Service commercial',
      lines: [
        'ALPESPACE-FRANCIN',
        '47 Voie St Exupéry',
        '73800 Porte de Savoie - France',
        'Téléphone : 00 33 4 79 84 36 06',
        'Télécopie : 00 33 4 79 84 36 10',
        'Email : ids@ids-france.net',
      ],
    },
    {
      title: 'Support ID MAT',
      lines: [
        'Téléphone : 00 33 4 79 84 14 18',
        'Télécopie : 00 33 4 79 84 14 19',
        'Email : idmat@id-mat.com',
      ],
    },
  ],
};

const TERMS_AND_CONDITIONS = [
  'Nos conditions générales de vente en vigueur s\'appliquent à ce document et sont disponibles sur simple demande.',
  "Toute commande et son paiement valent acceptation des conditions générales de vente.",
  "En cas de retard de paiement, une pénalité équivalente à trois (3) fois le taux d'intérêt légal sera appliquée, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement.",
];

const CATALOGUE_MISC_CATEGORY = '__uncategorized__';

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const numberFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantityFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dimensionFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const UNIT_FILTER_ALL = '__all__';
const UNIT_FILTER_NONE = '__none__';

const WEBHOOK_ENDPOINTS = {
  production: 'https://aiid.app.n8n.cloud/webhook/deviseur',
  test: 'https://aiid.app.n8n.cloud/webhook-test/deviseur',
};

const NEW_CLIENT_URL = 'https://www.idgroup-france.com/bao/NouveauClient.html';

const CART_SNAPSHOT_VERSION = 1;
const CART_FILENAME_PREFIX = 'panier-deviseur';
const WEBHOOK_PANEL_TIMEOUT = 10000;

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
  saveName: '',
  splitInstance: null,
  lastFocusElement: null,
  categoryMenuOpen: false,
  brandLogoDataUrl: undefined,
  webhookMode: 'production',
  isIdentifyingClient: false,
  identifiedClient: null,
  webhookPanelTimeout: null,
};

const elements = {
  siteNav: document.querySelector('.site-nav'),
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
  catalogueTree: document.getElementById('catalogue-tree'),
  productGrid: document.getElementById('product-grid'),
  productFeedback: document.getElementById('product-feedback'),
  productTemplate: document.getElementById('product-card-template'),
  quoteTemplate: document.getElementById('quote-item-template'),
  quoteList: document.getElementById('quote-list'),
  quoteEmpty: document.getElementById('quote-empty'),
  headerDiscount: document.getElementById('header-discount'),
  discount: document.getElementById('discount'),
  generalComment: document.getElementById('general-comment'),
  summaryDiscount: document.getElementById('summary-discount'),
  summaryNet: document.getElementById('summary-net'),
  summaryVat: document.getElementById('summary-vat'),
  summaryTotal: document.getElementById('summary-total'),
  summaryEcotax: document.getElementById('summary-ecotax'),
  summaryProducts: document.getElementById('summary-products'),
  generatePdf: document.getElementById('generate-pdf'),
  modalBackdrop: document.getElementById('product-modal'),
  modalImage: document.getElementById('product-modal-image'),
  modalTitle: document.getElementById('product-modal-title'),
  modalReference: document.getElementById('product-modal-reference'),
  modalDescription: document.getElementById('product-modal-description'),
  modalLink: document.getElementById('product-modal-link'),
  modalUnit: document.getElementById('product-modal-unit'),
  modalEcotax: document.getElementById('product-modal-ecotax'),
  modalWeight: document.getElementById('product-modal-weight'),
  modalWeightRow: document.querySelector('[data-role="modal-meta-weight"]'),
  modalScore: document.getElementById('product-modal-score'),
  modalClose: document.getElementById('product-modal-close'),
  currentYear: document.getElementById('current-year'),
  brandLogo: document.querySelector('.brand-logo'),
  webhookModeBadge: document.getElementById('webhook-mode-badge'),
  saveCart: document.getElementById('save-cart'),
  restoreCart: document.getElementById('restore-cart'),
  restoreCartInput: document.getElementById('restore-cart-input'),
  saveNameInput: document.getElementById('save-name'),
  siretForm: document.getElementById('siret-form'),
  siretInput: document.getElementById('siret-input'),
  siretSubmit: document.getElementById('siret-submit'),
  siretFeedback: document.getElementById('siret-feedback'),
  webhookPanel: document.getElementById('webhook-panel'),
  webhookPanelContent: document.getElementById('webhook-panel-content'),
  webhookPanelClose: document.getElementById('webhook-panel-close'),
  clientFormPlaceholder: document.getElementById('client-form-placeholder'),
  clientIdentity: document.getElementById('client-identity'),
  clientIdentityName: document.getElementById('client-identity-name'),
  clientIdentityMeta: document.getElementById('client-identity-meta'),
  clientIdentityRegister: document.getElementById('client-identity-register'),
  clientIdentityReset: document.getElementById('client-identity-reset'),
};

document.addEventListener('DOMContentLoaded', () => {
  loadCatalogue();
  elements.search?.addEventListener('input', handleSearch);
  elements.unitFilter?.addEventListener('change', handleUnitFilterChange);
  elements.generalComment?.addEventListener('input', handleGeneralCommentChange);
  elements.generatePdf?.addEventListener('click', generatePdf);
  elements.catalogueTree?.addEventListener('change', handleCatalogueTreeChange);
  elements.saveCart?.addEventListener('click', handleSaveCart);
  elements.saveNameInput?.addEventListener('input', handleSaveNameInput);
  elements.restoreCart?.addEventListener('click', () => {
    elements.restoreCartInput?.click();
  });
  elements.restoreCartInput?.addEventListener('change', handleRestoreCartInput);
  elements.siretForm?.addEventListener('submit', handleSiretSubmit);
  elements.siretInput?.addEventListener('input', handleSiretInputChange);
  elements.brandLogo?.addEventListener('click', toggleWebhookMode);
  elements.webhookPanelClose?.addEventListener('click', closeWebhookPanel);
  elements.clientIdentityReset?.addEventListener('click', handleClientIdentityReset);
  setupModal();
  setupResponsiveSplit();
  setupCategoryFilter();
  setupNavAutoHide();
  if (elements.currentYear) {
    elements.currentYear.textContent = new Date().getFullYear();
  }
  window.addEventListener('resize', setupResponsiveSplit);
  syncDiscountInputs();
  syncGeneralCommentInput();
  syncSaveNameInput();
  updateWebhookModeIndicator();
  setIdentificationState('idle');
  renderClientIdentity();
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

function setupNavAutoHide() {
  const nav = elements.siteNav;
  if (!nav) {
    return;
  }
  nav.dataset.collapsed = 'false';
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
    populateCatalogueTree();
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
      entry[header] = (cells[index] ?? '').trim();
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

function slugifyHeader(header) {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function cleanCsvValue(value) {
  if (value === undefined || value === null) return '';
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toUpperCase() === 'NULL') {
    return '';
  }
  return trimmed;
}

function parseCsvNumber(value) {
  const cleaned = cleanCsvValue(value);
  if (!cleaned) return 0;
  return parseFrenchNumber(cleaned);
}

function resolveUnitInfo(rawUnit) {
  const cleaned = cleanCsvValue(rawUnit);
  if (!cleaned) {
    return { label: '', mode: 'unit' };
  }
  if (/^\d+$/u.test(cleaned)) {
    if (cleaned === '3') {
      return { label: 'm²', mode: 'area' };
    }
    return { label: 'Pièce', mode: 'unit' };
  }
  const label = normaliseUnitLabel(cleaned);
  const mode = getQuantityMode(label);
  return { label, mode };
}

function normaliseScoreValue(value) {
  const cleaned = cleanCsvValue(value).toUpperCase();
  if (['A', 'B', 'C', 'D', 'E'].includes(cleaned)) {
    return cleaned;
  }
  return '';
}

function getScoreBadgeValue(score) {
  return score || 'NR';
}

function formatEcotaxUnitText(item) {
  const amount = Number.isFinite(item?.baseEcotax) ? item.baseEcotax : 0;
  const formatted = currencyFormatter.format(amount);
  if (item?.quantityMode === 'area') {
    return `Ecopart : ${formatted} / m²`;
  }
  const unitLabel = item?.unit ? item.unit.toLowerCase() : "pièce";
  return `Ecopart : ${formatted} / ${unitLabel}`;
}

function formatWeightLabel(weight) {
  const numeric = Number(weight);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '';
  }
  return `Poids unitaire : ${numberFormatter.format(numeric)} kg`;
}

function formatWeightValue(weight) {
  const numeric = Number(weight);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '';
  }
  return `${numberFormatter.format(numeric)} kg`;
}

function normaliseUnitLabel(unit) {
  if (!unit) return '';
  const value = String(unit).trim();
  if (!value) return '';
  if (/^\d+$/u.test(value)) {
    if (value === '3') {
      return 'm²';
    }
    return 'Pièce';
  }
  const normalised = value
    .replace(/m2/gi, 'm²')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^pi[eè]ces?$/iu.test(normalised)) {
    return 'Pièce';
  }
  if (/^m²$/iu.test(normalised)) {
    return 'm²';
  }
  return normalised;
}

function formatUnitLabel(unit) {
  if (!unit) return "À l'unité";
  return unit;
}

function getUnitFilterValue(unit) {
  return unit ? unit : UNIT_FILTER_NONE;
}

function getQuantityMode(unit) {
  if (!unit) return 'unit';
  const normalised = unit.toLowerCase();
  if (normalised.includes('m2') || normalised.includes('m²')) {
    return 'area';
  }
  return 'unit';
}

function toProduct(entry) {
  if (!entry) return null;
  const reference = cleanCsvValue(entry.ref);
  const name = cleanCsvValue(entry.design);
  if (!reference || !name) return null;

  const unitInfo = resolveUnitInfo(entry.unite);
  const price = parseCsvNumber(entry.prix);
  const baseEcotax = parseCsvNumber(entry.ecotaxe);
  const weight = parseCsvNumber(entry.poids);
  const category = cleanCsvValue(entry.categorie);
  const image = cleanCsvValue(entry.image);
  const link = cleanCsvValue(entry.url);
  const score = normaliseScoreValue(entry.score);

  return {
    id: reference,
    reference,
    name,
    description: '',
    price,
    priceLabel: currencyFormatter.format(price),
    unit: unitInfo.label,
    quantityMode: unitInfo.mode,
    baseEcotax,
    weight,
    score,
    image,
    link,
    category,
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
    card.dataset.productId = product.id;
    const image = card.querySelector('.product-image');
    image.src = product.image || defaultImage;
    image.alt = product.name;
    image.addEventListener('error', () => {
      image.src = defaultImage;
    });

    card.querySelector('.product-reference').textContent = product.reference;
    card.querySelector('.product-name').textContent = product.name;
    card.querySelector('.product-description').textContent = product.description || 'Pas de description fournie.';

    const categoryBadge = card.querySelector('.product-category-badge');
    categoryBadge.classList.remove('is-muted');
    if (product.category) {
      categoryBadge.textContent = product.category;
    } else {
      categoryBadge.textContent = 'Divers';
      categoryBadge.classList.add('is-muted');
    }

    const scoreBadge = card.querySelector('.score-badge');
    if (scoreBadge) {
      const scoreValue = getScoreBadgeValue(product.score);
      scoreBadge.dataset.score = scoreValue;
      if (scoreValue === 'NR') {
        scoreBadge.textContent = 'N.C.';
        scoreBadge.title = "Score Positiv'ID non communiqué";
      } else {
        scoreBadge.textContent = scoreValue;
        scoreBadge.title = `Score Positiv'ID : ${scoreValue}`;
      }
    }

    const unitLabel = product.unit ? ` / ${product.unit}` : '';
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
    unit.textContent = product.unit ? `Unité de vente : ${product.unit}` : "Unité de vente : à l'article";

    const ecotax = card.querySelector('.product-ecotax');
    if (ecotax) {
      ecotax.textContent = formatEcotaxUnitText(product);
    }

    const weight = card.querySelector('.product-weight');
    if (weight) {
      const label = formatWeightLabel(product.weight);
      weight.textContent = label;
      weight.style.display = label ? 'block' : 'none';
    }

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
      const lineEcotaxElement = node.querySelector('.line-ecotax');
      const lineTotalWithEcotaxContainer = node.querySelector('.line-total-with-ecotax');
      const lineTotalWithEcotaxOriginal =
        lineTotalWithEcotaxContainer?.querySelector('.line-total-with-ecotax-original') || null;
      const lineTotalWithEcotaxDiscounted =
        lineTotalWithEcotaxContainer?.querySelector('.line-total-with-ecotax-discounted') || null;
      const quoteEcotaxMeta = node.querySelector('.quote-ecotax');
      if (quoteEcotaxMeta) {
        quoteEcotaxMeta.textContent = formatEcotaxUnitText(item);
      }
      const quoteWeightMeta = node.querySelector('.quote-weight');
      if (quoteWeightMeta) {
        const weightLabel = formatWeightLabel(item.weight);
        quoteWeightMeta.textContent = weightLabel;
        quoteWeightMeta.style.display = weightLabel ? 'block' : 'none';
      }
      const quoteScoreBadge = node.querySelector('.quote-score .score-badge');
      if (quoteScoreBadge) {
        const scoreValue = getScoreBadgeValue(item.score);
        quoteScoreBadge.dataset.score = scoreValue;
        if (scoreValue === 'NR') {
          quoteScoreBadge.textContent = 'N.C.';
          quoteScoreBadge.title = "Score Positiv'ID non communiqué";
        } else {
          quoteScoreBadge.textContent = scoreValue;
          quoteScoreBadge.title = `Score Positiv'ID : ${scoreValue}`;
        }
      }
      const quantityValueElements = node.querySelectorAll('[data-role="quantity-value"]');
      const quantityUnitElements = node.querySelectorAll('[data-role="quantity-unit"]');
      const unitLabel =
        item.quantityMode === 'area' ? item.unit || 'm²' : item.unit || "à l'unité";
      quantityUnitElements.forEach((element) => {
        element.textContent = unitLabel;
      });

      const unitControls = node.querySelector('[data-mode="unit"]');
      const areaControls = node.querySelector('[data-mode="area"]');
      const dimensions = node.querySelector('.quote-dimensions');

      const updatePriceDisplays = () => {
        const quantityValue = getItemQuantity(item);
        const unitPriceValue = Number(item.price) || 0;
        const lineSubtotal = unitPriceValue * quantityValue;
        const discountedUnit = calculateDiscountedValue(unitPriceValue);
        const discountedLineSubtotal = discountedUnit * quantityValue;
        const ecotaxUnit = getUnitEcotax(item);
        const ecotaxSubtotal = ecotaxUnit * quantityValue;
        const formattedUnitOriginal = currencyFormatter.format(unitPriceValue);
        const formattedUnitDiscounted = currencyFormatter.format(discountedUnit);
        const formattedLineOriginal = currencyFormatter.format(lineSubtotal);
        const formattedLineDiscounted = currencyFormatter.format(discountedLineSubtotal);
        const formattedEcotax = currencyFormatter.format(ecotaxSubtotal);
        const formattedTotalWithEcotaxOriginal = currencyFormatter.format(
          lineSubtotal + ecotaxSubtotal,
        );
        const formattedTotalWithEcotaxDiscounted = currencyFormatter.format(
          discountedLineSubtotal + ecotaxSubtotal,
        );

        if (lineEcotaxElement) {
          lineEcotaxElement.textContent = formattedEcotax;
        }

        if (state.discountRate > 0) {
          unitPriceOriginal.textContent = formattedUnitOriginal;
          unitPriceOriginal.style.display = 'block';
          lineTotalOriginal.textContent = formattedLineOriginal;
          lineTotalOriginal.style.display = 'block';
          if (lineTotalWithEcotaxOriginal) {
            lineTotalWithEcotaxOriginal.textContent = formattedTotalWithEcotaxOriginal;
            lineTotalWithEcotaxOriginal.style.display = 'block';
          }
          summaryTotalOriginal.textContent = formattedTotalWithEcotaxOriginal;
          summaryTotalOriginal.style.display = 'block';
          unitPriceDiscounted.textContent = formattedUnitDiscounted;
          lineTotalDiscounted.textContent = formattedLineDiscounted;
          if (lineTotalWithEcotaxDiscounted) {
            lineTotalWithEcotaxDiscounted.textContent = formattedTotalWithEcotaxDiscounted;
          }
          summaryTotalDiscounted.textContent = formattedTotalWithEcotaxDiscounted;
        } else {
          unitPriceOriginal.textContent = '';
          unitPriceOriginal.style.display = 'none';
          lineTotalOriginal.textContent = '';
          lineTotalOriginal.style.display = 'none';
          if (lineTotalWithEcotaxOriginal) {
            lineTotalWithEcotaxOriginal.textContent = '';
            lineTotalWithEcotaxOriginal.style.display = 'none';
          }
          summaryTotalOriginal.textContent = '';
          summaryTotalOriginal.style.display = 'none';
          unitPriceDiscounted.textContent = formattedUnitOriginal;
          lineTotalDiscounted.textContent = formattedLineOriginal;
          if (lineTotalWithEcotaxDiscounted) {
            lineTotalWithEcotaxDiscounted.textContent = formattedTotalWithEcotaxDiscounted;
          }
          summaryTotalDiscounted.textContent = formattedTotalWithEcotaxDiscounted;
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

function updateDiscountRate(rate) {
  const safeRate = clampPercentage(rate);
  state.discountRate = safeRate;
  syncDiscountInputs();
  renderProducts();
  renderQuote();
  renderClientIdentity();
}

function syncDiscountInputs() {
  if (elements.headerDiscount) {
    const formatted = `${quantityFormatter.format(state.discountRate)} %`;
    elements.headerDiscount.textContent = formatted;
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

function getItemQuantity(item) {
  const quantity = Number(item?.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) {
    return 0;
  }
  return quantity;
}

function getUnitEcotax(item) {
  const value = Number(item?.baseEcotax);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function getProductSubtotal(item) {
  const price = Number(item?.price);
  if (!Number.isFinite(price) || price < 0) {
    return 0;
  }
  return price * getItemQuantity(item);
}

function getEcotaxTotal(item) {
  return getUnitEcotax(item) * getItemQuantity(item);
}

function handleGeneralCommentChange(event) {
  state.generalComment = event.target.value;
}

function syncGeneralCommentInput() {
  if (elements.generalComment) {
    elements.generalComment.value = state.generalComment || '';
  }
}

function handleSaveNameInput(event) {
  const value = typeof event.target.value === 'string' ? event.target.value : '';
  state.saveName = value;
}

function syncSaveNameInput() {
  if (elements.saveNameInput) {
    elements.saveNameInput.value = state.saveName || '';
  }
}

function extractInitialsForFilename(value) {
  if (!value) {
    return '';
  }
  const letters = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '');
  return letters.slice(0, 3).toUpperCase();
}

function getClientCodeForFilename() {
  if (state.identifiedClient?.companyName) {
    const initials = extractInitialsForFilename(state.identifiedClient.companyName);
    if (initials.length >= 3) {
      return initials.slice(0, 3);
    }
    if (initials.length > 0) {
      return initials.padEnd(3, 'X');
    }
  }
  if (state.identifiedClient?.identified && state.identifiedClient?.siret) {
    const digits = String(state.identifiedClient.siret)
      .replace(/\D/g, '')
      .slice(0, 3);
    if (digits) {
      return digits.toUpperCase();
    }
  }
  return 'NCL';
}

function normaliseFileSegment(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function formatDateForFilename(date) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function updateSummary() {
  const items = Array.from(state.quote.values());
  const productsSubtotal = items.reduce((total, item) => total + getProductSubtotal(item), 0);
  const ecotaxTotal = items.reduce((total, item) => total + getEcotaxTotal(item), 0);
  const discountAmount = productsSubtotal * (state.discountRate / 100);
  const net = productsSubtotal - discountAmount + ecotaxTotal;
  const vat = net * state.vatRate;
  const total = net + vat;
  if (elements.summaryProducts) {
    elements.summaryProducts.textContent = currencyFormatter.format(productsSubtotal);
  }
  if (elements.summaryDiscount) {
    elements.summaryDiscount.textContent = `-${currencyFormatter.format(discountAmount)}`;
  }
  if (elements.summaryEcotax) {
    elements.summaryEcotax.textContent = currencyFormatter.format(ecotaxTotal);
  }
  if (elements.summaryNet) {
    elements.summaryNet.textContent = currencyFormatter.format(net);
  }
  if (elements.summaryVat) {
    elements.summaryVat.textContent = currencyFormatter.format(vat);
  }
  if (elements.summaryTotal) {
    elements.summaryTotal.textContent = currencyFormatter.format(total);
  }
}

function handleSaveCart() {
  if (!state.quote.size) {
    toggleFeedback('Ajoutez des articles avant de sauvegarder votre panier.', 'warning');
    return;
  }
  const saveName = (state.saveName || '').trim();
  if (!saveName) {
    toggleFeedback('Indiquez un nom pour identifier votre sauvegarde.', 'warning');
    return;
  }
  try {
    const snapshot = buildCartSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const now = new Date();
    const dateSegment = formatDateForFilename(now);
    const slug = normaliseFileSegment(saveName) || CART_FILENAME_PREFIX;
    const clientCode = getClientCodeForFilename();
    const filenameBase = `${slug}-${clientCode}-${dateSegment}`;
    const filename = `${filenameBase}.json`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toggleFeedback('Le panier a été exporté au format JSON.', 'info');
  } catch (error) {
    console.error(error);
    toggleFeedback('Impossible de sauvegarder le panier. Merci de réessayer.', 'error');
  }
}

async function handleRestoreCartInput(event) {
  const file = event.target?.files?.[0];
  if (!file) {
    return;
  }
  try {
    const text = await readFileAsText(file);
    const snapshot = parseCartSnapshot(text);
    applyCartSnapshot(snapshot);
    toggleFeedback('Le panier a été restauré avec succès.', 'info');
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'Catalogue indisponible') {
      toggleFeedback('Le catalogue doit être chargé avant de restaurer un panier.', 'warning');
    } else {
      toggleFeedback('Impossible de restaurer le panier. Vérifiez le fichier JSON fourni.', 'error');
    }
  } finally {
    if (elements.restoreCartInput) {
      elements.restoreCartInput.value = '';
    }
  }
}

function buildCartSnapshot() {
  const items = Array.from(state.quote.values()).map((item) => ({
    id: item.id,
    quantityMode: item.quantityMode,
    quantity: getItemQuantity(item),
    length: item.quantityMode === 'area' ? item.length ?? null : null,
    width: item.quantityMode === 'area' ? item.width ?? null : null,
    comment: item.comment || '',
  }));
  const snapshot = {
    version: CART_SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    discountRate: state.discountRate,
    generalComment: state.generalComment || '',
    saveName: state.saveName || '',
    items,
  };
  if (state.identifiedClient && state.identifiedClient.identified) {
    snapshot.identifiedClient = {
      identified: true,
      siret: state.identifiedClient.siret || '',
      companyName: state.identifiedClient.companyName || '',
      contactEmail: state.identifiedClient.contactEmail || '',
      contactName: state.identifiedClient.contactName || '',
      addressLines: Array.isArray(state.identifiedClient.addressLines)
        ? state.identifiedClient.addressLines
        : [],
      conditionsLines: Array.isArray(state.identifiedClient.conditionsLines)
        ? state.identifiedClient.conditionsLines
        : [],
      discountRate:
        typeof state.identifiedClient.discountRate === 'number'
          ? state.identifiedClient.discountRate
          : null,
      statusLabel: state.identifiedClient.statusLabel || '',
    };
  }
  return snapshot;
}

function parseCartSnapshot(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') {
    throw new Error('Snapshot invalide');
  }
  if (!Array.isArray(data.items)) {
    throw new Error('Structure de panier non valide');
  }
  return data;
}

function applyCartSnapshot(snapshot) {
  if (!state.catalogueById || state.catalogueById.size === 0) {
    throw new Error('Catalogue indisponible');
  }
  state.quote.clear();
  if (typeof snapshot.generalComment === 'string') {
    state.generalComment = snapshot.generalComment;
    syncGeneralCommentInput();
  }
  if (typeof snapshot.saveName === 'string') {
    state.saveName = snapshot.saveName;
  } else {
    state.saveName = '';
  }
  syncSaveNameInput();
  if (snapshot.identifiedClient && typeof snapshot.identifiedClient === 'object') {
    state.identifiedClient = {
      identified: Boolean(snapshot.identifiedClient.identified),
      siret: snapshot.identifiedClient.siret || '',
      companyName: snapshot.identifiedClient.companyName || '',
      contactEmail: snapshot.identifiedClient.contactEmail || '',
      contactName: snapshot.identifiedClient.contactName || '',
      addressLines: Array.isArray(snapshot.identifiedClient.addressLines)
        ? snapshot.identifiedClient.addressLines.filter((line) => typeof line === 'string' && line.trim().length > 0)
        : [],
      conditionsLines: Array.isArray(snapshot.identifiedClient.conditionsLines)
        ? snapshot.identifiedClient.conditionsLines.filter(
            (line) => typeof line === 'string' && line.trim().length > 0,
          )
        : [],
      discountRate:
        typeof snapshot.identifiedClient.discountRate === 'number'
          ? clampPercentage(snapshot.identifiedClient.discountRate)
          : undefined,
      statusLabel: snapshot.identifiedClient.statusLabel || '',
    };
  } else {
    state.identifiedClient = null;
  }

  for (const itemData of snapshot.items) {
    if (!itemData || typeof itemData !== 'object') {
      continue;
    }
    const product = state.catalogueById.get(itemData.id);
    if (!product) {
      continue;
    }
    const entry = {
      ...product,
      quantity: product.quantityMode === 'unit' ? Math.max(1, sanitiseNumber(itemData.quantity, 1)) : 0,
      length: product.quantityMode === 'area' ? sanitiseNumber(itemData.length, 1) : undefined,
      width: product.quantityMode === 'area' ? sanitiseNumber(itemData.width, 1) : undefined,
      comment: typeof itemData.comment === 'string' ? itemData.comment : '',
      expanded: false,
    };
    if (product.quantityMode === 'area') {
      const length = Math.max(0, sanitiseNumber(itemData.length, 0));
      const width = Math.max(0, sanitiseNumber(itemData.width, 0));
      entry.length = length;
      entry.width = width;
      entry.quantity = Number.isFinite(length * width) ? length * width : 0;
    }
    state.quote.set(product.id, entry);
  }

  const discountRate =
    typeof snapshot.discountRate === 'number' ? clampPercentage(snapshot.discountRate) : null;
  updateDiscountRate(discountRate !== null ? discountRate : 0);
  updateIdentificationFromState();
}

function sanitiseNumber(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const numeric = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric;
}

function handleSiretInputChange(event) {
  const input = event.target;
  if (!input) return;
  const digits = String(input.value || '')
    .replace(/\D/g, '')
    .slice(0, 14);
  input.value = digits;
  if (!state.isIdentifyingClient) {
    if (!digits) {
      state.identifiedClient = null;
      setIdentificationState('idle');
      updateDiscountRate(0);
      closeWebhookPanel();
      closeClientFormPlaceholder();
      renderClientIdentity();
    } else if (state.identifiedClient && state.identifiedClient.siret !== digits) {
      state.identifiedClient = null;
      setIdentificationState('idle');
      updateDiscountRate(0);
      closeWebhookPanel();
      closeClientFormPlaceholder();
      renderClientIdentity();
    }
  }
}

async function handleSiretSubmit(event) {
  event.preventDefault();
  if (state.isIdentifyingClient) {
    return;
  }
  const siret = (elements.siretInput?.value || '').replace(/\D/g, '');
  if (siret.length !== 14) {
    setIdentificationState('error', 'Saisissez un numéro de SIRET valide (14 chiffres).');
    return;
  }
  const endpoint = getActiveWebhookUrl();
  state.isIdentifyingClient = true;
  setIdentificationState('loading', 'Identification en cours...');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siret }),
    });
    if (!response.ok) {
      throw new Error(`Requête webhook échouée (${response.status})`);
    }
    const contentType = response.headers.get('content-type') || '';
    let payload;
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      const rawText = await response.text();
      try {
        payload = JSON.parse(rawText);
      } catch (error) {
        payload = rawText;
      }
    }
    const result = normaliseWebhookResponse(payload, siret);
    state.identifiedClient = result;
    updateDiscountRate(typeof result.discountRate === 'number' ? result.discountRate : 0);
    updateIdentificationFromState();
    showWebhookPanel(result);
    if (result.identified) {
      closeClientFormPlaceholder();
    } else {
      openClientFormPlaceholder(siret);
    }
  } catch (error) {
    console.error(error);
    setIdentificationState('error', "Erreur lors de l'identification. Merci de réessayer.");
    updateDiscountRate(0);
    closeWebhookPanel();
    closeClientFormPlaceholder();
  } finally {
    state.isIdentifyingClient = false;
  }
}

function normaliseWebhookResponse(payload, siret) {
  const result = {
    identified: false,
    statusLabel: 'Client non identifié',
    companyName: '',
    contactEmail: '',
    contactName: '',
    addressLines: [],
    conditionsLines: [],
    discountRate: undefined,
    siret,
  };

  if (payload === null || payload === undefined) {
    return result;
  }

  if (Array.isArray(payload)) {
    const firstObject = payload.find((item) => item && typeof item === 'object' && !Array.isArray(item));
    if (!firstObject) {
      const firstPrimitive = payload.find((item) => typeof item === 'string' && item.trim().length > 0);
      if (typeof firstPrimitive === 'string') {
        return normaliseWebhookResponse(firstPrimitive, siret);
      }
      return result;
    }
    return normaliseWebhookResponse(firstObject, siret);
  }

  if (typeof payload === 'string') {
    const label = payload.trim();
    if (label) {
      result.statusLabel = label;
    }
    const lower = label.toLowerCase();
    result.identified = lower.includes('identifi') && !lower.includes('non');
    return result;
  }

  if (typeof payload !== 'object') {
    return result;
  }

  const getValue = (...keys) => {
    for (const key of keys) {
      if (key === null || key === undefined) {
        continue;
      }
      if (key in payload) {
        return payload[key];
      }
      if (typeof key === 'string') {
        const lowerKey = key.toLowerCase();
        const foundEntry = Object.entries(payload).find(
          ([entryKey]) => typeof entryKey === 'string' && entryKey.toLowerCase() === lowerKey,
        );
        if (foundEntry) {
          return foundEntry[1];
        }
      }
    }
    return undefined;
  };

  const statusCandidate = [getValue('status'), getValue('result'), getValue('message'), getValue('state')]
    .find((value) => typeof value === 'string' && value.trim().length > 0);
  if (statusCandidate) {
    result.statusLabel = statusCandidate.trim();
  }

  const identifiedCandidate =
    getValue('identified') ??
    getValue('clientIdentified') ??
    getValue('isIdentified') ??
    getValue('success') ??
    getValue('isValid') ??
    getValue('estIdentifie') ??
    getValue('client');
  if (typeof identifiedCandidate === 'boolean') {
    result.identified = identifiedCandidate;
  } else if (typeof identifiedCandidate === 'string') {
    const lower = identifiedCandidate.toLowerCase();
    result.identified = lower.includes('identifi') && !lower.includes('non');
  }

  if (!result.identified && typeof result.statusLabel === 'string') {
    const lower = result.statusLabel.toLowerCase();
    if (lower.includes('identifi') && !lower.includes('non')) {
      result.identified = true;
    }
  }

  const companyCandidate =
    getValue('companyName') ??
    getValue('company') ??
    getValue('raisonSociale') ??
    getValue('nomSociete') ??
    getValue('societe') ??
    getValue('name') ??
    getValue('Nom');
  if (typeof companyCandidate === 'string') {
    result.companyName = companyCandidate.trim();
  }

  const contactField = payload.contact ?? getValue('contact');
  const coordonneesField = payload.coordonnees ?? getValue('coordonnees');

  const emailCandidate =
    getValue('contactEmail') ??
    getValue('email') ??
    getValue('mail') ??
    getValue('Mail') ??
    (contactField && typeof contactField === 'object' ? contactField.email : undefined) ??
    (coordonneesField && typeof coordonneesField === 'object' ? coordonneesField.email : undefined);
  if (typeof emailCandidate === 'string') {
    result.contactEmail = emailCandidate.trim();
  }

  const contactCandidate =
    getValue('contactName') ??
    (contactField && typeof contactField === 'object' ? contactField.name : undefined) ??
    (typeof contactField === 'string' ? contactField : undefined) ??
    (coordonneesField && typeof coordonneesField === 'object' ? coordonneesField.contact : undefined);
  if (typeof contactCandidate === 'string') {
    result.contactName = contactCandidate.trim();
  }

  const addressLines = new Set();
  const pushAddress = (value) => {
    if (typeof value === 'string') {
      value
        .split(/\r?\n/)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => addressLines.add(part));
    }
  };

  if (Array.isArray(payload.address)) {
    payload.address.forEach(pushAddress);
  }
  if (Array.isArray(payload.addressLines)) {
    payload.addressLines.forEach(pushAddress);
  }
  if (typeof payload.address === 'string') {
    pushAddress(payload.address);
  }
  ['addressLine1', 'addressLine2', 'addressLine3', 'adresse', 'adresse1', 'adresse2'].forEach((key) => {
    const value = getValue(key);
    if (typeof value === 'string') {
      pushAddress(value);
    }
  });
  const cityParts = [getValue('postalCode', 'zipCode', 'codePostal', 'CP'), getValue('city', 'ville', 'Ville')]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
  if (cityParts.length) {
    pushAddress(cityParts.join(' '));
  }
  result.addressLines = Array.from(addressLines);

  const rawConditions = getValue('conditions');
  const conditionsCandidate =
    rawConditions ??
    getValue('pricing') ??
    getValue('pricingConditions') ??
    getValue('conditionsTarifaires') ??
    getValue('conditions_tarifaires');

  const conditionsLines = [];
  if (Array.isArray(conditionsCandidate)) {
    conditionsCandidate.forEach((value) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          conditionsLines.push(trimmed);
        }
      }
    });
  } else if (conditionsCandidate && typeof conditionsCandidate === 'object') {
    Object.entries(conditionsCandidate).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      const label = formatConditionKey(key);
      const displayValue =
        typeof value === 'number'
          ? numberFormatter.format(value)
          : typeof value === 'string'
          ? value.trim()
          : '';
      if (displayValue) {
        conditionsLines.push(`${label} : ${displayValue}`);
      }
    });
  } else if (typeof conditionsCandidate === 'string') {
    const trimmed = conditionsCandidate.trim();
    if (trimmed) {
      conditionsLines.push(trimmed);
    }
  }
  result.conditionsLines = conditionsLines;

  const tariffSources = [
    getValue('Tarif'),
    payload.conditions?.Tarif,
    payload.conditionsTarifaires?.Tarif,
    rawConditions?.Tarif,
    conditionsCandidate?.Tarif,
  ];
  for (const tariffCandidate of tariffSources) {
    const tariffValue = parsePercentageValue(tariffCandidate);
    if (tariffValue !== null) {
      result.discountRate = clampPercentage(tariffValue);
      break;
    }
  }

  if (result.discountRate === undefined) {
    const discountCandidates = [
      getValue('discountRate'),
      getValue('remise'),
      getValue('Remise'),
      getValue('remisePourcentage'),
      getValue('remisePercent'),
      getValue('remiseClient'),
      rawConditions?.discountRate,
      rawConditions?.remise,
      rawConditions?.discountPercent,
      rawConditions?.remisePourcentage,
      conditionsCandidate?.discountRate,
      conditionsCandidate?.remise,
      payload.conditions?.discountRate,
      payload.conditions?.remise,
      payload.conditionsTarifaires?.discountRate,
      payload.conditionsTarifaires?.remise,
    ];
    for (const candidate of discountCandidates) {
      const parsed = parsePercentageValue(candidate);
      if (parsed !== null) {
        result.discountRate = clampPercentage(parsed);
        break;
      }
    }
  }

  if (
    !result.identified &&
    (result.companyName || result.addressLines.length > 0 || result.contactEmail || result.contactName)
  ) {
    result.identified = true;
  }

  if (result.identified && (!result.statusLabel || result.statusLabel.toLowerCase().includes('non'))) {
    result.statusLabel = 'Client identifié';
  }

  if (result.discountRate === undefined || Number.isNaN(result.discountRate)) {
    result.discountRate = 0;
  }

  return result;
}

function buildIdentificationMessage(result) {
  if (!result) {
    return '';
  }
  if (!result.identified) {
    return result.statusLabel || 'Client non identifié';
  }
  if (!result.companyName) {
    return "Client non référencé. Merci de vous enregistrer comme nouveau client.";
  }
  const parts = [];
  if (result.companyName) {
    parts.push(result.companyName);
  }
  if (result.contactEmail) {
    parts.push(`Contact : ${result.contactEmail}`);
  }
  if (result.conditionsLines && result.conditionsLines.length > 0) {
    parts.push(result.conditionsLines[0]);
  }
  return parts.join(' • ') || 'Client identifié';
}

function renderClientIdentity() {
  const container = elements.clientIdentity;
  const form = elements.siretForm;
  if (!container || !form) {
    return;
  }

  const client = state.identifiedClient;
  const identified = Boolean(client && client.identified);
  form.hidden = identified;
  container.hidden = !identified;

  if (!identified) {
    if (elements.clientIdentityName) {
      elements.clientIdentityName.textContent = '';
    }
    if (elements.clientIdentityMeta) {
      elements.clientIdentityMeta.textContent = '';
      elements.clientIdentityMeta.hidden = true;
    }
    if (elements.clientIdentityRegister) {
      elements.clientIdentityRegister.hidden = true;
    }
    return;
  }

  const hasName = typeof client?.companyName === 'string' && client.companyName.trim().length > 0;
  const displayName = hasName ? client.companyName.trim() : 'Client non référencé';
  if (elements.clientIdentityName) {
    elements.clientIdentityName.textContent = displayName;
  }

  if (elements.clientIdentityMeta) {
    const parts = [];
    if (client?.siret) {
      parts.push(`SIRET ${formatSiret(client.siret)}`);
    }
    if (client?.statusLabel) {
      parts.push(client.statusLabel);
    }
    const discountRate = Number.isFinite(state.discountRate) ? state.discountRate : null;
    if (discountRate !== null) {
      const formattedDiscount = `${quantityFormatter.format(discountRate)} %`;
      parts.push(`Remise ${formattedDiscount}`);
    }
    elements.clientIdentityMeta.textContent = parts.join(' • ');
    elements.clientIdentityMeta.hidden = parts.length === 0;
  }

  if (elements.clientIdentityRegister) {
    elements.clientIdentityRegister.hidden = hasName;
  }
}

function setIdentificationState(status, message = null) {
  if (elements.siretForm) {
    elements.siretForm.dataset.status = status;
  }
  const isLoading = status === 'loading';
  if (elements.siretInput) {
    elements.siretInput.readOnly = isLoading;
  }
  if (elements.siretSubmit) {
    elements.siretSubmit.disabled = isLoading;
  }
  if (elements.siretFeedback) {
    if (message !== null) {
      elements.siretFeedback.textContent = message;
    } else if (status === 'idle') {
      elements.siretFeedback.textContent = '';
    }
  }
}

function updateIdentificationFromState() {
  if (!elements.siretInput) {
    return;
  }
  if (state.identifiedClient?.siret) {
    elements.siretInput.value = state.identifiedClient.siret;
  }
  if (!state.identifiedClient) {
    setIdentificationState('idle');
    closeClientFormPlaceholder();
    renderClientIdentity();
    return;
  }
  const message = buildIdentificationMessage(state.identifiedClient);
  setIdentificationState(state.identifiedClient.identified ? 'success' : 'error', message);
  if (state.identifiedClient.identified) {
    closeClientFormPlaceholder();
  } else if (state.identifiedClient.siret) {
    openClientFormPlaceholder(state.identifiedClient.siret, { scroll: false });
  }
  renderClientIdentity();
}

function handleClientIdentityReset() {
  state.isIdentifyingClient = false;
  state.identifiedClient = null;
  if (elements.siretForm) {
    elements.siretForm.reset();
  }
  setIdentificationState('idle');
  updateDiscountRate(0);
  closeWebhookPanel();
  closeClientFormPlaceholder();
  renderClientIdentity();
  if (elements.siretInput) {
    elements.siretInput.focus();
  }
}

function toggleWebhookMode() {
  state.webhookMode = state.webhookMode === 'production' ? 'test' : 'production';
  state.identifiedClient = null;
  updateDiscountRate(0);
  updateWebhookModeIndicator();
  setIdentificationState('idle', `Mode ${state.webhookMode === 'production' ? 'production' : 'test'} activé.`);
  closeWebhookPanel();
  closeClientFormPlaceholder();
}

function updateWebhookModeIndicator() {
  if (!elements.webhookModeBadge) {
    return;
  }
  const mode = state.webhookMode === 'test' ? 'test' : 'production';
  elements.webhookModeBadge.textContent = mode === 'test' ? 'Test' : 'Production';
  elements.webhookModeBadge.dataset.mode = mode;
  elements.webhookModeBadge.setAttribute(
    'aria-label',
    mode === 'test' ? 'Mode webhook test actif' : 'Mode webhook production actif',
  );
}

function getActiveWebhookUrl() {
  return WEBHOOK_ENDPOINTS[state.webhookMode] || WEBHOOK_ENDPOINTS.production;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(new Error('Lecture de fichier impossible'));
    };
    reader.readAsText(file, 'utf-8');
  });
}

function formatConditionKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function parsePercentageValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/%/g, '').trim();
    if (!cleaned) {
      return null;
    }
    const sanitised = cleaned.replace(/^https?:\/\/twitter\.com\//i, '');
    const match = sanitised.match(/-?\d+(?:[.,]\d+)?/);
    if (!match) {
      return null;
    }
    const numericPortion = match[0].replace(',', '.');
    const parsed = parseFloat(numericPortion);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampPercentage(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.min(100, Math.max(0, numeric));
}

async function generatePdf() {
  if (!state.quote.size) {
    toggleFeedback('Ajoutez au moins un article avant de générer le devis.', 'warning');
    return;
  }
  toggleFeedback('', 'hide');
  const items = Array.from(state.quote.values());
  const productsSubtotal = items.reduce((sum, item) => sum + getProductSubtotal(item), 0);
  const ecotaxTotal = items.reduce((sum, item) => sum + getEcotaxTotal(item), 0);
  const discountAmount = productsSubtotal * (state.discountRate / 100);
  const baseAfterDiscount = productsSubtotal - discountAmount;
  const net = baseAfterDiscount + ecotaxTotal;
  const vat = net * state.vatRate;
  const total = net + vat;

  const issueDate = new Date();
  const issueDateLabel = issueDate.toLocaleDateString('fr-FR');
  const validityDate = new Date(issueDate);
  validityDate.setDate(validityDate.getDate() + 30);
  const validityLabel = validityDate.toLocaleDateString('fr-FR');
  const quoteNumber = `DEV-${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, '0')}${String(issueDate.getDate()).padStart(2, '0')}-${String(issueDate.getHours()).padStart(2, '0')}${String(issueDate.getMinutes()).padStart(2, '0')}`;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  if (typeof doc.setCompression === 'function') {
    doc.setCompression(true);
  }
  const margin = 42;
  const pageWidth = doc.internal.pageSize.getWidth();

  const colors = {
    primary: [228, 30, 40],
    secondary: [25, 63, 96],
    text: [33, 37, 41],
    muted: [100, 116, 139],
    soft: [248, 249, 252],
    border: [224, 228, 236],
  };

  const logoDataUrl = await getBrandLogoDataUrl();

  const headerTop = margin;
  const headerHeight = 128;
  const headerWidth = pageWidth - margin * 2;
  doc.setFillColor(...colors.soft);
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, headerTop, headerWidth, headerHeight, 10, 10, 'FD');

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', margin + 18, headerTop + 22, 84, 48, undefined, 'FAST');
  }

  const titleX = margin + 122;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...colors.secondary);
  doc.text('Devis / Price offer', titleX, headerTop + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...colors.muted);
  doc.text(`N° de devis : ${quoteNumber}`, titleX, headerTop + 54);
  doc.text(`Date : ${issueDateLabel}`, titleX, headerTop + 68);
  doc.text(`Validité de l'offre : ${validityLabel}`, titleX, headerTop + 82);
  doc.text('Réf / Ref : À renseigner', titleX, headerTop + 96);
  doc.text('Représentant : Service commercial ID GROUP', titleX, headerTop + 110);

  const companyX = margin + headerWidth - 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...colors.secondary);
  doc.text(COMPANY_IDENTITY.name, companyX, headerTop + 34, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.text(COMPANY_IDENTITY.legal, companyX, headerTop + 50, {
    align: 'right',
    lineHeightFactor: 1.35,
  });

  const infoTop = headerTop + headerHeight + 22;
  const infoHeight = 140;
  const infoWidth = headerWidth;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, infoTop, infoWidth, infoHeight, 8, 8, 'S');

  const identifiedClient = state.identifiedClient && state.identifiedClient.identified
    ? state.identifiedClient
    : null;

  const clientLines = identifiedClient
    ? [
        identifiedClient.companyName || 'Client identifié',
        identifiedClient.siret ? `SIRET : ${identifiedClient.siret}` : '',
        ...(identifiedClient.addressLines || []),
        identifiedClient.contactName ? `Contact : ${identifiedClient.contactName}` : '',
        identifiedClient.contactEmail ? `Email : ${identifiedClient.contactEmail}` : '',
      ].filter(Boolean)
    : ['Nom du client', 'Adresse', 'Code postal - Ville', 'Email', 'Téléphone'];

  const shippingLines =
    identifiedClient && Array.isArray(identifiedClient.addressLines) && identifiedClient.addressLines.length
      ? [...identifiedClient.addressLines]
      : ['Adresse de livraison', 'Code postal - Ville', 'Référent sur place', 'Téléphone'];

  const conditionsLines = [
    `Validité de l'offre : ${validityLabel}`,
    'Conditions de paiement : À définir',
    'Représentant : Service commercial ID GROUP',
    `Remise appliquée : ${numberFormatter.format(state.discountRate)} %`,
  ];

  if (identifiedClient?.discountRate !== undefined) {
    const label = `Remise client contractuelle : ${numberFormatter.format(identifiedClient.discountRate)} %`;
    if (!conditionsLines.includes(label)) {
      conditionsLines.push(label);
    }
  }

  if (identifiedClient?.conditionsLines?.length) {
    identifiedClient.conditionsLines.forEach((line) => {
      const trimmed = typeof line === 'string' ? line.trim() : '';
      if (trimmed && !conditionsLines.includes(trimmed)) {
        conditionsLines.push(trimmed);
      }
    });
  }

  const infoColumns = [
    {
      title: 'Client',
      lines: clientLines,
    },
    {
      title: 'Livraison',
      lines: shippingLines,
    },
    {
      title: 'Conditions du devis',
      lines: conditionsLines,
    },
  ];

  const infoGap = 20;
  const columnWidth = (infoWidth - 48 - infoGap * (infoColumns.length - 1)) / infoColumns.length;
  let columnX = margin + 24;
  infoColumns.forEach((column) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colors.secondary);
    doc.text(column.title, columnX, infoTop + 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text(column.lines, columnX, infoTop + 46, { lineHeightFactor: 1.5 });
    columnX += columnWidth + infoGap;
  });

  const introY = infoTop + infoHeight + 20;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(...colors.muted);
  doc.text(
    'Cher client, nous vous remercions pour votre demande. Vous trouverez ci-dessous notre meilleure proposition commerciale.',
    margin,
    introY,
    { maxWidth: pageWidth - margin * 2, lineHeightFactor: 1.45 },
  );

  const bodyStartY = introY + 28;
  const body = items.map((item) => {
    const designationLines = [item.name];
    if (item.comment) {
      designationLines.push(`Commentaire : ${item.comment}`);
    }
    if (item.link) {
      designationLines.push(`Lien : ${item.link}`);
    }
    const quantityValue = getItemQuantity(item);
    if (item.quantityMode === 'area') {
      const lengthValue = dimensionFormatter.format(item.length || 0);
      const widthValue = dimensionFormatter.format(item.width || 0);
      const areaValue = quantityFormatter.format(item.quantity || 0);
      designationLines.push(`Découpe : ${lengthValue} m × ${widthValue} m (${areaValue} m²)`);
    } else {
      designationLines.push(
        `Quantité saisie : ${quantityFormatter.format(quantityValue)} ${item.unit || 'pièce'}`,
      );
    }
    const unitEcotax = getUnitEcotax(item);
    designationLines.push(`Ecopart unitaire : ${currencyFormatter.format(unitEcotax)}`);
    const weightValue = formatWeightValue(item.weight);
    if (weightValue) {
      designationLines.push(`Poids : ${weightValue}`);
    }
    const scoreValue = getScoreBadgeValue(item.score);
    designationLines.push(
      scoreValue === 'NR' ? "Score Positiv'ID : N.C." : `Score Positiv'ID : ${scoreValue}`,
    );

    const unitPriceValue = Number(item.price) || 0;
    const discountedUnit = calculateDiscountedValue(unitPriceValue);
    const discountedSubtotal = discountedUnit * quantityValue;
    const ecotaxSubtotal = unitEcotax * quantityValue;

    return [
      item.reference,
      designationLines.join('\n'),
      quantityFormatter.format(quantityValue),
      currencyFormatter.format(unitPriceValue),
      currencyFormatter.format(discountedUnit),
      currencyFormatter.format(discountedSubtotal),
      currencyFormatter.format(ecotaxSubtotal),
    ];
  });

  doc.autoTable({
    startY: bodyStartY,
    head: [['Référence', 'Désignation / Détails', 'Qté', 'PU HT', 'PU Net', 'Montant HT', 'Ecopart']],
    body,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
      textColor: colors.text,
      lineColor: colors.border,
      lineWidth: 0.4,
    },
    headStyles: { fillColor: colors.primary, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 185 },
      2: { halign: 'right', cellWidth: 38 },
      3: { halign: 'right', cellWidth: 52 },
      4: { halign: 'right', cellWidth: 52 },
      5: { halign: 'right', cellWidth: 64 },
      6: { halign: 'right', cellWidth: 52 },
    },
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - margin * 2,
  });

  let cursorY = doc.lastAutoTable.finalY + 24;
  const getPageHeight = () => doc.internal.pageSize.getHeight();
  const ensureSpace = (height) => {
    if (cursorY + height > getPageHeight() - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  const summaryEntries = [
    ['Total HT produits', currencyFormatter.format(productsSubtotal)],
    [`Remise (${numberFormatter.format(state.discountRate)} %)`, `-${currencyFormatter.format(discountAmount)}`],
    ['Base HT après remise', currencyFormatter.format(baseAfterDiscount)],
    ['Ecopart totale', currencyFormatter.format(ecotaxTotal)],
    ['Base HT + Ecopart', currencyFormatter.format(net)],
    [`TVA (${numberFormatter.format(state.vatRate * 100)} %)`, currencyFormatter.format(vat)],
    ['Total TTC', currencyFormatter.format(total)],
  ];
  const summaryLineHeight = 18;
  const summaryHeight = 48 + summaryEntries.length * summaryLineHeight + 16;
  ensureSpace(summaryHeight);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, summaryHeight, 8, 8, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...colors.secondary);
  doc.text('Synthèse financière', margin + 18, cursorY + 26);

  let summaryY = cursorY + 50;
  summaryEntries.forEach((entry, index) => {
    const [label, amount] = entry;
    const isTotal = index === summaryEntries.length - 1;
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 11 : 10);
    doc.setTextColor(...(isTotal ? colors.primary : colors.text));
    doc.text(label, margin + 18, summaryY);
    doc.text(amount, pageWidth - margin - 18, summaryY, { align: 'right' });
    if (!isTotal) {
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.35);
      doc.line(margin + 18, summaryY + 4, pageWidth - margin - 18, summaryY + 4);
    }
    summaryY += summaryLineHeight;
  });
  cursorY += summaryHeight + 24;

  if (state.generalComment && state.generalComment.trim().length > 0) {
    const cleanedComment = state.generalComment.trim();
    const commentLines = doc.splitTextToSize(cleanedComment, pageWidth - margin * 2 - 36);
    const commentHeight = 48 + commentLines.length * 14;
    ensureSpace(commentHeight);
    doc.setDrawColor(...colors.border);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, cursorY, pageWidth - margin * 2, commentHeight, 8, 8, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colors.secondary);
    doc.text('Commentaire général', margin + 18, cursorY + 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    doc.text(commentLines, margin + 18, cursorY + 46, { lineHeightFactor: 1.45 });
    cursorY += commentHeight + 24;
  }

  const conditionsHeight = 44 + TERMS_AND_CONDITIONS.length * 16;
  ensureSpace(conditionsHeight);
  doc.setDrawColor(...colors.border);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, conditionsHeight, 8, 8, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...colors.secondary);
  doc.text('Conditions générales', margin + 18, cursorY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.text(TERMS_AND_CONDITIONS, margin + 18, cursorY + 44, {
    lineHeightFactor: 1.5,
    maxWidth: pageWidth - margin * 2 - 36,
  });
  cursorY += conditionsHeight + 24;

  if (COMPANY_IDENTITY.contacts?.length) {
    const contactEntries = COMPANY_IDENTITY.contacts;
    const maxLines = contactEntries.reduce(
      (max, entry) => Math.max(max, entry.lines.length),
      0,
    );
    const contactHeight = 46 + (maxLines + 1) * 14 + 18;
    ensureSpace(contactHeight);
    doc.setDrawColor(...colors.border);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, cursorY, pageWidth - margin * 2, contactHeight, 8, 8, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colors.secondary);
    doc.text('Coordonnées ID GROUP', margin + 18, cursorY + 26);

    const contactGap = 28;
    const contactAvailableWidth = pageWidth - margin * 2 - 36 - contactGap * (contactEntries.length - 1);
    const contactColumnWidth = contactAvailableWidth / contactEntries.length;
    let contactX = margin + 18;
    contactEntries.forEach((entry) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...colors.text);
      doc.text(entry.title, contactX, cursorY + 46);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...colors.muted);
      doc.text(entry.lines, contactX, cursorY + 62, { lineHeightFactor: 1.45 });
      contactX += contactColumnWidth + contactGap;
    });
    cursorY += contactHeight + 24;
  }

  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      doc.setPage(pageNumber);
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.text(
        'ID GROUP - SASU au capital de 1 000 000 € - RCS Chambéry 403 401 854',
        margin,
        pageHeight - 36,
      );
      doc.text(
        'TVA intracommunautaire : FR12403401854 - N° EORI : FR403401854 - N.A.F. : 4669B',
        margin,
        pageHeight - 22,
      );
      doc.text(`Document généré le ${issueDateLabel}`, pageWidth - margin, pageHeight - 36, {
        align: 'right',
      });
      doc.text(`Page ${pageNumber}/${pageCount}`, pageWidth - margin, pageHeight - 22, {
        align: 'right',
      });
    }
  };

  addFooter();
  doc.save(`devis-${quoteNumber}.pdf`);
}

async function getBrandLogoDataUrl() {
  if (typeof state.brandLogoDataUrl === 'string') {
    return state.brandLogoDataUrl || null;
  }
  try {
    const response = await fetch(brandLogoAssetPath);
    if (!response.ok) {
      throw new Error(`Statut ${response.status}`);
    }
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    state.brandLogoDataUrl = dataUrl;
    return dataUrl;
  } catch (error) {
    console.warn('Impossible de charger le logo de la marque pour le PDF.', error);
    state.brandLogoDataUrl = '';
    return null;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(new Error('Erreur lors de la conversion du logo en base64.'));
    };
    reader.readAsDataURL(blob);
  });
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

function formatSiret(value) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 14);
  if (digits.length !== 14) {
    return digits;
  }
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
}

function showWebhookPanel(result) {
  if (!elements.webhookPanel || !elements.webhookPanelContent) {
    return;
  }
  if (state.webhookPanelTimeout) {
    clearTimeout(state.webhookPanelTimeout);
    state.webhookPanelTimeout = null;
  }
  elements.webhookPanelContent.innerHTML = '';

  const addRow = (label, value) => {
    if (!value) {
      return;
    }
    const row = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = `${label} : `;
    row.appendChild(strong);
    row.appendChild(document.createTextNode(value));
    elements.webhookPanelContent.appendChild(row);
  };

  const statusLabel = result?.statusLabel || (result?.identified ? 'Client identifié' : 'Client non identifié');
  addRow('Statut', statusLabel);
  addRow('Entreprise', result?.companyName || 'Non communiqué');
  addRow('SIRET', formatSiret(result?.siret));
  addRow('Contact', result?.contactName);
  addRow('Email', result?.contactEmail);
  addRow('Remise appliquée', `${quantityFormatter.format(state.discountRate)} %`);

  if (Array.isArray(result?.addressLines) && result.addressLines.length) {
    const addressTitle = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'Adresse :';
    addressTitle.appendChild(strong);
    elements.webhookPanelContent.appendChild(addressTitle);
    const list = document.createElement('ul');
    list.className = 'webhook-panel__list';
    result.addressLines.slice(0, 5).forEach((line) => {
      const text = typeof line === 'string' ? line : String(line ?? '');
      if (!text) {
        return;
      }
      const item = document.createElement('li');
      item.textContent = text;
      list.appendChild(item);
    });
    elements.webhookPanelContent.appendChild(list);
  }

  if (Array.isArray(result?.conditionsLines) && result.conditionsLines.length) {
    const conditionsTitle = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'Conditions :';
    conditionsTitle.appendChild(strong);
    elements.webhookPanelContent.appendChild(conditionsTitle);
    const list = document.createElement('ul');
    list.className = 'webhook-panel__list';
    result.conditionsLines.slice(0, 5).forEach((line) => {
      const text = typeof line === 'string' ? line : String(line ?? '');
      if (!text) {
        return;
      }
      const item = document.createElement('li');
      item.textContent = text;
      list.appendChild(item);
    });
    elements.webhookPanelContent.appendChild(list);
  }

  if (!result?.identified) {
    const warning = document.createElement('p');
    warning.textContent =
      "Client non reconnu. Merci de préparer les informations complémentaires via le formulaire dès sa disponibilité.";
    elements.webhookPanelContent.appendChild(warning);
  }

  elements.webhookPanel.dataset.open = 'true';
  state.webhookPanelTimeout = window.setTimeout(() => {
    closeWebhookPanel();
  }, WEBHOOK_PANEL_TIMEOUT);
}

function closeWebhookPanel() {
  if (!elements.webhookPanel) {
    return;
  }
  elements.webhookPanel.dataset.open = 'false';
  if (state.webhookPanelTimeout) {
    clearTimeout(state.webhookPanelTimeout);
    state.webhookPanelTimeout = null;
  }
}

function openClientFormPlaceholder(siret, options = {}) {
  const container = elements.clientFormPlaceholder;
  if (!container) {
    return;
  }
  const paragraph = container.querySelector('p');
  if (paragraph) {
    const formatted = formatSiret(siret);
    const link = `<a href="${NEW_CLIENT_URL}" target="_blank" rel="noopener">vous enregistrer comme nouveau client</a>`;
    paragraph.innerHTML = formatted
      ? `Le client n'a pas été reconnu pour le SIRET ${formatted}. Vous pouvez ${link} pour accéder à nos services.`
      : `Le client n'a pas été reconnu. Vous pouvez ${link} pour accéder à nos services.`;
  }
  container.dataset.open = 'true';
  if (options.scroll !== false) {
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function closeClientFormPlaceholder() {
  if (!elements.clientFormPlaceholder) {
    return;
  }
  elements.clientFormPlaceholder.dataset.open = 'false';
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
  elements.modalDescription.textContent = product.description || 'Pas de description fournie.';

  if (elements.modalUnit) {
    elements.modalUnit.textContent = product.unit ? product.unit : "À l'unité";
  }
  if (elements.modalEcotax) {
    const unitEcotax = getUnitEcotax(product);
    const ecotaxLabel =
      product.quantityMode === 'area'
        ? `${currencyFormatter.format(unitEcotax)} / m²`
        : `${currencyFormatter.format(unitEcotax)} / ${(product.unit || 'pièce').toLowerCase()}`;
    elements.modalEcotax.textContent = `Ecopart : ${ecotaxLabel}`;
  }
  if (elements.modalWeight && elements.modalWeightRow) {
    const weightValue = formatWeightValue(product.weight);
    if (weightValue) {
      elements.modalWeight.textContent = weightValue;
      elements.modalWeightRow.style.display = 'grid';
    } else {
      elements.modalWeight.textContent = 'Non renseigné';
      elements.modalWeightRow.style.display = 'none';
    }
  }
  if (elements.modalScore) {
    const scoreValue = getScoreBadgeValue(product.score);
    elements.modalScore.dataset.score = scoreValue;
    elements.modalScore.textContent = scoreValue === 'NR' ? 'N.C.' : scoreValue;
    elements.modalScore.title =
      scoreValue === 'NR' ? "Score Positiv'ID non communiqué" : `Score Positiv'ID : ${scoreValue}`;
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

function populateCatalogueTree() {
  const select = elements.catalogueTree;
  if (!select) return;
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  if (!state.catalogue.length) {
    placeholder.textContent = 'Catalogue indisponible';
    placeholder.disabled = true;
    select.appendChild(placeholder);
    select.disabled = true;
    return;
  }
  placeholder.textContent = 'Sélectionner une catégorie ou un article';
  select.appendChild(placeholder);
  select.disabled = false;

  const tree = buildCatalogueTree(state.catalogue);
  const indent = '\u00A0\u00A0\u2022 ';
  tree.forEach((entry) => {
    const categoryOption = document.createElement('option');
    categoryOption.value = `category|${entry.key}`;
    categoryOption.textContent = `📁 ${entry.label}`;
    select.appendChild(categoryOption);

    entry.products
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
      .forEach((product) => {
        const option = document.createElement('option');
        option.value = `product|${product.id}`;
        option.textContent = `${indent}${product.reference} — ${product.name}`;
        option.dataset.category = product.category || CATALOGUE_MISC_CATEGORY;
        select.appendChild(option);
      });
  });
}

function buildCatalogueTree(items) {
  const map = new Map();
  items.forEach((product) => {
    const key = product.category || CATALOGUE_MISC_CATEGORY;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: product.category || 'Hors catégorie',
        products: [],
      });
    }
    map.get(key).products.push(product);
  });
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
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
  setCategorySelection([]);
  applyFilters();
}

function setCategorySelection(categories) {
  state.selectedCategories.clear();
  categories.forEach((category) => {
    if (category) {
      state.selectedCategories.add(category);
    }
  });
  refreshCategoryCheckboxStates();
  updateCategoryFilterLabel();
}

function refreshCategoryCheckboxStates() {
  if (!elements.categoryFilterOptions) return;
  const checkboxes = elements.categoryFilterOptions.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    const isChecked = state.selectedCategories.has(checkbox.value);
    checkbox.checked = isChecked;
    if (checkbox.parentElement) {
      checkbox.parentElement.classList.toggle('is-active', isChecked);
    }
  });
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

function handleCatalogueTreeChange(event) {
  const { value } = event.target;
  if (!value) return;
  const [type, key] = value.split('|');

  state.searchQuery = '';
  if (elements.search) {
    elements.search.value = '';
  }
  state.selectedUnit = UNIT_FILTER_ALL;
  if (elements.unitFilter) {
    elements.unitFilter.value = UNIT_FILTER_ALL;
  }

  if (type === 'category') {
    if (key === CATALOGUE_MISC_CATEGORY) {
      setCategorySelection([]);
    } else {
      setCategorySelection([key]);
    }
    applyFilters();
  } else if (type === 'product') {
    const product = state.catalogueById.get(key);
    if (product) {
      if (product.category) {
        setCategorySelection([product.category]);
      } else {
        setCategorySelection([]);
      }
      applyFilters();
      requestAnimationFrame(() => {
        const card = elements.productGrid?.querySelector(`[data-product-id="${product.id}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('is-highlighted');
          window.setTimeout(() => card.classList.remove('is-highlighted'), 2200);
        }
      });
    }
  }

  event.target.value = '';
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
