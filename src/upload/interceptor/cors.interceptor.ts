// cors.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest();

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:3030',
      'https://waddle-admin.vercel.app',
      'https://waddle-admn.vercel.app',
      'https://waddleapp.io',
      'https://www.waddleapp.io',
    ];

    const origin = request.headers.origin;

    // Set CORS headers
    if (origin && allowedOrigins.includes(origin)) {
      response.header('Access-Control-Allow-Origin', origin);
    } else {
      response.header('Access-Control-Allow-Origin', '*');
    }

    response.header(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    response.header(
      'Access-Control-Allow-Headers',
      'Origin,X-Requested-With,Content-Type,Accept,Authorization',
    );
    response.header('Access-Control-Allow-Credentials', 'true');
    response.header('Access-Control-Max-Age', '86400');

    return next.handle().pipe(
      tap(() => {
        // Additional headers can be set here after the response
      }),
    );
  }
}
