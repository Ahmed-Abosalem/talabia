/**
 * Utility for generating and printing order receipts for sellers.
 * Provides professional A4, RTL-compatible styling.
 * Using the "Golden Standard" Blob URL approach for maximum stability.
 */

import { logoBase64 } from './logoBase64';
import { formatCurrency, formatDate } from './formatters';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";

/**
 * Ensures that image URLs are absolute for correct rendering inside Blob URLs.
 */
export const makeAbsoluteUrlForPrint = (url) => {
  if (!url || typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";

  if (/^https?:\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:")) {
    return u;
  }

  // protocol-relative //example.com/img.jpg
  if (u.startsWith("//")) {
    try {
      return `${window.location.protocol}${u}`;
    } catch {
      return u;
    }
  }

  if (API_BASE_URL) {
    if (u.startsWith("/")) return `${API_BASE_URL}${u}`;
    return `${API_BASE_URL}/${u.replace(/^\.?\//, "")}`;
  }

  try {
    const origin = window.location.origin;
    if (u.startsWith("/")) return `${origin}${u}`;
    return `${origin}/${u.replace(/^\.?\//, "")}`;
  } catch {
    return u;
  }
};

/**
 * Generates the HTML for a professional print receipt.
 */
export const generateReceiptPrintHTML = (item) => {
  const orderDate = item.createdAt ? formatDate(item.createdAt) : 'غير متوفر';

  const absoluteProductImage = item.imageUrl ? makeAbsoluteUrlForPrint(item.imageUrl) : "";
  const itemPosition = item.indexInOrder && item.totalItemsInOrder
    ? `المنتج ${item.indexInOrder} من أصل ${item.totalItemsInOrder}`
    : `المنتج رقم ${item.indexInOrder || '—'}`;

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
        <title>سند طلب - ${item.orderCode || 'بدون رقم'}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: "Tajawal", system-ui, -apple-system, sans-serif;
            padding: 0;
            margin: 0;
            background: #fff;
            color: #111827;
            line-height: 1.5;
          }
          .receipt-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
          }
          .header {
            display: flex;
            flex-direction: column;
            align-items: center;
            border-bottom: 2px solid #f3f4f6;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          .logo {
            max-height: 90px;
            object-fit: contain;
            margin-bottom: 10px;
          }
          .store-info {
            text-align: center;
          }
          .document-title {
            text-align: center;
            font-size: 24px;
            font-weight: 900;
            margin: 30px 0;
            color: #111827;
            text-transform: uppercase;
            border-bottom: 1px solid #e5e7eb;
            display: inline-block;
            padding-bottom: 5px;
          }
          .title-wrap { text-align: center; }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
            background: #f9fafb;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #f3f4f6;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 2px;
            font-weight: 700;
          }
          .info-value {
            font-size: 15px;
            font-weight: 800;
            color: #111827;
          }
          .order-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .order-table th {
            background: #f3f4f6;
            color: #4b5563;
            text-align: right;
            padding: 12px 15px;
            font-weight: 800;
            font-size: 13px;
            border-bottom: 2px solid #e5e7eb;
          }
          .order-table td {
            padding: 15px;
            border-bottom: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .product-cell {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .product-image {
            width: 60px;
            height: 60px;
            object-fit: contain;
            border-radius: 8px;
            background: #fff;
            border: 1px solid #f3f4f6;
          }
          .total-section {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            margin-top: 10px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 12px;
          }
          .total-row {
            display: flex;
            width: 250px;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 14px;
          }
          .grand-total {
            font-size: 18px;
            font-weight: 900;
            color: #2563eb;
            margin-top: 5px;
            padding-top: 5px;
            border-top: 1px solid #e5e7eb;
          }
          .footer {
            margin-top: 60px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #f3f4f6;
            padding-top: 15px;
          }
          .badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 800;
            background: #e0f2fe;
            color: #0369a1;
          }
          @media print {
            body { background: #fff; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <img src="${makeAbsoluteUrlForPrint("/logo.png")}" onerror="this.src='${logoBase64}'" alt="Logo" class="logo" />
            <div class="store-info">
              <p style="margin: 0; color: #6b7280; font-size: 13px; font-weight: 800; border: 1px solid #e5e7eb; padding: 4px 15px; border-radius: 20px;">سند رسمي للبائع</p>
            </div>
          </div>

          <div class="title-wrap">
            <h1 class="document-title">تفاصيل المنتج في الطلب</h1>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">رقم الطلب</span>
              <span class="info-value">#${item.orderCode || '—'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">تسلسل المنتج</span>
              <span class="info-value" style="color: #2563eb;">${itemPosition}</span>
            </div>
            <div class="info-item">
              <span class="info-label">تاريخ السند</span>
              <span class="info-value">${orderDate}</span>
            </div>
            <div class="info-item">
              <span class="info-label">طريقة الدفع</span>
              <span class="info-value">
                ${String(item.paymentMethod).toUpperCase() === 'COD' ? 'الدفع عند الاستلام' :
      String(item.paymentMethod).toUpperCase() === 'WALLET' ? 'الدفع بالمحفظة' :
        String(item.paymentSubMethod).toUpperCase() === 'BANK_TRANSFER' ? 'الحوالة البنكية' :
          'الدفع بالبطاقة'
    }
              </span>
            </div>
          </div>

          <table class="order-table">
            <thead>
              <tr>
                <th>تفاصيل المنتج</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="product-cell">
                    ${absoluteProductImage ? `<img src="${absoluteProductImage}" class="product-image" />` : ''}
                    <div>
                      <div style="font-weight: 900; font-size: 14px;">${item.productName || 'اسم المنتج'}</div>
                      <div style="font-size: 11px; color: #6b7280; margin-top: 3px;">
                        ${item.selectedColor ? `اللون: ${item.selectedColor}` : ''} 
                        ${item.selectedSize ? ` | الحجم: ${item.selectedSize}` : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td style="font-weight: 700;">${item.quantity || 1}</td>
                <td style="font-weight: 700;">${formatCurrency(item.price || 0)}</td>
                <td style="font-weight: 900; color: #111827;">${formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span style="font-weight: 700; color: #6b7280;">الإجمالي الفرعي:</span>
              <span style="font-weight: 800;">${formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
            </div>
            <div class="total-row grand-total">
              <span>إجمالي السند:</span>
              <span>${formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
            </div>
          </div>

          <div class="footer">
            <p style="font-weight: 800;">شكراً لاستخدامكم نظام إدارة الطلبات</p>
            <p style="font-size: 10px; font-weight: 700;">تم إنشاء هذا السند برمجياً عبر النظام الموحد للمتجر</p>
          </div>
        </div>

        <script>
          window.onload = () => {
             setTimeout(() => {
               window.print();
             }, 800);
          };
        </script>
      </body>
    </html>
  `;
};

/**
 * ✅ PROFESSIONAL Standard: Opens the print window via Blob URL.
 */
export const printReceipt = (html, showToast) => {
  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const win = window.open(url, "_blank");
    if (!win) {
      URL.revokeObjectURL(url);
      if (showToast) {
        showToast("تعذّر فتح نافذة الطباعة. يرجى تفعيل السماح بالنوافذ المنبثقة.", "error");
      }
      return false;
    }

    win.addEventListener("load", () => {
      try { win.focus?.(); } catch (e) { }
      setTimeout(() => {
        try { URL.revokeObjectURL(url); } catch (e) { }
      }, 3000);
    }, { once: true });

    return true;
  } catch (err) {
    console.error("Print utility error:", err);
    return false;
  }
};
