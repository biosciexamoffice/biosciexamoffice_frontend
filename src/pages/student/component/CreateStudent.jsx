import { useState } from "react";
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

function CreateStudent({ onCreate, isLoading, error }) {
  const theme = useTheme();
  const [inputs, setInputs] = useState({
    surname: "",
    firstname: "",
    middlename: "",
    regNo: "",
    level: "",
  });
  const [touched, setTouched] = useState({
    surname: false,
    firstname: false,
    regNo: false,
    level: false,
  });

  const handleInputs = (e) => {
    const { name, value } = e.target;
    setInputs({
      ...inputs,
      [name]: value,
    });
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
    if (
      !inputs.surname ||
      !inputs.firstname ||
      !inputs.regNo ||
      !inputs.level
    ) {
      setTouched({
        surname: true,
        firstname: true,
        regNo: true,
        level: true,
      });
      return;
    }

    try {
      await onCreate(inputs);
      setInputs({
        surname: "",
        firstname: "",
        middlename: "",
        regNo: "",
        level: "",

      });
      setTouched({
        surname: false,
        firstname: false,
        regNo: false,
        level: false,
 
      });
    } catch (err) {
      // Error is displayed via the `error` prop from the parent.
    }
  };

  // Validation helpers
  const isSurnameValid = inputs.surname.trim() !== "" || !touched.surname;
  const isFirstnameValid = inputs.firstname.trim() !== "" || !touched.firstname;
  const isRegNoValid = inputs.regNo.trim() !== "" || !touched.regNo;
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
          <PersonAddIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" component="h2" fontWeight="600">
            Create Student Profile
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
              sx={{
                width: 100
                }}
              error={!isLevelValid}
              helperText={!isLevelValid && "Level is required (e.g., 100, 200)"}
            >
              <MenuItem value="" disabled>
                <em>Select Level</em>
              </MenuItem>
              <MenuItem value="100">100</MenuItem>
              <MenuItem value="200">200</MenuItem>
              <MenuItem value="300">300</MenuItem>
              <MenuItem value="400">400</MenuItem>
              </TextField>
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
            {isLoading ? "Creating..." : "Create Student"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default CreateStudent;