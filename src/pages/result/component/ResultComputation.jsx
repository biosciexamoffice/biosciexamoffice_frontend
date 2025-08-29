// ResultComputation.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, Alert, Chip, useTheme, Tooltip, TablePagination,
  Divider, IconButton, Toolbar, Backdrop, Skeleton, Stack, Menu, MenuItem as MenuEntry, alpha,
  Card, CardContent, CardHeader,
} from "@mui/material";
import { Info as InfoIcon } from "@mui/icons-material";
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  RestartAlt as RestartAltIcon,
  TableView as TableViewIcon
} from '@mui/icons-material';
import LoadingButton from '@mui/lab/LoadingButton';

import {
  useLazyGetComprehensiveResultsQuery,
  useGetSessionsQuery,
  useGetApprovedCoursesByCriteriaQuery,
  useGetGraduatingListQuery,
  useLazySearchCourseRegistrationsQuery,
} from '../../../store/index';

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

  // As last resort, scan values if entries carry explicit courseId/courseCode
  const vals = Object.values(results || {});
  const found = vals.find(v =>
    (v?.courseId && String(v.courseId) === String(course?.id || course?._id)) ||
    (v?.courseCode && String(v.courseCode).toUpperCase() === String(course?.code || '').toUpperCase())
  );
  return found || null;
};

// Fallback grade if backend didn't set it (ensures 0 => F)
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

// ————————————————————————————————————————————————————————————
function ResultComputation() {
  const theme = useTheme();
  const [trigger, { data: processedData, isLoading, isSuccess, isError, error }] =
    useLazyGetComprehensiveResultsQuery();
  const { data: sessions = [] } = useGetSessionsQuery();

  const [formData, setFormData] = useState({ session: '', semester: '', level: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const openMenu = Boolean(anchorEl);
  const errorRef = useRef(null);

  const { data: approvedCourses } = useGetApprovedCoursesByCriteriaQuery(
    { session: formData.session, semester: formData.semester, level: formData.level },
    { skip: !formData.session || !formData.semester || !formData.level }
  );

  const { generatePDF } = useResultPDFGenerator();
  const { generatePDF: generateGradeSummaryPDF } = useGradeSummaryPDFGenerator();
  const { generatePDF: generatePassFailPDF } = usePassFailPDFGenerator();
  const { generatePDF: generateGraduatingListPDF } = useGraduatingListPDF();
  const { generatePDF: generateGraduatingListPrintPDF } = useGraduatingListPrintPDF();
  const { generatePDF: generateMissingScoresPDF } = useMissingScoresPDFGenerator();

  // registrations loader
  const [fetchRegs] = useLazySearchCourseRegistrationsQuery();
  const [regSetsByCourseId, setRegSetsByCourseId] = useState({}); // { [courseId]: Set<REGNO> }

  // flags based on filtered+remarked data
  const [hasResults, setHasResults] = useState(false);
  const [noResults, setNoResults] = useState(false);

  // graduating list
  const is400 = String(formData.level) === '400';
  const { data: graduatingList, isFetching: isGradLoading } = useGetGraduatingListQuery(
    { session: formData.session, semester: formData.semester, level: 400 },
    { skip: !(formData.session && formData.semester && is400 && hasResults) }
  );

  // Remarks: includes 00F (registered but no score) as F
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
        // registered but no score => 00F (treat as F)
        const set = regSetsByCourseId[course.id];
        if (set?.has(regUpper)) failed.push(`${course.unit}${cleanCourseCode(course.code)}`);
      }
    }
    return failed.length ? `Repeat ${failed.join(' ')}` : 'Pass';
  };

  const separateCourses = useMemo(() => {
    if (!processedData?.courses || !approvedCourses) return { regularCourses: [], carryOverCourses: [] };

    // Deduplicate courses by course code. This prevents rendering the same course twice
    // if there are multiple course documents in the DB with the same code but different IDs.
    // This is a defensive measure against data integrity issues.
    const uniqueCourses = [];
    const seenCodes = new Set();
    for (const course of (processedData.courses || [])) {
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
  }, [processedData, approvedCourses]);

  // Load registrations for ALL courses (regular + carry-overs)
  useEffect(() => {
    const canFetch =
      isSuccess &&
      processedData?.courses?.length &&
      formData.session && formData.semester && formData.level &&
      (separateCourses.regularCourses.length + separateCourses.carryOverCourses.length > 0);

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
    isSuccess,
    processedData?.courses,
    formData.session,
    formData.semester,
    formData.level,
    separateCourses.regularCourses,
    separateCourses.carryOverCourses,
    fetchRegs
  ]);

  // Filter OUT students who are NOT registered in ANY course (regular OR carry-over)
  const enhancedProcessedData = useMemo(() => {
    if (!processedData?.students) return null;

    const allCourses = [
      ...separateCourses.regularCourses,
      ...separateCourses.carryOverCourses
    ];

    const regMapsReady = Object.keys(regSetsByCourseId).length > 0;

    const isRegisteredSomewhere = (regUpper) => {
      if (!regMapsReady) return true; // don't drop while sets are still loading
      for (const c of allCourses) {
        const set = regSetsByCourseId[c.id];
        if (set?.has(regUpper)) return true;
      }
      return false;
    };

    const kept = [];
    const dropped = [];

    for (const stu of processedData.students) {
      const regUpper = normalizeRegNo(stu.regNo);
      (isRegisteredSomewhere(regUpper) ? kept : dropped).push(stu);
    }

    // sort & attach remarks for kept
    const sortedStudents = [...kept].sort((a, b) => {
      const numA = parseInt(a.regNo.split('/')[1]);
      const numB = parseInt(b.regNo.split('/')[1]);
      return numA - numB;
    });

    const withRemarks = sortedStudents.map(student => ({
      ...student,
      remarks: generateRemarks(student, separateCourses.regularCourses, separateCourses.carryOverCourses)
    }));

    return {
      ...processedData,
      students: withRemarks,
      nonRegisteredStudents: dropped, // for Pass/Fail PDF "Non-Registration List"
    };
  }, [processedData, separateCourses, regSetsByCourseId]);

  // reflect filtered counts in flags
  useEffect(() => {
    if (!isSuccess || !enhancedProcessedData) {
      setHasResults(false);
      setNoResults(false);
      return;
    }
    const count = enhancedProcessedData.students?.length || 0;
    setHasResults(count > 0);
    setNoResults(count === 0);
  }, [isSuccess, enhancedProcessedData]);

  const studentIndex = useMemo(() => {
  const map = new Map();
  if (enhancedProcessedData?.students) {
    enhancedProcessedData.students.forEach(s => {
      map.set(normalizeRegNo(s.regNo), s);
    });
  }
  return map;
}, [enhancedProcessedData]);

  // Grade Summary: totals from registrations (regular + carry-over), 00F counted as F
const gradeSummary = useMemo(() => {
  if (!enhancedProcessedData?.students) return [];

  // index regNo → student
  const studentIndex = new Map(
    enhancedProcessedData.students.map(s => [normalizeRegNo(s.regNo), s])
  );

  // combine regular + carry-over courses (already filtered to this level)
  const allLevelCourses = [
    ...(separateCourses.regularCourses || []),
    ...(separateCourses.carryOverCourses || []),
  ];
  if (!allLevelCourses.length) return [];

  return allLevelCourses
    .map(course => {
      const regSet = regSetsByCourseId?.[course.id] || new Set();
      const totalRegistered = regSet.size;

      // remove courses with no registrations
      if (totalRegistered === 0) return null;

      const dist = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

      // count grades for everyone registered
      regSet.forEach(regUpper => {
        const stu = studentIndex.get(regUpper);
        const r = stu ? getCourseResult(stu, course) : null;

        if (r && Number.isFinite(Number.parseFloat(r.grandtotal))) {
          const score = Number.parseFloat(r.grandtotal);
          const g = (r?.grade ?? gradeFromScore(score)) || 'F';
          if (dist[g] != null) dist[g] += 1;
          else dist.F += 1; // safety
        } else {
          // registered but no score ⇒ 00F (counts as F)
          dist.F += 1;
        }
      });

      const passed = dist.A + dist.B + dist.C + dist.D + dist.E;
      const percentagePass = totalRegistered > 0 ? (passed / totalRegistered) * 100 : 0;

      return {
        code: course.code,
        title: course.title,
        unit: course.unit,
        totalRegistered,
        totalExamined: totalRegistered,   // includes 00F
        gradeDistribution: dist,          // 00F contributes to F
        percentagePass,
      };
    })
    .filter(Boolean);
}, [
  enhancedProcessedData?.students,
  separateCourses.regularCourses,
  separateCourses.carryOverCourses,
  regSetsByCourseId,
]);
  // UI handlers
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setPage(0);
    await trigger(formData);
  };
  const handleReset = () => {
    setFormData({ session: '', semester: '', level: '' });
    setPage(0);
    setRegSetsByCourseId({}); // clear registrations cache
  };
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter by search query (regNo or name)
  const filteredStudents = useMemo(() => {
    if (!enhancedProcessedData?.students) return [];
    const q = query.trim().toLowerCase();
    if (!q) return enhancedProcessedData.students;
    return enhancedProcessedData.students.filter(s =>
      s.regNo.toLowerCase().includes(q) || s.fullName.toLowerCase().includes(q)
    );
  }, [enhancedProcessedData, query]);

  // Formatting helpers
  const formatScore = (score) => {
    const rounded = Math.round(score || 0);
    return String(rounded).padStart(2, '0'); // ensures 0 => "00"
  };
  const formatIntMetric = (value) => Math.round(value || 0);

  useEffect(() => { if (isError && errorRef.current) errorRef.current.focus(); }, [isError]);

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', p: { xs: 1.5, md: 2 } }}>
      {/* Form Card */}
      <Card elevation={3} component="form" onSubmit={handleSubmit} sx={{ borderRadius: 2 }}>
        <CardHeader
          title="Result Computation"
          subheader="Choose session, semester, and level; compute, explore, then export."
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
                name="session" value={formData.session} onChange={handleChange} required
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
                name="semester" value={formData.semester} onChange={handleChange} required
              >
                <MenuItem disabled value=""><em>Select Semester</em></MenuItem>
                <MenuItem value={1}>First Semester</MenuItem>
                <MenuItem value={2}>Second Semester</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select fullWidth label="Level"
                name="level" value={formData.level} onChange={handleChange} required
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
                <LoadingButton type="submit" loading={isLoading} variant="contained" color="primary" sx={{ minWidth: 180 }}>
                  Compute Results
                </LoadingButton>
                <Tooltip title="Re-run with current filters">
                  <span>
                    <IconButton onClick={handleSubmit} disabled={isLoading}>
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

      {/* Error / Loading / Empty states */}
      {isLoading && (
        <Paper elevation={2} sx={{ mt: 3, p: 2 }} aria-busy>
          <TableSkeleton columns={16} rows={6} />
        </Paper>
      )}

      {isError && (
        <Paper elevation={3} sx={{ mt: 3, p: 3 }} role="alert" tabIndex={-1} ref={errorRef}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Error Loading Results</Typography>
            <Typography>{error?.data?.error || 'Unknown error occurred'}</Typography>
          </Alert>
          <Button variant="outlined" onClick={handleSubmit} startIcon={<RefreshIcon />}>Retry</Button>
        </Paper>
      )}

      {noResults && (
        <Paper elevation={3} sx={{ mt: 3, p: 4, textAlign: 'center' }}>
          <InfoIcon color="info" sx={{ fontSize: 56, mb: 1 }} />
          <Typography variant="h6">No Results Found</Typography>
          <Typography color="text.secondary">
            Try a different combination or check approvals for the selected criteria.
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
              <StatCard title="Students" value={enhancedProcessedData.students.length} />
              <StatCard title="Regular Courses" value={separateCourses.regularCourses.length} />
              <StatCard title="Carry Overs" value={separateCourses.carryOverCourses.length} />
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<TableViewIcon />} onClick={(e) => setAnchorEl(e.currentTarget)}>
                Export
              </Button>
              <Menu anchorEl={anchorEl} open={openMenu} onClose={() => setAnchorEl(null)}>
                <MenuEntry onClick={async () => {
                  setBusy(true); setAnchorEl(null);
                  await downloadExcel(enhancedProcessedData, formData, separateCourses);
                  setBusy(false);
                }}>
                  Download Full Results (Excel)
                </MenuEntry>

                <MenuEntry onClick={async () => {
                  setBusy(true); setAnchorEl(null);
                  await generatePassFailExcel(enhancedProcessedData, formData, separateCourses);
                  setBusy(false);
                }}>
                  Download Pass/Fail (Excel)
                </MenuEntry>

                <Divider />

                <MenuEntry onClick={async () => {
                  setBusy(true); setAnchorEl(null);
                  await generatePDF(enhancedProcessedData, formData, separateCourses, regSetsByCourseId);
                  setBusy(false);
                }}>
                  Main Result (PDF)
                </MenuEntry>

                <MenuEntry onClick={async () => {
                  setBusy(true); setAnchorEl(null);
                  await generatePassFailPDF(enhancedProcessedData, formData, separateCourses);
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
                      subject: 'Biological Sciences',
                      department: enhancedProcessedData?.department || 'Biochemistry',
                      programme: enhancedProcessedData?.programme || 'B. Sc. Biochemistry'
                    }
                  );
                  setBusy(false);
                }}>
                  Grade Summary (PDF)
                </MenuEntry>

                <MenuEntry onClick={async () => {
                  setBusy(true); setAnchorEl(null);
                  try {
                    await generateMissingScoresPDF(
                      enhancedProcessedData,
                      formData,
                      separateCourses,
                      { includeCarryOvers: false }
                    );
                  } finally {
                    setBusy(false);
                  }
                }}>
                  Missing Scores (PDF)
                </MenuEntry>

                <MenuEntry
                  disabled={!(formData.session && formData.semester && is400 && hasResults) || isGradLoading || !graduatingList?.students?.length}
                  onClick={async () => {
                    setBusy(true); setAnchorEl(null);
                    try {
                      await generateGraduatingListPDF(graduatingList, formData);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Graduating List (PDF)
                </MenuEntry>
                <MenuEntry
                  disabled={!(formData.session && formData.semester && is400 && hasResults) || isGradLoading || !graduatingList?.students?.length}
                  onClick={async () => {
                    setBusy(true); setAnchorEl(null);
                    try {
                      await generateGraduatingListPrintPDF(graduatingList, formData);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Graduating List PRINT Version (PDF)
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

                      return (
                        <TableRow key={student.id} hover>
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

                            const color = effectiveGrade === 'F'
                              ? theme.palette.error.main
                              : theme.palette.text.primary;

                            if (result) {
                              const score = String(Math.round(result.grandtotal || 0)).padStart(2, '0');
                              return (
                                <TableCell key={`${student.id}-${course.id}`} align="center" sx={{ color }}>
                                  {`${score}${effectiveGrade ?? ''}`}
                                </TableCell>
                              );
                            }

                            if (isRegistered) {
                              return (
                                <TableCell key={`${student.id}-${course.id}`} align="center" sx={{ color }}>
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

                                return (
                                  <Box
                                    key={`${student.id}-co-${course.id}`}
                                    sx={{
                                      display: 'inline-block',
                                      mr: 1, mb: 0.5, px: 1, py: 0.5,
                                      border: `1px dashed ${alpha(theme.palette.text.primary, 0.3)}`,
                                      borderRadius: 1
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
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
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

export default ResultComputation;
