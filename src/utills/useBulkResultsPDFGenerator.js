// src/utils/useBulkResultsPDFGenerator.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import loadLogoBase64 from './loadLogoBase64.js';

const LETTER_GRADES = ['A', 'B', 'C', 'D', 'E', 'F'];

const approvedCoursesCache = new Map();

const normalizeCourseId = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();
    if (typeof value.toString === 'function') return value.toString();
  }
  return String(value);
};

const normalizeCourseCode = (code = '') =>
  String(code)
    .trim()
    .replace(/^[A-Z]-/, '')
    .replace(/\s+/g, '')
    .toUpperCase();

const normalizeRegNo = (value) => String(value || '').trim().toUpperCase();
const cleanCourseCode = (code = '') => String(code || '').replace(/^(?:C-|B-)/i, '').trim();
const pad2 = (n) => String(Number.isFinite(+n) ? Math.round(+n) : n).padStart(2, '0');
const gradeFromScore = (score) => {
  const s = Number(score) || 0;
  if (s >= 70) return 'A';
  if (s >= 60) return 'B';
  if (s >= 50) return 'C';
  if (s >= 45) return 'D';
  if (s >= 40) return 'E';
  return 'F';
};

const resolveOfficerName = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.name || fallback;
};

const formatNameFirstComma = (fullName = '') => {
  const parts = String(fullName).trim().split(/\s+/);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].toUpperCase();
  const first = parts[0].toUpperCase();
  const others = parts.slice(1).join(' ').toUpperCase();
  return `${first}, ${others}`;
};

const buildLevelMeta = (header, payload, job) => {
  const meta = payload?.metadata || {};
  return {
    college: meta.college || payload?.college || header.college,
    department: meta.department || payload?.department || header.department,
    programme: meta.programme || payload?.programme || header.programme,
    dean: resolveOfficerName(meta.dean || payload?.dean, 'Dean'),
    headOfDept: resolveOfficerName(meta.headOfDepartment || payload?.headOfDept, 'Head of Department'),
    deptExamOfficer: resolveOfficerName(meta.departmentExamOfficer || payload?.deptExamOfficer, 'Department Exam Officer'),
    collegeExamOfficer: resolveOfficerName(meta.collegeExamOfficer || payload?.collegeExamOfficer, 'College Exam Officer'),
    session: job.session,
    semester: job.semester,
  };
};

const buildRegistrationsMap = (registrationsByCourse = {}) => {
  const map = new Map();
  Object.entries(registrationsByCourse).forEach(([courseId, list]) => {
    const set = new Set((Array.isArray(list) ? list : []).map(normalizeRegNo));
    map.set(String(courseId), set);
  });
  return map;
};

const normalizeCourseKey = (course) => {
  const normalizedId = normalizeCourseId(course?.id ?? course?._id);
  if (normalizedId) return `id::${normalizedId}`;
  const normalizedCode = normalizeCourseCode(course?.code);
  if (normalizedCode) return `code::${normalizedCode}`;
  return null;
};

const dedupeCourses = (courses = []) => {
  const seen = new Map();
  (courses || []).forEach((course) => {
    if (!course) return;
    const key = normalizeCourseKey(course);
    if (!key) return;
    if (!seen.has(key)) {
      seen.set(key, { ...course, id: normalizeCourseId(course?.id ?? course?._id) || course?.id });
    }
  });
  return Array.from(seen.values());
};

const sortCoursesByUnitThenCode = (courses = []) =>
  [...(courses || [])].sort((a, b) => {
    const unitA = Number(a?.unit ?? 0);
    const unitB = Number(b?.unit ?? 0);
    if (unitA !== unitB) return unitA - unitB;
    return String(a?.code || '').localeCompare(String(b?.code || ''), undefined, { numeric: true });
  });

const combineCoursesByPreference = (preferred = [], secondary = []) => {
  const result = [];
  const seen = new Set();
  const pushList = (list) => {
    (list || []).forEach((course) => {
      if (!course) return;
      const key = normalizeCourseKey(course);
      if (key && seen.has(key)) return;
      if (key) seen.add(key);
      result.push({ ...course, id: normalizeCourseId(course?.id ?? course?._id) || course?.id });
    });
  };
  pushList(preferred || []);
  pushList(secondary || []);
  return result;
};

const resolveApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.__ELECTRON_API_BASE) {
      return window.__ELECTRON_API_BASE;
    }
    if (window.__ELECTRON_DESKTOP__?.apiBase) {
      return window.__ELECTRON_DESKTOP__.apiBase;
    }
  }
  if (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return 'http://localhost:10000/api';
};

const fetchApprovedCoursesForTerm = async (session, semester, level) => {
  if (!session || semester === undefined || semester === null || level === undefined || level === null) {
    return [];
  }

  const cacheKey = `${session}::${semester}::${level}`;
  if (approvedCoursesCache.has(cacheKey)) {
    return approvedCoursesCache.get(cacheKey);
  }

  const baseUrlRaw = resolveApiBaseUrl();
  const baseUrl = baseUrlRaw.endsWith('/') ? baseUrlRaw.slice(0, -1) : baseUrlRaw;
  const url = new URL(`${baseUrl}/approvedCourses`);
  url.searchParams.set('session', session);
  url.searchParams.set('semester', Number(semester));
  url.searchParams.set('level', Number(level));

  const headers = typeof Headers !== 'undefined' ? new Headers() : null;
  const fetchOptions = { method: 'GET' };
  if (headers) {
    headers.set('Accept', 'application/json');
  }
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    if (headers) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      fetchOptions.headers = {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      };
    }
  }

  if (headers && !fetchOptions.headers) {
    fetchOptions.headers = headers;
  } else if (!fetchOptions.headers) {
    fetchOptions.headers = { Accept: 'application/json' };
  }

  const promise = (async () => {
    try {
      const response = await fetch(url.toString(), fetchOptions);
      if (!response.ok) {
        throw new Error(`Failed to fetch approved courses (${response.status})`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('Unable to fetch approved courses for PDF export:', error);
      }
      return [];
    }
  })();

  approvedCoursesCache.set(cacheKey, promise);
  return promise;
};

const splitCoursesByApproval = (courses = [], approvedDocs = []) => {
  const approvedById = new Map();
  const approvedByCode = new Map();

  (approvedDocs || []).forEach((doc) => {
    if (!doc) return;
    (doc.courses || []).forEach((course) => {
      if (!course) return;
      const normalizedId = normalizeCourseId(course?._id || course?.id);
      const normalizedCode = normalizeCourseCode(course?.code);
      const entry = {
        ...course,
        id: normalizedId || course?.id,
      };
      if (normalizedId && !approvedById.has(normalizedId)) {
        approvedById.set(normalizedId, entry);
      }
      if (normalizedCode && !approvedByCode.has(normalizedCode)) {
        approvedByCode.set(normalizedCode, entry);
      }
    });
  });

  const regularCourses = [];
  const carryOverCourses = [];

  (courses || []).forEach((course) => {
    if (!course) return;
    const normalizedId = normalizeCourseId(course?.id || course?._id);
    const normalizedCode = normalizeCourseCode(course?.code);
    const approved =
      (normalizedId && approvedById.get(normalizedId)) ||
      (normalizedCode && approvedByCode.get(normalizedCode));
    if (approved) {
      regularCourses.push({
        ...course,
        id: normalizedId || course?.id,
        option: approved.option ?? course?.option,
      });
    } else {
      carryOverCourses.push({
        ...course,
        id: normalizedId || course?.id,
      });
    }
  });

  return {
    regularCourses: dedupeCourses(regularCourses),
    carryOverCourses: dedupeCourses(carryOverCourses),
  };
};

const findCourseResult = (student, course) => {
  const eager = [
    course?.id,
    course?._id,
    String(course?.id ?? ''),
    String(course?._id ?? ''),
    course?.code,
    String(course?.code ?? '').toUpperCase(),
  ].filter(Boolean);
  for (const key of eager) {
    if (student?.results && student.results[key]) {
      return student.results[key];
    }
  }
  const values = Object.values(student?.results || {});
  return values.find((entry) => {
    if (!entry) return false;
    if (entry.courseId && String(entry.courseId) === String(course?.id || course?._id)) return true;
    if (entry.courseCode && String(entry.courseCode).toUpperCase() === String(course?.code || '').toUpperCase()) return true;
    return false;
  }) || null;
};

const computeGradeSummaryRows = (students, courses, regsMap) => {
  return courses.map((course, index) => {
    const regSet = regsMap.get(String(course.id)) || regsMap.get(String(course._id)) || new Set();
    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    let totalExamined = 0;

    students.forEach((student) => {
      const result = findCourseResult(student, course);
      if (!result) return;
      totalExamined += 1;
      let grade = String(result.grade || '').toUpperCase();
      if (!LETTER_GRADES.includes(grade)) {
        grade = gradeFromScore(result.grandtotal);
      }
      if (!LETTER_GRADES.includes(grade)) {
        grade = 'F';
      }
      gradeCounts[grade] += 1;
    });

    const passCount = gradeCounts.A + gradeCounts.B + gradeCounts.C + gradeCounts.D + gradeCounts.E;
    const percentagePass = totalExamined
      ? ((passCount / totalExamined) * 100).toFixed(2)
      : '0.00';

    const totalRegistered = regSet.size || Math.max(totalExamined, 0);

    return {
      sn: index + 1,
      code: cleanCourseCode(course.code),
      title: course.title || '',
      unit: course.unit ?? '',
      totalRegistered,
      totalExamined,
      ...gradeCounts,
      percentagePass,
    };
  });
};

const drawGradeSummaryHeader = (doc, meta, formInfo, logoBase64, level) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 10;

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('JOSEPH SARWUAN TARKA UNIVERSITY, P. M. B. 2373, MAKURDI', pageWidth / 2, 15, { align: 'center' });

  if (logoBase64) {
    const logoW = 15;
    const logoH = 15;
    const logoX = (pageWidth - logoW) / 2;
    doc.addImage(logoBase64, 'JPEG', logoX, 18, logoW, logoH);
  }

  doc.setFontSize(11);
  doc.text('SUMMARY OF COURSES AND GRADES DISTRIBUTION', pageWidth / 2, 38, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(8);

  const metaStartY = 45;
  const lineGap = 7;
  const leftLabelX = leftMargin;
  const leftValueX = leftLabelX + 35;
  const rightLabelX = pageWidth / 2 + 90;
  const rightValueX = rightLabelX + 28;

  const leftPairs = [
    ['College:', meta.college || 'College Not Provided'],
    ['Department:', meta.department || 'Department Not Provided'],
    ['Programme:', meta.programme || 'Programme Not Provided'],
  ];
  const rightPairs = [
    ['Level:', String(formInfo.level ?? '')],
    ['Semester:', Number(formInfo.semester) === 1 ? 'First' : 'Second'],
    ['Session:', String(formInfo.session ?? '')],
  ];

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

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
};

const renderGradeSummarySection = ({
  doc,
  logoBase64,
  meta,
  formInfo,
  level,
  courses,
  students,
  regsMap,
  rows,
}) => {
  const courseList = Array.isArray(courses) ? courses : [];
  const summaryRows = rows ?? computeGradeSummaryRows(students, courseList, regsMap);
  if (!summaryRows.length) {
    return false;
  }
  const tableTopY = 60;
  const leftMargin = 10;
  const rightMargin = 10;

  autoTable(doc, {
    startY: tableTopY,
    head: [[
      { content: 'S/N', rowSpan: 2 },
      { content: 'COURSE CODE', rowSpan: 2 },
      { content: 'COURSE TITLE', rowSpan: 2 },
      { content: 'UNIT', rowSpan: 2 },
      { content: 'TOTAL REGISTERED', rowSpan: 2 },
      { content: 'TOTAL EXAMINED', rowSpan: 2 },
      { content: 'LETTER GRADES', colSpan: 6, styles: { halign: 'center' } },
      { content: 'PERCENTAGE PASS', rowSpan: 2 },
    ], [
      { content: 'A', styles: { halign: 'center' } },
      { content: 'B', styles: { halign: 'center' } },
      { content: 'C', styles: { halign: 'center' } },
      { content: 'D', styles: { halign: 'center' } },
      { content: 'E', styles: { halign: 'center' } },
      { content: 'F', styles: { halign: 'center' } },
    ]],
    body: summaryRows.map((row) => [
      row.sn,
      row.code,
      row.title,
      row.unit,
      row.totalRegistered,
      row.totalExamined,
      row.A,
      row.B,
      row.C,
      row.D,
      row.E,
      row.F,
      row.percentagePass,
    ]),
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 8,
      cellPadding: 1.5,
      overflow: 'linebreak',
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 110 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 9, halign: 'center' },
      7: { cellWidth: 9, halign: 'center' },
      8: { cellWidth: 9, halign: 'center' },
      9: { cellWidth: 9, halign: 'center' },
      10: { cellWidth: 9, halign: 'center' },
      11: { cellWidth: 9, halign: 'center' },
      12: { cellWidth: 35, halign: 'center' },
    },
    margin: { left: leftMargin, right: rightMargin, top: tableTopY, bottom: 15 },
    didDrawPage: (data) => {
      drawGradeSummaryHeader(data.doc, meta, formInfo, logoBase64, level);
    },
  });
  return true;
};

const buildRemarks = (student, regularCourses, carryOverCourses, regsMap) => {
  const failures = [];
  const regUpper = normalizeRegNo(student.regNo);
  const combined = [
    ...(Array.isArray(regularCourses) ? regularCourses : []),
    ...(Array.isArray(carryOverCourses) ? carryOverCourses : []),
  ];
  combined.forEach((course) => {
    const regSet = regsMap.get(String(course.id)) || regsMap.get(String(course._id));
    const isRegistered = regSet ? regSet.has(regUpper) : true;
    if (!isRegistered) return;
    const result = findCourseResult(student, course);
    const grade = result ? (result.grade || gradeFromScore(result.grandtotal)) : 'F';
    const normalizedGrade = String(grade || '').toUpperCase();
    if (normalizedGrade === 'F') {
      const unit = course?.unit ?? '';
      failures.push(`${unit}${cleanCourseCode(course.code)}`);
    }
  });
  return failures.length ? `Repeat ${failures.join(' ')}` : 'Pass';
};

const drawMainResultsHeaderFooter = (doc, meta, formInfo, logoBase64, level) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 10;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('JOSEPH SARWUAN TARKA UNIVERSITY, P. M. B. 2373, MAKURDI', pageWidth / 2, 15, { align: 'center' });

  if (logoBase64) {
    const logoWidth = 15;
    const logoHeight = 15;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 18;
    doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoWidth, logoHeight);
  }

  doc.text('EXAMINATION RESULT SHEET', pageWidth / 2, 38, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  const metaStartY = 45;
  const metaGap = 7;
  const leftLabelX = leftMargin;
  const leftValueX = leftLabelX + 28;
  const rightLabelX = pageWidth / 2 + 105;
  const rightValueX = rightLabelX + 20;

  const leftPairs = [
    ['College:', meta.college || 'College Not Provided'],
    ['Department:', meta.department || 'Department Not Provided'],
    ['Programme:', meta.programme || 'Programme Not Provided'],
  ];

  const rightPairs = [
    ['Level:', formInfo.level],
    ['Semester:', Number(formInfo.semester) === 1 ? 'First' : 'Second'],
    ['Session:', formInfo.session],
  ];

  leftPairs.forEach(([label, value], idx) => {
    const y = metaStartY + idx * metaGap;
    doc.text(label, leftLabelX, y);
    doc.text(String(value ?? ''), leftValueX, y);
  });

  rightPairs.forEach(([label, value], idx) => {
    const y = metaStartY + idx * metaGap;
    doc.text(label, rightLabelX, y);
    doc.text(String(value ?? ''), rightValueX, y);
  });

  const footerStartY = pageHeight - 40;
  const footerGap = 14;
  const leftFooterX = leftMargin;
  const rightFooterX = pageWidth / 2 + 60;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`Dept. Exam. Officer: ${meta.deptExamOfficer || 'Department Exam Officer'}`, leftFooterX, footerStartY);
  doc.text(`College Exam. Officer: ${meta.collegeExamOfficer || 'College Exam Officer'}`, leftFooterX, footerStartY + footerGap);
  doc.text(`Head of Dept: ${meta.headOfDept || 'Head of Department'}`, rightFooterX, footerStartY);
  doc.text(`Dean: ${meta.dean || 'Dean'}`, rightFooterX, footerStartY + footerGap);
};

const renderMainResultSection = ({
  doc,
  logoBase64,
  meta,
  formInfo,
  level,
  watermarkText,
  courses,
  carryOverCourses = [],
  students,
  regsMap,
}) => {
  const regularCourses = sortCoursesByUnitThenCode(dedupeCourses(Array.isArray(courses) ? courses : []));
  const carryCourses = sortCoursesByUnitThenCode(dedupeCourses(Array.isArray(carryOverCourses) ? carryOverCourses : []));

  if (!students.length || !regularCourses.length) {
    return false;
  }
  const tableTopY = 60;
  const leftMargin = 10;
  const rightMargin = 10;
  const tableBottomPadding = 45;

  const sortedStudents = [...students].sort((a, b) => {
    const regA = String(a.regNo || '');
    const regB = String(b.regNo || '');
    return regA.localeCompare(regB, undefined, { numeric: true });
  });

  const buildCarryOverCell = (student) => {
    const regUpper = normalizeRegNo(student.regNo);
    return carryCourses
      .map((course) => {
        const regSet = regsMap.get(String(course.id)) || regsMap.get(String(course._id));
        const isRegistered = regSet ? regSet.has(regUpper) : true;
        if (!isRegistered) return null;
        const result = findCourseResult(student, course);
        const code = cleanCourseCode(course.code).replace(/\s/g, '');
        const unit = course?.unit ?? '';
        if (result) {
          const score = pad2(result.grandtotal || 0);
          const grade = result.grade || gradeFromScore(result.grandtotal);
          return `${unit}${code}\u00A0${score}${String(grade || '').toUpperCase()}`;
        }
        return `${unit}${code}\u00A000F`;
      })
      .filter(Boolean)
      .join(' ');
  };

  const buildStudentRow = (student, index) => {
    const regUpper = normalizeRegNo(student.regNo);

    const courseCells = regularCourses.map((course) => {
      const regSet = regsMap.get(String(course.id)) || regsMap.get(String(course._id));
      const isRegistered = regSet ? regSet.has(regUpper) : true;
      const isElective = String(course?.option || '').toUpperCase() === 'E';
      if (!isRegistered) return isElective ? '-' : 'NR';
      const result = findCourseResult(student, course);
      if (result) {
        const score = pad2(result.grandtotal || 0);
        const grade = result.grade || gradeFromScore(result.grandtotal);
        return `${score}${String(grade || '').toUpperCase()}`;
      }
      return '00F';
    });

    const carryOver = buildCarryOverCell(student);
    const current = student.currentMetrics || {};
    const previous = student.previousMetrics || {};
    const cumulative = student.metrics || {};
    const remarks = student.remarks || buildRemarks(student, regularCourses, carryCourses, regsMap);

    const formatName = (fullName = '') => {
      const parts = fullName.trim().split(/\s+/);
      if (!parts.length) return '';
      const surname = parts[0].toUpperCase();
      const others = parts.slice(1).join(' ').toUpperCase();
      return others ? `${surname}, ${others}` : surname;
    };

    return [
      index + 1,
      `${student.regNo}\n${formatName(student.fullName || '')}`,
      ...courseCells,
      carryOver,
      current.TCC ?? 0,
      current.TCE ?? 0,
      current.TPE ?? 0,
      (current.GPA ?? 0).toFixed(2),
      previous.CCC ?? 0,
      previous.CCE ?? 0,
      previous.CPE ?? 0,
      (previous.CGPA ?? 0).toFixed(2),
      cumulative.CCC ?? 0,
      cumulative.CCE ?? 0,
      cumulative.CPE ?? 0,
      (cumulative.CGPA ?? 0).toFixed(2),
      remarks,
    ];
  };

  const profileCols = ['S/No.', 'Reg. Number/Name'];
  const courseCols = regularCourses.map((course) => {
    const code = cleanCourseCode(course.code);
    const match = code.match(/^(.*?)(\d{3})$/);
    if (match) {
      const prefix = match[1].trim();
      const num = match[2];
      return `${prefix}\n${num}\n(${course.unit ?? ''})`;
    }
    return `${code}\n(${course.unit ?? ''})`;
  });
  const othersCols = ['Carry over/Others'];
  const currentCols = ['TCC', 'TCE', 'TPE', 'GPA'];
  const previousCols = ['CCC', 'CCE', 'CPE', 'CGPA'];
  const cumulativeCols = ['CCC', 'CCE', 'CPE', 'CGPA'];
  const finalCols = ['Remarks'];

  const head = [
    [
      { content: 'Profile', colSpan: profileCols.length, styles: { halign: 'left' } },
      { content: 'Courses', colSpan: courseCols.length, styles: { halign: 'center' } },
      { content: 'Others', colSpan: othersCols.length, styles: { halign: 'center' } },
      { content: 'Current', colSpan: currentCols.length, styles: { halign: 'center' } },
      { content: 'Previous', colSpan: previousCols.length, styles: { halign: 'center' } },
      { content: 'Cumulative', colSpan: cumulativeCols.length, styles: { halign: 'center' } },
      { content: '', colSpan: finalCols.length },
    ],
    [
      ...profileCols,
      ...courseCols,
      ...othersCols,
      ...currentCols,
      ...previousCols,
      ...cumulativeCols,
      ...finalCols,
    ],
  ];

  const carryOverIndex = profileCols.length + courseCols.length;
  const remarksIndex = profileCols.length + courseCols.length + othersCols.length + currentCols.length + previousCols.length + cumulativeCols.length;

  const columnStyles = {
    0: { cellWidth: 8, halign: 'left' },
    1: { cellWidth: 40, halign: 'left' },
    [carryOverIndex]: { cellWidth: 35, halign: 'left' },
    [remarksIndex]: { cellWidth: 38, halign: 'left' },
  };

  for (let idx = profileCols.length; idx < profileCols.length + courseCols.length; idx += 1) {
    columnStyles[idx] = { halign: 'center' };
  }
  for (let idx = carryOverIndex + 1; idx < remarksIndex; idx += 1) {
    columnStyles[idx] = { halign: 'center' };
  }

  autoTable(doc, {
    startY: tableTopY,
    margin: { top: tableTopY, bottom: tableBottomPadding, left: leftMargin, right: rightMargin },
    head,
    body: sortedStudents.map((student, index) => buildStudentRow(student, index)),
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
      lineColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    alternateRowStyles: { fillColor: false },
    bodyStyles: { pageBreak: 'avoid', fontStyle: 'normal', textColor: [0, 0, 0] },
    columnStyles,
    rowPageBreak: 'avoid',
    willDrawPage: () => {
      const text = watermarkText ?? 'DRAFT';
      if (text) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const supportsGraphicsState =
          typeof doc.saveGraphicsState === 'function' && typeof doc.restoreGraphicsState === 'function';
        if (supportsGraphicsState) doc.saveGraphicsState();
        doc.setFont('times', 'bold');
        doc.setFontSize(120);
        try {
          doc.setTextColor(0, 0, 0, 0.15);
        } catch {
          doc.setTextColor(200, 200, 200);
        }
        doc.text(text, pageWidth / 1.5, pageHeight / 1.5, {
          angle: 45,
          align: 'center',
          baseline: 'middle',
        });
        if (supportsGraphicsState) {
          doc.restoreGraphicsState();
        }
        doc.setTextColor(0, 0, 0);
      }
    },
    didDrawPage: (data) => {
      drawMainResultsHeaderFooter(data.doc, meta, formInfo, logoBase64, level);
    },
  });
  return true;
};

const renderPassFailSection = ({
  doc,
  logoBase64,
  meta,
  formInfo,
  payload,
  students,
}) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 10;
  const rightMargin = 10;
  const headerHeight = 40;
  const footerHeight = 20;

  const getCGPA = (student) => Number(student?.metrics?.CGPA ?? 0);

  const passed = [];
  const failed = [];
  const probation = [];

  students.forEach((student) => {
    const cgpa = getCGPA(student);
    if (cgpa < 1.0) probation.push(student);
    const remark = String(student?.remarks || '').toLowerCase();
    if (remark === 'pass') passed.push(student);
    else if (remark.startsWith('repeat')) failed.push(student);
  });

  const withdrawal = Array.isArray(payload?.withdrawalStudents) ? payload.withdrawalStudents : [];
  const nonRegistration = Array.isArray(payload?.nonRegisteredStudents) ? payload.nonRegisteredStudents : [];

  const byReg = (a, b) => String(a.regNo || '').localeCompare(String(b.regNo || ''), undefined, { numeric: true });
  passed.sort(byReg);
  failed.sort(byReg);
  probation.sort(byReg);
  withdrawal.sort(byReg);
  nonRegistration.sort(byReg);

  const drawHeaderFooter = () => {
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(
      'JOSEPH SARWUAN TARKA UNIVERSITY, P. M. B. 2373, MAKURDI',
      pageWidth / 2,
      15,
      { align: 'center' }
    );

    if (logoBase64) {
      const logoWidth = 15;
      const logoHeight = 15;
      const logoX = (pageWidth - logoWidth) / 2;
      const logoY = 18;
      doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoWidth, logoHeight);
    }

    doc.text('SUMMARY OF EXAMINATION RESULTS', pageWidth / 2, 38, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(
      `Dean of College: ${meta.dean || 'Dean'}    ………………………            Date………………………………`,
      leftMargin,
      doc.internal.pageSize.getHeight() - 15
    );
  };

  const drawMetadata = () => {
    doc.setFontSize(9);
    doc.setFont('times', 'bold');

    const leftLabelX = leftMargin;
    const leftValueX = leftLabelX + 28;
    const rightLabelX = pageWidth / 2 + 20;
    const rightValueX = rightLabelX + 20;

    const metaStartY = headerHeight + 10;
    const rowGap = 7;

    const leftPairs = [
      ['College:', meta.college || 'College Not Provided'],
      ['Department:', meta.department || 'Department Not Provided'],
      ['Programme:', meta.programme || 'Programme Not Provided'],
    ];

    const rightPairs = [
      ['Level:', String(formInfo.level || '')],
      ['Semester:', Number(formInfo.semester) === 1 ? 'First' : 'Second'],
      ['Session:', String(formInfo.session || '')],
    ];

    let y = metaStartY;

    const drawPair = (xLabel, xValue, [label, value], yPos) => {
      doc.setFont('times', 'bold');
      doc.text(String(label), xLabel, yPos);
      doc.setFont('times', 'normal');
      doc.text(String(value), xValue, yPos);
    };

    for (let i = 0; i < leftPairs.length; i += 1) {
      const yRow = y + i * rowGap;
      drawPair(leftLabelX, leftValueX, leftPairs[i], yRow);
      drawPair(rightLabelX, rightValueX, rightPairs[i], yRow);
    }

    return y + (leftPairs.length - 1) * rowGap;
  };

  const createTable = (title, list, mode, startY) => {
    const headers = mode === 'nonreg'
      ? [
          { header: 'S/No.', dataKey: 'index' },
          { header: 'Reg. Number', dataKey: 'regNo' },
          { header: 'Name of Student', dataKey: 'name' },
        ]
      : [
          { header: 'S/No.', dataKey: 'index' },
          { header: 'Reg. Number', dataKey: 'regNo' },
          { header: 'Name of Student', dataKey: 'name' },
          { header: 'CGPA', dataKey: 'cgpa' },
          ...(mode === 'fail'
            ? [{ header: 'Failed Course(s)', dataKey: 'remarks' }]
            : (mode === 'probation' || mode === 'withdrawal')
            ? []
            : [{ header: 'Remarks', dataKey: 'remarks' }]),
        ];

    const rows = list.map((student, idx) => {
      const base = {
        index: idx + 1,
        regNo: student.regNo,
        name: formatNameFirstComma(student.fullName),
        cgpa: getCGPA(student).toFixed(2),
      };
      if (mode === 'nonreg') return base;
      if (mode === 'fail') {
        const codes = ((student.remarks || '').match(/[A-Z0-9-]+(?:\s*[A-Z]+)?\s*\d{3}/g) || [])
          .map((s) => s.trim())
          .join('\n');
        return { ...base, remarks: codes || 'Repeat' };
      }
      if (mode === 'pass') {
        return { ...base, remarks: 'Pass' };
      }
      if (mode === 'probation') {
        return { ...base, remarks: student.remarks || 'Probation' };
      }
      if (mode === 'withdrawal') {
        return { ...base, remarks: student.remarks || 'Withdrawal' };
      }
      return { ...base, remarks: student.remarks || '' };
    });

    if (!rows.length) return;

    const tableHead = [headers.map((h) => h.header)];
    const tableBody = rows.map((r) => headers.map((h) => r[h.dataKey]));

    const colStyles = mode === 'nonreg'
      ? { 0: { cellWidth: 16, halign: 'center' }, 1: { cellWidth: 40 }, 2: { cellWidth: 140 } }
      : {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 40 },
          2: { cellWidth: 80 },
          3: { cellWidth: 20, halign: 'center' },
          ...(mode === 'fail'
            ? { 4: { cellWidth: 60, halign: 'left' } }
            : mode !== 'probation' && mode !== 'withdrawal'
            ? { 4: { cellWidth: 48, halign: 'left' } }
            : {}),
        };

    let firstPageOfTable = true;

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY,
      margin: {
        left: leftMargin + 3,
        right: rightMargin + 3,
        top: headerHeight + 45,
        bottom: footerHeight + 10,
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
        minCellHeight: 6,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.2,
        halign: 'left',
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
      },
      columnStyles: colStyles,
      didDrawPage: () => {
        drawHeaderFooter();
        const metaY = drawMetadata();
        if (!firstPageOfTable && (mode === 'pass' || mode === 'fail' || mode === 'nonreg')) {
          doc.setFont('times', 'bold');
          doc.setFontSize(11);
          doc.text(`${title} continued`, leftMargin, metaY + 10);
        }
        firstPageOfTable = false;
    },
  });
  return true;
};

  const sections = [
    ['A. Pass List', passed, 'pass'],
    ['B. Fail List', failed, 'fail'],
    ['C. Probation List', probation, 'probation'],
    ['D. Withdrawal List', withdrawal, 'withdrawal'],
    ['E. Non-Registration List', nonRegistration, 'nonreg'],
  ];

  sections.forEach(([title, list, mode], idx) => {
    if (idx > 0) {
      doc.addPage('legal', 'portrait');
    }
    drawHeaderFooter();
    const metaY = drawMetadata();
    if (!list.length) {
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(`${title}: Nil`, leftMargin, metaY + 10);
      return;
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(title, leftMargin, metaY + 10);
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    if (mode === 'pass') {
      doc.text('The following students have passed all courses registered for the semester', leftMargin, metaY + 15);
    } else if (mode === 'fail') {
      doc.text('The following students have failed the course(s) indicated against their names', leftMargin, metaY + 15);
    } else if (mode === 'probation') {
      doc.text('The following students are on probation', leftMargin, metaY + 15);
    } else if (mode === 'withdrawal') {
      doc.text('This student has voluntarily withdrawn from the university', leftMargin, metaY + 15);
    } else if (mode === 'nonreg') {
      doc.text('The following students did not register for the semester', leftMargin, metaY + 15);
    }
    createTable(title, list, mode, metaY + 22);
  });
};

const useBulkResultsPDFGenerator = () => {
  const generateCombinedPDF = async (header, job) => {
    const sortedLevels = [...(job.levels || [])]
      .map((l) => Number(l))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    const logoBase64 = await loadLogoBase64(header.logoUrl || '/uam.jpeg');

    let doc = null;
    const beginSection = (orientation = 'landscape') => {
      if (!doc) {
        doc = new jsPDF({ orientation, unit: 'mm', format: 'legal' });
      } else {
        doc.addPage('legal', orientation);
      }
      return doc;
    };

    for (const level of sortedLevels) {
      const payload = await job.fetcher(String(level)) || {};
      const rawStudents = Array.isArray(payload.students) ? payload.students : [];
      const primaryCourses = Array.isArray(payload.courses) ? payload.courses : [];
      const regsMap = buildRegistrationsMap(payload.registrationsByCourse);
      const meta = buildLevelMeta(header, payload, job);
      const formInfo = {
        session: job.session,
        semester: job.semester,
        level,
      };

      const approvedDocs = await fetchApprovedCoursesForTerm(job.session, job.semester, level);
      let regularCourses = [];
      let carryCourses = [];

      if (approvedDocs.length) {
        const split = splitCoursesByApproval(primaryCourses, approvedDocs);
        regularCourses = split.regularCourses;
        carryCourses = split.carryOverCourses;
        if (Array.isArray(payload.carryOverCourses) && payload.carryOverCourses.length) {
          carryCourses = dedupeCourses([...carryCourses, ...payload.carryOverCourses]);
        }
        if (Array.isArray(payload.regularCourses) && payload.regularCourses.length) {
          regularCourses = dedupeCourses([...regularCourses, ...payload.regularCourses]);
        }
      } else if (Array.isArray(payload.regularCourses) && payload.regularCourses.length) {
        regularCourses = dedupeCourses(payload.regularCourses);
        carryCourses = dedupeCourses(Array.isArray(payload.carryOverCourses) ? payload.carryOverCourses : []);
      } else {
        regularCourses = dedupeCourses(primaryCourses);
        carryCourses = dedupeCourses(Array.isArray(payload.carryOverCourses) ? payload.carryOverCourses : []);
      }

      const existingCourseKeys = new Set();
      const registerKey = (course) => {
        const key = normalizeCourseKey(course);
        if (key) existingCourseKeys.add(key);
      };

      regularCourses.forEach(registerKey);
      carryCourses.forEach(registerKey);

      const extraCarryCourses = [];
      rawStudents.forEach((student) => {
        Object.values(student?.results || {}).forEach((result) => {
          if (!result) return;
          const candidateCourse = {
            id: normalizeCourseId(
              result.courseId ||
              result?.course?._id ||
              result?.course?.id
            ) || undefined,
            code: result.courseCode || result.code || result?.course?.code || '',
            title: result?.course?.title || result.title || '',
            unit: result?.course?.unit ?? result.unit ?? 0,
            option: result?.course?.option,
          };
          const key = normalizeCourseKey(candidateCourse);
          if (!key || existingCourseKeys.has(key)) {
            return;
          }
          existingCourseKeys.add(key);
          extraCarryCourses.push(candidateCourse);
        });
      });

      if (extraCarryCourses.length) {
        carryCourses = dedupeCourses([...carryCourses, ...extraCarryCourses]);
      }

      regularCourses = sortCoursesByUnitThenCode(regularCourses);
      carryCourses = sortCoursesByUnitThenCode(carryCourses);

      const students = rawStudents.map((student) => {
        const existing = String(student?.remarks || '').trim();
        const inferred = buildRemarks(student, regularCourses, carryCourses, regsMap);
        return existing ? { ...student, remarks: existing } : { ...student, remarks: inferred };
      });

      const gradeSummaryCourses = combineCoursesByPreference(regularCourses, carryCourses);
      const gradeSummaryRows = computeGradeSummaryRows(students, gradeSummaryCourses, regsMap);

      if (job.types.includes('summary') && gradeSummaryRows.length) {
        beginSection('landscape');
        renderGradeSummarySection({
          doc,
          logoBase64,
          meta,
          formInfo,
          level,
          courses: gradeSummaryCourses,
          students,
          regsMap,
          rows: gradeSummaryRows,
        });
      }

      if (job.types.includes('main') && students.length && regularCourses.length) {
        beginSection('landscape');
        renderMainResultSection({
          doc,
          logoBase64,
          meta,
          formInfo,
          level,
          watermarkText: payload?.watermarkText,
          courses: regularCourses,
          carryOverCourses: carryCourses,
          students,
          regsMap,
        });
      }

      if (job.types.includes('passfail')) {
        beginSection('portrait');
        renderPassFailSection({
          doc,
          logoBase64,
          meta,
          formInfo,
          payload,
          students,
        });
      }
    }

    if (!doc) {
      doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });
    }

    const totalPages = doc.getNumberOfPages();
    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
      doc.setPage(pageIndex);
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text(`${pageIndex} / ${totalPages}`, width / 2, height - 6, { align: 'center' });
    }

    const firstLevel = sortedLevels[0] ?? 'NA';
    const lastLevel = sortedLevels[sortedLevels.length - 1] ?? firstLevel;
    const fname = `Combined_${job.session}_Sem${job.semester}_L${firstLevel}-${lastLevel}.pdf`;
    doc.save(fname);
  };

  return { generateCombinedPDF };
};

export default useBulkResultsPDFGenerator;
