import { useEffect, useMemo, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  Alert,
  useTheme,
  Fade,
  Divider,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import {
  HelpOutline as HelpIcon,
  School as SchoolIcon,
} from "@mui/icons-material";
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

function CreateCourse({
  onCreate,
  isLoading,
  error,
  colleges = [],
  programmes = [],
  isLoadingInstitutions = false,
  institutionError = null,
}) {
  const theme = useTheme();
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
  const [inputs, setInputs] = useState({
    title: "",
    code: "",
    unit: "",
    level: "",
    semester: 1,
    option: "C",
    ...defaultInstitution,
  });
  const [touched, setTouched] = useState({
    title: false,
    code: false,
    unit: false,
    level: false,
    collegeId: false,
    departmentId: false,
    programmeId: false,
  });

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

  useEffect(() => {
    if (!colleges.length) return;

    setInputs((prev) => {
      const resolvedCollege =
        colleges.find((college) => college.id === prev.collegeId) || colleges[0];
      const departments = resolvedCollege.departments || [];
      const resolvedDepartment =
        departments.find((dept) => dept.id === prev.departmentId) || departments[0] || null;

      const programmesForDepartment = programmes.filter((programme) =>
        idsMatch(programme.departmentId, resolvedDepartment?.id)
      );
      const fallbackProgramme = programmesForDepartment[0] || programmes[0] || null;
      const resolvedProgramme =
        programmesForDepartment.find((programme) => programme.id === prev.programmeId) ||
        fallbackProgramme ||
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
  }, [colleges, programmes]);

  const handleInputs = (event) => {
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
        return { ...prev, [name]: String(value).toUpperCase() };
      }

      if (name === "option") {
        return { ...prev, option: value };
      }

      if (name === "unit") {
        return { ...prev, unit: value.replace(/[^0-9]/g, "") };
      }

      return {
        ...prev,
        [name]: value,
      };
    });

    if (name in touched) {
      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));
    }
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    if (name in touched) {
      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (
      !inputs.title ||
      !inputs.code ||
      !inputs.unit ||
      !inputs.level ||
      !inputs.collegeId ||
      !inputs.departmentId ||
      !inputs.programmeId
    ) {
      setTouched({
        title: true,
        code: true,
        unit: true,
        level: true,
        collegeId: true,
        departmentId: true,
        programmeId: true,
      });
      return;
    }

    try {
      const payload = {
        title: inputs.title.trim(),
        code: inputs.code.trim().toUpperCase(),
        unit: Number(inputs.unit),
        level: inputs.level.trim(),
        semester: Number(inputs.semester),
        option: inputs.option,
        collegeId: inputs.collegeId,
        departmentId: inputs.departmentId,
        programmeId: inputs.programmeId,
      };

      await onCreate(payload);
      setInputs((prev) => ({
        ...prev,
        title: "",
        code: "",
        unit: "",
        level: "",
        semester: 1,
        option: "C",
        collegeId: defaultInstitution.collegeId,
        departmentId: defaultInstitution.departmentId,
        programmeId: defaultInstitution.programmeId,
      }));
      setTouched({
        title: false,
        code: false,
        unit: false,
        level: false,
        collegeId: false,
        departmentId: false,
        programmeId: false,
      });
    } catch (err) {
      // handled upstream
    }
  };

  const isTitleValid = inputs.title.trim() !== "" || !touched.title;
  const isCodeValid = inputs.code.trim() !== "" || !touched.code;
  const isUnitValid = Number(inputs.unit) > 0 || !touched.unit;
  const isLevelValid = inputs.level.trim() !== "" || !touched.level;
  const isCollegeValid = inputs.collegeId || !touched.collegeId;
  const isDepartmentValid = inputs.departmentId || !touched.departmentId;
  const isProgrammeValid = inputs.programmeId || !touched.programmeId;

  const institutionsUnavailable = !colleges.length || !programmes.length;
  const institutionGuardActive = Boolean(institutionError) || institutionsUnavailable;

  if (!isLoadingInstitutions && institutionGuardActive) {
    return (
      <Alert severity={institutionError ? "error" : "warning"} sx={{ mt: 4 }}>
        {institutionError ||
          "No colleges or programmes are available. Please create institutional data before adding courses."}
      </Alert>
    );
  }

  return (
    <Paper
      sx={{
        p: 4,
        mt: 4,
        maxWidth: 960,
        mx: "auto",
        boxShadow: theme.shadows[3],
        borderRadius: 2,
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <SchoolIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" component="h2" fontWeight={600}>
            Create New Course
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {error && (
          <Fade in={Boolean(error)}>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          </Fade>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Course Title"
              name="title"
              value={inputs.title}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isTitleValid}
              helperText={!isTitleValid && "Course title is required"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="The full name of the course">
                      <HelpIcon color="action" fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Course Code"
              name="code"
              value={inputs.code}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isCodeValid}
              helperText={!isCodeValid && "Course code is required"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="The official course code (e.g., BIO101)">
                      <HelpIcon color="action" fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Course Unit"
              name="unit"
              type="number"
              value={inputs.unit}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isUnitValid}
              helperText={!isUnitValid ? "Provide a positive number" : "Credit units for the course"}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Level"
              name="level"
              value={inputs.level}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isLevelValid}
              helperText={!isLevelValid && "Select a level"}
            >
              <MenuItem value="" disabled>
                <em>Select Level</em>
              </MenuItem>
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
                onChange={handleInputs}
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
                onChange={handleInputs}
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
              select
              label="College"
              name="collegeId"
              value={inputs.collegeId}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              disabled={isLoadingInstitutions || institutionGuardActive}
              error={!isCollegeValid}
              helperText={
                isLoadingInstitutions
                  ? "Loading colleges..."
                  : !isCollegeValid
                  ? "Select a college"
                  : undefined
              }
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
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              disabled={
                isLoadingInstitutions ||
                institutionGuardActive ||
                departmentOptions.length === 0
              }
              error={!isDepartmentValid}
              helperText={
                isLoadingInstitutions
                  ? "Loading departments..."
                  : departmentOptions.length === 0
                  ? "No departments for the selected college."
                  : !isDepartmentValid
                  ? "Select a department"
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
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              disabled={
                isLoadingInstitutions ||
                institutionGuardActive ||
                programmeOptions.length === 0
              }
              error={!isProgrammeValid}
              helperText={
                isLoadingInstitutions
                  ? "Loading programmes..."
                  : programmeOptions.length === 0
                  ? "No programmes for the selected department."
                  : !isProgrammeValid
                  ? "Select a programme"
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
              helperText="Derived from the selected programme"
            />
          </Grid>
        </Grid>

        <Button
          variant="contained"
          type="submit"
          size="large"
          disabled={isLoading || isLoadingInstitutions || institutionGuardActive}
        >
          {isLoading ? "Creating..." : "Create Course"}
        </Button>
      </Box>
    </Paper>
  );
}

export default CreateCourse;
