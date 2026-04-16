import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  TimeoutError,
  DuplicateError,
  InvalidStateError,
  BusinessLogicError,
  QueryError,
  isAppError,
  toAppError,
} from '../../../server/src/errors/AppError';

describe('AppError classes and utilities', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('AppError', () => {
    it('should create an error with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.name).toBe('AppError');
      expect(error.timestamp).toBeDefined();
    });

    it('should format JSON without stack by default', () => {
      process.env.NODE_ENV = 'development';
      const error = new AppError('Test error');
      const json = error.toJSON();
      expect(json.ok).toBe(false);
      expect(json.error.message).toBe('Test error');
      expect(json.error.stack).toBeUndefined();
    });

    it('should format JSON with stack in development when requested', () => {
      process.env.NODE_ENV = 'development';
      const error = new AppError('Test error');
      const json = error.toJSON(true);
      expect(json.error.stack).toBeDefined();
      expect(json.error.name).toBe('AppError');
    });

    it('should not include stack in production even if requested', () => {
      process.env.NODE_ENV = 'production';
      const error = new AppError('Test error');
      const json = error.toJSON(true);
      expect(json.error.stack).toBeUndefined();
    });

    it('should return safe user message', () => {
      const error = new AppError('Internal system failure');
      expect(error.getUserMessage()).toBe('Internal system failure');
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with details', () => {
      const details = { field: 'email', message: 'Invalid' };
      const error = new ValidationError('Bad request', details);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toBe(details);
      
      const json = error.toJSON();
      expect(json.error.details).toBe(details);
    });

    it('should have a specific user message', () => {
      const error = new ValidationError('Bad request');
      expect(error.getUserMessage()).toBe('Request validation failed. Please check your input and try again.');
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error', () => {
      const error = new NotFoundError('User');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('User not found');
      expect(error.getUserMessage()).toBe('The requested user could not be found.');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an unauthorized error', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.getUserMessage()).toBe('You must be authenticated to access this resource.');
    });
  });

  describe('ForbiddenError', () => {
    it('should create a forbidden error', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.getUserMessage()).toBe('You do not have permission to access this resource.');
    });
  });

  describe('ConflictError', () => {
    it('should create a conflict error', () => {
      const error = new ConflictError('State conflict');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.getUserMessage()).toBe('The requested action conflicts with current data. Please try again.');
    });
  });

  describe('RateLimitError', () => {
    it('should create a rate limit error', () => {
      const error = new RateLimitError(120);
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.retryAfter).toBe(120);
      
      const json = error.toJSON();
      expect(json.error.retryAfter).toBe(120);
      expect(error.getUserMessage()).toBe('Too many requests. Please try again after 120 seconds.');
    });
  });

  describe('DatabaseError', () => {
    it('should create a database error', () => {
      const originalError = { message: 'db fail', query: 'SELECT *', detail: 'syntax', code: '42601' };
      const error = new DatabaseError(originalError);
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.query).toBe('SELECT *');
      expect(error.detail).toBe('syntax');
      expect(error.getUserMessage()).toBe('A database error occurred. Please try again later.');
    });

    it('should include db details in JSON only in development', () => {
      const originalError = { message: 'db fail', query: 'SELECT *', detail: 'syntax', code: '42601' };
      const error = new DatabaseError(originalError);
      
      process.env.NODE_ENV = 'development';
      let json = error.toJSON();
      expect(json.error.database).toBeDefined();
      expect(json.error.database?.query).toBe('SELECT *');

      process.env.NODE_ENV = 'production';
      json = error.toJSON();
      expect(json.error.database).toBeUndefined();
    });
  });

  describe('ExternalServiceError', () => {
    it('should create an external service error', () => {
      const original = new Error('net fail');
      const error = new ExternalServiceError('Auth', 503, original);
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.service).toBe('Auth');
      expect(error.originalError).toBe(original);
      expect(error.getUserMessage()).toBe('External service (Auth) is temporarily unavailable. Please try again later.');
    });
  });

  describe('TimeoutError', () => {
    it('should create a timeout error', () => {
      const error = new TimeoutError('DB Query', 5000);
      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('TIMEOUT');
      expect(error.operation).toBe('DB Query');
      expect(error.timeoutMs).toBe(5000);
      expect(error.getUserMessage()).toBe('The operation took too long to complete. Please try again.');
    });
  });

  describe('DuplicateError', () => {
    it('should create a duplicate error', () => {
      const error = new DuplicateError('User', 'user@example.com');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('DUPLICATE_ENTRY');
      expect(error.resource).toBe('User');
      expect(error.identifier).toBe('user@example.com');
      expect(error.getUserMessage()).toBe('A user with this identifier already exists.');
    });
  });

  describe('InvalidStateError', () => {
    it('should create an invalid state error', () => {
      const error = new InvalidStateError('Cannot process', { status: 'PENDING' });
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('INVALID_STATE');
      expect(error.currentState).toEqual({ status: 'PENDING' });
      expect(error.getUserMessage()).toBe('The requested operation cannot be performed in the current state.');
    });
  });

  describe('BusinessLogicError', () => {
    it('should create a business logic error', () => {
      const error = new BusinessLogicError('Rule failed');
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('BUSINESS_LOGIC_ERROR');
      expect(error.getUserMessage()).toBe('The requested operation violates business rules.');
    });
  });

  describe('QueryError', () => {
    it('should create a query error', () => {
      const original = new Error('bad query');
      (original as any).code = 'XYZ';
      const error = new QueryError('Query failed', original);
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('QUERY_ERROR');
      expect(error.getUserMessage()).toBe('A query execution error occurred. Please try again later.');
    });

    it('should include original error details in dev mode', () => {
      process.env.NODE_ENV = 'development';
      const original = new Error('bad query');
      (original as any).code = 'XYZ';
      const error = new QueryError('Query failed', original);
      const json = error.toJSON();
      expect(json.error.originalError).toBeDefined();
      expect(json.error.originalError?.message).toBe('bad query');
      expect(json.error.originalError?.code).toBe('XYZ');

      process.env.NODE_ENV = 'production';
      const jsonProd = error.toJSON();
      expect(jsonProd.error.originalError).toBeUndefined();
    });
  });

  describe('isAppError', () => {
    it('should identify AppError instances', () => {
      expect(isAppError(new AppError('test'))).toBe(true);
      expect(isAppError(new NotFoundError('test'))).toBe(true);
      expect(isAppError(new Error('test'))).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError({})).toBe(false);
    });
  });

  describe('toAppError', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return the same AppError if passed one', () => {
      const err = new NotFoundError('test');
      expect(toAppError(err)).toBe(err);
    });

    it('should convert ECONNREFUSED to ExternalServiceError', () => {
      const err = new Error('conn refused');
      (err as any).code = 'ECONNREFUSED';
      const result = toAppError(err);
      expect(result).toBeInstanceOf(ExternalServiceError);
      expect(result.statusCode).toBe(503);
      expect((result as ExternalServiceError).service).toBe('Database');
    });

    it('should convert ENOTFOUND to ExternalServiceError', () => {
      const err = new Error('not found');
      (err as any).code = 'ENOTFOUND';
      const result = toAppError(err);
      expect(result).toBeInstanceOf(ExternalServiceError);
    });

    it('should convert POSTGRES error to DatabaseError', () => {
      const err = new Error('pg error');
      (err as any).code = 'POSTGRES_XYZ';
      const result = toAppError(err);
      expect(result).toBeInstanceOf(DatabaseError);
    });

    it('should convert timeout message to TimeoutError', () => {
      const err = new Error('request timeout occurred');
      const result = toAppError(err);
      expect(result).toBeInstanceOf(TimeoutError);
      expect(result.statusCode).toBe(504);
    });

    it('should convert unpopulated db message to special AppError', () => {
      const err = new Error('db has not been populated yet');
      const result = toAppError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(503);
      expect(result.code).toBe('DB_INITIALIZING');
      expect(result.getUserMessage()).toContain('synchronizing');
    });

    it('should fallback to 500 INTERNAL_ERROR for generic errors in development', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('weird error');
      const result = toAppError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
      expect(result.code).toBe('INTERNAL_ERROR');
      expect(result.message).toBe('weird error');
    });

    it('should fallback to 500 INTERNAL_ERROR generic message in production', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('weird error');
      const result = toAppError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
      expect(result.code).toBe('INTERNAL_ERROR');
      expect(result.message).toBe('An unexpected error occurred');
      expect(console.error).toHaveBeenCalled();
    });
  });
});