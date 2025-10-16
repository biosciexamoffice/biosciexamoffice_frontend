// src/pages/result/component/QuickCompute.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, Alert, Chip, useTheme, Tooltip, TablePagination,
  Divider, IconButton, Toolbar, Backdrop, Skeleton, Stack, Menu, MenuItem as MenuEntry, alpha,
  Card, CardContent, CardHeader,
} from "@mui/material";
import BoltIcon from '@mui/icons-material/Bolt';
import { Info as InfoIcon } from "@mui/icons-material";
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  RestartAlt as RestartAltIcon,
  TableView as TableViewIcon
} from '@mui/icons-material';
import LoadingButton from '@mui/lab/LoadingButton';

// hooks (same slices you already use)
import { useGetSessionsQuery } from "../../../store/api/sessionApi";
import { useLazySearchMetricsQuery } from "../../../store/api/academicMetricsApi";
import { useLazyGetAllResultsQuery } from "../../../store/api/resultApi";
import { useGetApprovedCoursesByCriteriaQuery } from "../../../store/api/approvedCoursesApi";
import { useLazySearchCourseRegistrationsQuery } from "../../../store/api/courseRegistrationApi";

// export utilities (exact same ones ResultComputation uses)
import { downloadExcel, generatePassFailExcel } from '../../../utills/dowloadResultExcel';
import useResultPDFGenerator from '../../../utills/useResultPDFGenerator';
import useGradeSummaryPDFGenerator from '../../../utills/useGradeSummaryPDFGenerator';
import usePassFailPDFGenerator from '../../../utills/usePassFailPDFGenerator';
import useGraduatingListPDF from '../../../utills/useGraduatingListPDF';
import useGraduatingListPrintPDF from '../../../utills/useGraduatingListPrintPDF';
import useMissingScoresPDFGenerator from '../../../utills/useMissingScoresPDFGenerator';

// ————————————————————————————————————————————————————————————
// helpers
const normalizeRegNo = (s) => (s ?? '').toString().trim().toUpperCase();

// normalize course codes so BIO 101, BIO-101, A-BIO101 → BIO101
const normalizeCode = (code = '') =>
  String(code)
    .trim()
    .replace(/^[A-Z]-/, '')        // strip leading "X-"
    .replace(/[\s-]/g, '')         // remove spaces & hyphens
    .toUpperCase();

const gradeFromScore = (score) => {
  const s = Number(score) || 0;
  if (s >= 70) return 'A';
  if (s >= 60) return 'B';
  if (s >= 50) return 'C';
  if (s >= 45) return 'D';
  if (s >= 40) return 'E';
  return 'F';
};

const cleanCourseCode = (code = '') =>
  code.replace(/^[A-Z]-/, '').replace(/\s/g, '');

const MetricLabel = ({ label, tooltip }) => (
  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
    <Typography component="span" fontWeight={600}>{label}</Typography>
    {tooltip && (
      <Tooltip title={tooltip} arrow>
        <InfoIcon sx={{ fontSize: 14, opacity: 0.7 }} />
      </Tooltip>
    )}
  </Stack>
);

const StatCard = ({ title, value, caption }) => (
  <Paper elevation={1} sx={{ p: 2, borderRadius: 2, minWidth: 180 }}>
    <Typography variant="overline" color="text.secondary">{title}</Typography>
    <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
    {caption && <Typography variant="caption" color="text.secondary">{caption}</Typography>}
  </Paper>
);

const TableSkeleton = ({ columns = 12, rows = 5 }) => (
  <Table size="small">
    <TableHead>
      <TableRow>
        {Array.from({ length: columns }).map((_, i) => (
          <TableCell key={i}><Skeleton variant="text" width={80} /></TableCell>
        ))}
      </TableRow>
    </TableHead>
    <TableBody>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: columns }).map((__, c) => (
            <TableCell key={c}><Skeleton variant="rectangular" height={20} /></TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const OFFICER_CONFIG = [
  { key: 'ceo', label: 'College Exam Officer', approvalField: 'ceoApproval' },
  { key: 'hod', label: 'Head of Department', approvalField: 'hodApproval' },
  { key: 'dean', label: 'Dean of College', approvalField: 'deanApproval' },
];

// Robust course result lookup (by id, then by normalized code)
const getCourseResult = (student, course) => {
  const results = student?.results || {};
  if (!course) return null;

  // direct by id
  const byId =
    results[course.id] ||
    results[String(course.id)];
  if (byId) return byId;

  // fallback by normalized code
  const targetNorm = normalizeCode(course.code);
  const vals = Object.values(results);
  const byCode =
    vals.find(v => normalizeCode(v?.courseCode) === targetNorm) ||
    vals.find(v => (v?.courseCodeNorm && v.courseCodeNorm === targetNorm));

  return byCode || null;
};

const normalizeOfficer = (approval = {}) => ({
  approved: Boolean(approval?.approved),
  flagged: Boolean(approval?.flagged),
  name: approval?.name || '',
  note: approval?.note || '',
  updatedAt: approval?.updatedAt || null,
});

// ————————————————————————————————————————————————————————————
export default function QuickCompute() {
  const theme = useTheme();
  const blinkKeyframes = useMemo(() => ({
    '0%': { opacity: 1 },
    '50%': { opacity: 0.2 },
    '100%': { opacity: 1 },
  }), []);
  const blinkCellSx = useMemo(
    () => ({
      color: theme.palette.error.main,
      fontWeight: 700,
      animation: 'flash 1.2s ease-in-out infinite',
      '@keyframes flash': blinkKeyframes,
    }),
    [theme.palette.error.main, blinkKeyframes],
  );
  const blinkCarryOverSx = useMemo(
    () => ({
      color: theme.palette.error.main,
      border: `1px solid ${alpha(theme.palette.error.main, 0.6)}`,
      backgroundColor: alpha(theme.palette.error.light, 0.12),
      fontWeight: 700,
      animation: 'flash 1.2s ease-in-out infinite',
      '@keyframes flash': blinkKeyframes,
    }),
    [theme.palette.error.main, theme.palette.error.light, blinkKeyframes],
  );

  const [formData, setFormData] = useState({ session: '', semester: '', level: '' });
  const [busy, setBusy] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [query, setQuery] = useState('');
  const errorRef = useRef(null);

  const { data: sessions = [] } = useGetSessionsQuery();
  const [fetchTermResults, { data: fetchedTermResults = [], isFetching: isFetchingResults }] = useLazyGetAllResultsQuery();

  const [searchMetrics, { data: metricsPayload, isFetching: isFetchingMetrics, isError, error }] =
    useLazySearchMetricsQuery();

  // approvals split like ResultComputation
  const { data: approvedCourses } = useGetApprovedCoursesByCriteriaQuery(
    { session: formData.session, semester: formData.semester, level: formData.level },
    { skip: !formData.session || !formData.semester || !formData.level }
  );

  // registrations for NR/00F logic
  const [fetchRegs] = useLazySearchCourseRegistrationsQuery();
  const [regSetsByCourseId, setRegSetsByCourseId] = useState({}); // { [courseId]: Set<REGNO> }

  const { generatePDF } = useResultPDFGenerator();
  const { generatePDF: generateGradeSummaryPDF } = useGradeSummaryPDFGenerator();
  const { generatePDF: generatePassFailPDF } = usePassFailPDFGenerator();
  const { generatePDF: generateGraduatingListPDF } = useGraduatingListPDF();
  const { generatePDF: generateGraduatingListPrintPDF } = useGraduatingListPrintPDF();
  const { generatePDF: generateMissingScoresPDF } = useMissingScoresPDFGenerator();

  // ---------- GET (no recomputation) ----------
  const handleGet = async (e) => {
    e?.preventDefault?.();
    if (!formData.session || !formData.semester || !formData.level) return;
    setPage(0);
    await Promise.all([
      searchMetrics({
        session: formData.session,
        semester: formData.semester,
        level: formData.level,
      }),
      fetchTermResults({
        session: formData.session,
        semester: formData.semester,
        level: formData.level,
        limit: 0,
      }).unwrap().catch(() => []),
    ]);
  };

  const handleReset = () => {
    setFormData({ session: '', semester: '', level: '' });
    setAnchorEl(null);
    setRegSetsByCourseId({});
    setPage(0);
  };

  // ---------- Build term results & courses list ----------
  const termResults = useMemo(() => {
    if (!formData.session || !formData.semester || !formData.level) return [];
    return Array.isArray(fetchedTermResults) ? fetchedTermResults : [];
  }, [fetchedTermResults, formData.session, formData.semester, formData.level]);

  const coursesForTerm = useMemo(() => {
    const map = new Map();
    termResults.forEach(r => {
      const cid = String(r.course._id);
      if (!map.has(cid)) {
        map.set(cid, {
          id: cid,
          code: r.course.code,
          unit: r.course.unit,
          title: r.course.title,
        });
      }
    });
    return [...map.values()].sort((a, b) => (a.unit - b.unit) || a.code.localeCompare(b.code));
  }, [termResults]);

  // results by student id
  const resultsByStudentId = useMemo(() => {
    const byStu = new Map();
    termResults.forEach(r => {
      const cid = String(r.course._id);
      const sid = String(r.student._id);
      if (!byStu.has(sid)) byStu.set(sid, new Map());
      byStu.get(sid).set(cid, {
        grandtotal: r.grandtotal,
        grade: r.grade,
        unit: r.course.unit,
        courseCode: r.course.code,
        courseCodeNorm: normalizeCode(r.course.code),
      });
    });
    return byStu;
  }, [termResults]);

  // students from metrics + attach results map
  const metricsStudents = useMemo(() => {
    const raw = Array.isArray(metricsPayload?.students) ? metricsPayload.students : [];
    return raw.map(m => {
      const sid = String(m.id);
      const resMap = resultsByStudentId.get(sid) || new Map();
      return {
        ...m,
        results: Object.fromEntries(resMap),
      };
    });
  }, [metricsPayload?.students, resultsByStudentId]);

  // approvals split
  const separateCourses = useMemo(() => {
    if (!coursesForTerm.length || !approvedCourses) {
      return { regularCourses: coursesForTerm, carryOverCourses: [] };
    }
    // dedupe by code
    const uniqueCourses = [];
    const seenCodes = new Set();
    for (const course of coursesForTerm) {
      if (course.code && !seenCodes.has(course.code)) {
        uniqueCourses.push(course);
        seenCodes.add(course.code);
      }
    }

    const approvedCourseCodes = approvedCourses.flatMap(doc => doc.courses.map(course => course.code));
    const regularCourses = []; const carryOverCourses = [];
    uniqueCourses.forEach(course =>
      (approvedCourseCodes.includes(course.code) ? regularCourses : carryOverCourses).push(course)
    );
    const sortByUnitThenCode = (a, b) => (a.unit - b.unit) || a.code.localeCompare(b.code);
    regularCourses.sort(sortByUnitThenCode);
    carryOverCourses.sort(sortByUnitThenCode);
    return { regularCourses, carryOverCourses };
  }, [coursesForTerm, approvedCourses]);

  // registrations (for all displayed courses)
  useEffect(() => {
    const canFetch =
      formData.session && formData.semester && formData.level &&
      (separateCourses.regularCourses.length + separateCourses.carryOverCourses.length > 0) &&
      metricsStudents.length > 0;

    if (!canFetch) {
      setRegSetsByCourseId({});
      return;
    }

    let cancelled = false;
    (async () => {
      const level = String(formData.level);
      const session = formData.session;
      const semester = formData.semester;

      try {
        const allCourses = [
          ...separateCourses.regularCourses,
          ...separateCourses.carryOverCourses,
        ];

        const tasks = allCourses.map(async (c) => {
          const data = await fetchRegs(
            { session, semester, level, course: c.id, page: 1, limit: 5000 }
          ).unwrap();
          const regNos = Array.isArray(data?.regNos) ? data.regNos : [];
          return [c.id, new Set(regNos.map(normalizeRegNo))];
        });

        const entries = await Promise.all(tasks);
        if (!cancelled) setRegSetsByCourseId(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setRegSetsByCourseId({});
      }
    })();

    return () => { cancelled = true; };
  }, [
    formData.session,
    formData.semester,
    formData.level,
    separateCourses.regularCourses,
    separateCourses.carryOverCourses,
    metricsStudents.length,
    fetchRegs
  ]);

  // --------- FILTER OUT students not in any displayed course (to match ResultComputation) ---------
  const filteredByRegistration = useMemo(() => {
    if (!metricsStudents.length) return [];

    const allCourses = [
      ...separateCourses.regularCourses,
      ...separateCourses.carryOverCourses
    ];

    const regMapsReady = Object.keys(regSetsByCourseId).length > 0;

    const isRegisteredSomewhere = (regUpper) => {
      if (!regMapsReady) return true; // don't drop until reg maps are ready
      for (const c of allCourses) {
        const set = regSetsByCourseId[c.id];
        if (set?.has(regUpper)) return true;
      }
      return false;
    };

    const kept = [];
    for (const stu of metricsStudents) {
      const regUpper = normalizeRegNo(stu.regNo);
      if (isRegisteredSomewhere(regUpper)) kept.push(stu);
    }
    return kept;
  }, [metricsStudents, separateCourses, regSetsByCourseId]);

  // remarks + sort (like ResultComputation)
  const generateRemarks = (student, regularCourses, carryOverCourses) => {
    const regUpper = normalizeRegNo(student.regNo);
    const allCourses = [...regularCourses, ...carryOverCourses];

    const failed = [];
    for (const course of allCourses) {
      const r = getCourseResult(student, course);
      if (r) {
        const g = r.grade ?? gradeFromScore(r.grandtotal);
        if (g === 'F') failed.push(`${course.unit}${cleanCourseCode(course.code)}`);
      } else {
        const set = regSetsByCourseId[course.id];
        if (set?.has(regUpper)) failed.push(`${course.unit}${cleanCourseCode(course.code)}`);
      }
    }
    return failed.length ? `Repeat ${failed.join(' ')}` : 'Pass';
  };

  const enhancedStudents = useMemo(() => {
    if (!filteredByRegistration.length) return [];
    const sorted = [...filteredByRegistration].sort((a, b) => {
      const numA = parseInt(String(a.regNo).split('/')[1]);
      const numB = parseInt(String(b.regNo).split('/')[1]);
      return (isNaN(numA) || isNaN(numB)) ? String(a.regNo).localeCompare(String(b.regNo)) : (numA - numB);
    });
    return sorted.map(stu => ({
      ...stu,
      remarks: generateRemarks(stu, separateCourses.regularCourses, separateCourses.carryOverCourses),
    }));
  }, [filteredByRegistration, separateCourses, regSetsByCourseId]);

  // grade summary (for export)
  const gradeSummary = useMemo(() => {
    if (!enhancedStudents.length) return [];

    const studentIndex = new Map(enhancedStudents.map(s => [normalizeRegNo(s.regNo), s]));
    const allLevelCourses = [
      ...(separateCourses.regularCourses || []),
      ...(separateCourses.carryOverCourses || []),
    ];
    if (!allLevelCourses.length) return [];

    return allLevelCourses
      .map(course => {
        const regSet = regSetsByCourseId?.[course.id] || new Set();
        const totalRegistered = regSet.size;
        if (totalRegistered === 0) return null;

        const dist = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
        regSet.forEach(regUpper => {
          const stu = studentIndex.get(regUpper);
          const r = stu ? getCourseResult(stu, course) : null;

          if (r && Number.isFinite(Number.parseFloat(r.grandtotal))) {
            const score = Number.parseFloat(r.grandtotal);
            const g = (r?.grade ?? gradeFromScore(score)) || 'F';
            if (dist[g] != null) dist[g] += 1;
            else dist.F += 1;
          } else {
            dist.F += 1; // registered but no score ⇒ 00F
          }
        });

        const passed = dist.A + dist.B + dist.C + dist.D + dist.E;
        const percentagePass = totalRegistered > 0 ? (passed / totalRegistered) * 100 : 0;

        return {
          code: course.code,
          title: course.title,
          unit: course.unit,
          totalRegistered,
          totalExamined: totalRegistered,
          gradeDistribution: dist,
          percentagePass,
        };
      })
      .filter(Boolean);
  }, [enhancedStudents, separateCourses, regSetsByCourseId]);

  // flags
  const hasResults = enhancedStudents.length > 0;
  const noResults = !isFetchingMetrics && !!formData.session && !!formData.semester && !!formData.level && !enhancedStudents.length;

  // in-table quick search
  const filteredStudents = useMemo(() => {
    if (!enhancedStudents.length) return [];
    const q = query.trim().toLowerCase();
    if (!q) return enhancedStudents;
    return enhancedStudents.filter(s =>
      String(s.regNo).toLowerCase().includes(q) || String(s.fullName).toLowerCase().includes(q)
    );
  }, [enhancedStudents, query]);

  // formatting helpers
  const formatScore = (score) => {
    const rounded = Math.round(score || 0);
    return String(rounded).padStart(2, '0');
  };
  const formatIntMetric = (value) => Math.round(value || 0);

  // ——— UI ———
  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', p: { xs: 1.5, md: 2 } }}>
      {/* Form Card */}
      <Card elevation={3} component="form" onSubmit={handleGet} sx={{ borderRadius: 2 }}>
        <CardHeader
          title="Computed Results (Quick View)"
          subheader="Select term and GET metrics without recomputing; per-course columns match the compute table."
          action={
            <Tooltip title="Reset form">
              <span>
                <IconButton onClick={handleReset} aria-label="reset filters">
                  <RestartAltIcon />
                </IconButton>
              </span>
            </Tooltip>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                select fullWidth label="Select Session"
                name="session" value={formData.session}
                onChange={(e) => setFormData(s => ({ ...s, session: e.target.value }))}
                required
              >
                <MenuItem disabled value=""><em>Select Session</em></MenuItem>
                {sessions.map(s => (
                  <MenuItem key={s._id} value={s.sessionTitle}>{s.sessionTitle}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select fullWidth label="Semester"
                name="semester" value={formData.semester}
                onChange={(e) => setFormData(s => ({ ...s, semester: e.target.value }))}
                required
              >
                <MenuItem disabled value=""><em>Select Semester</em></MenuItem>
                <MenuItem value={1}>First Semester</MenuItem>
                <MenuItem value={2}>Second Semester</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select fullWidth label="Level"
                name="level" value={formData.level}
                onChange={(e) => setFormData(s => ({ ...s, level: e.target.value }))}
                required
              >
                <MenuItem disabled value=""><em>Select Level</em></MenuItem>
                {[100, 200, 300, 400].map(l => <MenuItem key={l} value={l}>{l} Level</MenuItem>)}
              </TextField>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth placeholder="Quick filter by Reg. Number or Name"
                value={query} onChange={(e) => setQuery(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.6 }} /> }}
                disabled={!hasResults}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} justifyContent={{ xs: 'stretch', md: 'flex-end' }}>
                <LoadingButton type="submit" loading={isFetchingMetrics || isFetchingResults} variant="contained" color="primary" sx={{ minWidth: 180 }}>
                  Get Metrics
                </LoadingButton>
                <Tooltip title="Re-run GET with current filters">
                  <span>
                    <IconButton onClick={handleGet} disabled={isFetchingMetrics}>
                      <RefreshIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>

          {/* Chosen filters summary */}
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
            {formData.session && <Chip label={`Session: ${formData.session}`} />}
            {formData.semester && <Chip label={`Semester: ${formData.semester}`} />}
            {formData.level && <Chip label={`Level: ${formData.level}`} />}
          </Stack>
        </CardContent>
      </Card>

      {/* Loading / Error / Empty */}
      {isFetchingMetrics && (
        <Paper elevation={2} sx={{ mt: 3, p: 2 }} aria-busy>
          <TableSkeleton columns={15 + OFFICER_CONFIG.length} rows={6} />
        </Paper>
      )}

      {isError && (
        <Paper elevation={3} sx={{ mt: 3, p: 3 }} role="alert" tabIndex={-1} ref={errorRef}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Error Loading Metrics</Typography>
            <Typography>{error?.data?.error || 'Unknown error occurred'}</Typography>
          </Alert>
          <Button variant="outlined" onClick={handleGet} startIcon={<RefreshIcon />}>Retry</Button>
        </Paper>
      )}

      {noResults && (
        <Paper elevation={3} sx={{ mt: 3, p: 4, textAlign: 'center' }}>
          <InfoIcon color="info" sx={{ fontSize: 56, mb: 1 }} />
          <Typography variant="h6">No Results Found</Typography>
          <Typography color="text.secondary">
            Try a different combination or check approvals/availability for the selected criteria.
          </Typography>
        </Paper>
      )}

      {/* Results */}
      {hasResults && (
        <Paper elevation={3} sx={{ mt: 3, p: 2, overflow: 'hidden' }}>
          {/* Top toolbar */}
          <Toolbar
            sx={{
              px: 1,
              borderRadius: 1,
              background: alpha(theme.palette.primary.main, 0.05),
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Stack direction="row" spacing={2} alignItems="stretch" sx={{ flexWrap: 'wrap' }}>
              <StatCard title="Students" value={enhancedStudents.length} />
              <StatCard title="Regular Courses" value={separateCourses.regularCourses.length} />
              <StatCard title="Carry Overs" value={separateCourses.carryOverCourses.length} />
            </Stack>

            {/* Export menu — reuse same utilities as ResultComputation */}
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<TableViewIcon />} onClick={(e) => setAnchorEl(e.currentTarget)}>
                Export
              </Button>
              <Menu anchorEl={anchorEl} open={openMenu} onClose={() => setAnchorEl(null)}>
                <MenuEntry onClick={async () => {
                  setBusy(true); setAnchorEl(null);
                  const pdata = {
                    students: enhancedStudents,
                    courses: [...separateCourses.regularCourses, ...separateCourses.carryOverCourses],
                    department: metricsPayload?.department,
                    programme: metricsPayload?.programme,
                  };
                  await downloadExcel(pdata, formData, separateCourses);
                  setBusy(false);
                }}>
                  Download Full Results (Excel)
                </MenuEntry>

                <MenuEntry onClick={async () => {
                  setBusy(true); setAnchorEl(null);
                  const pdata = {
                    students: enhancedStudents,
                    courses: [...separateCourses.regularCourses, ...separateCourses.carryOverCourses],
                    department: metricsPayload?.department,
                    programme: metricsPayload?.programme,
                  };
                  await generatePassFailExcel(pdata, formData, separateCourses);
                  setBusy(false);
                }}>
                  Download Pass/Fail (Excel)
                </MenuEntry>

                <Divider />

                <MenuEntry onClick={async () => {
                  setBusy(true); setAnchorEl(null);
                  const pdata = {
                    students: enhancedStudents,
                    courses: [...separateCourses.regularCourses, ...separateCourses.carryOverCourses],
                    department: metricsPayload?.department,
                    programme: metricsPayload?.programme,
                  };
                  await generatePDF(pdata, formData, separateCourses, regSetsByCourseId);
                  setBusy(false);
                }}>
                  Main Result (PDF)
                </MenuEntry>

                <MenuEntry onClick={async () => {
                  setBusy(true); setAnchorEl(null);
                  const pdata = {
                    students: enhancedStudents,
                    courses: [...separateCourses.regularCourses, ...separateCourses.carryOverCourses],
                    department: metricsPayload?.department,
                    programme: metricsPayload?.programme,
                  };
                  await generatePassFailPDF(pdata, formData, separateCourses);
                  setBusy(false);
                }}>
                  Pass & Fail (PDF)
                </MenuEntry>

                <MenuEntry onClick={async () => {
                  setBusy(true); setAnchorEl(null);
                  await generateGradeSummaryPDF(
                    gradeSummary,
                    formData,
                    {
                      subject: 'College Not Provided',
                      department: metricsPayload?.department || 'Department Not Provided',
                      programme: metricsPayload?.programme || 'Programme Not Provided'
                    }
                  );
                  setBusy(false);
                }}>
                  Grade Summary (PDF)
                </MenuEntry>

                <MenuEntry onClick={async () => {
                  setBusy(true); setAnchorEl(null);
                  try {
                    const pdata = {
                      students: enhancedStudents,
                      courses: [...separateCourses.regularCourses, ...separateCourses.carryOverCourses],
                      department: metricsPayload?.department,
                      programme: metricsPayload?.programme,
                    };
                    await generateMissingScoresPDF(
                      pdata,
                      formData,
                      separateCourses,
                      { registrationSets: regSetsByCourseId }
                    );
                  } finally {
                    setBusy(false);
                  }
                }}>
                  Missing Scores (PDF)
                </MenuEntry>
              </Menu>

              <LoadingButton variant="contained" loading={busy} startIcon={<DownloadIcon />}>
                Quick Export
              </LoadingButton>
            </Stack>
          </Toolbar>

          {/* Legend */}
          <Stack direction="row" spacing={2} sx={{ mt: 1, px: 1 }}>
            <Typography variant="caption"><b>NR</b>: Not registered for this course (by current Session/Semester/Level)</Typography>
            <Typography variant="caption"><b>00F</b>: Registered but no score recorded (treated as F)</Typography>
          </Stack>

          {/* Data table */}
          <Box sx={{ mt: 2, borderRadius: 1, overflow: 'auto' }}>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader aria-label="results table">
                <TableHead>
                  {/* Group header */}
                  <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700 } }}>
                    <TableCell align="left" colSpan={2}>Profile</TableCell>
                    <TableCell align="center" colSpan={separateCourses.regularCourses.length}>Courses</TableCell>
                    <TableCell align="left">Carry Over / Others</TableCell>
                    <TableCell align="center" colSpan={4}>Current</TableCell>
                    <TableCell align="center" colSpan={4}>Previous</TableCell>
                    <TableCell align="center" colSpan={4}>Cumulative</TableCell>
                    <TableCell align="left">Remarks</TableCell>
                    <TableCell align="left" colSpan={OFFICER_CONFIG.length}>Officer Approvals</TableCell>
                  </TableRow>

                  {/* Column headers */}
                  <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.06), '& .MuiTableCell-root': { fontWeight: 600 } }}>
                    <TableCell sx={{ position: 'sticky', left: 0, background: theme.palette.background.paper, zIndex: 2 }}>S/No.</TableCell>
                    <TableCell sx={{ position: 'sticky', left: 80, background: theme.palette.background.paper, zIndex: 2 }}>Reg. Number / Name</TableCell>
                    {separateCourses.regularCourses.map(course => (
                      <TableCell key={course.id} align="center">
                        {course.code.replace(/^[A-Z]-/, '')} ({course.unit})
                      </TableCell>
                    ))}
                    <TableCell>Carry Over/Others</TableCell>
                    <TableCell align="center"><MetricLabel label="TCC" tooltip="Total Credit Carried" /></TableCell>
                    <TableCell align="center"><MetricLabel label="TCE" tooltip="Total Credit Earned" /></TableCell>
                    <TableCell align="center"><MetricLabel label="TPE" tooltip="Total Points Earned" /></TableCell>
                    <TableCell align="center"><MetricLabel label="GPA" tooltip="Current Grade Point Average" /></TableCell>
                    <TableCell align="center"><MetricLabel label="CCC" tooltip="Cumulative Credit Carried (prev)" /></TableCell>
                    <TableCell align="center"><MetricLabel label="CCE" tooltip="Cumulative Credit Earned (prev)" /></TableCell>
                    <TableCell align="center"><MetricLabel label="CPE" tooltip="Cumulative Points Earned (prev)" /></TableCell>
                    <TableCell align="center"><MetricLabel label="CGPA" tooltip="Previous Cumulative GPA" /></TableCell>
                    <TableCell align="center"><MetricLabel label="CCC" tooltip="Cumulative Credit Carried" /></TableCell>
                    <TableCell align="center"><MetricLabel label="CCE" tooltip="Cumulative Credit Earned" /></TableCell>
                    <TableCell align="center"><MetricLabel label="CPE" tooltip="Cumulative Points Earned" /></TableCell>
                    <TableCell align="center"><MetricLabel label="CGPA" tooltip="Cumulative GPA" /></TableCell>
                    <TableCell>Remark</TableCell>
                    {OFFICER_CONFIG.map((officer) => (
                      <TableCell key={`qc-officer-header-${officer.key}`}>{officer.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredStudents
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((student, index) => {
                      const prevMetrics = student.previousMetrics || {};
                      const currMetrics = student.currentMetrics || {};
                      const cumMetrics  = student.metrics || {};
                      const rowNumber = page * rowsPerPage + index + 1;
                      const studentRegUpper = normalizeRegNo(student.regNo);
                      const officerApprovals = {};
                      OFFICER_CONFIG.forEach(({ key, approvalField }) => {
                        officerApprovals[key] = normalizeOfficer(student?.[approvalField]);
                      });

                      return (
                        <TableRow key={`${student.id}-${index}`} hover>
                          <TableCell sx={{ position: 'sticky', left: 0, background: theme.palette.background.paper }}>
                            {rowNumber}
                          </TableCell>
                          <TableCell sx={{ position: 'sticky', left: 80, background: theme.palette.background.paper, minWidth: 200 }}>
                            <Box>
                              <Typography variant="body2" fontWeight={700}>{student.regNo}</Typography>
                              <Typography variant="body2" color="text.secondary">{student.fullName}</Typography>
                            </Box>
                          </TableCell>

                          {/* Regular courses */}
                          {separateCourses.regularCourses.map(course => {
                            const result = getCourseResult(student, course);
                            const regSet = regSetsByCourseId[course.id];
                            const isRegistered = regSet?.has(studentRegUpper);

                            const effectiveGrade =
                              result
                                ? (result.grade ?? gradeFromScore(result.grandtotal))
                                : (isRegistered ? 'F' : undefined);

                            const grandTotalValue = Number(result?.grandtotal ?? result?.grandTotal ?? 0);
                            const color = effectiveGrade === 'F'
                              ? theme.palette.error.main
                              : theme.palette.text.primary;

                            if (result) {
                              const score = String(Math.round(result.grandtotal || 0)).padStart(2, '0');
                              if (effectiveGrade === 'F' && grandTotalValue === 0) {
                                return (
                                  <TableCell key={`${student.id}-${course.id}`} align="center" sx={blinkCellSx}>
                                    {`${score}${effectiveGrade ?? ''}`}
                                  </TableCell>
                                );
                              }
                              return (
                                <TableCell key={`${student.id}-${course.id}`} align="center" sx={{ color }}>
                                  {`${score}${effectiveGrade ?? ''}`}
                                </TableCell>
                              );
                            }

                            if (isRegistered) {
                              return (
                                <TableCell key={`${student.id}-${course.id}`} align="center" sx={blinkCellSx}>
                                  {'00F'}
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell key={`${student.id}-${course.id}`} align="center">
                                {'NR'}
                              </TableCell>
                            );
                          })}

                          {/* Carry Over / Others — show 00F if registered but no score */}
                          <TableCell sx={{ backgroundColor: alpha(theme.palette.warning.light, 0.08), minWidth: 180 }}>
                            {separateCourses.carryOverCourses
                              .filter(c => {
                                const r = getCourseResult(student, c);
                                const regSet = regSetsByCourseId[c.id];
                                const isReg = regSet?.has(studentRegUpper);
                                return Boolean(r) || Boolean(isReg); // show if result OR registered
                              })
                              .map(course => {
                                const r = getCourseResult(student, course);
                                const display = r
                                  ? `${formatScore(r?.grandtotal)}${(r?.grade ?? gradeFromScore(r?.grandtotal))}`
                                  : '00F';
                                const isMissingCarry = display === '00F';

                                return (
                                  <Box
                                    key={`${student.id}-co-${course.id}`}
                                    sx={{
                                      display: 'inline-block',
                                      mr: 1,
                                      mb: 0.5,
                                      px: 1,
                                      py: 0.5,
                                      border: `1px dashed ${alpha(theme.palette.text.primary, 0.3)}`,
                                      borderRadius: 1,
                                      ...(isMissingCarry ? blinkCarryOverSx : {}),
                                    }}
                                  >
                                    {course.unit}{course.code.replace(/^[A-Z]-/, '').replace(/\s/g, '')} {display}
                                  </Box>
                                );
                              })}
                          </TableCell>

                          <TableCell align="center">{formatIntMetric(currMetrics.TCC)}</TableCell>
                          <TableCell align="center">{formatIntMetric(currMetrics.TCE)}</TableCell>
                          <TableCell align="center">{formatIntMetric(currMetrics.TPE)}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{(currMetrics.GPA || 0).toFixed(2)}</TableCell>

                          <TableCell align="center">{formatIntMetric(prevMetrics.CCC)}</TableCell>
                          <TableCell align="center">{formatIntMetric(prevMetrics.CCE)}</TableCell>
                          <TableCell align="center">{formatIntMetric(prevMetrics.CPE)}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{(prevMetrics.CGPA || 0).toFixed(2)}</TableCell>

                          <TableCell align="center">{formatIntMetric(cumMetrics.CCC)}</TableCell>
                          <TableCell align="center">{formatIntMetric(cumMetrics.CCE)}</TableCell>
                          <TableCell align="center">{formatIntMetric(cumMetrics.CPE)}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{(cumMetrics.CGPA || 0).toFixed(2)}</TableCell>

                          <TableCell sx={{ textAlign: 'left' }}>{student.remarks}</TableCell>
                          {OFFICER_CONFIG.map((officer) => {
                            const approval = officerApprovals[officer.key] || {};
                            const statusLabel = approval.approved ? 'Approved' : 'Pending';
                            const statusColor = approval.approved ? 'success' : 'default';
                            const updatedAtText = approval.updatedAt
                              ? new Date(approval.updatedAt).toLocaleString()
                              : null;
                            return (
                              <TableCell key={`${student.id}-${officer.key}`} sx={{ minWidth: 200 }}>
                                <Stack spacing={0.5} alignItems="flex-start">
                                  <Chip
                                    size="small"
                                    color={statusColor}
                                    label={statusLabel}
                                    sx={{ fontWeight: 600 }}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    Officer: {approval.name || '—'}
                                  </Typography>
                                  {approval.flagged && (
                                    <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
                                      Flagged for follow-up
                                    </Typography>
                                  )}
                                  {approval.note && (
                                    <Typography variant="caption" color="text.secondary">
                                      Note: {approval.note}
                                    </Typography>
                                  )}
                                  {updatedAtText && (
                                    <Typography variant="caption" color="text.secondary">
                                      Updated {updatedAtText}
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={filteredStudents.length || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </Box>
        </Paper>
      )}

      {/* Global backdrop for long exports */}
      <Backdrop open={busy} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress color="inherit" />
          <Typography>Preparing file…</Typography>
        </Stack>
      </Backdrop>
    </Box>
  );
}
