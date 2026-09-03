import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_LENGTH = 16;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_LENGTH).toString('base64url');
  const derivedKey = await deriveScryptKey(password, salt);

  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt,
    derivedKey.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const parsedHash = parseScryptHash(passwordHash);

  if (!parsedHash) {
    return false;
  }

  let derivedKey: Buffer;

  try {
    derivedKey = await deriveScryptKey(password, parsedHash.salt, parsedHash.options);
  } catch {
    return false;
  }

  if (derivedKey.length !== parsedHash.expectedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, parsedHash.expectedKey);
}

function deriveScryptKey(
  password: string,
  salt: string,
  options = {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
  },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: options.cost,
        r: options.blockSize,
        p: options.parallelization,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

function parseScryptHash(passwordHash: string):
  | {
      salt: string;
      expectedKey: Buffer;
      options: { cost: number; blockSize: number; parallelization: number };
    }
  | null {
  const [algorithm, rawCost, rawBlockSize, rawParallelization, salt, rawKey] =
    passwordHash.split('$');

  if (
    algorithm !== 'scrypt' ||
    !rawCost ||
    !rawBlockSize ||
    !rawParallelization ||
    !salt ||
    !rawKey
  ) {
    return null;
  }

  const cost = Number(rawCost);
  const blockSize = Number(rawBlockSize);
  const parallelization = Number(rawParallelization);

  if (
    !Number.isInteger(cost) ||
    !Number.isInteger(blockSize) ||
    !Number.isInteger(parallelization)
  ) {
    return null;
  }

  try {
    return {
      salt,
      expectedKey: Buffer.from(rawKey, 'base64url'),
      options: {
        cost,
        blockSize,
        parallelization,
      },
    };
  } catch {
    return null;
  }
}
