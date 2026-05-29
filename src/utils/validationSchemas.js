import * as yup from 'yup';

export const loginSchema = yup.object({
  identifier: yup.string().required('Username, email or phone is required'),
  password: yup.string().min(4, 'Password must be at least 4 characters').required('Password is required'),
});

export const dutySchema = yup.object({
  officerId: yup.string().nullable().optional(),
  officerName: yup.string().nullable().optional(),
  travellerName: yup.string().nullable().optional(),
  travellerDesignation: yup.string().nullable().optional(),
  travellerPhone: yup.string().nullable().optional(),
  date: yup.string().required('Date is required'),
  reportingTime: yup.string().required('Reporting time is required'),
  guestArrivalTime: yup.string().nullable().optional(),
  officeType: yup.string().required('Office type is required'),
  from: yup.string().required('From city is required'),
  to: yup.string().required('To city is required'),
  airline: yup.string().nullable().optional(),
  flightNo: yup.string().required('Flight number is required'),
  pnrNo: yup.string().nullable().optional(),
  flightTime: yup.string().required('Flight time is required'),
  arrivalDeparture: yup.string().required('Arrival/Departure is required'),
  airportId: yup.string().required('Airport is required'),
  airportName: yup.string().required(),
  terminalId: yup.string().required('Terminal is required'),
  terminalName: yup.string().required(),
  noOfPassengers: yup.string()
    .matches(/^[1-9][0-9]*$/, 'Must be 1 or more')
    .required('Number of passengers is required'),
});

export const addOfficerSchema = yup.object({
  name: yup.string().required('Name is required'),
  phone: yup.string().matches(/^[6-9]\d{9}$/, 'Invalid phone number').required('Phone is required'),
  email: yup.string().email('Invalid email').nullable().optional(),
  employeeId: yup.string().required('Employee ID is required'),
});
