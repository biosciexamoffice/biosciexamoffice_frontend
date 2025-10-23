import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  Chip,
  Stack,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  AlertTitle,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack,
  Groups,
  PersonAdd,
  ExpandLess,
  ExpandMore,
  CalendarToday,
  CheckCircle,
  WarningAmber,
} from "@mui/icons-material";
import { format } from "date-fns";

const defaultStats = {
  promoted: 0,
  promotedBreakdown: {
    hundredToTwo: 0,
    twoToThree: 0,
    threeToFour: 0,
  },
  graduated: 0,
  extraYear: 0,
  totalProcessed: 0,
};

const SessionDetails = ({
  session,
  onBack,
  onCreateAnother,
  onCloseSession,
  onEditSession,
  onDeleteSession,
  isClosing = false,
  isDeleting = false,
}) => {
  const [openDetails, setOpenDetails] = useState(true);
  const [openStats, setOpenStats] = useState(true);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const promotionStats = useMemo(() => {
    if (!session?.promotionStats) return defaultStats;
    return {
      ...defaultStats,
      ...session.promotionStats,
      promotedBreakdown: {
        ...defaultStats.promotedBreakdown,
        ...(session.promotionStats.promotedBreakdown || {}),
      },
    };
  }, [session]);

  const closeSummary = session?.closeSummary || null;
  const derivedStatus = session?.status || (session?.isCurrent ? 'active' : 'completed');
  const statusValue = String(derivedStatus).toLowerCase();
  const detailIsCompleted = statusValue === 'completed';
  const detailIsCurrent = Boolean(session?.isCurrent);
  const blockers = (closeSummary?.blockingReasons || []).filter(Boolean);
  const canClose = Boolean(closeSummary?.canClose);
  const metricsSummary =
    closeSummary?.summary?.metrics || {
      total: 0,
      approved: 0,
      pending: 0,
      bySemester: {},
    };
  const resultsSummary =
    closeSummary?.summary?.results || { total: 0, students: 0 };
  const studentsSummary =
    closeSummary?.summary?.students || { finalYearActive: 0, withMetrics: 0 };
  const metricsBySemester = metricsSummary.bySemester || {};
  const readinessSeverity = canClose ? "success" : "warning";
  const finalYearBaseline = Math.max(
    studentsSummary.finalYearActive || 0,
    studentsSummary.withMetrics || 0
  );
  const disableCloseButton =
    session?.status === "completed" || isClosing || !canClose;
  const primaryBlocker =
    blockers[0] || "Pending result computation for this session.";

  const checkedAtLabel = closeSummary?.checkedAt
    ? (() => {
        const dt = new Date(closeSummary.checkedAt);
        return Number.isNaN(dt.getTime()) ? null : format(dt, "PPpp");
      })()
    : null;

  const adjustedTotal =
    promotionStats.totalProcessed ||
    promotionStats.promoted +
      promotionStats.graduated +
      promotionStats.extraYear;

  const progressPercent = (value) => {
    if (!adjustedTotal) return "0.0";
    return ((value / adjustedTotal) * 100).toFixed(1);
  };

  if (!session) return null;

  const sessionId = session.id || session._id;

  const handleConfirmClose = async () => {
    if (!onCloseSession) {
      setConfirmCloseOpen(false);
      return;
    }
    if (!canClose) {
      setConfirmCloseOpen(false);
      return;
    }
    const success = await onCloseSession({
      sessionId,
      payload: { endDate: session.endDate },
    });
    if (success) {
      setConfirmCloseOpen(false);
    }
  };

  return (
    <Box>
      <IconButton onClick={onBack} sx={{ mb: 2 }}>
        <ArrowBack />
      </IconButton>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        useFlexGap
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ display: "flex", alignItems: "center" }}
        >
          {session.status === "completed" ? (
            <Chip label="Completed" color="default" sx={{ mr: 2 }} />
          ) : (
            <Chip label="Active" color="success" sx={{ mr: 2 }} />
          )}
          {session.sessionTitle}
        </Typography>
        {session.status !== "completed" && closeSummary && (
          <Chip
            label={canClose ? "Ready to close" : "Awaiting completion"}
            color={canClose ? "primary" : "warning"}
            variant={canClose ? "filled" : "outlined"}
            sx={{ fontWeight: 600 }}
          />
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            onClick={() => onEditSession?.(session)}
            disabled={detailIsCompleted || !onEditSession}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => onDeleteSession?.(session)}
            disabled={isDeleting || detailIsCompleted || detailIsCurrent || !onDeleteSession}
          >
            Delete
          </Button>
          {session.status !== "completed" && (
            <Tooltip
              arrow
              placement="top"
              title={
                canClose
                  ? "Close the session to promote students and update graduation statuses."
                  : primaryBlocker
              }
            >
              <span>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => setConfirmCloseOpen(true)}
                  startIcon={<CheckCircle />}
                  disabled={disableCloseButton}
                >
                  {isClosing ? "Closing session..." : "End Session"}
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {session.status !== "completed" && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Session Closure Readiness
          </Typography>
          {closeSummary ? (
            <Stack spacing={2}>
              <Alert
                severity={readinessSeverity}
                icon={
                  canClose ? (
                    <CheckCircle fontSize="small" />
                  ) : (
                    <WarningAmber fontSize="small" color="warning" />
                  )
                }
              >
                <AlertTitle>
                  {canClose
                    ? "All prerequisites satisfied"
                    : "Resolve before closing session"}
                </AlertTitle>
                {canClose
                  ? "You can safely end this session. Students will be promoted and graduating statuses updated."
                  : "Complete the following items before ending this session:"}
                {!canClose && blockers.length > 0 && (
                  <List dense sx={{ mt: 1, pb: 0 }}>
                    {blockers.map((reason) => (
                      <ListItem key={reason} sx={{ py: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <WarningAmber color="warning" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={reason} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      Results Logged
                    </Typography>
                    <Typography variant="h5">
                      {resultsSummary.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Students covered: {resultsSummary.students}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      Metrics Approved
                    </Typography>
                    <Typography variant="h5">
                      {metricsSummary.approved}/{metricsSummary.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pending: {metricsSummary.pending}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ mt: 1, flexWrap: "wrap" }}
                    >
                      {Object.entries(metricsBySemester).map(
                        ([sem, stats]) => (
                          <Chip
                            key={sem}
                            size="small"
                            label={`Sem ${sem}: ${stats.approved}/${stats.total}`}
                            color={
                              stats.pending && stats.pending > 0
                                ? "warning"
                                : "success"
                            }
                            variant={
                              stats.pending && stats.pending > 0
                                ? "outlined"
                                : "filled"
                            }
                          />
                        )
                      )}
                    </Stack>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      Final-year Coverage
                    </Typography>
                    <Typography variant="h5">
                      {studentsSummary.withMetrics}/
                      {finalYearBaseline || studentsSummary.withMetrics}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Students with computed metrics
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {checkedAtLabel && (
                <Typography variant="caption" color="text.secondary">
                  Checked {checkedAtLabel}
                </Typography>
              )}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Close readiness data will appear once results processing starts.
            </Typography>
          )}
        </Paper>
      )}

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <ListItem button onClick={() => setOpenDetails(!openDetails)}>
          <ListItemIcon>
            <CalendarToday color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Session Details"
            primaryTypographyProps={{ variant: "h6" }}
          />
          {openDetails ? <ExpandLess /> : <ExpandMore />}
        </ListItem>

        <Collapse in={openDetails} timeout="auto" unmountOnExit>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Start Date</Typography>
              <Typography variant="body1">
                {format(new Date(session.startDate), "PPPP")}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">End Date</Typography>
              <Typography variant="body1">
                {session.endDate
                  ? format(new Date(session.endDate), "PPPP")
                  : "Ongoing"}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom>
            Principal Officers
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2">Dean of College</Typography>
              <Typography variant="body1">
                {session.principalOfficers?.dean?.name} ({session.principalOfficers?.dean?.pfNo})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {session.principalOfficers?.dean?.department?.name}
              </Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2">Head of Department</Typography>
              <Typography variant="body1">
                {session.principalOfficers?.hod?.name} ({session.principalOfficers?.hod?.pfNo})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {session.principalOfficers?.hod?.department?.name}
              </Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2">Department Exam Officer</Typography>
              <Typography variant="body1">
                {session.principalOfficers?.examOfficer?.name} ({session.principalOfficers?.examOfficer?.pfNo})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {session.principalOfficers?.examOfficer?.department?.name}
              </Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2">College Exam Officer</Typography>
              <Typography variant="body1">
                {session.principalOfficers?.collegeExamOfficer?.name} ({session.principalOfficers?.collegeExamOfficer?.pfNo})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {session.principalOfficers?.collegeExamOfficer?.department?.name}
              </Typography>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <ListItem button onClick={() => setOpenStats(!openStats)}>
          <ListItemIcon>
            <Groups color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Student Progression"
            primaryTypographyProps={{ variant: "h6" }}
          />
          {openStats ? <ExpandLess /> : <ExpandMore />}
        </ListItem>

        <Collapse in={openStats} timeout="auto" unmountOnExit>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 2, border: "1px solid #e0e0e0", borderRadius: 2 }}
              >
                <Typography variant="subtitle2">Graduated</Typography>
                <Typography variant="h4" color="success.main">
                  {promotionStats.graduated}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {progressPercent(promotionStats.graduated)}% of processed
                  students
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 2, border: "1px solid #e0e0e0", borderRadius: 2 }}
              >
                <Typography variant="subtitle2">Promoted</Typography>
                <Typography variant="h4" color="info.main">
                  {promotionStats.promoted}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {progressPercent(promotionStats.promoted)}% of processed
                  students
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 2, border: "1px solid #e0e0e0", borderRadius: 2 }}
              >
                <Typography variant="subtitle2">Extra Year</Typography>
                <Typography variant="h4" color="warning.main">
                  {promotionStats.extraYear}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {progressPercent(promotionStats.extraYear)}% of processed
                  students
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Promotion Breakdown
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 2, border: "1px dashed #e0e0e0", borderRadius: 2 }}
              >
                <Typography variant="body2" color="text.secondary">
                  100 ➜ 200 Level
                </Typography>
                <Typography variant="h6">
                  {promotionStats.promotedBreakdown.hundredToTwo}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 2, border: "1px dashed #e0e0e0", borderRadius: 2 }}
              >
                <Typography variant="body2" color="text.secondary">
                  200 ➜ 300 Level
                </Typography>
                <Typography variant="h6">
                  {promotionStats.promotedBreakdown.twoToThree}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 2, border: "1px dashed #e0e0e0", borderRadius: 2 }}
              >
                <Typography variant="body2" color="text.secondary">
                  300 ➜ 400 Level
                </Typography>
                <Typography variant="h6">
                  {promotionStats.promotedBreakdown.threeToFour}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Total students processed: {adjustedTotal}
          </Typography>
        </Collapse>
      </Paper>

      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          sx={{ minWidth: 150 }}
          startIcon={<ArrowBack />}
        >
          Back to List
        </Button>
        <Button
          variant="contained"
          onClick={onCreateAnother}
          color="primary"
          sx={{ minWidth: 200 }}
          startIcon={<PersonAdd />}
        >
          Create New Session
        </Button>
      </Stack>

        <Dialog
          open={confirmCloseOpen}
          onClose={() => setConfirmCloseOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>End Session</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Ending this session will promote eligible students and update
              final year statuses. This action cannot be undone. Do you wish to
              continue?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setConfirmCloseOpen(false)}
              disabled={isClosing}
            >
              Cancel
            </Button>
            <Button
              color="error"
              onClick={handleConfirmClose}
              disabled={isClosing || !canClose}
            >
              {isClosing ? "Processing..." : "End Session"}
            </Button>
          </DialogActions>
        </Dialog>
    </Box>
  );
};

export default SessionDetails;
