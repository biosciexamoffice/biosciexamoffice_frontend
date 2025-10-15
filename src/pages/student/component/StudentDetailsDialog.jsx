import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  Upload as UploadIcon,
  DeleteOutline as DeleteIcon,
} from "@mui/icons-material";
import {
  useLazyGetStudentByIdQuery,
  useUpdateStudentPassportMutation,
  useDeleteStudentPassportMutation,
} from "../../../store";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/jpg", "image/webp"]);
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const infoRow = (label, value) => (
  <Stack spacing={0.5}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body1" fontWeight={600}>
      {value || "—"}
    </Typography>
  </Stack>
);

function StudentDetailsDialog({ studentId, open, onClose }) {
  const [student, setStudent] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [fileError, setFileError] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [fetchStudent, { isFetching, isError, error }] = useLazyGetStudentByIdQuery();
  const [updatePassport, { isLoading: isUploading }] = useUpdateStudentPassportMutation();
  const [deletePassport, { isLoading: isDeletingPassport }] = useDeleteStudentPassportMutation();

  useEffect(() => {
    if (open && studentId) {
      fetchStudent(studentId)
        .unwrap()
        .then(setStudent)
        .catch(() => {});
    } else {
      setStudent(null);
      setFeedback(null);
      setFileError("");
      setSelectedFileName("");
      setIsDeleteDialogOpen(false);
    }
  }, [open, studentId, fetchStudent]);

  const passportSrc = useMemo(() => {
    if (!student?.passport?.data) return null;
    const mime = student.passport.contentType || "image/jpeg";
    return `data:${mime};base64,${student.passport.data}`;
  }, [student]);

  const handleFileSelection = async (event) => {
    setFileError("");
    setFeedback(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      setFileError("Unsupported file type. Use JPG, PNG, or WEBP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileError("Image must be 2MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append("passport", file);
    setSelectedFileName(file.name);

    try {
      const updated = await updatePassport({ id: studentId, formData }).unwrap();
      setStudent(updated);
      setFeedback({ type: "success", message: "Passport updated successfully." });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.data?.error || "Failed to update passport. Try again.",
      });
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleOpenDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
  };

  const handleConfirmDeletePassport = async () => {
    if (!student?._id) return;
    setFeedback(null);
    setFileError("");

    try {
      const response = await deletePassport({ id: student._id }).unwrap();
      const updatedStudent = response?.student || response;
      setStudent(updatedStudent);
      setSelectedFileName("");
      setFeedback({
        type: "success",
        message: response?.message || "Passport deleted successfully.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.data?.error || "Failed to delete passport. Try again.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        Student Details
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: 280 }}>
        {feedback && (
          <Alert
            severity={feedback.type}
            sx={{ mb: 2 }}
            onClose={() => setFeedback(null)}
          >
            {feedback.message}
          </Alert>
        )}

        {isError && (
          <Alert severity="error">
            {error?.data?.error || "Unable to load student details."}
          </Alert>
        )}

        {isFetching && !student && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Skeleton variant="rectangular" height={220} />
            </Grid>
            <Grid item xs={12} md={8}>
              <Skeleton variant="text" height={32} />
              <Skeleton variant="text" height={32} />
              <Skeleton variant="text" height={32} />
            </Grid>
          </Grid>
        )}

        {student && !isFetching && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "3 / 4",
                  minHeight: 240,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  bgcolor: "background.default",
                }}
              >
                {passportSrc ? (
                  <Box
                    component="img"
                    src={passportSrc}
                    alt={`${student.firstname} passport`}
                    sx={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                    sx={{ position: "absolute", inset: 0 }}
                  >
                    <Typography variant="subtitle2" color="text.secondary">
                      Passport Not Uploaded
                    </Typography>
                  </Stack>
                )}
              </Box>

              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload Passport"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    hidden
                    onChange={handleFileSelection}
                  />
                </Button>
                {selectedFileName && (
                  <Typography variant="caption" color="text.secondary">
                    Selected: {selectedFileName}
                  </Typography>
                )}
                {fileError && (
                  <Alert severity="error" onClose={() => setFileError("")}>
                    {fileError}
                  </Alert>
                )}
                {student.passport?.updatedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Last Updated: {new Date(student.passport.updatedAt).toLocaleString()}
                  </Typography>
                )}
              </Stack>
              {(passportSrc || student?.passport?.hasPassport) && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleOpenDeleteDialog}
                  disabled={isDeletingPassport}
                  sx={{ mt: 2 }}
                >
                  {isDeletingPassport ? "Deleting..." : "Delete Passport"}
                </Button>
              )}
            </Grid>

            <Grid item xs={12} md={8}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    {student.surname} {student.firstname}{" "}
                    {student.middlename ? student.middlename : ""}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Registration No: {student.regNo}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Chip
                    label={`Status: ${(student.status || "Unknown").toUpperCase()}`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`Standing: ${
                      student.standing
                        ? student.standing.replace(/(^\w|standing)/gi, (match, offset) =>
                            offset === 0 ? match.toUpperCase() : match.toLowerCase()
                          )
                        : "Good Standing"
                    }`}
                    color="secondary"
                    variant="outlined"
                  />
                </Stack>

                <Divider />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    {infoRow("Level", student.level)}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {infoRow("College", student.college?.name)}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {infoRow("Department", student.department?.name)}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {infoRow("Programme", student.programme?.name)}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {infoRow("Programme Type", student.programme?.degreeType)}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {infoRow(
                      "Created",
                      new Date(student.createdAt).toLocaleDateString()
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {infoRow(
                      "Last Updated",
                      new Date(student.updatedAt).toLocaleDateString()
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {infoRow(
                      "Standing Evidence",
                      student.standingEvidence?.documentNumber ||
                        student.standingEvidence?.documentName ||
                        "—"
                    )}
                  </Grid>
                </Grid>
              </Stack>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Passport</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove the student&apos;s passport photo. Are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeletingPassport}>
            Cancel
          </Button>
          <Button
            color="error"
            onClick={handleConfirmDeletePassport}
            disabled={isDeletingPassport}
          >
            {isDeletingPassport ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default StudentDetailsDialog;
