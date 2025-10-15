import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <Stack
      spacing={2}
      sx={{ minHeight: '60vh', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 3 }}
    >
      <Typography variant="h4" fontWeight={700}>Access Restricted</Typography>
      <Typography variant="body1" color="text.secondary">
        You do not have permission to view this page.
      </Typography>
      <Button variant="contained" onClick={() => navigate(-1)}>Go Back</Button>
    </Stack>
  );
};

export default Unauthorized;
