// useResultPDFGenerator.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '@mui/material';

const useResultPDFGenerator = () => {
  const theme = useTheme();

  // ——— helpers
  const normalizeRegNo = (s) => (s ?? '').toString().trim().toUpperCase();

  const getCourseResult = (student, course) => {
    const results = student?.results || {};
    const keysToTry = [
      course?.id,
      course?._id,
      String(course?.id ?? ''),
      String(course?._id ?? ''),
      course?.code,
      String(course?.code ?? '').toUpperCase(),
    ].filter(Boolean);

    for (const k of keysToTry) {
      const r = results[k];
      if (r) return r;
    }
    const vals = Object.values(results || {});
    const found = vals.find(v =>
      (v?.courseId && String(v.courseId) === String(course?.id || course?._id)) ||
      (v?.courseCode && String(v.courseCode).toUpperCase() === String(course?.code || '').toUpperCase())
    );
    return found || null;
  };

  const gradeFromScore = (score) => {
    const s = Number(score) || 0;
    if (s >= 70) return 'A';
    if (s >= 60) return 'B';
    if (s >= 50) return 'C';
    if (s >= 45) return 'D';
    if (s >= 40) return 'E';
    return 'F';
  };

  const loadImageAsBase64 = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const pad2 = (n) => String(Number.isFinite(+n) ? Math.round(+n) : n).padStart(2, '0');

  // Strip ONLY a leading "C-" or "B-" (case-insensitive).
  const cleanCourseCode = (code = '') => code.replace(/^(?:C-|B-)/i, '').trim();

  const generatePDF = async (data, formData, courses, regSetsByCourseId = {}) => {
    const logoBase64 = await loadImageAsBase64('/uam.jpeg');
    const { regularCourses = [], carryOverCourses = [] } = courses || {};

    // Sort students by registration number, ignoring UE/DE suffixes
    const sortedStudents = [...(data?.students || [])].sort((a, b) => {
      const cleanRegNo = (regNo) => regNo.split('/').slice(0, 3).join('/');
      const regA = cleanRegNo(a.regNo || '');
      const regB = cleanRegNo(b.regNo || '');
      return regA.localeCompare(regB, undefined, { numeric: true });
    });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 10;
    const rightMargin = 10;
    const tableTopY = 60;
    const tableBottomPadding = 45;

    const drawWatermark = () => {
      const watermarkText = data?.watermarkText || 'DRAFT'
      if (!watermarkText) return;

      const supportsGraphicsState =
        typeof doc.saveGraphicsState === 'function' &&
        typeof doc.restoreGraphicsState === 'function';

      if (supportsGraphicsState) doc.saveGraphicsState();
      doc.setFont('times', 'bold');
      doc.setFontSize(120);
      try {
        doc.setTextColor(0, 0, 0, 0.15)
      } catch {
        doc.setTextColor(200, 200, 200);
      }

      doc.text(watermarkText, pageWidth / 1.5, pageHeight / 1.5, {
        angle: 45,
        align: 'center',
        baseline: 'middle',
      });

      if (supportsGraphicsState) {
        doc.restoreGraphicsState();
      }
      doc.setTextColor(0, 0, 0);
    };

    const drawMetaBlock = (pairs, labelX, valueX, startY, lineGap = 7) => {
      doc.setFont('times', 'normal');
      pairs.forEach(([label, value], i) => {
        const y = startY + i * lineGap;
        doc.text(label, labelX, y);
        doc.text(String(value ?? ''), valueX, y);
      });
    };

    // Draw header, footer, and border for the current page only
    const drawHeaderFooter = () => {
      doc.setTextColor(0, 0, 0);
      // ===== Outer Border (every page) =====
      const borderInset = 5; // adjust for tighter/looser frame
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.6);
      doc.rect(borderInset, borderInset, pageWidth - 2 * borderInset, pageHeight - 2 * borderInset);

      // ===== Title + Logo =====
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.text('JOSEPH SARWUAN TARKA UNIVERSITY, P. M. B. 2373, MAKURDI', pageWidth / 2, 15, { align: 'center' });

      const logoWidth = 15;
      const logoHeight = 15;
      const logoX = (pageWidth - logoWidth) / 2;
      const logoY = 18;
      doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoWidth, logoHeight);

      doc.text('EXAMINATION RESULT SHEET', pageWidth / 2, 38, { align: 'center' });

      // ===== HEADER META =====
      doc.setFontSize(9);
      doc.setFont('times', 'normal');

      const metaStartY = 45;
      const metaGap = 7;

      const leftLabelX = leftMargin;
      const leftValueX = leftLabelX + 28;
      drawMetaBlock(
        [
          ['College:', data?.college || 'Biological Sciences'],
          ['Department:', data?.department || 'Biochemistry'],
          ['Programme:', data?.programme || 'B. Sc. Biochemistry']
        ],
        leftLabelX,
        leftValueX,
        metaStartY,
        metaGap
      );

      const rightLabelX = pageWidth / 2 + 105; // keep header meta where it was
      const rightValueX = rightLabelX + 20;
      drawMetaBlock(
        [
          ['Level:', formData?.level],
          ['Semester:', formData?.semester === 1 ? 'First' : 'Second'],
          ['Session:', formData?.session]
        ],
        rightLabelX,
        rightValueX,
        metaStartY,
        metaGap
      );

      // ===== FOOTER =====
      const footerStartY = pageHeight - 40;
      const footerGap = 14;

      const leftFooterX = leftMargin;
      // Shift the right-hand footer block ("Head of Dept" and "Dean") a bit left
      const rightFooterX = (pageWidth / 2 + 105) - 10; // moved 10mm left; adjust if needed

      doc.text(`Dept. Exam. Officer: ${data?.deptExamOfficer || 'MR. I. Y. JOEL'}`, leftFooterX, footerStartY);
      doc.text(`College Exam. Officer: ${data?.collegeExamOfficer || 'MR. O. A. OJOBO'}`, leftFooterX, footerStartY + footerGap);

      doc.text(`Head of Dept: ${data?.headOfDept || 'DR. (MRS.) T. AKANDE'}`, rightFooterX, footerStartY);
      doc.text(`Dean: ${data?.dean || 'PROF. C. U. AGUORU'}`, rightFooterX, footerStartY + footerGap);

      // Page numbering intentionally removed
    };

    // ——— row builder with "00F when registered but no result" for BOTH regular & carry-over courses
    const prepareTableData = () => {
      return sortedStudents.map((student, index) => {
        const regUpper = normalizeRegNo(student.regNo);

        // Carry-over label chunks: include real results; if registered but no score => 00F
        const carryOver = (carryOverCourses || [])
          .map(course => {
            const result = getCourseResult(student, course);
            const regSet = regSetsByCourseId?.[course.id];
            const isRegistered = regSet?.has(regUpper);

            if (result) {
              const score = pad2(result.grandtotal || 0);
              const grade = result.grade ?? gradeFromScore(result.grandtotal);
              const code = cleanCourseCode(course.code).replace(/\s/g, '');
              return `${course.unit}${code}\u00A0${score}${grade}`;
            }

            if (isRegistered) {
              const code = cleanCourseCode(course.code).replace(/\s/g, '');
              return `${course.unit}${code}\u00A000F`;
            }

            return null; // not registered and no result ⇒ omit from carry-over chunk
          })
          .filter(Boolean)
          .join(' ');

        const formatName = (fullName = '') => {
          const parts = fullName.trim().split(/\s+/);
          if (parts.length === 0) return '';
          const surname = parts[0].toUpperCase();
          const others = parts.slice(1).join(' ').toUpperCase();
          return others ? `${surname}, ${others}` : surname;
        };

        const nameFormatted = formatName(student.fullName || '');

        // Build the row: result ⇒ score+grade; registered-no-result ⇒ 00F;
        // Not registered:
        //   - If elective (option === 'E') ⇒ '-' (hyphen)
        //   - Else (core) ⇒ 'NR'
        const regularCells = (regularCourses || []).map(course => {
          const regSet = regSetsByCourseId?.[course.id];
          const isRegistered = regSet?.has(regUpper);
          const result = isRegistered ? getCourseResult(student, course) : null;
          const isElective = String(course?.option || '').toUpperCase() === 'E';

          if (!isRegistered) {
            return isElective ? '-' : 'NR';
          }

          if (result) {
            const score = pad2(result.grandtotal || 0);
            const grade = result.grade ?? gradeFromScore(result.grandtotal);
            return `${score}${grade}`;
          }

          return '00F';
        });

        return [
          index + 1,
          `${student.regNo}\n${nameFormatted}`,
          ...regularCells,
          carryOver,
          student.currentMetrics?.TCC || 0,
          student.currentMetrics?.TCE || 0,
          student.currentMetrics?.TPE || 0,
          (student.currentMetrics?.GPA || 0).toFixed(2),
          student.previousMetrics?.CCC || 0,
          student.previousMetrics?.CCE || 0,
          student.previousMetrics?.CPE || 0,
          (student.previousMetrics?.CGPA || 0).toFixed(2),
          student.metrics?.CCC || 0,
          student.metrics?.CCE || 0,
          student.metrics?.CPE || 0,
          (student.metrics?.CGPA || 0).toFixed(2),
          student.remarks || 'Pass'
        ];
      });
    };

    // ——— headers (unchanged layout)
    const profileCols = ['S/No.', 'Reg. Number/Name'];
    const courseCols = (regularCourses || []).map(course => {
      const code = cleanCourseCode(course.code);
      const m = code.match(/^(.*?)(\d{3})$/);
      if (m) {
        const prefixDept = m[1].trim();
        const num = m[2];
        return `${prefixDept}\n${num}\n(${course.unit})`;
      }
      return `${code}\n(${course.unit})`;
    });
    const othersCols = ['Carry over/Others'];
    const currentCols = ['TCC', 'TCE', 'TPE', 'GPA'];
    const previousCols = ['CCC', 'CCE', 'CPE', 'CGPA'];
    const cumulativeCols = ['CCC', 'CCE', 'CPE', 'CGPA'];
    const finalCols = ['Remarks'];

    const allSubHeaders = [
      ...profileCols,
      ...courseCols,
      ...othersCols,
      ...currentCols,
      ...previousCols,
      ...cumulativeCols,
      ...finalCols
    ];

    const groupedHeader = [
      { content: 'Profile', colSpan: profileCols.length, styles: { halign: 'left' } },
      { content: 'Courses', colSpan: courseCols.length, styles: { halign: 'center' } },
      { content: 'Others', colSpan: othersCols.length, styles: { halign: 'center' } },
      { content: 'Current', colSpan: currentCols.length, styles: { halign: 'center' } },
      { content: 'Previous', colSpan: previousCols.length, styles: { halign: 'center' } },
      { content: 'Cumulative', colSpan: cumulativeCols.length, styles: { halign: 'center' } },
      { content: '', colSpan: finalCols.length }
    ];

    const firstCourseIndex = profileCols.length;
    const lastCourseIndex = firstCourseIndex + courseCols.length - 1;
    const carryOverIndex = profileCols.length + courseCols.length;
    const remarksIndex = allSubHeaders.length - 1;

    const columnStyles = {
      0: { cellWidth: 8, halign: 'left' },
      1: { cellWidth: 40, halign: 'left' },
      [carryOverIndex]: { cellWidth: 35, halign: 'left' },
      [remarksIndex]: { cellWidth: 26, halign: 'left' }
    };
    for (let idx = firstCourseIndex; idx <= lastCourseIndex; idx++) {
      columnStyles[idx] = { ...(columnStyles[idx] || {}), halign: 'center' };
    }
    const numericStart = carryOverIndex + 1;
    for (let idx = numericStart; idx < remarksIndex; idx++) {
      columnStyles[idx] = { ...(columnStyles[idx] || {}), halign: 'center' };
    }

    autoTable(doc, {
      startY: tableTopY,
      margin: { top: tableTopY, bottom: tableBottomPadding, left: leftMargin, right: rightMargin },
      head: [groupedHeader, allSubHeaders],
      body: prepareTableData(),
      tableWidth: 'auto',
      styles: {
        font: 'times',
        fontStyle: 'normal',
        fontSize: 7.5,
        textColor: [0, 0, 0],
        cellPadding: 1,
        overflow: 'linebreak',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center'
      },
      alternateRowStyles: { fillColor: false },
      bodyStyles: { pageBreak: 'avoid', fontStyle: 'normal', textColor: [0, 0, 0] },
      rowPageBreak: 'avoid',
      columnStyles,
      willDrawPage: () => {
        drawWatermark();
      },
      didDrawPage: () => {
        // Draw for the current page only (header, footer, border)
        drawHeaderFooter();
      }
    });

    doc.save(`Results_${formData.session}_Sem${formData.semester}_Level${formData.level}.pdf`);
  };

  return { generatePDF };
};

export default useResultPDFGenerator;
