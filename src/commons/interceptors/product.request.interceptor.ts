import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class TransformBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before...');
    const request = context.switchToHttp().getRequest();

    console.log('inteceptor', request.body);

    const now = Date.now();
    return next
      .handle()
      .pipe(tap(() => console.log(`ajajajajajajja ${request.body}`)));
  }
}
