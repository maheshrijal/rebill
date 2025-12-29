# Rebill

A free, open-source invoice generator that runs entirely in your browser. No server, no sign-up, no tracking — your data stays on your device.

🔗 **[rebill.mrjl.dev](https://rebill.mrjl.dev)**

## Features

- ✅ **100% Client-Side** — Works offline, no backend required
- ✅ **Auto-Save** — Drafts persist in localStorage
- ✅ **PDF Export** — High-quality PDF with multi-page support
- ✅ **JSON Import/Export** — Backup and restore invoice data
- ✅ **Responsive** — Works on desktop and mobile
- ✅ **Privacy-First** — No data leaves your browser

## Quick Start

```bash
# Clone the repository
git clone https://github.com/maheshrijal/rebill.git
cd rebill

# Start dev server (requires Node.js)
make dev

# Or use Python
make serve
```

Open http://localhost:3000

## Usage

1. Fill in seller and customer details
2. Add line items
3. Click **Generate Bill** to preview
4. Click **Download PDF** to save

Your draft auto-saves as you type. Data persists in `localStorage`.

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript
- jsPDF + html2canvas (PDF generation)
- No frameworks, no build step

## License

MIT
