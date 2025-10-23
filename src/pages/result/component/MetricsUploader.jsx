// ResultDashboard/component/MetricsUploader.jsx
import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  LinearProgress,
  Alert,
  Chip,
  Divider,
  FormControlLabel,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  useUploadOldMetricsMutation,
  useAnalyzeOldMetricsMutation,
  useGetAllLecturersQuery,
  useGetCollegesQuery,
} from '../../../store';

const semesters = [1, 2];
const curriculumOptions = [
  { value: 'BMASS', label: 'BMASS' },
  { value: 'CCMASS', label: 'CCMASS' },
];

const steps = ['Details', 'Students', 'Course Results', 'Metrics'];

const createSelectionTemplate = () => ({
  global: { students: true, metrics: true, includeResults: true, carryOvers: true },
  files: {},
});

const buildDefaultSelectionFromAnalysis = (analysis) => {
  const template = createSelectionTemplate();
  analysis?.perFile?.forEach((fileReport) => {
    const available = fileReport?.availableSelections || {};
    const courseOptions =
      available?.results?.courseCodes?.map((opt) => opt.prefixedCode).filter(Boolean) || [];
    template.files[fileReport.file] = {
      students: Boolean(available.students),
      metrics: Boolean(available.metrics),
      includeResults: Boolean(courseOptions.length),
      carryOvers: Boolean(available.carryOvers),
      courses: courseOptions,
    };
  });
  return template;
};

const guessLevel = (name) => {
  const match = String(name || '').match(/\b(100|200|300|400)\b/);
  return match ? match[1] : '—';
};

export default function MetricsUploader() {
  const [session, setSession] = useState('');
  const [semester, setSemester] = useState('');
  const [curriculumType, setCurriculumType] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [files, setFiles] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [selection, setSelection] = useState(createSelectionTemplate);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [analyzeError, setAnalyzeError] = useState('');
  const [activeStep, setActiveStep] = useState(0);

  const [uploadOldMetrics, { isLoading }] = useUploadOldMetricsMutation();
  const [analyzeOldMetrics, { isLoading: isAnalyzing }] = useAnalyzeOldMetricsMutation();

  const { data: collegesResponse } = useGetCollegesQuery();
  const { data: lecturersResponse } = useGetAllLecturersQuery();

  const colleges = useMemo(
    () => (collegesResponse?.colleges || []).map((college) => ({
      id: String(college.id),
      name: college.name,
      departments: (college.departments || []).map((dept) => ({
        id: String(dept.id),
        name: dept.name,
      })),
    })),
    [collegesResponse]
  );

  const departments = useMemo(() => {
    if (!collegeId) return [];
    const selectedCollege = colleges.find((college) => college.id === collegeId);
    return selectedCollege?.departments || [];
  }, [collegeId, colleges]);

  const lecturers = useMemo(
    () => Array.isArray(lecturersResponse)
      ? lecturersResponse.map((lect) => ({
          id: String(lect._id || lect.id),
          label: lect.name
            || [lect.title, lect.surname, lect.firstname, lect.middlename].filter(Boolean).join(' '),
        }))
      : [],
    [lecturersResponse]
  );

  const filePreviews = useMemo(
    () => files.map((f) => ({ name: f.name, level: guessLevel(f.name) })),
    [files]
  );

  const requiredFieldsReady = Boolean(
    session && semester && curriculumType && collegeId && departmentId && lecturerId
  );

  useEffect(() => {
    if (!collegeId) {
      setDepartmentId('');
    } else if (departmentId && !departments.some((dept) => dept.id === departmentId)) {
      setDepartmentId('');
    }
  }, [collegeId, departmentId, departments]);

  useEffect(() => {
    setAnalysis(null);
    setSelection(createSelectionTemplate());
    setActiveStep(0);
    setResult(null);
    setAnalyzeError('');
  }, [session, semester, curriculumType, collegeId, departmentId, lecturerId]);

  const getAvailableCourses = (fileName) => {
    const fileReport = analysis?.perFile?.find((item) => item.file === fileName);
    return fileReport?.availableSelections?.results?.courseCodes
      ?.map((opt) => opt.prefixedCode)
      .filter(Boolean) || [];
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length && !files.length) return;

    const uniqueByNameAndSize = new Map();
    [...files, ...selectedFiles].forEach((file) => {
      const key = `${file.name}::${file.size}`;
      if (!uniqueByNameAndSize.has(key)) {
        uniqueByNameAndSize.set(key, file);
      }
    });
    const uniqueFiles = Array.from(uniqueByNameAndSize.values());

    if (uniqueFiles.length !== files.length + selectedFiles.length) {
      setNotice('Duplicate files were ignored so each file will be processed once.');
    } else {
      setNotice('');
    }

    setFiles(uniqueFiles);
    setAnalysis(null);
    setSelection(createSelectionTemplate());
    setActiveStep(0);
    setResult(null);
    setError('');
  };

  const getFileSelection = (fileName) => selection.files[fileName] || {
    students: selection.global.students ?? true,
    metrics: selection.global.metrics ?? true,
    includeResults: selection.global.includeResults ?? true,
    carryOvers: selection.global.carryOvers ?? true,
    courses: [],
  };

  const updateFileSelection = (fileName, updater) => {
    setSelection((prev) => {
      const filesMap = { ...prev.files };
      const current = { ...(filesMap[fileName] || {}) };
      const updated = updater(current);
      filesMap[fileName] = updated;
      return { ...prev, files: filesMap };
    });
  };

  const handleFileToggle = (fileName, key) => (event) => {
    const checked = event.target.checked;
    updateFileSelection(fileName, (current) => {
      const next = { ...current, [key]: checked };
      if (key === 'includeResults') {
        if (!checked) {
          next.courses = [];
        } else if (!current.courses || !current.courses.length) {
          next.courses = getAvailableCourses(fileName);
        }
      }
      return next;
    });
  };

  const handleCourseToggle = (fileName, courseCode) => (event) => {
    const checked = event.target.checked;
    updateFileSelection(fileName, (current) => {
      const set = new Set(current.courses || []);
      if (checked) set.add(courseCode);
      else set.delete(courseCode);
      const courses = Array.from(set);
      return {
        ...current,
        courses,
        includeResults: courses.length > 0,
      };
    });
  };

  const handleGlobalToggle = (key) => (event) => {
    const checked = event.target.checked;
    setSelection((prev) => {
      const nextFiles = {};
      Object.entries(prev.files).forEach(([fileName, data]) => {
        const next = { ...data, [key]: checked };
        if (key === 'includeResults') {
          if (checked) {
            const available = getAvailableCourses(fileName);
            next.courses = available.length ? available : (next.courses || []);
          } else {
            next.courses = [];
          }
        }
        nextFiles[fileName] = next;
      });
      return {
        global: { ...prev.global, [key]: checked },
        files: nextFiles,
      };
    });
  };

  const hasBlockingDuplicates = Boolean(
    analysis?.perFile?.some((file) =>
      (file?.duplicates?.metrics?.length || 0) > 0 ||
      (file?.duplicates?.results?.length || 0) > 0
    )
  );

  const hasStudentsSelected = Boolean(
    analysis?.perFile?.some((file) => getFileSelection(file.file)?.students)
  );

  const hasResultsSelected = Boolean(
    analysis?.perFile?.some((file) => {
      const sel = getFileSelection(file.file);
      return sel?.includeResults && Array.isArray(sel.courses) && sel.courses.length > 0;
    })
  );

  const hasMetricsSelected = Boolean(
    analysis?.perFile?.some((file) => getFileSelection(file.file)?.metrics)
  );

  const canCommit = Boolean(
    analysis?.mode === 'preview' &&
    !hasBlockingDuplicates &&
    (hasStudentsSelected || hasResultsSelected || hasMetricsSelected)
  );

  const handlePreview = async () => {
    setError('');
    setNotice('');
    setResult(null);

    if (!files.length) return setError('Choose one or more files in the supported formats.');
    if (!requiredFieldsReady) {
      return setError('Session, Semester, Curriculum Type, College, Department, and Lecturer are required.');
    }

    const fd = new FormData();
    files.forEach((file) => fd.append('files', file));
    fd.append('session', session);
    fd.append('semester', String(semester));
    fd.append('curriculumType', curriculumType);
    fd.append('collegeId', collegeId);
    fd.append('departmentId', departmentId);
    fd.append('lecturerId', lecturerId);
    fd.append('mode', 'preview');

    try {
      const response = await analyzeOldMetrics({ body: fd }).unwrap();
      setAnalysis(response);
      setSelection(buildDefaultSelectionFromAnalysis(response));
      setActiveStep(1);
      setResult(null);
      setAnalyzeError('');
    } catch (err) {
      setAnalysis(null);
      setSelection(createSelectionTemplate());
      setActiveStep(0);
      setAnalyzeError(err?.data?.message || err?.error || 'Failed to analyze documents.');
    }
  };

  const handleCommit = async () => {
    setError('');
    setNotice('');
    setResult(null);

    if (!files.length) return setError('Choose one or more files in the supported formats.');
    if (!requiredFieldsReady) {
      return setError('Session, Semester, Curriculum Type, College, Department, and Lecturer are required.');
    }
    if (analysis?.mode !== 'preview') {
      return setError('Run the preview and confirm your selections before uploading.');
    }
    if (hasBlockingDuplicates) {
      return setError('Resolve duplicate entries highlighted in the preview before uploading.');
    }
    if (!canCommit) {
      return setError('Select at least one extraction option (students, course results, or metrics) before uploading.');
    }

    const fd = new FormData();
    files.forEach((file) => fd.append('files', file));
    fd.append('session', session);
    fd.append('semester', String(semester));
    fd.append('curriculumType', curriculumType);
    fd.append('collegeId', collegeId);
    fd.append('departmentId', departmentId);
    fd.append('lecturerId', lecturerId);
    fd.append('selection', JSON.stringify(selection));
    fd.append('mode', 'commit');

    try {
      const response = await uploadOldMetrics({ body: fd }).unwrap();
      setResult(response);
      setActiveStep(steps.length - 1);
    } catch (err) {
      setError(err?.data?.message || err?.error || 'Upload failed');
    }
  };

  const handleNext = () => {
    if (!analysis) {
      setError('Generate a preview before proceeding.');
      return;
    }
    setError('');
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setError('');
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const renderDetailsStep = () => (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Session (e.g. 2023/2024)"
          value={session}
          onChange={(e) => setSession(e.target.value)}
          fullWidth
          required
        />
        <TextField
          label="Semester"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          select
          fullWidth
          required
          SelectProps={{ displayEmpty: true }}
        >
          {semesters.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Curriculum Type"
          value={curriculumType}
          onChange={(e) => setCurriculumType(e.target.value)}
          select
          fullWidth
          required
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="" disabled>Select curriculum type</MenuItem>
          {curriculumOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="College"
          value={collegeId}
          onChange={(e) => setCollegeId(e.target.value)}
          select
          fullWidth
          required
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="" disabled>
            {colleges.length ? 'Select college' : 'No colleges found'}
          </MenuItem>
          {colleges.map((college) => (
            <MenuItem key={college.id} value={college.id}>{college.name}</MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Department"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          select
          fullWidth
          required
          disabled={!collegeId}
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="" disabled>
            {collegeId
              ? (departments.length ? 'Select department' : 'No departments found for this college')
              : 'Select a college first'}
          </MenuItem>
          {departments.map((dept) => (
            <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Lecturer"
          value={lecturerId}
          onChange={(e) => setLecturerId(e.target.value)}
          select
          fullWidth
          required
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="" disabled>
            {lecturers.length ? 'Select lecturer' : 'No lecturers found'}
          </MenuItem>
          {lecturers.map((lect) => (
            <MenuItem key={lect.id} value={lect.id}>{lect.label}</MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Button variant="contained" component="label">
          Choose file(s)
          <input
            type="file"
            hidden
            accept=".csv,text/csv,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,application/pdf"
            multiple
            onChange={handleFileChange}
          />
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" onClick={handlePreview} disabled={isAnalyzing}>Generate Preview</Button>
      </Stack>

      {filePreviews?.length > 0 && (
        <Box>
          <Typography variant="overline">Selected files (level inferred from file name)</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {filePreviews.map((f) => (
              <Chip key={f.name} label={`${f.name} • L${f.level}`} />
            ))}
          </Stack>
        </Box>
      )}

      {notice && <Alert severity="info">{notice}</Alert>}
      {analyzeError && <Alert severity="warning">{analyzeError}</Alert>}
      {isAnalyzing && <LinearProgress />}
    </Stack>
  );
  const renderStudentsStep = () => {
    if (!analysis) {
      return <Alert severity="info">Generate a preview to configure student extraction.</Alert>;
    }

    return (
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Global student options</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={selection.global.students ?? true}
                onChange={handleGlobalToggle('students')}
              />
            }
            label="Create missing students"
          />
        </Paper>

        {analysis.perFile.map((file) => {
          const fileSel = getFileSelection(file.file);
          const missing = file.missingStudents?.length || 0;
          return (
            <Paper key={file.file} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  {file.file} • Level: {file.level ?? '—'} • Students detected: {file.stats.students}
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(fileSel.students)}
                      onChange={handleFileToggle(file.file, 'students')}
                    />
                  }
                  label="Create missing students if not found"
                />
                <Typography variant="caption" color="text.secondary">
                  Missing students detected: {missing}
                </Typography>
                {missing > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {file.missingStudents.slice(0, 10).map((reg) => (
                      <Chip key={`${file.file}-missing-${reg}`} label={reg} size="small" />
                    ))}
                    {missing > 10 && (
                      <Chip label={`+${missing - 10} more`} size="small" />
                    )}
                  </Stack>
                )}
              </Stack>
            </Paper>
          );
        })}

        <Stack direction="row" justifyContent="space-between">
          <Button onClick={handleBack} disabled={activeStep === 0}>Back</Button>
          <Button variant="contained" onClick={handleNext}>Next</Button>
        </Stack>
      </Stack>
    );
  };

  const renderCourseStep = () => {
    if (!analysis) {
      return <Alert severity="info">Generate a preview to configure course extraction.</Alert>;
    }

    return (
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Global course options</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selection.global.includeResults ?? true}
                  onChange={handleGlobalToggle('includeResults')}
                />
              }
              label="Upload course results"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={selection.global.carryOvers ?? true}
                  onChange={handleGlobalToggle('carryOvers')}
                />
              }
              label="Include carry-over / other columns"
            />
          </Stack>
        </Paper>

        {analysis.perFile.map((file) => {
          const available = file.availableSelections || {};
          const fileSel = getFileSelection(file.file);
          const courseOptions = available?.results?.courseCodes || [];
          const previewHeaders = (file.preview?.headers || []).slice(0, 8);
          const previewRows = (file.preview?.rows || []).map((row) =>
            Array.isArray(row) ? row.slice(0, previewHeaders.length || 8) : []
          );
          const effectiveHeaders = previewHeaders.length
            ? previewHeaders
            : previewRows.length
              ? previewRows[0].map((_, idx) => `Column ${idx + 1}`)
              : [];

          return (
            <Paper key={file.file} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  {file.file} • Level: {file.level ?? '—'} • Students detected: {file.stats.students}
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(fileSel.includeResults)}
                      disabled={!courseOptions.length}
                      onChange={handleFileToggle(file.file, 'includeResults')}
                    />
                  }
                  label={`Upload course scores (${courseOptions.length} course${courseOptions.length === 1 ? '' : 's'})`}
                />

                {Boolean(fileSel.includeResults) && courseOptions.length > 0 && (
                  <Box sx={{ pl: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Select courses to extract:
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      {courseOptions.map((course) => (
                        <FormControlLabel
                          key={`${file.file}-${course.prefixedCode}`}
                          control={
                            <Checkbox
                              checked={fileSel.courses?.includes(course.prefixedCode) || false}
                              onChange={handleCourseToggle(file.file, course.prefixedCode)}
                            />
                          }
                          label={`${course.prefixedCode}${course.matched ? '' : ' (unmatched)'}`}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(fileSel.carryOvers)}
                      disabled={!available.carryOvers}
                      onChange={handleFileToggle(file.file, 'carryOvers')}
                    />
                  }
                  label="Include carry-over / others column"
                />

                {previewRows.length > 0 && effectiveHeaders.length > 0 && (
                  <Box sx={{ mt: 1, overflowX: 'auto' }}>
                    <Typography variant="caption" color="text.secondary">
                      Sample rows (scores preview):
                    </Typography>
                    <Box
                      component="table"
                      sx={{
                        mt: 0.5,
                        width: '100%',
                        borderCollapse: 'collapse',
                        '& th, & td': {
                          border: '1px solid',
                          borderColor: 'divider',
                          px: 1,
                          py: 0.5,
                          fontSize: '0.75rem',
                          textAlign: 'left',
                          whiteSpace: 'nowrap',
                        },
                        '& thead': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <thead>
                        <tr>
                          {effectiveHeaders.map((header, idx) => (
                            <th key={`${file.file}-results-header-${idx}`}>{header || `Column ${idx + 1}`}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, rowIdx) => (
                          <tr key={`${file.file}-results-row-${rowIdx}`}>
                            {effectiveHeaders.map((_, colIdx) => (
                              <td key={`${file.file}-results-cell-${rowIdx}-${colIdx}`}>
                                {row[colIdx] ?? ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Box>
                  </Box>
                )}

                {file.missingCourses?.length > 0 && (
                  <Alert severity="warning">
                    Unmatched courses: {file.missingCourses.length}. Verify course codes/prefixes.
                  </Alert>
                )}

                {file?.duplicates?.results?.length > 0 && (
                  <Alert severity="warning">
                    Duplicate course results detected in upload batch.
                  </Alert>
                )}
              </Stack>
            </Paper>
          );
        })}

        <Stack direction="row" justifyContent="space-between">
          <Button onClick={handleBack}>Back</Button>
          <Button variant="contained" onClick={handleNext}>Next</Button>
        </Stack>
      </Stack>
    );
  };

  const renderMetricsStep = () => {
    if (!analysis) {
      return <Alert severity="info">Generate a preview to configure metrics extraction.</Alert>;
    }

    return (
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selection.global.metrics ?? true}
                onChange={handleGlobalToggle('metrics')}
              />
            }
            label="Upload academic metrics"
          />
        </Paper>

        {analysis.perFile.map((file) => {
          const fileSel = getFileSelection(file.file);
          const previewHeaders = (file.preview?.headers || []).slice(0, 8);
          const previewRows = (file.preview?.rows || []).map((row) =>
            Array.isArray(row) ? row.slice(0, previewHeaders.length || 8) : []
          );
          const effectiveHeaders = previewHeaders.length
            ? previewHeaders
            : previewRows.length
              ? previewRows[0].map((_, idx) => `Column ${idx + 1}`)
              : [];
          const metricsSamples = Array.isArray(file.preview?.metricsSamples)
            ? file.preview.metricsSamples
            : [];

          return (
            <Paper key={file.file} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  {file.file} • Level: {file.level ?? '—'} • Students detected: {file.stats.students}
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(fileSel.metrics)}
                      onChange={handleFileToggle(file.file, 'metrics')}
                    />
                  }
                  label="Upload metrics for this file"
                />

                {previewRows.length > 0 && effectiveHeaders.length > 0 && (
                  <Box sx={{ mt: 1, overflowX: 'auto' }}>
                    <Typography variant="caption" color="text.secondary">
                      Sample rows (metrics preview):
                    </Typography>
                    <Box
                      component="table"
                      sx={{
                        mt: 0.5,
                        width: '100%',
                        borderCollapse: 'collapse',
                        '& th, & td': {
                          border: '1px solid',
                          borderColor: 'divider',
                          px: 1,
                          py: 0.5,
                          fontSize: '0.75rem',
                          textAlign: 'left',
                          whiteSpace: 'nowrap',
                        },
                        '& thead': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <thead>
                        <tr>
                          {effectiveHeaders.map((header, idx) => (
                            <th key={`${file.file}-metrics-header-${idx}`}>{header || `Column ${idx + 1}`}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, rowIdx) => (
                          <tr key={`${file.file}-metrics-row-${rowIdx}`}>
                            {effectiveHeaders.map((_, colIdx) => (
                              <td key={`${file.file}-metrics-cell-${rowIdx}-${colIdx}`}>
                                {row[colIdx] ?? ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Box>
                  </Box>
                )}

                {metricsSamples.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Sample metrics snapshots:
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 0.5 }}>
                      {metricsSamples.map((sample) => (
                        <Paper
                          key={`${file.file}-${sample.regNo}-metrics-sample`}
                          variant="outlined"
                          sx={{ p: 1, borderRadius: 1 }}
                        >
                          <Stack spacing={0.5}>
                            <Typography variant="body2" fontWeight={600}>
                              {sample.regNo} {sample.name ? `• ${sample.name}` : ''}
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              {Object.entries(sample.metrics || {}).map(([metricKey, metricValue]) => (
                                <Chip
                                  key={`${file.file}-${sample.regNo}-${metricKey}`}
                                  label={`${metricKey}: ${metricValue ?? ''}`}
                                  size="small"
                                />
                              ))}
                            </Stack>
```
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}

                {file?.duplicates?.metrics?.length > 0 && (
                  <Alert severity="warning">
                    Duplicate metrics detected in upload batch for this file.
                  </Alert>
                )}
              </Stack>
            </Paper>
          );
        })}

        <Stack direction="row" justifyContent="space-between">
          <Button onClick={handleBack}>Back</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCommit}
            disabled={!canCommit || isLoading}
          >
            {isLoading ? 'Uploading…' : 'Upload'}
          </Button>
        </Stack>
      </Stack>
    );
  };

  const renderCurrentStep = () => {
    switch (activeStep) {
      case 0:
        return renderDetailsStep();
      case 1:
        return renderStudentsStep();
      case 2:
        return renderCourseStep();
      case 3:
      default:
        return renderMetricsStep();
    }
  };

  const analysisSummaryAlert = analysis?.summary ? (
    <Alert severity={hasBlockingDuplicates ? 'warning' : 'info'}>
      Preview • Students: {analysis.summary.totalStudents || 0}. Duplicate metrics: {analysis.summary.metricsDuplicates || 0}. Duplicate results: {analysis.summary.resultsDuplicates || 0}.
    </Alert>
  ) : null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Upload Old Academic Metrics (Multiple)</Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ pb: 2 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={analysis && index < activeStep}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {renderCurrentStep()}
        {analysisSummaryAlert}
        {result && (
          <Alert severity={result?.summary?.metricsFailed || result?.summary?.resultsFailed ? 'warning' : 'success'}>
            {result.message}. Students: {result?.summary?.totalStudents || 0}. Metrics ✓ {result?.summary?.metricsSuccess || 0} / ✗ {result?.summary?.metricsFailed || 0}. Results ✓ {result?.summary?.resultsSuccess || 0} / ✗ {result?.summary?.resultsFailed || 0}
          </Alert>
        )}

        <Box>
          <Typography variant="overline">Supported Data</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            • Academic Metrics: Current TCC, TCE, TPE, GPA; Cumulative CCC, CCE, CPE, CGPA (with previous values).
            {'\n'}• Course Results: Course codes (prefixed with curriculum type), numeric scores (grades are ignored).
            {'\n'}• Students: Reg. No, surname, first name, middle name (DOCX/CSV).
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            DOCX/PDF templates should follow the official result sheet layout to auto-detect courses and scores.
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
