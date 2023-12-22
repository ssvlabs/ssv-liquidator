export class SSVLiquidatorException extends Error {
  public data: any;
  public hash: any;

  constructor(message: string, data: any, hash?: string) {
    super(message);
    this.name = this.constructor.name;
    this.data = data;
    this.hash = hash;
    Error.captureStackTrace(this, this.constructor);
  }
}
