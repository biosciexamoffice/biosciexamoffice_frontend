// src/features/results/component/CreateResultForm.jsx
import { useMemo, useState } from "react";
import {
  Box, Grid, Paper, Stack, TextField, MenuItem, Button,
  Typography, Divider, Alert, InputAdornment, Chip,
  Autocomplete, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControlLabel, Switch
} from "@mui/material";
import {
  useCreateResultMutation,
  useGetAllCoursesQuery,
  useGetSessionsQuery,
} from "../../../store";

// --- helpers ---
const clamp = (v, min, max) => {
  if (v === "" || v === null || Number.isNaN(Number(v))) return "";
  const n = Number(v);
  return Math.min(Math.max(n, min), max);
};
const safeN = (v) => (v === "" || v === null || Number.isNaN(Number(v)) ? 0 : Number(v));
const gradeFromScore = (score) => {
  const s = Number(score) || 0;
  if (s >= 70) return "A";
  if (s >= 60) return "B";
  if (s >= 50) return "C";
  if (s >= 45) return "D";
  if (s >= 40) return "E";
  return "F";
};

const LEVEL_OPTIONS = ["100", "200", "300", "400"];
const Q_KEYS = ["q1","q2","q3","q4","q5","q6","q7","q8"];

export default function CreateResultForm() {
  const [createResult, { isLoading, isError, error }] = useCreateResultMutation();

  // Courses
  const { data: courses = [], isLoading: coursesLoading, isFetching: coursesFetching, isError: coursesError } =
    useGetAllCoursesQuery();
  const courseOptions = useMemo(
    () => (Array.isArray(courses) ? courses : []).map((c) => ({
      id: c._id,
      code: c.code,
      title: c.title,
      level: c.level,
      unit: c.unit,
      semester: c.semester,
      label: `${c.code} — ${c.title} (L${c.level}, ${c.unit}u, Sem ${c.semester})`,
    })),
    [courses]
  );

  // Sessions
  const { data: sessions = [] } = useGetSessionsQuery();

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false); // ← toggle

  const [form, setForm] = useState({
    // identities
    course: "",
    studentRegNo: "",
    lecturerStaffId: "",   // PF No
    department: "",
    session: "",
    semester: 1,
    level: "",
    // detailed fields
    q1:"", q2:"", q3:"", q4:"", q5:"", q6:"", q7:"", q8:"",
    ca:"",
    // simple & derived fields
    totalexam:"",
    grandtotal:"",
    grade:"",
  });

  // exam from Qs (detailed mode)
  const examFromQs = useMemo(() => Q_KEYS.reduce((sum,k) => sum + safeN(form[k]), 0), [form]);

  // recompute derived fields
  const recomputeDetailed = (patch = {}) => {
    setForm((s) => {
      const next = { ...s, ...patch };
      const caNum = safeN(next.ca);
      const examNum = examFromQs;
      const caClamped = clamp(caNum, 0, 30);
      const examClamped = clamp(examNum, 0, 70);
      next.totalexam = examClamped;
      next.ca = next.ca === "" ? "" : caClamped;
      const grand = safeN(next.ca) + safeN(next.totalexam);
      next.grandtotal = clamp(grand, 0, 100);
      next.grade = gradeFromScore(next.grandtotal);
      return next;
    });
  };
  const recomputeSimple = (patch = {}) => {
    setForm((s) => {
      const next = { ...s, ...patch };
      const gt = clamp(safeN(next.grandtotal), 0, 100);
      next.grandtotal = next.grandtotal === "" ? "" : gt;
      next.grade = gradeFromScore(gt);
      return next;
    });
  };

  const handleChange = (key) => (e) => {
    const val = e.target.value;
    if (simpleMode) {
      if (key === "grandtotal") {
        recomputeSimple({ grandtotal: val === "" ? "" : Number(val) });
      } else if (key === "semester") {
        setForm((s) => ({ ...s, semester: Number(val) }));
      } else {
        setForm((s) => ({ ...s, [key]: val }));
      }
      return;
    }

    // detailed mode
    if (Q_KEYS.includes(key)) {
      recomputeDetailed({ [key]: val === "" ? "" : Number(val) });
    } else if (key === "ca") {
      recomputeDetailed({ ca: val === "" ? "" : Number(val) });
    } else if (key === "semester") {
      setForm((s) => ({ ...s, semester: Number(val) }));
    } else {
      setForm((s) => ({ ...s, [key]: val }));
    }
  };

  // validation
  const caNum = safeN(form.ca);
  const caErr = !simpleMode && caNum > 30;
  const examNum = examFromQs;
  const examErr = !simpleMode && examNum > 70;
  const grandErr = simpleMode && (safeN(form.grandtotal) < 0 || safeN(form.grandtotal) > 100);

  const baseMissing =
    !form.studentRegNo || !selectedCourse?.id || !form.department ||
    !form.session || !form.level || !form.semester || !form.lecturerStaffId;

  const missingRequired = simpleMode
    ? baseMissing || form.grandtotal === "" // must have total in simple mode
    : baseMissing;                          // detailed mode accepts blanks; totals come from inputs

  const disableSubmit = isLoading || missingRequired || caErr || examErr || grandErr;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const common = {
      course: selectedCourse?.id,
      studentRegNo: form.studentRegNo,
      lecturerStaffId: form.lecturerStaffId,
      department: String(form.department).trim(),
      session: String(form.session).trim(),
      semester: Number(form.semester),
      level: String(form.level),
      date: new Date().toISOString(),
    };

    const payload = simpleMode
      ? {
          ...common,
          grandtotal: safeN(form.grandtotal),
          grade: gradeFromScore(safeN(form.grandtotal)),
        }
      : {
          ...common,
          ...(form.q1 !== "" && { q1: safeN(form.q1) }),
          ...(form.q2 !== "" && { q2: safeN(form.q2) }),
          ...(form.q3 !== "" && { q3: safeN(form.q3) }),
          ...(form.q4 !== "" && { q4: safeN(form.q4) }),
          ...(form.q5 !== "" && { q5: safeN(form.q5) }),
          ...(form.q6 !== "" && { q6: safeN(form.q6) }),
          ...(form.q7 !== "" && { q7: safeN(form.q7) }),
          ...(form.q8 !== "" && { q8: safeN(form.q8) }),
          ca: caNum,
          totalexam: examNum,
          grandtotal: safeN(form.grandtotal),
          grade: String(form.grade || ""),
        };

    try {
      await createResult(payload).unwrap();
      setSuccessOpen(true);
    } catch (err) {
      console.error("Create failed:", err);
    }
  };

  const handleCreateAnother = () => {
    setSuccessOpen(false);
    setSelectedCourse(null);
    setForm({
      course: "",
      studentRegNo: "",
      lecturerStaffId: "",
      department: "",
      session: "",
      semester: 1,
      level: "",
      q1:"", q2:"", q3:"", q4:"", q5:"", q6:"", q7:"", q8:"",
      ca:"", totalexam:"", grandtotal:"", grade:""
    });
  };

  // header badges
  const totalForBadge = simpleMode ? safeN(form.grandtotal) : safeN(form.grandtotal);

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 1 }}>
        <Typography variant="h6">Enter Result</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            control={<Switch checked={simpleMode} onChange={(_, v) => setSimpleMode(v)} />}
            label="Simple (Grand Total only)"
          />
          {!simpleMode && (
            <>
              <Chip size="small" label={`Exam: ${examNum}/70`} color={examErr ? "error" : "default"} />
              <Chip size="small" label={`CA: ${form.ca === "" ? 0 : caNum}/30`} color={caErr ? "error" : "default"} />
            </>
          )}
          <Chip size="small" label={`Total: ${totalForBadge}/100`} color={grandErr ? "error" : "default"} />
          <Chip size="small" label={`Grade: ${form.grade || "-"}`} />
        </Stack>
      </Stack>
      <Divider sx={{ mb: 2 }} />

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {/* Student Reg No (wide) */}
          <Grid item xs={12} md={6} lg={5}>
            <TextField
              label="Student Reg No"
              value={form.studentRegNo}
              onChange={handleChange("studentRegNo")}
              required
              fullWidth
              sx={{ minWidth: { md: 360, lg: 420 } }}
              helperText="Enter the student's registration number"
            />
          </Grid>

          {/* Course Autocomplete (wide) */}
          <Grid item xs={12} md={6} lg={7}>
            <Autocomplete
              options={courseOptions}
              value={selectedCourse}
              onChange={(_, val) => {
                setSelectedCourse(val);
                setForm((s) => ({ ...s, course: val?.id || "" }));
              }}
              loading={coursesLoading || coursesFetching}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              getOptionLabel={(opt) => opt.label}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Course"
                  placeholder="Search course..."
                  required
                  fullWidth
                  sx={{ minWidth: { md: 480 } }}
                  helperText={coursesError ? "Failed to load courses." : " "}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {(coursesLoading || coursesFetching) && <CircularProgress size={20} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* Lecturer PF No (wide) */}
          <Grid item xs={12} md={6} lg={6}>
            <TextField
              label="Lecturer Staff ID (PF No.)"
              value={form.lecturerStaffId}
              onChange={handleChange("lecturerStaffId")}
              fullWidth
              sx={{ minWidth: { md: 160 } }}
              required
              helperText="Enter the lecturer's PF number (e.g., UAM/BS/1234)"
            />
          </Grid>

          {/* Department (wide) */}
          <Grid item xs={12} md={6} lg={6}>
            <TextField
              label="Department"
              value={form.department}
              onChange={handleChange("department")}
              fullWidth
              sx={{ minWidth: { md: 260 } }}
              required
            />
          </Grid>

          {/* Session (wide) */}
          <Grid item xs={12} md={6} lg={3}>
            <TextField
              select
              label="Session"
              value={form.session}
              onChange={handleChange("session")}
              required
              fullWidth
              sx={{ minWidth: { md: 320 } }}
            >
              <MenuItem value="" disabled><em>Select Session</em></MenuItem>
              {sessions.map((s) => (
                <MenuItem key={s._id} value={s.sessionTitle}>{s.sessionTitle}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Semester (wide) */}
          <Grid item xs={12} md={6} lg={3}>
            <TextField
              select
              label="Semester"
              value={form.semester}
              onChange={handleChange("semester")}
              required
              fullWidth
              sx={{ minWidth: { md: 320 } }}
            >
              <MenuItem value={1}>First</MenuItem>
              <MenuItem value={2}>Second</MenuItem>
            </TextField>
          </Grid>

          {/* Level (wide) */}
          <Grid item xs={12} md={6} lg={3}>
            <TextField
              select
              label="Level"
              value={form.level}
              onChange={handleChange("level")}
              required
              fullWidth
              sx={{ minWidth: { md: 160 } }}
            >
              <MenuItem value="" disabled><em>Select Level</em></MenuItem>
              {LEVEL_OPTIONS.map((lvl) => (
                <MenuItem key={lvl} value={lvl}>{lvl}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* --- MODED MARK ENTRY --- */}
          {!simpleMode ? (
            <>
              {/* Q1..Q8 compact */}
              {Q_KEYS.map((q, i) => (
                <Grid item key={q} xs={6} sm={3} md="auto">
                  <TextField
                    label={`Q${i + 1}`}
                    value={form[q]}
                    onChange={handleChange(q)}
                    type="number"
                    inputProps={{ min: 0 }}
                    sx={{ width: 120 }}
                    helperText="Exam part"
                  />
                </Grid>
              ))}

              {/* CA / Exam / Totals compact */}
              <Grid item xs={6} sm="auto" md="auto">
                <TextField
                  label="CA"
                  value={form.ca}
                  onChange={handleChange("ca")}
                  type="number"
                  inputProps={{ min: 0, max: 30 }}
                  error={caErr}
                  helperText={caErr ? "≤ 30" : " "}
                  sx={{ width: 140 }}
                  InputProps={{ endAdornment: <InputAdornment position="end">/30</InputAdornment> }}
                />
              </Grid>

              <Grid item xs={6} sm="auto" md="auto">
                <TextField
                  label="Exam"
                  value={examNum}
                  fullWidth
                  error={examErr}
                  helperText={examErr ? "≤ 70" : "Sum Q1–Q8"}
                  sx={{ width: 140 }}
                  InputProps={{ readOnly: true, endAdornment: <InputAdornment position="end">/70</InputAdornment> }}
                />
              </Grid>

              <Grid item xs={6} sm="auto" md="auto">
                <TextField
                  label="Total"
                  value={safeN(form.grandtotal)}
                  sx={{ width: 140 }}
                  InputProps={{ readOnly: true, endAdornment: <InputAdornment position="end">/100</InputAdornment> }}
                />
              </Grid>

              <Grid item xs={6} sm="auto" md="auto">
                <TextField
                  label="Grade"
                  value={form.grade}
                  sx={{ width: 120 }}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </>
          ) : (
            <>
              {/* SIMPLE: Grand Total only */}
              <Grid item xs={12} md={4}>
                <TextField
                  label="Grand Total"
                  value={form.grandtotal}
                  onChange={handleChange("grandtotal")}
                  type="number"
                  inputProps={{ min: 0, max: 100 }}
                  error={grandErr}
                  helperText={grandErr ? "0–100 only" : " "}
                  fullWidth
                  InputProps={{ endAdornment: <InputAdornment position="end">/100</InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Grade (auto)"
                  value={form.grade}
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </>
          )}

          {/* Error */}
          <Grid item xs={12}>
            {isError && (
              <Alert severity="error">
                {error?.data?.message || "Failed to save result"}
              </Alert>
            )}
          </Grid>

          {/* Actions */}
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button type="submit" variant="contained" disabled={disableSubmit}>
                {isLoading ? "Saving..." : "Save Result"}
              </Button>
              <Button
                type="button"
                variant="outlined"
                onClick={handleCreateAnother}
              >
                Reset
              </Button>
              <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
                {!simpleMode && (
                  <>
                    <Chip size="small" label={`Exam OK: ${examErr ? "No" : "Yes"}`} color={examErr ? "error" : "success"} variant="outlined" />
                    <Chip size="small" label={`CA OK: ${caErr ? "No" : "Yes"}`} color={caErr ? "error" : "success"} variant="outlined" />
                  </>
                )}
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* Success Dialog */}
      <Dialog open={successOpen} onClose={() => setSuccessOpen(false)}>
        <DialogTitle>Result submitted successfully</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Grand Total: <b>{safeN(form.grandtotal)}</b> • Grade: <b>{form.grade}</b>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessOpen(false)}>Close</Button>
          <Button variant="contained" onClick={handleCreateAnother}>Create another</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
