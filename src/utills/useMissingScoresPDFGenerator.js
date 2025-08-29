import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Prefer CA + TOTAL EXAM when both are available; otherwise use provided grandTotal.
// If neither is available, return null to indicate "no score recorded".
const computeGrandTotal = (row = {}) => {
  const hasCA = row.ca !== undefined && row.ca !== null;
  const hasExam = row.totalexam !== undefined && row.totalexam !== null;

  if (hasCA && hasExam) {
    return Math.round(Number(row.ca) + Number(row.totalexam));
  }
  if (row.grandTotal !== undefined && row.grandTotal !== null) {
    return Math.round(Number(row.grandTotal));
  }
  if (row.grandtotal !== undefined && row.grandtotal !== null) {
    // defensive: alternate casing
    return Math.round(Number(row.grandtotal));
  }
  return null; // no score
};

const cleanCourseCode = (code = "") =>
  String(code).replace(/^[A-Z]-/, "").replace(/\s/g, "");

const loadImageAsBase64 = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    // Gracefully continue without a logo if it fails
    return null;
  }
};

// Format: FIRSTNAME, OTHER NAMES
const formatNameFirstComma = (fullName = "") => {
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].toUpperCase();
  const first = parts[0].toUpperCase();
  const others = parts.slice(1).join(" ").toUpperCase();
  return `${first}, ${others}`;
};

/**
 * generatePDF(data, formData, separateCourses, options?)
 * - data: processed/enhanced result (must include students[])
 * - formData: { session, semester, level }
 * - separateCourses: { regularCourses, carryOverCourses }
 * - options.includeCarryOvers: boolean (default true)
 */
const useMissingScoresPDFGenerator = () => {
  const generatePDF = async (data, formData, separateCourses, options = {}) => {
    const { students = [], college, department, programme } = data || {};
    const { session, semester, level } = formData || {};
    const { regularCourses = [], carryOverCourses = [] } = separateCourses || {};
    const includeCarryOvers = options.includeCarryOvers !== false; // default true

    // Build the list of courses to check (regular + optionally carry-overs)
    const coursesToCheck = includeCarryOvers
      ? [...regularCourses, ...carryOverCourses]
      : [...regularCourses];

    // Build rows: only students with at least one missing (NR) or zero (00)
    const rows = students
      .map((s) => {
        const missing = [];

        coursesToCheck.forEach((course) => {
          const result = s.results?.[course.id];

          if (!result) {
            // No result recorded at all
            missing.push(`${cleanCourseCode(course.code)}(NR)`);
            return;
          }

          const gt = computeGrandTotal(result);
          if (gt === null) {
            // Present but no usable score values
            missing.push(`${cleanCourseCode(course.code)}(NR)`);
          } else if (gt === 0) {
            // Effective score = 0
            missing.push(`${cleanCourseCode(course.code)}(00)`);
          }
        });

        return {
          regNo: s.regNo,
          name: formatNameFirstComma(s.fullName),
          missingList: missing,
        };
      })
      .filter((r) => r.missingList.length > 0)
      .map((r, idx) => ({
        index: idx + 1,
        regNo: r.regNo,
        name: r.name,
        missing: r.missingList.join(", "),
      }));

    // Create the PDF
    const logoBase64 = await loadImageAsBase64("/uam.jpeg");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "legal" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const leftMargin = 10;
    const rightMargin = 10;
    const headerHeight = 40;
    const footerHeight = 20;

    const drawHeaderFooter = () => {
      doc.setFontSize(12);
      doc.setFont("times", "bold");
      doc.text(
        "JOSEPH SARWUAN TARKA UNIVERSITY, P. M. B. 2373, MAKURDI",
        pageWidth / 2,
        15,
        { align: "center" }
      );

      if (logoBase64) {
        const logoWidth = 15;
        const logoHeight = 15;
        const logoX = (pageWidth - logoWidth) / 2;
        const logoY = 18;
        doc.addImage(logoBase64, "JPEG", logoX, logoY, logoWidth, logoHeight);
      }

      doc.text("MISSING SCORES REPORT", pageWidth / 2, 38, { align: "center" });

      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.text(
        "Dept. Exam Officer: MR. I. Y. JOEL    ………………………            Date………………………………",
        leftMargin,
        pageHeight - 15
      );
        
        
    };

    const drawMetadata = () => {
      doc.setFontSize(9);
      doc.setFont("times", "bold");

      const metadata = [
        [`College: ${college || "Biological Sciences"}`, `Level: ${level ?? ""}`],
        [
          `Department: ${department || "Biochemistry"}`,
          `Semester: ${semester === 1 ? "First" : "Second"}`,
        ],
        [`Programme: ${programme || "B. Sc. Biochemistry"}`, `Session: ${session ?? ""}`],
      ];

      const rightColumnX = pageWidth / 2 + 20;
      let y = headerHeight + 10;

      metadata.forEach(([left, right]) => {
        doc.text(left, leftMargin, y);
        doc.text(right, rightColumnX, y);
        y += 7;
      });

      // Legend
      doc.setFont("times", "normal");
      doc.text("Legend: NR = No Result / Not Recorded, 00 = Score is zero", leftMargin, y + 2);

      return y + 6;
    };

    const tableHead = [
      ["S/No.", "Reg. Number", "Name of Student", "Courses with Missing Scores (NR/00)"],
    ];
    const tableBody = rows.length
      ? rows.map((r) => [r.index, r.regNo, r.name, r.missing])
      : [["—", "—", "—", "No missing scores found"]];

    const startY = drawMetadata() + 6;

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY,
      margin: {
        left: leftMargin,
        right: rightMargin,
        top: headerHeight + 15,
        bottom: footerHeight + 10,
      },
      theme: "grid",
      styles: {
        font: "times",
        fontSize: 9,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "middle",
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        minCellHeight: 6,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineWidth: 0.2,
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 40 },
        2: { cellWidth: 65 },
        3: { cellWidth: 80 }, // wraps NR/00 list
      },
      didDrawPage: () => {
        drawHeaderFooter();
      },
    });

    doc.save(`MissingScores_${session}_${semester}_${level}.pdf`);
  };

  return { generatePDF };
};

export default useMissingScoresPDFGenerator;
