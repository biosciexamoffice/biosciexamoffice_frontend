// src/utills/useGraduatingListPDF.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const useGraduatingListPDF = () => {
  const loadImageAsBase64 = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const degreeClass = (cgpa) => {
    const v = Number(cgpa);
    if (!Number.isFinite(v)) return '—';
    if (v >= 4.50) return 'First Class';
    if (v >= 3.50) return 'Second Class (Upper)';
    if (v >= 2.40) return 'Second Class (Lower)';
    if (v >= 1.50) return 'Third Class';
    if (v >= 1.00) return 'Pass';
    return '—';
  };

  const failedColText = (s) => {
    const list = s?.failedCourseDetails;
    if (!Array.isArray(list) || list.length === 0) return '—';
    return list
      .map(({ code, score, grade }) => {
        const c = (code || '').toString().replace(/\s+/g, '');
        const sc = typeof score === 'number' ? String(Math.round(score)) : (score ?? '');
        const g = (grade || '').toUpperCase();
        return [c, sc, g].filter(Boolean).join(' ');
      })
      .join(' | ');
  };

  const generatePDF = async (payload, formData) => {
    const { students = [], header = {} } = payload || {};
    const logoBase64 = await loadImageAsBase64('/uam.jpeg');

    // === WIDER PAGE (legal) + landscape ===
    const PAGE_FORMAT = 'legal'; // change to 'a4' if you must keep A4
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: PAGE_FORMAT });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // tighter margins to gain width
    const left = 8, right = 8;
    const tableTop = 58;
    const bottomPad = 56;

    const drawHeaderFooter = () => {
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Header
        doc.setFont('times', 'bold'); doc.setFontSize(12);
        doc.text('JOSEPH SARWUAN TARKA UNIVERSITY, P. M. B. 2373, MAKURDI', pageWidth / 2, 14, { align: 'center' });

        const lw = 14, lh = 14, lx = (pageWidth - lw) / 2, ly = 16.5;
        doc.addImage(logoBase64, 'JPEG', lx, ly, lw, lh);

        doc.setFontSize(12);
        doc.text(header.title || 'GRADUATING STUDENTS LIST', pageWidth / 2, 35, { align: 'center' });

        doc.setFont('times', 'normal'); doc.setFontSize(11);
        doc.text(`College: ${header.college || 'College Not Provided'}`, left, 42);
        doc.text(`Department: ${header.department || 'Department Not Provided'}`, left, 48.5);
        doc.text(`Programme: ${header.programme || 'Programme Not Provided'}`, left, 55);

        doc.text(`Level: 400`, pageWidth - right, 42, { align: 'right' });
        doc.text(`Semester: ${Number(formData.semester) === 1 ? 'First' : 'Second'}`, pageWidth - right, 48.5, { align: 'right' });
        doc.text(`Session: ${formData.session}`, pageWidth - right, 55, { align: 'right' });

        // Footer (spaced)
        const footerTop = pageHeight - 34;
        const gapKeyToMin = 3.5, gapToSignatures = 9, sigGap = 5.3;

        const keyText =
          'KEY: CCC = Cumulative Credit Carried, CCE = Cumulative Credit Earned, CPE = Cumulative Points Earned, CGPA = Cumulative Grade Point Average';
        const wrappedKey = doc.splitTextToSize(keyText, pageWidth - left - right);
        doc.text(wrappedKey, left, footerTop);

        let y = footerTop + (wrappedKey.length - 1) * 4.0;
        y += gapKeyToMin;
        doc.text('Minimum CCE required for Graduation: UME = 135, DE = 86', left, y);

        y += gapToSignatures;
        doc.text('Dept. Exam Officer: MR. I. Y. JOEL       ————————————   Date: —————————', left, y += sigGap);
        doc.text('College Exam Officer: Mr. O. A. OJOBO   ————————————   Date: —————————', left, y += sigGap);
        doc.text('Head of Dept: DR. (MRS.) T. AKANDE      ————————————   Date: —————————', left, y += sigGap);
        doc.text('Dean of College: PROF. C. U. AGUORU     ————————————   Date: —————————', left, y += sigGap);

        doc.setFontSize(10);
        doc.text(`${i}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
      }
    };

    // ==== Columns (Failed + Remarks included) ====
    const colsProfile = ['S/No.', 'Reg. Number', 'Name of Student', 'Adm.'];
    const colsCgpaLevels = ['100', '200', '300'];
    const colsCum = ['CCC', 'CCE', 'CPE', 'CGPA', 'Class of Degree'];
    const colFails = ['Failed Courses'];              // NEW
    const colsFinal = ['Eligibility / Remarks'];      // KEEP

    const headRow1 = [
      { content: 'Profile', colSpan: colsProfile.length, styles: { halign: 'left' } },
      { content: 'Cumulative Grade Point Average', colSpan: colsCgpaLevels.length, styles: { halign: 'center' } },
      { content: '400', colSpan: colsCum.length, styles: { halign: 'center' } },
      { content: '', colSpan: colFails.length, styles: { halign: 'left' } },
      { content: '', colSpan: colsFinal.length, styles: { halign: 'left' } },
    ];
    const headRow2 = [...colsProfile, ...colsCgpaLevels, ...colsCum, ...colFails, ...colsFinal];

    const body = students.map((s, idx) => {
      const c = s.cumulative || {};
      const L = s.cgpaByLevel || {};
      const cgpa100 = L.L100 != null ? Number(L.L100).toFixed(2) : 'NR';
      const cgpa200 = L.L200 != null ? Number(L.L200).toFixed(2) : 'NR';
      const cgpa300 = L.L300 != null ? Number(L.L300).toFixed(2) : 'NR';
      const CCC = Math.round(c.CCC || 0);
      const CCE = Math.round(c.CCE || 0);
      const CPE = Math.round(c.CPE || 0);
      const CGPA = c.CGPA != null ? Number(c.CGPA).toFixed(2) : 'NR';
      const CLASS = degreeClass(c.CGPA);
      const failedStr = failedColText(s);

      const eligible = s.eligibility?.eligible;
      const reasons = (s.eligibility?.reasons || []).join('; ');
      const remark = eligible ? 'ELIDGIBLE' : `NOT ELIGIBLE — ${reasons || 'See requirements'}`;

      return [
        idx + 1,
        s.regNo,
        s.fullName,
        s.regNoSuffix || '',
        cgpa100,
        cgpa200,
        cgpa300,
        CCC,
        CCE,
        CPE,
        CGPA,
        CLASS,
        failedStr,
        remark
      ];
    });

    // indices
    const idxCGPA100 = colsProfile.length + 0;
    const idxCGPA200 = colsProfile.length + 1;
    const idxCGPA300 = colsProfile.length + 2;
    const idxCumStart = colsProfile.length + colsCgpaLevels.length;
    const idxCCC = idxCumStart + 0;
    const idxCCE = idxCumStart + 1;
    const idxCPE = idxCumStart + 2;
    const idxCGPAcum = idxCumStart + 3;
    const idxClass = idxCumStart + 4;
    const idxFailed = idxCumStart + colsCum.length;
    const idxRemarks = headRow2.length - 1;

    autoTable(doc, {
      startY: tableTop,
      margin: { top: tableTop, bottom: bottomPad, left, right },
      head: [headRow1, headRow2],
      body,
      tableWidth: 'auto',
      rowPageBreak: 'avoid',
      styles: {
        font: 'times',
        fontSize: 9,            // tighter
        cellPadding: 0.9,       // tighter
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        valign: 'middle',
        overflow: 'linebreak',
        textColor: [0, 0, 0],
      },
      headStyles: {
        fontStyle: 'bold',
        fontSize: 9,            // match body scale
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0]
      },
      // No zebra shading
      columnStyles: {
        0: { cellWidth: 8,  halign: 'left' },   // S/No.
        1: { cellWidth: 28, halign: 'left' },   // Reg
        2: { cellWidth: 52, halign: 'left' },   // Name
        3: { cellWidth: 10, halign: 'center' }, // Adm
        [idxCGPA100]: { halign: 'center', cellWidth: 14 },
        [idxCGPA200]: { halign: 'center', cellWidth: 14 },
        [idxCGPA300]: { halign: 'center', cellWidth: 14 },
        [idxCCC]:     { halign: 'center', cellWidth: 14 },
        [idxCCE]:     { halign: 'center', cellWidth: 14 },
        [idxCPE]:     { halign: 'center', cellWidth: 14 },
        [idxCGPAcum]: { halign: 'center', cellWidth: 16 },
        [idxClass]:   { halign: 'center', cellWidth: 22 },
        [idxFailed]:  { halign: 'left',   cellWidth: 52 }, // tighter
        [idxRemarks]: { halign: 'left',   cellWidth: 60 }, // tighter
      },
      didDrawPage: () => drawHeaderFooter()
    });

    doc.save(`Graduating_List_${formData.session}_Sem${formData.semester}_400L.pdf`);
  };

  return { generatePDF };
};

export default useGraduatingListPDF;
