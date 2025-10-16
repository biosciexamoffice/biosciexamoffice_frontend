import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  responsiveFontSizes,
  GlobalStyles,
} from '@mui/material';

const STORAGE_KEY = 'examOffice-color-mode';

export const ColorModeContext = createContext({
  mode: 'light',
  toggleColorMode: () => {},
  setMode: () => {},
});

const buildTheme = (mode) => responsiveFontSizes(
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#0050b3',
        light: '#4d7ed8',
        dark: '#003980',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#00a67a',
        light: '#4dd6a3',
        dark: '#00724f',
        contrastText: '#ffffff',
      },
      background: {
        default: mode === 'light' ? '#f5f7fb' : '#111827',
        paper: mode === 'light' ? '#ffffff' : '#161f2d',
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(12px)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: '16px 16px 0 0',
            paddingTop: 8,
          },
        },
      },
    },
  }),
);

const getInitialMode = () => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

export default function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
    const root = document.documentElement;
    root.setAttribute('data-color-mode', mode);
  }, [mode]);

  const toggleColorMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const contextValue = useMemo(
    () => ({ mode, setMode, toggleColorMode }),
    [mode, toggleColorMode],
  );

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            'html, body, #root': {
              minHeight: '100%',
            },
            body: {
              backgroundColor: theme.palette.background.default,
              color: theme.palette.text.primary,
              margin: 0,
            },
            a: {
              color: 'inherit',
              textDecoration: 'none',
            },
            '*': {
              boxSizing: 'border-box',
            },
          }}
        />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

AppThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
