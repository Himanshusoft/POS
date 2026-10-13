export const sendSuccess = (res, statusCode = 200, message = 'Operation successful', data = {}, meta = undefined) => {
  if (meta === undefined && data && Array.isArray(data.items) && data.meta) {
    meta = data.meta;
    data = data.items;
  }
  const payload = {
    success: true,
    message,
    data: data !== null ? data : {},
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

export const sendError = (res, statusCode = 500, message = 'Something went wrong', error = {}, extra = {}) => {
  let errorsList = [];
  let code = extra?.code;
  let items = extra?.items;

  if (error && typeof error === 'object' && !Array.isArray(error)) {
    if (error.code && !code) code = error.code;
    if (error.items !== undefined && items === undefined) items = error.items;
  }

  if (Array.isArray(error)) {
    errorsList = error;
  } else if (error?.validationErrors && Array.isArray(error.validationErrors)) {
    errorsList = error.validationErrors;
  } else if (error?.details) {
    errorsList = Array.isArray(error.details) ? error.details : [error.details];
  } else if (typeof error === 'string') {
    errorsList = [error];
  }

  const payload = {
    success: false,
    message,
    errors: errorsList,
  };

  if (code) {
    payload.code = code;
  }
  if (items !== undefined) {
    payload.items = items;
  }

  return res.status(statusCode).json(payload);
};

export default {
  sendSuccess,
  sendError,
};
