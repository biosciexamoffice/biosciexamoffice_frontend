import { useEffect, useMemo, useRef, useState } from "react";
import { useUploadStudentsMutation } from "../../../store/index";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import { idsMatch, normalizeId } from "../../../utills/normalizeId";

function StudentUploader({ colleges = [], programmes = [], userDepartmentId = null }) {
  const theme = useTheme();
  const [uploadStudents, { isLoading, reset }] = useUploadStudentsMutation();
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [level, setLevel] = useState("");
  const [uploadStats, setUploadStats] = useState(null);
  const [failureReport, setFailureReport] = useState(null);
  const [showFailureDetails, setShowFailureDetails] = useState(true);
  const [showSuccessDetails, setShowSuccessDetails] = useState(true);
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [selectedDegreeType, setSelectedDegreeType] = useState("");

  const handleLevel = (event) => {
    setLevel(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      return;
    }
    if (!selectedCollegeId || !selectedDepartmentId || !selectedProgrammeId) {
      setFailureReport({
        message:
          "Select a college, department, and programme before uploading students.",
        stats: null,
        failed: [],
      });
      return;
    }

    reset();
    setUploadStats(null);
    setFailureReport(null);
    setShowFailureDetails(true);
    setShowSuccessDetails(true);

    const formData = new FormData();
    formData.append("level", level);
    formData.append("csvFile", file);
    formData.append("useDefaultInstitution", "true");
    formData.append("defaultCollegeId", selectedCollegeId);
    formData.append("defaultDepartmentId", selectedDepartmentId);
    formData.append("defaultProgrammeId", selectedProgrammeId);
    if (selectedDegreeType) {
      formData.append("defaultDegreeType", selectedDegreeType);
    }

    try {
      const response = await uploadStudents(formData).unwrap();
      setUploadStats({
        message: response.message,
        stats: response.stats || null,
        failed: response.failed || [],
      });
    } catch (err) {
      console.error("Upload failed:", err);
      const apiError = err?.data || {};
      setFailureReport({
        message:
          apiError.message ||
          "The upload could not be completed. Please review the issues below.",
        stats: apiError.stats || null,
        failed: apiError.failed || apiError.validationErrors || [],
      });
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setFileName(file ? file.name : "");
    setUploadStats(null);
    setFailureReport(null);
    reset();
  };

  useEffect(() => {
    if (!colleges.length) {
      setSelectedCollegeId("");
      setSelectedDepartmentId("");
      return;
    }

    setSelectedCollegeId((prev) => {
      if (prev && colleges.some((college) => idsMatch(college.id, prev))) {
        return prev;
      }
      if (userDepartmentId) {
        const owningCollege = colleges.find((college) =>
          (college.departments || []).some((dept) => idsMatch(dept.id, userDepartmentId))
        );
        if (owningCollege) {
          return normalizeId(owningCollege.id);
        }
      }
      return normalizeId(colleges[0].id);
    });
  }, [colleges, userDepartmentId]);

  useEffect(() => {
    if (!selectedCollegeId) {
      setSelectedDepartmentId("");
      return;
    }
    const college = colleges.find((item) => idsMatch(item.id, selectedCollegeId));
    const departments = college?.departments || [];

    const nextDepartmentId = (() => {
      if (!departments.length) {
        return "";
      }
      if (userDepartmentId) {
        const match = departments.find((dept) => idsMatch(dept.id, userDepartmentId));
        if (match) {
          return normalizeId(match.id);
        }
      }
      return normalizeId(departments[0].id);
    })();

    setSelectedDepartmentId((prev) =>
      nextDepartmentId && idsMatch(prev, nextDepartmentId) ? prev : nextDepartmentId
    );
  }, [selectedCollegeId, colleges, userDepartmentId]);

  const departmentOptions = useMemo(() => {
    const college = colleges.find((item) => idsMatch(item.id, selectedCollegeId));
    return college?.departments || [];
  }, [colleges, selectedCollegeId]);

  const programmeOptions = useMemo(() => {
    if (!selectedDepartmentId) {
      return [];
    }
    return programmes.filter(
      (programme) =>
        idsMatch(programme.departmentId, selectedDepartmentId) &&
        (
          !selectedCollegeId ||
          !programme.collegeId ||
          idsMatch(programme.collegeId, selectedCollegeId)
        )
    );
  }, [programmes, selectedDepartmentId, selectedCollegeId]);

  useEffect(() => {
    if (!programmeOptions.length) {
      setSelectedProgrammeId("");
      return;
    }

    setSelectedProgrammeId((prev) => {
      if (prev && programmeOptions.some((programme) => idsMatch(programme.id, prev))) {
        return prev;
      }
      return normalizeId(programmeOptions[0].id);
    });
  }, [programmeOptions]);

  const selectedProgramme = useMemo(
    () => programmeOptions.find((programme) => idsMatch(programme.id, selectedProgrammeId)) || null,
    [programmeOptions, selectedProgrammeId]
  );

  useEffect(() => {
    setSelectedDegreeType(selectedProgramme?.degreeType || "");
  }, [selectedProgramme]);

  const selectedCollege = useMemo(
    () => colleges.find((college) => idsMatch(college.id, selectedCollegeId)) || null,
    [colleges, selectedCollegeId],
  );

  const selectedDepartment = useMemo(
    () =>
      departmentOptions.find((department) => idsMatch(department.id, selectedDepartmentId)) || null,
    [departmentOptions, selectedDepartmentId],
  );

  const renderStatsChips = (stats) => {
    if (!stats) return null;

    return (
      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
        <Chip label={`Total: ${stats.total ?? 0}`} variant="outlined" />
        <Chip label={`Succeeded: ${stats.success ?? 0}`} color="success" variant="outlined" />
        <Chip label={`Failed: ${stats.failed ?? 0}`} color="error" variant="outlined" />
      </Stack>
    );
  };

  const renderFailedRecordsTable = (records = []) => {
    if (!records.length) return null;

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small" aria-label="failed records table">
          <TableHead>
            <TableRow>
              <TableCell>Row</TableCell>
              <TableCell>Registration No.</TableCell>
              <TableCell>Issue</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record, index) => {
              const key = `${record.regNo || "N/A"}-${record.line || index}`;
              const rowDetails = record.rowData
                ? Object.entries(record.rowData)
                    .filter(([, value]) => value)
                    .map(([field, value]) => `${field}: ${value}`)
                    .join(" • ")
                : null;

              return (
                <TableRow key={key} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell>{record.line ?? "—"}</TableCell>
                  <TableCell>{record.regNo || "N/A"}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="error.main">
                      {record.error || "Unknown error"}
                    </Typography>
                    {rowDetails && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {rowDetails}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Bulk Upload Students
        </Typography>
        <TextField
          required
          select
          label="Select Student Level"
          variant="filled"
          fullWidth
          value={level}
          onChange={handleLevel}
          name="level"
          sx={{ py: 1 }}
        >
          <MenuItem value="100">100</MenuItem>
          <MenuItem value="200">200</MenuItem>
          <MenuItem value="300">300</MenuItem>
          <MenuItem value="400">400</MenuItem>
          <MenuItem value="500">500</MenuItem>
        </TextField>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Select a CSV file containing student profiles to upload.
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          CSV header must include: <strong>regNo, surname, firstname, middlename</strong> (optional),
          <strong> college, department, programme, degreeType</strong>. Values must match existing
          institution records exactly.
        </Alert>

        {!colleges.length && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You do not have access to any colleges. Contact an administrator to configure your
            institution scope before uploading students.
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Institution Defaults
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These selections will be applied to every student in the CSV. Adjust them if you need to
            upload students for a different programme.
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              label="College"
              value={selectedCollegeId}
              onChange={(event) => setSelectedCollegeId(event.target.value)}
              disabled={!colleges.length}
              helperText={
                colleges.length
                  ? undefined
                  : "No colleges available for your account."
              }
              required
            >
              {colleges.map((college) => (
                <MenuItem key={college.id} value={normalizeId(college.id)}>
                  {college.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Department"
              value={selectedDepartmentId}
              onChange={(event) => setSelectedDepartmentId(event.target.value)}
              disabled={!departmentOptions.length}
              helperText={
                selectedCollegeId && !departmentOptions.length
                  ? "No departments found for the selected college."
                  : undefined
              }
              required
            >
              {departmentOptions.map((department) => (
                <MenuItem key={department.id} value={normalizeId(department.id)}>
                  {department.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Programme"
              value={selectedProgrammeId}
              onChange={(event) => setSelectedProgrammeId(event.target.value)}
              disabled={!programmeOptions.length}
              helperText={
                selectedDepartmentId && !programmeOptions.length
                  ? "No programmes found for the selected department."
                  : undefined
              }
              required
            >
              {programmeOptions.map((programme) => (
                <MenuItem key={programme.id} value={normalizeId(programme.id)}>
                  {programme.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Degree Type"
              value={selectedDegreeType}
              InputProps={{ readOnly: true }}
              helperText={
                selectedProgramme
                  ? "Derived from the selected programme."
                  : "Select a programme to see the degree type."
              }
            />
          </Stack>
        </Box>

        <form onSubmit={handleSubmit}>
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
            >
              {fileName ? (
                <>
                  <DescriptionIcon sx={{ mr: 1 }} />
                  {fileName}
                </>
              ) : (
                "Select CSV File"
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                required
                hidden
                onChange={handleFileChange}
              />
            </Button>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={
                isLoading ||
                !fileName ||
                !level ||
                !selectedCollegeId ||
                !selectedDepartmentId ||
                !selectedProgrammeId
              }
              fullWidth
              startIcon={
                isLoading ? <CircularProgress size={20} color="inherit" /> : null
              }
            >
              {isLoading ? "Uploading..." : "Upload Students"}
            </Button>
          </Stack>
        </form>

        {failureReport && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="error">
              <AlertTitle>Upload failed</AlertTitle>
              {failureReport.message}
              {renderStatsChips(failureReport.stats)}
            </Alert>
            {failureReport.failed.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={600}>
                    Failure Details
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setShowFailureDetails((prev) => !prev)}
                  >
                    {showFailureDetails ? "Hide details" : "Show details"}
                  </Button>
                </Stack>
                <Collapse in={showFailureDetails}>
                  {renderFailedRecordsTable(failureReport.failed)}
                </Collapse>
              </Box>
            )}
          </Box>
        )}

        {uploadStats && (
          <Paper
            elevation={2}
            sx={{
              mt: 3,
              p: 2,
              backgroundColor:
                theme.palette.mode === "dark"
                  ? theme.palette.background.paper
                  : "#f9f9f9",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Upload Summary
            </Typography>
            <Alert
              severity={uploadStats.failed.length ? "warning" : "success"}
              sx={{ mb: 2 }}
            >
              <AlertTitle>
                {uploadStats.failed.length ? "Completed with issues" : "All records imported"}
              </AlertTitle>
              {uploadStats.message || "Review the summary below."}
            </Alert>
            {renderStatsChips(uploadStats.stats)}
            <Divider sx={{ my: 2 }} />
            <List dense>
              <ListItem>
                <ListItemText primary={`Total Records Processed: ${uploadStats.stats?.total ?? 0}`} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={`Successfully Imported: ${uploadStats.stats?.success ?? 0}`}
                  sx={{ color: "success.dark" }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={`Failed to Import: ${uploadStats.stats?.failed ?? 0}`}
                  sx={{ color: "error.dark" }}
                />
              </ListItem>
            </List>

            {uploadStats.failed.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">
                    Failed Records Details
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setShowSuccessDetails((prev) => !prev)}
                  >
                    {showSuccessDetails ? "Hide details" : "Show details"}
                  </Button>
                </Stack>
                <Collapse in={showSuccessDetails}>
                  {renderFailedRecordsTable(uploadStats.failed)}
                </Collapse>
              </Box>
            )}
          </Paper>
        )}
      </Paper>
    </Box>
  );
}

export default StudentUploader;
