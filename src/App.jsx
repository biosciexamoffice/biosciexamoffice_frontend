import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import CssBaseline from '@mui/material/CssBaseline';
import AppRouter from './routes/RouterConfig';
import { fetchEnvironment } from './store';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchEnvironment());
  }, [dispatch]);

  return (
    <>
      <CssBaseline />
      <AppRouter />
    </>
  );
}

export default App;
