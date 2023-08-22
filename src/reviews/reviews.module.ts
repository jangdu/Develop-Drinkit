import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/entities/product.entity';
import { Discount } from 'src/entities/discout.entity';
import { User } from 'src/entities/user.entity';
import { Review } from 'src/entities/review.entity';
import { ReviewsRepository } from './reviews.repository';
import { PaymentLog } from 'src/entities/paymentLog.entity';
import { PaymentDetail } from 'src/entities/paymentDetail.entity';
import { UsersRepository } from 'src/user/users.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      PaymentLog,
      PaymentDetail,
      Discount,
      Review,
      User,
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository, UsersRepository],
})
export class ReviewsModule {}
