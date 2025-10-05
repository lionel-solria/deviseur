const catalogueUrl = './catalogue/import_items.csv';
const defaultImage = 'https://via.placeholder.com/640x480.png?text=Image+indisponible';

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const numberFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dimensionFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const state = {
  catalogue: [],
  filtered: [],
  catalogueById: new Map(),
  quote: new Map(),
  discountRate: 0,
  vatRate: 0.2,
  generalComment: '',
  activeProduct: null,
};

const elements = {
  search: document.getElementById('search'),
  productGrid: document.getElementById('product-grid'),
  productFeedback: document.getElementById('product-feedback'),
  productTemplate: document.getElementById('product-card-template'),
  quoteTemplate: document.getElementById('quote-item-template'),
  quoteList: document.getElementById('quote-list'),
  quoteEmpty: document.getElementById('quote-empty'),
  discount: document.getElementById('discount'),
  summarySubtotal: document.getElementById('summary-subtotal'),
  summaryDiscount: document.getElementById('summary-discount'),
  summaryNet: document.getElementById('summary-net'),
  summaryVat: document.getElementById('summary-vat'),
  summaryTotal: document.getElementById('summary-total'),
  generalComment: document.getElementById('general-comment'),
  generatePdf: document.getElementById('generate-pdf'),
  layout: document.getElementById('split-layout'),
  cataloguePanel: document.querySelector('[data-role="catalogue-panel"]'),
  quotePanel: document.querySelector('[data-role="quote-panel"]'),
  resizer: document.getElementById('column-resizer'),
  modal: document.getElementById('product-modal'),
  modalImage: document.getElementById('modal-product-image'),
  modalReference: document.getElementById('modal-product-reference'),
  modalName: document.getElementById('modal-product-name'),
  modalDescription: document.getElementById('modal-product-description'),
  modalLink: document.getElementById('modal-product-link'),
  modalClose: document.querySelector('#product-modal .modal__close'),
};

document.addEventListener('DOMContentLoaded', () => {
  loadCatalogue();
  elements.search?.addEventListener('input', handleSearch);
  elements.discount?.addEventListener('input', handleDiscountChange);
  elements.generatePdf?.addEventListener('click', generatePdf);
  elements.generalComment?.addEventListener('input', handleGeneralCommentChange);
  initResizer();
  initModal();
});

function initResizer() {
  const { resizer, layout, cataloguePanel, quotePanel } = elements;
  if (!resizer || !layout || !cataloguePanel || !quotePanel) {
    return;
  }

  const minRatio = 0.35;
  const maxRatio = 0.75;
  let isResizing = false;

  const handlePointerMove = (event) => {
    if (!isResizing) return;
    const rect = layout.getBoundingClientRect();
    if (!rect.width) return;
    let ratio = (event.clientX - rect.left) / rect.width;
    ratio = Math.min(Math.max(ratio, minRatio), maxRatio);
    const catalogueWidth = ratio * 100;
    const quoteWidth = 100 - catalogueWidth;
    cataloguePanel.style.flexBasis = `${catalogueWidth}%`;
    quotePanel.style.flexBasis = `${quoteWidth}%`;
  };

  const stopResizing = () => {
    if (!isResizing) return;
    isResizing = false;
    layout.classList.remove('is-resizing');
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', stopResizing);
  };

  resizer.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    isResizing = true;
    layout.classList.add('is-resizing');
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', stopResizing);
  });

  resizer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' ? -5 : 5;
    const current = parseFloat(cataloguePanel.style.flexBasis || '60');
    const next = Math.min(Math.max(current + delta, minRatio * 100), maxRatio * 100);
    cataloguePanel.style.flexBasis = `${next}%`;
    quotePanel.style.flexBasis = `${100 - next}%`;
  });
}

function initModal() {
  const { modal, modalClose } = elements;
  if (!modal) {
    return;
  }

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeProductModal();
    }
  });

  modalClose?.addEventListener('click', () => {
    closeProductModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeProductModal();
    }
  });
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
    empty.className =
      'col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500';
    empty.textContent = 'Aucun produit ne correspond à votre recherche.';
    productGrid.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const product of state.filtered) {
    const card = productTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector('.product-image');
    image.src = product.image || defaultImage;
    image.alt = product.name;
    image.addEventListener('error', () => {
      image.src = defaultImage;
    });

    card.querySelector('.product-reference').textContent = product.reference;
    card.querySelector('.product-name').textContent = product.name;
    card.querySelector('.product-description').textContent = product.description || 'Pas de description fournie.';
    const priceLabel = product.unit ? `${product.priceLabel} / ${product.unit}` : product.priceLabel;
    card.querySelector('.product-price').textContent = priceLabel;
    const unit = card.querySelector('.product-unit');
    unit.textContent = product.unit ? `Unité de vente : ${product.unit}` : "Unité de vente : à l'unité";

    const detailsButton = card.querySelector('.product-details');
    detailsButton.dataset.productId = product.id;
    detailsButton.addEventListener('click', () => openProductModal(product.id));

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
    });
  }
  renderQuote();
}

function renderQuote() {
  if (!elements.quoteList || !elements.quoteTemplate) return;

  if (!state.quote.size) {
    elements.quoteEmpty?.classList.remove('hidden');
    elements.quoteList.classList.add('hidden');
    elements.quoteList.innerHTML = '';
  } else {
    elements.quoteEmpty?.classList.add('hidden');
    elements.quoteList.classList.remove('hidden');
    const fragment = document.createDocumentFragment();
    for (const item of state.quote.values()) {
      const node = elements.quoteTemplate.content.firstElementChild.cloneNode(true);
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

function handleGeneralCommentChange(event) {
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

  if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') {
    toggleFeedback('La bibliothèque de génération PDF est indisponible. Vérifiez votre connexion internet.', 'error');
    return;
  }

  const jsPDFConstructor = window.jspdf.jsPDF;
  if (!jsPDFConstructor.API?.autoTable) {
    toggleFeedback('Le module d\'export tableau (autoTable) est indisponible. Rechargez la page et réessayez.', 'error');
    return;
  }

  toggleFeedback('', 'hide');
  const items = Array.from(state.quote.values());
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = subtotal * (state.discountRate / 100);
  const net = subtotal - discountAmount;
  const vat = net * state.vatRate;
  const total = net + vat;

  const issueDate = new Date();
  const issueDateLabel = issueDate.toLocaleDateString('fr-FR');
  const validityDate = new Date(issueDate);
  validityDate.setDate(validityDate.getDate() + 30);
  const validityLabel = validityDate.toLocaleDateString('fr-FR');
  const quoteNumber = `DEV-${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, '0')}${String(issueDate.getDate()).padStart(2, '0')}-${String(issueDate.getHours()).padStart(2, '0')}${String(issueDate.getMinutes()).padStart(2, '0')}`;

  const doc = new jsPDFConstructor({ unit: 'pt', format: 'a4' });
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
    const comment = item.comment ? `\nCommentaire : ${item.comment}` : '';
    return [
      item.reference,
      item.name,
      `${quantityDetails}${comment}`,
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
      2: { cellWidth: 200 },
      3: { halign: 'right', cellWidth: 80 },
      4: { halign: 'right', cellWidth: 80 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  const summaryStartY = doc.lastAutoTable.finalY + 24;
  doc.autoTable({
    startY: summaryStartY,
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

  let followUpY = doc.lastAutoTable.finalY + 28;

  const trimmedGeneralComment = state.generalComment.trim();
  if (trimmedGeneralComment) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Commentaire général', margin, followUpY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const commentLines = doc.splitTextToSize(trimmedGeneralComment, pageWidth - margin * 2);
    doc.text(commentLines, margin, followUpY + 18);
    followUpY += 18 + commentLines.length * 12;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.text(
    "Merci pour votre confiance. Ce devis reste modifiable jusqu'à validation écrite.",
    margin,
    followUpY,
  );
  followUpY += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    'Nos équipes restent disponibles pour toute précision technique ou logistique concernant les produits listés.',
    margin,
    followUpY,
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

function openProductModal(productId) {
  const product = state.catalogueById.get(productId);
  if (!product || !elements.modal) {
    return;
  }
  state.activeProduct = product;

  if (elements.modalImage) {
    elements.modalImage.src = product.image || defaultImage;
    elements.modalImage.alt = product.name;
    elements.modalImage.addEventListener('error', () => {
      elements.modalImage.src = defaultImage;
    }, { once: true });
  }

  if (elements.modalReference) {
    elements.modalReference.textContent = `Référence : ${product.reference}`;
  }

  if (elements.modalName) {
    elements.modalName.textContent = product.name;
  }

  if (elements.modalDescription) {
    elements.modalDescription.textContent = product.description || 'Pas de description fournie.';
  }

  if (elements.modalLink) {
    if (product.link) {
      elements.modalLink.href = product.link;
      elements.modalLink.classList.remove('hidden');
    } else {
      elements.modalLink.classList.add('hidden');
      elements.modalLink.removeAttribute('href');
    }
  }

  elements.modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeProductModal() {
  if (!elements.modal) {
    return;
  }
  elements.modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  state.activeProduct = null;
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
    info: 'bg-blue-50 text-blue-700 border border-blue-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    error: 'bg-rose-50 text-rose-700 border border-rose-100',
  };
  box.className = `rounded-2xl px-6 py-4 text-sm shadow-sm ${styles[type] || styles.info}`;
  box.textContent = message;
  box.classList.remove('hidden');
}

function parseFrenchNumber(value) {
  if (!value) return 0;
  const normalised = value.replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(normalised);
  return Number.isFinite(parsed) ? parsed : 0;
}
