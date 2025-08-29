import { useState } from "react";
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
import {
  Info as InfoIcon,
  HelpOutline as HelpIcon,
  School as SchoolIcon,
} from "@mui/icons-material";

function CreateCourse({ onCreate, isLoading, error }) {
  const theme = useTheme();
  const [inputs, setInputs] = useState({
    title: "",
    code: "",
    unit: "",
    level: "",
    semester: 1,
    option: "C",
  });
  const [touched, setTouched] = useState({
    title: false,
    code: false,
    unit: false,
  });

  const handleInputs = (e) => {
    const { name, value } = e.target;
    setInputs({
      ...inputs,
      [name]: value,
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
    if (!inputs.title || !inputs.code || !inputs.unit || !inputs.level) {
      setTouched({ title: true, code: true, unit: true, level: true });
      return;
    }

    try {
      // Parent's onCreate will throw an error on failure due to .unwrap()
      await onCreate(inputs);
      // Reset form only on successful creation
      setInputs({
        title: "",
        code: "",
        unit: "",
        level: "",
        semester: 1,
        option: "C",
      });
      setTouched({ title: false, code: false, unit: false, level: false });
    } catch (err) {
      // Error is displayed via the `error` prop from the parent.
      // We just prevent the form from being reset on failure.
    }
  };

  // Validation helpers
  const isTitleValid = inputs.title.trim() !== "" || !touched.title;
  const isCodeValid = inputs.code.trim() !== "" || !touched.code;
  const isUnitValid = inputs.unit > 0 || !touched.unit;
  const isLevelValid = inputs.level.trim() !== "" || !touched.level;


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
          <SchoolIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" component="h2" fontWeight="600">
            Create New Course
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
          <Grid item xs={12} md={6}>
            <TextField
              label="Course Title"
              variant="outlined"
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
              variant="outlined"
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
                    <Tooltip title="The official course code (e.g., CS101)">
                      <HelpIcon color="action" fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Course Unit"
              variant="outlined"
              type="number"
              name="unit"
              value={inputs.unit}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isUnitValid}
              helperText={!isUnitValid ? "Must be a positive number" : "Credit units for the course"}
              InputProps={{
                inputProps: { min: 1 },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Credit units">
                      <HelpIcon color="action" fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="semester-select-label">Semester</InputLabel>
              <Select
                labelId="semester-select-label"
                name="semester"
                value={inputs.semester}
                label="Semester"
                onChange={handleInputs}
              >
                <MenuItem value={1}>First Semester</MenuItem>
                <MenuItem value={2}>Second Semester</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Course Level"
              variant="outlined"
              name="level"
              value={inputs.level}
              onChange={handleInputs}
              onBlur={handleBlur}
              required
              fullWidth
              error={!isLevelValid}
              helperText={!isLevelValid && "Course level is required"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="The level for course">
                      <HelpIcon color="action" fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="option-select-label">Course Type</InputLabel>
              <Select
                labelId="option-select-label"
                name="option"
                value={inputs.option}
                label="Course Type"
                onChange={handleInputs}
              >
                <MenuItem value={"C"}>Compulsory (Required for all students)</MenuItem>
                <MenuItem value={"E"}>Elective (Optional for students)</MenuItem>
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
            {isLoading ? "Creating..." : "Create Course"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default CreateCourse;