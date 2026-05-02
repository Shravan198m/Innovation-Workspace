function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Invalid request payload.",
        details: error.details.map((item) => item.message),
      });
    }

    req.body = value;
    return next();
  };
}

module.exports = {
  validateBody,
};
