// utils.ts
export const calculateDiscountedHours = (totalEffort: number, dbCount: number): number => {
    if (dbCount <= 5) {
      return totalEffort * dbCount;
    }
    const baseEffort = totalEffort * 5;
    const discountedEffort = (totalEffort * 0.7) * (dbCount - 5);
    return Math.floor(baseEffort + discountedEffort);
  };
  
  export const calculatePersonDays = (hours: number): number => {
    return Math.floor(hours / 8);
  };
  