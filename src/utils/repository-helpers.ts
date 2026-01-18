import { SelectFields } from '@/types';
import { getColumns } from 'drizzle-orm';

export const normalizeSelect = <T>(select?: SelectFields<T>) => {
  if (!select || Object.keys(select).length === 0) {
    return undefined;
  }
  return select;
};

export const buildReturning = <T>(table: any, select?: SelectFields<T>) => {
  if (!select || Object.keys(select).length === 0) {
    return undefined;
  }

  const hasTrue = Object.values(select).some((v) => v === true);

  if (hasTrue) {
    const result: any = {};
    for (const key in select) {
      if (select[key as keyof T] === true) {
        result[key] = table[key];
      }
    }
    return result;
  }

  const allColumns = getColumns(table);
  const result: any = {};
  for (const key in allColumns) {
    if (select[key as keyof T] !== false) {
      result[key] = allColumns[key];
    }
  }
  return result;
};
