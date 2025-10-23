import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import loadLogoBase64 from "./loadLogoBase64.js";
import { normalizeId } from "./normalizeId.js";

let cachedLogoPromise = null;

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

const normalizeCourseCode = (code = "") =>
  String(code).replace(/^[A-Z]-/, "").replace(/\s+/g, "").toUpperCase();

const normalizeRegNo = (regNo = "") => String(regNo).trim().toUpperCase();

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
    const { students = [] } = data || {};
    const metadata = data?.metadata || {};
    const resolveText = (value, fallback) => {
      if (!value) return fallback;
      if (typeof value === 'string') return value;
      return value.name || fallback;
    };
    const college = resolveText(metadata.college || data?.college, 'College Not Provided');
    const department = resolveText(metadata.department || data?.department, 'Department Not Provided');
    const programme = resolveText(metadata.programme || data?.programme, 'Programme Not Provided');
    const deptExamOfficerName = resolveText(metadata.departmentExamOfficer || data?.deptExamOfficer, 'Department Exam Officer');
    const { session, semester, level } = formData || {};
    const { regularCourses = [], carryOverCourses = [] } = separateCourses || {};
    const includeCarryOvers = options.includeCarryOvers !== false; // default true
    const registrationCache = new Map();
    const registrationSetsRaw = options.registrationSets || {};
    const getRegistrationSet = (courseId) => {
      const key = normalizeId(courseId);
      if (!key) return null;
      if (registrationCache.has(key)) {
        return registrationCache.get(key);
      }
      const raw =
        registrationSetsRaw[key] ||
        registrationSetsRaw[String(courseId)];

      let set = null;
      if (raw instanceof Set) {
        set = raw;
      } else if (Array.isArray(raw)) {
        set = new Set(raw.map(normalizeRegNo));
      }
      registrationCache.set(key, set);
      return set;
    };

    const buildResultLookup = (results = {}) => {
      const map = new Map();
      Object.entries(results || {}).forEach(([rawKey, value]) => {
        if (!value) return;
        if (rawKey) {
          map.set(String(rawKey), value);
        }
        const directId = normalizeId(value?.courseId || value?.course?._id);
        if (directId) {
          map.set(directId, value);
        }
        const codeKey = normalizeCourseCode(value?.courseCode || value?.code || value?.course?.code);
        if (codeKey) {
          map.set(codeKey, value);
        }
      });
      return map;
    };

    const resultLookupByStudent = new Map();
    students.forEach((student) => {
      resultLookupByStudent.set(
        String(student.id || student._id || student.regNo || ""),
        buildResultLookup(student.results)
      );
    });

    const findResultForCourse = (lookup, course) => {
      if (!lookup || !course) return null;
      const candidates = [
        normalizeId(course?.id),
        normalizeId(course?._id),
        String(course?.id ?? ""),
        String(course?._id ?? ""),
        normalizeCourseCode(course?.code || course?.courseCode),
      ].filter(Boolean);

      for (const key of candidates) {
        if (lookup.has(key)) {
          return lookup.get(key);
        }
      }
      return null;
    };

    // Build the list of courses to check (regular + optionally carry-overs)
    const coursesToCheck = includeCarryOvers
      ? [...regularCourses, ...carryOverCourses]
      : [...regularCourses];

    // Build rows: only students with at least one missing (NR) or zero (00)
    const rows = students
      .map((s) => {
        const missing = [];
        const regUpper = normalizeRegNo(s.regNo);
        const lookup = resultLookupByStudent.get(
          String(s.id || s._id || s.regNo || "")
        );

        coursesToCheck.forEach((course) => {
          const regSet = getRegistrationSet(course.id || course._id);
          const isRegistered = regSet ? regSet.has(regUpper) : true; // fallback: assume registered if no data
          if (!isRegistered) {
            return;
          }

          const result = findResultForCourse(lookup, course);

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
    if (!cachedLogoPromise) {
      cachedLogoPromise = loadLogoBase64();
    }
    const logoBase64 = await cachedLogoPromise;
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
        `Dept. Exam Officer: ${deptExamOfficerName || 'Department Exam Officer'}    ………………………            Date………………………………`,
        leftMargin,
        pageHeight - 15
      );
        
        
    };

    const drawMetadata = () => {
      doc.setFontSize(9);
      doc.setFont("times", "bold");

      const metadata = [
        [`College: ${college || "College Not Provided"}`, `Level: ${level ?? ""}`],
        [
          `Department: ${department || "Department Not Provided"}`,
          `Semester: ${semester === 1 ? "First" : "Second"}`,
        ],
        [`Programme: ${programme || "Programme Not Provided"}`, `Session: ${session ?? ""}`],
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
