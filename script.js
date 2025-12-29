const STORAGE_KEY = 'invoice.draft.v1';
const LAST_NUMBER_KEY = 'invoice.lastNumber';
const HISTORY_KEY = 'invoice.history';

let isApplyingData = false;

// ===== History Management =====
function getHistory() {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function saveToHistory(data) {
    const history = getHistory();
    const invoiceNumber = data.invoice.number;

    // Check if invoice number already exists
    const existing = history.find(h => h.invoiceNumber === invoiceNumber);
    if (existing) {
        const shouldOverwrite = confirm(`Invoice #${invoiceNumber} already exists in history. Overwrite it?`);
        if (!shouldOverwrite) return;
    }

    const entry = {
        id: Date.now(),
        invoiceNumber: invoiceNumber,
        customerName: data.billTo.name,
        total: data.totals.total,
        currency: data.settings.currency,
        date: data.invoice.date,
        savedAt: new Date().toISOString(),
        data: data
    };

    // Remove duplicate if same invoice number exists
    const filtered = history.filter(h => h.invoiceNumber !== entry.invoiceNumber);
    filtered.unshift(entry);

    // Keep max 50 entries
    const trimmed = filtered.slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    renderHistoryList();
}

function deleteFromHistory(id) {
    const history = getHistory();
    const filtered = history.filter(h => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    renderHistoryList();
}

function clearHistory() {
    if (!confirm('Clear all invoice history?')) return;
    localStorage.removeItem(HISTORY_KEY);
    renderHistoryList();
}

function loadFromHistory(id) {
    const history = getHistory();
    const entry = history.find(h => h.id === id);
    if (!entry || !entry.data) return;

    applyDataToForm(entry.data);
    toggleHistoryPanel(false);
}

function renderHistoryList() {
    const list = document.getElementById('historyList');
    if (!list) return;

    const history = getHistory();

    if (history.length === 0) {
        list.innerHTML = '<p class="history-empty">No invoices saved yet. Generate a bill to save it here.</p>';
        return;
    }

    list.innerHTML = '';
    history.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.dataset.id = entry.id;

        const info = document.createElement('div');
        info.className = 'history-item-info';

        const title = document.createElement('div');
        title.className = 'history-item-title';
        title.textContent = `#${entry.invoiceNumber} - ${entry.customerName || 'No customer'}`;

        const meta = document.createElement('div');
        meta.className = 'history-item-meta';
        meta.textContent = `${formatDate(entry.date)} · ${formatCurrency(entry.total, entry.currency)}`;

        info.appendChild(title);
        info.appendChild(meta);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'history-item-delete';
        deleteBtn.dataset.id = entry.id;
        deleteBtn.title = 'Delete';
        deleteBtn.textContent = '×';

        item.appendChild(info);
        item.appendChild(deleteBtn);
        list.appendChild(item);
    });
}

function toggleHistoryPanel(show) {
    const panel = document.getElementById('historyPanel');
    if (!panel) return;

    if (typeof show === 'boolean') {
        panel.style.display = show ? 'block' : 'none';
    } else {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    if (panel.style.display === 'block') {
        renderHistoryList();
    }
}

function getValue(id, fallback = '') {
    const el = document.getElementById(id);
    if (!el) return fallback;
    return el.value ?? fallback;
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? '';
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value ?? '';
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseNumber(value, fallback = 0) {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : fallback;
}

function formatCurrency(amount, currency, locale) {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    try {
        return new Intl.NumberFormat(locale || 'en-IN', {
            style: 'currency',
            currency: currency || 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(safeAmount);
    } catch (error) {
        const suffix = currency ? ` ${currency}` : '';
        return `${safeAmount.toFixed(2)}${suffix}`;
    }
}

function formatDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
}

function calculateTotals(items, taxRate, discount) {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;
    return {
        subtotal,
        taxRate,
        taxAmount,
        discount,
        total,
        balanceDue: total
    };
}

function ensureAtLeastOneItemRow() {
    const container = document.getElementById('itemsContainer');
    if (!container || container.querySelectorAll('.item-row').length > 0) return;
    addItemRow({
        description: '',
        quantity: 1,
        unitPrice: 0
    });
}

function addItemRow(item = {}) {
    const container = document.getElementById('itemsContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'item-row';

    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'item-description';
    descInput.placeholder = 'Description';
    descInput.value = item.description ?? '';

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'item-quantity';
    qtyInput.min = '0';
    qtyInput.step = '1';
    qtyInput.value = item.quantity ?? 1;

    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'item-unit-price';
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.value = item.unitPrice ?? 0;

    const totalSpan = document.createElement('span');
    totalSpan.className = 'item-total';
    totalSpan.textContent = '0.00';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item';
    removeBtn.title = 'Remove item';
    removeBtn.textContent = '×';

    row.appendChild(descInput);
    row.appendChild(qtyInput);
    row.appendChild(priceInput);
    row.appendChild(totalSpan);
    row.appendChild(removeBtn);

    container.appendChild(row);
}

function renderItemsForm(items) {
    const container = document.getElementById('itemsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!Array.isArray(items) || items.length === 0) {
        addItemRow();
        return;
    }

    items.forEach((item) => addItemRow(item));
}

function collectItemsFromForm(settings) {
    const rows = Array.from(document.querySelectorAll('.item-row'));
    const items = rows.map((row) => {
        const description = row.querySelector('.item-description')?.value?.trim() ?? '';
        const quantity = parseNumber(row.querySelector('.item-quantity')?.value, 0);
        const unitPrice = parseNumber(row.querySelector('.item-unit-price')?.value, 0);
        const total = quantity * unitPrice;
        const totalEl = row.querySelector('.item-total');
        if (totalEl) {
            totalEl.textContent = formatCurrency(total, settings.currency, settings.locale);
        }
        return {
            description,
            quantity,
            unitPrice,
            total
        };
    });

    return items;
}

function getDataFromForm() {
    const settings = {
        currency: getValue('currencyCode', 'INR').trim() || 'INR',
        locale: 'en-IN'
    };

    const items = collectItemsFromForm(settings);
    const taxRate = parseNumber(getValue('taxRate', 0), 0);
    const discount = parseNumber(getValue('discountAmount', 0), 0);
    const totals = calculateTotals(items, taxRate, discount);

    return {
        schemaVersion: 1,
        settings,
        seller: {
            name: getValue('sellerName'),
            address: getValue('sellerAddress'),
            email: getValue('sellerEmail'),
            phone: getValue('sellerPhone')
        },
        billTo: {
            name: getValue('billToName'),
            address: getValue('billToAddress'),
            email: getValue('billToEmail'),
            phone: getValue('billToPhone')
        },
        invoice: {
            title: getValue('invoiceTitle', 'INVOICE'),
            date: getValue('invoiceDate'),
            dueDate: getValue('invoiceDueDate'),
            number: getValue('invoiceNumber'),
            notes: getValue('invoiceNotes'),
            instructions: getValue('invoiceInstructions')
        },
        items,
        totals,
        meta: {
            updatedAt: new Date().toISOString(),
            showInvoice: isInvoiceVisible()
        }
    };
}

function updateFormTotalsDisplay(data) {
    const { totals, settings } = data;
    setText('formSubtotal', formatCurrency(totals.subtotal, settings.currency, settings.locale));
    setText('formTaxAmount', formatCurrency(totals.taxAmount, settings.currency, settings.locale));
    setText('formTotal', formatCurrency(totals.total, settings.currency, settings.locale));
}

function renderInvoice(data) {
    const { settings, seller, billTo, invoice, items, totals } = data;

    setText('displaySellerName', seller.name);
    setText('displaySellerAddress', seller.address || '');
    setText('displaySellerEmail', seller.email);
    setText('displaySellerPhone', seller.phone);

    setText('displayInvoiceTitle', invoice.title || 'INVOICE');

    setText('displayBillToName', billTo.name);
    setText('displayBillToAddress', billTo.address || '');
    setText('displayBillToEmail', billTo.email);
    setText('displayBillToPhone', billTo.phone);

    setText('displayInvoiceDate', formatDate(invoice.date));

    // Conditionally show/hide due date row
    const dueDateRow = document.getElementById('dueDateRow');
    if (dueDateRow) {
        if (invoice.dueDate) {
            dueDateRow.style.display = '';
            setText('displayInvoiceDueDate', formatDate(invoice.dueDate));
        } else {
            dueDateRow.style.display = 'none';
        }
    }

    setText('displayInvoiceNumber', invoice.number);

    const itemsBody = document.getElementById('displayItemsBody');
    if (itemsBody) {
        itemsBody.innerHTML = '';
        items.forEach((item) => {
            const row = document.createElement('tr');

            const descTd = document.createElement('td');
            descTd.textContent = item.description || '';

            const qtyTd = document.createElement('td');
            qtyTd.textContent = item.quantity || 0;

            const priceTd = document.createElement('td');
            priceTd.textContent = formatCurrency(item.unitPrice || 0, settings.currency, settings.locale);

            const totalTd = document.createElement('td');
            totalTd.textContent = formatCurrency(item.total || 0, settings.currency, settings.locale);

            row.appendChild(descTd);
            row.appendChild(qtyTd);
            row.appendChild(priceTd);
            row.appendChild(totalTd);

            itemsBody.appendChild(row);
        });
    }

    setText('displaySubtotal', formatCurrency(totals.subtotal, settings.currency, settings.locale));

    // Conditionally show/hide tax row
    const taxRow = document.getElementById('taxRow');
    if (taxRow) {
        if (totals.taxAmount > 0) {
            taxRow.style.display = '';
            setText('displayTaxAmount', formatCurrency(totals.taxAmount, settings.currency, settings.locale));
        } else {
            taxRow.style.display = 'none';
        }
    }

    // Conditionally show/hide discount row
    const discountRow = document.getElementById('discountRow');
    if (discountRow) {
        if (totals.discount > 0) {
            discountRow.style.display = '';
            setText('displayDiscount', formatCurrency(totals.discount, settings.currency, settings.locale));
        } else {
            discountRow.style.display = 'none';
        }
    }

    setText('displayBalanceDue', formatCurrency(totals.balanceDue, settings.currency, settings.locale));

    setText('displayNotesHeading', invoice.notes || 'Thank you for your business');
    setText('displayInstructions', invoice.instructions || '');

    document.getElementById('invoice').style.display = 'block';
    document.getElementById('downloadBtn').style.display = 'inline-block';
}

function isInvoiceVisible() {
    const invoice = document.getElementById('invoice');
    return invoice && invoice.style.display === 'block';
}

function saveDraft(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;

    // Dangerous keys that could lead to prototype pollution
    const UNSAFE_KEYS = ['__proto__', 'constructor', 'prototype'];

    Object.keys(source).forEach((key) => {
        // Skip prototype pollution vectors
        if (UNSAFE_KEYS.includes(key)) return;
        if (!Object.prototype.hasOwnProperty.call(source, key)) return;

        const value = source[key];
        if (Array.isArray(value)) {
            target[key] = value.slice();
        } else if (value && typeof value === 'object') {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            deepMerge(target[key], value);
        } else {
            target[key] = value;
        }
    });
    return target;
}

function applyDataToForm(data) {
    isApplyingData = true;

    setValue('sellerName', data.seller?.name ?? '');
    setValue('sellerAddress', data.seller?.address ?? '');
    setValue('sellerEmail', data.seller?.email ?? '');
    setValue('sellerPhone', data.seller?.phone ?? '');
    setValue('billToName', data.billTo?.name ?? '');
    setValue('billToAddress', data.billTo?.address ?? '');
    setValue('billToEmail', data.billTo?.email ?? '');
    setValue('billToPhone', data.billTo?.phone ?? '');

    setValue('invoiceTitle', data.invoice?.title ?? 'INVOICE');
    setValue('invoiceDate', data.invoice?.date ?? '');
    setValue('invoiceDueDate', data.invoice?.dueDate ?? '');
    setValue('invoiceNumber', data.invoice?.number ?? '');

    setValue('currencyCode', data.settings?.currency ?? 'INR');

    renderItemsForm(data.items || []);

    setValue('taxRate', data.totals?.taxRate ?? 0);
    setValue('discountAmount', data.totals?.discount ?? 0);

    setValue('invoiceNotes', data.invoice?.notes ?? '');

    const legacyBank = data.seller?.bank;
    const legacyInstructions = data.invoice?.terms ?? data.invoice?.instructions ?? '';
    let mergedInstructions = legacyInstructions;
    if (!mergedInstructions && legacyBank) {
        const lines = [];
        if (legacyBank.accountNo) lines.push(`A/c no: ${legacyBank.accountNo}`);
        if (legacyBank.ifsc) lines.push(`IFSC: ${legacyBank.ifsc}`);
        if (legacyBank.name) lines.push(`Name: ${legacyBank.name}`);
        if (lines.length > 0) {
            mergedInstructions = `Please send payment to below bank account.\n${lines.join('\n')}`;
        }
    }
    setValue('invoiceInstructions', mergedInstructions);

    isApplyingData = false;

    syncFromForm({ render: data.meta?.showInvoice, showInvoice: data.meta?.showInvoice });
}

function syncFromForm(options = {}) {
    const data = getDataFromForm();
    if (typeof options.showInvoice === 'boolean') {
        data.meta.showInvoice = options.showInvoice;
    }
    updateFormTotalsDisplay(data);
    saveDraft(data);
    if (options.render) {
        renderInvoice(data);
    }
    return data;
}

function validateData(data) {
    if (!data.seller.name || !data.seller.address) return false;
    if (!data.billTo.name || !data.billTo.address) return false;
    if (!data.invoice.date || !data.invoice.number) return false;
    if (!Array.isArray(data.items) || data.items.length === 0) return false;
    const validItems = data.items.some((item) => item.description && item.quantity > 0 && item.unitPrice >= 0);
    return validItems;
}

function generateBill() {
    const data = syncFromForm({ showInvoice: true });
    if (!validateData(data)) {
        alert('Please fill in all required fields and add at least one line item.');
        return;
    }
    data.meta.showInvoice = true;
    saveDraft(data);
    renderInvoice(data);
    localStorage.setItem(LAST_NUMBER_KEY, data.invoice.number);
    saveToHistory(data);
    document.getElementById('invoice').scrollIntoView({ behavior: 'smooth' });
}

async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const invoiceElement = document.getElementById('invoice');
    const downloadBtn = document.getElementById('downloadBtn');

    // Show loading state
    const originalBtnText = downloadBtn.textContent;
    downloadBtn.textContent = 'Generating...';
    downloadBtn.disabled = true;

    // Store original styles to restore later
    const originalStyles = {
        formDisplay: document.querySelector('.form-section').style.display,
        invoiceHeight: invoiceElement.style.height,
        invoiceOverflow: invoiceElement.style.overflow
    };

    try {
        // Prepare invoice for capture
        document.querySelector('.form-section').style.display = 'none';
        invoiceElement.style.height = 'auto';
        invoiceElement.style.overflow = 'visible';
        document.body.classList.add('pdf-generation');

        // Add print-optimized styles
        const printStyles = document.createElement('style');
        printStyles.id = 'pdf-print-styles';
        printStyles.textContent = `
            .pdf-generation .invoice-section {
                background: white !important;
                box-shadow: none !important;
                padding: 40px !important;
                margin: 0 !important;
                width: 794px !important;
                min-height: auto !important;
                height: auto !important;
                overflow: visible !important;
                font-family: 'Inter', Arial, sans-serif !important;
            }
            .pdf-generation .invoice-header { margin-bottom: 30px !important; }
            .pdf-generation .business-info h1 { font-size: 18px !important; }
            .pdf-generation .business-info p { font-size: 12px !important; }
            .pdf-generation .invoice-title h1 { font-size: 28px !important; }
            .pdf-generation .invoice-table { font-size: 12px !important; }
            .pdf-generation .invoice-table th,
            .pdf-generation .invoice-table td { padding: 10px !important; }
        `;
        document.head.appendChild(printStyles);

        // Wait for styles to apply
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        // Capture with high DPI for crisp output
        const canvas = await html2canvas(invoiceElement, {
            scale: 3, // Higher scale for better quality
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: 794, // A4 width at 96 DPI
            onclone: (clonedDoc) => {
                // Ensure cloned element is fully visible
                const clonedInvoice = clonedDoc.getElementById('invoice');
                if (clonedInvoice) {
                    clonedInvoice.style.height = 'auto';
                    clonedInvoice.style.overflow = 'visible';
                }
            }
        });

        // Create PDF with proper A4 dimensions
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - (margin * 2);

        // Calculate image dimensions maintaining aspect ratio
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Handle multi-page if content is taller than one page
        const maxHeightPerPage = pageHeight - (margin * 2);

        if (imgHeight <= maxHeightPerPage) {
            // Single page - center vertically if short
            const yOffset = margin;
            pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', margin, yOffset, imgWidth, imgHeight);
        } else {
            // Multi-page handling for long invoices
            let remainingHeight = imgHeight;
            let sourceY = 0;
            let pageNum = 0;

            while (remainingHeight > 0) {
                if (pageNum > 0) pdf.addPage();

                const sliceHeight = Math.min(remainingHeight, maxHeightPerPage);
                const sourceSliceHeight = (sliceHeight / imgHeight) * canvas.height;

                // Create a slice canvas for this page
                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = sourceSliceHeight;
                const ctx = sliceCanvas.getContext('2d');
                ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceSliceHeight, 0, 0, canvas.width, sourceSliceHeight);

                pdf.addImage(sliceCanvas.toDataURL('image/png', 1.0), 'PNG', margin, margin, imgWidth, sliceHeight);

                sourceY += sourceSliceHeight;
                remainingHeight -= sliceHeight;
                pageNum++;
            }
        }

        // Generate filename
        const customerName = getValue('billToName').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');
        const invoiceNumber = getValue('invoiceNumber');
        const filename = `Invoice-${invoiceNumber}-${customerName}.pdf`;

        pdf.save(filename);

        // Remove print styles
        document.head.removeChild(printStyles);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        // Restore original styles
        document.querySelector('.form-section').style.display = originalStyles.formDisplay;
        invoiceElement.style.height = originalStyles.invoiceHeight;
        invoiceElement.style.overflow = originalStyles.invoiceOverflow;
        document.body.classList.remove('pdf-generation');

        // Remove print styles if still present
        const printStyles = document.getElementById('pdf-print-styles');
        if (printStyles) printStyles.remove();

        // Restore button
        downloadBtn.textContent = originalBtnText;
        downloadBtn.disabled = false;
    }
}

function exportJsonToTextarea() {
    const data = syncFromForm({ render: false });
    const json = JSON.stringify(data, null, 2);
    setValue('jsonData', json);
}

function downloadJsonFile() {
    const data = syncFromForm({ render: false });
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const invoiceNumber = data.invoice.number || 'draft';
    anchor.href = url;
    anchor.download = `invoice-${invoiceNumber}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

function importJsonData(rawJson) {
    let parsed;
    try {
        parsed = JSON.parse(rawJson);
    } catch (error) {
        alert('Invalid JSON. Please check the format and try again.');
        return;
    }

    const base = getDataFromForm();
    const merged = deepMerge(base, parsed);
    merged.meta = merged.meta || {};
    merged.meta.showInvoice = true;

    applyDataToForm(merged);
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        importJsonData(reader.result);
    };
    reader.readAsText(file);
}

function resetDraft() {
    const shouldReset = confirm('Reset the current draft? Your stored draft will be cleared.');
    if (!shouldReset) return;

    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('invoice').style.display = 'none';
    document.getElementById('downloadBtn').style.display = 'none';
    setValue('jsonData', '');

    // Reset all form fields
    setValue('sellerName', '');
    setValue('sellerAddress', '');
    setValue('sellerEmail', '');
    setValue('sellerPhone', '');
    setValue('billToName', '');
    setValue('billToAddress', '');
    setValue('billToEmail', '');
    setValue('billToPhone', '');
    setValue('invoiceTitle', 'INVOICE');
    setValue('invoiceDueDate', '');
    setValue('currencyCode', 'INR');
    setValue('taxRate', '0');
    setValue('discountAmount', '0');
    setValue('invoiceNotes', '');
    setValue('invoiceInstructions', '');

    const today = new Date().toISOString().split('T')[0];
    setValue('invoiceDate', today);

    const lastNumber = localStorage.getItem(LAST_NUMBER_KEY);
    if (lastNumber) {
        setValue('invoiceNumber', String(parseNumber(lastNumber, 0) + 1));
    } else {
        setValue('invoiceNumber', '1');
    }

    renderItemsForm([]);
    ensureAtLeastOneItemRow();
    syncFromForm({ render: false, showInvoice: false });
}

function attachEventHandlers() {
    const form = document.getElementById('billForm');
    form.addEventListener('input', () => {
        if (isApplyingData) return;
        const shouldRender = isInvoiceVisible();
        syncFromForm({ render: shouldRender });
    });

    document.getElementById('addItemBtn').addEventListener('click', () => {
        addItemRow({ description: '', quantity: 1, unitPrice: 0 });
        syncFromForm({ render: isInvoiceVisible() });
    });

    const itemsContainer = document.getElementById('itemsContainer');
    itemsContainer.addEventListener('click', (event) => {
        if (!event.target.classList.contains('remove-item')) return;
        const row = event.target.closest('.item-row');
        if (row) row.remove();
        ensureAtLeastOneItemRow();
        syncFromForm({ render: isInvoiceVisible() });
    });

    document.getElementById('exportJsonBtn').addEventListener('click', exportJsonToTextarea);
    document.getElementById('downloadJsonBtn').addEventListener('click', downloadJsonFile);
    document.getElementById('importJsonBtn').addEventListener('click', () => {
        const raw = getValue('jsonData');
        if (!raw.trim()) {
            alert('Paste invoice JSON first.');
            return;
        }
        importJsonData(raw);
    });

    document.getElementById('importFile').addEventListener('change', handleFileImport);
    document.getElementById('resetDraftBtn').addEventListener('click', resetDraft);

    // Invoice number increment/decrement buttons
    document.getElementById('incrementInvoice').addEventListener('click', () => {
        const input = document.getElementById('invoiceNumber');
        const current = parseNumber(input.value, 0);
        input.value = current + 1;
        syncFromForm({ render: isInvoiceVisible() });
    });

    document.getElementById('decrementInvoice').addEventListener('click', () => {
        const input = document.getElementById('invoiceNumber');
        const current = parseNumber(input.value, 0);
        if (current > 1) {
            input.value = current - 1;
            syncFromForm({ render: isInvoiceVisible() });
        }
    });

    // Drag and drop support for JSON textarea
    const jsonTextarea = document.getElementById('jsonData');

    jsonTextarea.addEventListener('dragover', (e) => {
        e.preventDefault();
        jsonTextarea.classList.add('drag-over');
    });

    jsonTextarea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        jsonTextarea.classList.remove('drag-over');
    });

    jsonTextarea.addEventListener('drop', (e) => {
        e.preventDefault();
        jsonTextarea.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json') && file.type !== 'application/json') {
            alert('Please drop a .json file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            importJsonData(reader.result);
        };
        reader.readAsText(file);
    });

    // History panel handlers
    document.getElementById('historyToggle').addEventListener('click', () => toggleHistoryPanel());
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);

    document.getElementById('historyList').addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.history-item-delete');
        if (deleteBtn) {
            e.stopPropagation();
            const id = parseInt(deleteBtn.dataset.id, 10);
            deleteFromHistory(id);
            return;
        }

        const item = e.target.closest('.history-item');
        if (item) {
            const id = parseInt(item.dataset.id, 10);
            loadFromHistory(id);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    if (!getValue('invoiceDate')) {
        setValue('invoiceDate', today);
    }

    attachEventHandlers();

    const storedDraft = loadDraft();
    if (storedDraft) {
        applyDataToForm(storedDraft);
        if (storedDraft.meta?.showInvoice) {
            renderInvoice(storedDraft);
        }
        return;
    }

    const lastNumber = localStorage.getItem(LAST_NUMBER_KEY);
    if (lastNumber && !getValue('invoiceNumber')) {
        setValue('invoiceNumber', String(parseNumber(lastNumber, 0) + 1));
    }

    ensureAtLeastOneItemRow();
    syncFromForm({ render: false, showInvoice: false });
});
