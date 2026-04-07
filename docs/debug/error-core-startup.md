/app/node_modules/@prisma/client/src/runtime/core/engines/library/LibraryEngine.ts:440

          throw new PrismaClientInitializationError(error.message, this.config.clientVersion!, error.error_code)

                ^



PrismaClientInitializationError: Can't reach database server at `postgres:5432`


Please make sure your database server is running at `postgres:5432`.

    at r (/app/node_modules/@prisma/client/src/runtime/core/engines/library/LibraryEngine.ts:440:17)

    at Proxy.onModuleInit (/app/src/prisma/prisma.service.ts:7:5)

    at async Promise.all (index 0)

    at async callModuleInitHook (/app/node_modules/@nestjs/core/hooks/on-module-init.hook.js:43:5)

    at async NestApplication.callInitHook (/app/node_modules/@nestjs/core/nest-application-context.js:242:13)

    at async NestApplication.init (/app/node_modules/@nestjs/core/nest-application.js:103:9)

    at async NestApplication.listen (/app/node_modules/@nestjs/core/nest-application.js:175:13)

    at bootstrap (/app/src/main.ts:25:3) {

  clientVersion: '6.16.2',

  errorCode: 'P1001',

  retryable: undefined

}


Node.js v18.20.8