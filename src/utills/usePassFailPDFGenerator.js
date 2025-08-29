import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const usePassFailPDFGenerator = () => {
  const loadImageAsBase64 = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  // Format: FIRSTNAME, OTHER NAMES
  const formatNameFirstComma = (fullName = '') => {
    const parts = String(fullName).trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].toUpperCase();
    const first = parts[0].toUpperCase();
    const others = parts.slice(1).join(' ').toUpperCase();
    return `${first}, ${others}`;
  };

  const generatePDF = async (data, formData) => {
    const { students } = data;

    const getCGPA = (s) => Number(s?.metrics?.CGPA ?? 0);
    const isProbation = (s) => getCGPA(s) < 1.0; // Probation threshold
    const isPass = (s) => (s?.remarks || '').toLowerCase() === 'pass';
    const isFail = (s) => (s?.remarks || '').toLowerCase().startsWith('repeat');

    const passed = students.filter(isPass);
    const failed = students.filter(isFail);
    const probation = students.filter(isProbation);

    // Withdrawal list — plug rules here if/when you have them
    const withdrawal = Array.isArray(data?.withdrawalStudents) ? [...data.withdrawalStudents] : [];

    // Non-registered list (provided by the UI when students were filtered out)
    const nonRegistration = Array.isArray(data?.nonRegisteredStudents)
      ? [...data.nonRegisteredStudents]
      : [];

    // Sort lists for stable output
    const byReg = (a, b) => String(a.regNo).localeCompare(String(b.regNo), undefined, { numeric: true });
    passed.sort(byReg);
    failed.sort(byReg);
    probation.sort(byReg);
    withdrawal.sort(byReg);
    nonRegistration.sort(byReg);

    const logoBase64 = await loadImageAsBase64('/uam.jpeg');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'legal' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const leftMargin = 10;
    const rightMargin = 10;

    const headerHeight = 40;
    const footerHeight = 20;

    const drawHeaderFooter = () => {
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.text(
        'JOSEPH SARWUAN TARKA UNIVERSITY, P. M. B. 2373, MAKURDI',
        pageWidth / 2,
        15,
        { align: 'center' }
      );

      const logoWidth = 15;
      const logoHeight = 15;
      const logoX = (pageWidth - logoWidth) / 2;
      const logoY = 18;
      doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoWidth, logoHeight);

      doc.text('SUMMARY OF EXAMINATION RESULTS', pageWidth / 2, 38, { align: 'center' });

      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text(
        'Dean of College: PROF. C. U. AGUORU    ………………………            Date………………………………',
        leftMargin,
        pageHeight - 15
      );
    };

    /**
     * Draw 2-column metadata with aligned (justified) values:
     * Left column:   "College:"     value   (value starts at leftValueX on every row)
     *                "Department:"  value
     *                "Programme:"   value
     * Right column:  "Level:"       value   (value starts at rightValueX on every row)
     *                "Semester:"    value
     *                "Session:"     value
     *
     * Returns: last Y used (to position the next block).
     */
    const drawMetadata = () => {
      doc.setFontSize(9);
      doc.setFont('times', 'bold');

      // Left column anchors
      const leftLabelX = leftMargin;
      const leftValueX = leftLabelX + 28; // ensure all left values begin here

      // Right column anchors
      const rightLabelX = pageWidth / 2 + 20;
      const rightValueX = rightLabelX + 20; // ensure all right values begin here

      const metaStartY = headerHeight + 10;
      const rowGap = 7;

      const leftPairs = [
        ['College:',   data.college   || 'Biological Sciences'],
        ['Department:',data.department|| 'Biochemistry'],
        ['Programme:', data.programme || 'B. Sc. Biochemistry'],
      ];

      const rightPairs = [
        ['Level:',    String(formData.level || '')],
        ['Semester:', formData.semester === 1 ? 'First' : 'Second'],
        ['Session:',  String(formData.session || '')],
      ];

      let y = metaStartY;

      const drawPair = (xLabel, xValue, [label, value], yPos) => {
        doc.setFont('times', 'bold');
        doc.text(String(label), xLabel, yPos);
        doc.setFont('times', 'normal');
        doc.text(String(value), xValue, yPos);
      };

      // Draw rows (aligned values)
      for (let i = 0; i < leftPairs.length; i++) {
        const yRow = y + i * rowGap;
        drawPair(leftLabelX,  leftValueX,  leftPairs[i],  yRow);
        drawPair(rightLabelX, rightValueX, rightPairs[i], yRow);
      }

      return y + (leftPairs.length - 1) * rowGap; // return last row's Y
    };

    /**
     * Generic table creator with per-mode columns.
     * mode: 'pass' | 'fail' | 'probation' | 'withdrawal' | 'nonreg'
     */
    const createTable = (title, list, mode, startY) => {
      // ----------- HEADERS -----------
      let headers;
      if (mode === 'nonreg') {
        // S/No., Reg. Number, Name only
        headers = [
          { header: 'S/No.', dataKey: 'index' },
          { header: 'Reg. Number', dataKey: 'regNo' },
          { header: 'Name of Student', dataKey: 'name' },
        ];
      } else {
        headers = [
          { header: 'S/No.', dataKey: 'index' },
          { header: 'Reg. Number', dataKey: 'regNo' },
          { header: 'Name of Student', dataKey: 'name' },
          { header: 'CGPA', dataKey: 'cgpa' }
        ];
        if (mode === 'fail') {
          headers.push({ header: 'Failed Course(s)', dataKey: 'remarks' });
        } else if (mode !== 'probation' && mode !== 'withdrawal') {
          headers.push({ header: 'Remarks', dataKey: 'remarks' });
        }
      }

      // ----------- ROWS -----------
      const rows = list.map((student, idx) => {
        const base = {
          index: idx + 1,
          regNo: student.regNo,
          name: formatNameFirstComma(student.fullName),
        };
        if (mode === 'nonreg') {
          return base; // no cgpa/remarks
        }

        const cgpaStr = getCGPA(student).toFixed(2);
        let remarks = '';
        if (mode === 'fail') {
          const codes = ((student.remarks || '').match(/[A-Z0-9-]+(?:\s*[A-Z]+)?\s*\d{3}/g) || [])
            .map((s) => s.trim())
            .join(', ');
          remarks = codes || 'Repeat';
        } else if (mode === 'pass') {
          remarks = 'Pass';
        } else if (mode === 'other') {
          remarks = student.remarks || '';
        }

        return {
          ...base,
          cgpa: cgpaStr,
          remarks
        };
      });

      // ----------- TITLE / SUBHEAD -----------
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text(title, leftMargin, startY);

      doc.setFontSize(9);
      doc.setFont('times', 'normal');
      if (mode === 'pass') {
        doc.text('The following students have passed all courses registered for the semester', leftMargin, startY + 5);
      } else if (mode === 'fail') {
        doc.text('The following students have failed the course(s) indicated against their names', leftMargin, startY + 5);
      } else if (mode === 'probation') {
        doc.text('The following students are on probation', leftMargin, startY + 5);
      } else if (mode === 'withdrawal') {
        doc.text('This student has voluntarily withdrawn from the university', leftMargin, startY + 5);
      } else if (mode === 'nonreg') {
        doc.text('The following students did not register for the semester', leftMargin, startY + 5);
      }

      const tableHead = [headers.map((h) => h.header)];
      const tableBody = rows.map((r) => headers.map((h) => r[h.dataKey]));

      // Flag to know if this is the first page of THIS table
      let firstPageOfThisTable = true;

      // ----------- COLUMN WIDTHS -----------
      const colStyles =
        mode === 'nonreg'
          ? {
              0: { cellWidth: 15, halign: 'center' }, // S/No.
              1: { cellWidth: 35 },                   // Reg. Number
              2: { cellWidth: 130 },                  // Name (wider to absorb CGPA+Remarks)
            }
          : {
              0: { cellWidth: 15, halign: 'center' },
              1: { cellWidth: 35 },
              2: { cellWidth: 65 },
              3: { cellWidth: 20, halign: 'center' },
              ...(mode === 'fail'
                ? { 4: { cellWidth: 55, halign: 'left' } }
                : mode !== 'probation' && mode !== 'withdrawal'
                ? { 4: { cellWidth: 45, halign: 'left' } }
                : {})
            };

      // ----------- TABLE -----------
      autoTable(doc, {
        head: tableHead,
        body: tableBody,

        // FIRST page for this table begins below the title/subheading
        startY: startY + 15,

        // CONTINUATION pages: ensure table body begins below metadata + "continued" line
        margin: {
          left: leftMargin,
          right: rightMargin,
          top: headerHeight + 45, // generous top margin for continuation pages
          bottom: footerHeight + 10
        },

        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: 9,
          cellPadding: 2,
          overflow: 'linebreak',
          valign: 'middle',
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          minCellHeight: 6
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 0.2,
          halign: 'left'
        },
        bodyStyles: {
          textColor: [0, 0, 0],
          lineWidth: 0.2,
          lineColor: [0, 0, 0]
        },
        columnStyles: colStyles,

        // Draw header + metadata on EVERY page; draw "continued" on pages after the first
        didDrawPage: () => {
          drawHeaderFooter();
          const metaY = drawMetadata();
          const showContinued = (mode === 'pass' || mode === 'fail' || mode === 'nonreg');
          if (showContinued && !firstPageOfThisTable) {
            doc.setFont('times', 'bold');
            doc.setFontSize(11);
            doc.text(`${title} continued`, leftMargin, metaY + 10);
          }
          firstPageOfThisTable = false; // after first page for this table
        }
      });
    };

    // === Document build ===
    drawHeaderFooter();
    const metaPassY = drawMetadata();
    createTable('A. Pass List', passed, 'pass', metaPassY + 10);

    doc.addPage();
    drawHeaderFooter();
    const metaFailY = drawMetadata();
    createTable('B. Fail List', failed, 'fail', metaFailY + 10);

    // C. Probation — show Nil if empty
    doc.addPage();
    drawHeaderFooter();
    const metaProbY = drawMetadata();
    if (probation.length === 0) {
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text('C. Probation List: Nil', leftMargin, metaProbY + 10);
    } else {
      createTable('C. Probation List', probation, 'probation', metaProbY + 10);
    }

    // D. Withdrawal — show Nil if empty
    doc.addPage();
    drawHeaderFooter();
    const metaWithY = drawMetadata();
    if (withdrawal.length === 0) {
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text('D. Withdrawal List: Nil', leftMargin, metaWithY + 10);
    } else {
      createTable('D. Withdrawal List', withdrawal, 'withdrawal', metaWithY + 10);
    }

    // E. Non-Registration (3 columns: S/No, RegNo, Name)
    doc.addPage();
    drawHeaderFooter();
    const metaNonRegY = drawMetadata();
    createTable('E. Non-Registration List', nonRegistration, 'nonreg', metaNonRegY + 10);

    doc.save(`PassFailList_${formData.session}_${formData.semester}_${formData.level}.pdf`);
  };

  return { generatePDF };
};

export default usePassFailPDFGenerator;
