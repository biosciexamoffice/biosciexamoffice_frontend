import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Button,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import { School, CalendarToday } from '@mui/icons-material';
import { format } from 'date-fns';

const SessionList = ({ sessions, isLoading, onSessionSelect, onEditSession, onDeleteSession, isDeleting }) => {
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <School sx={{ mr: 1 }} />
        Academic Sessions
      </Typography>
      
      {isLoading ? (
        <Box sx={{ p: 3 }}>
          <LinearProgress />
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Loading sessions...
          </Typography>
        </Box>
      ) : sessions.length === 0 ? (
        <Typography variant="body1" align="center" sx={{ p: 3 }}>
          No sessions found
        </Typography>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Session Title</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Closure Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => {
                const rawStatus =
                  session.status ||
                  (session.isCurrent ? "active" : "completed");
                const status = String(rawStatus).toLowerCase();
                const isActive = status === "active";
                const isCompleted = status === "completed";
                const closeSummary = session.closeSummary || null;
                const blockers = (closeSummary?.blockingReasons || []).filter(
                  Boolean
                );

                let closeLabel;
                let closeColor;
                let closeVariant;
                let closeTooltip;

                if (isCompleted) {
                  closeLabel = "Closed";
                  closeColor = "default";
                  closeVariant = "outlined";
                  closeTooltip = "Session already closed.";
                } else if (closeSummary?.canClose) {
                  closeLabel = "Ready to close";
                  closeColor = "primary";
                  closeVariant = "filled";
                  closeTooltip =
                    "All prerequisites satisfied. You can close this session.";
                } else if (closeSummary) {
                  closeLabel = "Awaiting tasks";
                  closeColor = "warning";
                  closeVariant = "outlined";
                  closeTooltip =
                    blockers[0] ||
                    "Complete outstanding result processing to close this session.";
                } else {
                  closeLabel = "Pending data";
                  closeColor = "default";
                  closeVariant = "outlined";
                  closeTooltip =
                    "Close readiness data will appear once results processing begins.";
                }

                return (
                  <TableRow key={session.id || session._id} hover>
                  <TableCell>
                    <Typography variant="subtitle1">{session.sessionTitle}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarToday sx={{ mr: 1, fontSize: '1rem' }} />
                      {format(new Date(session.startDate), 'MMM yyyy')} - 
                      {session.endDate ? ` ${format(new Date(session.endDate), 'MMM yyyy')}` : ' Present'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isActive ? "Active" : "Completed"}
                      color={isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={closeTooltip} arrow placement="top">
                      <Chip
                        label={closeLabel}
                        color={closeColor}
                        variant={closeVariant}
                        size="small"
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => onSessionSelect(session)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => onEditSession?.(session)}
                        disabled={isCompleted || !onEditSession}
                      >
                        Edit
                      </Button>
                      <Tooltip
                        title={session.isCurrent ? 'Cannot delete the current session.' : isCompleted ? 'Completed sessions cannot be deleted.' : 'Delete session'}
                        arrow
                      >
                        <span>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            disabled={isDeleting || session.isCurrent || isCompleted || !onDeleteSession}
                            onClick={() => onDeleteSession?.(session)}
                          >
                            Delete
                          </Button>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default SessionList;
