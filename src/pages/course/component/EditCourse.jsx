import { useEffect, useMemo, useState } from "react";
import { useUpdateCourseMutation } from "../../../store/index";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Box,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { idsMatch, normalizeId } from "../../../utills/normalizeId";

const LEVEL_OPTIONS = ["100", "200", "300", "400", "500"];
const SEMESTER_OPTIONS = [
  { value: 1, label: "First Semester" },
  { value: 2, label: "Second Semester" },
];
const OPTION_OPTIONS = [
  { value: "C", label: "Compulsory" },
  { value: "E", label: "Elective" },
];

function EditCourse({
  course,
  open,
  onClose,
  colleges = [],
  programmes = [],
  isLoadingInstitutions = false,
}) {
  const [updateCourse, { isLoading, isError, error }] = useUpdateCourseMutation();
  const [inputs, setInputs] = useState({
    title: "",
    code: "",
    unit: "",
    uamId: "",
    semester: 1,
    option: "C",
    level: "",
    collegeId: "",
    departmentId: "",
    programmeId: "",
  });
  const defaultInstitution = useMemo(() => {
    if (!colleges.length) {
      return { collegeId: "", departmentId: "", programmeId: "" };
    }
    const firstCollege = colleges[0];
    const departments = firstCollege.departments || [];
    const firstDepartment = departments[0] || null;
    const programmesForDepartment = programmes.filter((programme) =>
      idsMatch(programme.departmentId, firstDepartment?.id)
    );
    const firstProgramme = programmesForDepartment[0] || programmes[0] || null;

    return {
      collegeId: firstCollege.id,
      departmentId: normalizeId(firstDepartment?.id),
      programmeId: firstProgramme?.id || "",
    };
  }, [colleges, programmes]);

  useEffect(() => {
    if (!course) return;
    setInputs({
      title: course.title || "",
      code: course.code || "",
      unit: course.unit?.toString() || "",
      uamId: course.uamId || "",
      semester: Number(course.semester) || 1,
      option: course.option || "C",
      level: String(course.level || ""),
      collegeId: course.college?._id || course.collegeId || defaultInstitution.collegeId,
      departmentId:
        course.department?._id || course.departmentId || defaultInstitution.departmentId,
      programmeId:
        course.programme?._id || course.programmeId || defaultInstitution.programmeId,
    });
  }, [course, open, defaultInstitution]);

  const departmentOptions = useMemo(() => {
    const selectedCollege = colleges.find((college) => college.id === inputs.collegeId);
    return selectedCollege?.departments || [];
  }, [colleges, inputs.collegeId]);

  const programmeOptions = useMemo(() => {
    if (!inputs.departmentId) {
      return programmes;
    }
    return programmes.filter((programme) => idsMatch(programme.departmentId, inputs.departmentId));
  }, [programmes, inputs.departmentId]);

  const selectedProgramme = useMemo(
    () => programmeOptions.find((programme) => programme.id === inputs.programmeId) || null,
    [programmeOptions, inputs.programmeId]
  );

  const institutionsUnavailable = !colleges.length || !programmes.length;

  useEffect(() => {
    if (!open || !colleges.length) return;

    setInputs((prev) => {
      const resolvedCollege =
        colleges.find((college) => college.id === prev.collegeId) || colleges[0];
      const departments = resolvedCollege.departments || [];
      const resolvedDepartment =
        departments.find((department) => department.id === prev.departmentId) ||
        departments[0] ||
        null;

      const programmesForDepartment = programmes.filter((programme) =>
        idsMatch(programme.departmentId, resolvedDepartment?.id)
      );
      const resolvedProgramme =
        programmesForDepartment.find((programme) => programme.id === prev.programmeId) ||
        programmesForDepartment[0] ||
        null;

      if (
        prev.collegeId === resolvedCollege.id &&
        idsMatch(prev.departmentId, resolvedDepartment?.id) &&
        prev.programmeId === (resolvedProgramme?.id || "")
      ) {
        return prev;
      }

      return {
        ...prev,
        collegeId: resolvedCollege.id,
        departmentId: normalizeId(resolvedDepartment?.id),
        programmeId: resolvedProgramme?.id || "",
      };
    });
  }, [open, colleges, programmes]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setInputs((prev) => {
      if (name === "collegeId") {
        const nextCollege = colleges.find((college) => college.id === value);
        const departments = nextCollege?.departments || [];
        const nextDepartment = departments[0] || null;
        const programmesForDepartment = programmes.filter((programme) =>
          idsMatch(programme.departmentId, nextDepartment?.id)
        );
        const nextProgramme = programmesForDepartment[0] || null;

        return {
          ...prev,
          collegeId: value,
          departmentId: normalizeId(nextDepartment?.id),
          programmeId: nextProgramme?.id || "",
        };
      }

      if (name === "departmentId") {
        const programmesForDepartment = programmes.filter((programme) =>
          idsMatch(programme.departmentId, value)
        );
        const nextProgramme = programmesForDepartment[0] || null;

        return {
          ...prev,
          departmentId: normalizeId(value),
          programmeId: nextProgramme?.id || "",
        };
      }

      if (name === "code") {
        return { ...prev, code: value.toUpperCase() };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleCourseUpdate = async (event) => {
    event.preventDefault();
    if (!course) return;

    try {
      await updateCourse({
        id: course._id,
        title: inputs.title.trim(),
        code: inputs.code.trim().toUpperCase(),
        unit: Number(inputs.unit),
        uamId: inputs.uamId?.trim() || undefined,
        semester: Number(inputs.semester),
        option: inputs.option,
        level: inputs.level.trim(),
        collegeId: inputs.collegeId,
        departmentId: inputs.departmentId,
        programmeId: inputs.programmeId,
      }).unwrap();
      onClose();
    } catch (err) {
      // handled via hook error state
    }
  };

  if (!course) {
    return null;
  }

  if (!isLoadingInstitutions && institutionsUnavailable) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Edit Course
          <IconButton onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            No colleges or programmes are available. Configure institutional data before editing
            courses.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: "16px 24px" }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      component="form"
      onSubmit={handleCourseUpdate}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Edit Course
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error?.data?.message || "An error occurred while updating."}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Course Title"
                name="title"
                value={inputs.title}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Course Code"
                name="code"
                value={inputs.code}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Course Unit"
                name="unit"
                type="number"
                value={inputs.unit}
                onChange={handleInputChange}
                fullWidth
                required
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Level"
                name="level"
                value={inputs.level}
                onChange={handleInputChange}
                fullWidth
                required
              >
                {LEVEL_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Semester</InputLabel>
                <Select
                  label="Semester"
                  name="semester"
                  value={inputs.semester}
                  onChange={handleInputChange}
                >
                  {SEMESTER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Course Type</InputLabel>
                <Select
                  label="Course Type"
                  name="option"
                  value={inputs.option}
                  onChange={handleInputChange}
                >
                  {OPTION_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="UAM ID"
                name="uamId"
                value={inputs.uamId}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="College"
                name="collegeId"
                value={inputs.collegeId}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={isLoadingInstitutions || institutionsUnavailable}
              >
                {colleges.map((college) => (
                  <MenuItem key={college.id} value={college.id}>
                    {college.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Department"
                name="departmentId"
                value={inputs.departmentId}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={
                  isLoadingInstitutions ||
                  institutionsUnavailable ||
                  departmentOptions.length === 0
                }
                helperText={
                  institutionsUnavailable
                    ? "Institution data unavailable"
                    : departmentOptions.length === 0
                    ? "No departments for the selected college"
                    : undefined
                }
              >
                {departmentOptions.map((department) => (
                  <MenuItem key={department.id} value={department.id}>
                    {department.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Programme"
                name="programmeId"
                value={inputs.programmeId}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={
                  isLoadingInstitutions ||
                  institutionsUnavailable ||
                  programmeOptions.length === 0
                }
                helperText={
                  institutionsUnavailable
                    ? "Institution data unavailable"
                    : programmeOptions.length === 0
                    ? "No programmes for the selected department"
                    : undefined
                }
              >
                {programmeOptions.map((programme) => (
                  <MenuItem key={programme.id} value={programme.id}>
                    {programme.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Programme Type"
                value={selectedProgramme?.degreeType || ""}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: "16px 24px" }}>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : "Update Course"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditCourse;
