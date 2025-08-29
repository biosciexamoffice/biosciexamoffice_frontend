import { useState, useEffect, useMemo } from "react";
import {
  useGetAllResultsQuery,
  useGetSessionsQuery,
} from "../../store/index";

// Existing components
import ResultDashboardSummary from "./component/ui/ResultDashboardSummary";
import ResultList from "./component/ResultList";
import EditResult from "./component/EditResult";
import ResultUploader from "./component/UploadResult";
import ResultComputation from "./component/ResultComputation";
import SearchResults from "./component/SearchResults";
import ResultDownloadTab from "./component/ResultDownloadTab";


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

  // views: dashboard, list, compute, upload, search
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
            lastUpdated: result.updatedAt || result.createdAt, // if available
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

  // ---------- quick filters (global, applied to list/search/dashboard cards)
  const [filters, setFilters] = useState({
    q: '',
    session: '',
    department: '',
    level: '',
    semester: '',
  });

  const sessionOptions = useMemo(() => {
    const s = new Set();
    coursesWithResults.forEach(c => s.add(c.session));
    return Array.from(s).sort((a,b) => {
      const ay = parseInt(String(a).slice(0,4),10);
      const by = parseInt(String(b).slice(0,4),10);
      if (!isNaN(ay) && !isNaN(by)) return by - ay;
      return String(a).localeCompare(String(b));
    });
  }, [coursesWithResults]);

  const deptOptions = useMemo(() => {
    const s = new Set();
    coursesWithResults.forEach(c => c.department && s.add(c.department));
    return Array.from(s).sort();
  }, [coursesWithResults]);

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

  // ---------- content router (passing filtered data)
  const ListContent = (
    <>
      {/* list mode switcher */}
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
      case "compute": return <ResultComputation />;
      case "upload": return <ResultUploader />;
      case "search": return <SearchResults onEdit={handleEditClick} />;
      case "download": return <ResultDownloadTab />;
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
    { text: 'Compute Results', icon: <AssessmentIcon />, view: 'compute', badge: null },
    { text: 'Upload Results', icon: <CloudUploadIcon />, view: 'upload', badge: null },
    { text: 'Search Results', icon: <SearchIcon />, view: 'search', badge: null },
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
          Current Session: {sessionOptions[0] || '—'}
        </Typography>
      </Box>
    </Box>
  );

  // quick filters toolbar (sticky)
  const QuickFilters = (
    <Paper
      variant="outlined"
      sx={{
        mb: 2, p: 1.5, borderRadius: 2, position: 'sticky', top: isMobile ? 56 : 0, zIndex: 1,
        backdropFilter: 'blur(6px)', backgroundColor: (t) => t.palette.background.paper,
      }}
    >
      <Grid container spacing={1.5} alignItems="center">
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth size="small" placeholder="Search course, title, lecturer, department…"
            value={filters.q}
            onChange={(e) => setFilters(s => ({ ...s, q: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterAltIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={6} md={2}>
          <TextField select fullWidth size="small" label="Session" value={filters.session} onChange={(e) => setFilters(s => ({ ...s, session: e.target.value }))}>
            <MenuItem value=""><em>Any</em></MenuItem>
            {sessions.map(s => <MenuItem key={s._id} value={s.sessionTitle}>{s.sessionTitle}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={6} md={2}>
          <TextField select fullWidth size="small" label="Department" value={filters.department} onChange={(e) => setFilters(s => ({ ...s, department: e.target.value }))}>
            <MenuItem value=""><em>Any</em></MenuItem>
            {deptOptions.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={6} md={2}>
          <TextField select fullWidth size="small" label="Level" value={filters.level} onChange={(e) => setFilters(s => ({ ...s, level: e.target.value }))}>
            <MenuItem value=""><em>Any</em></MenuItem>
            {levels.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={6} md={2}>
          <TextField select fullWidth size="small" label="Semester" value={filters.semester} onChange={(e) => setFilters(s => ({ ...s, semester: e.target.value }))}>
            <MenuItem value=""><em>Any</em></MenuItem>
            <MenuItem value="1">FIRST</MenuItem>
            <MenuItem value="2">SECOND</MenuItem>
          </TextField>
        </Grid>
      </Grid>
      {/* active filter chips */}
      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
        {filters.q && <Chip size="small" label={`Query: ${filters.q}`} onDelete={() => setFilters(s => ({ ...s, q: '' }))} />}
        {filters.session && <Chip size="small" label={`Session: ${filters.session}`} onDelete={() => setFilters(s => ({ ...s, session: '' }))} />}
        {filters.department && <Chip size="small" label={`Dept: ${filters.department}`} onDelete={() => setFilters(s => ({ ...s, department: '' }))} />}
        {filters.level && <Chip size="small" label={`Level: ${filters.level}`} onDelete={() => setFilters(s => ({ ...s, level: '' }))} />}
        {filters.semester && <Chip size="small" label={`Semester: ${filters.semester}`} onDelete={() => setFilters(s => ({ ...s, semester: '' }))} />}
      </Stack>
    </Paper>
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
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
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
          onClose={handleDrawerToggle}
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
        {/* quick filters shown for list + search + dashboard */}
        {['list','search','dashboard'].includes(view) && QuickFilters}
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
