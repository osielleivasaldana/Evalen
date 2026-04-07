[Nest] 61  - 04/06/2026, 1:29:34 AM     LOG [NestApplication] Nest application successfully started +3ms

🚀 Currify Backend running on port 3001

[Nest] 61  - 04/06/2026, 1:43:17 AM   ERROR [GoogleStrategy] Google OAuth validation failed: 

Invalid `prisma.user.findUnique()` invocation:



The table `public.users` does not exist in the current database.

PrismaClientKnownRequestError: 

Invalid `prisma.user.findUnique()` invocation:



The table `public.users` does not exist in the current database.

    at ei.handleRequestError (/app/node_modules/@prisma/client/src/runtime/RequestHandler.ts:228:13)

    at ei.handleAndLogRequestError (/app/node_modules/@prisma/client/src/runtime/RequestHandler.ts:174:12)

    at ei.request (/app/node_modules/@prisma/client/src/runtime/RequestHandler.ts:143:12)

    at a (/app/node_modules/@prisma/client/src/runtime/getPrismaClient.ts:833:24)

    at AuthService.validateOAuthLogin (/app/src/auth/auth.service.ts:228:16)

    at GoogleStrategy.validate (/app/src/auth/strategies/google.strategy.ts:58:29)

    at async GoogleStrategy.callback [as _verify] (/app/node_modules/@nestjs/passport/dist/passport/passport.strategy.js:13:44)

[Nest] 61  - 04/06/2026, 1:43:17 AM   ERROR [ExceptionsHandler] PrismaClientKnownRequestError: 

Invalid `prisma.user.findUnique()` invocation:



The table `public.users` does not exist in the current database.

    at ei.handleRequestError (/app/node_modules/@prisma/client/src/runtime/RequestHandler.ts:228:13)

    at ei.handleAndLogRequestError (/app/node_modules/@prisma/client/src/runtime/RequestHandler.ts:174:12)

    at ei.request (/app/node_modules/@prisma/client/src/runtime/RequestHandler.ts:143:12)

    at a (/app/node_modules/@prisma/client/src/runtime/getPrismaClient.ts:833:24)

    at AuthService.validateOAuthLogin (/app/src/auth/auth.service.ts:228:16)

    at GoogleStrategy.validate (/app/src/auth/strategies/google.strategy.ts:58:29)

    at async GoogleStrategy.callback [as _verify] (/app/node_modules/@nestjs/passport/dist/passport/passport.strategy.js:13:44) {

  code: 'P2021',

  meta: {

    modelName: 'User',

    table: 'public.users'

  },

  clientVersion: '6.16.2'

}