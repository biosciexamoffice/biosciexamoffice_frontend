// src/utils/useBulkResultsPDFGenerator.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Types you can pass:
 * types = ['summary', 'main', 'passfail']
 *
 * inputs:
 *   header = { university, address, college, department, programme, logoUrl }
 *   job = {
 *     session: '2023/2024',
 *     semester: 1,                     // 1|2
 *     levels: ['100','200','300'],     // strings or numbers, we'll sort asc
 *     types: ['summary','main','passfail'],
 *     // fetcher: async (level) => { students, courses } from /academic-metrics/comprehensive
 *     //        same shape as your getComprehensiveResults controller
 *     fetcher: (level) => Promise<{ students: [], courses: [] }>
 *   }
 */

const semesterText = (s) => (Number(s) === 1 ? 'FIRST' : 'SECOND');

const loadImageAsBase64 = async (url) => {
  if (!url) return null;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
};

// A clean, consistent page frame
function drawHeaderFooterAndBorder(doc, meta) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const lm = 10, tm = 10, rm = 10, bm = 10;

  // border
  doc.setLineWidth(0.4);
  doc.rect(lm, tm, pw - lm - rm, ph - tm - bm);

  // header
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('JOSEPH SARWUAN TARKA UNIVERSITY', pw / 2, 16, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('P.M.B 2373, MAKURDI', pw / 2, 21, { align: 'center' });

  // logo at top-left (FIX: use meta.logoBase64)
  if (meta?.logoBase64) {
    doc.addImage(meta.logoBase64, 'JPEG', lm + 2, tm + 2, 16, 16);
  }

  // institution lines
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text(meta?.college || 'COLLEGE OF BIOLOGICAL SCIENCES', pw / 2, 28, { align: 'center' });
  doc.text(meta?.department || 'DEPARTMENT OF BIOCHEMISTRY', pw / 2, 34, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(
    `SESSION: ${meta.session} • ${semesterText(meta.semester)} SEMESTER`,
    pw / 2, 40, { align: 'center' }
  );
  if (meta.programme) {
    doc.setFont('times', 'bold');
    doc.text(`PROGRAMME: ${meta.programme}`, pw / 2, 46, { align: 'center' });
  }

  // footer page number
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  const pageNo = doc.internal.getCurrentPageInfo().pageNumber;
  doc.text(String(pageNo), pw / 2, ph - 6, { align: 'center' });

  // return inner content top
  return 54; // recommended startY for content
}

// ---------- DATA HELPERS ----------

// Prepare grade summary per course for a level
function computeGradeSummaryForLevel({ students, courses }) {
  // Create a bucket per course
  const byCourse = courses.map(c => ({
    id: c.id,
    code: c.code,
    title: c.title,
    unit: c.unit,
    A: 0, B: 0, C: 0, D: 0, E: 0, F: 0,
    Pass: 0, Fail: 0, Registered: 0
  }));

  const idx = new Map(byCourse.map((c, i) => [c.id, i]));

  students.forEach(s => {
    courses.forEach(c => {
      const r = s.results?.[c.id];
      if (!r) return;
      const i = idx.get(c.id);
      byCourse[i].Registered += 1;
      const g = String(r.grade || '').toUpperCase();
      if (['A','B','C','D','E','F'].includes(g)) byCourse[i][g] += 1;
      if (g === 'F') byCourse[i].Fail += 1; else byCourse[i].Pass += 1;
    });
  });

  return byCourse;
}

// Split students into pass/fail
function splitPassFail(students) {
  const pass = [];
  const fail = [];
  students.forEach(s => {
    const remark = String(s.remarks || '').toLowerCase();
    if (remark === 'pass') pass.push(s);
    else fail.push(s);
  });
  return { pass, fail };
}

const padScore = (n) => {
  const v = Math.round(Number(n || 0));
  if (!Number.isFinite(v)) return '';
  return v < 10 ? `0${v}` : String(v);
};
const gradeToPoint = (g) => {
  const x = String(g || '').toUpperCase();
  return x === 'A' ? 5 : x === 'B' ? 4 : x === 'C' ? 3 : x === 'D' ? 2 : x === 'E' ? 1 : x === 'F' ? 0 : null;
};

// ---------- SECTION RENDERERS (all landscape-safe) ----------

function renderLevelTitle(doc, y, level) {
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text(`LEVEL ${level}`, 12, y);
  return y + 6;
}

// 1) Grade Summary
function renderGradeSummary(doc, startY, rows) {
  const head = [[
    'Code', 'Title', 'Unit', 'A', 'B', 'C', 'D', 'E', 'F',
    'Pass', 'Fail', 'Registered'
  ]];
  const body = rows.map(r => ([
    r.code || '', r.title || '', r.unit ?? '',
    r.A, r.B, r.C, r.D, r.E, r.F,
    r.Pass, r.Fail, r.Registered
  ]));

  autoTable(doc, {
    startY,
    head, body,
    margin: { left: 10, right: 10 },
    styles: { font: 'times', fontSize: 9, cellPadding: 2, lineWidth: 0.1, textColor: [0,0,0] },
    headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 22 },      // code
      1: { cellWidth: 92 },      // title
      2: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 10, halign: 'center' },
      7: { cellWidth: 10, halign: 'center' },
      8: { cellWidth: 12, halign: 'center' },  // Pass
      9: { cellWidth: 12, halign: 'center' },  // Fail
      10:{ cellWidth: 18, halign: 'center' },  // Registered
    },
    // FIX: use doc.__meta instead of data.settings._meta
    didDrawPage: (data) => {
      drawHeaderFooterAndBorder(data.doc, data.doc.__meta);
    },
  });
}

// 2) Main Result (compact)
function renderMainResult(doc, startY, students, courses) {
  // build header
  const profileCols = ['S/No.', 'Reg No / Name'];
  const courseCols = courses.map(c => {
    const m = (c.code || '').match(/([A-Z]{3})\s*(\d{3})/);
    const d = m?.[1] || (c.code || '').slice(0,3);
    const n = m?.[2] || '';
    return `${d}\n${n}\n(${c.unit ?? ''})`;
  });
  const currentCols = ['TCC', 'TCE', 'TPE', 'GPA'];
  const finalCols = ['Remarks'];
  const head = [
    [
      { content: 'Profile', colSpan: profileCols.length, styles: { halign: 'left' } },
      { content: 'Courses', colSpan: courseCols.length, styles: { halign: 'center' } },
      { content: 'Current', colSpan: currentCols.length, styles: { halign: 'center' } },
      { content: '', colSpan: finalCols.length, styles: { halign: 'center' } },
    ],
    [...profileCols, ...courseCols, ...currentCols, ...finalCols],
  ];

  // body
  const sorted = [...students].sort((a,b) =>
    String(a.regNo).localeCompare(String(b.regNo), undefined, { numeric: true })
  );
  const body = sorted.map((s, i) => {
    const courseScores = courses.map(c => {
      const r = s.results?.[c.id];
      if (!r) return 'NR';
      return `${padScore(r.grandtotal)}${String(r.grade || '').toUpperCase()}`;
    });
    return [
      i+1,
      `${s.regNo}\n${s.fullName}`,
      ...courseScores,
      s.currentMetrics?.TCC ?? 0,
      s.currentMetrics?.TCE ?? 0,
      s.currentMetrics?.TPE ?? 0,
      (s.currentMetrics?.GPA ?? 0).toFixed(2),
      s.remarks || (s.metrics?.CGPA >= 1.0 ? 'Pass' : ''),
    ];
  });

  const carryIndex = profileCols.length + courseCols.length;

  autoTable(doc, {
    startY,
    head,
    body,
    margin: { left: 10, right: 10 },
    styles: {
      font: 'times', fontSize: 7.6, cellPadding: 1, lineWidth: 0.1, textColor: [0,0,0], valign: 'middle',
    },
    headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 40 },
      [carryIndex - 1]: { cellWidth: 16 },
    },
    // FIX: use doc.__meta
    didDrawPage: (data) => {
      drawHeaderFooterAndBorder(data.doc, data.doc.__meta);
    },
  });
}

// 3) Pass & Fail
function renderPassFail(doc, startY, pass, fail) {
  const table = (title, list) => {
    const head = [['S/No.','Reg. Number','Name of Student','CGPA','Remarks']];
    const body = list.map((s, i) => ([
      i+1, s.regNo, s.fullName,
      (s.metrics?.CGPA ?? 0).toFixed(2),
      s.remarks || (String(s.remarks || '').toLowerCase().startsWith('repeat') ? s.remarks : 'Pass')
    ]));
    autoTable(doc, {
      startY,
      head, body,
      margin: { left: 10, right: 10 },
      styles: { font: 'times', fontSize: 9, cellPadding: 2, lineWidth: 0.1, textColor: [0,0,0] },
      headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 36 },
        2: { cellWidth: 86 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 'auto' },
      },
      // FIX: use doc.__meta and also draw section title each page
      didDrawPage: (data) => {
        drawHeaderFooterAndBorder(data.doc, data.doc.__meta);
        data.doc.setFont('times','bold');
        data.doc.setFontSize(11);
        data.doc.text(title, 12, 60); // label above table each page
      },
    });
  };

  table('A. Pass List', pass);
  if (fail.length) {
    doc.addPage();
    table('B. Fail List', fail);
  }
}

// ---------- MAIN API ----------

const useBulkResultsPDFGenerator = () => {
  const generateCombinedPDF = async (header, job) => {
    const logoBase64 = await loadImageAsBase64(header.logoUrl);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // normalize & sort levels (asc)
    const levels = [...(job.levels || [])]
      .map(l => Number(l))
      .filter(n => Number.isFinite(n))
      .sort((a,b) => a - b);

    // Loop levels
    for (let li = 0; li < levels.length; li++) {
      const level = levels[li];

      // fetch each level data
      const payload = await job.fetcher(String(level));
      const students = payload?.students || [];
      const courses  = payload?.courses  || [];

      // common meta per level page group
      const meta = {
        university: header.university,
        address: header.address,
        college: header.college,
        department: header.department,
        programme: header.programme,
        session: job.session,
        semester: job.semester,
        logoBase64
      };

      // Make meta accessible inside didDrawPage hooks (FIX)
      doc.__meta = meta;

      // SECTION: per-level

      // 1) Grade Summary
      if (job.types.includes('summary')) {
        // jsPDF starts with a blank page already; just draw
        const startY = drawHeaderFooterAndBorder(doc, meta);
        const y1 = renderLevelTitle(doc, startY, level);
        const summaryRows = computeGradeSummaryForLevel({ students, courses });
        renderGradeSummary(doc, y1 + 2, summaryRows);
      }

      // 2) Main Result
      if (job.types.includes('main')) {
        doc.addPage();
        const startY = drawHeaderFooterAndBorder(doc, meta);
        renderLevelTitle(doc, startY, level);
        renderMainResult(doc, startY + 6, students, courses);
      }

      // 3) Pass & Fail
      if (job.types.includes('passfail')) {
        const { pass, fail } = splitPassFail(students);
        doc.addPage();
        const startY = drawHeaderFooterAndBorder(doc, meta);
        renderLevelTitle(doc, startY, level);
        renderPassFail(doc, startY + 8, pass, fail);
      }

      // Add a small separator page between levels (optional)
      if (li < levels.length - 1) {
        doc.addPage();
        const sy = drawHeaderFooterAndBorder(doc, meta);
        doc.setFont('times','italic'); doc.setFontSize(10);
        doc.text('— Next Level —', 12, sy);
      }
    }

    const fname = `Combined_${job.session}_Sem${job.semester}_L${levels[0]}-${levels[levels.length-1]}.pdf`;
    doc.save(fname);
  };

  return { generateCombinedPDF };
};

export default useBulkResultsPDFGenerator;
