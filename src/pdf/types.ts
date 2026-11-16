// Shape returned by getDataFromForm() in src/js/modules/form.js.
interface Contact {
  name: string;
  address: string;
  email: string;
  phone: string;
}

export interface InvoiceData {
  settings: { currency: string; locale: string };
  seller: Contact;
  billTo: Contact;
  invoice: {
    title: string;
    date: string;
    dueDate: string;
    number: string;
    notes: string;
    instructions: string;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totals: {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount: number;
    total: number;
  };
}
