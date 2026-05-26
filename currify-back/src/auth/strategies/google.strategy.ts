import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    private readonly logger = new Logger(GoogleStrategy.name);

    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
        const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/api/auth/google/callback';

        const logger = new Logger('GoogleStrategyInit');
        logger.log(`Initializing Google Strategy with ID: ${clientID?.substring(0, 10)}...`);
        logger.log(`Secret starts with: ${clientSecret?.substring(0, 8)}...`);
        logger.log(`Callback URL: ${callbackURL}`);

        if (!clientID || clientID === 'dummy-client-id' || !clientSecret || clientSecret === 'dummy-client-secret') {
            Logger.warn(
                '[GoogleStrategy] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not configured. ' +
                'Google OAuth will fail with "invalid_grant". Set these variables in your .env file.',
                'GoogleStrategy',
            );
        }

        super({
            clientID: clientID || 'dummy-client-id',
            clientSecret: clientSecret || 'dummy-client-secret',
            callbackURL,
            scope: ['email', 'profile'],
            passReqToCallback: false,
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        try {
            const { name, emails, photos, id } = profile;
            
            if (!emails || emails.length === 0 || !emails[0].value) {
                throw new UnauthorizedException('Google account must have an email');
            }
            
            this.logger.log(`[GoogleStrategy] Received profile for email: ${emails?.[0]?.value}`);

            const user = {
                email: emails?.[0]?.value,
                firstName: name?.givenName,
                lastName: name?.familyName,
                picture: photos?.[0]?.value,
                accessToken,
                googleId: id,
            };

            const result = await this.authService.validateOAuthLogin(user, 'google');
            done(null, result);
        } catch (error) {
            this.logger.error(`[GoogleStrategy] Validation failed for Google user: ${error.message}`);
            // Forward the error to the filter instead of just calling done(error, false) 
            // to ensure it reaches our custom OAuthExceptionFilter
            done(error, false);
        }
    }
}
