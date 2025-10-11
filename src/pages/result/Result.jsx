import { useState, useEffect, useMemo } from "react";

// use the barrel you already have (works in your repo)
import {
  useGetAllResultsQuery,
  useGetSessionsQuery,
} from "../../store";

// Existing components
import ResultList from "./component/ResultList";
import EditResult from "./component/EditResult";
import ResultUploader from "./component/UploadResult";
import ResultComputation from "./component/ResultComputation";
import SearchResults from "./component/SearchResults";
import ResultDownloadTab from "./component/ResultDownloadTab";
import CreateResultForm from "./component/CreateResultForm";
import QuickCompute from "./component/QuickCompute"; // <-- NEW
import MetricsUploader from "./component/MetricsUploader";

// MUI
import {
  Typography, List, ListItemText, Drawer, ListItemButton, ListItemIcon,
  Toolbar, useTheme, useMediaQuery, IconButton, AppBar, CssBaseline,
  Badge, Box, Divider, Avatar, Stack, styled, Paper, Grid, Button,
  Chip, TextField, MenuItem, InputAdornment, Tabs, Tab, Card, CardActionArea
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Dashboard as DashboardIcon,
  ListAlt as ListAltIcon,
  Menu as MenuIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  Search as SearchIcon,
  FilterAlt as FilterAltIcon,
  ViewList as ViewListIcon,
  Apps as AppsIcon,
  TableView as TableViewIcon,
  Bolt as BoltIcon,
  TrendingUp as TrendingUpIcon,
  Tune as TuneIcon,
} from "@mui/icons-material";

const drawerWidth = 260;

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    right: -3,
    top: 13,
    border: `2px solid ${theme.palette.background.paper}`,
    padding: '0 4px',
  },
}));

function StatCard({ icon, label, value, hint }) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="overline" color="text.secondary">{label}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography>
          {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}

function QuickAction({ icon, title, sub, onClick, color = 'primary' }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea onClick={onClick} sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar variant="rounded" sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>
            {icon}
          </Avatar>
          <Box>
            <Typography fontWeight={700}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{sub}</Typography>
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

function ResultDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  // views: dashboard, list, compute, upload, search, download, create, quick
  const [view, setView] = useState(() => localStorage.getItem('rd_view') || "dashboard");
  useEffect(() => localStorage.setItem('rd_view', view), [view]);

  // sub-view for List: repository (tree) | cards | table
  const [listMode, setListMode] = useState(() => localStorage.getItem('rd_list_mode') || 'repository');
  useEffect(() => localStorage.setItem('rd_list_mode', listMode), [listMode]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  const { data: allResultsForDashboard = [], isLoading: isLoadingDashboard } = useGetAllResultsQuery();
  const { data: sessions = [] } = useGetSessionsQuery();

  // Derive course aggregates from results
  const coursesWithResults = useMemo(() => {
    if (!allResultsForDashboard?.length) return [];
    const resultMap = new Map();
    allResultsForDashboard.forEach(result => {
      if (result.course && result.course._id) {
        const key = `${result.level}-${result.department}-${result.session}-${result.semester}-${result.course._id}`;
        if (!resultMap.has(key)) {
          resultMap.set(key, {
            ...result.course,
            level: result.level,
            department: result.department,
            session: result.session,
            semester: result.semester,
            lecturer: result.lecturer,
            resultsCount: 0,
            lastUpdated: result.updatedAt || result.createdAt,
          });
        }
        const entry = resultMap.get(key);
        entry.resultsCount = (entry.resultsCount || 0) + 1;
        if (result.updatedAt && (!entry.lastUpdated || new Date(result.updatedAt) > new Date(entry.lastUpdated))) {
          entry.lastUpdated = result.updatedAt;
        }
      }
    });
    return Array.from(resultMap.values());
  }, [allResultsForDashboard]);

  // ---------- quick filters (for the repository/cards/table views)
  const [filters, setFilters] = useState({
    q: '',
    session: '',
    department: '',
    level: '',
    semester: '',
  });

  const levels = ['100','200','300','400'];

  const filteredCourses = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return coursesWithResults.filter(c => {
      if (filters.session && c.session !== filters.session) return false;
      if (filters.department && c.department !== filters.department) return false;
      if (filters.level && String(c.level) !== String(filters.level)) return false;
      if (filters.semester && String(c.semester) !== String(filters.semester)) return false;
      if (q) {
        const hay = `${c.code ?? ''} ${c.title ?? ''} ${c.lecturer?.surname ?? ''} ${c.department ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [coursesWithResults, filters]);

  // derive recent activity (top 6)
  const recentCourses = useMemo(() => {
    const arr = [...coursesWithResults];
    arr.sort((a,b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
    return arr.slice(0, 6);
  }, [coursesWithResults]);

  // stats
  const totalResults = allResultsForDashboard.length || 0;
  const totalCourses = coursesWithResults.length || 0;
  const avgPerCourse = totalCourses ? Math.round(totalResults / totalCourses) : 0;

  const handleEditClick = (result) => { setSelectedResult(result); setIsEditModalOpen(true); };
  const handleCloseEditModal = () => { setIsEditModalOpen(false); setSelectedResult(null); };
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // ---------- content router ----------
  const ListContent = (
    <>
      <Tabs
        value={listMode}
        onChange={(_, v) => setListMode(v)}
        sx={{ mb: 2 }}
      >
        <Tab value="repository" icon={<ViewListIcon />} iconPosition="start" label="Repository View" />
        <Tab value="cards" icon={<AppsIcon />} iconPosition="start" label="Cards View" />
        <Tab value="table" icon={<TableViewIcon />} iconPosition="start" label="Table View" />
      </Tabs>

      {listMode === 'repository' && (
        <ResultList
          courses={filteredCourses}
          allResults={allResultsForDashboard}
          isLoading={isLoadingDashboard}
          onEdit={handleEditClick}
        />
      )}

      {listMode === 'cards' && (
        <Grid container spacing={2}>
          {filteredCourses.map(course => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`${course._id}-${course.session}-${course.level}-${course.semester}`}>
              <Card variant="outlined">
                <CardActionArea onClick={() => setView('search')}>
                  <Box sx={{ p:2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Avatar variant="rounded" sx={{ width: 28, height: 28, bgcolor: 'primary.light', color: 'primary.main' }}>{(course.code || 'C')[0]}</Avatar>
                      <Typography fontWeight={700}>{course.code}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap title={course.title}>{course.title}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                      <Chip size="small" label={`${course.session}`} />
                      <Chip size="small" label={`L${course.level}`} />
                      <Chip size="small" label={`S${course.semester}`} />
                      <Chip size="small" label={`${course.resultsCount} results`} variant="outlined" />
                    </Stack>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
          {!filteredCourses.length && (
            <Box sx={{ width: '100%', textAlign: 'center', py: 6 }}>
              <Typography variant="h6">No courses match your filters.</Typography>
              <Typography color="text.secondary">Adjust filters to see more.</Typography>
            </Box>
          )}
        </Grid>
      )}

      {listMode === 'table' && (
        <SearchResults onEdit={handleEditClick} />
      )}
    </>
  );

  const renderContent = () => {
    switch (view) {
      case "list": return ListContent;
      case "compute": return <ResultComputation viewOnly />;
      case "upload": return <ResultUploader />;
      case "search": return <SearchResults onEdit={handleEditClick} />;
      case "download": return <ResultDownloadTab />;
      case "create": return <CreateResultForm />;
      case "quick": return <QuickCompute />; // <-- NEW
      case "uploadOld": return <MetricsUploader />;
      case "dashboard":
      default:
        return (
          <Stack spacing={2}>
            {/* stats + quick actions */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><StatCard icon={<DescriptionIcon />} label="Total Results" value={totalResults} /></Grid>
                  <Grid item xs={12} sm={4}><StatCard icon={<ListAltIcon />} label="Courses w/ Results" value={totalCourses} /></Grid>
                  <Grid item xs={12} sm={4}><StatCard icon={<TrendingUpIcon />} label="Avg / Course" value={avgPerCourse} /></Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} md={4}>
                <Grid container spacing={2}>
                  <Grid item xs={12}><QuickAction icon={<CloudUploadIcon />} title="Upload Results" sub="Import from CSV/Excel" onClick={() => setView('upload')} /></Grid>
                  <Grid item xs={6}><QuickAction icon={<AssessmentIcon />} title="Compute" sub="Generate metrics" onClick={() => setView('compute')} color="secondary" /></Grid>
                  <Grid item xs={6}><QuickAction icon={<SearchIcon />} title="Search" sub="Find any record" onClick={() => setView('search')} color="secondary" /></Grid>
                  <Grid item xs={6}><QuickAction icon={<TuneIcon />} title="Quick Compute" sub="Get + filter by GPA/CGPA" onClick={() => setView('quick')} color="secondary" /></Grid>
                  <Grid item xs={6}><QuickAction icon={<BoltIcon />} title="Create Result" sub="Enter a single record" onClick={() => setView('create')} /></Grid>
                </Grid>
              </Grid>
            </Grid>

            {/* recent activity */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">Recent Activity</Typography>
                <Button size="small" onClick={() => setView('list')}>Open Repository</Button>
              </Stack>
              <Grid container spacing={2}>
                {recentCourses.map(c => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={`${c._id}-${c.session}-${c.level}-${c.semester}`}>
                    <Card variant="outlined">
                      <CardActionArea onClick={() => setView('search')}>
                        <Box sx={{ p: 2 }}>
                          <Typography fontWeight={700}>{c.code} • {c.session}</Typography>
                          <Typography variant="body2" color="text.secondary" noWrap title={c.title}>{c.title}</Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                            <Chip size="small" label={`L${c.level}`} />
                            <Chip size="small" label={`S${c.semester}`} />
                            <Chip size="small" label={`${c.resultsCount} results`} variant="outlined" />
                          </Stack>
                        </Box>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
                {!recentCourses.length && (
                  <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">No recent changes yet.</Typography>
                  </Box>
                )}
              </Grid>
            </Paper>
          </Stack>
        );
    }
  };

  // drawer items
  const drawerItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard', badge: null },
    { text: 'Result Repository', icon: <ListAltIcon />, view: 'list', badge: allResultsForDashboard?.length || 0 },
    { text: 'Quick Compute', icon: <TuneIcon />, view: 'quick', badge: null }, // <-- NEW
    { text: 'Compute Results', icon: <AssessmentIcon />, view: 'compute', badge: null },
    { text: 'Upload Results', icon: <CloudUploadIcon />, view: 'upload', badge: null },
    { text: 'Create Result', icon: <BoltIcon />, view: 'create', badge: null },
    { text: 'Computed Results', icon: <SearchIcon />, view: 'search', badge: null },
    { text: 'Upload Old Metrics', icon: <CloudUploadIcon />, view: 'uploadOld', badge: null },
    { text: 'Download', icon: <TableViewIcon />, view: 'download', badge: null },
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', px: 2, py: 3, gap: 2, backgroundColor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>
        <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
          <SchoolIcon />
        </Avatar>
        <Box>
          <Typography variant="h6" noWrap>Result Manager</Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>Academic Records System</Typography>
        </Box>
      </Toolbar>

      <Divider />

      <List sx={{ p: 1, flex: 1 }}>
        {drawerItems.map((item) => (
          <ListItemButton
            key={item.text}
            onClick={() => { setView(item.view); if (isMobile) setMobileOpen(false); }}
            selected={view === item.view}
            sx={{
              borderRadius: 1, mb: 0.5,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.main,
                '&:hover': { backgroundColor: theme.palette.primary.light }
              }
            }}
          >
            <ListItemIcon sx={{ color: view === item.view ? theme.palette.primary.main : theme.palette.text.secondary, minWidth: '36px' }}>
              {item.badge ? (
                <StyledBadge badgeContent={item.badge} color="primary" max={999}>
                  {item.icon}
                </StyledBadge>
              ) : item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: view === item.view ? 600 : 'normal', fontSize: '0.9rem' }} />
          </ListItemButton>
        ))}
      </List>

      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Current Session: {sessions[0]?.sessionTitle || '—'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />

      {/* Mobile App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          display: { xs: 'block', md: 'none' },
          background: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: 'none',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </Typography>
          <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
            <SchoolIcon sx={{ fontSize: 16 }} />
          </Avatar>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box', width: drawerWidth, borderRight: 'none',
              boxShadow: theme.shadows[1], background: theme.palette.background.paper
            }
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          pt: { xs: 8, md: 3 },
          background: theme.palette.background.default,
          minHeight: '100vh'
        }}
      >
        {/* show the repository/search/dashboard quick filters UI — leave as-is in your app */}
        {/* render content */}
        {renderContent()}
      </Box>

      {/* Edit Modal */}
      {selectedResult && (
        <EditResult
          result={selectedResult}
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
        />
      )}
    </Box>
  );
}

export default ResultDashboard;
