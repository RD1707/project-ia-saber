// middlewares/validator.js
const { body, validationResult } = require('express-validator');

const userRegistrationRules = () => {
  return [
    body('name').isLength({ min: 3 }).withMessage('O nome deve ter pelo menos 3 caracteres.'),
    body('email').isEmail().withMessage('Forneça um email válido.'),
    body('password').isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres.'),
  ];
};

const userLoginRules = () => {
  return [
    body('email').isEmail().withMessage('Forneça um email válido.'),
    body('password').notEmpty().withMessage('A senha é obrigatória.'),
  ];
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }));

  return res.status(422).json({
    errors: extractedErrors,
  });
};

module.exports = {
  userRegistrationRules,
  userLoginRules,
  validate,
};