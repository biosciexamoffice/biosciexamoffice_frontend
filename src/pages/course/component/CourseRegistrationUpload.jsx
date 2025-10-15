import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  CircularProgress,
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
import { idsMatch, normalizeId } from "../../../utills/normalizeId";

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
  COURSE_MISSING_INSTITUTION:
    "A course referenced in the upload is missing institution details. Backfill course metadata and retry.",
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

export default function CourseRegistrationUpload({
  colleges = [],
  programmes = [],
  isLoadingInstitutions = false,
}) {
  const [session, setSession] = useState("");
  const [semester, setSemester] = useState("");
  const [curriculumType, setCurriculumType] = useState("");
  const [files, setFiles] = useState([]);
  const [institution, setInstitution] = useState({
    collegeId: "",
    departmentId: "",
    programmeId: "",
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const [uploadCourseRegistrations, { isLoading, data, error, reset }] =
    useUploadCourseRegistrationsMutation();
  const { data: sessionsData = [] } = useGetSessionsQuery();

  useEffect(() => {
    if (!colleges.length) return;
    setInstitution((prev) => {
      const resolvedCollege =
        colleges.find((college) => college.id === prev.collegeId) || colleges[0];
      const departments = resolvedCollege.departments || [];
      const resolvedDepartment =
        departments.find((department) => department.id === prev.departmentId) ||
        departments[0] ||
        null;
      const programmesForDepartment = programmes.filter((programme) =>
        idsMatch(programme.departmentId, resolvedDepartment?.id)
      );
      const resolvedProgramme =
        programmesForDepartment.find((programme) => programme.id === prev.programmeId) ||
        programmesForDepartment[0] ||
        null;

      if (
        idsMatch(prev.collegeId, resolvedCollege.id) &&
        idsMatch(prev.departmentId, resolvedDepartment?.id) &&
        idsMatch(prev.programmeId, resolvedProgramme?.id)
      ) {
        return prev;
      }

      return {
        collegeId: normalizeId(resolvedCollege.id),
        departmentId: normalizeId(resolvedDepartment?.id),
        programmeId: normalizeId(resolvedProgramme?.id),
      };
    });
  }, [colleges, programmes]);

  const departmentOptions = useMemo(() => {
    const selectedCollege = colleges.find((college) => college.id === institution.collegeId);
    return selectedCollege?.departments || [];
  }, [colleges, institution.collegeId]);

  const programmeOptions = useMemo(() => {
    if (!institution.departmentId) {
      return programmes;
    }
    return programmes.filter((programme) =>
      idsMatch(programme.departmentId, institution.departmentId)
    );
  }, [programmes, institution.departmentId]);

  const selectedProgramme = useMemo(
    () => programmeOptions.find((programme) => programme.id === institution.programmeId) || null,
    [programmeOptions, institution.programmeId]
  );

  const institutionsUnavailable = !colleges.length || !programmes.length;

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
        session &&
          semester &&
          curriculumType &&
          files.length > 0 &&
          institution.collegeId &&
          institution.departmentId &&
          institution.programmeId &&
          !isLoading &&
          !isLoadingInstitutions &&
          !institutionsUnavailable
      ),
    [session, semester, curriculumType, files, institution, isLoading, isLoadingInstitutions, institutionsUnavailable]
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
        collegeId: institution.collegeId,
        departmentId: institution.departmentId,
        programmeId: institution.programmeId,
      }).unwrap();
      setSnackbar({
        open: true,
        message: "Upload completed successfully.",
        severity: "success",
      });
      setFiles([]);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.data?.message || "Failed to upload course registrations.",
        severity: "error",
      });
    }
  };

  const handleInstitutionChange = (event) => {
    const { name, value } = event.target;
    setInstitution((prev) => {
      if (name === "collegeId") {
        const nextCollege = colleges.find((college) => college.id === value);
        const departments = nextCollege?.departments || [];
        const nextDepartment = departments[0] || null;
        const programmesForDepartment = programmes.filter((programme) =>
          idsMatch(programme.departmentId, nextDepartment?.id)
        );
        const nextProgramme = programmesForDepartment[0] || null;

        return {
          collegeId: normalizeId(value),
          departmentId: normalizeId(nextDepartment?.id),
          programmeId: nextProgramme?.id || "",
        };
      }

      if (name === "departmentId") {
        const programmesForDepartment = programmes.filter((programme) =>
          idsMatch(programme.departmentId, value)
        );
        const nextProgramme = programmesForDepartment[0] || null;

        return {
          ...prev,
          departmentId: normalizeId(value),
          programmeId: nextProgramme?.id || "",
        };
      }

      return { ...prev, [name]: normalizeId(value) };
    });
  };

  const handleCloseSnackbar = (_, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          UAM Portal Course Registration Upload
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Upload PDF exam cards or CSV files to register students for courses. Provide the target
          session, semester, and curriculum, along with the institution context so registrations are
          attributed correctly.
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Institution selections determine which college, department, and programme the
          registrations are associated with. Programme type is inferred automatically from the
          selected programme.
        </Alert>

        {(!isLoadingInstitutions && (!colleges.length || !programmes.length)) && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No colleges or programmes are available. Configure institutional data before uploading
            registrations.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="College"
                name="collegeId"
                value={institution.collegeId}
                onChange={handleInstitutionChange}
                fullWidth
                required
                disabled={isLoadingInstitutions || institutionsUnavailable}
              >
                <MenuItem value="" disabled>
                  <em>Select College</em>
                </MenuItem>
                {colleges.map((college) => (
                  <MenuItem key={college.id} value={college.id}>
                    {college.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Department"
                name="departmentId"
                value={institution.departmentId}
                onChange={handleInstitutionChange}
                fullWidth
                required
                disabled={
                  isLoadingInstitutions ||
                  institutionsUnavailable ||
                  departmentOptions.length === 0
                }
              >
                <MenuItem value="" disabled>
                  <em>Select Department</em>
                </MenuItem>
                {departmentOptions.map((department) => (
                  <MenuItem key={department.id} value={department.id}>
                    {department.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Programme"
                name="programmeId"
                value={institution.programmeId}
                onChange={handleInstitutionChange}
                fullWidth
                required
                disabled={
                  isLoadingInstitutions ||
                  institutionsUnavailable ||
                  programmeOptions.length === 0
                }
              >
                <MenuItem value="" disabled>
                  <em>Select Programme</em>
                </MenuItem>
                {programmeOptions.map((programme) => (
                  <MenuItem key={programme.id} value={programme.id}>
                    {programme.name}
                  </MenuItem>
                ))}
******EOF
                {programmeOptions.map((programme) => (
                  <MenuItem key={programme.id} value={programme.id}>
                    {programme.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Programme Type"
                value={selectedProgramme?.degreeType || ""}
                fullWidth
                InputProps={{ readOnly: true }}
                helperText="Derived from selected programme"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Session"
                value={session}
                onChange={(event) => setSession(event.target.value)}
                fullWidth
                required
              >
                <MenuItem value="" disabled>
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
                label="Semester"
                value={semester}
                onChange={(event) => setSemester(event.target.value)}
                fullWidth
                required
              >
                <MenuItem value="" disabled>
                  <em>Select Semester</em>
                </MenuItem>
                {SEMESTERS.map((sem) => (
                  <MenuItem key={sem.value} value={sem.value}>
                    {sem.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Curriculum Type"
                value={curriculumType}
                onChange={(event) => setCurriculumType(event.target.value)}
                fullWidth
                required
              >
                <MenuItem value="" disabled>
                  <em>Select Curriculum Type</em>
                </MenuItem>
                {CURRICULUM_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Stack spacing={3}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{
                py: 2,
                borderStyle: "dashed",
                borderWidth: 2,
                "&:hover": {
                  borderStyle: "dashed",
                  borderWidth: 2,
                },
              }}
              disabled={isLoadingInstitutions || institutionsUnavailable}
            >
              {files.length
                ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
                : "Select PDF or CSV Files"}
              <input
                type="file"
                accept=".pdf,.csv,application/pdf,text/csv"
                multiple
                hidden
                onChange={onPickFiles}
              />
            </Button>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={!canSubmit}
              fullWidth
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
            >
              {isLoading ? "Uploading..." : "Upload Registrations"}
            </Button>
          </Stack>
        </form>

        {files.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Selected Files
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {files.map((file) => (
                <Chip
                  key={`${file.name}-${file.size}`}
                  label={file.name}
                  onDelete={() => removeFile(file)}
                  deleteIcon={<CloseIcon />}
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}

        {isLoading && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error?.data?.message || "Upload failed. Please try again."}
          </Alert>
        )}

        {summary && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Upload Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <StatCard
                  icon={InsertChartOutlinedIcon}
                  label="Total Files"
                  value={summary.totalFiles}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <StatCard
                  icon={InsertChartOutlinedIcon}
                  label="Succeeded"
                  value={summary.succeeded}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <StatCard
                  icon={WarningAmberIcon}
                  label="Failed"
                  value={summary.failed}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <StatCard
                  icon={PictureAsPdfIcon}
                  label="PDF Reports"
                  value={data?.files?.length || 0}
                />
              </Grid>
            </Grid>

            {data?.files?.length ? (
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>File</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Processed</TableCell>
                      <TableCell align="right">Created</TableCell>
                      <TableCell align="right">Duplicates</TableCell>
                      <TableCell>Errors</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.files.map((file) => {
                      const totals = file.details?.totals || {};
                      const processed = file.savedCount ?? totals.attemptedRegistrations ?? 0;
                      const created = file.createdCount ?? totals.successfulRegistrations ?? 0;
                      const duplicates = file.duplicateCount ?? totals.duplicateRegistrations ?? 0;
                      return (
                        <TableRow key={file.fileName}>
                          <TableCell>{file.fileName}</TableCell>
                          <TableCell>
                            <Chip
                              label={file.status === "succeeded" ? "Succeeded" : "Failed"}
                              color={file.status === "succeeded" ? "success" : "error"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">{processed}</TableCell>
                          <TableCell align="right">{created}</TableCell>
                          <TableCell align="right">{duplicates}</TableCell>
                          <TableCell>
                            {file.errors?.length
                              ? renderChipList(
                                  file.errors,
                                  { prefix: `${file.fileName}-error`, color: "error" }
                                )
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}

            {pdfReport && (
              <Paper sx={{ mt: 3, p: 2 }} variant="outlined">
                <Typography variant="subtitle1" fontWeight={600}>
                  PDF Exam Card Summary
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  College: {pdfDetails?.collegeName || colleges.find((c) => c.id === institution.collegeId)?.name || "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Department: {pdfDetails?.departmentName || departmentOptions.find((d) => d.id === institution.departmentId)?.name || "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Curriculum: {pdfDetails?.curriculumType || curriculumType || "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Programme: {pdfDetails?.programmeName || selectedProgramme?.name || "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Programme Type: {pdfDetails?.programmeType || selectedProgramme?.degreeType || "—"}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Levels:
                  </Typography>
                  {renderChipList(pdfDetails?.levels || [], { prefix: 'level' })}
                </Box>

                {pdfErrors.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {pdfErrors.map((errCode) => (
                      <Box key={errCode}>{formatError(errCode)}</Box>
                    ))}
                  </Alert>
                )}

                {pdfDetails?.courseStats?.length ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Course Code</TableCell>
                          <TableCell>Level</TableCell>
                          <TableCell align="right">Attempted</TableCell>
                          <TableCell align="right">Registered</TableCell>
                          <TableCell align="right">Duplicates</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pdfDetails.courseStats.map((stat) => (
                          <TableRow key={`${stat.course.code}-${stat.level}`}>
                            <TableCell>{stat.course.code}</TableCell>
                            <TableCell>{stat.level}</TableCell>
                            <TableCell align="right">{stat.attempted}</TableCell>
                            <TableCell align="right">{stat.createdCount}</TableCell>
                            <TableCell align="right">{stat.duplicateCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No course statistics available for the uploaded PDF.
                  </Typography>
                )}
              </Paper>
            )}
          </Box>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
