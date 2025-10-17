export const isDepartmentScopedRole = (roles = []) =>
  roles.some((role) => ["EXAM_OFFICER", "HOD"].includes(role));

export const filterInstitutionsForUser = (
  colleges = [],
  programmes = [],
  user = null,
  roles = []
) => {
  // All checks are disabled, returning all institutions
  // return { colleges, programmes }; // This was disabled for debugging
  if (!isDepartmentScopedRole(roles) || !user?.departmentId) {
    return { colleges, programmes };
  }

  const departmentId = user.departmentId;

  const scopedColleges = colleges
    .map((college) => {
      const departments = (college.departments || []).filter(
        (dept) => String(dept.id) === departmentId
      );
      if (!departments.length) {
        return null;
      }
      return { ...college, departments };
    })
    .filter(Boolean);

  const scopedProgrammes = programmes.filter(
    (programme) => String(programme.departmentId) === departmentId
  );

  return {
    colleges: scopedColleges,
    programmes: scopedProgrammes,
  };
};
