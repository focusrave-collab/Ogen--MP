export interface Employee {
  id: string;
  gender: string; // ז/נ
  employeeNumber: string; // מס' עובד
  firstName: string; // שם
  lastName: string; // שם משפחה
  role: string; // תפקיד
  program: string; // תכנית
  department: string; // מחלקה
  division: string; // חטיבה
  directManager: string; // מנהל ישיר (מס' עובד of manager)
  admissionYear: string; // שנת קליטה
  admissionDate: string; // ת. קליטה
  organization: string; // ארגון
  notes: string; // הערות
}

export const EMPTY_EMPLOYEE: Omit<Employee, 'id'> = {
  gender: '',
  employeeNumber: '',
  firstName: '',
  lastName: '',
  role: '',
  program: '',
  department: '',
  division: '',
  directManager: '',
  admissionYear: '',
  admissionDate: '',
  organization: '',
  notes: '',
};
