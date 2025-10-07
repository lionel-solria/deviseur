const catalogueUrl = './catalogue/export.csv';
const defaultImage = 'https://via.placeholder.com/640x480.png?text=Image+indisponible';

const companyIdentity = {
  name: 'ID GROUP - MK Distribution',
  brandCode: 'MKC/PR1/ER3 - Indice B',
  address: ['ALPESPACE - FRANCIN', '47 voie Saint-Exupéry', '73800 Porte-de-Savoie', 'France'],
  shippingPlaceholder: [
    'Indiquez le lieu de livraison',
    'Adresse complète',
    'Code postal - Ville',
    'Pays',
  ],
  contact: [
    'Téléphone : 00.33.4.79.84.36.06  •  Télécopie : 00.33.4.79.84.36.10',
    'Email : ids@ids-france.net',
    'Téléphone : 00.33.4.79.84.14.18  •  Télécopie : 00.33.4.79.84.14.19',
    'Email : idmat@id-mat.com',
  ],
  legal: {
    siret: '403 401 854 00035',
    vat: 'FR 12 403 401 854',
    naf: '4669B',
    capital: '1 000 000 €',
    rcs: 'RCS Chambéry 403 401 854',
    eori: 'FR403401854',
  },
  offerValidityDays: 60,
  paymentTerms: 'Conditions de paiement : acompte à la commande, solde à la livraison',
  deliveryLead: 'Délais de livraison estimés : 4 à 6 semaines après confirmation',
};

const assets = {
  logoPromise: null,
};

const highlightTimers = new Map();

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const numberFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantityFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dimensionFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const UNIT_FILTER_ALL = '__all__';
const UNIT_FILTER_NONE = '__none__';

const state = {
  catalogue: [],
  filtered: [],
  catalogueById: new Map(),
  quote: new Map(),
  categories: [],
  units: [],
  catalogueTree: [],
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
};

document.addEventListener('DOMContentLoaded', () => {
  loadCatalogue();
  elements.search?.addEventListener('input', handleSearch);
  elements.headerDiscount?.addEventListener('input', handleDiscountChange);
  elements.unitFilter?.addEventListener('change', handleUnitFilterChange);
  elements.generalComment?.addEventListener('input', handleGeneralCommentChange);
  elements.generatePdf?.addEventListener('click', generatePdf);
  elements.catalogueTree?.addEventListener('change', handleCatalogueTreeChange);
  setupModal();
  setupResponsiveSplit();
  setupCategoryFilter();
  preloadAssets();
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
    state.catalogueTree = buildCatalogueHierarchy(state.catalogue);
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
    empty.className = 'col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500';
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

function updateSummary() {
  const items = Array.from(state.quote.values());
  const productsSubtotal = items.reduce((total, item) => total + getProductSubtotal(item), 0);
  const ecotaxTotal = items.reduce((total, item) => total + getEcotaxTotal(item), 0);
  const discountAmount = productsSubtotal * (state.discountRate / 100);
  const net = productsSubtotal - discountAmount + ecotaxTotal;
  const vat = net * state.vatRate;
  const total = net + vat;
  const baseHtAfterDiscount = productsSubtotal - discountAmount;
  const discountRowValue = discountAmount > 0 ? `-${currencyFormatter.format(discountAmount)}` : currencyFormatter.format(0);
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

function preloadAssets() {
  getCompanyLogo().catch(() => null);
}

async function getCompanyLogo() {
  if (!assets.logoPromise) {
    const logoUrl = 'media/ID GROUP.png';
    assets.logoPromise = fetch(logoUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Impossible de charger le logo (${response.status})`);
        }
        return response.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Lecture du logo impossible'));
            reader.readAsDataURL(blob);
          }),
      )
      .catch((error) => {
        console.error(error);
        return null;
      });
  }
  return assets.logoPromise;
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
  const net = productsSubtotal - discountAmount + ecotaxTotal;
  const vat = net * state.vatRate;
  const total = net + vat;

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
  const secondaryColor = [25, 63, 96];
  const accentColor = [228, 30, 40];
  const baseTextColor = [41, 50, 60];
  const mutedTextColor = [102, 112, 133];

  doc.setFillColor(...accentColor);
  doc.rect(0, 0, pageWidth, 12, 'F');

  const logoDataUrl = await getCompanyLogo();
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - 110, 26, 110, 36, undefined, 'FAST');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...secondaryColor);
  doc.text('DEVIS COMMERCIAL', margin, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...mutedTextColor);
  if (companyIdentity.brandCode) {
    doc.text(companyIdentity.brandCode, margin, 60);
  }
  doc.text(`Émis le ${issueDateLabel}`, margin, 74);
  doc.text(`Référence : ${quoteNumber}`, margin, 88);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...secondaryColor);
  doc.text('Émetteur', pageWidth - margin, 44, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...baseTextColor);
  doc.text(companyIdentity.name, pageWidth - margin, 60, { align: 'right' });
  doc.setFontSize(10);
  doc.text(companyIdentity.address.join('\n'), pageWidth - margin, 76, { align: 'right' });

  const infoStartY = 112;
  const infoWidth = pageWidth - margin * 2;
  doc.setFillColor(246, 247, 250);
  doc.roundedRect(margin, infoStartY, infoWidth, 132, 10, 10, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, infoStartY, infoWidth, 132, 10, 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...secondaryColor);
  doc.text('Lieu de livraison / Shipping address', margin + 18, infoStartY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...baseTextColor);
  doc.text(companyIdentity.shippingPlaceholder, margin + 18, infoStartY + 42);

  const infoColumnX = pageWidth / 2 + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...secondaryColor);
  doc.text('Informations devis / Quote details', infoColumnX, infoStartY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...baseTextColor);
  const infoLines = [
    `Validité de l'offre : ${validityLabel}`,
    `Remise commerciale : ${numberFormatter.format(state.discountRate)} %`,
    `TVA : ${numberFormatter.format(state.vatRate * 100)} %`,
    companyIdentity.paymentTerms,
    companyIdentity.deliveryLead,
  ];
  doc.text(infoLines, infoColumnX, infoStartY + 42, { maxWidth: pageWidth - infoColumnX - margin });

  const introStartY = infoStartY + 158;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...secondaryColor);
  doc.text('Message commercial', margin, introStartY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...baseTextColor);
  const frenchIntro =
    'Cher Client, Nous avons bien reçu votre demande de devis et nous vous en remercions. Vous trouverez ci-dessous nos meilleures conditions.';
  const englishIntro =
    'Dear Customer, We well received your request and we thank you for that. Please find below our best price offer.';
  const frenchLines = doc.splitTextToSize(frenchIntro, pageWidth - margin * 2);
  doc.text(frenchLines, margin, introStartY + 16);
  const frenchHeight = doc.getTextDimensions(frenchLines).h;
  const englishLines = doc.splitTextToSize(englishIntro, pageWidth - margin * 2);
  const englishStartY = introStartY + 16 + frenchHeight + 6;
  doc.text(englishLines, margin, englishStartY);
  const englishHeight = doc.getTextDimensions(englishLines).h;

  let tableStartY = englishStartY + englishHeight + 20;

  const columns = [
    { header: 'Nos réf.', dataKey: 'reference' },
    { header: 'Désignation', dataKey: 'designation' },
    { header: 'Qté', dataKey: 'quantity' },
    { header: 'Unité', dataKey: 'unit' },
    { header: 'PU HT', dataKey: 'unitPrice' },
    { header: '% Remise', dataKey: 'discount' },
    { header: 'Montant HT', dataKey: 'lineTotal' },
    { header: 'Éco-part', dataKey: 'ecotax' },
  ];

  const body = items.map((item) => {
    const quantityValue = getItemQuantity(item);
    const unitLabel = item.quantityMode === 'area' ? 'm²' : item.unit || 'Pièce';
    const dimensionLines = [];
    if (item.quantityMode === 'area') {
      dimensionLines.push(
        `Dimensions : ${dimensionFormatter.format(item.length || 0)} m x ${dimensionFormatter.format(item.width || 0)} m`,
      );
      dimensionLines.push(`Surface calculée : ${quantityFormatter.format(quantityValue)} m²`);
    }

    const unitEcotax = getUnitEcotax(item);
    const weightValue = formatWeightValue(item.weight);
    const scoreValue = getScoreBadgeValue(item.score);

    const detailLines = [item.name, ...dimensionLines];
    if (item.comment) {
      detailLines.push(`Commentaire : ${item.comment}`);
    }
    if (item.link) {
      detailLines.push(`Lien : ${item.link}`);
    }
    detailLines.push(`Écopart unitaire : ${currencyFormatter.format(unitEcotax)}`);
    if (weightValue) {
      detailLines.push(`Poids unitaire : ${weightValue}`);
    }
    detailLines.push(scoreValue === 'NR' ? "Score Positiv'ID : N.C." : `Score Positiv'ID : ${scoreValue}`);

    const unitPriceValue = Number(item.price) || 0;
    const discountedUnit = calculateDiscountedValue(unitPriceValue);
    const discountedSubtotal = discountedUnit * quantityValue;

    return {
      reference: item.reference,
      designation: detailLines.join('\n'),
      quantity: quantityFormatter.format(quantityValue),
      unit: unitLabel,
      unitPrice: currencyFormatter.format(discountedUnit),
      discount: state.discountRate > 0 ? `${numberFormatter.format(state.discountRate)} %` : '—',
      lineTotal: currencyFormatter.format(discountedSubtotal),
      ecotax: currencyFormatter.format(unitEcotax),
    };
  });

  doc.autoTable({
    startY: tableStartY,
    columns,
    body,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      textColor: baseTextColor,
      lineColor: [234, 237, 242],
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: accentColor,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: {
      reference: { cellWidth: 70 },
      designation: { cellWidth: 170 },
      quantity: { halign: 'right', cellWidth: 48 },
      unit: { cellWidth: 48 },
      unitPrice: { halign: 'right', cellWidth: 70 },
      discount: { halign: 'right', cellWidth: 68 },
      lineTotal: { halign: 'right', cellWidth: 78 },
      ecotax: { halign: 'right', cellWidth: 64 },
    },
    margin: { left: margin, right: margin },
  });

  let contentY = doc.lastAutoTable.finalY + 24;

  if (state.generalComment && state.generalComment.trim().length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...secondaryColor);
    doc.text('Commentaire général', margin, contentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...baseTextColor);
    const commentLines = doc.splitTextToSize(state.generalComment.trim(), pageWidth - margin * 2);
    doc.text(commentLines, margin, contentY + 16);
    contentY += doc.getTextDimensions(commentLines).h + 26;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...secondaryColor);
  doc.text('Synthèse financière', margin, contentY);
  doc.autoTable({
    startY: contentY + 10,
    body: [
      ['Total HT (hors éco-part)', currencyFormatter.format(baseHtAfterDiscount)],
      [
        `Remise commerciale (${numberFormatter.format(state.discountRate)} %)`,
        discountRowValue,
      ],
      ['Éco-participation HT', currencyFormatter.format(ecotaxTotal)],
      ['Total HT', currencyFormatter.format(net)],
      [
        `TVA (${numberFormatter.format(state.vatRate * 100)} %)`,
        currencyFormatter.format(vat),
      ],
      ['Acompte', currencyFormatter.format(0)],
      ['Escompte', currencyFormatter.format(0)],
      ['Total TTC', currencyFormatter.format(total)],
      ['Net à payer', currencyFormatter.format(total)],
    ],
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      textColor: baseTextColor,
    },
    columnStyles: {
      0: { cellWidth: 220 },
      1: { halign: 'right', cellWidth: 120 },
    },
    margin: { left: margin, right: margin },
    theme: 'plain',
    didParseCell: (data) => {
      if (data.row.index >= data.table.body.length - 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = accentColor;
      }
      if (data.row.index === data.table.body.length - 1) {
        data.cell.styles.fillColor = [253, 234, 227];
      }
    },
  });

  contentY = doc.lastAutoTable.finalY + 22;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...mutedTextColor);
  doc.text(
    'Tolérance dimensionnelles / Dimensional tolerance +/-5%  -  Tolérance de découpe / Cutting tolerance +/-5%',
    margin,
    contentY,
  );
  contentY += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...secondaryColor);
  doc.text('Contacts ID GROUP', margin, contentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...baseTextColor);
  doc.text(companyIdentity.contact, margin, contentY + 16);

  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      doc.setPage(pageNumber);
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setDrawColor(...accentColor);
      doc.setLineWidth(0.6);
      doc.line(margin, pageHeight - 56, pageWidth - margin, pageHeight - 56);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...mutedTextColor);
      doc.text(
        `SIRET : ${companyIdentity.legal.siret}  •  TVA : ${companyIdentity.legal.vat}  •  NAF : ${companyIdentity.legal.naf}`,
        margin,
        pageHeight - 40,
      );
      doc.text(
        `Capital social : ${companyIdentity.legal.capital}  •  ${companyIdentity.legal.rcs}  •  N° EORI : ${companyIdentity.legal.eori}`,
        margin,
        pageHeight - 26,
      );
      doc.text(`Document généré le ${issueDateLabel}`, pageWidth - margin, pageHeight - 40, { align: 'right' });
      doc.text(`Page ${pageNumber}/${pageCount}`, pageWidth - margin, pageHeight - 26, { align: 'right' });
    }
    doc.setTextColor(...baseTextColor);
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
    info: 'rounded-xl px-6 py-4 text-sm shadow-sm bg-blue-50 text-blue-700 border border-blue-100',
    warning: 'rounded-xl px-6 py-4 text-sm shadow-sm bg-amber-50 text-amber-700 border border-amber-100',
    error: 'rounded-xl px-6 py-4 text-sm shadow-sm bg-rose-50 text-rose-700 border border-rose-100',
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

function buildCatalogueHierarchy(items) {
  const groups = new Map();
  items.forEach((product) => {
    const key = product.category || 'Divers';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(product);
  });
  return Array.from(groups.entries())
    .map(([category, products]) => ({
      category,
      label: formatCategoryLabel(category),
      products: products
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
}

function formatCategoryLabel(category) {
  if (!category) return 'Divers';
  const trimmed = category.trim();
  if (!trimmed) return 'Divers';
  if (/^[A-Z0-9]+$/u.test(trimmed)) {
    return trimmed;
  }
  const cleaned = trimmed.replace(/[_-]+/g, ' ');
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
  placeholder.textContent = "Arborescence du catalogue";
  select.appendChild(placeholder);

  if (!state.catalogueTree.length) {
    const option = document.createElement('option');
    option.value = '';
    option.disabled = true;
    option.textContent = 'Catalogue indisponible';
    select.appendChild(option);
    return;
  }

  state.catalogueTree.forEach((group) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    const categoryOption = document.createElement('option');
    categoryOption.value = `category:${group.category}`;
    categoryOption.textContent = `Filtrer par ${group.label}`;
    optgroup.appendChild(categoryOption);
    group.products.forEach((product) => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = `• ${product.name} (${product.reference})`;
      optgroup.appendChild(option);
    });
    select.appendChild(optgroup);
  });
}

function handleUnitFilterChange(event) {
  const value = event.target?.value ?? UNIT_FILTER_ALL;
  state.selectedUnit = value;
  applyFilters();
}

function handleCatalogueTreeChange(event) {
  const select = event?.target;
  if (!(select instanceof HTMLSelectElement)) return;
  const value = select.value;
  if (!value) return;

  if (value.startsWith('category:')) {
    const category = value.slice('category:'.length);
    if (category) {
      state.selectedCategories.clear();
      state.selectedCategories.add(category);
      updateCategoryFilterLabel();
      const checkboxes = elements.categoryFilterOptions?.querySelectorAll('input[type="checkbox"]');
      checkboxes?.forEach((checkbox) => {
        checkbox.checked = checkbox.value === category;
        if (checkbox.parentElement) {
          checkbox.parentElement.classList.toggle('is-active', checkbox.value === category);
        }
      });
      applyFilters();
      requestAnimationFrame(() => {
        const firstMatch = state.filtered.find((item) => item.category === category);
        if (firstMatch) {
          highlightProductCard(firstMatch.id);
        }
      });
    }
  } else {
    ensureProductVisible(value);
  }

  select.value = '';
}

function ensureProductVisible(productId) {
  if (!productId) return;
  const product = state.catalogueById.get(productId);
  if (!product) return;

  let filtersChanged = false;

  if (state.searchQuery) {
    state.searchQuery = '';
    if (elements.search) {
      elements.search.value = '';
    }
    filtersChanged = true;
  }

  if (state.selectedCategories.size) {
    state.selectedCategories.clear();
    const checkboxes = elements.categoryFilterOptions?.querySelectorAll('input[type="checkbox"]');
    checkboxes?.forEach((checkbox) => {
      checkbox.checked = false;
      checkbox.parentElement?.classList.remove('is-active');
    });
    updateCategoryFilterLabel();
    filtersChanged = true;
  }

  if (state.selectedUnit !== UNIT_FILTER_ALL) {
    state.selectedUnit = UNIT_FILTER_ALL;
    if (elements.unitFilter) {
      elements.unitFilter.value = UNIT_FILTER_ALL;
    }
    filtersChanged = true;
  }

  if (filtersChanged || !state.filtered.some((item) => item.id === productId)) {
    applyFilters();
  }

  requestAnimationFrame(() => {
    const card = getProductCardElement(productId);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightProductCard(card);
    }
  });
}

function getProductCardElement(productId) {
  if (!elements.productGrid) return null;
  const selectorId = escapeSelector(productId);
  const node = elements.productGrid.querySelector(`[data-product-id="${selectorId}"]`);
  return node instanceof HTMLElement ? node : null;
}

function highlightProductCard(target) {
  const element = target instanceof HTMLElement ? target : getProductCardElement(target);
  if (!element) return;
  element.classList.add('product-card--highlight');
  const existingTimer = highlightTimers.get(element);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  const timer = setTimeout(() => {
    element.classList.remove('product-card--highlight');
    highlightTimers.delete(element);
  }, 2400);
  highlightTimers.set(element, timer);
}

function escapeSelector(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return String(value).replace(/['"\\]/g, '\\$&');
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
