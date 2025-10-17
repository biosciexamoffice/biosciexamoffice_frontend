import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useCreateStudentMutation,
  useGetCollegesQuery,
  useGetProgrammesQuery,
} from '../../store';
import CreateStudent from './component/CreateStudent.jsx';
import { selectCurrentUser, selectCurrentRoles } from '../../store/features/authSlice.js';
import { filterInstitutionsForUser } from '../../utills/filterInstitutions.js';

const StudentManager = () => {
  const [view, setView] = useState('create'); // Default to create view
  const [createStudent, { isLoading: isCreating, error: createError }] = useCreateStudentMutation();

  const {
    data: collegesData,
    isLoading: isLoadingColleges,
    error: collegesError,
  } = useGetCollegesQuery();
  const {
    data: programmesData,
    isLoading: isLoadingProgrammes,
    error: programmesError,
  } = useGetProgrammesQuery();

  const colleges = useMemo(() => collegesData?.colleges || [], [collegesData]);
  const programmes = useMemo(() => programmesData?.programmes || [], [programmesData]);

  const user = useSelector(selectCurrentUser);
  const roles = useSelector(selectCurrentRoles);

  const { colleges: scopedColleges, programmes: scopedProgrammes } = useMemo(
    () => filterInstitutionsForUser(colleges, programmes, user, roles),
    [colleges, programmes, user, roles]
  );

  const extractErrorMessage = (error) => {
    if (!error) return null;
    if (typeof error === 'string') return error;
    if (error?.data?.message) return error.data.message;
    if (error?.data?.error) return error.data.error;
    if (error?.error) return error.error;
    return 'Unable to load institutional data.';
  };

  const institutionError = useMemo(() => {
    return extractErrorMessage(collegesError) || extractErrorMessage(programmesError);
  }, [collegesError, programmesError]);

  const handleCreateStudent = async (payload) => {
    await createStudent(payload).unwrap();
    // In a real app, you might switch to a list view or show a success message.
    // For now, we just let the component handle its own state reset.
  };

  if (view === 'create') {
    return (
      <CreateStudent
        onCreate={handleCreateStudent}
        isLoading={isCreating}
        error={createError?.data?.details || createError?.data?.message}
        colleges={scopedColleges}
        programmes={scopedProgrammes}
        isLoadingInstitutions={isLoadingColleges || isLoadingProgrammes}
        institutionError={institutionError}
      />
    );
  }

  // Add other views like 'list' or 'edit' here later
  return null;
};

export default StudentManager;