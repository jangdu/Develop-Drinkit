import {
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { PaymentLogRepository } from './paymentLogs.repository';
import { PaymentDetailRepository } from './paymentDetails.repository';
import { Store_ProductsRepository } from 'src/stores/stores_products.repository';
import { StoresRepository } from 'src/stores/stores.repository';
import { UsersRepository } from 'src/auth/users.repository';
import { ProductsRepository } from 'src/products/products.repository';
import { Product } from 'src/entities/product.entity';
import { User } from 'src/entities/user.entity';
import { Store_Product } from 'src/entities/store_product.entity';
import { PaymentStatus } from 'src/entities/paymentLog.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    private paymentLogsRepository: PaymentLogRepository,
    private paymentDetailsRepository: PaymentDetailRepository,
    private store_ProductsRepository: Store_ProductsRepository,
    private storesRepository: StoresRepository,
    private usersRepository: UsersRepository,
    private productsRepository: ProductsRepository,
  ) {}

  async getOrders(userId: number) {
    const getOrdersData = await this.paymentLogsRepository.getOrders(userId);
    return getOrdersData;
  }

  async getOrdersDetail(paymentLogId: number) {
    const getOrdersDetailData =
      await this.paymentDetailsRepository.getOrdersDetail(paymentLogId);
    return getOrdersDetailData;
  }
  async getStore(storeId: number) {
    const getStoreData = await this.storesRepository
      .createQueryBuilder('store')
      .where('store.id = :storeId', { storeId })
      .getOne();
    return getStoreData;
  }

  async getStoreOrders(userId: number, storeId: number) {
    const getStoreData = await this.getStore(storeId);
    if (getStoreData.userId != userId) {
      throw new PreconditionFailedException();
    }
    const getStoreOrdersData = await this.paymentLogsRepository.getStoreOrders(
      storeId,
    );

    return getStoreOrdersData;
  }

  async getAdminOrders(userId: number) {
    const getUserData = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!getUserData.isAdmin) {
      throw new PreconditionFailedException('권한이 없습니다.');
    }

    const getAdminOrdersData =
      await this.paymentLogsRepository.getAdminOrders();

    return getAdminOrdersData;
  }

  async updateOrdersStatusByStore(userId: number, paymentLogId: number) {
    const getPaymentLogData = await this.paymentLogsRepository.getPaymentLog(
      paymentLogId,
    );
    const getStoreData = await this.getStore(getPaymentLogData.storeId);

    if (getStoreData.userId != userId) {
      throw new PreconditionFailedException('권한이 없습니다.');
    }

    let status: PaymentStatus;
    if (getPaymentLogData.status == PaymentStatus.ORDER_PENDING) {
      status = PaymentStatus.READY;
    } else if (getPaymentLogData.status == PaymentStatus.READY) {
      status = PaymentStatus.READY_COMPLETE;
    } else if (getPaymentLogData.status == PaymentStatus.READY_COMPLETE) {
      status = PaymentStatus.PICKUP;
    } else if (getPaymentLogData.status == PaymentStatus.PICKUP) {
      status = PaymentStatus.COMPLETE;
    }

    const updateOrdersStatusByStoreData =
      await this.paymentLogsRepository.updateOrdersStatus(paymentLogId, status);
    return updateOrdersStatusByStoreData;
  }

  async updateOrdersStatusByAdmin(userId: number, paymentLogId: number) {
    const getUserData = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!getUserData.isAdmin) {
      throw new PreconditionFailedException('권한이 없습니다.');
    }

    const getPaymentLogData = await this.paymentLogsRepository.getPaymentLog(
      paymentLogId,
    );

    if (getPaymentLogData.storeId != 1) {
      throw new PreconditionFailedException('권한이 없습니다.');
    }

    let status: PaymentStatus;
    if (getPaymentLogData.status == PaymentStatus.ORDER_PENDING) {
      status = PaymentStatus.READY;
    } else if (getPaymentLogData.status == PaymentStatus.READY) {
      status = PaymentStatus.READY_COMPLETE;
    } else if (getPaymentLogData.status == PaymentStatus.READY_COMPLETE) {
      status = PaymentStatus.DELIVERY;
    } else if (getPaymentLogData.status == PaymentStatus.DELIVERY) {
      status = PaymentStatus.COMPLETE;
    }

    const updateOrdersStatusByStoreData =
      await this.paymentLogsRepository.updateOrdersStatus(paymentLogId, status);
    return updateOrdersStatusByStoreData;
  }

  async checkOrderList(
    orderList: Array<{ productId: number; count: number }>,
    userId: number,
    usePoint: boolean,
    storeId: number,
  ) {
    const productIdList: Array<number> = [];
    const countList: Array<number> = [];

    orderList.forEach((v) => {
      productIdList.push(v.productId);
      countList.push(v.count);
    });

    if (storeId != 1) {
      const totalStockByStoreProductData = await this.store_ProductsRepository
        .createQueryBuilder('store_product')
        .where('store_product.productId IN (:...ids)', { ids: productIdList })
        .getMany();

      totalStockByStoreProductData.forEach((v, i: number) => {
        if (countList[i] > v.totalStock) {
          throw new PreconditionFailedException();
        }
      });
    } else {
      const totalStockByProductData = await this.productsRepository
        .createQueryBuilder('product')
        .where('product.id IN (:...ids)', { ids: productIdList })
        .getMany();

      totalStockByProductData.forEach((v, i: number) => {
        if (countList[i] > v.totalStock) {
          throw new PreconditionFailedException();
        }
      });
    }

    if (usePoint) {
      const userPointData = await this.usersRepository
        .createQueryBuilder('user')
        .where('user.id = :userId', { userId })
        .getOne();
      return userPointData.point;
    }

    return 0;
  }

  async postOrder(
    userId: number,
    paidPoint: number,
    totalPrice: number,
    orderList: Array<{ productId: number; count: number }>,
    storeId: number | null,
  ) {
    await this.dataSource.transaction(async (manager) => {
      //paymentLog 생성
      const postPaymentLogData =
        await this.paymentLogsRepository.postPaymentLog(
          userId,
          totalPrice,
          storeId,
          paidPoint,
          manager,
        );

      const paymentLogId = postPaymentLogData.identifiers[0].id;
      const paymentDetailArray: Array<{
        productId: number;
        paymentLogId: number;
        count: number;
      }> = [];
      const productIdList: Array<number> = [];
      const countList: Array<number> = [];

      orderList.forEach((v) => {
        paymentDetailArray.push({
          productId: v.productId,
          paymentLogId,
          count: v.count,
        });
        productIdList.push(v.productId);
        countList.push(v.count);
      });

      //paymentDetail 생성
      const postPaymentDetailData =
        await this.paymentDetailsRepository.postPaymentDetail(
          paymentDetailArray,
          manager,
        );

      //유저 포인트 계산 후 업데이트
      const addPoint = totalPrice * 0.05 - paidPoint;

      const updateUserPointData = await manager
        .createQueryBuilder()
        .update(User)
        .set({ point: () => `point + ${addPoint}` })
        .where('id = :id', { id: userId })
        .execute();

      if (storeId != 1) {
        //store_product 재고 업데이트
        for (let i = 0; i < countList.length; i++) {
          await manager
            .createQueryBuilder()
            .update(Store_Product)
            .set({ totalStock: () => `totalStock - ${countList[i]}` })
            .where('productId = :productId', { productId: productIdList[i] })
            .execute();
        }
        // const updateTotalStockByStoreProduct = await manager
        //   .createQueryBuilder()
        //   .update(Store_Product)
        //   .set({ totalStock: () => `totalStock - 1` })
        //   // .set({
        //   //   totalStock: () => {
        //   //     for (let i = 0; i < countList.length; i++) {
        //   //       `totalStock - ${countList}`;
        //   //     }
        //   //   },
        //   // })
        //   .where('productId IN (:...ids)', { ids: productIdList })
        //   .execute();
      } else {
        //product 재고 업데이트
        // const updateTotalStockByProduct = await manager
        //   .createQueryBuilder()
        //   .update(Product)
        //   .set({
        //     totalStock: () => {
        //       for (let i = 0; i < countList.length; i++) {
        //         `totalStock - ${countList[i]}`;
        //       }
        //     },
        //   })
        //   .where('id IN (:...ids)', { ids: productIdList })
        //   .execute();
        for (let i = 0; i < countList.length; i++) {
          await manager
            .createQueryBuilder()
            .update(Product)
            .set({
              totalStock: () => `totalStock - ${countList[i]}`,
            })
            .where('id = :productId', { productId: productIdList[i] })
            .execute();
        }
        // const updateTotalStockByProduct = manager
        //   .createQueryBuilder()
        //   .update(Product)
        //   .set({ totalStock: () => `totalStock - ${countList}` })
        //   // .set({
        //   //   totalStock: () => {
        //   //     for (let i = 0; i < countList.length; i++) {
        //   //       `totalStock - ${countList}`;
        //   //     }
        //   //   },
        //   // })
        //   .where('id IN (:...ids)', { ids: productIdList })
        //   .execute();
      }
      //todo: 레디스 누적판매량갱신(추후)
      return '결제 완료';
    });
  }

  //

  // 고객 주문 취소 요청
  async requestCancelOrder(userId: number, paymentLogId: number) {
    const getPaymentLogData = await this.paymentLogsRepository.getPaymentLog(
      paymentLogId,
    );

    if (getPaymentLogData.userId != userId) {
      throw new PreconditionFailedException('권한이 없습니다.');
    }

    if (getPaymentLogData.status == PaymentStatus.WAIT_CANCELL) {
      throw new NotFoundException('이미 처리된 요청입니다.');
    }

    const requestCancelOrderData =
      await this.paymentLogsRepository.updateOrdersStatus(
        paymentLogId,
        PaymentStatus.WAIT_CANCELL,
      );

    return requestCancelOrderData;
  }

  // 고객 주문 취소 승인
  async cancelOrderByCustomer(userId: number, paymentLogId: number) {
    const getPaymentLogData = await this.paymentLogsRepository.getPaymentLog(
      paymentLogId,
    );

    const getUserData = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .getOne();

    const getOrdersDetailData =
      await this.paymentDetailsRepository.getOrdersDetail(paymentLogId);

    if (getPaymentLogData.storeId) {
      const getStoreData = await this.storesRepository
        .createQueryBuilder('store')
        .where('store.userId = :userId', { userId })
        .getOne();
      if (getPaymentLogData.storeId != Number(getStoreData.id)) {
        throw new PreconditionFailedException('권한이 없습니다.');
      }
    } else {
      if (getUserData.isAdmin != true) {
        throw new PreconditionFailedException('권한이 없습니다.');
      }
    }

    let productIdList: Array<number>;
    let countList: Array<number>;

    getOrdersDetailData.forEach((v) => {
      productIdList.push(v.productId);
      countList.push(v.count);
    });

    const addPoint =
      getPaymentLogData.paidPoint - getPaymentLogData.totalPrice * 0.05;

    await this.dataSource.transaction(async (manager) => {
      // 픽업/배송 여부
      if (getPaymentLogData.storeId) {
        const updateTotalStockByStoreProduct = await manager
          .createQueryBuilder()
          .update(Store_Product)
          .set({ totalStock: () => `totalStock - ${countList}` })
          .where('productId IN (:productId)', {
            productId: productIdList,
          })
          .execute();
      } else {
        const updateTotalStockByProduct = manager
          .createQueryBuilder()
          .update(Product)
          .set({ totalStock: () => `totalStock - ${countList}` })
          .where('id IN (:id)', {
            id: productIdList,
          })
          .execute();
      }

      const updateUserPointData = await manager
        .createQueryBuilder()
        .update(User)
        .set({ point: () => `point + ${addPoint}` })
        .where('id = :id', { id: userId })
        .execute();

      const deletePaymentDetailsData =
        await this.paymentDetailsRepository.deletePaymentDetails(
          paymentLogId,
          manager,
        );

      const deletePaymentLogData =
        await this.paymentLogsRepository.deletePaymentLog(
          paymentLogId,
          manager,
        );

      return '환불 / 반품 요청이 완료되었습니다.';
    });
  }

  //스토어 주문 취소
  async cancelOrderByStore(
    userId: number,
    paymentLogId: number,
    storeId: number,
  ) {
    const getPaymentLogData = await this.paymentLogsRepository.getPaymentLog(
      paymentLogId,
    );

    if (getPaymentLogData.storeId != storeId) {
      throw new PreconditionFailedException('권한이 없습니다.');
    }

    const getStoreData = await this.storesRepository
      .createQueryBuilder('user')
      .where('user.userId = :userId', { userId })
      .getOne();

    if (getStoreData.userId != userId) {
      throw new PreconditionFailedException('권한이 없습니다.');
    }

    const getOrdersDetailData =
      await this.paymentDetailsRepository.getOrdersDetail(paymentLogId);

    let productIdList: Array<number>;
    let countList: Array<number>;

    getOrdersDetailData.forEach((v) => {
      productIdList.push(v.productId);
      countList.push(v.count);
    });

    const addPoint =
      getPaymentLogData.paidPoint - getPaymentLogData.totalPrice * 0.05;

    await this.dataSource.transaction(async (manager) => {
      const updateTotalStockByStoreProduct = await manager
        .createQueryBuilder()
        .update(Store_Product)
        .set({ totalStock: () => `totalStock - ${countList}` })
        .where('productId IN (:productId)', {
          productId: productIdList,
        })
        .execute();

      const updateUserPointData = await manager
        .createQueryBuilder()
        .update(User)
        .set({ point: () => `point + ${addPoint}` })
        .where('id = :id', { id: getPaymentLogData.userId })
        .execute();

      const deletePaymentDetailsData =
        await this.paymentDetailsRepository.deletePaymentDetails(
          paymentLogId,
          manager,
        );

      const deletePaymentLogData =
        await this.paymentLogsRepository.deletePaymentLog(
          paymentLogId,
          manager,
        );

      return '주문이 취소되었습니다.';
    });
  }

  // 관리자 주문 취소
  async cancelOrderByAdmin(userId: number, paymentLogId: number) {
    const getUserData = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!getUserData.isAdmin) {
      throw new PreconditionFailedException('권한이 없습니다.');
    }

    const getPaymentLogData = await this.paymentLogsRepository.getPaymentLog(
      paymentLogId,
    );

    const getOrdersDetailData =
      await this.paymentDetailsRepository.getOrdersDetail(paymentLogId);

    let productIdList: Array<number>;
    let countList: Array<number>;

    getOrdersDetailData.forEach((v) => {
      productIdList.push(v.productId);
      countList.push(v.count);
    });

    const addPoint =
      getPaymentLogData.paidPoint - getPaymentLogData.totalPrice * 0.05;

    await this.dataSource.transaction(async (manager) => {
      const updateTotalStockByProduct = manager
        .createQueryBuilder()
        .update(Product)
        .set({ totalStock: () => `totalStock - ${countList}` })
        .where('id IN (:id)', {
          id: productIdList,
        })
        .execute();

      const updateUserPointData = await manager
        .createQueryBuilder()
        .update(User)
        .set({ point: () => `point + ${addPoint}` })
        .where('id = :id', { id: getPaymentLogData.userId })
        .execute();

      const deletePaymentDetailsData =
        await this.paymentDetailsRepository.deletePaymentDetails(
          paymentLogId,
          manager,
        );

      const deletePaymentLogData =
        await this.paymentLogsRepository.deletePaymentLog(
          paymentLogId,
          manager,
        );

      return '주문이 취소되었습니다.';
    });

    return;
  }
}
