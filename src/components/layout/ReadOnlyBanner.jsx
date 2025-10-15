import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const ReadOnlyBanner = () => (
  <Alert severity="warning" sx={{ borderRadius: 0 }}>
    <Stack spacing={0.5}>
      <Typography variant="subtitle2" fontWeight={600}>
        Read-only mode
      </Typography>
      <Typography variant="body2">
        You are connected to the cloud replica. Data is up to date, but editing is disabled. Connect to the office network to make changes.
      </Typography>
    </Stack>
  </Alert>
);

export default ReadOnlyBanner;
