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
} from "@mui/material";
import { PersonAdd as PersonAddIcon } from "@mui/icons-material";
import { idsMatch, normalizeId } from "../../../utills/normalizeId";

const LEVEL_OPTIONS = ["100", "200", "300", "400", "500"];

function CreateStudent({
  onCreate,
  isLoading,
  error,
  colleges = [],
  programmes = [],
  isLoadingInstitutions = false,
}) {
  const theme = useTheme();
  const [inputs, setInputs] = useState({
    surname: "",
    firstname: "",
    middlename: "",
    regNo: "",
    level: "",
    collegeId: "",
    departmentId: "",
    programmeId: "",
  });
  const [touched, setTouched] = useState({
    surname: false,
    firstname: false,
    regNo: false,
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
      const fallbackCollege = colleges[0];
      const nextCollege =
        colleges.find((college) => college.id === prev.collegeId) || fallbackCollege;
      const nextDepartments = nextCollege.departments || [];
      const fallbackDepartment = nextDepartments[0] || null;
      const nextDepartment =
        nextDepartments.find((dept) => dept.id === prev.departmentId) || fallbackDepartment;

      const nextProgrammes = programmes.filter((programme) =>
        idsMatch(programme.departmentId, nextDepartment?.id)
      );
      const fallbackProgramme = nextProgrammes[0] || null;
      const nextProgramme =
        nextProgrammes.find((programme) => programme.id === prev.programmeId) || fallbackProgramme;

      if (
        prev.collegeId === nextCollege.id &&
        idsMatch(prev.departmentId, nextDepartment?.id) &&
        prev.programmeId === (nextProgramme?.id || "")
      ) {
        return prev;
      }

      return {
        ...prev,
        collegeId: nextCollege.id,
        departmentId: normalizeId(nextDepartment?.id),
        programmeId: nextProgramme?.id || "",
      };
    });
  }, [colleges, programmes]);

  const handleInputs = (event) => {
    const { name, value } = event.target;

    setInputs((prev) => {
      if (name === "collegeId") {
        const nextCollege = colleges.find((college) => college.id === value);
        const nextDepartments = nextCollege?.departments || [];
        const nextDepartment = nextDepartments[0] || null;
        const nextProgrammes = programmes.filter((programme) =>
          idsMatch(programme.departmentId, nextDepartment?.id)
        );
        const nextProgramme = nextProgrammes[0] || null;

        return {
          ...prev,
          collegeId: value,
          departmentId: normalizeId(nextDepartment?.id),
          programmeId: nextProgramme?.id || "",
        };
      }

      if (name === "departmentId") {
        const nextProgrammes = programmes.filter((programme) =>
          idsMatch(programme.departmentId, value)
        );
        const nextProgramme = nextProgrammes[0] || null;

        return {
          ...prev,
          departmentId: normalizeId(value),
          programmeId: nextProgramme?.id || "",
        };
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
      !inputs.surname ||
      !inputs.firstname ||
      !inputs.regNo ||
      !inputs.level ||
      !inputs.collegeId ||
      !inputs.departmentId ||
      !inputs.programmeId
    ) {
      setTouched({
        surname: true,
        firstname: true,
        regNo: true,
        level: true,
        collegeId: true,
        departmentId: true,
        programmeId: true,
      });
      return;
    }

    try {
      const payload = {
        surname: inputs.surname.trim(),
        firstname: inputs.firstname.trim(),
        middlename: inputs.middlename.trim(),
        regNo: inputs.regNo.trim().toUpperCase(),
        level: inputs.level.trim(),
        collegeId: inputs.collegeId,
        departmentId: normalizeId(inputs.departmentId),
        programmeId: inputs.programmeId,
      };

      await onCreate(payload);
      setInputs((prev) => ({
        ...prev,
        surname: "",
        firstname: "",
        middlename: "",
        regNo: "",
        level: "",
      }));
      setTouched((prev) => ({
        ...prev,
        surname: false,
        firstname: false,
        regNo: false,
        level: false,
        collegeId: false,
        departmentId: false,
        programmeId: false,
      }));
    } catch {
      // Error is surfaced via parent component.
    }
  };

  const isSurnameValid = inputs.surname.trim() !== "" || !touched.surname;
  const isFirstnameValid = inputs.firstname.trim() !== "" || !touched.firstname;
  const isRegNoValid = inputs.regNo.trim() !== "" || !touched.regNo;
  const isLevelValid = inputs.level.trim() !== "" || !touched.level;
  const isCollegeValid = inputs.collegeId || !touched.collegeId;
  const isDepartmentValid = inputs.departmentId || !touched.departmentId;
  const isProgrammeValid = inputs.programmeId || !touched.programmeId;

  const institutionsUnavailable = !colleges.length || !programmes.length;
  const canSelectInstitution = !institutionsUnavailable;

  if (!isLoadingInstitutions && institutionsUnavailable) {
    return (
      <Alert severity="warning" sx={{ mt: 4 }}>
        No colleges or programmes are available. Please set up institutional data before creating
        student profiles.
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
          <PersonAddIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" component="h2" fontWeight={600}>
            Create Student Profile
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
          <Grid item xs={12} sm={6}>
            <TextField
              label="Surname"
              name="surname"
              value={inputs.surname}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isSurnameValid}
              helperText={!isSurnameValid && "Surname is required"}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="First Name"
              name="firstname"
              value={inputs.firstname}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isFirstnameValid}
              helperText={!isFirstnameValid && "First name is required"}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Middle Name"
              name="middlename"
              value={inputs.middlename}
              onChange={handleInputs}
              fullWidth
              helperText="Optional"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Registration Number"
              name="regNo"
              value={inputs.regNo}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isRegNoValid}
              helperText={!isRegNoValid && "Registration number is required"}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Level"
              name="level"
              select
              value={inputs.level}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isLevelValid}
              helperText={!isLevelValid && "Student level is required"}
            >
              {LEVEL_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="College"
              name="collegeId"
              select
              value={inputs.collegeId}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              disabled={!canSelectInstitution || isLoadingInstitutions}
              error={!isCollegeValid}
              helperText={
                isLoadingInstitutions
                  ? "Loading colleges..."
                  : !isCollegeValid
                  ? "Select a college."
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
          <Grid item xs={12} sm={4}>
            <TextField
              label="Department"
              name="departmentId"
              select
              value={inputs.departmentId}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              disabled={
                !canSelectInstitution ||
                isLoadingInstitutions ||
                departmentOptions.length === 0
              }
              error={!isDepartmentValid}
              helperText={
                isLoadingInstitutions
                  ? "Loading departments..."
                  : departmentOptions.length === 0
                  ? "No departments found for selected college."
                  : !isDepartmentValid
                  ? "Select a department."
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
          <Grid item xs={12} sm={4}>
            <TextField
              label="Programme"
              name="programmeId"
              select
              value={inputs.programmeId}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              disabled={
                !canSelectInstitution ||
                isLoadingInstitutions ||
                programmeOptions.length === 0
              }
              error={!isProgrammeValid}
              helperText={
                isLoadingInstitutions
                  ? "Loading programmes..."
                  : programmeOptions.length === 0
                  ? "No programmes found for selected department."
                  : !isProgrammeValid
                  ? "Select a programme."
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
          <Grid item xs={12} sm={4}>
            <TextField
              label="Programme Type"
              value={selectedProgramme?.degreeType || ""}
              fullWidth
              InputProps={{ readOnly: true }}
              helperText="Derived from selected programme."
            />
          </Grid>
        </Grid>

        <Button
          variant="contained"
          type="submit"
          size="large"
          disabled={isLoading || !canSelectInstitution || isLoadingInstitutions}
        >
          {isLoading ? "Creating..." : "Create Student"}
        </Button>
      </Box>
    </Paper>
  );
}

export default CreateStudent;
