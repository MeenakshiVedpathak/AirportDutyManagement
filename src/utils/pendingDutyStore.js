// Module-level singletons that live outside React's rendering cycle (never stale).

let _pending = null;
let _createdScanIndex = null;

export const setPendingDuty     = (v) => { _pending = v; };
export const consumePendingDuty = ()  => { const v = _pending; _pending = null; return v; };
export const hasPendingDuty     = ()  => !!_pending;

// Signal from CreateDutyScreen back to BoardingPassScanScreen: which card was just completed.
export const setCreatedScanIndex     = (i) => { _createdScanIndex = i; };
export const consumeCreatedScanIndex = ()  => { const v = _createdScanIndex; _createdScanIndex = null; return v; };
