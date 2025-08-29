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
  Chip
} from '@mui/material';
import { School, CalendarToday, People } from '@mui/icons-material';
import { format } from 'date-fns';

const SessionList = ({ sessions, isLoading, onSessionSelect }) => {
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
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session._id} hover>
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
                    {session.isCurrent ? (
                      <Chip label="Current" color="success" size="small" />
                    ) : (
                      <Chip label="Past" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => onSessionSelect(session)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default SessionList;