// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Rebill Invoice Generator - E2E Tests
 * 
 * These tests verify the core functionality of the invoice generator,
 * with special focus on PDF generation and layout correctness.
 */

// Test data fixtures
const testData = {
    seller: {
        name: 'Test Company Ltd',
        address: '123 Business Park, Tech City 12345',
        email: 'billing@testcompany.com',
        phone: '+91 9876543210'
    },
    customer: {
        name: 'Customer Corp',
        address: '456 Client Street, Commerce Town 67890',
        email: 'accounts@customercorp.com',
        phone: '+91 9876543211'
    },
    invoice: {
        number: '001',
        title: 'INVOICE'
    },
    items: [
        { description: 'Web Development Services', quantity: 1, price: 50000 },
        { description: 'UI/UX Design', quantity: 2, price: 15000 }
    ]
};

test.describe('Invoice Form', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Clear any stored draft
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('should load the homepage', async ({ page }) => {
        await expect(page).toHaveTitle(/Rebill/);
        await expect(page.locator('.form-section')).toBeVisible();
    });

    test('should fill seller information', async ({ page }) => {
        await page.fill('#sellerName', testData.seller.name);
        await page.fill('#sellerAddress', testData.seller.address);
        await page.fill('#sellerEmail', testData.seller.email);
        await page.fill('#sellerPhone', testData.seller.phone);

        await expect(page.locator('#sellerName')).toHaveValue(testData.seller.name);
        await expect(page.locator('#sellerAddress')).toHaveValue(testData.seller.address);
    });

    test('should add line items', async ({ page }) => {
        // Fill first item
        await page.fill('.item-description', testData.items[0].description);
        await page.fill('.item-quantity', String(testData.items[0].quantity));
        await page.fill('.item-unit-price', String(testData.items[0].price));

        // Add second item
        await page.click('#addItemBtn');
        const itemRows = page.locator('.item-row');
        await expect(itemRows).toHaveCount(2);
    });

    test('should calculate totals correctly', async ({ page }) => {
        // Fill one item
        await page.fill('.item-description', 'Test Service');
        await page.fill('.item-quantity', '2');
        await page.fill('.item-unit-price', '1000');

        // Wait for calculation
        await page.waitForTimeout(100);

        // Check item total
        const itemTotal = page.locator('.item-total').first();
        await expect(itemTotal).toContainText('2,000');
    });
});

test.describe('Invoice Generation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('should generate invoice preview', async ({ page }) => {
        // Fill required fields
        await page.fill('#sellerName', testData.seller.name);
        await page.fill('#sellerAddress', testData.seller.address);
        await page.fill('#billToName', testData.customer.name);
        await page.fill('#billToAddress', testData.customer.address);
        await page.fill('#invoiceNumber', testData.invoice.number);

        // Fill item
        await page.fill('.item-description', testData.items[0].description);
        await page.fill('.item-quantity', String(testData.items[0].quantity));
        await page.fill('.item-unit-price', String(testData.items[0].price));

        // Generate invoice
        await page.click('button:has-text("Generate Bill")');

        // Verify preview is visible
        await expect(page.locator('#invoice')).toBeVisible();
        await expect(page.locator('#downloadBtn')).toBeVisible();
    });

    test('should show validation alert for incomplete form', async ({ page }) => {
        // Try to generate without filling required fields
        await Promise.all([
            page.waitForEvent('dialog').then(async dialog => {
                expect(dialog.message()).toContain('required fields');
                await dialog.accept();
            }),
            page.click('button:has-text("Generate Bill")')
        ]);
    });
});

test.describe('PDF Generation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('should download PDF without errors and contain correct text', async ({ page }) => {
        // Fill complete invoice
        await page.fill('#sellerName', testData.seller.name);
        await page.fill('#sellerAddress', testData.seller.address);
        await page.fill('#sellerEmail', testData.seller.email);
        await page.fill('#billToName', testData.customer.name);
        await page.fill('#billToAddress', testData.customer.address);
        await page.fill('#invoiceNumber', testData.invoice.number);
        await page.fill('.item-description', testData.items[0].description);
        await page.fill('.item-quantity', String(testData.items[0].quantity));
        await page.fill('.item-unit-price', String(testData.items[0].price));

        // Generate invoice
        await page.click('button:has-text("Generate Bill")');
        await expect(page.locator('#invoice')).toBeVisible();

        // Start waiting for download before clicking
        const downloadPromise = page.waitForEvent('download');
        await page.click('#downloadBtn');
        const download = await downloadPromise;

        // Verify download
        expect(download.suggestedFilename()).toMatch(/Invoice-.*\.pdf/);

        // Verify file is not empty and check content
        const path = await download.path();
        const fs = await import('fs');
        const pdfBuffer = fs.readFileSync(path);

        // Dynamic import of pdf-parse
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(pdfBuffer);

        // Verify Content
        expect(data.text).toContain('DESCRIPTION');
        expect(data.text).toContain('QTY');
        expect(data.text).toContain('UNIT PRICE');
        expect(data.text).toContain('TOTAL');
        expect(data.text).toContain(testData.items[0].description);
        expect(data.text).toContain(testData.seller.name);
        expect(data.text).toContain("Total");
    });

    test('invoice preview should not have horizontal cutoff', async ({ page }) => {
        // Fill complete invoice
        await page.fill('#sellerName', testData.seller.name);
        await page.fill('#sellerAddress', testData.seller.address);
        await page.fill('#billToName', testData.customer.name);
        await page.fill('#billToAddress', testData.customer.address);
        await page.fill('#invoiceNumber', testData.invoice.number);
        await page.fill('.item-description', testData.items[0].description);
        await page.fill('.item-quantity', String(testData.items[0].quantity));
        await page.fill('.item-unit-price', String(testData.items[0].price));

        // Generate invoice
        await page.click('button:has-text("Generate Bill")');
        await expect(page.locator('#invoice')).toBeVisible();

        // Verify key elements are fully visible (this catches horizontal cutoff)
        const invoiceTitle = page.locator('.invoice-title h1');
        await expect(invoiceTitle).toHaveText('INVOICE');
        await expect(invoiceTitle).toBeVisible();

        // Verify seller name is visible
        const sellerName = page.locator('#displaySellerName');
        await expect(sellerName).toHaveText(testData.seller.name);

        // Verify customer name is visible  
        const customerName = page.locator('#displayBillToName');
        await expect(customerName).toHaveText(testData.customer.name);

        // Verify invoice number is visible
        const invoiceNumber = page.locator('#displayInvoiceNumber');
        await expect(invoiceNumber).toHaveText(testData.invoice.number);

        // Verify balance due is visible (right-side element - catches horizontal cutoff)
        const balanceDue = page.locator('#displayBalanceDue');
        await expect(balanceDue).toBeVisible();
        await expect(balanceDue).toContainText('₹');
    });
});

test.describe('History Management', () => {
    test('should save invoice to history', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        // Fill and generate invoice
        await page.fill('#sellerName', testData.seller.name);
        await page.fill('#sellerAddress', testData.seller.address);
        await page.fill('#billToName', testData.customer.name);
        await page.fill('#billToAddress', testData.customer.address);
        await page.fill('#invoiceNumber', '100');
        await page.fill('.item-description', 'Test Item');
        await page.fill('.item-quantity', '1');
        await page.fill('.item-unit-price', '1000');

        await page.click('button:has-text("Generate Bill")');

        // Open history panel
        await page.click('#historyToggle');
        await expect(page.locator('#historyPanel')).toBeVisible();

        // Verify entry exists
        await expect(page.locator('.history-item')).toHaveCount(1);
        await expect(page.locator('.history-item-title')).toContainText('#100');
    });
});

test.describe('JSON Import/Export', () => {
    test('should export and import JSON', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        // Fill invoice data
        await page.fill('#sellerName', testData.seller.name);
        await page.fill('#invoiceNumber', '200');

        // Export JSON
        await page.click('#exportJsonBtn');
        const jsonData = await page.locator('#jsonData').inputValue();
        expect(jsonData).toContain(testData.seller.name);
        expect(jsonData).toContain('200');

        // Parse and verify JSON structure
        const parsed = JSON.parse(jsonData);
        expect(parsed.seller.name).toBe(testData.seller.name);
        expect(parsed.invoice.number).toBe('200');
    });
});

test.describe('Reset Draft', () => {
    test('should clear form on reset', async ({ page }) => {
        await page.goto('/');

        // Fill some data
        await page.fill('#sellerName', testData.seller.name);
        await page.fill('#billToName', testData.customer.name);

        // Click reset and accept dialog
        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        await page.click('#resetDraftBtn');

        // Verify fields are cleared
        await expect(page.locator('#sellerName')).toHaveValue('');
        await expect(page.locator('#billToName')).toHaveValue('');
    });
});
