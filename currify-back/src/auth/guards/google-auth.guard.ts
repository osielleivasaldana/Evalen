import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    // Extract the state query parameter
    let state = request.query.state;
    this.logger.log(`[GoogleAuthGuard] Raw query state: ${JSON.stringify(state)}`);

    if (Array.isArray(state)) {
      state = state.find((s: any) => s && s !== '') || '';
    }

    this.logger.log(`[GoogleAuthGuard] Selected state to pass: ${state}`);

    return {
      state: state || undefined,
    };
  }
}
