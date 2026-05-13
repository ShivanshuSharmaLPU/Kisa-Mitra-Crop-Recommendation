/**
 * KisanMitra — reportUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared PDF generation utility used by both PestDetection and SoilHealth.
 *
 * Strategy:
 *   1. Build a hidden <div> with the full A4 report HTML/CSS
 *   2. Render it to canvas with html2canvas
 *   3. Slice into A4 pages with jsPDF
 *   4. Call pdf.save(filename) → browser downloads it directly to Downloads folder
 *      — NO popup, NO save/cancel dialog, NO print screen
 *
 * Usage:
 *   import { downloadPDF } from '../utils/reportUtils';
 *   await downloadPDF({ htmlString, filename });
 *
 * Dependencies (load once in index.html or import via CDN in the util itself):
 *   https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
 *   https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
 */

// ─── Lazy-load CDN scripts once ───────────────────────────────────────────────
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensureLibs() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
}

/**
 * downloadPDF({ htmlString, filename, toast? })
 *
 * @param {string}   htmlString  Full HTML of the report (everything inside <body>)
 * @param {string}   filename    e.g. 'KisanMitra_PestReport_2025-01-01.pdf'
 * @param {Function} [onToast]   Optional toast callback for status messages
 */
export async function downloadPDF({ htmlString, filename, onToast }) {
  try {
    await ensureLibs();

    // ── 1. Create a hidden off-screen container ───────────────────────────
    const container = document.createElement('div');
    Object.assign(container.style, {
      position:   'fixed',
      top:        '-9999px',
      left:       '-9999px',
      width:      '794px',   // A4 at 96 dpi
      background: '#ffffff',
      zIndex:     '-1',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      fontSize:   '12.5px',
      lineHeight: '1.55',
      color:      '#1a1a1a',
    });
    container.innerHTML = htmlString;
    document.body.appendChild(container);

    // ── 2. Wait one tick for fonts/images to settle ───────────────────────
    await new Promise(r => setTimeout(r, 120));

    // ── 3. Render to canvas ───────────────────────────────────────────────
    const canvas = await window.html2canvas(container, {
      scale:           2,          // 2× for crisp text
      useCORS:         true,
      allowTaint:      true,
      backgroundColor: '#ffffff',
      logging:         false,
    });

    document.body.removeChild(container);

    // ── 4. Slice into A4 pages and build PDF ─────────────────────────────
    const { jsPDF } = window.jspdf;

    const A4_W_MM  = 210;
    const A4_H_MM  = 297;
    const MARGIN   = 10;   // mm margin on each side
    const usableW  = A4_W_MM - MARGIN * 2;  // 190 mm

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const imgW  = canvas.width;
    const imgH  = canvas.height;

    // Scale factor: usableW mm covers imgW px
    const scaleMM = usableW / imgW;

    // Height in mm of the full rendered content
    const totalMM = imgH * scaleMM;

    // How many A4 pages do we need?
    const pageContentH = A4_H_MM - MARGIN * 2;   // 277 mm per page
    const totalPages   = Math.ceil(totalMM / pageContentH);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Pixels to clip from the top of the canvas for this page
      const srcY      = Math.round((page * pageContentH) / scaleMM);
      const srcHeight = Math.round(pageContentH / scaleMM);

      // Clamp to canvas height
      const clippedH = Math.min(srcHeight, imgH - srcY);
      if (clippedH <= 0) break;

      // Draw only this page's slice onto a temp canvas
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width  = imgW;
      pageCanvas.height = clippedH;
      pageCanvas.getContext('2d').drawImage(
        canvas,
        0, srcY, imgW, clippedH,   // source rect
        0, 0,    imgW, clippedH    // dest rect
      );

      const pageData = pageCanvas.toDataURL('image/jpeg', 0.92);
      const pageHmm  = clippedH * scaleMM;

      pdf.addImage(pageData, 'JPEG', MARGIN, MARGIN, usableW, pageHmm);
    }

    // ── 5. Save — triggers immediate browser download ─────────────────────
    pdf.save(filename);

  } catch (err) {
    console.error('PDF generation failed:', err);
    throw err;
  }
}