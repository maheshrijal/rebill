
// @ts-check
import { test, expect } from '@playwright/test';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

/**
 * Advanced Features Tests
 * 
 * Covers:
 * - Tax and Discount calculations
 * - Due Dates
 * - Currency Formatting
 * - PDF Content Verification for these fields
 */

const testData = {
    seller: {
        name: 'Advanced Seller Ltd',
        address: '123 Innovation Dr',
    },
    customer: {
        name: 'Super Client',
        address: '456 Market St',
    },
    items: [
        { description: 'Premium Widget', quantity: 2, price: 1000 }
    ]
};

test.describe('Advanced Invoice Features', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        // Basic Setup
        await page.fill('#sellerName', testData.seller.name);
        await page.fill('#sellerAddress', testData.seller.address); // Required
        await page.fill('#billToName', testData.customer.name);
        await page.fill('#billToAddress', testData.customer.address); // Required
        await page.fill('.item-description', testData.items[0].description);
        await page.fill('.item-quantity', String(testData.items[0].quantity));
        await page.fill('.item-unit-price', String(testData.items[0].price));
    });

    test('should calculate tax and discount correctly in preview and PDF', async ({ page }) => {
        // 1. Add Tax and Discount
        await page.fill('#taxRate', '10'); // 10%
        await page.fill('#discountAmount', '100'); // 100 flat off

        // Item total: 2 * 1000 = 2000
        // Subtotal: 2000
        // Tax: 10% of 2000 = 200
        // Discount: 100
        // Total: 2000 + 200 - 100 = 2100

        await page.click('button:has-text("Generate Bill")');
        await expect(page.locator('#invoice')).toBeVisible();

        // 2. Verify Preview
        await expect(page.locator('#subtotalRow')).toBeVisible();
        await expect(page.locator('#displaySubtotal')).toContainText('2,000');

        await expect(page.locator('#taxRow')).toBeVisible();
        await expect(page.locator('#displayTaxAmount')).toContainText('200');

        await expect(page.locator('#discountRow')).toBeVisible();
        await expect(page.locator('#displayDiscount')).toContainText('100');

        await expect(page.locator('#displayBalanceDue')).toContainText('2,100');

        // 3. Verify PDF
        const downloadPromise = page.waitForEvent('download');
        await page.click('#downloadBtn');
        const download = await downloadPromise;
        const path = await download.path();

        const pdfBuffer = fs.readFileSync(path);
        const data = await pdfParse(pdfBuffer);

        // Check for calculated values in PDF text
        expect(data.text).toContain('Subtotal');
        expect(data.text).toContain('Tax (10%)');
        expect(data.text).toContain('Discount');
        expect(data.text).toContain('2,100');
    });

    test('should display due date when provided', async ({ page }) => {
        const today = new Date().toISOString().split('T')[0];
        // Set info
        await page.fill('#invoiceDate', today);
        await page.fill('#invoiceDueDate', '2025-12-31');

        await page.click('button:has-text("Generate Bill")');

        // Verify Preview
        const dueDateRow = page.locator('#dueDateRow');
        await expect(dueDateRow).toBeVisible();
        await expect(page.locator('#displayInvoiceDueDate')).toContainText('31/12/2025');

        // Verify PDF
        const downloadPromise = page.waitForEvent('download');
        await page.click('#downloadBtn');
        const download = await downloadPromise;
        const path = await download.path();

        const pdfBuffer = fs.readFileSync(path);
        const data = await pdfParse(pdfBuffer);

        expect(data.text).toContain('Due Date:');
        expect(data.text).toContain('31/12/2025');
    });

    test('should hide due date if not provided', async ({ page }) => {
        // Ensure due date is empty
        await page.fill('#invoiceDueDate', '');

        await page.click('button:has-text("Generate Bill")');

        // Verify Preview
        const dueDateRow = page.locator('#dueDateRow');
        await expect(dueDateRow).toBeHidden();

        // Verify PDF
        const downloadPromise = page.waitForEvent('download');
        await page.click('#downloadBtn');
        const download = await downloadPromise;
        const path = await download.path();

        const pdfBuffer = fs.readFileSync(path);
        const data = await pdfParse(pdfBuffer);

        expect(data.text).not.toContain('Due Date:');
    });

    test('should display correctly with different currency', async ({ page }) => {
        // Change to USD
        await page.fill('#currencyCode', 'USD');

        await page.click('button:has-text("Generate Bill")');

        // Verify Preview
        const balance = await page.locator('#displayBalanceDue').innerText();
        expect(balance).toContain('$');
    });

    test('should include custom notes and instructions in PDF', async ({ page }) => {
        const notes = 'My custom notes';
        const instructions = 'Please pay via Bank Transfer';

        await page.fill('#invoiceNotes', notes);
        await page.fill('#invoiceInstructions', instructions);

        await page.click('button:has-text("Generate Bill")');

        // Verify PDF
        const downloadPromise = page.waitForEvent('download');
        await page.click('#downloadBtn');
        const download = await downloadPromise;
        const path = await download.path();

        const pdfBuffer = fs.readFileSync(path);
        const data = await pdfParse(pdfBuffer);

        expect(data.text).toContain(notes);
        expect(data.text).toContain(instructions);
    });

});

test.describe('History and JSON I/O', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('should load invoice from history', async ({ page }) => {
        // 1. Fill basic info and generate
        await page.fill('#sellerName', 'History Seller');
        await page.fill('#sellerAddress', 'Seller Address');
        await page.fill('#billToName', 'Customer');
        await page.fill('#billToAddress', 'Address');
        await page.fill('#invoiceNumber', 'HIST-001');
        await page.fill('.item-description', 'Item');
        await page.fill('.item-quantity', '1');
        await page.fill('.item-unit-price', '100');

        await page.click('button:has-text("Generate Bill")');

        // 2. Clear form
        page.on('dialog', async d => await d.accept());
        await page.click('#resetDraftBtn');
        // resetDraft sets number to 1 (if HIST-001 parsing fails)
        await expect(page.locator('#invoiceNumber')).not.toHaveValue('HIST-001');

        // 3. Open history and load
        await page.click('#historyToggle');
        const historyItem = page.locator('.history-item').first();
        await expect(historyItem).toBeVisible();
        await historyItem.click();

        // 4. Verify form is populated (wait for value)
        await page.waitForFunction((num) => {
            const el = document.getElementById('invoiceNumber');
            return el && el.value === num;
        }, 'HIST-001');

        await expect(page.locator('#invoiceNumber')).toHaveValue('HIST-001');
        await expect(page.locator('#sellerName')).toHaveValue('History Seller');
    });

    test('should delete invoice from history', async ({ page }) => {
        await page.fill('#sellerName', 'Delete Seller');
        await page.fill('#sellerAddress', 'Address');
        await page.fill('#billToName', 'Customer');
        await page.fill('#billToAddress', 'Address');
        await page.fill('#invoiceNumber', 'DEL-001');
        await page.fill('.item-description', 'Item');
        await page.click('button:has-text("Generate Bill")');

        await page.click('#historyToggle');
        const historyItem = page.locator('.history-item').first();
        await expect(historyItem).toBeVisible();

        await historyItem.locator('.history-item-delete').click();
        await expect(page.locator('.history-item')).toHaveCount(0);
        await expect(page.locator('.history-empty')).toBeVisible();
    });

    test('should import JSON from textarea', async ({ page }) => {
        const exportData = {
            schemaVersion: 1,
            settings: { currency: 'USD', locale: 'en-US' },
            seller: { name: 'Imported Seller', address: 'Import Address', email: '', phone: '' },
            billTo: { name: 'Imported Customer', address: 'Customer Address', email: '', phone: '' },
            invoice: { title: 'INVOICE', number: 'IMP-123', date: '2025-01-01', dueDate: '', notes: '', instructions: '' },
            items: [{ description: 'Imported Item', quantity: 5, unitPrice: 100 }],
            totals: { taxRate: 0, discount: 0 },
            meta: { showInvoice: false }
        };

        await page.fill('#jsonData', JSON.stringify(exportData));

        // Verify JSON is in textarea
        const val = await page.inputValue('#jsonData');
        expect(val).toContain('Imported Seller');

        await page.click('#importJsonBtn');

        // Wait for JSON to be applied
        await page.waitForFunction((name) => {
            const el = document.getElementById('sellerName');
            return el && el.value === name;
        }, 'Imported Seller');

        await expect(page.locator('#sellerName')).toHaveValue('Imported Seller');
        await expect(page.locator('#invoiceNumber')).toHaveValue('IMP-123');
        const items = page.locator('.item-row');
        await expect(items).toHaveCount(1);
    });

    test('should download JSON file', async ({ page }) => {
        await page.fill('#sellerName', 'Download Seller');
        await page.fill('#invoiceNumber', 'JSON-DL-01');

        const downloadPromise = page.waitForEvent('download');
        await page.click('#downloadJsonBtn');
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toBe('invoice-JSON-DL-01.json');
        const path = await download.path();
        const content = JSON.parse(fs.readFileSync(path, 'utf8'));
        expect(content.seller.name).toBe('Download Seller');
        expect(content.invoice.number).toBe('JSON-DL-01');
    });

    test('should handle large number of items for PDF generation', async ({ page }) => {
        await page.fill('#sellerName', 'Large Seller');
        await page.fill('#sellerAddress', 'Address');
        await page.fill('#billToName', 'Customer');
        await page.fill('#billToAddress', 'Address');
        await page.fill('#invoiceNumber', 'LRG-001');

        for (let i = 0; i < 29; i++) {
            await page.click('#addItemBtn');
        }

        const items = page.locator('.item-row');
        await expect(items).toHaveCount(30);

        await items.last().locator('.item-description').fill('Last Item');
        await items.last().locator('.item-quantity').fill('1');
        await items.last().locator('.item-unit-price').fill('100');

        await page.click('button:has-text("Generate Bill")');
        await expect(page.locator('#invoice')).toBeVisible();

        const downloadPromise = page.waitForEvent('download');
        await page.click('#downloadBtn');
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.pdf');

        const path = await download.path();
        const pdfBuffer = fs.readFileSync(path);
        const data = await pdfParse(pdfBuffer);
        expect(data.text).toContain('Last Item');
    });
});
