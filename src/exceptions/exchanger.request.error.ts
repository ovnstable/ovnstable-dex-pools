export class ExchangerRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExchangerRequestError';
  }
}
