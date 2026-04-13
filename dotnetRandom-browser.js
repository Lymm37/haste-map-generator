const MBIG = 2147483647;
const MSEED = 161803398;

export class DotNetRandom {
  constructor(seed) {
    let subtraction = seed === -2147483648 ? 2147483647 : Math.abs(seed);
    let mj = MSEED - subtraction;
    if (mj < 0) {
      mj += MBIG;
    }

    this.seedArray = new Array(56).fill(0);
    this.seedArray[55] = mj;
    let mk = 1;

    for (let i = 1; i < 55; i += 1) {
      const ii = (21 * i) % 55;
      this.seedArray[ii] = mk;
      mk = mj - mk;
      if (mk < 0) {
        mk += MBIG;
      }
      mj = this.seedArray[ii];
    }

    for (let k = 1; k < 5; k += 1) {
      for (let i = 1; i < 56; i += 1) {
        this.seedArray[i] -= this.seedArray[1 + ((i + 30) % 55)];
        if (this.seedArray[i] < 0) {
          this.seedArray[i] += MBIG;
        }
      }
    }

    this.inext = 0;
    this.inextp = 21;
  }

  internalSample() {
    let locINext = this.inext + 1;
    if (locINext >= 56) {
      locINext = 1;
    }

    let locINextp = this.inextp + 1;
    if (locINextp >= 56) {
      locINextp = 1;
    }

    let retVal = this.seedArray[locINext] - this.seedArray[locINextp];
    if (retVal === MBIG) {
      retVal -= 1;
    }
    if (retVal < 0) {
      retVal += MBIG;
    }

    this.seedArray[locINext] = retVal;
    this.inext = locINext;
    this.inextp = locINextp;

    return retVal;
  }

  sample() {
    return this.internalSample() * (1.0 / MBIG);
  }

  nextDouble() {
    return this.sample();
  }

  next(minValue, maxValue) {
    if (minValue === undefined && maxValue === undefined) {
      return this.internalSample();
    }

    if (maxValue === undefined) {
      maxValue = minValue;
      minValue = 0;
    }

    if (minValue > maxValue) {
      throw new Error('minValue cannot be greater than maxValue.');
    }

    const range = maxValue - minValue;
    if (range <= 2147483647) {
      return Math.trunc(this.sample() * range) + minValue;
    }

    const largeSample = this.getSampleForLargeRange();
    return Math.trunc(largeSample * range) + minValue;
  }

  getSampleForLargeRange() {
    let result = this.internalSample();
    if (this.internalSample() % 2 === 0) {
      result = -result;
    }
    let d = result;
    d += 2147483646;
    return d / 4294967293;
  }
}
