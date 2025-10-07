const catalogueUrl = './catalogue/export.csv';
const defaultImage = 'https://via.placeholder.com/640x480.png?text=Image+indisponible';

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const numberFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantityFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dimensionFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pdfAssets = {
  logo: null,
};

const pdfBranding = {
  headerReference: 'MKC/PR1/ER3 - Indice B',
  legalLines: [
    'SASU AU CAPITAL DE 1.000.000€',
    'RCS CHAMBERY',
    'N° Siret : 40340185400035',
    'N°EORI: FR403401854',
    'N.A.F. : 4669B',
    'N° intracommunautaire : FR12403401854',
  ],
  customerMessageFr:
    'Cher Client, Nous avons bien reçu votre demande de devis et nous vous en remercions. Vous trouverez ci-dessous nos meilleures conditions. Sincères salutations. Le Service Commercial.',
  customerMessageEn:
    'Dear Customer, We have received your quotation request and thank you for it. Please find below our best price offer. Best regards. The Sales Department.',
  disclaimerFr:
    "Nos conditions générales de ventes en vigueur s'appliquent à ce document et sont à votre disposition sur simple demande. Le fait de passer commande et de régler la facture vaut acceptation des conditions générales de vente en vigueur. Les paiements anticipés ne font pas l'objet d'escompte, sauf convention particulière. En cas de retard de paiement total ou partiel, pour quelque cause que ce soit, il sera fait application d'une pénalité de retard d'un montant équivalent à trois (3) fois le taux d'intérêt légal, sans mise en demeure préalable. Une indemnité forfaitaire de 40 € sera appliquée pour frais de recouvrement, majorée des frais réels engagés si ceux-ci excèdent ce montant. Option pour le paiement de la TVA d'après les débits.",
  disclaimerEn:
    'Our general conditions of sale in force apply to this document and are available upon request. Ordering and paying the invoice implies acceptance of the general conditions of sale in force. Advance payments are not discounted unless otherwise agreed. In the event of total or partial late payment, for any reason whatsoever, a late payment penalty equal to three (3) times the legal interest rate will be applied without prior notice. A flat-rate compensation of €40 will also be applied for collection costs, increased by the actual costs incurred where they exceed this amount. VAT is payable based on debits.',
  contactLeft: [
    'ALPESPACE-FRANCIN',
    '47 VOIE ST EXUPERY',
    '73800 PORTE DE SAVOIE',
    'Téléphone : 00.33.4.79.84.36.06',
    'Télécopie : 00.33.4.79.84.36.10',
    'Email: ids@ids-france.net',
  ],
  contactRight: ['Téléphone : 00.33.4.79.84.14.18', 'Télécopie : 00.33.4.79.84.14.19', 'Email: idmat@id-mat.com'],
};

const TREE_FALLBACK_LABEL = 'Divers';
const TREE_INDENT = '\u00a0\u00a0';
const TREE_SEPARATORS = ['>', '/', '\\', '|', '»'];

const UNIT_FILTER_ALL = '__all__';
const UNIT_FILTER_NONE = '__none__';

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
  catalogueTree: null,
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
  elements.generatePdf?.addEventListener('click', () => {
    void generatePdf();
  });
  elements.catalogueTree?.addEventListener('change', handleCatalogueTreeSelection);
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
    state.catalogueTree = buildCatalogueTree(state.catalogue);
    populateCategoryFilter();
    populateUnitFilter();
    populateCatalogueTreeSelector();
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
  const totalHt = productsSubtotal - discountAmount;
  const baseHt = totalHt + ecotaxTotal;
  const vat = baseHt * state.vatRate;
  const total = baseHt + vat;

  const issueDate = new Date();
  const issueDateLabel = issueDate.toLocaleDateString('fr-FR');
  const validityDate = new Date(issueDate);
  validityDate.setMonth(validityDate.getMonth() + 2);
  const validityLabel = validityDate.toLocaleDateString('fr-FR');
  const quoteNumber = `DEV-${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, '0')}${String(issueDate.getDate()).padStart(2, '0')}-${String(issueDate.getHours()).padStart(2, '0')}${String(issueDate.getMinutes()).padStart(2, '0')}`;
  const discountLabel = `${numberFormatter.format(state.discountRate)} %`;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const headerHeight = 118;
    const tableTopMargin = headerHeight + 24;

    const logoDataUrl = await getLogoDataUrl();

    const headerOptions = {
      pageWidth,
      margin,
      headerHeight,
      logoDataUrl,
      issueDateLabel,
      validityLabel,
      quoteNumber,
      discountLabel,
    };

    drawPdfTopBanner(doc, headerOptions);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(pdfBranding.headerReference, margin, headerHeight + 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let legalY = headerHeight + 42;
    pdfBranding.legalLines.forEach((line) => {
      doc.text(line, margin, legalY);
      legalY += 12;
    });

    const columnGap = 24;
    const columnWidth = (pageWidth - margin * 2 - columnGap) / 2;
    const rightColumnX = margin + columnWidth + columnGap;
    let infoY = headerHeight + 26;
    doc.setFont('helvetica', 'bold');
    doc.text('Informations devis', rightColumnX, infoY);
    infoY += 16;
    doc.setFont('helvetica', 'normal');
    const infoLines = ['Réf / Ref : —', 'Représentant / Sales rep : —', `Remise appliquée : ${discountLabel}`];
    infoLines.forEach((line) => {
      doc.text(line, rightColumnX, infoY);
      infoY += 12;
    });

    const infoBlockBottom = Math.max(legalY, infoY);
    const boxY = infoBlockBottom + 12;
    const boxHeight = 96;
    doc.setDrawColor(228, 30, 40);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, boxY, columnWidth, boxHeight, 6, 6);
    doc.roundedRect(rightColumnX, boxY, columnWidth, boxHeight, 6, 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Client / Customer', margin + 12, boxY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const clientPlaceholder = ['Nom du client', 'Adresse', 'Code postal - Ville', 'Email / Téléphone'];
    doc.text(clientPlaceholder.join('\n'), margin + 12, boxY + 36);

    doc.setFont('helvetica', 'bold');
    doc.text('Lieu de livraison / Shipping address', rightColumnX + 12, boxY + 18);
    doc.setFont('helvetica', 'normal');
    const shippingPlaceholder = ['À préciser', 'Adresse de livraison', 'Code postal - Ville', 'Contact / Téléphone'];
    doc.text(shippingPlaceholder.join('\n'), rightColumnX + 12, boxY + 36);

    let currentY = boxY + boxHeight + 24;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const messageFrLines = doc.splitTextToSize(pdfBranding.customerMessageFr, pageWidth - margin * 2);
    doc.text(messageFrLines, margin, currentY);
    currentY += messageFrLines.length * 12 + 6;
    const messageEnLines = doc.splitTextToSize(pdfBranding.customerMessageEn, pageWidth - margin * 2);
    doc.text(messageEnLines, margin, currentY);
    currentY += messageEnLines.length * 12 + 12;

    const body = items.map((item) => {
      const quantityValue = getItemQuantity(item);
      const unitEcotax = getUnitEcotax(item);
      const discountedUnit = calculateDiscountedValue(Number(item.price) || 0);
      const netSubtotal = discountedUnit * quantityValue;
      const ecotaxSubtotal = unitEcotax * quantityValue;
      const totalLine = netSubtotal + ecotaxSubtotal;

      const designationParts = [item.name];
      if (item.comment) {
        designationParts.push(`Commentaire : ${item.comment}`);
      }
      if (item.link) {
        designationParts.push(`Lien : ${item.link}`);
      }
      const weightValue = formatWeightValue(item.weight);
      if (weightValue) {
        designationParts.push(`Poids unitaire : ${weightValue}`);
      }
      const scoreValue = getScoreBadgeValue(item.score);
      designationParts.push(scoreValue === 'NR' ? "Score Positiv'ID : N.C." : `Score Positiv'ID : ${scoreValue}`);
      designationParts.push(`Ecopart unitaire : ${currencyFormatter.format(unitEcotax)}`);

      let quantityLabel = '';
      if (item.quantityMode === 'area') {
        const length = Number(item.length);
        const width = Number(item.width);
        const hasDimensions = Number.isFinite(length) && Number.isFinite(width) && length > 0 && width > 0;
        quantityLabel = `${quantityFormatter.format(quantityValue)} ${item.unit || 'm²'}`;
        if (hasDimensions) {
          quantityLabel += `\n${dimensionFormatter.format(length)} m × ${dimensionFormatter.format(width)} m`;
        }
      } else {
        const unitLabel = item.unit || 'Pièce';
        quantityLabel = `${quantityFormatter.format(quantityValue)} ${unitLabel}`;
      }

      return [
        item.reference,
        designationParts.join('\n'),
        quantityLabel.trim(),
        currencyFormatter.format(discountedUnit),
        currencyFormatter.format(ecotaxSubtotal),
        currencyFormatter.format(totalLine),
      ];
    });

    doc.autoTable({
      startY: currentY,
      head: [['Réf / Ref', 'Désignation / Description', 'Qté / Unit', 'P.U. net HT', 'Ecopart HT', 'Montant HT']],
      body,
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: { top: 6, right: 4, bottom: 6, left: 4 },
        textColor: [25, 63, 96],
      },
      headStyles: { fillColor: [25, 63, 96], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 72 },
        1: { cellWidth: 200 },
        2: { cellWidth: 68, halign: 'center' },
        3: { cellWidth: 55, halign: 'right' },
        4: { cellWidth: 55, halign: 'right' },
        5: { cellWidth: 65, halign: 'right' },
      },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      margin: { top: tableTopMargin, left: margin, right: margin },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawPdfTopBanner(doc, headerOptions);
        }
      },
    });

    const itemsTableEndY = doc.lastAutoTable ? doc.lastAutoTable.finalY : currentY;

    const summaryRows = [
      ['Total HT :', currencyFormatter.format(totalHt)],
      ['* Eco-particip. HT :', currencyFormatter.format(ecotaxTotal)],
      ['Escompte / € :', currencyFormatter.format(0)],
      [`TVA (${numberFormatter.format(state.vatRate * 100)} %) :`, currencyFormatter.format(vat)],
      ['Base :', currencyFormatter.format(baseHt)],
      ['Total TTC / € :', currencyFormatter.format(total)],
      ['Acompte € :', currencyFormatter.format(0)],
      ['Net à payer € :', currencyFormatter.format(total)],
    ];

    doc.autoTable({
      startY: itemsTableEndY + 24,
      body: summaryRows,
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 10,
        textColor: [25, 63, 96],
        cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 220 },
        1: { halign: 'right', cellWidth: 120 },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.row.index === summaryRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [228, 30, 40];
        }
        if (data.row.index === summaryRows.length - 2) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    let closingY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : itemsTableEndY + 20;

    if (state.generalComment && state.generalComment.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Commentaire général / General comment', margin, closingY);
      closingY += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const generalLines = doc.splitTextToSize(state.generalComment.trim(), pageWidth - margin * 2);
      doc.text(generalLines, margin, closingY);
      closingY += generalLines.length * 12 + 12;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const disclaimerFrLines = doc.splitTextToSize(pdfBranding.disclaimerFr, pageWidth - margin * 2);
    const disclaimerEnLines = doc.splitTextToSize(pdfBranding.disclaimerEn, pageWidth - margin * 2);
    const disclaimersHeight = (disclaimerFrLines.length + disclaimerEnLines.length) * 11 + 24;
    if (closingY + disclaimersHeight > pageHeight - 96) {
      doc.addPage();
      drawPdfTopBanner(doc, headerOptions);
      closingY = headerHeight + 36;
    }
    doc.text(disclaimerFrLines, margin, closingY);
    closingY += disclaimerFrLines.length * 11 + 6;
    doc.text(disclaimerEnLines, margin, closingY);
    closingY += disclaimerEnLines.length * 11 + 18;

    const contactRightX = pageWidth / 2 + 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(pdfBranding.contactLeft[0], margin, closingY);
    doc.text(pdfBranding.contactRight[0], contactRightX, closingY);
    doc.setFont('helvetica', 'normal');
    pdfBranding.contactLeft.slice(1).forEach((line, index) => {
      doc.text(line, margin, closingY + (index + 1) * 12);
    });
    pdfBranding.contactRight.slice(1).forEach((line, index) => {
      doc.text(line, contactRightX, closingY + (index + 1) * 12);
    });

    const addFooter = () => {
      const pageCount = doc.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        doc.setPage(pageNumber);
        const footerY = pageHeight - 42;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('ID GROUP - SASU au capital de 1 000 000 € - SIRET 403 401 854 00035', margin, footerY);
        doc.text('47 voie St Exupéry, 73800 Porte de Savoie - www.id-group.eu', margin, footerY + 14);
        doc.text(`Document généré le ${issueDateLabel}`, pageWidth - margin, footerY, { align: 'right' });
        doc.text(`Page ${pageNumber}/${pageCount}`, pageWidth - margin, footerY + 14, { align: 'right' });
      }
      doc.setTextColor(30, 41, 59);
    };

    addFooter();
    doc.save(`devis-${quoteNumber}.pdf`);
  } catch (error) {
    console.error('Erreur lors de la génération du devis PDF', error);
    toggleFeedback('Impossible de générer le PDF. Veuillez réessayer.', 'error');
  }
}

function drawPdfTopBanner(doc, options) {
  const { pageWidth, margin, headerHeight, logoDataUrl, issueDateLabel, validityLabel, quoteNumber, discountLabel } = options;
  doc.setFillColor(25, 63, 96);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  doc.setFillColor(228, 30, 40);
  doc.rect(0, headerHeight - 10, pageWidth, 10, 'F');

  let textStartX = margin;
  if (logoDataUrl) {
    const logoWidth = 96;
    const logoHeight = 52;
    doc.addImage(logoDataUrl, 'PNG', margin, 26, logoWidth, logoHeight);
    textStartX = margin + logoWidth + 16;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Devis / Price offer', textStartX, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('ID GROUP', textStartX, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Date : ${issueDateLabel}`, pageWidth - margin, 38, { align: 'right' });
  doc.text(`N° de devis : ${quoteNumber}`, pageWidth - margin, 54, { align: 'right' });
  doc.text(`Validité de l'offre : ${validityLabel}`, pageWidth - margin, 70, { align: 'right' });
  doc.text(`Remise appliquée : ${discountLabel}`, pageWidth - margin, 86, { align: 'right' });
  doc.setTextColor(30, 41, 59);
}

async function getLogoDataUrl() {
  if (pdfAssets.logo) {
    return pdfAssets.logo;
  }
  if (pdfAssets.logo === undefined) {
    return null;
  }
  try {
    const response = await fetch('media/ID GROUP.png');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    pdfAssets.logo = dataUrl;
    return dataUrl;
  } catch (error) {
    console.error('Impossible de charger le logo pour le PDF', error);
    pdfAssets.logo = undefined;
    return null;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(reader.error);
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

function buildCatalogueTree(products) {
  const root = createTreeNode(null);
  products.forEach((product) => {
    const path = deriveCategoryPathForTree(product.category);
    let node = root;
    path.forEach((segment) => {
      const key = segment || TREE_FALLBACK_LABEL;
      if (!node.children.has(key)) {
        node.children.set(key, createTreeNode(key));
      }
      node = node.children.get(key);
    });
    node.products.push(product);
  });
  return root;
}

function createTreeNode(label) {
  return {
    label,
    children: new Map(),
    products: [],
  };
}

function deriveCategoryPathForTree(category) {
  if (!category) {
    return [TREE_FALLBACK_LABEL];
  }
  const normalised = String(category).replace(/\s+/g, ' ').trim();
  if (!normalised) {
    return [TREE_FALLBACK_LABEL];
  }
  for (const separator of TREE_SEPARATORS) {
    if (normalised.includes(separator)) {
      const segments = normalised
        .split(separator)
        .map((segment) => segment.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (segments.length) {
        return segments;
      }
    }
  }
  return [normalised];
}

function sortTreeNodes(nodes) {
  return nodes.slice().sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
}

function populateCatalogueTreeSelector() {
  const select = elements.catalogueTree;
  if (!select) return;
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = 'Arborescence du catalogue…';
  select.appendChild(placeholder);
  if (!state.catalogueTree) return;
  const topLevel = Array.from(state.catalogueTree.children.values());
  if (!topLevel.length) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.disabled = true;
    empty.textContent = 'Catalogue vide';
    select.appendChild(empty);
    return;
  }
  appendTreeOptions(select, sortTreeNodes(topLevel), 0);
}

function appendTreeOptions(select, nodes, depth) {
  nodes.forEach((node) => {
    const indent = TREE_INDENT.repeat(depth);
    const categoryOption = document.createElement('option');
    categoryOption.value = '';
    categoryOption.disabled = true;
    categoryOption.dataset.type = 'category';
    categoryOption.textContent = depth ? `${indent}› ${node.label}` : node.label;
    select.appendChild(categoryOption);

    const products = node.products
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    products.forEach((product) => {
      const productOption = document.createElement('option');
      productOption.value = product.id;
      productOption.dataset.type = 'product';
      productOption.textContent = `${TREE_INDENT.repeat(depth + 1)}${product.name} (${product.reference})`;
      select.appendChild(productOption);
    });

    if (node.children.size) {
      appendTreeOptions(select, sortTreeNodes(Array.from(node.children.values())), depth + 1);
    }
  });
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

function handleCatalogueTreeSelection(event) {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) return;
  const productId = select.value;
  if (!productId) {
    return;
  }
  const product = state.catalogueById.get(productId);
  if (!product) {
    select.value = '';
    return;
  }
  const filtersChanged = resetFiltersForProduct(product);
  window.setTimeout(() => {
    focusProductCard(productId);
  }, filtersChanged ? 110 : 0);
  select.value = '';
}

function resetFiltersForProduct(product) {
  let filtersChanged = false;
  if (state.searchQuery) {
    state.searchQuery = '';
    if (elements.search) {
      elements.search.value = '';
    }
    filtersChanged = true;
  }
  if (state.selectedCategories.size && (!product.category || !state.selectedCategories.has(product.category))) {
    state.selectedCategories.clear();
    const checkboxes = elements.categoryFilterOptions?.querySelectorAll('input[type="checkbox"]');
    checkboxes?.forEach((checkbox) => {
      checkbox.checked = false;
      checkbox.parentElement?.classList.remove('is-active');
    });
    filtersChanged = true;
  }
  const productUnit = getUnitFilterValue(product.unit);
  const matchesUnit =
    state.selectedUnit === UNIT_FILTER_ALL ||
    (state.selectedUnit === UNIT_FILTER_NONE && productUnit === UNIT_FILTER_NONE) ||
    state.selectedUnit === productUnit;
  if (!matchesUnit) {
    state.selectedUnit = UNIT_FILTER_ALL;
    if (elements.unitFilter) {
      elements.unitFilter.value = UNIT_FILTER_ALL;
    }
    filtersChanged = true;
  }
  if (filtersChanged) {
    updateCategoryFilterLabel();
    applyFilters();
  }
  return filtersChanged;
}

function focusProductCard(productId) {
  const { productGrid } = elements;
  if (!productGrid) return;
  const selector = `[data-product-id="${escapeSelector(productId)}"]`;
  const card = productGrid.querySelector(selector);
  if (!card) {
    return;
  }
  card.classList.add('is-highlighted');
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => {
    card.classList.remove('is-highlighted');
  }, 1800);
  const addButton = card.querySelector('.add-to-quote');
  if (addButton instanceof HTMLElement) {
    addButton.focus({ preventScroll: true });
  }
}

function escapeSelector(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return String(value).replace(/([!"#$%&'()*+,./:;<=>?@\[\]^`{|}~])/g, '\\$1');
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
