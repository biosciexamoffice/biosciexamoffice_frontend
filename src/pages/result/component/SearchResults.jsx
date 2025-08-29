import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Skeleton,
  TablePagination,
  InputAdornment,
  Switch,
  FormControlLabel,
  MenuItem,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Stack,
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';

import useStatementPDFGenerator from '../../../utills/useStatementPDFGenerator.js';

// Metrics/comprehensive hooks
import {
  useLazySearchMetricsQuery,
  useLazyGetComprehensiveResultsQuery,
  useGetSessionsQuery,
  useUpdateMetricsMutation,
} from '../../../store';

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const HEAD_CELLS = [
  { id: 'student', label: 'Student', sortable: true },
  { id: 'regNo', label: 'Reg. No.', sortable: true },
  { id: 'level', label: 'Level', sortable: true, numeric: true },
  { id: 'semester', label: 'Semester', sortable: true, numeric: true },
  { id: 'session', label: 'Session', sortable: true },
  // Current
  { id: 'TCC', label: 'TCC', sortable: true, numeric: true, group: 'Current' },
  { id: 'TCE', label: 'TCE', sortable: true, numeric: true, group: 'Current' },
  { id: 'TPE', label: 'TPE', sortable: true, numeric: true, group: 'Current' },
  { id: 'GPA', label: 'GPA', sortable: true, numeric: true, group: 'Current' },
  // Cumulative
  { id: 'CCC', label: 'CCC', sortable: true, numeric: true, group: 'Cumulative' },
  { id: 'CCE', label: 'CCE', sortable: true, numeric: true, group: 'Cumulative' },
  { id: 'CPE', label: 'CPE', sortable: true, numeric: true, group: 'Cumulative' },
  { id: 'CGPA', label: 'CGPA', sortable: true, numeric: true, group: 'Cumulative' },
  { id: 'actions', label: 'Actions', sortable: false, align: 'center' },
];

function sortComparator(a, b, orderBy, order) {
  const getVal = (r, key) => {
    switch (key) {
      case 'student': return r.fullName || '';
      case 'regNo': return r.regNo || '';
      case 'level': return Number(r.level ?? 0);
      case 'semester': return Number(r.semester ?? 0);
      case 'session': return r.session || '';
      case 'TCC': return Number(r.currentMetrics?.TCC ?? 0);
      case 'TCE': return Number(r.currentMetrics?.TCE ?? 0);
      case 'TPE': return Number(r.currentMetrics?.TPE ?? 0);
      case 'GPA': return Number(r.currentMetrics?.GPA ?? 0);
      case 'CCC': return Number(r.metrics?.CCC ?? 0);
      case 'CCE': return Number(r.metrics?.CCE ?? 0);
      case 'CPE': return Number(r.metrics?.CPE ?? 0);
      case 'CGPA': return Number(r.metrics?.CGPA ?? 0);
      default: return '';
    }
  };
  const va = getVal(a, orderBy);
  const vb = getVal(b, orderBy);
  if (va < vb) return order === 'asc' ? -1 : 1;
  if (va > vb) return order === 'asc' ? 1 : -1;
  return 0;
}

// Format helpers for dialog
const padScore = (score) => {
  const n = Math.round(Number(score || 0));
  return Number.isFinite(n) ? (n < 10 ? `0${n}` : `${n}`) : '';
};
const gradeToPoint = (g) => {
  const x = String(g || '').toUpperCase();
  return x === 'A' ? 5 : x === 'B' ? 4 : x === 'C' ? 3 : x === 'D' ? 2 : x === 'E' ? 1 : x === 'F' ? 0 : null;
};

const SearchResults = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [filters, setFilters] = useState({
    q: '',
    regNo: '',
    name: '',
    level: '',
    semester: '',
    session: '',
  });

  const [searched, setSearched] = useState(false);
  const [dense, setDense] = useState(false);
  const [orderBy, setOrderBy] = useState('regNo');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const debouncedQ = useDebouncedValue(filters.q, 400);

  // Data hooks
  const [searchMetrics, { data: metricsData, isLoading, isFetching, isError, error }] =
    useLazySearchMetricsQuery();

  const [getComprehensive, { data: compData, isFetching: isCompFetching }] =
    useLazyGetComprehensiveResultsQuery();

  const [updateMetrics, { isLoading: isUpdatingMetrics }] = useUpdateMetricsMutation();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rowToEdit, setRowToEdit] = useState(null);
  const [editedMetrics, setEditedMetrics] = useState(null);

  const { data: sessions = [] } = useGetSessionsQuery();

  const { generateStatementPDF } = useStatementPDFGenerator();

  const rows = metricsData?.students || [];

  const hasActiveFilter = useMemo(
    () => Boolean(filters.q || filters.name || filters.regNo || filters.level || filters.semester || filters.session),
    [filters]
  );

  const runSearch = useCallback((payload) => {
    setSearched(true);
    setPage(0);
    searchMetrics({
      session: payload.session || undefined,
      semester: payload.semester || undefined,
      level: payload.level || undefined,
      regNo: payload.regNo || undefined,
    });
  }, [searchMetrics]);

  // If q looks like a regNo, map it to regNo for backend
  const normalizedFilters = useMemo(() => {
    const f = { ...filters };
    if (!f.regNo && f.q && /^\d{2}\/\d{3,}\/[A-Z]{2}$/i.test(f.q.trim())) {
      f.regNo = f.q.trim();
    }
    return f;
  }, [filters]);

  useEffect(() => {
    if (!searched) return;
    const nf = normalizedFilters;
    if (nf.regNo || nf.session || nf.semester || nf.level) {
      runSearch(nf);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((s) => ({ ...s, [name]: value }));
  };

  const handleSearch = (e) => {
    e?.preventDefault?.();
    if (!hasActiveFilter) return;
    runSearch(normalizedFilters);
  };

  const handleReset = () => {
    setFilters({ q: '', name: '', regNo: '', level: '', semester: '', session: '' });
    setSearched(false);
    setPage(0);
  };

  const handleRequestSort = (property) => {
    if (!HEAD_CELLS.find((c) => c.id === property)?.sortable) return;
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleEditClick = (row) => {
    setRowToEdit(row);
    // Deep copy to avoid mutating the original row data in state
    setEditedMetrics({
      previousMetrics: { ...(row.previousMetrics || {}) },
      currentMetrics: { ...(row.currentMetrics || {}) },
      metrics: { ...(row.metrics || {}) },
    });
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setRowToEdit(null);
    setEditedMetrics(null);
  };

  const handleMetricChange = (group, field, value) => {
    // Ensure value is a number or empty string
    const numericValue = value === '' ? '' : Number(value);
    if (isNaN(numericValue)) return;

    setEditedMetrics(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: numericValue,
      }
    }));
  };

  const handleSaveMetrics = async () => {
    if (!rowToEdit || !editedMetrics) return;
    try {
      // From academicMetricsApi.js, the mutation needs a 'metricsId' for the URL.
      // From academicMetricsController.js, the backend updates the document found by that ID
      // with the data provided in the request body.
      const metricsId = rowToEdit.metrics?._id;
      if (!metricsId) {
        console.error("Could not find the AcademicMetrics document ID to update.");
        return;
      }

      // The 'editedMetrics' state is nested for UI convenience. We must flatten it
      // to match the backend's AcademicMetrics model schema before sending.
      const { _id, ...cumulativeMetrics } = editedMetrics.metrics; // Exclude _id from cumulative
      const updateData = {
        previousMetrics: editedMetrics.previousMetrics, // This is an object on the model
        ...editedMetrics.currentMetrics, // Spread TCC, TCE, TPE, GPA as top-level fields
        ...cumulativeMetrics, // Spread CCC, CCE, CPE, CGPA as top-level fields
      };

      // The RTK query hook separates 'metricsId' for the URL param
      // and the rest of the properties become the body.
      const payload = {
        metricsId,
        ...updateData,
      };

      console.log('Attempting to update metrics with payload:', payload);
      await updateMetrics(payload).unwrap();
      handleEditDialogClose();
      runSearch(normalizedFilters); // Refresh data
    } catch (err) {
      console.error("Failed to update metrics:", err?.data || err);
    }
  };

  const sortedRows = useMemo(() => {
    const r = [...rows];
    if (HEAD_CELLS.find((c) => c.id === orderBy)?.sortable) {
      r.sort((a, b) => sortComparator(a, b, orderBy, order));
    }
    return r;
  }, [rows, order, orderBy]);

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, page, rowsPerPage]);

  const loading = isLoading || isFetching;

  // ---------------- Dialog State & Builders ----------------
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogRow, setDialogRow] = useState(null);
  const [dialogCourses, setDialogCourses] = useState([]);

  const buildHeaderFromRow = (row) => ({
    university: 'JOSEPH SARWUAN TARKA UNIVERSITY',
    address: 'P.M.B 2373, MAKURDI',
    college: 'COLLEGE OF BIOLOGICAL SCIENCES',
    department: 'DEPARTMENT OF BIOCHEMISTRY',
    programme: 'B. SC. BIOCHEMISTRY',
    session: row.session,
    semester: row.semester,
    level: row.level,
    logoUrl: '/uam.jpeg',
  });

  const openStudentDialog = async (row) => {
    setDialogRow(row);
    setOpenDialog(true);

    // Fetch comprehensive data for the row's context
    const { data: comp } = await getComprehensive({
      session: row.session,
      semester: row.semester,
      level: row.level,
    });

    // Build the student's courses list for the dialog
    if (comp?.students?.length && comp?.courses?.length) {
      const match = comp.students.find((s) => s.regNo === row.regNo);
      if (match) {
        const courses = comp.courses
          .map((c) => {
            const r = match.results?.[c.id];
            if (!r) return null;
            return {
              code: c.code || '',
              title: c.title || '',
              unit: c.unit ?? '',
              score: `${padScore(r.grandtotal)}${String(r.grade || '').toUpperCase()}`,
              point: gradeToPoint(r.grade) != null ? gradeToPoint(r.grade).toFixed(2) : '',
              remark: String(r.grade || '').toUpperCase() === 'F' ? 'Fail' : 'Pass',
            };
          })
          .filter(Boolean);
        setDialogCourses(courses);
      } else {
        setDialogCourses([]);
      }
    } else {
      setDialogCourses([]);
    }
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setDialogRow(null);
    setDialogCourses([]);
  };

  const onExportPDF = async () => {
    if (!dialogRow) return;

    // Reuse header + record and call your existing hook
    const header = buildHeaderFromRow(dialogRow);
    const record = {
      regNo: dialogRow.regNo,
      fullName: dialogRow.fullName?.toUpperCase(),
      courses: dialogCourses,
      performance: {
        TCC: dialogRow.currentMetrics?.TCC ?? 0,
        TCE: dialogRow.currentMetrics?.TCE ?? 0,
        TPE: dialogRow.currentMetrics?.TPE ?? 0,
        GPA: dialogRow.currentMetrics?.GPA ?? 0,
        prevTCC: dialogRow.previousMetrics?.CCC ?? 0,
        prevTCE: dialogRow.previousMetrics?.CCE ?? 0,
        prevTPE: dialogRow.previousMetrics?.CPE ?? 0,
        prevCGPA: dialogRow.previousMetrics?.CGPA ?? 0,
        CCC: dialogRow.metrics?.CCC ?? 0,
        CCE: dialogRow.metrics?.CCE ?? 0,
        CPE: dialogRow.metrics?.CPE ?? 0,
        CGPA: dialogRow.metrics?.CGPA ?? 0,
      },
    };
    await generateStatementPDF(header, record, {
      filename: `Statement_${dialogRow.regNo}_${dialogRow.session}_Sem${dialogRow.semester}.pdf`,
    });
  };

  // Wider table widths for dialog
  const columnWidths = {
    code: '12%',
    title: '48%',
    unit: '8%',
    score: '12%',
    point: '10%',
    remark: '10%',
  };

  return (
    <Box>
      <Card elevation={2}>
        <CardHeader
          title="Search Student Metrics"
          subheader="Click a row to view the student's detailed statement."
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh last search">
                <span>
                  <IconButton
                    onClick={() => searched && runSearch(normalizedFilters)}
                    disabled={!searched || loading}
                    size="small"
                  >
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Reset filters">
                <IconButton onClick={handleReset} size="small">
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />
        <Divider />

        <CardContent>
          {/* Filters */}
          <Box component="form" onSubmit={handleSearch} sx={{ mb: 2 }}>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  name="q"
                  value={filters.q}
                  onChange={handleFilterChange}
                  placeholder="Type a Reg No (e.g. 22/59530/UE)…"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FilterAltIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4} md={2.5}>
                <TextField
                  select
                  fullWidth
                  label="Level"
                  name="level"
                  value={filters.level}
                  onChange={handleFilterChange}
                >
                  <MenuItem value=""><em>Any</em></MenuItem>
                  <MenuItem value="100">100</MenuItem>
                  <MenuItem value="200">200</MenuItem>
                  <MenuItem value="300">300</MenuItem>
                  <MenuItem value="400">400</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4} md={2.5}>
                <TextField
                  select
                  fullWidth
                  label="Semester"
                  name="semester"
                  value={filters.semester}
                  onChange={handleFilterChange}
                >
                  <MenuItem value=""><em>Any</em></MenuItem>
                  <MenuItem value="1">FIRST</MenuItem>
                  <MenuItem value="2">SECOND</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Session"
                  name="session"
                  value={filters.session}
                  onChange={handleFilterChange}
                >
                  <MenuItem value=""><em>Any</em></MenuItem>
                  <MenuItem value="2024/2025">2024/2025</MenuItem>
                  <MenuItem value="2023/2024">2023/2024</MenuItem>
                  <MenuItem value="2022/2023">2022/2023</MenuItem>
                  <MenuItem value="2021/2022">2021/2022</MenuItem>
                  <MenuItem value="2020/2021">2020/2021</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md="auto">
                <Tooltip title={hasActiveFilter ? 'Search' : 'Add a filter first'}>
                  <span>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SearchIcon />}
                      disabled={!hasActiveFilter || loading}
                    >
                      Search
                    </Button>
                  </span>
                </Tooltip>
              </Grid>

              <Grid item xs={12} md="auto">
                <FormControlLabel
                  control={<Switch checked={dense} onChange={(e) => setDense(e.target.checked)} />}
                  label="Dense"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Error */}
          {isError && (
            <Alert
              severity="error"
              sx={{ my: 2 }}
              action={<Button color="inherit" size="small" onClick={() => runSearch(normalizedFilters)}>Retry</Button>}
            >
              Error fetching metrics: {error?.data?.message || 'An unexpected error occurred.'}
            </Alert>
          )}

          {/* Table */}
          <TableContainer component={Paper} sx={{ maxHeight: 540 }}>
            <Table size={dense ? 'small' : 'medium'} stickyHeader>
              <TableHead>
                <TableRow>
                  {HEAD_CELLS.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align || (col.numeric ? 'right' : 'left')}
                      sortDirection={orderBy === col.id ? order : false}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {col.sortable ? (
                        <TableSortLabel
                          active={orderBy === col.id}
                          direction={orderBy === col.id ? order : 'asc'}
                          onClick={() => handleRequestSort(col.id)}
                        >
                          {col.label}
                        </TableSortLabel>
                      ) : (
                        col.label
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {/* Loading skeleton */}
                {loading && Array.from({ length: dense ? 6 : 8 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {HEAD_CELLS.map((c, j) => (
                      <TableCell key={`${i}-${j}`}>
                        <Skeleton variant="text" width={c.numeric ? 40 : 120} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {/* Empty/search hints */}
                {!loading && (!searched || rows.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={HEAD_CELLS.length} align="center">
                      {!searched ? (
                        <Box sx={{ py: 4 }}>
                          <Typography variant="h6" gutterBottom>Start a search</Typography>
                          <Typography color="text.secondary">
                            Enter a Reg No and/or add session/semester/level, then click <b>Search</b>.
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ py: 4 }}>
                          <Typography variant="h6" gutterBottom>No results</Typography>
                          <Typography color="text.secondary">
                            Try widening your filters or a different Reg No.
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                )}

                {/* Data rows */}
                {!loading && rows.length > 0 && paginatedRows.map((r) => (
                  <TableRow
                    key={`${r.regNo}-${r.session}-${r.semester}-${r.level}`}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => openStudentDialog(r)}
                  >
                    <TableCell>{r.fullName}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.regNo}</TableCell>
                    <TableCell>{r.level}</TableCell>
                    <TableCell>{r.semester}</TableCell>
                    <TableCell>{r.session}</TableCell>

                    <TableCell align="right">{r.currentMetrics?.TCC ?? 0}</TableCell>
                    <TableCell align="right">{r.currentMetrics?.TCE ?? 0}</TableCell>
                    <TableCell align="right">{r.currentMetrics?.TPE ?? 0}</TableCell>
                    <TableCell align="right">{(r.currentMetrics?.GPA ?? 0).toFixed(2)}</TableCell>

                    <TableCell align="right">{r.metrics?.CCC ?? 0}</TableCell>
                    <TableCell align="right">{r.metrics?.CCE ?? 0}</TableCell>
                    <TableCell align="right">{r.metrics?.CPE ?? 0}</TableCell>
                    <TableCell align="right">{(r.metrics?.CGPA ?? 0).toFixed(2)}</TableCell>

                    <TableCell
                      align="center"
                      onClick={(e) => e.stopPropagation()} // don't open dialog when clicking action
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      <Tooltip title="Edit Metrics">
                        <span>
                          <IconButton onClick={() => handleEditClick(r)} size="small">
                            <EditIcon />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title={isCompFetching ? 'Preparing PDF…' : 'Export Statement PDF'}>
                        <span>
                          <IconButton onClick={() => openStudentDialog(r)} size="small" disabled={isCompFetching}>
                            {isCompFetching ? <CircularProgress size={18} /> : <PictureAsPdfIcon />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Footer: pagination & meta */}
            {!loading && rows.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {rows.length} record{rows.length === 1 ? '' : 's'}
                </Typography>
                <TablePagination
                  component="div"
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  count={rows.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
              </Box>
            )}
          </TableContainer>

          {(loading) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ---------- Wide Dialog: Student Statement ---------- */}
      <Dialog
        open={openDialog}
        onClose={closeDialog}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle sx={{ pr: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                {dialogRow?.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dialogRow?.regNo} • Session {dialogRow?.session} • Sem {dialogRow?.semester} • Level {dialogRow?.level}
              </Typography>
            </Box>
            <Box>
              <Tooltip title="Export Statement PDF">
                <span>
                  <IconButton color="primary" onClick={onExportPDF} disabled={!dialogRow || isCompFetching}>
                    {isCompFetching ? <CircularProgress size={20} /> : <PictureAsPdfIcon />}
                  </IconButton>
                </span>
              </Tooltip>
              <IconButton onClick={closeDialog}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2 }}>
          {/* Header text row (optional) */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2">
              JOSEPH SARWUAN TARKA UNIVERSITY, P.M.B. 2373, MAKURDI
            </Typography>
            <Typography variant="body2" color="text.secondary">
              College of Biological Sciences • Department of Biochemistry • Programme: B. Sc. Biochemistry
            </Typography>
          </Box>

          {/* COURSES TABLE (wide) */}
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 1 }}>
            <Box sx={{ px: 2, pt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Courses</Typography>
            </Box>

            <Box
              sx={{
                height: '70vh', // Ensures everything is visible without clipping
                overflow: 'auto',
                p: 2,
                pt: 1
              }}
            >
              {(!dialogRow || isCompFetching) ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: columnWidths.code, fontWeight: 600 }}>Code</TableCell>
                      <TableCell sx={{ width: columnWidths.title, fontWeight: 600 }}>Title</TableCell>
                      <TableCell align="center" sx={{ width: columnWidths.unit, fontWeight: 600 }}>Unit</TableCell>
                      <TableCell align="center" sx={{ width: columnWidths.score, fontWeight: 600 }}>Score</TableCell>
                      <TableCell align="center" sx={{ width: columnWidths.point, fontWeight: 600 }}>Point</TableCell>
                      <TableCell sx={{ width: columnWidths.remark, fontWeight: 600 }}>Remark</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dialogCourses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography>No course records found for this context.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : dialogCourses.map((c, idx) => (
                      <TableRow key={`${c.code}-${idx}`} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{c.code}</TableCell>
                        <TableCell>{c.title}</TableCell>
                        <TableCell align="center">{c.unit}</TableCell>
                        <TableCell align="center">{c.score}</TableCell>
                        <TableCell align="center">{c.point}</TableCell>
                        <TableCell>{c.remark}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Paper>

          {/* PERFORMANCE TABLE */}
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 1 }}>
            <Box sx={{ px: 2, pt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Performance</Typography>
            </Box>
            <Box sx={{ p: 2, pt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Current</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Previous</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Cumulative</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>TCC</TableCell>
                    <TableCell align="center">{dialogRow?.currentMetrics?.TCC ?? 0}</TableCell>
                    <TableCell align="center">{dialogRow?.previousMetrics?.CCC ?? 0}</TableCell>
                    <TableCell align="center">{dialogRow?.metrics?.CCC ?? 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>TCE</TableCell>
                    <TableCell align="center">{dialogRow?.currentMetrics?.TCE ?? 0}</TableCell>
                    <TableCell align="center">{dialogRow?.previousMetrics?.CCE ?? 0}</TableCell>
                    <TableCell align="center">{dialogRow?.metrics?.CCE ?? 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>TPE</TableCell>
                    <TableCell align="center">{dialogRow?.currentMetrics?.TPE ?? 0}</TableCell>
                    <TableCell align="center">{dialogRow?.previousMetrics?.CPE ?? 0}</TableCell>
                    <TableCell align="center">{dialogRow?.metrics?.CPE ?? 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>GPA / CGPA</TableCell>
                    <TableCell align="center">{(dialogRow?.currentMetrics?.GPA ?? 0).toFixed(2)}</TableCell>
                    <TableCell align="center">{(dialogRow?.previousMetrics?.CGPA ?? 0).toFixed(2)}</TableCell>
                    <TableCell align="center">{(dialogRow?.metrics?.CGPA ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Paper>

          {/* KEY TABLE */}
          <Paper variant="outlined" sx={{ borderRadius: 1 }}>
            <Box sx={{ px: 2, pt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Key</Typography>
            </Box>
            <Box sx={{ p: 2, pt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Abbreviation</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Meaning</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ['TCC', 'Total Credit Carried'],
                    ['TCE', 'Total Credit Earned'],
                    ['TPE', 'Total Points Earned'],
                    ['GPA', 'Grade Point Average'],
                    ['CCC', 'Cumulative Credit Carried'],
                    ['CCE', 'Cumulative Credit Earned'],
                    ['CPE', 'Cumulative Points Earned'],
                    ['CGPA', 'Cumulative GPA'],
                  ].map(([abbr, meaning]) => (
                    <TableRow key={abbr}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{abbr}</TableCell>
                      <TableCell>{meaning}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={closeDialog} startIcon={<CloseIcon />}>Close</Button>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            onClick={onExportPDF}
            disabled={!dialogRow || isCompFetching}
          >
            Export PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------- Edit Metrics Dialog ---------- */}
      <Dialog open={editDialogOpen} onClose={handleEditDialogClose} fullWidth maxWidth="md">
        <DialogTitle>Edit Metrics for {rowToEdit?.regNo}</DialogTitle>
        <DialogContent>
          {rowToEdit && editedMetrics && (
            <Grid container spacing={3} sx={{ pt: 1 }}>
              {/* Current Metrics */}
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>Current</Typography>
                <Stack spacing={2}>
                  <TextField label="TCC" type="number" value={editedMetrics.currentMetrics.TCC ?? ''} onChange={(e) => handleMetricChange('currentMetrics', 'TCC', e.target.value)} />
                  <TextField label="TCE" type="number" value={editedMetrics.currentMetrics.TCE ?? ''} onChange={(e) => handleMetricChange('currentMetrics', 'TCE', e.target.value)} />
                  <TextField label="TPE" type="number" value={editedMetrics.currentMetrics.TPE ?? ''} onChange={(e) => handleMetricChange('currentMetrics', 'TPE', e.target.value)} />
                  <TextField label="GPA" type="number" value={editedMetrics.currentMetrics.GPA ?? ''} onChange={(e) => handleMetricChange('currentMetrics', 'GPA', e.target.value)} inputProps={{ step: "0.01" }} />
                </Stack>
              </Grid>

              {/* Previous Metrics */}
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>Previous</Typography>
                <Stack spacing={2}>
                  <TextField label="CCC" type="number" value={editedMetrics.previousMetrics.CCC ?? ''} onChange={(e) => handleMetricChange('previousMetrics', 'CCC', e.target.value)} />
                  <TextField label="CCE" type="number" value={editedMetrics.previousMetrics.CCE ?? ''} onChange={(e) => handleMetricChange('previousMetrics', 'CCE', e.target.value)} />
                  <TextField label="CPE" type="number" value={editedMetrics.previousMetrics.CPE ?? ''} onChange={(e) => handleMetricChange('previousMetrics', 'CPE', e.target.value)} />
                  <TextField label="CGPA" type="number" value={editedMetrics.previousMetrics.CGPA ?? ''} onChange={(e) => handleMetricChange('previousMetrics', 'CGPA', e.target.value)} inputProps={{ step: "0.01" }} />
                </Stack>
              </Grid>

              {/* Cumulative Metrics */}
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>Cumulative</Typography>
                <Stack spacing={2}>
                  <TextField label="CCC" type="number" value={editedMetrics.metrics.CCC ?? ''} onChange={(e) => handleMetricChange('metrics', 'CCC', e.target.value)} />
                  <TextField label="CCE" type="number" value={editedMetrics.metrics.CCE ?? ''} onChange={(e) => handleMetricChange('metrics', 'CCE', e.target.value)} />
                  <TextField label="CPE" type="number" value={editedMetrics.metrics.CPE ?? ''} onChange={(e) => handleMetricChange('metrics', 'CPE', e.target.value)} />
                  <TextField label="CGPA" type="number" value={editedMetrics.metrics.CGPA ?? ''} onChange={(e) => handleMetricChange('metrics', 'CGPA', e.target.value)} inputProps={{ step: "0.01" }} />
                </Stack>
              </Grid>
            </Grid>
          )}
          {isUpdatingMetrics && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Saving...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose} disabled={isUpdatingMetrics}>Cancel</Button>
          <Button
            onClick={handleSaveMetrics}
            variant="contained"
            disabled={isUpdatingMetrics}
          >
            {isUpdatingMetrics ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SearchResults;
