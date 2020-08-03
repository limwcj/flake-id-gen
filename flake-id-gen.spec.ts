import { EncodingType, FlakeId } from './flake-id-gen';

describe('Flake id', () => {
  const flakeIdGen = new FlakeId({
    // 0-31
    worker: (Number(process.pid) || 0) % 32,
    // 0-31
    datacenter: Math.floor(Math.random() * 32),
  });

  describe('Generate flake id', () => {
    it('Generate flake id without encoding', () => {
      const id = flakeIdGen.next();
      expect(id).toBeObject();
      expect(id).toHaveLength(8);
    });

    it('Generate flake id with base58', () => {
      const id = flakeIdGen.next(EncodingType.BASE58);
      expect(id).toBeString();
      expect(id).toHaveLength(11);
    });

    it('Generate flake id with base62', () => {
      const id = flakeIdGen.next(EncodingType.BASE62);
      expect(id).toBeString();
      expect(id).toHaveLength(11);
    });

    it('Generate flake id with base64', () => {
      const id = flakeIdGen.next(EncodingType.BASE64);
      console.log(id);
      expect(id).toBeString();
      expect(id).toHaveLength(11);
    });
  });

  describe('Verify flake id', () => {
    it('Verify fake flake id', () => {
      const result1 = flakeIdGen.isValid('snjasndnsd', EncodingType.BASE58);
      expect(result1).toEqual(false);
      const result2 = flakeIdGen.isValid('11111111111', EncodingType.BASE58);
      expect(result2).toEqual(false);
      const result3 = flakeIdGen.isValid('abcdabcdabc', EncodingType.BASE58);
      expect(result3).toEqual(false);
      const result4 = flakeIdGen.isValid('a', EncodingType.BASE58);
      expect(result4).toEqual(false);
      const result5 = flakeIdGen.isValid('aaaaaaaaaaa', EncodingType.BASE58);
      expect(result5).toEqual(false);
      const result6 = flakeIdGen.isValid('aaaaaaaaaaa', EncodingType.BASE62);
      expect(result6).toEqual(false);
      const result7 = flakeIdGen.isValid('aaaaaaaaaaa', EncodingType.BASE64);
      expect(result7).toEqual(false);
    });

    it('Verify flake id without encoding', () => {
      const id = flakeIdGen.next();
      const result = flakeIdGen.isValid(id);
      expect(result).toEqual(true);
    });

    it('Verify flake id with base58', () => {
      const id = flakeIdGen.next(EncodingType.BASE58);
      const result = flakeIdGen.isValid(id, EncodingType.BASE58);
      expect(result).toEqual(true);
    });

    it('Verify flake id with base64', () => {
      const id = flakeIdGen.next(EncodingType.BASE64);
      const result = flakeIdGen.isValid(id, EncodingType.BASE64);
      expect(result).toEqual(true);
    });

    it('Verify flake id with base62', () => {
      const id = flakeIdGen.next(EncodingType.BASE62);
      const result = flakeIdGen.isValid(id, EncodingType.BASE62);
      expect(result).toEqual(true);
    });

    it('Verify flake id with wrong encoding', () => {
      const id1 = flakeIdGen.next(EncodingType.BASE58);
      const result1 = flakeIdGen.isValid(id1, EncodingType.BASE64);
      expect(result1).toEqual(false);

      const id2 = flakeIdGen.next(EncodingType.BASE62);
      const result2 = flakeIdGen.isValid(id2, EncodingType.BASE64);
      expect(result2).toEqual(false);
    });

    it('Verify flake id with wrong params', () => {
      expect(() => {
        flakeIdGen.isValid('aaa');
      }).toThrow();
    });
  });
});
