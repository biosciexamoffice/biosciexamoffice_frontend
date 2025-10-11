import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  Alert,
  Divider,
  Typography,
  IconButton,
  Tooltip,
  LinearProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Stack,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import SearchIcon from '@mui/icons-material/Search';
import Autocomplete from '@mui/material/Autocomplete';

import {
  useListResultsExportQuery,
  useGetResultsExportHealthQuery,
  useGetSessionsQuery,
} from '../../store/index'; // adjust if needed

import { useGetAllCoursesQuery } from '../../store/index'; // adjust if needed

// ---- helpers ------------------------------------------------------------
const CSV_HEADERS = [
  'S/N',
  'ID',           // from backend: row.portalId
  'Course ID',    // = uamId
  'Course Code',  // = code (cleaned)
  'MatNo',
  'FIRST NAME',
  'Credit unit',
  'Score Value',
];

const cleanCourseCode = (code = '') =>
  code.replace(/^\s*(?:B|C)-\s*/i, '').trim(); // remove leading B- or C-

function toFullName(surname = '', firstname = '', middlename = '') {
  return [surname, firstname, middlename].filter(Boolean).join(' ').trim();
}

function toCsvRow(row, i) {
  const sn = i + 1;
  const id = row?.portalId ?? '';                             // ✅ backend computed
  const courseId = row?.course?.uamId ?? '';                  // Course ID
  const courseCode = cleanCourseCode(row?.course?.code ?? ''); // Course Code (cleaned)
  const matNo = row?.student?.regNo ?? '';
  const fullName = toFullName(row?.student?.surname, row?.student?.firstname, row?.student?.middlename);
  const creditUnit = row?.course?.unit ?? '';
  const score = row?.grandtotal ?? '';
  return [sn, id, courseId, courseCode, matNo, fullName, creditUnit, score];
}

function toCSV(rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [CSV_HEADERS, ...rows].map((r) => r.map(escape).join(','));
  return lines.join('\n');
}

// ---- Main component ---------------------------------------------------------
export default function UamPortal() {
  // Filters (courseCode is the CLEANED code you pick from autocomplete)
  const [filters, setFilters] = useState({
    courseCode: '',
    session: '',
    semester: '',
    level: '',
    resultType: 'CORE',
  });
  const [submitted, setSubmitted] = useState(false);

  const queryArgs = useMemo(() => {
    if (!submitted) return { skip: true };
    const { session, semester, level, resultType, courseCode } = filters;
    return { session, semester, level, resultType, courseCode };
  }, [submitted, filters]);

  const {
    data: rows = [],
    isFetching,
    isLoading,
    isError,
    error,
    refetch,
  } = useListResultsExportQuery(queryArgs.skip ? undefined : queryArgs, {
    skip: !!queryArgs.skip,
  });

  const {
    data: health,
    isFetching: healthFetching,
    refetch: refetchHealth,
  } = useGetResultsExportHealthQuery(queryArgs.skip ? undefined : queryArgs, {
    skip: !!queryArgs.skip,
  });

  const { data: sessions = [] } = useGetSessionsQuery();

  // Courses for Autocomplete
  const {
    data: courses = [],
    isLoading: coursesLoading,
    isFetching: coursesFetching,
    isError: coursesError,
  } = useGetAllCoursesQuery();

  const courseOptions = useMemo(
    () =>
      (Array.isArray(courses) ? courses : []).map((c) => {
        const cleaned = cleanCourseCode(c.code || '');
        return {
          id: c._id,
          code: c.code,
          cleanCode: cleaned, // we filter/display using this
          title: c.title,
          level: c.level,
          unit: c.unit,
          semester: c.semester,
          uamId: c.uamId ?? '',
        };
      }),
    [courses]
  );

  const selectedCourse =
    courseOptions.find((o) => (o.cleanCode || '').toLowerCase() === (filters.courseCode || '').toLowerCase()) || null;

  const getCourseLabel = (o) =>
    o && o.cleanCode
      ? `${o.cleanCode} — ${o.title || ''} (${o.level || ''} • ${o.unit ?? ''} unit${o.unit === 1 ? '' : 's'} • Sem ${o.semester ?? ''})`
      : '';

  const csvContent = useMemo(() => {
    if (!rows?.length) return '';
    const payload = rows.map(toCsvRow);
    return toCSV(payload);
  }, [rows]);

  const canDownload = !!csvContent && !isFetching && !isLoading;

  // Handlers
  const onChange = (key) => (e) => setFilters((s) => ({ ...s, [key]: e.target.value }));
  const onSearch = (e) => {
    e.preventDefault();
    const { session, semester, level, resultType } = filters;
    if (!session || !semester || !level || !resultType) return;
    setSubmitted(true);
  };
  const onReset = () => {
    setFilters({ courseCode: '', session: '', semester: '', level: '', resultType: 'CORE' });
    setSubmitted(false);
  };
  const onDownload = () => {
    if (!csvContent) return;
    const fname = `results_export_${filters.session || 'session'}_S${filters.semester || 'x'}_${filters.level || 'lvl'}_${filters.resultType || 'type'}.csv`;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fname; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: 1400, mx: 'auto' }}>
      <Card elevation={3}>
        <CardHeader
          title="UAM Portal Results Export"
          subheader="Generate portal-ready CSV by filtering session, semester, level, and result type."
          action={
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <span>
                  <IconButton onClick={() => { refetch(); refetchHealth(); }} disabled={!submitted || isFetching}>
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Download CSV">
                <span>
                  <IconButton color="primary" onClick={onDownload} disabled={!canDownload}>
                    <FileDownloadIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          }
        />
        <Divider />
        <CardContent>
          <form onSubmit={onSearch}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Session"
                  name="session"
                  value={filters.session}
                  onChange={onChange('session')}
                  required
                  fullWidth
                  sx={{ minWidth: 300 }}
                >
                  <MenuItem value="" disabled><em>Select Session</em></MenuItem>
                  {sessions.map(s => <MenuItem key={s._id} value={s.sessionTitle}>{s.sessionTitle}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Semester"
                  value={filters.semester}
                  onChange={onChange('semester')}
                  fullWidth
                  required
                  sx={{ minWidth: 300 }}
                >
                  <MenuItem value={1}>First (1)</MenuItem>
                  <MenuItem value={2}>Second (2)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Level"
                  name="level"
                  value={filters.level}
                  onChange={onChange('level')}
                  required
                  fullWidth
                  sx={{ minWidth: 300 }}
                >
                  <MenuItem value="" disabled><em>Select Level</em></MenuItem>
                  <MenuItem value="100">100</MenuItem>
                  <MenuItem value="200">200</MenuItem>
                  <MenuItem value="300">300</MenuItem>
                  <MenuItem value="400">400</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Result Type"
                  value={filters.resultType}
                  onChange={onChange('resultType')}
                  fullWidth
                  required
                  sx={{ minWidth: 300 }}
                >
                  <MenuItem value="CORE">CORE</MenuItem>
                  <MenuItem value="CARRYOVER">CARRYOVER</MenuItem>
                </TextField>
              </Grid>

              {/* Autocomplete for Course (filters by CLEANED course.code) */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={courseOptions}
                  loading={coursesLoading || coursesFetching}
                  value={selectedCourse}
                  onChange={(_, val) => {
                    // send CLEANED code to backend filter
                    setFilters((s) => ({ ...s, courseCode: val?.cleanCode || '' }));
                  }}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  getOptionLabel={(o) =>
                    o && o.cleanCode
                      ? `${o.cleanCode} — ${o.title || ''} (${o.level || ''} • ${o.unit ?? ''} unit${o.unit === 1 ? '' : 's'} • Sem ${o.semester ?? ''})`
                      : ''
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Course (optional)"
                      placeholder="Search course..."
                      fullWidth
                      size="medium"
                      sx={{ minWidth: 400 }}
                      helperText={
                        coursesError
                          ? 'Failed to load courses.'
                          : (filters.courseCode ? `Using ${filters.courseCode} for filtering` : 'Optional')
                      }
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id} style={{ paddingTop: 8, paddingBottom: 8, whiteSpace: 'normal' }}>
                      <Stack spacing={0.5}>
                        <Typography variant="body1" fontWeight={600} noWrap={false}>
                          {option.cleanCode} — {option.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap={false}>
                          Level {option.level} • {option.unit} unit{option.unit === 1 ? '' : 's'} • Sem {option.semester}
                          {option.uamId ? ` • UAM: ${option.uamId}` : ''}
                        </Typography>
                      </Stack>
                    </li>
                  )}
                  clearOnEscape
                  disableClearable={false}
                />
              </Grid>

              <Grid item xs={12} md="auto">
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SearchIcon />}
                  disabled={isFetching || isLoading}
                >
                  Search
                </Button>
              </Grid>
              <Grid item xs={12} md="auto">
                <Button variant="text" onClick={onReset}>Reset</Button>
              </Grid>
              <Grid item xs={12} md="auto">
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={onDownload}
                  disabled={!canDownload}
                >
                  Download CSV
                </Button>
              </Grid>
            </Grid>
          </form>

          {(isFetching || isLoading) && <LinearProgress sx={{ mt: 2 }} />}

          {submitted && isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to fetch results. {error?.data?.message || error?.error || ''}
            </Alert>
          )}

          {/* Health Panel */}
          {submitted && (
            <Box sx={{ mt: 2 }}>
              <Alert
                icon={<HealthAndSafetyIcon />}
                severity={(health?.missingUamIdCount ?? 0) > 0 ? 'warning' : 'success'}
                action={
                  <Button size="small" onClick={() => refetchHealth()} disabled={healthFetching}>
                    Check
                  </Button>
                }
              >
                {healthFetching ? 'Checking data health…' : (
                  (health?.missingUamIdCount ?? 0) > 0
                    ? `${health.missingUamIdCount} result(s) are linked to courses missing a UAM ID.`
                    : 'All matched results are linked to courses with valid UAM IDs.'
                )}
              </Alert>
            </Box>
          )}

          {/* Results Table */}
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>S/N</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Course ID</TableCell>
                  <TableCell>Course Code</TableCell>
                  <TableCell>MatNo</TableCell>
                  <TableCell>FIRST NAME</TableCell>
                  <TableCell align="center">Credit unit</TableCell>
                  <TableCell align="center">Score Value</TableCell>
                  <TableCell align="center">Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows?.length ? rows.map((r, i) => {
                  const fullName = toFullName(r?.student?.surname, r?.student?.firstname, r?.student?.middlename);
                  const courseId = r?.course?.uamId;
                  const courseCode = cleanCourseCode(r?.course?.code ?? '');
                  return (
                    <TableRow key={r._id ?? `${r?.portalId || 'row'}-${i}`}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r?.portalId}
                      </TableCell>
                      <TableCell>{courseId}</TableCell>        {/* Course ID (uamId) */}
                      <TableCell>{courseCode}</TableCell>       {/* Course Code (cleaned) */}
                      <TableCell>{r?.student?.regNo}</TableCell>
                      <TableCell>{fullName}</TableCell>
                      <TableCell align="center">{r?.course?.unit}</TableCell>
                      <TableCell align="center">{r?.grandtotal}</TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={String(r?.resultType || '').toUpperCase()} />
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                        {submitted ? 'No results found for the selected filters.' : 'Fill the filters and click Search.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Footer summary */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              {rows?.length ? `Showing ${rows.length} record${rows.length > 1 ? 's' : ''}.` : '—'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={onDownload}
              disabled={!canDownload}
            >
              Download CSV
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
