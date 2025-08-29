// src/utills/useGraduatingListPrintPDF.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const useGraduatingListPrintPDF = () => {
  const loadImageAsBase64 = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  // Map 5.0 scale -> class of degree (text will be uppercased later)
  const degreeClass = (cgpa) => {
    const v = Number(cgpa);
    if (!Number.isFinite(v)) return '—';
    if (v >= 4.50) return 'First Class';
    if (v >= 3.50) return 'Second Class Upper';
    if (v >= 2.40) return 'Second Class Lower';
    if (v >= 1.50) return 'Third Class';
    if (v >= 1.00) return 'Pass';
    return '—';
  };

  const generatePDF = async (payload, formData) => {
    const { students = [], header = {} } = payload || {};
    const logoBase64 = await loadImageAsBase64('/uam.jpeg');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // layout
    const left = 10;
    const right = 10;
    const tableTop = 60;          // same visual top for table
    const textBlack = [0, 0, 0];

    // Footer content + metrics (compute exact reserve)
    const keyText =
      'KEY: CCC = Cumulative Credit Carried, CCE = Cumulative Credit Earned, CPE = Cumulative Points Earned, CGPA = Cumulative Grade Point Average';

    // Use jsPDF to wrap exactly as the page will
    const keyWrapped = doc.splitTextToSize(keyText, pageWidth - left - right);

    // Vertical metrics (mm)
    const lh = 4.2;          // line height for text at 9pt
    const gapKeyToMin = 3.0; // a little tighter
    const gapToSignatures = 6.0;
    const sigGap = 5.0;      // distance between signature lines
    const bottomPadding = 10; // breathing room incl. page number area

    // Total footer reserve height:
    // wrapped KEY + gap + "Minimum..." line + gap + 4 signature lines + bottom padding
    const footerReserve =
      keyWrapped.length * lh +
      gapKeyToMin +
      lh +
      gapToSignatures +
      4 * sigGap +
      bottomPadding;

    // Draw header/footer on every page, anchored from bottom
    const drawHeaderFooter = () => {
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Header
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...textBlack);
        doc.text(
          'JOSEPH SARWUAN TARKA UNIVERSITY, P. M. B. 2373, MAKURDI',
          pageWidth / 2,
          15,
          { align: 'center' }
        );

        const lw = 15, lhLogo = 15, lx = (pageWidth - lw) / 2, ly = 18;
        doc.addImage(logoBase64, 'JPEG', lx, ly, lw, lhLogo);

        doc.setFontSize(12);
        doc.text(header.title || 'GRADUATING STUDENTS LIST (PRINT)', pageWidth / 2, 38, { align: 'center' });

        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.text(`College: ${header.college || 'Biological Sciences'}`, left, 45);
        doc.text(`Department: ${header.department || 'Biochemistry'}`, left, 52);
        doc.text(`Programme: ${header.programme || 'B. Sc. Biochemistry'}`, left, 59);

        doc.text(`Level: 400`, pageWidth - right, 45, { align: 'right' });
        doc.text(
          `Semester: ${Number(formData.semester) === 1 ? 'First' : 'Second'}`,
          pageWidth - right,
          52,
          { align: 'right' }
        );
        doc.text(`Session: ${formData.session}`, pageWidth - right, 59, { align: 'right' });

        // Footer — anchor from bottom using computed reserve
        // Start Y so that the footer fits exactly into the reserved box.
        let y = pageHeight - footerReserve + 2; // small top inset in the footer box

        // KEY
        doc.setFont('times', 'normal');
        keyWrapped.forEach((line, idx) => {
          doc.text(line, left, y + idx * lh);
        });
        y += keyWrapped.length * lh + gapKeyToMin;

        // Minimum line
        doc.text('Minimum CCE required for Graduation: UME = 135, DE = 86', left, y);
        y += gapToSignatures;

        // Signatures
        y += sigGap;
        doc.text('Dept. Exam Officer: MR. I. Y. JOEL      ————————————        Date: —————————', left, y);
        y += sigGap;
        doc.text('College Exam Officer: Mr. O. A. Ojobo   ————————————        Date: —————————', left, y);
        y += sigGap;
        doc.text('Head of Dept: DR. (MRS.) T. AKANDE      ————————————        Date: —————————', left, y);
        y += sigGap;
        doc.text('Dean of College: PROF. C. U. AGUORU     ————————————        Date: —————————', left, y);

        // Page number near bottom
        doc.setFontSize(9);
        doc.text(`${i}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
      }
    };

    // Columns (NO Adm., NO Remarks)
    const colsProfile = ['S/No.', 'Reg. Number', 'Name of Student'];
    const colsCgpaLevels = ['100', '200', '300']; // per-level CGPAs
    const colsCum = ['CCC', 'CCE', 'CPE', 'CGPA', 'CLASS OF DEGREE']; // uppercase header

    const headRow1 = [
      { content: 'Profile', colSpan: colsProfile.length, styles: { halign: 'left' } },
      { content: 'Cumulative Grade Point Average', colSpan: colsCgpaLevels.length, styles: { halign: 'center' } },
      { content: '400', colSpan: colsCum.length, styles: { halign: 'center' } },
    ];
    const headRow2 = [...colsProfile, ...colsCgpaLevels, ...colsCum];

    // Only ELIGIBLE students
    const eligibleOnly = students.filter(s => s?.eligibility?.eligible);

    const body = eligibleOnly.map((s, idx) => {
      const c = s.cumulative || {};
      const L = s.cgpaByLevel || {};

      const cgpa100 = L.L100 != null ? Number(L.L100).toFixed(2) : 'NR';
      const cgpa200 = L.L200 != null ? Number(L.L200).toFixed(2) : 'NR';
      const cgpa300 = L.L300 != null ? Number(L.L300).toFixed(2) : 'NR';

      const CCC = Math.round(c.CCC || 0);
      const CCE = Math.round(c.CCE || 0);
      const CPE = Math.round(c.CPE || 0);
      const CGPA = c.CGPA != null ? Number(c.CGPA).toFixed(2) : 'NR';
      const CLASS = (degreeClass(c.CGPA) || '—').toUpperCase(); // UPPERCASE

      return [
        idx + 1,
        s.regNo,
        s.fullName,
        cgpa100,
        cgpa200,
        cgpa300,
        CCC,
        CCE,
        CPE,
        CGPA,
        CLASS
      ];
    });

    // Indices for styling
    const idxCGPA100 = colsProfile.length + 0;
    const idxCGPA200 = colsProfile.length + 1;
    const idxCGPA300 = colsProfile.length + 2;
    const idxCumStart = colsProfile.length + colsCgpaLevels.length; // CCC
    const idxCCC = idxCumStart + 0;
    const idxCCE = idxCumStart + 1;
    const idxCPE = idxCumStart + 2;
    const idxCGPAcum = idxCumStart + 3;
    const idxClass = idxCumStart + 4;

    autoTable(doc, {
      startY: tableTop,
      // 🔧 Reserve exactly the footer height so the table never collides, but no extra padding
      margin: { top: tableTop, bottom: Math.ceil(footerReserve), left, right },
      head: [headRow1, headRow2],
      body,
      tableWidth: 'auto',
      rowPageBreak: 'avoid',
      styles: {
        font: 'times',
        fontSize: 8,
        cellPadding: 1.0, // a tad tighter
        lineWidth: 0.1,
        lineColor: textBlack,
        textColor: textBlack,
        valign: 'middle',
        overflow: 'linebreak',
        fillColor: null,
      },
      headStyles: {
        fontStyle: 'bold',
        fillColor: null,
        textColor: textBlack,
        lineColor: textBlack,
      },
      bodyStyles: {
        fillColor: null,
        textColor: textBlack,
        lineColor: textBlack,
      },
      alternateRowStyles: {
        fillColor: null,
        textColor: textBlack,
      },
      columnStyles: {
        0: { cellWidth: 8,  halign: 'left' },   // S/No.
        1: { cellWidth: 32, halign: 'left' },   // Reg No
        2: { cellWidth: 62, halign: 'left' },   // Name
        [idxCGPA100]: { halign: 'center', cellWidth: 16 },
        [idxCGPA200]: { halign: 'center', cellWidth: 16 },
        [idxCGPA300]: { halign: 'center', cellWidth: 16 },
        [idxCCC]:     { halign: 'center', cellWidth: 16 },
        [idxCCE]:     { halign: 'center', cellWidth: 16 },
        [idxCPE]:     { halign: 'center', cellWidth: 16 },
        [idxCGPAcum]: { halign: 'center', cellWidth: 18 },
        [idxClass]:   { halign: 'left',   cellWidth: 36 },
      },
      didDrawPage: () => {
        drawHeaderFooter();
      }
    });

    doc.save(`Graduating_List_PRINT_${formData.session}_Sem${formData.semester}_400L.pdf`);
  };

  return { generatePDF };
};

export default useGraduatingListPrintPDF;
