export const OFFICER_CONFIG = [
  {
    key: 'ceo',
    role: 'COLLEGE_OFFICER',
    label: 'College Exam Officer',
    shortLabel: 'College Exam Officer',
    approvalField: 'ceoApproval',
    approvedKey: 'ceoApproved',
    flaggedKey: 'ceoFlagged',
    nameKey: 'ceoName',
    noteKey: 'ceoNote',
    titleKey: 'ceoTitle',
    surnameKey: 'ceoSurname',
    firstnameKey: 'ceoFirstname',
    middlenameKey: 'ceoMiddlename',
    departmentKey: 'ceoDepartment',
    collegeKey: 'ceoCollege',
    dependencies: [],
  },
  {
    key: 'hod',
    role: 'HOD',
    label: 'Head of Department',
    shortLabel: 'Head of Department',
    approvalField: 'hodApproval',
    approvedKey: 'hodApproved',
    flaggedKey: 'hodFlagged',
    nameKey: 'hodName',
    noteKey: 'hodNote',
    titleKey: 'hodTitle',
    surnameKey: 'hodSurname',
    firstnameKey: 'hodFirstname',
    middlenameKey: 'hodMiddlename',
    departmentKey: 'hodDepartment',
    collegeKey: 'hodCollege',
    dependencies: ['ceo'],
  },
  {
    key: 'dean',
    role: 'DEAN',
    label: 'Dean of College',
    shortLabel: 'Dean of College',
    approvalField: 'deanApproval',
    approvedKey: 'deanApproved',
    flaggedKey: 'deanFlagged',
    nameKey: 'deanName',
    noteKey: 'deanNote',
    titleKey: 'deanTitle',
    surnameKey: 'deanSurname',
    firstnameKey: 'deanFirstname',
    middlenameKey: 'deanMiddlename',
    departmentKey: 'deanDepartment',
    collegeKey: 'deanCollege',
    dependencies: ['ceo', 'hod'],
  },
];

export const ROLE_TO_OFFICER = OFFICER_CONFIG.reduce((acc, officer) => {
  acc[officer.role] = officer;
  return acc;
}, {});

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  EXAM_OFFICER: 'Exam Officer',
  COLLEGE_OFFICER: 'College Exam Officer',
  HOD: 'Head of Department',
  DEAN: 'Dean of College',
};
