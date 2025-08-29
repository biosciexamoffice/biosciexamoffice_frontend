// src/utils/useStatementPDFGenerator.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '@mui/material';

const useStatementPDFGenerator = () => {
  const theme = useTheme();

  const loadImageAsBase64 = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const semesterText = (s) => (Number(s) === 1 ? 'FIRST' : 'SECOND');

  const padScore = (val) => {
    const s = String(val ?? '');
    const num = parseInt(s, 10);
    if (Number.isNaN(num)) return s;
    return num < 10 ? `0${num}` : `${num}`;
  };

  // ---------- layout helpers ----------
  const MARGIN = 10;          // outer page margin
  const GUTTER = 2;           // inner spacing to border

  const drawOuterBorder = (doc) => {
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setLineWidth(0.4);
    doc.rect(MARGIN, MARGIN, w - 2 * MARGIN, h - 2 * MARGIN);
  };

  const drawHeader = (doc, header, logoBase64) => {
    const w = doc.internal.pageSize.getWidth();

    // Logo at upper-left inside border
    const logoW = 18;
    const logoH = 18;
    const logoX = MARGIN + GUTTER;
    const logoY = MARGIN + GUTTER;
    if (logoBase64) {
      doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoW, logoH);
    }

    // Titles (centered)
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(header.university || 'JOSEPH SARWUAN TARKA UNIVERSITY', w / 2, MARGIN + 8, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(header.address || 'P.M.B 2373, MAKURDI', w / 2, MARGIN + 14, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(header.college || 'COLLEGE OF BIOLOGICAL SCIENCES', w / 2, MARGIN + 22, { align: 'center' });
    doc.text(header.department || 'DEPARTMENT OF BIOCHEMISTRY', w / 2, MARGIN + 28, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(
      `STATEMENT OF EXAMINATION RESULT FOR ${semesterText(header.semester)} SEMESTER ${header.session}`,
      w / 2, MARGIN + 35, { align: 'center' }
    );

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(`COURSE: ${header.programme || 'B. SC. BIOCHEMISTRY'}`, w / 2, MARGIN + 42, { align: 'center' });
  };

  const drawStudentBio = (doc, header, student) => {
    const w = doc.internal.pageSize.getWidth();
    const leftX = MARGIN + GUTTER + 2;
    const rightX = w - (MARGIN + GUTTER + 2);
    const topY = MARGIN + 50;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);

    doc.text(`LEVEL: ${header.level}`, leftX, topY);
    doc.text(`REGISTRATION NUMBER: ${student.regNo}`, leftX, topY + 7);
    doc.text(`FULL NAME: ${student.fullName}`, leftX, topY + 14);

    doc.text(`Session: ${header.session}`, rightX, topY, { align: 'right' });
    doc.text(`Semester: ${semesterText(header.semester)}`, rightX, topY + 7, { align: 'right' });
  };

  const drawCourseTable = (doc, student) => {
    const head = [['Code', 'Title', 'Unit', 'Score', 'Point', 'Remark']];
    const body = (student.courses || []).map((c) => ([
      c.code || '',
      c.title || '',
      c.unit ?? '',
      typeof c.score === 'number' ? padScore(c.score) : (c.score || ''),
      (c.point ?? '') === '' ? '' : Number(c.point).toFixed(2),
      c.remark || ''
    ]));

    autoTable(doc, {
      startY: MARGIN + 65,
      margin: { top: MARGIN, left: MARGIN + GUTTER, right: MARGIN + GUTTER, bottom: MARGIN },
      head,
      body,
      styles: {
        font: 'times',
        fontSize: 9,
        lineWidth: 0.1,
        cellPadding: 2,
        textColor: [0,0,0]
      },
      headStyles: {
        fillColor: [255,255,255],
        textColor: [0,0,0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 22 },            // Code
        1: { cellWidth: 78 },            // Title
        2: { cellWidth: 12, halign: 'center' },  // Unit
        3: { cellWidth: 18, halign: 'center' },  // Score
        4: { cellWidth: 18, halign: 'center' },  // Point
        5: { cellWidth: 'auto' }         // Remark
      }
    });
  };

  // PERFORMANCE as its own TABLE with row header: Current / Previous / Cumulative
  const drawPerformanceTable = (doc, perf) => {
    const startY = (doc.lastAutoTable?.finalY || (MARGIN + 90)) + 8;
    const head = [[
      ' ', 'TCC', 'TCE', 'TPE', 'GPA'
    ]];
    const body = [
      ['Current',
        perf?.TCC ?? 0,
        perf?.TCE ?? 0,
        perf?.TPE ?? 0,
        (perf?.GPA ?? 0).toFixed(2)
      ],
      ['Previous',
        perf?.prevTCC ?? 0,
        perf?.prevTCE ?? 0,
        perf?.prevTPE ?? 0,
        (perf?.prevCGPA ?? 0).toFixed(2)
      ],
      ['Cumulative',
        perf?.CCC ?? 0,
        perf?.CCE ?? 0,
        perf?.CPE ?? 0,
        (perf?.CGPA ?? 0).toFixed(2)
      ],
    ];

    autoTable(doc, {
      startY,
      margin: { top: MARGIN, left: MARGIN + GUTTER, right: MARGIN + GUTTER, bottom: MARGIN },
      head,
      body,
      styles: {
        font: 'times',
        fontSize: 9,
        lineWidth: 0.1,
        cellPadding: 2,
        textColor: [0,0,0],
        halign: 'center',
      },
      headStyles: {
        fillColor: [255,255,255],
        textColor: [0,0,0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 28, halign: 'left', fontStyle: 'bold' }, // row header
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 22 },
      },
      didDrawPage: (data) => {
        // Title above the table
        const x = MARGIN + GUTTER + 2;
        const y = startY - 3;
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.text('PERFORMANCE', x, y);
      }
    });
  };

  // KEY as a compact table
  const drawKeyTable = (doc) => {
    const startY = (doc.lastAutoTable?.finalY || (MARGIN + 110)) + 8;

    const head = [['Code', 'Meaning']];
    const body = [
      ['TCC', 'Total Credit Carried'],
      ['TCE', 'Total Credit Earned'],
      ['TPE', 'Total Points Earned'],
      ['GPA', 'Grade Point Average'],
      ['CCC', 'Cumulative Credit Carried'],
      ['CCE', 'Cumulative Credit Earned'],
      ['CPE', 'Cumulative Points Earned'],
      ['CGPA', 'Cumulative GPA'],
    ];

    autoTable(doc, {
      startY,
      margin: { top: MARGIN, left: MARGIN + GUTTER, right: MARGIN + GUTTER, bottom: MARGIN },
      head,
      body,
      styles: {
        font: 'times',
        fontSize: 9,
        lineWidth: 0.1,
        cellPadding: 2,
        textColor: [0,0,0]
      },
      headStyles: {
        fillColor: [255,255,255],
        textColor: [0,0,0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
      didDrawPage: (data) => {
        const x = MARGIN + GUTTER + 2;
        const y = startY - 3;
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.text('KEY', x, y);
      }
    });
  };

  const drawFooter = (doc, pageNo) => {
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text(`${pageNo}`, w / 2, h - (MARGIN - 2), { align: 'center' });
  };

  /**
   * Generate a PDF for ONE or MANY students.
   * @param {Object} header See shape in your original hook
   * @param {Array<Object>|Object} records Either a single student record or array of them
   * @param {Object} options { filename }
   */
  const generateStatementPDF = async (header, records, options = {}) => {
    const logoBase64 = header.logoUrl ? await loadImageAsBase64(header.logoUrl) : null;
    const list = Array.isArray(records) ? records : [records];

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    list.forEach((student, idx) => {
      if (idx > 0) doc.addPage();

      // Page frame
      drawOuterBorder(doc);

      // Header + sections
      drawHeader(doc, header, logoBase64);
      drawStudentBio(doc, header, student);
      drawCourseTable(doc, student);
      drawPerformanceTable(doc, student.performance);
      drawKeyTable(doc);

      // Footer
      drawFooter(doc, idx + 1);
    });

    const fname = options.filename ||
      `Statement_${header.session}_Sem${header.semester}_L${header.level}.pdf`;
    doc.save(fname);
  };

  return { generateStatementPDF };
};

export default useStatementPDFGenerator;
