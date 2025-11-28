const catchAsync = (fn) => {
  const errorHandler = (req, res, next) => {
    fn(req, res, next).catch((err) => {
      console.error("Async error caught:", err); // Console the error
      next(err); // Pass the error to the global error handler
    });
  };

  return errorHandler;
};

module.exports = catchAsync;
