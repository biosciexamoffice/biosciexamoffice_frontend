import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  Grid,
  Alert,
  InputAdornment,
  Tooltip,
  IconButton,
  useTheme,
  Fade,
  Divider,
} from "@mui/material";
import { HelpOutline as HelpIcon, PersonAdd as PersonAddIcon } from "@mui/icons-material";
import { useGetCollegesQuery, useGetDepartmentsQuery } from "../../../store/api/institutionApi";

function CreateLecturer({ onCreate, isLoading, error }) {
  const theme = useTheme();
  const [inputs, setInputs] = useState({
    title: "",
    surname: "",
    firstname: "",
    middlename: "",
    pfNo:'',
    rank: '',
    college: '',
    department: ''

  });
  const [touched, setTouched] = useState({
    title: false,
    surname: false,
    firstname: false,
    middlename: false,
    rank: false,
    college: false,
    department: false
  });

  const { data: collegesData, isLoading: collegesLoading } = useGetCollegesQuery();
  const { data: departmentsData, isLoading: departmentsLoading } = useGetDepartmentsQuery(inputs.college, { skip: !inputs.college });

  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (collegesData) {
      setColleges(collegesData.colleges);
    }
  }, [collegesData]);

  useEffect(() => {
    if (departmentsData) {
      setDepartments(departmentsData.departments);
    }
  }, [departmentsData]);

  const handleInputs = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => {
      const newInputs = { ...prev, [name]: value };
      if (name === 'college') {
        newInputs.department = ''; // Reset department when college changes
      }
      return newInputs;
    });
    // Mark field as touched when changed
    if (name in touched) {
      setTouched({
        ...touched,
        [name]: true,
      });
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    if (name in touched) {
      setTouched({
        ...touched,
        [name]: true,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Trigger touched state for all fields on submit to show errors
    if (!inputs.title || !inputs.surname || !inputs.firstname || !inputs.pfNo || !inputs.rank || !inputs.college || !inputs.department) {
      setTouched({ title: true, surname: true, firstname: true, middlename: true, pfNo: true, rank: true, college: true, department: true });
      return;
    }

    try {
      // Parent's onCreate will throw an error on failure due to .unwrap()
      await onCreate(inputs);
      // Reset form only on successful creation
      setInputs({
        title: "",
        surname: "",
        firstname: "",
        middlename: '',
        pfNo: '',
        rank: '',
        college: '',
        department: '',
      });
      setTouched({ title: false, surname: false, firstname: false, middlename: false, pfNo: false, rank: false, college: false, department: false});
    } catch (err) {
      // Error is displayed via the `error` prop from the parent.
      // We just prevent the form from being reset on failure.
    }
  };

  // Validation helpers
  const isTitleValid = inputs.title.trim() !== "" || !touched.title;
  const isSurnameValid = inputs.surname.trim() !== "" || !touched.surname;
  const isFirstnameValid = inputs.firstname.trim() !== "" || !touched.firstname;
  // Middlename is optional
  const isPfNoValid = inputs.pfNo.trim() !== "" || !touched.pfNo;
  const isRankValid = inputs.rank.trim() !== "" || !touched.rank;
  const isCollegeValid = inputs.college.trim() !== "" || !touched.college;
  const isDepartmentValid = inputs.department.trim() !== "" || !touched.department;
  

  return (
    <Paper
      sx={{
        p: 4,
        mt: 4,
        maxWidth: 800,
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
          <Typography variant="h5" component="h2" fontWeight="600">
            Create Lecturer Profile
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {error && (
          <Fade in={!!error}>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          </Fade>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel id="option-select-title">Title</InputLabel>
              <Select
                labelId="option-select-title"
                name="title"
                value={inputs.title}
                label="Title"
                onChange={handleInputs}
                onBlur={handleBlur}
                error={!isTitleValid}
                sx={{px:2}}
              >
                <MenuItem value={"Professor"}>Professor</MenuItem>
                <MenuItem value={"Doctor"}>Doctor</MenuItem>
                <MenuItem value={"Mr"}>Mr</MenuItem>
                <MenuItem value={"Mrs"}>Mrs</MenuItem>
                <MenuItem value={"Miss"}>Miss</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={8}>
            <TextField
              label="surname"
              variant="outlined"
              name="surname"
              value={inputs.surname}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isSurnameValid}
              helperText={!isSurnameValid && "Surname is required"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Your Surname">
                      <HelpIcon color="action" fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="First Name"
              variant="outlined"
              name="firstname"
              value={inputs.firstname}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isFirstnameValid}
              helperText={!isFirstnameValid && "Firstname is required"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Firstname">
                      <HelpIcon color="action" fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="MiddleName"
              variant="outlined"
              name="middlename"
              value={inputs.middlename}
              onChange={handleInputs}
              fullWidth
              // Middlename is optional, so no error state
              helperText="Optional"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Middlename">
                      <HelpIcon color="action" fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="pfNo"
              variant="outlined"
              name="pfNo"
              value={inputs.pfNo}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isPfNoValid}
              helperText={!isPfNoValid && "pfNo is required"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="pfNo">
                      <HelpIcon color="action" fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Rank"
              variant="outlined"
              name="rank"
              value={inputs.rank}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isRankValid}
              helperText={!isRankValid && "Rank is required"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="e.g., Senior Lecturer">
                      <HelpIcon color="action" fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel id="college-select-label">College</InputLabel>
              <Select
                labelId="college-select-label"
                name="college"
                value={inputs.college}
                label="College"
                onChange={handleInputs}
                onBlur={handleBlur}
                error={!isCollegeValid}
              >
                {colleges.map((college) => (
                  <MenuItem key={college.id} value={college.id}>
                    {college.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel id="department-select-label">Department</InputLabel>
              <Select
                labelId="department-select-label"
                name="department"
                value={inputs.department}
                label="Department"
                onChange={handleInputs}
                onBlur={handleBlur}
                error={!isDepartmentValid}
                disabled={!inputs.college || departmentsLoading}
              >
                {departments
                  .map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={isLoading}
            sx={{
              minWidth: 120,
              py: 1.5,
              fontWeight: 600,
            }}
          >
            {isLoading ? "Creating..." : "Create Lecturer"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default CreateLecturer;