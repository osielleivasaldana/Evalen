import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Catches OAuth-related exceptions thrown by AuthGuard('google')
 * and redirects to the frontend with user-friendly error parameters.
 *
 * This filter enables the use of @UseGuards(AuthGuard('google'))
 * while still providing graceful error handling via redirect.
 */
@Catch(UnauthorizedException)
export class OAuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthExceptionFilter.name);

  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const exceptionResponse = exception.getResponse();
    const statusCode = exception.getStatus();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || 'Authentication failed';

    this.logger.error(
      `OAuth exception [${statusCode}]: ${message}`,
      exception.stack,
    );

    const errorInfo = this.mapOAuthError(message, statusCode);

    const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorInfo.code)}&message=${encodeURIComponent(errorInfo.message)}`;

    response.redirect(redirectUrl);
  }

  /**
   * Maps OAuth error messages to user-friendly codes and messages.
   * Order matters: specific checks must come before generic ones.
   */
  private mapOAuthError(
    message: string,
    _statusCode: number,
  ): { code: string; message: string } {
    const lowerMessage = message.toLowerCase();

    // 1. Specific: invalid_grant / expired authorization code
    if (
      lowerMessage.includes('invalid_grant') ||
      lowerMessage.includes('authorization code')
    ) {
      return {
        code: 'invalid_grant',
        message:
          'Google authentication failed. The authorization code expired or was invalid. Please try signing in again.',
      };
    }

    // 2. Specific: misconfigured credentials
    if (
      lowerMessage.includes('client_id') ||
      lowerMessage.includes('client_secret')
    ) {
      return {
        code: 'misconfigured',
        message:
          'Authentication service is misconfigured. Please contact support.',
      };
    }

    // 3. Specific: missing email from Google profile
    if (lowerMessage.includes('email')) {
      return {
        code: 'no_email',
        message:
          'Your Google account does not have a verified email address. Please use a different account.',
      };
    }

    // 4. Specific: explicit "unauthorized" in message text
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('denied')) {
      return {
        code: 'unauthorized',
        message:
          'Google authentication was denied. Please check your Google account settings and try again.',
      };
    }

    // 5. Generic fallback
    return {
      code: 'oauth_error',
      message: 'Authentication failed. Please try again.',
    };
  }
}
