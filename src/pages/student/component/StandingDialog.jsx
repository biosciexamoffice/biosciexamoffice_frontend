import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close as CloseIcon, Upload as UploadIcon } from "@mui/icons-material";
import { useUpdateStudentStandingMutation, useGetSessionsQuery } from "../../../store";

const STANDING_OPTIONS = [
  { value: "goodstanding", label: "Good Standing" },
  { value: "deferred", label: "Deferred" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "readmitted", label: "Readmitted" },
];

const REQUIRE_EVIDENCE = new Set(["deferred", "withdrawn", "readmitted"]);
const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:10000";
const SEMESTER_OPTIONS = [
  { value: "first", label: "First Semester" },
  { value: "second", label: "Second Semester" },
  { value: "both", label: "Both Semesters" },
];

function StandingDialog({ student, open, onClose }) {
  const [standing, setStanding] = useState("goodstanding");
  const [documentNumber, setDocumentNumber] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [semester, setSemester] = useState("");
  const [remarks, setRemarks] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [localError, setLocalError] = useState("");
  const [feedback, setFeedback] = useState(null);

  const [updateStanding, { isLoading }] = useUpdateStudentStandingMutation();
  const { data: sessionsData, isFetching: isLoadingSessions } = useGetSessionsQuery();

  const requiresEvidence = REQUIRE_EVIDENCE.has(standing);

  const standingLabel = useMemo(() => {
    return STANDING_OPTIONS.find((option) => option.value === standing)?.label || "Good Standing";
  }, [standing]);

  useEffect(() => {
    if (!open || !student) {
      setStanding("goodstanding");
      setDocumentNumber("");
      setSelectedFile(null);
      setSessionId("");
      setSemester("");
      setRemarks("");
      setEffectiveDate("");
      setLocalError("");
      setFeedback(null);
      return;
    }

    setStanding(student.standing || "goodstanding");
    setDocumentNumber(student.standingEvidence?.documentNumber || "");
    setSelectedFile(null);
    setSessionId("");
    setSemester("");
    setRemarks("");
    setEffectiveDate("");
    setLocalError("");
    setFeedback(null);
  }, [open, student]);

  useEffect(() => {
    if (!requiresEvidence) {
      setSessionId("");
      setSemester("");
      setRemarks("");
      setEffectiveDate("");
    }
  }, [requiresEvidence]);

  const currentDocumentUrl = student?.standingEvidence?.documentPath
    ? `${API_BASE_URL}/${student.standingEvidence.documentPath.replace(/^\//, "")}`
    : null;

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setLocalError("Only PDF files are allowed.");
      setSelectedFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalError("File must be smaller than 5MB.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setLocalError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!student) return;

    setLocalError("");
    setFeedback(null);

    if (requiresEvidence && !sessionId) {
      setLocalError("Select the academic session for this standing.");
      return;
    }
    if (requiresEvidence && !semester) {
      setLocalError("Select the affected semester.");
      return;
    }

    const hasExistingDocument = Boolean(student.standingEvidence?.documentPath);
    const hasDocumentNumber = Boolean(documentNumber.trim());
    const hasUpload = Boolean(selectedFile);

    if (requiresEvidence && !hasExistingDocument && !hasDocumentNumber && !hasUpload) {
      setLocalError("Upload a PDF letter or provide a reference number for this standing.");
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
      await updateStanding({ id: student._id, formData }).unwrap();
      onClose(true);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.data?.error || "Failed to update standing.",
      });
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="sm" component="form" onSubmit={handleSubmit}>
      <DialogTitle>
        Edit Standing
        <IconButton
          aria-label="close"
          onClick={() => onClose(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {student && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {student.surname} {student.firstname}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reg. No: {student.regNo}
            </Typography>
          </Box>
        )}

        {feedback && (
          <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        <Stack spacing={2}>
          {localError && (
            <Alert severity="error" onClose={() => setLocalError("")}>
              {localError}
            </Alert>
          )}

          <FormControl>
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
              Select the appropriate standing for this student. {standingLabel} requires supporting evidence.
            </FormHelperText>
          </FormControl>

          <TextField
            label="Document Reference Number"
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
            placeholder="Optional reference or memo ID"
          />

          <Divider />

          {requiresEvidence && (
            <TextField
              select
              label="Academic Session"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              disabled={isLoadingSessions}
              helperText={
                isLoadingSessions
                  ? "Loading sessions..."
                  : "Select the session associated with this decision."
              }
            >
              <MenuItem value="" disabled>
                {isLoadingSessions ? "Loading..." : "Select session"}
              </MenuItem>
              {(sessionsData || []).map((session) => (
                <MenuItem key={session._id} value={session._id}>
                  {session.sessionTitle}
                </MenuItem>
              ))}
            </TextField>
          )}

          {requiresEvidence && (
            <TextField
              select
              label="Semester"
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
              helperText="Specify the semester affected by this action."
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
          )}

          {requiresEvidence && (
            <TextField
              label="Effective Date"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Leave empty to default to today's date."
            />
          )}

          {requiresEvidence && (
            <TextField
              label="Remarks / Notes"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              multiline
              minRows={2}
              placeholder="Provide context or memo reference..."
            />
          )}

          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
              {selectedFile ? "Change PDF" : "Upload PDF Letter"}
              <input hidden type="file" accept="application/pdf" onChange={handleFileChange} />
            </Button>
            {selectedFile && (
              <Typography variant="body2">
                {selectedFile.name}
              </Typography>
            )}
          </Stack>
          <FormHelperText>
            {requiresEvidence
              ? "Upload the Senate approval letter or provide a reference number."
              : "Optional supporting document (PDF, max 5MB)."}
          </FormHelperText>

          {currentDocumentUrl && !selectedFile && (
            <Typography variant="body2">
              Current document:&nbsp;
              <Link href={currentDocumentUrl} target="_blank" rel="noopener">
                {student.standingEvidence?.documentName || "View uploaded document"}
              </Link>
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default StandingDialog;
