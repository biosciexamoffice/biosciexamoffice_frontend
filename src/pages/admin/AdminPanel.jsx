import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetCollegesQuery,
  useCreateCollegeMutation,
  useCreateDepartmentMutation,
  useUpdateCollegeMutation,
  useDeleteCollegeMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useCreateProgrammeMutation,
  useGetProgrammesQuery,
  selectIsReadOnly,
} from '../../store';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import { idsMatch, normalizeId } from '../../utills/normalizeId';
import {
  DeleteForever as DeleteForeverIcon,
  School as SchoolIcon,
  Apartment as ApartmentIcon,
  Groups as GroupsIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EXAM_OFFICER', label: 'Exam Officer' },
  { value: 'COLLEGE_OFFICER', label: 'College Officer' },
  { value: 'HOD', label: 'Head of Department' },
  { value: 'DEAN', label: 'Dean of College' },
];

const TITLE_OPTIONS = ['Professor', 'Doctor', 'Mr', 'Mrs'];

const DEFAULT_FORM = {
  email: '',
  pfNo: '',
  password: '',
  roles: ['EXAM_OFFICER'],
  title: 'Mr',
  surname: '',
  firstname: '',
  middlename: '',
  collegeId: '',
  departmentId: '',
};

const AdminPanel = () => {
  const { data, isFetching, refetch } = useGetUsersQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const { data: collegesData, isLoading: isLoadingColleges } = useGetCollegesQuery();
  const [createCollege, { isLoading: isCreatingCollege }] = useCreateCollegeMutation();
  const [updateCollege, { isLoading: isUpdatingCollege }] = useUpdateCollegeMutation();
  const [deleteCollege, { isLoading: isDeletingCollege }] = useDeleteCollegeMutation();
  const [createDepartment, { isLoading: isCreatingDepartment }] = useCreateDepartmentMutation();
  const [updateDepartment, { isLoading: isUpdatingDepartment }] = useUpdateDepartmentMutation();
  const [deleteDepartment, { isLoading: isDeletingDepartment }] = useDeleteDepartmentMutation();
  const [createProgramme, { isLoading: isCreatingProgramme }] = useCreateProgrammeMutation();
  const { data: programmesData } = useGetProgrammesQuery();
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM }));
  const [collegeForm, setCollegeForm] = useState({ name: '', code: '', description: '' });
  const [departmentForm, setDepartmentForm] = useState({ collegeId: '', name: '', code: '', description: '' });
  const [programmeForm, setProgrammeForm] = useState({ collegeId: '', departmentId: '', name: '', degreeType: '', description: '' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [editCollegeId, setEditCollegeId] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [deleteCollegeDialog, setDeleteCollegeDialog] = useState({ open: false, id: null, name: '' });
  const [deleteDepartmentDialog, setDeleteDepartmentDialog] = useState({ open: false, id: null, name: '' });
  const [showTempPassword, setShowTempPassword] = useState(false);
  const readOnly = useSelector(selectIsReadOnly);

  const users = data?.users || [];
  const colleges = collegesData?.colleges || [];
  const programmes = programmesData?.programmes || [];
  const guardReadOnly = (message) => {
    if (!readOnly) return false;
    setFeedback({ type: 'warning', message: message || 'Action unavailable in read-only mode.' });
    return true;
  };

  useEffect(() => {
    if (!colleges.length) return;

    setDepartmentForm((prev) => {
      if (prev.collegeId && colleges.some((college) => idsMatch(college.id, prev.collegeId))) {
        return prev;
      }
      return { ...prev, collegeId: normalizeId(colleges[0].id) };
    });

    setForm((prev) => {
      const currentCollege = colleges.find((college) => college.id === prev.collegeId) || colleges[0];
      const departmentOptions = currentCollege.departments || [];
      const hasDepartment = departmentOptions.some((dept) => idsMatch(dept.id, prev.departmentId));
      const nextDepartmentId = hasDepartment ? prev.departmentId : normalizeId(departmentOptions[0]?.id || '');
      if (idsMatch(prev.collegeId, currentCollege.id) && idsMatch(prev.departmentId, nextDepartmentId)) {
        return prev;
      }
      return {
        ...prev,
        collegeId: normalizeId(currentCollege.id),
        departmentId: nextDepartmentId,
      };
    });
  }, [colleges]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'collegeId') {
      setForm((prev) => {
        const selectedCollege = colleges.find((college) => college.id === value);
        const nextDepartmentId = selectedCollege?.departments?.[0]?.id || '';
        return {
          ...prev,
          collegeId: normalizeId(value),
          departmentId: normalizeId(nextDepartmentId),
        };
      });
      return;
    }
    setForm((prev) => ({ ...prev, [name]: normalizeId(value) }));
  };

  const toggleRole = (role) => {
    setForm((prev) => {
      const hasRole = prev.roles.includes(role);
      if (hasRole) {
        return { ...prev, roles: prev.roles.filter((r) => r !== role) };
      }
      return { ...prev, roles: [...prev.roles, role] };
    });
  };

  const handleCollegeFormChange = (event) => {
    const { name, value } = event.target;
    setCollegeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepartmentFormChange = (event) => {
    const { name, value } = event.target;
    if (name === 'collegeId') {
      setDepartmentForm((prev) => ({ ...prev, collegeId: normalizeId(value) }));
      return;
    }
    setDepartmentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProgrammeFormChange = (event) => {
    const { name, value } = event.target;
    if (name === 'collegeId') {
      const selectedCollege = colleges.find((college) => college.id === value);
      const firstDepartment = selectedCollege?.departments?.[0]?.id || '';
      setProgrammeForm((prev) => ({
        ...prev,
        collegeId: normalizeId(value),
        departmentId: normalizeId(firstDepartment),
      }));
      return;
    }
    if (name === 'departmentId') {
      setProgrammeForm((prev) => ({ ...prev, departmentId: normalizeId(value) }));
      return;
    }
    setProgrammeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCollege = async (event) => {
    event.preventDefault();
    if (guardReadOnly('Cannot create colleges in read-only mode.')) {
      return;
    }
    if (!collegeForm.name.trim()) {
      setFeedback({ type: 'error', message: 'College name is required.' });
      return;
    }
    setFeedback({ type: '', message: '' });
    try {
      await createCollege({
        name: collegeForm.name.trim(),
        ...(collegeForm.code.trim() ? { code: collegeForm.code.trim() } : {}),
        ...(collegeForm.description.trim() ? { description: collegeForm.description.trim() } : {}),
      }).unwrap();
      setCollegeForm({ name: '', code: '', description: '' });
      setFeedback({ type: 'success', message: 'College created successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err?.data?.message || 'Unable to create college.' });
    }
  };

  const handleCreateDepartment = async (event) => {
    event.preventDefault();
    if (guardReadOnly('Cannot create departments in read-only mode.')) {
      return;
    }
    if (!departmentForm.collegeId) {
      setFeedback({ type: 'error', message: 'Select a college for the department.' });
      return;
    }
    if (!departmentForm.name.trim()) {
      setFeedback({ type: 'error', message: 'Department name is required.' });
      return;
    }
    setFeedback({ type: '', message: '' });
    try {
      await createDepartment({
        collegeId: departmentForm.collegeId,
        name: departmentForm.name.trim(),
        ...(departmentForm.code.trim() ? { code: departmentForm.code.trim() } : {}),
        ...(departmentForm.description.trim() ? { description: departmentForm.description.trim() } : {}),
      }).unwrap();
      setDepartmentForm((prev) => ({ ...prev, name: '', code: '', description: '' }));
      setFeedback({ type: 'success', message: 'Department created successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err?.data?.message || 'Unable to create department.' });
    }
  };

  const handleCreateProgramme = async (event) => {
    event.preventDefault();
    if (guardReadOnly('Cannot create programmes in read-only mode.')) {
      return;
    }
    if (!programmeForm.collegeId) {
      setFeedback({ type: 'error', message: 'Select a college for the programme.' });
      return;
    }
    if (!programmeForm.departmentId) {
      setFeedback({ type: 'error', message: 'Select a department for the programme.' });
      return;
    }
    if (!programmeForm.name.trim()) {
      setFeedback({ type: 'error', message: 'Programme name is required.' });
      return;
    }
    if (!programmeForm.degreeType.trim()) {
      setFeedback({ type: 'error', message: 'Degree type is required.' });
      return;
    }
    setFeedback({ type: '', message: '' });
    try {
      await createProgramme({
        collegeId: programmeForm.collegeId,
        departmentId: programmeForm.departmentId,
        name: programmeForm.name.trim(),
        degreeType: programmeForm.degreeType.trim(),
        ...(programmeForm.description.trim() ? { description: programmeForm.description.trim() } : {}),
      }).unwrap();
      setProgrammeForm((prev) => ({
        ...prev,
        name: '',
        degreeType: '',
        description: '',
      }));
      setFeedback({ type: 'success', message: 'Programme created successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err?.data?.message || 'Unable to create programme.' });
    }
  };

  const handleEditCollege = (college) => {
    setEditCollegeId(college.id);
    setCollegeForm({ name: college.name, code: college.code || '', description: college.description || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateCollege = async () => {
    if (!editCollegeId) return;
    if (guardReadOnly('Cannot update colleges in read-only mode.')) {
      return;
    }
    const trimmedName = collegeForm.name.trim();
    if (!trimmedName) {
      setFeedback({ type: 'error', message: 'College name is required.' });
      return;
    }
    setFeedback({ type: '', message: '' });
    try {
      const payload = {
        collegeId: editCollegeId,
        name: trimmedName,
        code: collegeForm.code.trim(),
        description: collegeForm.description.trim(),
      };
      await updateCollege({
        ...payload,
      }).unwrap();
      setEditCollegeId('');
      setCollegeForm({ name: '', code: '', description: '' });
      setFeedback({ type: 'success', message: 'College updated successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err?.data?.message || 'Unable to update college.' });
    }
  };

  const openDeleteCollegeDialog = (id, name) => {
    if (guardReadOnly('Cannot delete colleges in read-only mode.')) {
      return;
    }
    setDeleteCollegeDialog({ open: true, id, name });
  };

  const closeDeleteCollegeDialog = () => {
    setDeleteCollegeDialog({ open: false, id: null, name: '' });
  };

  const handleConfirmDeleteCollege = async () => {
    if (!deleteCollegeDialog.id) return;
    if (guardReadOnly('Cannot delete colleges in read-only mode.')) {
      return;
    }
    setFeedback({ type: '', message: '' });
    try {
      await deleteCollege(deleteCollegeDialog.id).unwrap();
      setFeedback({ type: 'success', message: 'College deleted successfully.' });
      closeDeleteCollegeDialog();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.data?.message || 'Unable to delete college.' });
    }
  };

  const handleEditDepartment = (department, collegeId) => {
    setEditDepartmentId(department.id);
    setDepartmentForm({
      collegeId: collegeId,
      name: department.name,
      code: department.code || '',
      description: department.description || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateDepartment = async () => {
    if (!editDepartmentId) return;
    if (guardReadOnly('Cannot update departments in read-only mode.')) {
      return;
    }
    if (!departmentForm.collegeId) {
      setFeedback({ type: 'error', message: 'Select a college for the department.' });
      return;
    }
    const trimmedName = departmentForm.name.trim();
    if (!trimmedName) {
      setFeedback({ type: 'error', message: 'Department name is required.' });
      return;
    }
    setFeedback({ type: '', message: '' });
    try {
      const payload = {
        departmentId: editDepartmentId,
        collegeId: departmentForm.collegeId,
        name: trimmedName,
        code: departmentForm.code.trim(),
        description: departmentForm.description.trim(),
      };
      await updateDepartment({
        ...payload,
      }).unwrap();
      setEditDepartmentId('');
      setDepartmentForm((prev) => ({ ...prev, name: '', code: '', description: '' }));
      setFeedback({ type: 'success', message: 'Department updated successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err?.data?.message || 'Unable to update department.' });
    }
  };

  const openDeleteDepartmentDialog = (id, name) => {
    if (guardReadOnly('Cannot delete departments in read-only mode.')) {
      return;
    }
    setDeleteDepartmentDialog({ open: true, id, name });
  };

  const closeDeleteDepartmentDialog = () => {
    setDeleteDepartmentDialog({ open: false, id: null, name: '' });
  };

  const handleConfirmDeleteDepartment = async () => {
    if (!deleteDepartmentDialog.id) return;
    if (guardReadOnly('Cannot delete departments in read-only mode.')) {
      return;
    }
    setFeedback({ type: '', message: '' });
    try {
      await deleteDepartment(deleteDepartmentDialog.id).unwrap();
      setFeedback({ type: 'success', message: 'Department deleted successfully.' });
      closeDeleteDepartmentDialog();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.data?.message || 'Unable to delete department.' });
    }
  };

  const renderRoleSelector = () => (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={600}>Assign Roles</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {ROLE_OPTIONS.map((role) => {
          const selected = form.roles.includes(role.value);
          return (
            <Chip
              key={role.value}
              label={role.label}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={!readOnly ? () => toggleRole(role.value) : undefined}
              onDelete={!readOnly && selected ? () => toggleRole(role.value) : undefined}
              deleteIcon={selected ? <CancelIcon /> : undefined}
              clickable={!readOnly}
              disabled={readOnly}
              sx={{ mb: 1 }}
            />
          );
        })}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Officer roles require a college. Heads of Department and Exam Officers also require a department.
      </Typography>
    </Stack>
  );

  const renderCollegeManager = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={700}>Colleges & Departments</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2} component="form" onSubmit={(event) => {
              event.preventDefault();
              if (editCollegeId) {
                handleUpdateCollege();
              } else {
                handleCreateCollege(event);
              }
            }}>
              <Typography variant="subtitle1" fontWeight={600}>{editCollegeId ? 'Edit College' : 'Create College'}</Typography>
              <TextField
                label="College Name"
                name="name"
                value={collegeForm.name}
                onChange={handleCollegeFormChange}
                required
                fullWidth
                disabled={readOnly || ((isCreatingCollege || isUpdatingCollege) && !editCollegeId)}
              />
              <TextField
                label="Code"
                name="code"
                value={collegeForm.code}
                onChange={handleCollegeFormChange}
                fullWidth
                placeholder="Optional"
                disabled={readOnly || ((isCreatingCollege || isUpdatingCollege) && !editCollegeId)}
              />
              <TextField
                label="Description"
                name="description"
                value={collegeForm.description}
                onChange={handleCollegeFormChange}
                fullWidth
                multiline
                minRows={2}
                placeholder="Optional"
                disabled={readOnly || ((isCreatingCollege || isUpdatingCollege) && !editCollegeId)}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={readOnly || isUpdatingCollege || (isCreatingCollege && !editCollegeId)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {editCollegeId ? (isUpdatingCollege ? 'Saving…' : 'Save Changes') : isCreatingCollege ? 'Creating…' : 'Create College'}
                </Button>
                {editCollegeId && (
                  <Button
                    variant="text"
                    color="secondary"
                    onClick={() => {
                      setEditCollegeId('');
                      setCollegeForm({ name: '', code: '', description: '' });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2} component="form" onSubmit={(event) => {
              event.preventDefault();
              if (editDepartmentId) {
                handleUpdateDepartment();
              } else {
                handleCreateDepartment(event);
              }
            }}>
              <Typography variant="subtitle1" fontWeight={600}>{editDepartmentId ? 'Edit Department' : 'Create Department'}</Typography>
              <TextField
                select
                label="College"
                name="collegeId"
                value={departmentForm.collegeId}
                onChange={handleDepartmentFormChange}
                required
                disabled={readOnly || isCreatingDepartment || isLoadingColleges || !colleges.length}
              >
                {isLoadingColleges && <MenuItem value="">Loading…</MenuItem>}
                {!isLoadingColleges && !colleges.length && <MenuItem value="">No colleges yet</MenuItem>}
                {colleges.map((college) => (
                  <MenuItem key={college.id} value={college.id}>{college.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Department Name"
                name="name"
                value={departmentForm.name}
                onChange={handleDepartmentFormChange}
                required
                disabled={readOnly || (isCreatingDepartment || isUpdatingDepartment) || !colleges.length}
              />
              <TextField
                label="Code"
                name="code"
                value={departmentForm.code}
                onChange={handleDepartmentFormChange}
                placeholder="Optional"
                disabled={readOnly || ((isCreatingDepartment || isUpdatingDepartment) && !editDepartmentId)}
              />
              <TextField
                label="Description"
                name="description"
                value={departmentForm.description}
                onChange={handleDepartmentFormChange}
                multiline
                minRows={2}
                placeholder="Optional"
                disabled={readOnly || ((isCreatingDepartment || isUpdatingDepartment) && !editDepartmentId)}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={readOnly || (isCreatingDepartment || isUpdatingDepartment) || !colleges.length}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {editDepartmentId ? (isUpdatingDepartment ? 'Saving…' : 'Save Changes') : isCreatingDepartment ? 'Creating…' : 'Create Department'}
                </Button>
                {editDepartmentId && (
                  <Button
                    variant="text"
                    color="secondary"
                    onClick={() => {
                      setEditDepartmentId('');
                      setDepartmentForm((prev) => ({ ...prev, name: '', code: '', description: '' }));
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" fontWeight={700}>Programmes</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2} component="form" onSubmit={handleCreateProgramme}>
              <Typography variant="subtitle1" fontWeight={600}>Create Programme</Typography>
              <TextField
                select
                label="College"
                name="collegeId"
                value={programmeForm.collegeId}
                onChange={handleProgrammeFormChange}
                required
                disabled={readOnly || isCreatingProgramme || isLoadingColleges || !colleges.length}
              >
                {isLoadingColleges && <MenuItem value="">Loading…</MenuItem>}
                {!isLoadingColleges && !colleges.length && <MenuItem value="">No colleges yet</MenuItem>}
                {colleges.map((college) => (
                  <MenuItem key={college.id} value={college.id}>{college.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Department"
                name="departmentId"
                value={programmeForm.departmentId}
                onChange={handleProgrammeFormChange}
                required
                disabled={readOnly || !programmeForm.collegeId || isCreatingProgramme}
              >
                {!programmeForm.collegeId && <MenuItem value="">Select a college first</MenuItem>}
                {programmeForm.collegeId &&
                  (colleges.find((college) => college.id === programmeForm.collegeId)?.departments || []).map((department) => (
                    <MenuItem key={department.id} value={department.id}>{department.name}</MenuItem>
                  ))}
              </TextField>
              <TextField
                label="Programme Name"
                name="name"
                value={programmeForm.name}
                onChange={handleProgrammeFormChange}
                required
                disabled={readOnly || isCreatingProgramme}
              />
              <TextField
                label="Degree Type"
                name="degreeType"
                value={programmeForm.degreeType}
                onChange={handleProgrammeFormChange}
                placeholder="e.g. B.Sc, B.Eng"
                required
                disabled={readOnly || isCreatingProgramme}
              />
              <TextField
                label="Description"
                name="description"
                value={programmeForm.description}
                onChange={handleProgrammeFormChange}
                multiline
                minRows={2}
                placeholder="Optional"
                disabled={readOnly || isCreatingProgramme}
              />
              <Button
                variant="contained"
                type="submit"
                disabled={readOnly || isCreatingProgramme}
                sx={{ alignSelf: 'flex-start' }}
              >
                {isCreatingProgramme ? 'Creating…' : 'Create Programme'}
              </Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Existing Programmes</Typography>
            {programmes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No programmes yet.</Typography>
            ) : (
              <Stack spacing={1} maxHeight={260} sx={{ overflowY: 'auto' }}>
                {programmes.map((programme) => (
                  <Paper key={programme.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>{programme.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {programme.degreeType} • {programme.departmentName || 'Department'} • {programme.collegeName || 'College'}
                    </Typography>
                    {programme.description && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {programme.description}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" fontWeight={600}>Current Structure</Typography>
      <Grid container spacing={2}>
        {colleges.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">No colleges created yet.</Typography>
          </Grid>
        )}
        {colleges.map((college) => (
          <Grid item xs={12} md={6} key={college.id}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <div>
                  <Typography variant="subtitle1" fontWeight={600}>{college.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {college.code ? `Code: ${college.code}` : 'No code'}
                  </Typography>
                </div>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Edit College">
                    <IconButton size="small" onClick={() => handleEditCollege(college)} disabled={readOnly}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete College">
                    <IconButton size="small" onClick={() => openDeleteCollegeDialog(college.id, college.name)} disabled={readOnly}>
                      <DeleteForeverIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
              <Divider />
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {(college.departments || []).map((dept) => (
                  <Stack key={dept.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ pl: 1 }}>
                    <Typography variant="body2">{dept.name}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit Department">
                        <IconButton size="small" onClick={() => handleEditDepartment(dept, college.id)} disabled={readOnly}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Department">
                        <IconButton size="small" onClick={() => openDeleteDepartmentDialog(dept.id, dept.name)} disabled={readOnly}>
                          <DeleteForeverIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                ))}
                {!college.departments?.length && (
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 1, pt: 1 }}>
                    No departments in this college yet.
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );

  const renderUserManager = () => (
    <Stack spacing={4}>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Typography variant="h6" fontWeight={700}>Create User</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  label="Title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  fullWidth
                >
                  {TITLE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Surname"
                  name="surname"
                  value={form.surname}
                  onChange={handleChange}
                  required
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showTempPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowTempPassword((prev) => !prev)}
                          edge="end"
                        >
                          {showTempPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Firstname"
                  name="firstname"
                  value={form.firstname}
                  onChange={handleChange}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Middlename"
                  name="middlename"
                  value={form.middlename}
                  onChange={handleChange}
                  fullWidth
                  placeholder="Optional"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  fullWidth
                  placeholder="user@example.com"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="PF Number"
                  name="pfNo"
                  value={form.pfNo}
                  onChange={handleChange}
                  fullWidth
                  placeholder="UAM/00001"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
              <TextField
                select
                label="College"
                name="collegeId"
                value={form.collegeId}
                onChange={handleChange}
                required={requiresCollegeSelection}
                fullWidth
                disabled={readOnly || isLoadingColleges || !colleges.length}
              >
                  {isLoadingColleges && <MenuItem value="">Loading…</MenuItem>}
                  {!isLoadingColleges && !colleges.length && <MenuItem value="">No colleges yet</MenuItem>}
                  {colleges.map((college) => (
                    <MenuItem key={college.id} value={college.id}>{college.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Department"
                name="departmentId"
                value={form.departmentId}
                onChange={handleChange}
                required={requiresDepartmentSelection}
                fullWidth
                disabled={readOnly || isLoadingColleges || !departmentOptions.length}
              >
                  {!departmentOptions.length && <MenuItem value="">No departments yet</MenuItem>}
                  {departmentOptions.map((department) => (
                    <MenuItem key={department.id} value={department.id}>{department.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Temporary Password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  fullWidth
                  type={showTempPassword ? 'text' : 'password'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showTempPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowTempPassword((prev) => !prev)}
                          edge="end"
                        >
                          {showTempPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            {renderRoleSelector()}
            <Button
              variant="contained"
              size="large"
              type="submit"
              disabled={isCreating || readOnly}
              sx={{ alignSelf: 'flex-start' }}
            >
              {isCreating ? 'Creating…' : 'Create User'}
            </Button>
          </Stack>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">User Directory</Typography>
          <Typography variant="caption" color="text.secondary">
            {sortedUsers.length} user{sortedUsers.length === 1 ? '' : 's'} total
          </Typography>
        </Stack>
        {isFetching ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Account / Profile</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{user.email || '—'}</Typography>
                    <Typography variant="body2" color="text.secondary">{user.pfNo || '—'}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {formatUserDisplayName(user)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[user.department, user.college].filter(Boolean).join(' • ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Select
                      multiple
                      size="small"
                      value={user.roles}
                      onChange={(event) => handleRoleChange(user.id, event.target.value)}
                      renderValue={(selected) => selected.join(', ')}
                      disabled={readOnly}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <MenuItem key={role.value} value={role.value}>
                          {role.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={user.status}
                      onChange={(event) => handleStatusChange(user.id, event.target.value)}
                      disabled={readOnly}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="disabled">Disabled</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                      {isUpdating && <CircularProgress size={20} />}
                      <Tooltip
                        title={
                          user.roles.includes('ADMIN')
                            ? 'Admin accounts cannot be deleted'
                            : 'Delete User'
                        }
                      >
                        <span>
                          <IconButton
                            color="error"
                            size="small"
                            disabled={user.roles.includes('ADMIN') || readOnly || (isDeleting && deleteTargetId === user.id)}
                            onClick={() => handleOpenDelete(user)}
                          >
                            {isDeleting && deleteTargetId === user.id ? (
                              <CircularProgress size={20} />
                            ) : (
                              <DeleteForeverIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {sortedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">No users yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (guardReadOnly('Cannot create users while in read-only mode.')) {
      return;
    }
    setFeedback({ type: '', message: '' });
    const requiresCollege = form.roles.some((role) => ['COLLEGE_OFFICER', 'DEAN', 'EXAM_OFFICER', 'HOD'].includes(role));
    const requiresDepartment = form.roles.some((role) => ['EXAM_OFFICER', 'HOD'].includes(role));

    if (requiresCollege && !form.collegeId) {
      setFeedback({ type: 'error', message: 'Select a college for this role.' });
      return;
    }

    if (requiresDepartment && !form.departmentId) {
      setFeedback({ type: 'error', message: 'Select a department for this role.' });
      return;
    }

    try {
      const payload = {
        ...form,
        collegeId: form.collegeId || undefined,
        departmentId: form.departmentId || undefined,
      };
      await createUser(payload).unwrap();
      setFeedback({ type: 'success', message: 'User created successfully.' });
      const firstCollege = colleges[0];
      const firstDepartment = firstCollege?.departments?.[0];
      setForm({
        ...DEFAULT_FORM,
        collegeId: firstCollege?.id || '',
        departmentId: firstDepartment?.id || '',
      });
      refetch();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.data?.message || 'Unable to create user.' });
    }
  };

  const handleStatusChange = async (userId, status) => {
    if (guardReadOnly('Cannot update user status in read-only mode.')) {
      return;
    }
    setFeedback({ type: '', message: '' });
    try {
      await updateUser({ userId, status }).unwrap();
      refetch();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.data?.message || 'Unable to update user.' });
    }
  };

  const handleRoleChange = async (userId, roles) => {
    if (guardReadOnly('Cannot update user roles in read-only mode.')) {
      return;
    }
    setFeedback({ type: '', message: '' });
    try {
      await updateUser({ userId, roles }).unwrap();
      refetch();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.data?.message || 'Unable to update user roles.' });
    }
  };

  const handleOpenDelete = (user) => {
    if (guardReadOnly('Cannot delete users in read-only mode.')) {
      return;
    }
    setDeleteDialog({ open: true, user });
  };

  const handleCloseDelete = () => {
    setDeleteDialog({ open: false, user: null });
    setDeleteTargetId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.user) return;
    if (guardReadOnly('Cannot delete users in read-only mode.')) {
      return;
    }
    setFeedback({ type: '', message: '' });
    const targetId = deleteDialog.user.id;
    setDeleteTargetId(targetId);
    try {
      await deleteUser(targetId).unwrap();
      setFeedback({ type: 'success', message: 'User deleted successfully.' });
      handleCloseDelete();
      refetch();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.data?.message || 'Unable to delete user.' });
      setDeleteTargetId(null);
    }
  };

  const sortedUsers = useMemo(() => (
    [...users].sort((a, b) => (a.email || a.pfNo || '').localeCompare(b.email || b.pfNo || ''))
  ), [users]);

  const selectedCollege = useMemo(
    () => colleges.find((college) => college.id === form.collegeId) || null,
    [colleges, form.collegeId]
  );
  const departmentOptions = selectedCollege?.departments || [];
  const requiresCollegeSelection = form.roles.some((role) => ['COLLEGE_OFFICER', 'DEAN', 'EXAM_OFFICER', 'HOD'].includes(role));
  const requiresDepartmentSelection = form.roles.some((role) => ['EXAM_OFFICER', 'HOD'].includes(role));
  const OFFICER_ROLE_KEYS = ['COLLEGE_OFFICER', 'DEAN', 'HOD', 'EXAM_OFFICER'];
  const [activeTab, setActiveTab] = useState('users');

  const totalUsers = users.length;
  const activeUsersCount = useMemo(
    () => users.filter((user) => user.status === 'active').length,
    [users]
  );
  const officerCount = useMemo(
    () => users.filter((user) => user.roles.some((role) => OFFICER_ROLE_KEYS.includes(role))).length,
    [users]
  );
  const totalColleges = colleges.length;
  const totalDepartments = useMemo(
    () => colleges.reduce((acc, college) => acc + (college.departments?.length || 0), 0),
    [colleges]
  );

  const summaryCards = useMemo(() => ([
    {
      key: 'users',
      label: 'Total Users',
      value: totalUsers,
      helper: `${activeUsersCount} active`,
      icon: <GroupsIcon color="primary" sx={{ fontSize: 28 }} />,
    },
    {
      key: 'officers',
      label: 'Officer Roles',
      value: officerCount,
      helper: 'Dean / HOD / Officer',
      icon: <SchoolIcon color="primary" sx={{ fontSize: 28 }} />,
    },
    {
      key: 'colleges',
      label: 'Colleges & Departments',
      value: `${totalColleges} / ${totalDepartments}`,
      helper: 'Colleges / Departments',
      icon: <ApartmentIcon color="primary" sx={{ fontSize: 28 }} />,
    },
  ]), [totalUsers, activeUsersCount, officerCount, totalColleges, totalDepartments]);

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
  };

  const formatUserDisplayName = (userRecord) => {
    if (!userRecord) return '—';
    const parts = [];
    if (userRecord.title) parts.push(userRecord.title);
    const name = [userRecord.firstname, userRecord.middlename, userRecord.surname]
      .filter(Boolean)
      .join(' ');
    if (name) parts.push(name);
    return parts.length ? parts.join(' ') : '—';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Admin Control Center</Typography>
          <Typography variant="body1" color="text.secondary">
            Manage institutions and approval officers from a single workspace.
          </Typography>
        </Box>
        {feedback.message && (
          <Alert severity={feedback.type === 'error' ? 'error' : feedback.type === 'warning' ? 'warning' : 'success'}>
            {feedback.message}
          </Alert>
        )}
        {readOnly && (
          <Alert severity="warning" variant="outlined">
            Editing is disabled while connected to the read-only replica. Switch to the office network to make changes.
          </Alert>
        )}
        <Grid container spacing={2}>
          {summaryCards.map((card) => (
            <Grid item xs={12} md={4} key={card.key}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {card.icon}
                    <div>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>{card.label}</Typography>
                      <Typography variant="h6" fontWeight={700}>{card.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{card.helper}</Typography>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab value="users" label="User Management" />
            <Tab value="institutions" label="Colleges & Departments" />
          </Tabs>
          <Box sx={{ mt: 2 }}>
            {activeTab === 'users' ? renderUserManager() : renderCollegeManager()}
          </Box>
        </Paper>
      </Stack>

      <Dialog open={deleteDialog.open} onClose={handleCloseDelete}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Are you sure you want to remove {formatUserDisplayName(deleteDialog.user)}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
            disabled={readOnly || (isDeleting && deleteTargetId === deleteDialog.user?.id)}
          >
            {isDeleting && deleteTargetId === deleteDialog.user?.id ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteCollegeDialog.open} onClose={closeDeleteCollegeDialog}>
        <DialogTitle>Delete College</DialogTitle>
        <DialogContent dividers>
            <Typography>
                Are you sure you want to delete the college "{deleteCollegeDialog.name}"?
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                This will also delete all associated departments and programmes. This action cannot be undone.
            </Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={closeDeleteCollegeDialog}>Cancel</Button>
            <Button
                color="error"
                variant="contained"
                onClick={handleConfirmDeleteCollege}
                disabled={readOnly || isDeletingCollege}
            >
                {isDeletingCollege ? 'Deleting...' : 'Delete'}
            </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDepartmentDialog.open} onClose={closeDeleteDepartmentDialog}>
          <DialogTitle>Delete Department</DialogTitle>
          <DialogContent dividers>
              <Typography>
                  Are you sure you want to delete the department "{deleteDepartmentDialog.name}"?
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                  This will also delete all associated programmes. This action cannot be undone.
              </Typography>
          </DialogContent>
          <DialogActions>
              <Button onClick={closeDeleteDepartmentDialog}>Cancel</Button>
              <Button
                  color="error"
                  variant="contained"
                  onClick={handleConfirmDeleteDepartment}
                  disabled={readOnly || isDeletingDepartment}
              >
                  {isDeletingDepartment ? 'Deleting...' : 'Delete'}
              </Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel;
