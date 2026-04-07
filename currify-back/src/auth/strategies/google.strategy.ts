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
            const user = {
                email: emails?.[0]?.value,
                firstName: name?.givenName,
                lastName: name?.familyName,
                picture: photos?.[0]?.value,
                accessToken,
                googleId: id,
            };

            if (!user.email) {
                this.logger.error('Google profile did not return an email address');
                return done(new UnauthorizedException('Google account does not have an email'), false);
            }

            const payload = await this.authService.validateOAuthLogin(user, 'google');
            done(null, payload);
        } catch (error) {
            this.logger.error(`Google OAuth validation failed: ${error.message}`, error.stack);
            done(error, false);
        }
    }
}
