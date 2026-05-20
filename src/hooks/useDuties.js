import {useDispatch, useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';
import {fetchDutiesStart, fetchDutiesSuccess, appendDutiesSuccess, fetchDutiesFailure, updateDutyInList, addDutyToList, setSelectedDuty, setFilters as setFiltersAction} from '../store/slices/dutySlice';
import {getDuties, getDutyById, createDuty, updateDutyStatus, confirmDuty as confirmDutyAPI} from '../api/dutyApi';

const PAGE_SIZE = 20;

export const useDuties = () => {
  const dispatch = useDispatch();
  const dutyState = useSelector(state => state.duties);

  const fetchDuties = async (filters = {}) => {
    dispatch(fetchDutiesStart());
    try {
      const res = await getDuties({...filters, page: 1, limit: PAGE_SIZE});
      const data = res.data;
      dispatch(fetchDutiesSuccess({duties: data.duties || data, total: data.total || 0, hasMore: data.hasMore ?? false}));
    } catch (err) {
      dispatch(fetchDutiesFailure(err?.message || 'Failed to fetch duties'));
    }
  };

  const loadMore = async (filters = {}) => {
    const {pagination} = dutyState;
    if (!pagination.hasMore || dutyState.isLoading) return;
    const nextPage = pagination.page + 1;
    dispatch(fetchDutiesStart());
    try {
      const res = await getDuties({...filters, page: nextPage, limit: PAGE_SIZE});
      const data = res.data;
      dispatch(appendDutiesSuccess({duties: data.duties || [], total: data.total || 0, hasMore: data.hasMore ?? false, page: nextPage}));
    } catch (err) {
      dispatch(fetchDutiesFailure(err?.message || 'Failed to load more duties'));
    }
  };

  const fetchDuty = async id => {
    try {
      const res = await getDutyById(id);
      dispatch(setSelectedDuty(res.data));
      return res.data;
    } catch {
      Toast.show({type: 'error', text1: 'Error', text2: 'Failed to load duty details'});
    }
  };

  const addDuty = async data => {
    try {
      const res = await createDuty(data);
      dispatch(addDutyToList(res.data));
      Toast.show({type: 'success', text1: 'Duty Created', text2: 'Duty has been created successfully'});
      return res.data;
    } catch (err) {
      Toast.show({type: 'error', text1: 'Error', text2: err?.message || 'Failed to create duty'});
      return null;
    }
  };

  const changeStatus = async (id, status) => {
    try {
      const res = await updateDutyStatus(id, status);
      dispatch(updateDutyInList(res.data));
      Toast.show({type: 'success', text1: 'Status Updated', text2: `Duty marked as ${status.toLowerCase()}`});
      return res.data;
    } catch (err) {
      Toast.show({type: 'error', text1: 'Error', text2: err?.message || 'Failed to update status'});
      return null;
    }
  };

  const confirmDuty = async id => {
    try {
      const res = await confirmDutyAPI(id);
      dispatch(updateDutyInList(res.data));
      Toast.show({type: 'success', text1: 'Confirmed', text2: 'Duty confirmed successfully'});
      return res.data;
    } catch (err) {
      Toast.show({type: 'error', text1: 'Error', text2: err?.message || 'Failed to confirm duty'});
      return null;
    }
  };

  const setFilters = filters => dispatch(setFiltersAction(filters));

  return {...dutyState, fetchDuties, loadMore, fetchDuty, addDuty, changeStatus, confirmDuty, setFilters};
};
