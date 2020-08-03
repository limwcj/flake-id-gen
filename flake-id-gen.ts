import baseX from 'base-x';

interface ConstructorOptions {
  // Datacenter identifier. It can have values from 0 to 31.
  datacenter?: number;
  // Worker identifier. It can have values from 0 to 31.
  worker?: number;
  // Generator identifier. It can have values from 0 to 1023.
  // It can be provided instead of <tt>datacenter</tt> and <tt>worker</tt> identifiers.
  id?: number;
  // Number used to reduce value of a generated timestamp.
  // WARNING: Modifying epoch may result in 10 digits of ID
  // epoch?: number;
  // sequence number
  seqMask?: number;
}

export const VALID_TIME_INTERVAL = 24 * 60 * 60 * 1000;

export enum EncodingType {
  BASE58 = 'BASE58',
  BASE64 = 'BASE64',
  BASE62 = 'BASE62',
}

export const Alphabets = {
  BASE58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  BASE64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  BASE62: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
};

// +-------------+------------+--------+---------+--------------------+
// |  Timestamp  | Datacenter | Worker | Counter | Flake ID           |
// +-------------+------------+--------+---------+--------------------+
// | 0x8c20543b0 |   00000b   | 00000b |  0x000  | 0x02308150ec000000 |
// +-------------+------------+--------+---------+--------------------+
// up to 4096 unique ids in the same milliseconds and the same worker
export class FlakeId {
  private options: ConstructorOptions;
  private genId: number;
  private epoch: number;
  private seq: number;
  private lastTime: number;
  private seqMask: number;
  private overflow: boolean;
  public id: number;
  public datacenter: number;
  public worker: number;

  constructor(options: ConstructorOptions) {
    this.options = options || {};
    // Set generator id from 'id' option or combination of 'datacenter' and 'worker'
    if (typeof this.options.id !== 'undefined') {
      this.id = this.options.id & 0x3ff;
    } else {
      this.datacenter = (this.options.datacenter || 0) & 0x1f;
      this.worker = (this.options.worker || 0) & 0x1f;
      this.id = (this.datacenter << 5) | this.worker;
    }
    this.genId = this.id;
    this.genId <<= 12; // id generator identifier - will not change while generating ids
    // WARNING: Modifying epoch may result in 10 digits of ID
    // this.epoch = +this.options.epoch! || 0;
    this.epoch = 0;
    this.seq = 0;
    this.lastTime = 0;
    this.overflow = false;
    this.seqMask = this.options.seqMask || 0xfff;
  }

  next(encodingType?: EncodingType): Buffer | string {
    let id: Buffer | string;
    if (Buffer.alloc) {
      id = Buffer.alloc(8);
    } else {
      id = new Buffer(8);
      id.fill(0);
    }
    const time = Date.now() - this.epoch;

    // Generates id in the same millisecond as the previous id
    if (time < this.lastTime) {
      throw new Error(`Clock moved backwards. Refusing to generate id for ${this.lastTime - time} milliseconds`);
    } else if (time === this.lastTime) {
      // If all sequence values (4096 unique values including 0) have been used
      // to generate ids in the current millisecond (overflow is true) wait till next millisecond
      if (this.overflow) {
        throw new Error('Sequence exceeded its maximum value. Provide callback function to handle sequence overflow');
      }

      // Increase sequence counter
      /*jslint bitwise: true */
      this.seq = (this.seq + 1) & this.seqMask;

      // sequence counter exceeded its max value (4095)
      // - set overflow flag and wait till next millisecond
      if (this.seq === 0) {
        this.overflow = true;
        throw new Error('Sequence exceeded its maximum value. Provide callback function to handle sequence overflow');
      }
    } else {
      this.overflow = false;
      this.seq = 0;
    }
    this.lastTime = time;

    id.writeUInt32BE(((time & 0x3) << 22) | this.genId | this.seq, 4);
    id.writeUInt8(Math.floor(time / 4) & 0xff, 4);
    id.writeUInt16BE(Math.floor(time / this.POW10) & 0xffff, 2);
    id.writeUInt16BE(Math.floor(time / this.POW26) & 0xffff, 0);

    /**
     * WARNING:
     * baseX is NOT RFC3548 compliant,
     * it cannot be used for base16 (hex), base32, or base64 encoding in a standards compliant manner.
     */
    if (encodingType) {
      id = baseX(Alphabets[encodingType]).encode(id);
    }

    return id;
  }

  // Return boolean if a buffer or a string specifying encodingType is a valid id
  // Default encodingType: BASE58
  // The time range should be within one day before and after
  isValid(o: string | Buffer, encodingType?: EncodingType): boolean {
    if (typeof o === 'string' && !encodingType) {
      throw new Error('EncodingType cannot be empty when first param is a string');
    }
    try {
      if (typeof o === 'string') {
        o = baseX(Alphabets[encodingType!]).decode(o);
      }
      const binary = this.bytesToBinary(o);
      const time = parseInt(binary.slice(0, 42), 2);
      const datacenter = parseInt(binary.slice(42, 47), 2);
      const worker = parseInt(binary.slice(47, 52), 2);
      const seq = parseInt(binary.slice(52), 2);
      return Math.abs(Date.now() - time) < VALID_TIME_INTERVAL && !isNaN(datacenter) && !isNaN(worker) && !isNaN(seq);
    } catch (e) {
      //
    }
    return false;
  }

  private bytesToBinary(buf: Buffer): string {
    let result = '';
    for (const i of buf) {
      const binStr = Number(i).toString(2);
      result += binStr.padStart(8, '0');
    }
    return result;
  }

  private get POW10() {
    return 2 << 9;
  }

  private get POW26() {
    return 2 << 25;
  }
}
