const catalogueUrl = './catalogue/import_items.csv';
const defaultImage = 'https://via.placeholder.com/640x480.png?text=Image+indisponible';

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const numberFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantityFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dimensionFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const state = {
  catalogue: [],
  filtered: [],
  catalogueById: new Map(),
  quote: new Map(),
  discountRate: 0,
  vatRate: 0.2,
  generalComment: '',
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
  elements.search = document.getElementById('search');
  elements.productGrid = document.getElementById('product-grid');
  elements.productFeedback = document.getElementById('product-feedback');
  elements.productTemplate = document.getElementById('product-card-template');
  elements.quoteTemplate = document.getElementById('quote-item-template');
  elements.quoteList = document.getElementById('quote-list');
  elements.quoteEmpty = document.getElementById('quote-empty');
  elements.discount = document.getElementById('discount');
  elements.summarySubtotal = document.getElementById('summary-subtotal');
  elements.summaryDiscount = document.getElementById('summary-discount');
  elements.summaryNet = document.getElementById('summary-net');
  elements.summaryVat = document.getElementById('summary-vat');
  elements.summaryTotal = document.getElementById('summary-total');
  elements.generatePdf = document.getElementById('generate-pdf');
  elements.generalComment = document.getElementById('general-comment');
  elements.layout = document.getElementById('layout');
  elements.layoutResizer = document.getElementById('layout-resizer');
  elements.cataloguePanel = document.getElementById('catalogue-panel');
  elements.quotePanel = document.getElementById('quote-panel');

  loadCatalogue();

  elements.search?.addEventListener('input', handleSearch);
  elements.discount?.addEventListener('input', handleDiscountChange);
  elements.generatePdf?.addEventListener('click', generatePdf);
  elements.generalComment?.addEventListener('input', handleGeneralComment);

  if (elements.generalComment) {
    elements.generalComment.value = state.generalComment;
  }

  initResizableLayout();
});

async function loadCatalogue() {
  toggleFeedback('Chargement du catalogue en cours...', 'info');
  try {
    const response = await fetch(catalogueUrl);
    if (!response.ok) {
      throw new Error(`Impossible de charger le fichier (${response.status})`);
    }
    const csvText = await response.text();
    const entries = parseCsv(csvText);
    state.catalogue = entries.map(toProduct).filter((item) => item && item.name);
    state.catalogue.forEach((product) => state.catalogueById.set(product.id, product));
    state.filtered = [...state.catalogue];
    renderProducts();
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

function normaliseUnitLabel(unit) {
  if (!unit) return '';
  return unit.replace(/m2/gi, 'm²').replace(/\s+/g, ' ').trim();
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
  if (!entry || !entry.id_produit_sellsy) return null;
  const name = entry.nom_commercial || '';
  const reference = entry.reference || entry.id_produit_sellsy;
  const description = entry.description || '';
  const rawPrice = entry.tarif_plein || entry.prix_reference_ht || '0';
  const price = parseFrenchNumber(rawPrice);
  const image = entry.image || '';
  const link = entry.lien || '';
  const rawUnit = entry.unite || '';
  const unit = normaliseUnitLabel(rawUnit);
  const quantityMode = getQuantityMode(rawUnit);
  return {
    id: entry.id_produit_sellsy,
    reference,
    name,
    description,
    price,
    priceLabel: currencyFormatter.format(price),
    unit,
    quantityMode,
    image,
    link,
  };
}

function handleSearch(event) {
  const query = event.target.value.trim().toLowerCase();
  if (!query) {
    state.filtered = [...state.catalogue];
  } else {
    state.filtered = state.catalogue.filter((product) => {
      const haystack = `${product.name} ${product.reference}`.toLowerCase();
      return haystack.includes(query);
    });
  }
  renderProducts();
}

function renderProducts() {
  const { productGrid, productTemplate } = elements;
  if (!productGrid || !productTemplate) return;
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
    const card = productTemplate.content.firstElementChild.cloneNode(true);
    decorateProductCard(card, product);
    fragment.appendChild(card);
  }
  productGrid.appendChild(fragment);
}

function decorateProductCard(card, product) {
  const previewImage = card.querySelector('.product-preview-image');
  if (previewImage) {
    previewImage.src = product.image || defaultImage;
    previewImage.alt = product.name || 'Illustration du produit';
    previewImage.addEventListener('error', () => {
      previewImage.src = defaultImage;
    });
  }

  const previewTitle = card.querySelector('.product-preview-title');
  if (previewTitle) {
    previewTitle.textContent = product.name;
  }

  const previewReference = card.querySelector('.product-preview-reference');
  if (previewReference) {
    previewReference.textContent = product.reference;
  }

  const previewLink = card.querySelector('.product-preview-link');
  const detailLink = card.querySelector('.product-link');
  const hasLink = Boolean(product.link);

  if (hasLink) {
    if (previewLink) {
      previewLink.href = product.link;
      previewLink.classList.remove('pointer-events-none', 'opacity-60');
      previewLink.setAttribute('aria-label', `Voir la fiche détaillée de ${product.name}`);
    }
    if (detailLink) {
      detailLink.href = product.link;
      detailLink.removeAttribute('aria-disabled');
      detailLink.classList.remove('pointer-events-none', 'text-slate-400');
      detailLink.textContent = 'Voir la fiche détaillée';
      detailLink.setAttribute('aria-label', `Ouvrir la fiche détaillée de ${product.name}`);
    }
  } else {
    if (previewLink) {
      previewLink.removeAttribute('href');
      previewLink.classList.add('pointer-events-none', 'opacity-60');
      previewLink.textContent = 'Lien non disponible';
    }
    if (detailLink) {
      detailLink.removeAttribute('href');
      detailLink.setAttribute('aria-disabled', 'true');
      detailLink.classList.add('pointer-events-none', 'text-slate-400');
      detailLink.textContent = 'Lien à venir';
    }
  }

  const reference = card.querySelector('.product-reference');
  if (reference) {
    reference.textContent = product.reference;
  }

  const name = card.querySelector('.product-name');
  if (name) {
    name.textContent = product.name;
  }

  const description = card.querySelector('.product-description');
  if (description) {
    description.textContent = product.description || 'Pas de description fournie.';
  }

  const price = card.querySelector('.product-price');
  if (price) {
    price.textContent = product.unit ? `${product.priceLabel} / ${product.unit}` : product.priceLabel;
  }

  const unit = card.querySelector('.product-unit');
  if (unit) {
    unit.textContent = product.unit ? `Unité de vente : ${product.unit}` : "Unité de vente : à l'article";
  }

  const button = card.querySelector('.add-to-quote');
  if (button) {
    button.dataset.productId = product.id;
    button.addEventListener('click', () => addToQuote(product.id));
  }
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
    });
  }
  renderQuote();
}

function renderQuote() {
  const { quoteEmpty, quoteList, quoteTemplate } = elements;
  if (!quoteEmpty || !quoteList || !quoteTemplate) return;

  if (!state.quote.size) {
    quoteEmpty.classList.remove('hidden');
    quoteList.classList.add('hidden');
    quoteList.innerHTML = '';
  } else {
    quoteEmpty.classList.add('hidden');
    quoteList.classList.remove('hidden');
    const fragment = document.createDocumentFragment();
    for (const item of state.quote.values()) {
      const node = quoteTemplate.content.firstElementChild.cloneNode(true);
      populateQuoteRow(node, item);
      fragment.appendChild(node);
    }
    quoteList.innerHTML = '';
    quoteList.appendChild(fragment);
  }
  updateSummary();
}

function populateQuoteRow(node, item) {
  node.querySelector('.quote-name').textContent = item.name;
  node.querySelector('.quote-reference').textContent = item.reference;
  node.querySelector('.unit-price').textContent = currencyFormatter.format(item.price);
  const lineTotal = node.querySelector('.line-total');
  const quantityValueElements = node.querySelectorAll('[data-role="quantity-value"]');
  const quantityUnitElements = node.querySelectorAll('[data-role="quantity-unit"]');
  const unitLabel = item.unit || "à l'unité";
  quantityUnitElements.forEach((element) => {
    element.textContent = unitLabel;
  });

  const unitControls = node.querySelector('[data-mode="unit"]');
  const areaControls = node.querySelector('[data-mode="area"]');
  const dimensions = node.querySelector('.quote-dimensions');

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
      lineTotal.textContent = currencyFormatter.format(item.price * item.quantity);
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
    lineTotal.textContent = currencyFormatter.format(item.price * item.quantity);
  }

  const commentField = node.querySelector('.quote-comment');
  if (commentField) {
    commentField.value = item.comment || '';
    commentField.addEventListener('input', (event) => {
      item.comment = event.target.value;
    });
  }

  node.querySelector('.remove-item').addEventListener('click', () => removeItem(item.id));
}

function changeQuantity(productId, delta) {
  const item = state.quote.get(productId);
  if (!item || item.quantityMode !== 'unit') return;
  item.quantity = Math.max(1, item.quantity + delta);
  renderQuote();
}

function removeItem(productId) {
  state.quote.delete(productId);
  renderQuote();
}

function handleDiscountChange(event) {
  const value = parseFloat(String(event.target.value).replace(',', '.'));
  if (Number.isNaN(value) || value < 0) {
    state.discountRate = 0;
  } else {
    state.discountRate = Math.min(value, 100);
  }
  event.target.value = String(state.discountRate).replace('.', ',');
  updateSummary();
}

function handleGeneralComment(event) {
  state.generalComment = event.target.value;
}

function updateSummary() {
  const items = Array.from(state.quote.values());
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const discountAmount = subtotal * (state.discountRate / 100);
  const net = subtotal - discountAmount;
  const vat = net * state.vatRate;
  const total = net + vat;
  elements.summarySubtotal.textContent = currencyFormatter.format(subtotal);
  elements.summaryDiscount.textContent = `-${currencyFormatter.format(discountAmount)}`;
  elements.summaryNet.textContent = currencyFormatter.format(net);
  elements.summaryVat.textContent = currencyFormatter.format(vat);
  elements.summaryTotal.textContent = currencyFormatter.format(total);
}

function generatePdf() {
  if (!state.quote.size) {
    toggleFeedback('Ajoutez au moins un article avant de générer le devis.', 'warning');
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    toggleFeedback("La bibliothèque de génération de PDF n'est pas disponible. Vérifiez votre connexion internet puis réessayez.", 'error');
    return;
  }

  toggleFeedback('', 'hide');
  const items = Array.from(state.quote.values());
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = subtotal * (state.discountRate / 100);
  const net = subtotal - discountAmount;
  const vat = net * state.vatRate;
  const total = net + vat;
  const generalComment = state.generalComment.trim();
  const commentedItems = items.filter((item) => (item.comment || '').trim().length > 0);

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
        ? `${dimensionFormatter.format(item.length || 0)} m x ${dimensionFormatter.format(item.width || 0)} m = ${quantityFormatter.format(item.quantity)} ${item.unit || 'm²'}`
        : `${quantityFormatter.format(item.quantity)} ${item.unit || ''}`.trim();
    return [
      item.reference,
      item.name,
      quantityDetails,
      currencyFormatter.format(item.price),
      currencyFormatter.format(item.price * item.quantity),
    ];
  });

  doc.autoTable({
    startY: y + 90,
    head: [['Référence', 'Désignation', 'Détails quantités', 'PU HT', 'Total HT']],
    body,
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6, textColor: [30, 41, 59] },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 90 },
      2: { cellWidth: 170 },
      3: { halign: 'right', cellWidth: 80 },
      4: { halign: 'right', cellWidth: 80 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  let tableBottom = doc.lastAutoTable.finalY;

  if (commentedItems.length) {
    doc.autoTable({
      startY: tableBottom + 24,
      head: [['Référence', 'Commentaire']],
      body: commentedItems.map((item) => [item.reference, item.comment.trim()]),
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6, textColor: [30, 41, 59] },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: pageWidth - margin * 2 - 120 },
      },
      margin: { left: margin, right: margin },
    });
    tableBottom = doc.lastAutoTable.finalY;
  }

  doc.autoTable({
    startY: tableBottom + 24,
    head: [['Récapitulatif', 'Montant']],
    body: [
      ['Total HT', currencyFormatter.format(subtotal)],
      [`Remise (${numberFormatter.format(state.discountRate)} %)`, `-${currencyFormatter.format(discountAmount)}`],
      ['Base HT après remise', currencyFormatter.format(net)],
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

  let currentY = doc.lastAutoTable.finalY + 24;

  if (generalComment) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Commentaire général', margin, currentY);
    currentY += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const commentLines = doc.splitTextToSize(generalComment, pageWidth - margin * 2);
    doc.text(commentLines, margin, currentY);
    currentY += commentLines.length * 12 + 12;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.text("Merci pour votre confiance. Ce devis reste modifiable jusqu'à validation écrite.", margin, currentY);
  currentY += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    'Nos équipes restent disponibles pour toute précision technique ou logistique concernant les produits listés.',
    margin,
    currentY,
    { maxWidth: pageWidth - margin * 2 },
  );

  addFooter(doc, margin, pageWidth, issueDateLabel);
  doc.save(`devis-${quoteNumber}.pdf`);
}

function addFooter(doc, margin, pageWidth, issueDateLabel) {
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
  const normalised = value.replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(normalised);
  return Number.isFinite(parsed) ? parsed : 0;
}

function initResizableLayout() {
  const { layout, layoutResizer, cataloguePanel, quotePanel } = elements;
  if (!layout || !layoutResizer || !cataloguePanel || !quotePanel) {
    return;
  }

  const minCatalogue = 320;
  const minQuote = 320;
  const mediaQuery = window.matchMedia('(min-width: 1024px)');
  let isDragging = false;
  let startX = 0;
  let startCatalogueWidth = 0;

  const applyWidth = (catalogueWidthPx) => {
    const containerWidth = layout.getBoundingClientRect().width;
    const constrainedCatalogue = Math.max(minCatalogue, Math.min(catalogueWidthPx, containerWidth - minQuote));
    const cataloguePercent = (constrainedCatalogue / containerWidth) * 100;
    const quotePercent = 100 - cataloguePercent;
    layout.style.setProperty('--catalogue-width', `${cataloguePercent}%`);
    layout.style.setProperty('--quote-width', `${quotePercent}%`);
  };

  const onPointerMove = (event) => {
    if (!isDragging) return;
    event.preventDefault();
    const delta = event.clientX - startX;
    applyWidth(startCatalogueWidth + delta);
  };

  const stopDragging = () => {
    if (!isDragging) return;
    isDragging = false;
    layoutResizer.classList.remove('is-dragging');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDragging);
  };

  layoutResizer.addEventListener('pointerdown', (event) => {
    if (!mediaQuery.matches || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    isDragging = true;
    startX = event.clientX;
    startCatalogueWidth = cataloguePanel.getBoundingClientRect().width;
    layoutResizer.classList.add('is-dragging');
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDragging);
  });

  layoutResizer.addEventListener('keydown', (event) => {
    if (!mediaQuery.matches) return;
    const step = 2; // en pourcentage
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      const containerWidth = layout.getBoundingClientRect().width;
      const currentCatalogueWidth = cataloguePanel.getBoundingClientRect().width;
      applyWidth(currentCatalogueWidth + (containerWidth * step * direction) / 100);
    }
  });

  const ensureBounds = () => {
    if (!mediaQuery.matches) {
      layout.style.removeProperty('--catalogue-width');
      layout.style.removeProperty('--quote-width');
      return;
    }
    const containerWidth = layout.getBoundingClientRect().width;
    let catalogueWidth = cataloguePanel.getBoundingClientRect().width;
    let quoteWidth = quotePanel.getBoundingClientRect().width;
    if (catalogueWidth < minCatalogue) {
      catalogueWidth = minCatalogue;
    }
    if (quoteWidth < minQuote) {
      catalogueWidth = containerWidth - minQuote;
    }
    catalogueWidth = Math.max(minCatalogue, Math.min(catalogueWidth, containerWidth - minQuote));
    applyWidth(catalogueWidth);
  };

  window.addEventListener('resize', ensureBounds);
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', ensureBounds);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(ensureBounds);
  }
  ensureBounds();
}
