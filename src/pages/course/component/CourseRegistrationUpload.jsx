import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  InsertChartOutlined as InsertChartOutlinedIcon,
  PictureAsPdf as PictureAsPdfIcon,
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";
import {
  useGetSessionsQuery,
  useUploadCourseRegistrationsMutation,
} from "../../../store/index";

const SEMESTERS = [
  { value: "1", label: "First Semester" },
  { value: "2", label: "Second Semester" },
];

const CURRICULUM_TYPES = [
  { value: "BMASS", label: "BMASS" },
  { value: "CCMASS", label: "CCMASS" },
];

const ERROR_MESSAGES = {
  MISSING_STUDENTS: "Some students from the document were not found in the system.",
  COURSE_NOT_FOUND: "At least one course from the document was not found in the curriculum.",
  NO_VALID_COURSES_FOR_STUDENT:
    "A few students had no valid courses after applying the selected curriculum.",
  NO_REGISTRATIONS_CREATED: "No new registrations were created from this file.",
  NO_VALID_ENTRIES: "No student/course combinations were detected in the uploaded file.",
  PDF_PARSE_ERROR: "The document could not be read. Please ensure it is a valid PDF exam card export.",
  MISSING_STUDENT_LEVEL: "Some matched students are missing a level in their profile; update the student record and retry.",
};

function StatCard({ icon, label, value, helper, color = "primary" }) {
  const IconComponent = icon || InsertChartOutlinedIcon;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        height: "100%",
        border: (theme) => `1px solid ${theme.palette.divider}`,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: `${color}.light`,
            color: `${color}.dark`,
          }}
        >
          <IconComponent fontSize="small" />
        </Box>
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
      <Typography variant="h5">{value}</Typography>
      {helper && (
        <Typography variant="body2" color="text.secondary">
          {helper}
        </Typography>
      )}
    </Paper>
  );
}

function renderChipList(items = [], { color = "default", prefix = "chip" } = {}) {
  if (!items.length) return null;
  const maxVisible = 12;
  const visible = items.slice(0, maxVisible);

  return (
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
      {visible.map((item, idx) => (
        <Chip
          key={`${prefix}-${item}-${idx}`}
          label={item}
          color={color === "default" ? undefined : color}
          variant={color === "default" ? "outlined" : "filled"}
          size="small"
        />
      ))}
      {items.length > visible.length && (
        <Tooltip title={items.join(", ")}>
          <Chip label={`+${items.length - visible.length}`} size="small" variant="outlined" />
        </Tooltip>
      )}
    </Stack>
  );
}

const formatError = (code) => ERROR_MESSAGES[code] || code;

export default function CourseRegistrationUpload() {
  const [session, setSession] = useState("");
  const [semester, setSemester] = useState("");
  const [curriculumType, setCurriculumType] = useState("");
  const [files, setFiles] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const [uploadCourseRegistrations, { isLoading, data, error, reset }] =
    useUploadCourseRegistrationsMutation();
  const { data: sessionsData = [] } = useGetSessionsQuery();

  const summary = data?.summary ?? null;
  const pdfReport = useMemo(
    () => data?.files?.find((file) => file?.details?.type === "PDF_EXAM_CARD"),
    [data]
  );
  const pdfDetails = pdfReport?.details ?? null;
  const pdfErrors = pdfReport?.errors ?? [];

  const canSubmit = useMemo(
    () =>
      Boolean(
        session && semester && curriculumType && files.length > 0 && !isLoading
      ),
    [session, semester, curriculumType, files, isLoading]
  );

  const onPickFiles = (event) => {
    const picked = Array.from(event.target.files || []);
    if (!picked.length) return;

    const allowed = picked.filter((file) => {
      const lower = file.name.toLowerCase();
      return (
        file.type === "application/pdf" ||
        lower.endsWith(".pdf") ||
        file.type === "text/csv" ||
        file.type === "application/csv" ||
        lower.endsWith(".csv")
      );
    });

    if (allowed.length !== picked.length) {
      setSnackbar({
        open: true,
        message: "Unsupported files were skipped. Only PDF or CSV files are allowed.",
        severity: "warning",
      });
    }

    const map = new Map(files.map((file) => [`${file.name}-${file.size}`, file]));
    allowed.forEach((file) => map.set(`${file.name}-${file.size}`, file));
    setFiles(Array.from(map.values()));
    event.target.value = "";
  };

  const removeFile = (fileToRemove) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    reset();
    try {
      await uploadCourseRegistrations({
        session,
        semester,
        curriculumType,
        files,
      }).unwrap();
      setSnackbar({
        open: true,
        message: "Upload completed successfully.",
        severity: "success",
      });
      setFiles([]);
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Upload failed. Review the feedback below.",
        severity: "error",
      });
    }
  };

  const closeSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const renderDuplicateChips = (stat) => {
    if (!stat?.duplicateCount) {
      return (
        <Chip label="None" color="success" variant="outlined" size="small" sx={{ minWidth: 70 }} />
      );
    }
    const list = stat.duplicates || [];
    const preview = list.slice(0, 3);
    return (
      <Stack
        direction="row"
        spacing={0.5}
        useFlexGap
        flexWrap="wrap"
        justifyContent="flex-end"
      >
        {preview.map((regNo) => (
          <Chip key={`${stat.course.id}-${regNo}`} label={regNo} color="warning" size="small" />
        ))}
        {list.length > preview.length && (
          <Tooltip title={list.join(", ")}>
            <Chip label={`+${list.length - preview.length}`} color="warning" size="small" />
          </Tooltip>
        )}
      </Stack>
    );
  };

  const formatLevels = (levels) =>
    Array.isArray(levels) && levels.length ? levels.join(", ") : "Not detected";

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        UAM Portal Registration Import
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }} elevation={1}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Session"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                required
              >
                <MenuItem disabled value="">
                  <em>Select Session</em>
                </MenuItem>
                {sessionsData.map((s) => (
                  <MenuItem key={s._id} value={s.sessionTitle}>
                    {s.sessionTitle}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                required
              >
                <MenuItem disabled value="">
                  <em>Select Semester</em>
                </MenuItem>
                {SEMESTERS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Curriculum Type"
                value={curriculumType}
                onChange={(e) => setCurriculumType(e.target.value)}
                required
              >
                <MenuItem disabled value="">
                  <em>Select Curriculum</em>
                </MenuItem>
                {CURRICULUM_TYPES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
                sx={{ height: 56 }}
              >
                Choose PDF or CSV
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,application/pdf,.csv,text/csv,application/csv"
                  onChange={onPickFiles}
                />
              </Button>
            </Grid>

            <Grid item xs={12} md={8}>
              {files.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {files.map((file) => (
                    <Chip
                      key={`${file.name}-${file.size}`}
                      icon={file.name.toLowerCase().endsWith(".pdf") ? <PictureAsPdfIcon /> : undefined}
                      label={file.name}
                      onDelete={() => removeFile(file)}
                      deleteIcon={<CloseIcon />}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Upload the UAM exam card PDF to auto-extract registrations. CSV uploads remain
                  supported for legacy workflows.
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="contained" type="submit" disabled={!canSubmit} size="large">
                  {isLoading ? "Processing…" : "Start Upload"}
                </Button>
              </Stack>
            </Grid>

            {isLoading && (
              <Grid item xs={12}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1, textAlign: "center" }}>
                  Analysing {files.length} file(s)… please keep this tab open.
                </Typography>
              </Grid>
            )}

            {error && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {error?.data?.message ||
                    (typeof error?.data === "string"
                      ? error.data
                      : "Upload failed unexpectedly. Please try again.")}
                </Alert>
              </Grid>
            )}
          </Grid>
        </form>
      </Paper>

      {summary && (
        <Paper sx={{ p: 2, mb: 3 }} elevation={0}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Upload Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <StatCard label="Files Processed" value={summary.totalFiles ?? 0} />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard label="Successful" value={summary.succeeded ?? 0} color="success" />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard label="Failed" value={summary.failed ?? 0} color="warning" />
            </Grid>
          </Grid>
        </Paper>
      )}

      {pdfDetails && (
        <Paper sx={{ p: 2, mb: 3 }} elevation={0}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PictureAsPdfIcon color="primary" />
            <Typography variant="h6">Exam Card Insights</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Curriculum: <strong>{pdfDetails.curriculumType}</strong> — Session {pdfDetails.session} •
            Levels {formatLevels(pdfDetails.levels)} • Semester {pdfDetails.semester}
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={3}>
              <StatCard
                label="Students Detected"
                value={pdfDetails.uniqueStudents ?? 0}
                helper={`${pdfDetails.totalCards ?? pdfDetails.uniqueStudents ?? 0} card(s) scanned`}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard
                label="Registrations Attempted"
                value={pdfDetails.totals?.attemptedRegistrations ?? 0}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard
                label="Registered"
                value={pdfDetails.totals?.successfulRegistrations ?? 0}
                color="success"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard
                label="Duplicates"
                value={pdfDetails.totals?.duplicateRegistrations ?? 0}
                color="warning"
                helper="Already existed in course registration"
              />
            </Grid>
          </Grid>

          {pdfErrors.length > 0 && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {pdfErrors.map((code) => (
                <Alert
                  key={code}
                  severity={code === "NO_REGISTRATIONS_CREATED" ? "error" : "warning"}
                  icon={<WarningAmberIcon fontSize="inherit" />}
                >
                  {formatError(code)}
                </Alert>
              ))}
            </Stack>
          )}

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Course</TableCell>
                  <TableCell align="right">Attempted</TableCell>
                  <TableCell align="right">Registered</TableCell>
                  <TableCell align="right">Duplicates</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(pdfDetails.courseStats || []).map((stat) => (
                  <TableRow key={stat.course.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{stat.course.code}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.course.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Level {stat.level}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{stat.attempted}</TableCell>
                    <TableCell align="right">
                      <Typography
                        color={stat.createdCount ? "success.main" : "text.secondary"}
                        fontWeight={600}
                      >
                        {stat.createdCount}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{renderDuplicateChips(stat)}</TableCell>
                  </TableRow>
                ))}
                {(!pdfDetails.courseStats || pdfDetails.courseStats.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography align="center" color="text.secondary">
                        No courses matched this upload.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {!!(pdfDetails.missingStudentsCount || pdfDetails.missingCourseCount) && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              {pdfDetails.missingStudentsCount > 0 && (
                <Alert
                  severity="warning"
                  icon={<WarningAmberIcon fontSize="inherit" />}
                  sx={{ alignItems: "flex-start" }}
                >
                  <Typography fontWeight={600}>
                    Missing students ({pdfDetails.missingStudentsCount})
                  </Typography>
                  <Typography variant="body2">
                    These registration numbers were not found in the student directory.
                  </Typography>
                  {renderChipList(pdfDetails.missingStudents, {
                    color: "warning",
                    prefix: "missing-student",
                  })}
                </Alert>
              )}

              {pdfDetails.missingCourseCount > 0 && (
                <Alert
                  severity="warning"
                  icon={<WarningAmberIcon fontSize="inherit" />}
                  sx={{ alignItems: "flex-start" }}
                >
                  <Typography fontWeight={600}>
                    Missing courses ({pdfDetails.missingCourseCount})
                  </Typography>
                  <Typography variant="body2">
                    Update the curriculum with these course codes and re-run the upload if needed.
                  </Typography>
                  {renderChipList(
                    (pdfDetails.missingCourses || []).map((item) => item.expectedCode),
                    { color: "warning", prefix: "missing-course" }
                  )}
                </Alert>
              )}

              {pdfDetails.studentsWithoutValidCourses?.length > 0 && (
                <Alert
                  severity="info"
                  icon={<WarningAmberIcon fontSize="inherit" />}
                  sx={{ alignItems: "flex-start" }}
                >
                  <Typography fontWeight={600}>
                    Students without valid courses ({pdfDetails.studentsWithoutValidCourses.length})
                  </Typography>
                  <Typography variant="body2">
                    These students had cards but none of their courses matched the selected
                    curriculum.
                  </Typography>
                  {renderChipList(pdfDetails.studentsWithoutValidCourses, {
                    prefix: "student-no-course",
                  })}
                </Alert>
              )}
            </Stack>
          )}
        </Paper>
      )}

      {data?.files?.length > 0 && (
        <Paper sx={{ p: 2 }} elevation={0}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            File Breakdown
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Processed</TableCell>
                  <TableCell align="right">Created</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.files.map((file) => (
                  <TableRow key={file.fileName}>
                    <TableCell>{file.fileName}</TableCell>
                    <TableCell>
                      <Chip
                        label={file.status}
                        color={file.status === "succeeded" ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{file.savedCount}</TableCell>
                    <TableCell align="right">{file.createdCount}</TableCell>
                    <TableCell sx={{ maxWidth: 400 }}>
                      {file.errors?.length ? (
                        <Stack spacing={0.5}>
                          {file.errors.map((code) => (
                            <Typography key={code} variant="body2" color="error">
                              • {formatError(code)}
                            </Typography>
                          ))}
                        </Stack>
                      ) : (
                        <Stack spacing={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            {file.details?.type === "PDF_EXAM_CARD"
                              ? `Exam card processed • Levels: ${formatLevels(file.details?.levels)}`
                              : `CSV processed${file.details?.levels ? ` • Levels: ${formatLevels(file.details.levels)}` : ""}`}
                          </Typography>
                          {Array.isArray(file.details?.perLevel) && file.details.perLevel.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              {file.details.perLevel
                                .map((item) => `${item.level}: ${item.createdCount}/${item.attempted}`)
                                .join(" • ")}
                            </Typography>
                          )}
                          {Array.isArray(file.details?.duplicates) && file.details.duplicates.length > 0 && (
                            <>
                              <Typography variant="caption" color="text.secondary">
                                Duplicates ({file.details.duplicates.length})
                              </Typography>
                              {renderChipList(file.details.duplicates, {
                                prefix: `${file.fileName}-dup`,
                                color: "warning",
                              })}
                            </>
                          )}
                          {Array.isArray(file.details?.studentsMissingLevel) && file.details.studentsMissingLevel.length > 0 && (
                            <Alert
                              severity="warning"
                              icon={<WarningAmberIcon fontSize="inherit" />}
                              sx={{ alignItems: "flex-start" }}
                            >
                              Missing level for {file.details.studentsMissingLevel.length} student(s)
                              {renderChipList(file.details.studentsMissingLevel, {
                                prefix: `${file.fileName}-missing-level`,
                                color: "warning",
                              })}
                            </Alert>
                          )}
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
