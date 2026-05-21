const Duty = require('../models/Duty');
const User = require('../models/User');
const { generateDutyReportPDF, generateSubordinateReportPDF } = require('../utils/pdfGenerator');

const INCENTIVE_AMOUNT = 500;
const INCENTIVE_TYPES = ['BEFORE_OFFICE', 'AFTER_OFFICE'];

exports.getDutyReport = async (req, res, next) => {
  try {
    const { officerId, airportId, status, dateFrom, dateTo } = req.query;
    const filter = {};

    if (req.user.role === 'OFFICER') filter.officerId = req.user._id;
    if (officerId && req.user.role === 'ADMIN') filter.officerId = officerId;
    if (airportId) filter.airportId = airportId;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }

    const REPORT_CAP = 500;
    const allDuties = await Duty.find(filter).sort({ date: -1 });
    const capped = allDuties.length > REPORT_CAP;
    const duties = capped ? allDuties.slice(0, REPORT_CAP) : allDuties;
    const completedIncentiveDuties = duties.filter(
      d => d.status === 'COMPLETED' && INCENTIVE_TYPES.includes(d.officeType)
    );

    res.json({
      duties: duties.map(d => d.toJSON()),
      capped,
      totalUnfiltered: allDuties.length,
      summary: {
        total: duties.length,
        completed: duties.filter(d => d.status === 'COMPLETED').length,
        upcoming: duties.filter(d => d.status === 'UPCOMING').length,
        cancelled: duties.filter(d => d.status === 'CANCELLED').length,
        totalIncentive: completedIncentiveDuties.length * INCENTIVE_AMOUNT,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getSubordinateReport = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const dutyFilter = {};

    if (dateFrom || dateTo) {
      dutyFilter.date = {};
      if (dateFrom) dutyFilter.date.$gte = dateFrom;
      if (dateTo) dutyFilter.date.$lte = dateTo;
    }

    const officers = await User.find({ role: 'OFFICER' });
    const duties = await Duty.find(dutyFilter);

    const report = officers.map(officer => {
      const officerDuties = duties.filter(
        d => d.officerId && d.officerId.toString() === officer._id.toString()
      );
      const completedIncentive = officerDuties.filter(
        d => d.status === 'COMPLETED' && INCENTIVE_TYPES.includes(d.officeType)
      );
      return {
        officer: officer.toJSON(),
        totalDuties: officerDuties.length,
        completed: officerDuties.filter(d => d.status === 'COMPLETED').length,
        upcoming: officerDuties.filter(d => d.status === 'UPCOMING').length,
        cancelled: officerDuties.filter(d => d.status === 'CANCELLED').length,
        beforeOffice: officerDuties.filter(d => d.officeType === 'BEFORE_OFFICE').length,
        afterOffice: officerDuties.filter(d => d.officeType === 'AFTER_OFFICE').length,
        totalIncentive: completedIncentive.length * INCENTIVE_AMOUNT,
        officeTimeDuty: officerDuties.filter(d => d.officeType === 'REGULAR').length,
        holidayBeforeAfterDuty: officerDuties.filter(d => ['HOLIDAY', 'BEFORE_OFFICE', 'AFTER_OFFICE'].includes(d.officeType)).length,
      };
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
};

exports.exportDutyPDF = async (req, res, next) => {
  try {
    const { officerId, airportId, status, dateFrom, dateTo } = req.query;
    const filter = {};
    if (req.user.role === 'OFFICER') filter.officerId = req.user._id;
    if (officerId && req.user.role === 'ADMIN') filter.officerId = officerId;
    if (airportId) filter.airportId = airportId;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }
    const duties = await Duty.find(filter).sort({ date: -1 });
    const base64 = await generateDutyReportPDF(duties.map(d => d.toJSON()), req.query);
    const buf = Buffer.from(base64, 'base64');
    const filename = `DutyReport_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buf.length });
    res.send(buf);
  } catch (err) {
    next(err);
  }
};

exports.exportSubordinatePDF = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const dutyFilter = {};
    if (dateFrom || dateTo) {
      dutyFilter.date = {};
      if (dateFrom) dutyFilter.date.$gte = dateFrom;
      if (dateTo) dutyFilter.date.$lte = dateTo;
    }
    const officers = await User.find({ role: 'OFFICER' });
    const duties = await Duty.find(dutyFilter);
    const report = officers.map(officer => {
      const officerDuties = duties.filter(d => d.officerId && d.officerId.toString() === officer._id.toString());
      const completedIncentive = officerDuties.filter(d => d.status === 'COMPLETED' && ['BEFORE_OFFICE', 'AFTER_OFFICE'].includes(d.officeType));
      return {
        officer: officer.toJSON(),
        totalDuties: officerDuties.length,
        completed: officerDuties.filter(d => d.status === 'COMPLETED').length,
        upcoming: officerDuties.filter(d => d.status === 'UPCOMING').length,
        cancelled: officerDuties.filter(d => d.status === 'CANCELLED').length,
        beforeOffice: officerDuties.filter(d => d.officeType === 'BEFORE_OFFICE').length,
        afterOffice: officerDuties.filter(d => d.officeType === 'AFTER_OFFICE').length,
        totalIncentive: completedIncentive.length * 500,
        officeTimeDuty: officerDuties.filter(d => d.officeType === 'REGULAR').length,
        holidayBeforeAfterDuty: officerDuties.filter(d => ['HOLIDAY', 'BEFORE_OFFICE', 'AFTER_OFFICE'].includes(d.officeType)).length,
      };
    });
    const base64 = await generateSubordinateReportPDF(report);
    const buf = Buffer.from(base64, 'base64');
    const filename = `SubordinateReport_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buf.length });
    res.send(buf);
  } catch (err) {
    next(err);
  }
};
