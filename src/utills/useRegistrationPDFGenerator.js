// utils/useRegistrationPDFGenerator.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- helpers (same as before)
const loadImageAsBase64 = async (url) => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
};

const fullName = (stu) =>
  `${(stu?.surname || '').toUpperCase()} ${(stu?.firstname || '').toUpperCase()}${
    stu?.middlename ? ' ' + stu.middlename.toUpperCase() : ''
  }`.trim();

const cleanCourseCode = (code = '') => code.replace(/^(?:C-|B-)/i, '').trim();

const useRegistrationPDFGenerator = () => {
  // Draw header/footer for the CURRENT page (student-specific)
  const drawHeaderFooterForPage = (doc, logoBase64, meta, student) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 12;

    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text(
      'JOSEPH SARWUAN TARKA UNIVERSITY, P. M. B. 2373, MAKURDI',
      pageWidth / 2,
      15,
      { align: 'center' }
    );

    const logoWidth = 16;
    const logoHeight = 16;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 18;
    doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoWidth, logoHeight);

    doc.text('REGISTRATION FORM', pageWidth / 2, 40, {
      align: 'center',
    });

    // Meta rows
    doc.setFontSize(9);
    doc.setFont('times', 'normal');

    const drawMetaBlock = (pairs, labelX, valueX, startY, lineGap = 6.5) => {
      pairs.forEach(([label, value], i) => {
        const y = startY + i * lineGap;
        doc.text(label, labelX, y);
        doc.text(String(value ?? ''), valueX, y);
      });
    };

    const metaStartY = 48;
    const metaGap = 6.5;
    const leftLabelX = leftMargin;
    const leftValueX = leftLabelX + 30;
    drawMetaBlock(
      [
        ['College:', meta?.college || 'College Not Provided'],
        ['Department:', meta?.department || 'Department Not Provided'],
        ['Programme:', meta?.programme || 'Programme Not Provided'],
      ],
      leftLabelX,
      leftValueX,
      metaStartY,
      metaGap
    );

    const rightLabelX = pageWidth / 2 + 40;
    const rightValueX = rightLabelX + 24;
    drawMetaBlock(
      [
        ['Level:', meta?.level],
        ['Semester:', Number(meta?.semester) === 1 ? 'First' : 'Second'],
        ['Session:', meta?.session],
      ],
      rightLabelX,
      rightValueX,
      metaStartY,
      metaGap
    );

    // Student identity
    doc.setFont('times', 'bold');
    doc.text(`Name:`, leftLabelX, 68);
    doc.setFont('times', 'normal');
    doc.text(fullName(student), leftLabelX + 15, 68);

    doc.setFont('times', 'bold');
    doc.text(`Reg. No:`, rightLabelX, 68);
    doc.setFont('times', 'normal');
    doc.text(String(student?.regNo || ''), rightLabelX + 20, 68);

    // Footer
    const footerStartY = pageHeight - 28;
    const footerGap = 12;
    doc.setFont('times', 'normal');
    
    doc.text(
      `Dept. Registration. Officer: ${meta?.deptExamOfficer || 'MR. Y. L. David'}`,
      leftMargin,
      footerStartY
    );

    doc.text(
      `Head of Dept: ${meta?.headOfDept || 'DR. (MRS.) T. AKANDE'}`,
      rightLabelX,
      footerStartY
    );
    

    doc.setFontSize(8);
    const gen = meta?.generatedAt ? new Date(meta.generatedAt).toLocaleString() : '';
    doc.text(`${gen}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
  };

  // Build exactly 15 rows for one student
  const buildFailedRows = (student, meta) => {
    const targetRows = Number(meta?.failedCoursesTableRows || 15);
    const rows = (student?.failedCourses || []).map((c, idx) => [
      String(idx + 1),
      cleanCourseCode(c?.code || ''),
      String(c?.title || ''),
      String(c?.unit ?? ''),
      String(c?.option || ''), // "C" or "E"
    ]);

    if (rows.length < targetRows) {
      for (let i = rows.length; i < targetRows; i++) {
        rows.push([String(i + 1), '', '', '', '']);
      }
    } else if (rows.length > targetRows) {
      rows.length = targetRows;
      for (let i = 0; i < rows.length; i++) rows[i][0] = String(i + 1);
    }
    return rows;
  };

  // Single-student file (unchanged behavior)
  const generateStudentPDF = async (student, meta) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoBase64 = await loadImageAsBase64('/uam.jpeg');

    drawHeaderFooterForPage(doc, logoBase64, meta, student);

    autoTable(doc, {
      startY: 78,
      margin: { top: 78, bottom: 40, left: 12, right: 12 },
      head: [['S/No.', 'Course Code', 'Course Title', 'Unit', 'Option']],
      body: buildFailedRows(student, meta),
      styles: {
        font: 'times',
        fontStyle: 'normal',
        fontSize: 9,
        textColor: [0, 0, 0],
        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      alternateRowStyles: { fillColor: false },
      bodyStyles: { pageBreak: 'avoid', textColor: [0, 0, 0] },
      rowPageBreak: 'avoid',
      columnStyles: {
        0: { cellWidth: 16, halign: 'left' },
        1: { cellWidth: 34, halign: 'left' },
        2: { cellWidth: 98, halign: 'left' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 22, halign: 'left' },
      },
    });

    const fname = `${(student?.regNo || '').replace(/[^\w-]+/g, '_')}-registration.pdf`;
    doc.save(fname);
  };

  // ✅ NEW: All students in ONE multi-page PDF
  const generateCombinedPDF = async (students = [], meta = {}) => {
    if (!students.length) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoBase64 = await loadImageAsBase64('/uam.jpeg');

    students.forEach((student, idx) => {
      if (idx > 0) doc.addPage();
      drawHeaderFooterForPage(doc, logoBase64, meta, student);

      autoTable(doc, {
        startY: 78,
        margin: { top: 78, bottom: 40, left: 12, right: 12 },
        head: [['S/No.', 'Course Code', 'Course Title', 'Unit', 'Option']],
        body: buildFailedRows(student, meta),
        styles: {
          font: 'times',
          fontStyle: 'normal',
          fontSize: 9,
          textColor: [0, 0, 0],
          cellPadding: 2,
          overflow: 'linebreak',
          valign: 'middle',
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left',
        },
        alternateRowStyles: { fillColor: false },
        bodyStyles: { pageBreak: 'avoid', textColor: [0, 0, 0] },
        rowPageBreak: 'avoid',
        columnStyles: {
          0: { cellWidth: 16, halign: 'left' },
          1: { cellWidth: 34, halign: 'left' },
          2: { cellWidth: 98, halign: 'left' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 22, halign: 'left' },
        },
      });
    });

    const fname = `Registration_Forms_${meta?.session}_Sem${meta?.semester}_Level${meta?.level}.pdf`
      .replace(/[^\w.-]+/g, '_');
    doc.save(fname);
  };

  // Legacy batch: multiple separate files
  const generateBatch = async (students = [], meta = {}) => {
    for (const s of students) {
      // eslint-disable-next-line no-await-in-loop
      await generateStudentPDF(s, meta);
    }
  };

  return { generateStudentPDF, generateCombinedPDF, generateBatch };
};

export default useRegistrationPDFGenerator;
