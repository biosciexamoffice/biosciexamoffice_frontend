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
} from "@mui/material";
import {
  ArrowBack,
  Groups,
  PersonAdd,
  ExpandLess,
  ExpandMore,
  CalendarToday,
  CheckCircle,
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
  isClosing = false,
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
        sx={{ mb: 2 }}
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
        {session.status !== "completed" && (
          <Button
            variant="contained"
            color="error"
            onClick={() => setConfirmCloseOpen(true)}
            startIcon={<CheckCircle />}
            disabled={isClosing}
          >
            {isClosing ? "Closing session..." : "End Session"}
          </Button>
        )}
      </Stack>

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
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Dean of College</Typography>
              <Typography variant="body1">
                {session.dean?.name} ({session.dean?.pfNo})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {session.dean?.department}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Head of Department</Typography>
              <Typography variant="body1">
                {session.hod?.name} ({session.hod?.pfNo})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {session.hod?.department}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Exam Officer</Typography>
              <Typography variant="body1">
                {session.eo?.name} ({session.eo?.pfNo})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {session.eo?.department}
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
              disabled={isClosing}
            >
              {isClosing ? "Processing..." : "End Session"}
            </Button>
          </DialogActions>
        </Dialog>
    </Box>
  );
};

export default SessionDetails;
