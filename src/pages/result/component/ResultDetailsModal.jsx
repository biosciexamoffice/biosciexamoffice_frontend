import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

function ResultDetailsModal({ result, open, onClose }) {
  console.log(result)
  if (!result) return null;

  const scores = [
    { name: 'Question 1', value: result.q1 ?? 'N/A' },
    { name: 'Question 2', value: result.q2 ?? 'N/A' },
    { name: 'Question 3', value: result.q3 ?? 'N/A' },
    { name: 'Question 4', value: result.q4 ?? 'N/A' },
    { name: 'Question 5', value: result.q5 ?? 'N/A' },
    { name: 'Question 6', value: result.q6 ?? 'N/A' },
    { name: 'Question 7', value: result.q7 ?? 'N/A' },
    { name: 'Question 8', value: result.q8 ?? 'N/A' },
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Result Details</Typography>
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, pb: 2 }}>
          <Typography variant="subtitle1">
            <strong>Student:</strong> {`${result.student?.surname || ''} ${result.student?.firstname || ''}`.trim()}
          </Typography>
          <Typography variant="subtitle1">
            <strong>Reg No:</strong> {result.student?.regNo}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Course:</strong> {result.course?.code} - {result.course?.title}
          </Typography>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Score/Grade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((score) => (
                <TableRow key={score.name}>
                  <TableCell component="th" scope="row">
                    {score.name}
                  </TableCell>
                  <TableCell align="right">{score.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ResultDetailsModal;