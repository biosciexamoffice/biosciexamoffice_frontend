import { useEffect, useMemo, useState } from "react";
import { idsMatch, normalizeId } from "../../../utills/normalizeId";
import { useUpdateStudentMutation } from "../../../store/index";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  MenuItem,
  Box,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

const LEVEL_OPTIONS = ["100", "200", "300", "400", "500"];

const STATUS_OPTIONS = [
  { value: "undergraduate", label: "Undergraduate" },
  { value: "graduated", label: "Graduated" },
  { value: "extraYear", label: "Extra Year" },
];

function EditStudent({
  student,
  open,
  onClose,
  colleges = [],
  programmes = [],
  isLoadingInstitutions = false,
}) {
  const [updateStudent, { isLoading, isError, error }] = useUpdateStudentMutation();
  const [inputs, setInputs] = useState({
    surname: "",
    firstname: "",
    middlename: "",
    regNo: "",
    level: "",
    status: "undergraduate",
    collegeId: "",
    departmentId: "",
    programmeId: "",
  });

  useEffect(() => {
    if (!student) return;
    setInputs({
      surname: student.surname || "",
      firstname: student.firstname || "",
      middlename: student.middlename || "",
      regNo: student.regNo || "",
      level: student.level || "",
      status: student.status || "undergraduate",
      collegeId: student.collegeId || student.college?.id || "",
      departmentId: student.departmentId || student.department?.id || "",
      programmeId: student.programmeId || student.programme?.id || "",
    });
  }, [student, open]);

  useEffect(() => {
    if (!open || !colleges.length) return;
    setInputs((prev) => {
      const fallbackCollege = colleges[0];
      const resolvedCollege =
        colleges.find((college) => college.id === prev.collegeId) || fallbackCollege;

      const departments = resolvedCollege.departments || [];
      const fallbackDepartment = departments[0] || null;
      const resolvedDepartment =
        departments.find((department) => department.id === prev.departmentId) ||
        fallbackDepartment;

      const programmesForDepartment = programmes.filter((programme) =>
        idsMatch(programme.departmentId, resolvedDepartment?.id)
      );
      const fallbackProgramme = programmesForDepartment[0] || null;
      const resolvedProgramme =
        programmesForDepartment.find((programme) => programme.id === prev.programmeId) ||
        fallbackProgramme;

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

  const departmentOptions = useMemo(() => {
    const selectedCollege = colleges.find((college) => college.id === inputs.collegeId);
    return selectedCollege?.departments || [];
  }, [colleges, inputs.collegeId]);

  const programmeOptions = useMemo(() => {
    if (!inputs.departmentId) return programmes;
    return programmes.filter((programme) => idsMatch(programme.departmentId, inputs.departmentId));
  }, [programmes, inputs.departmentId]);

  const selectedProgramme = useMemo(
    () => programmeOptions.find((programme) => programme.id === inputs.programmeId) || null,
    [programmeOptions, inputs.programmeId]
  );

  const institutionsUnavailable = !colleges.length || !programmes.length;
  const canSelectInstitution = !institutionsUnavailable;

  const handleInputChange = (event) => {
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
  };

  const handleStudentUpdate = async (event) => {
    event.preventDefault();
    if (!student) return;

    try {
      await updateStudent({
        id: student._id,
        surname: inputs.surname.trim(),
        firstname: inputs.firstname.trim(),
        middlename: inputs.middlename.trim(),
        regNo: inputs.regNo.trim().toUpperCase(),
        level: inputs.level.trim(),
        status: inputs.status,
        collegeId: inputs.collegeId,
        departmentId: inputs.departmentId,
        programmeId: inputs.programmeId,
      }).unwrap();
      onClose();
    } catch (err) {
      console.error("Failed to update student:", err);
    }
  };

  if (!student) {
    return null;
  }

  if (!isLoadingInstitutions && institutionsUnavailable) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Edit Student Profile
          <IconButton onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            No colleges or programmes are available. Please configure institutional data before
            editing student profiles.
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
      onSubmit={handleStudentUpdate}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Edit Student Profile
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error?.data?.error || "An error occurred while updating."}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Surname"
                name="surname"
                value={inputs.surname}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                name="firstname"
                value={inputs.firstname}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Middle Name"
                name="middlename"
                value={inputs.middlename}
                onChange={handleInputChange}
                fullWidth
                helperText="Optional"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Registration Number"
                name="regNo"
                value={inputs.regNo}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Status"
                name="status"
                value={inputs.status}
                onChange={handleInputChange}
                fullWidth
                required
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="College"
                name="collegeId"
                value={inputs.collegeId}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={!canSelectInstitution || isLoadingInstitutions}
                helperText={
                  isLoadingInstitutions ? "Loading colleges..." : undefined
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
                select
                label="Department"
                name="departmentId"
                value={inputs.departmentId}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={
                  !canSelectInstitution ||
                  isLoadingInstitutions ||
                  departmentOptions.length === 0
                }
                helperText={
                  isLoadingInstitutions
                    ? "Loading departments..."
                    : departmentOptions.length === 0
                    ? "No departments for selected college."
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
                select
                label="Programme"
                name="programmeId"
                value={inputs.programmeId}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={
                  !canSelectInstitution ||
                  isLoadingInstitutions ||
                  programmeOptions.length === 0
                }
                helperText={
                  isLoadingInstitutions
                    ? "Loading programmes..."
                    : programmeOptions.length === 0
                    ? "No programmes for selected department."
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
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: "16px 24px" }}>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={isLoading || isLoadingInstitutions}>
          {isLoading ? <CircularProgress size={24} /> : "Update Student"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditStudent;
