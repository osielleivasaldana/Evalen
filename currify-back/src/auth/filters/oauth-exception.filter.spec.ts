import { OAuthExceptionFilter } from './oauth-exception.filter';
import { UnauthorizedException, ArgumentsHost, HttpStatus } from '@nestjs/common';

describe('OAuthExceptionFilter', () => {
  let filter: OAuthExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new OAuthExceptionFilter();
    mockResponse = { redirect: jest.fn() };
    mockRequest = { query: {} };
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ArgumentsHost;

    // Reset env
    delete process.env.FRONTEND_URL;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('invalid_grant error', () => {
    it('should redirect with invalid_grant code when message contains invalid_grant', () => {
      const exception = new UnauthorizedException('invalid_grant');

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=invalid_grant'),
      );
    });

    it('should redirect with invalid_grant code for authorization code errors', () => {
      const exception = new UnauthorizedException(
        'Authorization code has expired',
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=invalid_grant'),
      );
    });
  });

  describe('client_id / client_secret errors', () => {
    it('should redirect with misconfigured code for client_id errors', () => {
      const exception = new UnauthorizedException('Invalid client_id provided');

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=misconfigured'),
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('misconfigured'),
      );
    });

    it('should redirect with misconfigured code for client_secret errors', () => {
      const exception = new UnauthorizedException(
        'Invalid client_secret provided',
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=misconfigured'),
      );
    });
  });

  describe('unauthorized errors', () => {
    it('should redirect with unauthorized code for 401 status', () => {
      const exception = new UnauthorizedException('Access denied');

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=unauthorized'),
      );
    });

    it('should redirect with unauthorized code when message contains Unauthorized', () => {
      const exception = new UnauthorizedException('Unauthorized access');

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=unauthorized'),
      );
    });
  });

  describe('no_email errors', () => {
    it('should redirect with no_email code when message mentions email', () => {
      const exception = new UnauthorizedException(
        'Google account does not have an email',
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=no_email'),
      );
    });
  });

  describe('generic fallback', () => {
    it('should redirect with oauth_error code for unknown errors', () => {
      const exception = new UnauthorizedException('Some unknown error');

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=oauth_error'),
      );
    });
  });

  describe('FRONTEND_URL', () => {
    it('should use custom FRONTEND_URL when defined', () => {
      process.env.FRONTEND_URL = 'https://myapp.com';
      const exception = new UnauthorizedException('Some error');

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('https://myapp.com/auth/callback'),
      );
    });

    it('should use default localhost when FRONTEND_URL is not defined', () => {
      const exception = new UnauthorizedException('Some error');

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3000/auth/callback'),
      );
    });
  });

  describe('exception response formats', () => {
    it('should handle string response from exception', () => {
      const exception = new UnauthorizedException('plain string error');

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=oauth_error'),
      );
    });

    it('should handle object response from exception', () => {
      const exception = new UnauthorizedException({
        message: 'object error message',
        error: 'Unauthorized',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=oauth_error'),
      );
    });
  });
});
