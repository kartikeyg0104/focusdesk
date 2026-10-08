class AppError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  toPayload() {
    return {
      ok: false,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

function toErrorPayload(error) {
  if (error instanceof AppError) {
    return error.toPayload();
  }

  return {
    ok: false,
    code: 'UNEXPECTED',
    message: 'Something went wrong. Try again, or check Settings if this keeps happening.',
    details: null,
  };
}

function ok(data) {
  return { ok: true, data };
}

module.exports = { AppError, toErrorPayload, ok };
