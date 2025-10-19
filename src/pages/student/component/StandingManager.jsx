import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  Upload as UploadIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import {
  useLazySearchStudentByRegNoQuery,
  useUpdateStudentStandingMutation,
  useGetSessionsQuery,
  useGetStandingRecordsQuery,
} from "../../../store";

const STANDING_OPTIONS = [
  { value: "goodstanding", label: "Good Standing" },
  { value: "deferred", label: "Deferred" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "readmitted", label: "Readmitted" },
];

const STANDING_NEEDS_EVIDENCE = new Set(["deferred", "withdrawn", "readmitted"]);

const STANDING_TABS = [
  { value: "deferred", label: "Deferred Students" },
  { value: "withdrawn", label: "Withdrawn Students" },
  { value: "readmitted", label: "Readmitted Students" },
];

const SEMESTER_OPTIONS = [
  { value: "first", label: "First Semester" },
  { value: "second", label: "Second Semester" },
  { value: "both", label: "Both Semesters" },
];

const SEMESTER_LABELS = {
  first: "First Semester",
  second: "Second Semester",
  both: "Both Semesters",
};

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:10000";

const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString();
};

function StandingManager() {
  const [searchRegNo, setSearchRegNo] = useState("");
  const [currentStudent, setCurrentStudent] = useState(null);
  const [standing, setStanding] = useState("goodstanding");
  const [documentNumber, setDocumentNumber] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [semester, setSemester] = useState("");
  const [remarks, setRemarks] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [fieldError, setFieldError] = useState("");

  const [activeStanding, setActiveStanding] = useState("deferred");
  const [sessionFilter, setSessionFilter] = useState("");
  const [regNoInput, setRegNoInput] = useState("");
  const [regNoFilter, setRegNoFilter] = useState("");

  const [triggerSearch, { isFetching: isSearching }] = useLazySearchStudentByRegNoQuery();
  const [updateStanding, { isLoading: isUpdating }] = useUpdateStudentStandingMutation();
  const { data: sessionsData, isFetching: isLoadingSessions } = useGetSessionsQuery();

  const standingRecordsQueryArgs = useMemo(() => {
    const params = { standing: activeStanding };
    if (sessionFilter) params.sessionId = sessionFilter;
    if (regNoFilter) params.regNo = regNoFilter;
    return params;
  }, [activeStanding, sessionFilter, regNoFilter]);

  const {
    data: standingRecordsData,
    isFetching: isFetchingRecords,
    refetch: refetchStandingRecords,
  } = useGetStandingRecordsQuery(standingRecordsQueryArgs);

  const sessions = sessionsData || [];
  const records = standingRecordsData?.records ?? [];
  const recordsTotal = standingRecordsData?.count ?? 0;

  useEffect(() => {
    if (!currentStudent) return;
    setStanding(currentStudent.standing || "goodstanding");
    setDocumentNumber(currentStudent.standingEvidence?.documentNumber || "");
    setSelectedFile(null);
    setSessionId("");
    setSemester("");
    setRemarks("");
    setEffectiveDate("");
  }, [currentStudent]);

  const standingLabel = useMemo(() => {
    return STANDING_OPTIONS.find((opt) => opt.value === standing)?.label || "Good Standing";
  }, [standing]);

  const requiresEvidence = STANDING_NEEDS_EVIDENCE.has(standing);

  useEffect(() => {
    if (!requiresEvidence) {
      setSessionId("");
      setSemester("");
      setRemarks("");
      setEffectiveDate("");
    }
  }, [requiresEvidence]);

  const handleSearch = async (event) => {
    event.preventDefault();
    setFeedback(null);
    setFieldError("");
    const cleanRegNo = searchRegNo.trim().toUpperCase();
    if (!cleanRegNo) {
      setFeedback({ type: "error", message: "Please enter a registration number." });
      setCurrentStudent(null);
      return;
    }

    try {
      const result = await triggerSearch(cleanRegNo).unwrap();
      setCurrentStudent(result);
    } catch (error) {
      setCurrentStudent(null);
      setFeedback({
        type: "error",
        message: error?.data?.error || "Student not found.",
      });
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setFieldError("Only PDF documents are supported.");
      setSelectedFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFieldError("Document must be 5MB or less.");
      setSelectedFile(null);
      return;
    }
    setFieldError("");
    setSelectedFile(file);
  };

  const clearFeedbackAfterDelay = () => {
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUpdateStanding = async () => {
    if (!currentStudent) return;
    setFeedback(null);
    setFieldError("");

    const hasExistingDocument = Boolean(currentStudent.standingEvidence?.documentPath);
    const hasDocumentNumber = Boolean(documentNumber.trim());
    const hasUpload = Boolean(selectedFile);

    if (requiresEvidence && !sessionId) {
      setFieldError("Select the academic session tied to this action.");
      return;
    }
    if (requiresEvidence && !semester) {
      setFieldError("Select the affected semester.");
      return;
    }

    if (requiresEvidence && !hasUpload && !hasDocumentNumber && !hasExistingDocument) {
      setFieldError("Upload a PDF document or provide a reference number for this standing.");
      return;
    }

    const formData = new FormData();
    formData.append("standing", standing);
    if (documentNumber.trim()) {
      formData.append("documentNumber", documentNumber.trim());
    }
    if (requiresEvidence) {
      formData.append("sessionId", sessionId);
      formData.append("semester", semester);
      if (remarks.trim()) {
        formData.append("remarks", remarks.trim());
      }
      if (effectiveDate) {
        formData.append("effectiveDate", effectiveDate);
      }
    }
    if (selectedFile) {
      formData.append("evidence", selectedFile);
    }

    try {
      const updatedStudent = await updateStanding({ id: currentStudent._id, formData }).unwrap();
      setCurrentStudent(updatedStudent);
      setSelectedFile(null);
      setFeedback({
        type: "success",
        message: "Standing updated successfully.",
      });
      clearFeedbackAfterDelay();
      refetchStandingRecords();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.data?.error || "Failed to update standing. Please try again.",
      });
    }
  };

  const standingDocumentUrl = currentStudent?.standingEvidence?.documentPath
    ? `${API_BASE_URL}/${currentStudent.standingEvidence.documentPath.replace(/^\//, "")}`
    : null;

  const handleTabChange = (_event, value) => {
    setActiveStanding(value);
    setSessionFilter("");
    setRegNoInput("");
    setRegNoFilter("");
  };

  const handleRecordSearch = (event) => {
    event.preventDefault();
    setRegNoFilter(regNoInput.trim().toUpperCase());
  };

  const handleResetFilters = () => {
    setSessionFilter("");
    setRegNoInput("");
    setRegNoFilter("");
  };

  const renderDocumentCell = (record) => {
    const evidence = record.updatedStandingEvidence || {};
    if (evidence.documentPath) {
      const absoluteUrl = `${API_BASE_URL}/${evidence.documentPath.replace(/^\//, "")}`;
      return (
        <Stack spacing={0.5}>
          <Button
            component="a"
            href={absoluteUrl}
            target="_blank"
            rel="noopener"
            variant="outlined"
            size="small"
          >
            {evidence.documentName || "View PDF"}
          </Button>
          {evidence.documentNumber && (
            <Typography variant="caption" color="text.secondary">
              Ref: {evidence.documentNumber}
            </Typography>
          )}
        </Stack>
      );
    }

    if (evidence.documentNumber) {
      return (
        <Typography variant="body2" color="text.secondary">
          Ref: {evidence.documentNumber}
        </Typography>
      );
    }

    return <Typography variant="body2" color="text.secondary">—</Typography>;
  };

  return (
    <Box component="section" sx={{ maxWidth: 1200, mx: "auto", display: "grid", gap: 3 }}>
      <Card component="form" onSubmit={handleSearch}>
        <CardHeader
          title="Standing Manager"
          subheader="Search for a student by registration number to review and update their standing."
        />
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={9}>
              <TextField
                label="Registration Number"
                placeholder="e.g. 21/12345/UE"
                fullWidth
                value={searchRegNo}
                onChange={(event) => setSearchRegNo(event.target.value.toUpperCase())}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSearching}
                startIcon={<SearchIcon />}
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {feedback && (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {currentStudent && (
        <Card>
          <CardHeader
            title={`${currentStudent.surname} ${currentStudent.firstname}`}
            subheader={`Reg No: ${currentStudent.regNo}`}
            action={
              <Chip
                label={standingLabel}
                color={standing === "goodstanding" ? "success" : "warning"}
                variant="outlined"
              />
            }
          />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              {fieldError && (
                <Alert severity="error" onClose={() => setFieldError("")}>
                  {fieldError}
                </Alert>
              )}

              <FormControl fullWidth>
                <TextField
                  select
                  label="Standing"
                  value={standing}
                  onChange={(event) => setStanding(event.target.value)}
                >
                  {STANDING_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <FormHelperText>
                  Status and standing affect academic processing; ensure evidence is provided where required.
                </FormHelperText>
              </FormControl>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Document Reference Number"
                    fullWidth
                    value={documentNumber}
                    onChange={(event) => setDocumentNumber(event.target.value)}
                    disabled={!requiresEvidence && !currentStudent.standingEvidence?.documentNumber}
                    helperText={
                      requiresEvidence
                        ? "Optional if a PDF letter is uploaded."
                        : "Add a reference to keep track of supporting documents."
                    }
                  />
                </Grid>
                {requiresEvidence && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Academic Session"
                      fullWidth
                      value={sessionId}
                      onChange={(event) => setSessionId(event.target.value)}
                      disabled={isLoadingSessions}
                      helperText={
                        isLoadingSessions
                          ? "Loading sessions..."
                          : "Select the session where this standing applies."
                      }
                    >
                      <MenuItem value="" disabled>
                        {isLoadingSessions ? "Loading..." : "Select session"}
                      </MenuItem>
                      {sessions.map((session) => (
                        <MenuItem key={session._id} value={session._id}>
                          {session.sessionTitle}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}
                {requiresEvidence && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Semester"
                      fullWidth
                      value={semester}
                      onChange={(event) => setSemester(event.target.value)}
                      helperText="Specify the semester affected by this decision."
                    >
                      <MenuItem value="" disabled>
                        Select semester
                      </MenuItem>
                      {SEMESTER_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}
                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<UploadIcon />}
                    >
                      {selectedFile ? "Change PDF" : "Upload PDF Letter"}
                      <input hidden type="file" accept="application/pdf" onChange={handleFileChange} />
                    </Button>
                    {selectedFile && (
                      <Tooltip title="Clear selected file">
                        <IconButton color="error" onClick={() => setSelectedFile(null)}>
                          <ClearIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  <FormHelperText>
                    {requiresEvidence
                      ? "Upload an approval/withdrawal letter (PDF, max 5MB) or provide a file reference."
                      : "Optional supporting letter (PDF, max 5MB)."}
                  </FormHelperText>

                  {selectedFile && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Selected: <strong>{selectedFile.name}</strong>
                    </Typography>
                  )}
                  {standingDocumentUrl && !selectedFile && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Current document:&nbsp;
                      <Link href={standingDocumentUrl} target="_blank" rel="noopener">
                        {currentStudent.standingEvidence?.documentName || "View PDF"}
                      </Link>
                    </Typography>
                  )}
                </Grid>
                {requiresEvidence && (
                  <Grid item xs={12}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Effective Date"
                          type="date"
                          fullWidth
                          value={effectiveDate}
                          onChange={(event) => setEffectiveDate(event.target.value)}
                          InputLabelProps={{ shrink: true }}
                          helperText="When does this decision take effect? Leave empty to use today's date."
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Remarks / Notes"
                          fullWidth
                          multiline
                          minRows={2}
                          value={remarks}
                          onChange={(event) => setRemarks(event.target.value)}
                          placeholder="Provide context, senate memo reference, etc."
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </Grid>

              <Box>
                <Button
                  variant="contained"
                  onClick={handleUpdateStanding}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving..." : "Save Standing"}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Standing Records"
          subheader="Review deferred, withdrawn, and readmitted students with supporting details."
        />
        <CardContent>
          <Tabs
            value={activeStanding}
            onChange={handleTabChange}
            sx={{ mb: 3 }}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {STANDING_TABS.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>

          <Stack
            component="form"
            onSubmit={handleRecordSearch}
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ mb: 3 }}
          >
            <TextField
              select
              label="Filter by Session"
              value={sessionFilter}
              onChange={(event) => setSessionFilter(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">
                {isLoadingSessions ? "Loading sessions..." : "All sessions"}
              </MenuItem>
              {sessions.map((session) => (
                <MenuItem key={session._id} value={session._id}>
                  {session.sessionTitle}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Search by Reg. No"
              placeholder="e.g. 21/12345/UE"
              value={regNoInput}
              onChange={(event) => setRegNoInput(event.target.value.toUpperCase())}
              sx={{ minWidth: 220 }}
            />

            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained">
                Apply
              </Button>
              <Button variant="text" onClick={handleResetFilters}>
                Reset
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Showing {records.length} of {recordsTotal} record{recordsTotal === 1 ? "" : "s"}
            </Typography>
            {isFetchingRecords && <CircularProgress size={20} />}
          </Stack>

          {records.length === 0 ? (
            <Alert severity="info">
              No {activeStanding} records found for the selected filters.
            </Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Reg. No</TableCell>
                  <TableCell>Session</TableCell>
                  <TableCell>Semester</TableCell>
                  <TableCell>Previous Standing</TableCell>
                  <TableCell>Changed By</TableCell>
                  <TableCell>Effective Date</TableCell>
                  <TableCell>Document</TableCell>
                  <TableCell>Remarks</TableCell>
                  <TableCell>Recorded On</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => {
                  const student = record.student || {};
                  const semesterLabel = SEMESTER_LABELS[record.semester] || record.semester;
                  return (
                    <TableRow key={record._id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2">
                            {[student.surname, student.firstname, student.middlename]
                              .filter(Boolean)
                              .join(" ")}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Level {student.level || "—"} · Status {(student.standing || "").toUpperCase()}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{student.regNo}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{record.sessionTitle || "—"}</Typography>
                        {record.session?.startDate && (
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(record.session.startDate)} - {formatDate(record.session.endDate)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={semesterLabel} size="small" />
                      </TableCell>
                      <TableCell>{(record.previousStanding || '—').toUpperCase()}</TableCell>
                      <TableCell>
                        {record.changedBy ? (
                          <Stack spacing={0.5}>
                            <Typography variant="body2">
                              {record.changedBy.pfNo || record.changedBy.email || '—'}
                            </Typography>
                            {Array.isArray(record.changedBy.roles) && record.changedBy.roles.length > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                {record.changedBy.roles.join(', ')}
                              </Typography>
                            )}
                          </Stack>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{formatDate(record.effectiveDate)}</TableCell>
                      <TableCell>{renderDocumentCell(record)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.remarks?.trim() ? record.remarks : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(record.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default StandingManager;
