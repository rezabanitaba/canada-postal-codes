export class InvalidPostalCodeError extends Error {
  constructor(input: string) {
    super(`"${input}" is not a valid Canadian postal code (expected format: A1A 1A1).`);
    this.name = "InvalidPostalCodeError";
  }
}

export class PostalCodeNotFoundError extends Error {
  constructor(input: string) {
    super(`Postal code "${input}" was not found in the dataset.`);
    this.name = "PostalCodeNotFoundError";
  }
}
