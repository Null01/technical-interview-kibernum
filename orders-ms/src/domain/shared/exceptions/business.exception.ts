/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
export abstract class BusinessException extends Error {
  abstract readonly errorCode: string;
  abstract readonly httpStatus: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
