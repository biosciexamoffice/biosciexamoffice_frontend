import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Alert,
  alpha,
  Backdrop,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem as MenuEntry,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Step,
  StepButton,
  Stepper,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import {
  Bolt as BoltIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  RestartAlt as RestartAltIcon,
  Search as SearchIcon,
  TableView as TableViewIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { OFFICER_CONFIG } from '../../../constants/officerConfig';

import {
  useGetApprovedCoursesByCriteriaQuery,
  useGetGraduatingListQuery,
  useGetSessionsQuery,
  useLazyGetComprehensiveResultsQuery,
  useLazySearchCourseRegistrationsQuery,
  useRecomputeAcademicMetricsMutation,
  useUpdateMetricsMutation,
  selectCurrentRoles,
  selectIsReadOnly,
} from '../../../store';
import { downloadExcel, generatePassFailExcel } from '../../../utills/dowloadResultExcel';
import useGradeSummaryPDFGenerator from '../../../utills/useGradeSummaryPDFGenerator';
import useGraduatingListPDF from '../../../utills/useGraduatingListPDF';
import useGraduatingListPrintPDF from '../../../utills/useGraduatingListPrintPDF';
import useMissingScoresPDFGenerator from '../../../utills/useMissingScoresPDFGenerator';
import usePassFailPDFGenerator from '../../../utills/usePassFailPDFGenerator';
import useResultPDFGenerator from '../../../utills/useResultPDFGenerator';
import {
  formatIntMetric,
  formatScore,
  getCourseResult,
  gradeFromScore,
  normalizeRegNo,
} from './utils/resultUtils';
import {
  getResultFlags,
  buildCarryOverDisplay,
  useFilteredStudents,
  useGradeSummary,
  useRegistrationSets,
  useSeparatedCourses,
  useStudentsWithRemarks,
} from './hooks/useResultCalculations';

const OFFICER_STAGE_BY_KEY = OFFICER_CONFIG.reduce((acc, cfg) => {
  acc[cfg.key] = cfg;
  return acc;
}, {});

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
  <Paper elevation={1} sx={{ p: 1.5, borderRadius: 2, minWidth: 160 }}>
    <Typography variant="overline" color="text.secondary">{title}</Typography>
    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
    {caption && <Typography variant="caption" color="text.secondary">{caption}</Typography>}
  </Paper>
);

const TableSkeleton = ({ columns = 12, rows = 5 }) => (
  <Table size="small">
    <TableHead>
      <TableRow>
        {Array.from({ length: columns }).map((_, index) => (
          <TableCell key={index}><Skeleton variant="text" width={80} /></TableCell>
        ))}
      </TableRow>
    </TableHead>
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <TableCell key={columnIndex}><Skeleton variant="rectangular" height={20} /></TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

function ResultComputation() {
  const theme = useTheme();
  const errorRef = useRef(null);

  const [triggerResults, {
    data: processedData,
    isLoading,
    isSuccess,
    isError,
    error,
  }] = useLazyGetComprehensiveResultsQuery();

  const { data: sessions = [] } = useGetSessionsQuery();

  const [formData, setFormData] = useState({ session: '', semester: '', level: '' });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const roles = useSelector(selectCurrentRoles);
  const readOnly = useSelector(selectIsReadOnly);
  const canAuthorNotes = useMemo(
    () => roles.includes('ADMIN') || roles.includes('EXAM_OFFICER'),
    [roles],
  );
  const [updateMetrics, { isLoading: isSavingNote }] = useUpdateMetricsMutation();
  const [noteDialog, setNoteDialog] = useState({
    open: false,
    metricsId: null,
    stage: null,
    mode: 'note',
    originalNote: '',
    note: '',
    error: '',
  });

  const steps = ['Select Term', 'Choose Students', 'Review & Approve'];
  const [activeStep, setActiveStep] = useState(0);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [autoExcludedIds, setAutoExcludedIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectionQuery, setSelectionQuery] = useState('');
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const [computedStudentIds, setComputedStudentIds] = useState([]);
  const [computedStudentRegNos, setComputedStudentRegNos] = useState([]);
  const [latestQueryArgs, setLatestQueryArgs] = useState(null);
  const [officerNames, setOfficerNames] = useState({ ceo: '', hod: '', dean: '' });
  const normalizeOfficer = useCallback((approval = {}) => ({
    approved: Boolean(approval?.approved),
    flagged: Boolean(approval?.flagged),
    name: approval?.name || '',
    note: approval?.note || '',
    response: approval?.response || '',
    responseBy: approval?.responseBy || '',
    flagClearedAt: approval?.flagClearedAt || null,
    updatedAt: approval?.updatedAt || null,
  }), []);

  useEffect(() => {
    if (!processedData?.students?.length) return;
    const firstWithMetrics = processedData.students.find((student) => student?.metrics?._id);
    if (!firstWithMetrics) return;
    setOfficerNames((prev) => {
      let changed = false;
      const next = { ...prev };
      OFFICER_CONFIG.forEach(({ key, approvalField }) => {
        if (!next[key]?.trim()) {
          const name = firstWithMetrics?.[approvalField]?.name || '';
          if (name && next[key] !== name) {
            next[key] = name;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [processedData]);

  const blinkCellSx = useMemo(() => ({
    color: theme.palette.error.main,
    fontWeight: 700,
    animation: 'flash 1.2s ease-in-out infinite',
    '@keyframes flash': {
      '0%': { opacity: 1 },
      '50%': { opacity: 0.2 },
      '100%': { opacity: 1 },
    },
  }), [theme.palette.error.main]);

  const blinkCarryOverSx = useMemo(() => ({
    color: theme.palette.error.main,
    border: `1px solid ${alpha(theme.palette.error.main, 0.6)}`,
    backgroundColor: alpha(theme.palette.error.light, 0.12),
    fontWeight: 700,
    animation: 'flash 1.2s ease-in-out infinite',
    '@keyframes flash': {
      '0%': { opacity: 1 },
      '50%': { opacity: 0.2 },
      '100%': { opacity: 1 },
    },
  }), [theme.palette.error.main, theme.palette.error.light]);

  const openMenu = Boolean(anchorEl);

  const { data: approvedCourses } = useGetApprovedCoursesByCriteriaQuery(
    { session: formData.session, semester: formData.semester, level: formData.level },
    { skip: !formData.session || !formData.semester || !formData.level },
  );

  const [recomputeMetrics, { isLoading: recomputing }] = useRecomputeAcademicMetricsMutation();
  const handleRecompute = async () => {
    if (!formData.session || !formData.semester || !formData.level) return;
    setBusy(true);
    try {
      const payload = {
        session: formData.session,
        semester: formData.semester,
        level: formData.level,
      };
      let targetIds = computedStudentIds;
      let targetRegNos = computedStudentRegNos;

      if (selectedStudentIds.length) {
        targetIds = selectedStudentIds;
        const idSet = new Set(selectedStudentIds);
        targetRegNos = eligibleStudents
          .filter((student) => idSet.has(student.id))
          .map((student) => normalizeRegNo(student.regNo));
      }

      if (targetIds.length) payload.studentIds = targetIds;
      if (targetRegNos.length) payload.studentRegNos = targetRegNos;

      await recomputeMetrics(payload).unwrap();
      if (latestQueryArgs) {
        await triggerResults(latestQueryArgs, false).unwrap();
      }
    } finally {
      setBusy(false);
    }
  };

  const openNoteDialog = useCallback((student, stageKey) => {
    const stageConfig = OFFICER_STAGE_BY_KEY[stageKey];
    if (!stageConfig) return;
    const approvalField = stageConfig.approvalField;
    const existingApproval = approvalField ? student?.[approvalField] : null;
    const metricsId = student?.metrics?._id;
    if (!metricsId) return;
    const originalNote = existingApproval?.note || '';
    const existingResponse = existingApproval?.response || '';
    const mode = originalNote ? 'response' : 'note';
    setNoteDialog({
      open: true,
      metricsId,
      stage: stageKey,
      mode,
      originalNote,
      note: mode === 'note' ? originalNote : existingResponse,
      error: '',
    });
  }, []);

  const closeNoteDialog = useCallback(() => {
    setNoteDialog({ open: false, metricsId: null, stage: null, mode: 'note', originalNote: '', note: '', error: '' });
  }, []);

  const handleNoteChange = useCallback((event) => {
    const { value } = event.target;
    setNoteDialog((prev) => ({ ...prev, note: value, error: '' }));
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (readOnly) {
      setNoteDialog((prev) => ({ ...prev, error: 'Notes are disabled while you are connected to the read-only replica.' }));
      return;
    }

    const stageConfig = noteDialog.stage ? OFFICER_STAGE_BY_KEY[noteDialog.stage] : null;
    const noteKey = stageConfig?.noteKey;
    const responseKey = stageConfig?.responseKey;
    if (!stageConfig || (!noteKey && !responseKey)) {
      setNoteDialog((prev) => ({ ...prev, error: 'Unable to determine the approval stage for this note.' }));
      return;
    }

    const trimmed = noteDialog.note.trim();
    if (!trimmed) {
      setNoteDialog((prev) => ({ ...prev, error: 'Enter a note before saving.' }));
      return;
    }

    try {
      const payload = { metricsId: noteDialog.metricsId };
      if (noteDialog.mode === 'note') {
        payload[noteKey] = trimmed;
      } else if (responseKey) {
        payload[responseKey] = trimmed;
      } else if (noteKey) {
        payload[noteKey] = trimmed;
      }

      await updateMetrics(payload).unwrap();
      closeNoteDialog();
      if (latestQueryArgs) {
        try {
          await triggerResults(latestQueryArgs, false).unwrap();
        } catch {
          // ignore refresh errors; UI will reflect current state
        }
      }
    } catch (err) {
      const message = err?.data?.message || 'Failed to save note. Please try again.';
      setNoteDialog((prev) => ({ ...prev, error: message }));
    }
  }, [closeNoteDialog, latestQueryArgs, noteDialog.metricsId, noteDialog.note, noteDialog.stage, readOnly, triggerResults, updateMetrics]);

  const { generatePDF } = useResultPDFGenerator();
  const { generatePDF: generateGradeSummaryPDF } = useGradeSummaryPDFGenerator();
  const { generatePDF: generatePassFailPDF } = usePassFailPDFGenerator();
  const { generatePDF: generateGraduatingListPDF } = useGraduatingListPDF();
  const { generatePDF: generateGraduatingListPrintPDF } = useGraduatingListPrintPDF();
  const { generatePDF: generateMissingScoresPDF } = useMissingScoresPDFGenerator();

  const [fetchRegistrations] = useLazySearchCourseRegistrationsQuery();

  const separateCourses = useSeparatedCourses(processedData, approvedCourses);
  const [regSetsByCourseId, setRegSetsByCourseId] = useRegistrationSets({
    isSuccess,
    processedData,
    formData,
    separateCourses,
    fetchRegistrations,
  });

  const enhancedProcessedData = useStudentsWithRemarks({
    processedData,
    separateCourses,
    regSetsByCourseId,
  });

  const filteredStudents = useFilteredStudents({ enhancedProcessedData, query });
  const gradeSummary = useGradeSummary({
    enhancedProcessedData,
    separateCourses,
    regSetsByCourseId,
    limitRegNos: computedStudentRegNos.length ? computedStudentRegNos : undefined,
  });

  const filteredEligibleStudents = useMemo(() => {
    const q = selectionQuery.trim().toLowerCase();
    if (!q) return eligibleStudents;
    return eligibleStudents.filter((student) => {
      const reg = String(student.regNo || '').toLowerCase();
      const name = String(student.fullName || '').toLowerCase();
      return reg.includes(q) || name.includes(q);
    });
  }, [eligibleStudents, selectionQuery]);

  const selectedCount = selectedStudentIds.length;
  const totalEligible = eligibleStudents.length;
  const autoExcludedCount = autoExcludedIds.length;

  const { hasResults, noResults } = getResultFlags(isSuccess, enhancedProcessedData);
  const termSelectionLocked = activeStep !== 0 && eligibleStudents.length > 0;
  const canNavigateToStep = (index) => {
    if (index === 0) return true;
    if (index === 1) return eligibleStudents.length > 0;
    if (index === 2) {
      return Boolean(latestQueryArgs) || hasResults || noResults || isLoading || isError;
    }
    return false;
  };
  const isStepCompleted = (index) => {
    if (index === 0) return eligibleStudents.length > 0;
    if (index === 1) return Boolean(latestQueryArgs);
    return false;
  };

  const is400 = String(formData.level) === '400';
  const { data: graduatingList, isFetching: isGradLoading } = useGetGraduatingListQuery(
    { session: formData.session, semester: formData.semester, level: 400 },
    { skip: !(formData.session && formData.semester && is400 && hasResults) },
  );

  useEffect(() => {
    if (isError && errorRef.current) {
      errorRef.current.focus();
    }
  }, [isError]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const normalizeStanding = (standing) => String(standing || '').toLowerCase();
  const isAutoExcludedStanding = (standing) => {
    const value = normalizeStanding(standing);
    return value === 'deferred' || value === 'withdrawn';
  };

  const getStandingChipProps = (standing) => {
    const value = normalizeStanding(standing);
    if (value === 'deferred') return { label: 'Deferred', color: 'warning' };
    if (value === 'withdrawn') return { label: 'Withdrawn', color: 'error' };
    if (value === 'readmitted') return { label: 'Readmitted', color: 'info', variant: 'outlined' };
    return { label: 'Good Standing', color: 'success', variant: 'outlined' };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSelectionError('');
    setPage(0);

    if (!formData.session || !formData.semester || !formData.level) {
      setSelectionError('Please select session, semester, and level.');
      return;
    }

    setActiveStep(0);
    setEligibleStudents([]);
    setAutoExcludedIds([]);
    setSelectedStudentIds([]);
    setComputedStudentIds([]);
    setComputedStudentRegNos([]);
    setLatestQueryArgs(null);

    const requestArgs = {
      session: formData.session,
      semester: formData.semester,
      level: formData.level,
      onlyStudents: true,
    };

    setSelectionLoading(true);
    try {
      const response = await triggerResults(requestArgs, false).unwrap();
      const list = Array.isArray(response?.students) ? [...response.students] : [];
      list.sort((a, b) => String(a.regNo || '').localeCompare(String(b.regNo || ''), undefined, { numeric: true, sensitivity: 'base' }));

      const autoExcluded = [];
      const autoSelected = [];
      list.forEach((student) => {
        if (isAutoExcludedStanding(student.standing)) {
          autoExcluded.push(student.id);
        } else {
          autoSelected.push(student.id);
        }
      });

      setEligibleStudents(list);
      setAutoExcludedIds(autoExcluded);
      setSelectedStudentIds(autoSelected);
      setActiveStep(list.length ? 1 : 0);

      if (!list.length) {
        setSelectionError('No registered students were found for the selected term.');
      }
    } catch (err) {
      setSelectionError(err?.data?.error || 'Failed to load students for the selected term.');
    } finally {
      setSelectionLoading(false);
    }
  };

  const handleComputeSelected = async () => {
    if (!selectedStudentIds.length) {
      setSelectionError('Select at least one student to compute results.');
      return;
    }
    setSelectionError('');

    const idSet = new Set(selectedStudentIds);
    const regNos = eligibleStudents
      .filter((student) => idSet.has(student.id))
      .map((student) => normalizeRegNo(student.regNo));

    const queryArgs = {
      session: formData.session,
      semester: formData.semester,
      level: formData.level,
      studentIds: selectedStudentIds,
    };

    if (regNos.length) {
      queryArgs.studentRegNos = regNos;
    }

    setSelectionLoading(true);
    try {
      await triggerResults(queryArgs, false).unwrap();
      setComputedStudentIds([...selectedStudentIds]);
      setComputedStudentRegNos(regNos);
      setLatestQueryArgs(queryArgs);
      setQuery('');
      setActiveStep(2);
    } catch (err) {
      setSelectionError(err?.data?.error || 'Failed to compute results for the selected students.');
    } finally {
      setSelectionLoading(false);
    }
  };

  const handleSelectStudent = (studentId, checked) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      return [...next];
    });
  };

  const handleSelectAllStudents = () => {
    const selectable = eligibleStudents
      .filter((student) => !isAutoExcludedStanding(student.standing))
      .map((student) => student.id);
    setSelectedStudentIds(selectable);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  const handleBackToCriteria = () => {
    setActiveStep(0);
  };

  const handleReturnToSelection = () => {
    setSelectionError('');
    setActiveStep(1);
  };

  const handleOfficerNameChange = (officerKey, value) => {
    setOfficerNames((prev) => ({ ...prev, [officerKey]: value }));
  };

  const handleReset = () => {
    setFormData({ session: '', semester: '', level: '' });
    setPage(0);
    setQuery('');
    setRegSetsByCourseId({});
    setActiveStep(0);
    setEligibleStudents([]);
    setAutoExcludedIds([]);
    setSelectedStudentIds([]);
    setSelectionQuery('');
    setSelectionError('');
    setComputedStudentIds([]);
    setComputedStudentRegNos([]);
    setLatestQueryArgs(null);
    setOfficerNames({ ceo: '', hod: '', dean: '' });
  };

  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', p: { xs: 1.5, md: 2 } }}>
      <Card elevation={3} component="form" onSubmit={handleSubmit} sx={{ borderRadius: 2 }}>
        <CardHeader
          title="Result Computation"
          subheader="Choose session, semester, and level; compute, explore, then export."
          sx={{ pb: 0.5 }}
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
        <CardContent sx={{ pt: 1.5 }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Session"
                name="session"
                value={formData.session}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
                disabled={termSelectionLocked}
              >
                <MenuItem disabled value="">
                  <em>Select Session</em>
                </MenuItem>
                {sessions.map((session) => (
                  <MenuItem key={session._id} value={session.sessionTitle}>
                    {session.sessionTitle}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Semester"
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
                disabled={termSelectionLocked}
              >
                <MenuItem disabled value="">
                  <em>Select Semester</em>
                </MenuItem>
                <MenuItem value={1}>First Semester</MenuItem>
                <MenuItem value={2}>Second Semester</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Level"
                name="level"
                value={formData.level}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
                disabled={termSelectionLocked}
              >
                <MenuItem disabled value="">
                  <em>Select Level</em>
                </MenuItem>
                {[100, 200, 300, 400].map((level) => (
                  <MenuItem key={level} value={level}>
                    {level} Level
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                size="small"
                placeholder="Quick filter by Reg. Number or Name"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ opacity: 0.6 }} fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                disabled={!hasResults}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} justifyContent={{ xs: 'stretch', md: 'flex-end' }}>
                <LoadingButton
                  type="submit"
                  loading={isLoading}
                  variant="contained"
                  color="primary"
                  size="small"
                  sx={{ minWidth: 170 }}
                >
                  Search
                </LoadingButton>

                <Tooltip title="Re-run with current filters">
                  <span>
                    <IconButton onClick={handleSubmit} disabled={isLoading} size="small">
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap' }}>
            {formData.session && <Chip size="small" label={`Session: ${formData.session}`} />}
            {formData.semester && <Chip size="small" label={`Semester: ${formData.semester}`} />}
            {formData.level && <Chip size="small" label={`Level: ${formData.level}`} />}
          </Stack>
      </CardContent>
    </Card>

    <Stepper activeStep={activeStep} sx={{ mt: 3, mb: 2 }} alternativeLabel>
      {steps.map((label, index) => {
        const canNavigate = canNavigateToStep(index);
        return (
          <Step key={label} completed={isStepCompleted(index)}>
            <StepButton
              color="inherit"
              onClick={() => {
                if (!canNavigate) return;
                if (index === 0) {
                  handleBackToCriteria();
                } else if (index === 1) {
                  handleReturnToSelection();
                } else {
                  setActiveStep(2);
                }
              }}
              disabled={!canNavigate}
            >
              {label}
            </StepButton>
          </Step>
        );
      })}
    </Stepper>

    {activeStep === 1 && (
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardHeader
          title="Choose Students"
          subheader="Select the students whose metrics should be computed for this term."
        />
        <CardContent>
          {selectionError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {selectionError}
            </Alert>
          )}
          {autoExcludedCount > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {autoExcludedCount} student{autoExcludedCount === 1 ? '' : 's'} with a standing of
              {' '}<strong>Deferred</strong> or <strong>Withdrawn</strong> were auto-excluded.
            </Alert>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              fullWidth
              size="small"
              label="Filter by Reg. Number or Name"
              value={selectionQuery}
              onChange={(event) => setSelectionQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ opacity: 0.6 }} />
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-end', md: 'flex-start' }}>
              <Button onClick={handleSelectAllStudents} variant="outlined" size="small">Select All</Button>
              <Button onClick={handleClearSelection} variant="text" size="small">Clear</Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
            <Chip label={`Total: ${totalEligible}`} size="small" />
            <Chip label={`Selected: ${selectedCount}`} color="primary" size="small" />
            {autoExcludedCount > 0 && (
              <Chip label={`Auto-excluded: ${autoExcludedCount}`} color="warning" size="small" />
            )}
          </Stack>

          <Box sx={{ mt: 2, maxHeight: 360, overflow: 'auto', borderRadius: 1, border: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
            {selectionLoading ? (
              <Stack sx={{ py: 4 }} justifyContent="center" alignItems="center">
                <CircularProgress size={28} />
                <Typography variant="caption" sx={{ mt: 1 }}>Loading students…</Typography>
              </Stack>
            ) : (
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ fontWeight: 600 }}>Select</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Reg. Number</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Standing</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEligibleStudents.map((student) => {
                    const disabled = isAutoExcludedStanding(student.standing);
                    const chipProps = getStandingChipProps(student.standing);
                    const checked = selectedStudentIds.includes(student.id);

                    return (
                      <TableRow key={student.id} sx={{ opacity: disabled ? 0.6 : 1 }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            color="primary"
                            checked={checked}
                            disabled={disabled || selectionLoading}
                            onChange={(event) => handleSelectStudent(student.id, event.target.checked)}
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <Typography variant="body2" fontWeight={600}>{student.regNo}</Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 200 }}>
                          <Typography variant="body2">{student.fullName || '—'}</Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 140 }}>
                          <Chip size="small" {...chipProps} sx={{ fontWeight: 600 }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {!filteredEligibleStudents.length && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">No students match the current filter.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Box>
        </CardContent>
        <CardActions
          sx={{
            px: 3,
            pb: 2,
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Button onClick={handleBackToCriteria} disabled={selectionLoading}>Back</Button>
          <Stack direction="row" spacing={1}>
            <LoadingButton
              variant="outlined"
              color="secondary"
              startIcon={<BoltIcon />}
              loading={recomputing || busy}
              onClick={handleRecompute}
              disabled={
                selectionLoading ||
                busy ||
                (!selectedCount && !computedStudentIds.length)
              }
              size="small"
              sx={{ minWidth: 150 }}
            >
              Recompute
            </LoadingButton>
            <LoadingButton
              onClick={handleComputeSelected}
              variant="contained"
              color="primary"
              disabled={selectionLoading || !selectedCount}
              loading={selectionLoading}
            >
              Compute Selected
            </LoadingButton>
          </Stack>
        </CardActions>
      </Card>
    )}

      {isLoading && activeStep === 2 && (
        <Paper elevation={2} sx={{ mt: 3, p: 2 }} aria-busy>
          <TableSkeleton columns={16 + (OFFICER_CONFIG.length - 1)} rows={6} />
        </Paper>
      )}

      {isError && activeStep === 2 && (
        <Paper elevation={3} sx={{ mt: 3, p: 3 }} role="alert" tabIndex={-1} ref={errorRef}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Error Loading Results</Typography>
            <Typography>{error?.data?.error || 'Unknown error occurred'}</Typography>
          </Alert>
          <Button variant="outlined" onClick={handleSubmit} startIcon={<RefreshIcon />}>
            Retry
          </Button>
        </Paper>
      )}

      {noResults && !isLoading && activeStep === 2 && (
        <Paper elevation={3} sx={{ mt: 3, p: 4, textAlign: 'center' }}>
          <InfoIcon color="info" sx={{ fontSize: 56, mb: 1 }} />
          <Typography variant="h6">No Results Found</Typography>
          <Typography color="text.secondary">
            Try a different combination or check approvals for the selected criteria.
          </Typography>
        </Paper>
      )}

      {hasResults && !isLoading && enhancedProcessedData && activeStep === 2 && (
        <Paper elevation={3} sx={{ mt: 3, p: 2, overflow: 'hidden' }}>
          <Toolbar
            sx={{
              px: 1,
              borderRadius: 1,
              background: alpha(theme.palette.primary.main, 0.05),
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={2} alignItems="stretch" sx={{ flexWrap: 'wrap' }}>
              <StatCard title="Students" value={enhancedProcessedData?.students?.length || 0} />
              <StatCard title="Regular Courses" value={separateCourses.regularCourses.length} />
              <StatCard title="Carry Overs" value={separateCourses.carryOverCourses.length} />
            </Stack>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              alignItems="center"
              sx={{ flexWrap: 'wrap' }}
            >
              <Button
                size="small"
                onClick={handleReturnToSelection}
                disabled={selectionLoading}
              >
                Change Selection
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<TableViewIcon />}
                onClick={(event) => setAnchorEl(event.currentTarget)}
              >
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
                      subject: 'College Not Provided',
                      department: enhancedProcessedData?.department || 'Department Not Provided',
                      programme: enhancedProcessedData?.programme || 'Programme Not Provided',
                    },
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
                      { registrationSets: regSetsByCourseId }
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

              <LoadingButton variant="contained" size="small" loading={busy} startIcon={<DownloadIcon />}>
                Quick Export
              </LoadingButton>
            </Stack>
          </Toolbar>

          <Stack direction="row" spacing={2} sx={{ mt: 1, px: 1 }}>
            <Typography variant="caption"><b>NR</b>: Not registered for this course (by current Session/Semester/Level)</Typography>
            <Typography variant="caption"><b>00F</b>: Registered but no score recorded (treated as F)</Typography>
            <Typography variant="caption"><b>-</b>: Elective not taken</Typography>
          </Stack>

          <Box sx={{ mt: 2, borderRadius: 1, overflow: 'auto' }}>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader aria-label="results table">
                <TableHead>
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

                  <TableRow
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.06),
                      '& .MuiTableCell-root': { fontWeight: 600 },
                    }}
                  >
                    <TableCell sx={{ position: 'sticky', left: 0, background: theme.palette.background.paper, zIndex: 2 }}>S/No.</TableCell>
                    <TableCell sx={{ position: 'sticky', left: 80, background: theme.palette.background.paper, zIndex: 2 }}>Reg. Number / Name</TableCell>
                    {separateCourses.regularCourses.map((course) => (
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
                      <TableCell key={`officer-header-${officer.key}`}>{officer.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {(filteredStudents || [])
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((student, index) => {
                      const prevMetrics = student.previousMetrics || {};
                      const currMetrics = student.currentMetrics || {};
                      const cumMetrics = student.metrics || {};
                      const rowNumber = page * rowsPerPage + index + 1;
                      const studentRegUpper = normalizeRegNo(student.regNo);
                      const isProbation = Number(cumMetrics.CGPA || 0) < 1;
                      const stickyBg = isProbation
                        ? alpha(theme.palette.warning.light, 0.25)
                        : theme.palette.background.paper;
                      const standingChip = getStandingChipProps(student.standing);
                      const officerApprovals = {};
                      OFFICER_CONFIG.forEach(({ key, approvalField }) => {
                        officerApprovals[key] = normalizeOfficer(student?.[approvalField]);
                      });

                      return (
                        <TableRow
                          key={student.id || student.regNo}
                          hover
                          sx={{
                            backgroundColor: isProbation ? alpha(theme.palette.warning.light, 0.12) : undefined,
                          }}
                        >
                          <TableCell sx={{ position: 'sticky', left: 0, background: stickyBg }}>
                            {rowNumber}
                          </TableCell>
                          <TableCell sx={{ position: 'sticky', left: 80, background: stickyBg, minWidth: 220 }}>
                            <Box>
                              <Typography variant="body2" fontWeight={700}>{student.regNo}</Typography>
                              <Typography variant="body2" color="text.secondary">{student.fullName}</Typography>
                              <Box sx={{ mt: 0.5 }}>
                                <Chip size="small" sx={{ fontWeight: 600 }} {...standingChip} />
                              </Box>
                            </Box>
                          </TableCell>

                          {separateCourses.regularCourses.map((course) => {
                            const regSet = regSetsByCourseId[course.id];
                            const isRegistered = regSet?.has(studentRegUpper);
                            const isElective = String(course?.option || '').toUpperCase() === 'E';
                            const result = isRegistered ? getCourseResult(student, course) : null;

                            if (!isRegistered) {
                              return (
                                <TableCell key={`${student.id}-${course.id}`} align="center">
                                  {isElective ? '-' : 'NR'}
                                </TableCell>
                              );
                            }

                            if (result) {
                              const grade = result.grade ?? gradeFromScore(result.grandtotal);
                              const scoreDisplay = formatScore(result.grandtotal);
                              if (grade === 'F' && scoreDisplay === '00') {
                                return (
                                  <TableCell key={`${student.id}-${course.id}`} align="center" sx={blinkCellSx}>
                                    {`${scoreDisplay}${grade}`}
                                  </TableCell>
                                );
                              }

                              const color = grade === 'F' ? theme.palette.error.main : theme.palette.text.primary;
                              return (
                                <TableCell key={`${student.id}-${course.id}`} align="center" sx={{ color }}>
                                  {`${scoreDisplay}${grade}`}
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell key={`${student.id}-${course.id}`} align="center" sx={blinkCellSx}>
                                00F
                              </TableCell>
                            );
                          })}

                          <TableCell sx={{ backgroundColor: alpha(theme.palette.warning.light, 0.08), minWidth: 180 }}>
                            {buildCarryOverDisplay(student, separateCourses, regSetsByCourseId).map((course) => (
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
                                  ...(course.isMissing ? blinkCarryOverSx : {}),
                                }}
                              >
                                {course.label} {course.display}
                              </Box>
                            ))}
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

                          <TableCell sx={{ textAlign: 'left', minWidth: 200 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2">{student.remarks}</Typography>
                              {isProbation && <Chip label="Probation" color="warning" size="small" />}
                            </Box>
                          </TableCell>

                          {OFFICER_CONFIG.map((officer) => {
                            const approval = officerApprovals[officer.key] || {};
                            const statusLabel = approval.approved ? 'Approved' : 'Pending';
                            const statusColor = approval.approved ? 'success' : 'default';
                            const updatedText = approval.updatedAt
                              ? new Date(approval.updatedAt).toLocaleString()
                              : null;
                            const officerName = approval.name || officerNames[officer.key] || '—';
                            const metricsId = student.metrics?._id;
                            const allowNoteForExamOfficer =
                              canAuthorNotes && officer.key === 'ceo' && approval.flagged && Boolean(metricsId);

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
                                    Officer: {officerName}
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
                                  {approval.response && (
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                      <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                                      <Typography variant="caption" color="text.secondary">
                                        Response: {approval.response}
                                      </Typography>
                                    </Stack>
                                  )}
                                  {approval.flagClearedAt && (
                                    <Typography variant="caption" color="text.secondary">
                                      Cleared {new Date(approval.flagClearedAt).toLocaleString()}
                                    </Typography>
                                  )}
                                  {updatedText && (
                                    <Typography variant="caption" color="text.secondary">
                                      Updated {updatedText}
                                    </Typography>
                                  )}
                                  {allowNoteForExamOfficer && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => openNoteDialog(student, officer.key)}
                                      disabled={readOnly || isSavingNote}
                                    >
                                      {approval.note ? 'Respond' : 'Add Note'}
                                    </Button>
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
              count={filteredStudents?.length || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Box>
        </Paper>
      )}

      <Backdrop open={busy} sx={{ zIndex: (themeInstance) => themeInstance.zIndex.drawer + 1 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress color="inherit" />
          <Typography>Preparing file…</Typography>
        </Stack>
      </Backdrop>

      <Dialog
        open={noteDialog.open}
        onClose={closeNoteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{noteDialog.mode === 'note' ? 'Add Flag Note' : 'Respond to Flag'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {noteDialog.mode === 'note'
              ? 'Enter a note explaining why this record is being flagged.'
              : 'Add your response. The original flag note is shown below for reference.'}
          </Typography>
          {noteDialog.mode === 'response' && (
            <Alert severity="info" variant="outlined" sx={{ whiteSpace: 'pre-wrap' }}>
              <Typography variant="subtitle2" gutterBottom>Flag note</Typography>
              <Typography variant="body2" color="text.secondary">
                {noteDialog.originalNote || 'No flag note provided.'}
              </Typography>
            </Alert>
          )}
          {noteDialog.error && (
            <Alert severity="error" variant="outlined">
              {noteDialog.error}
            </Alert>
          )}
          <TextField
            label={noteDialog.mode === 'note' ? 'Flag note' : 'Response'}
            multiline
            minRows={3}
            value={noteDialog.note}
            onChange={handleNoteChange}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeNoteDialog} disabled={isSavingNote}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveNote}
            disabled={isSavingNote}
          >
            {isSavingNote ? 'Saving…' : noteDialog.mode === 'note' ? 'Save Note' : 'Respond'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ResultComputation;
