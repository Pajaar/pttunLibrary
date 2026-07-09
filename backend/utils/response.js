exports.success = (res, message, data = null) => {
  res.json({
    message,
    data,
  });
};

exports.error = (res, statusCode, message, detail = null) => {
  res.status(statusCode).json({
    message,
    detail,
  });
};
