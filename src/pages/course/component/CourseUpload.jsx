import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useUploadCoursesMutation } from '../../../store';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormControl,
  TextField,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import { idsMatch, normalizeId } from "../../../utills/normalizeId";

const LEVEL_OPTIONS = ["100", "200", "300", "400", "500"];
const SEMESTER_OPTIONS = [
  { value: 1, label: "First Semester" },
  { value: 2, label: "Second Semester" },
];

const CourseUpload = ({
  colleges = [],
  programmes = [],
  isLoadingInstitutions = false,
}) => {
  const [inputs, setInputs] = useState({
    semester: "",
    level: "",
    collegeId: "",
    departmentId: "",
    programmeId: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef();

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
    if (!colleges.length) return;
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
        programmes[0] ||
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

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const [
    uploadCourses,
    { isLoading, isSuccess, isError, data, error, reset },
  ] = useUploadCoursesMutation();

  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      if (isError || isSuccess) {
        reset();
      }
    }
  }, [isError, isSuccess, reset]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      alert('Please select a CSV file to upload.');
      return;
    }
    if (!inputs.level || !inputs.semester || !inputs.collegeId || !inputs.departmentId || !inputs.programmeId) {
      alert('Level, semester, college, department and programme selections are required.');
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("semester", inputs.semester);
    formData.append("level", inputs.level);
    formData.append("collegeId", inputs.collegeId);
    formData.append("departmentId", inputs.departmentId);
    formData.append("programmeId", inputs.programmeId);

    try {
      await uploadCourses(formData).unwrap();
      setSelectedFile(null);
      setFileName("");
      setInputs((prev) => ({
        ...prev,
        semester: "",
        level: "",
        ...defaultInstitution,
      }));
    } catch (err) {
      console.error('Failed to upload courses:', err);
    }
  }, [selectedFile, inputs, uploadCourses, defaultInstitution]);

  const institutionsUnavailable = !colleges.length || !programmes.length;
  const canSubmit = Boolean(
    selectedFile &&
    inputs.level &&
    inputs.semester &&
    inputs.collegeId &&
    inputs.departmentId &&
    inputs.programmeId &&
    !isLoading &&
    !isLoadingInstitutions &&
    !institutionsUnavailable
  );

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Bulk Upload Courses
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Upload a CSV file with columns: <code>title</code>, <code>code</code>, <code>unit</code>, <code>option</code> (C or E).
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          The selected college, department, and programme will be assigned to every course created
          from this upload. Programme type is derived automatically from the selected programme.
        </Alert>

        {(!isLoadingInstitutions && institutionsUnavailable) && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No colleges or programmes are available. Please configure institutional data before uploading courses.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Level</InputLabel>
                <Select
                  label="Level"
                  name="level"
                  value={inputs.level}
                  onChange={handleInputs}
                  disabled={isLoadingInstitutions || institutionsUnavailable}
                >
                  <MenuItem value="" disabled>
                    <em>Select Level</em>
                  </MenuItem>
                  {LEVEL_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Semester</InputLabel>
                <Select
                  label="Semester"
                  name="semester"
                  value={inputs.semester}
                  onChange={handleInputs}
                  disabled={isLoadingInstitutions || institutionsUnavailable}
                >
                  <MenuItem value="" disabled>
                    <em>Select Semester</em>
                  </MenuItem>
                  {SEMESTER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>College</InputLabel>
                <Select
                  label="College"
                  name="collegeId"
                  value={inputs.collegeId}
                  onChange={handleInputs}
                  disabled={isLoadingInstitutions || institutionsUnavailable}
                >
                  <MenuItem value="" disabled>
                    <em>Select College</em>
                  </MenuItem>
                  {colleges.map((college) => (
                    <MenuItem key={college.id} value={college.id}>
                      {college.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select
                  label="Department"
                  name="departmentId"
                  value={inputs.departmentId}
                  onChange={handleInputs}
                  disabled={
                    isLoadingInstitutions ||
                    institutionsUnavailable ||
                    departmentOptions.length === 0
                  }
                >
                  <MenuItem value="" disabled>
                    <em>Select Department</em>
                  </MenuItem>
                  {departmentOptions.map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
                {institutionsUnavailable ? (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    Institution data unavailable.
                  </Typography>
                ) : departmentOptions.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    No departments for the selected college.
                  </Typography>
                ) : null}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Programme</InputLabel>
                <Select
                  label="Programme"
                  name="programmeId"
                  value={inputs.programmeId}
                  onChange={handleInputs}
                  disabled={
                    isLoadingInstitutions ||
                    institutionsUnavailable ||
                    programmeOptions.length === 0
                  }
                >
                  <MenuItem value="" disabled>
                    <em>Select Programme</em>
                  </MenuItem>
                  {programmeOptions.map((programme) => (
                    <MenuItem key={programme.id} value={programme.id}>
                      {programme.name}
                    </MenuItem>
                  ))}
                </Select>
                {institutionsUnavailable ? (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    Institution data unavailable.
                  </Typography>
                ) : programmeOptions.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    No programmes for the selected department.
                  </Typography>
                ) : null}
              </FormControl>
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

          <Stack spacing={3}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{
                py: 2,
                borderStyle: "dashed",
                borderWidth: 2,
                "&:hover": {
                  borderStyle: "dashed",
                  borderWidth: 2,
                },
              }}
              disabled={isLoadingInstitutions || institutionsUnavailable}
            >
              {fileName ? (
                <>
                  <DescriptionIcon sx={{ mr: 1 }} />
                  {fileName}
                </>
              ) : (
                "Select CSV File"
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv, text/csv"
                required
                hidden
                onChange={handleFileChange}
              />
            </Button>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={!canSubmit}
              fullWidth
              startIcon={
                isLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <CloudUploadIcon />
                )
              }
            >
              {isLoading ? "Uploading..." : "Upload Courses"}
            </Button>
          </Stack>
        </form>

        {isError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error?.data?.message || "Error uploading file. Please try again."}
          </Alert>
        )}

        {isSuccess && data && (
          <Paper elevation={2} sx={{ mt: 3, p: 2, background: "#f9f9f9" }}>
            <Typography variant="h6" gutterBottom>Upload Summary</Typography>
            <List dense>
              <ListItem><ListItemText primary={`Total Records in CSV: ${data.stats.total}`} /></ListItem>
              <ListItem><ListItemText primary={`Successfully Imported: ${data.stats.success}`} sx={{ color: "success.dark" }} /></ListItem>
              <ListItem><ListItemText primary={`Failed to Import: ${data.stats.failed}`} sx={{ color: "error.dark" }} /></ListItem>
            </List>

            {data.failed?.length > 0 && (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small" aria-label="failed records table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Course Code</TableCell>
                      <TableCell>Reason for Failure</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.failed.map((record, index) => (
                      <TableRow key={index} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                        <TableCell component="th" scope="row">{record.code}</TableCell>
                        <TableCell sx={{ color: "error.dark" }}>{record.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
      </Paper>
    </Box>
  );
};

export default CourseUpload;
