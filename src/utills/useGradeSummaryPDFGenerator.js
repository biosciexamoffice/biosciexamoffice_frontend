import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const useGradeSummaryPDFGenerator = () => {
  const loadImageAsBase64 = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const generatePDF = async (gradeSummary, formData, headerInfo) => {
    const logoBase64 = await loadImageAsBase64('/uam.jpeg');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const leftMargin = 10;
    const rightMargin = 10;

    // Helper to draw the full header + justified metadata and return the Y where the table should begin
    const drawHeaderAndGetAfterMetaY = () => {
      // Title + Logo
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.text('JOSEPH SARWUAN TARKA UNIVERSITY, P. M. B. 2373, MAKURDI', pageWidth / 2, 15, { align: 'center' });

      const logoW = 15, logoH = 15;
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage(logoBase64, 'JPEG', logoX, 18, logoW, logoH);

      doc.text('SUMMARY OF COURSES AND GRADES DISTRIBUTION', pageWidth / 2, 38, { align: 'center' });

      // Metadata, justified into two columns: LABEL at fixed X, VALUE at fixed X
      doc.setFontSize(9);
      doc.setFont('times', 'normal');

      const metaStartY = 45;
      const lineGap = 7;

      // LEFT column positions
      const leftLabelX = leftMargin;            // where labels start
      const leftValueX = leftLabelX + 35;       // where values start (aligned across lines)

      // RIGHT column positions
      const rightLabelX = pageWidth / 2 + 90;   // adjust as needed to taste
      const rightValueX = rightLabelX + 28;     // values start aligned across lines

      // Pairs (label, value) for both sides
      const leftPairs = [
        ['College:',    headerInfo?.subject    || 'Biological Sciences'],
        ['Department:', headerInfo?.department || 'Biochemistry'],
        ['Programme:',  headerInfo?.programme  || 'B. Sc. Biochemistry'],
      ];
      const rightPairs = [
        ['Level:',    String(formData.level ?? '')],
        ['Semester:', formData.semester === 1 ? 'First' : 'Second'],
        ['Session:',  String(formData.session ?? '')],
      ];

      // draw rows—values are left-aligned but start at fixed columns (justified start)
      leftPairs.forEach(([label, value], i) => {
        const y = metaStartY + i * lineGap;
        doc.text(label, leftLabelX, y);
        doc.text(String(value), leftValueX, y);
      });

      rightPairs.forEach(([label, value], i) => {
        const y = metaStartY + i * lineGap;
        doc.text(label, rightLabelX, y);
        doc.text(String(value), rightValueX, y);
      });

      // Table starts a little below the last meta line
      return metaStartY + (leftPairs.length - 1) * lineGap + 8;
    };

    // First page header + compute where the table starts
    const tableTopY = drawHeaderAndGetAfterMetaY();

    // Helpers
    const cleanCode = (code) => String(code || '').replace(/^[A-Z]-/, '');

    // Header rows (kept as-is)
    const headRows = [
      [
        { content: 'S/N', rowSpan: 2 },
        { content: 'COURSE CODE', rowSpan: 2 },
        { content: 'COURSE TITLE', rowSpan: 2 },
        { content: 'UNIT', rowSpan: 2 },
        { content: 'TOTAL REGISTERED', rowSpan: 2 },
        { content: 'TOTAL EXAMINED', rowSpan: 2 },
        { content: 'LETTER GRADES', colSpan: 6, styles: { halign: 'center' } },
        { content: 'PERCENTAGE PASS', rowSpan: 2 }
      ],
      [
        { content: '' }, // S/N
        { content: '' }, // CODE
        { content: '' }, // TITLE
        { content: '' }, // UNIT
        { content: '' }, // TOTAL REGISTERED
        { content: '' }, // TOTAL EXAMINED
        { content: 'A' },
        { content: 'B' },
        { content: 'C' },
        { content: 'D' },
        { content: 'E' },
        { content: 'F' },
        { content: '' }  // %
      ]
    ];

    // Body rows
    const body = gradeSummary.map((course, index) => [
      index + 1,
      cleanCode(course.code),
      course.title,
      course.unit,
      course.totalRegistered,
      course.totalExamined,
      (course.gradeDistribution?.A ?? 0),
      (course.gradeDistribution?.B ?? 0),
      (course.gradeDistribution?.C ?? 0),
      (course.gradeDistribution?.D ?? 0),
      (course.gradeDistribution?.E ?? 0),
      (course.gradeDistribution?.F ?? 0),
      `${Number(course.percentagePass ?? 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: tableTopY, // make the first table start after metadata
      head: headRows,
      body,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: 8,
        cellPadding: 1.5,
        overflow: 'linebreak',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
        lineWidth: 0.1
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        lineWidth: 0.1
      },
      columnStyles: {
        0:  { cellWidth: 8,  halign: 'center' }, // S/N
        1:  { cellWidth: 35 },                   // CODE
        2:  { cellWidth: 120 },                  // TITLE
        3:  { cellWidth: 12, halign: 'center' },// UNIT
        4:  { cellWidth: 35, halign: 'center' },// TOTAL REGISTERED
        5:  { cellWidth: 25, halign: 'center' },// TOTAL EXAMINED
        6:  { cellWidth: 10, halign: 'center' },// A
        7:  { cellWidth: 10, halign: 'center' },// B
        8:  { cellWidth: 10, halign: 'center' },// C
        9:  { cellWidth: 10, halign: 'center' },// D
        10: { cellWidth: 10, halign: 'center' },// E
        11: { cellWidth: 10, halign: 'center' },// F
        12: { cellWidth: 45, halign: 'center' } // %
      },
      // Continuation pages should also keep the table below the metadata
      margin: { left: leftMargin, right: rightMargin, top: tableTopY, bottom: 15 },
      didDrawPage: () => {
        // Re-draw the header + metadata (with the same justified layout) on every page
        drawHeaderAndGetAfterMetaY();
      }
    });

    doc.save(`GradeSummary_${formData.session}_Sem${formData.semester}_Level${formData.level}.pdf`);
  };

  return { generatePDF };
};

export default useGradeSummaryPDFGenerator;
