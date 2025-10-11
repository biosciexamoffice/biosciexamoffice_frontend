// components/RegistrationFormGenerator.jsx
import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useGenerateRegistrationDataMutation } from "../../../store/index";
import useRegistrationPDFGenerator from "../../../utills/useRegistrationPDFGenerator";

export default function RegistrationFormGenerator() {
  const [level, setLevel] = useState("");
  const [session, setSession] = useState("");
  const [semester, setSemester] = useState("");

  const [generateForms, { isLoading, error }] =
    useGenerateRegistrationDataMutation();

  // This is a plain factory (no React hooks inside), safe to call here:
const { generateCombinedPDF } = useRegistrationPDFGenerator();

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await generateForms({
        level: String(level).trim(),
        session: String(session).trim(),
        semester: Number(semester),
      }).unwrap();

      const { students = [], meta = {} } = res || {};

      // Generate a PDF per student (sequentially to avoid UI/browser hiccups)
     await generateCombinedPDF(students, meta);
    } catch (err) {
      // RTK Query exposes errors via `error`, but keep a console trace for dev
      console.error("generateForms failed:", err);
    }
  };

  const errMsg =
    error?.data?.message ||
    error?.data?.error ||
    error?.error ||
    (error ? "Request failed" : "");

  const isSubmitDisabled =
    isLoading || !level || !session || !semester;

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Generate Dummy Registration Forms.
      </Typography>

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
          <TextField
            label="Level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="e.g. 100, 200"
            required
            fullWidth
          />

          <TextField
            label="Session"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            placeholder="e.g. 2020/2021"
            required
            fullWidth
          />

          <TextField
            label="Semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            select
            required
            fullWidth
          >
            <MenuItem value={1}>First</MenuItem>
            <MenuItem value={2}>Second</MenuItem>
          </TextField>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center">
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitDisabled}
          >
            {isLoading ? "Generating..." : "Generate PDFs"}
          </Button>
          {isLoading && <CircularProgress size={24} />}
        </Stack>

        {!!errMsg && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errMsg}
          </Alert>
        )}
      </Box>
    </Paper>
  );
}
