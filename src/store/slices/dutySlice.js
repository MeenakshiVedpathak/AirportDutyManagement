import {createSlice} from '@reduxjs/toolkit';

const dutySlice = createSlice({
  name: 'duties',
  initialState: {
    list: [],
    selectedDuty: null,
    isLoading: false,
    error: null,
    filters: {
      status: null,
      officerId: null,
      airport: null,
      dateFrom: null,
      dateTo: null,
      pending: null,
    },
    pagination: {page: 1, total: 0, hasMore: true},
  },
  reducers: {
    fetchDutiesStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    fetchDutiesSuccess(state, action) {
      state.isLoading = false;
      state.list = action.payload.duties;
      state.pagination.total = action.payload.total;
      state.pagination.hasMore = action.payload.hasMore ?? false;
      state.pagination.page = 1;
    },
    appendDutiesSuccess(state, action) {
      state.isLoading = false;
      state.list = [...state.list, ...action.payload.duties];
      state.pagination.total = action.payload.total;
      state.pagination.hasMore = action.payload.hasMore ?? false;
      state.pagination.page = action.payload.page;
    },
    fetchDutiesFailure(state, action) {
      state.isLoading = false;
      state.error = action.payload;
    },
    setSelectedDuty(state, action) {
      state.selectedDuty = action.payload;
    },
    setFilters(state, action) {
      state.filters = {...state.filters, ...action.payload};
    },
    clearFilters(state) {
      state.filters = {status: null, officerId: null, airport: null, dateFrom: null, dateTo: null, pending: null};
    },
    updateDutyInList(state, action) {
      const idx = state.list.findIndex(d => d.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    },
    addDutyToList(state, action) {
      state.list.unshift(action.payload);
    },
    removeDutyFromList(state, action) {
      state.list = state.list.filter(d => d.id !== action.payload);
    },
  },
});

export const {
  fetchDutiesStart, fetchDutiesSuccess, appendDutiesSuccess, fetchDutiesFailure,
  setSelectedDuty, setFilters, clearFilters, updateDutyInList, addDutyToList, removeDutyFromList,
} = dutySlice.actions;
export default dutySlice.reducer;
