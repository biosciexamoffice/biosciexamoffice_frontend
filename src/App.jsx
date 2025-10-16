import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import AppRouter from './routes/RouterConfig';
import { fetchEnvironment } from './store';
import AppThemeProvider from './theme/AppThemeProvider';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchEnvironment());
  }, [dispatch]);

  return (
    <AppThemeProvider>
      <AppRouter />
    </AppThemeProvider>
  );
}

export default App;
