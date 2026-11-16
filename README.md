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

npm install
npm run dev
```

Open http://localhost:5173

To build the static site into `dist/`:

```bash
npm run build
```

## Usage

1. Fill in seller and customer details
2. Add line items
3. Click **Generate Bill** to preview
4. Click **Download PDF** to save

Your draft auto-saves as you type. Data persists in `localStorage`.

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript, built with Vite
- PDFs made in the browser with [pdfcn](https://pdfcn.dev) React components rendered by [Takumi](https://takumi.kane.tw) (WebAssembly)

## License

MIT
