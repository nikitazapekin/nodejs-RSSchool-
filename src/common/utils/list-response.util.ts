import { SortOrder } from '../enums/sort-order.enum';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';

interface PaginationOptions {
  page?: number;
  limit?: number;
}

interface SortOptions<T> {
  allowedSortFields: Array<keyof T & string>;
  order?: SortOrder;
  sortBy?: string;
}

type SortableValue = number | string | string[] | null | undefined;

export function sortItems<T extends object>(
  items: T[],
  options: SortOptions<T>,
): T[] {
  const { sortBy, order = SortOrder.ASC, allowedSortFields } = options;

  if (!sortBy || !allowedSortFields.includes(sortBy as keyof T & string)) {
    return [...items];
  }

  return [...items].sort((left, right) => {
    const leftValue = left[sortBy as keyof T] as SortableValue;
    const rightValue = right[sortBy as keyof T] as SortableValue;

    if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
      return 0;
    }

    if (leftValue === rightValue) {
      return 0;
    }

    if (leftValue == null) {
      return order === SortOrder.ASC ? -1 : 1;
    }

    if (rightValue == null) {
      return order === SortOrder.ASC ? 1 : -1;
    }

    return leftValue > rightValue
      ? order === SortOrder.ASC
        ? 1
        : -1
      : order === SortOrder.ASC
        ? -1
        : 1;
  });
}

export function paginateItems<T>(
  items: T[],
  options: PaginationOptions,
): T[] | PaginatedResponse<T> {
  const { page, limit } = options;

  if (page === undefined && limit === undefined) {
    return items;
  }

  const currentPage = page ?? 1;
  const currentLimit = limit ?? 10;
  const startIndex = (currentPage - 1) * currentLimit;
  const data = items.slice(startIndex, startIndex + currentLimit);

  return {
    total: items.length,
    page: currentPage,
    limit: currentLimit,
    data,
  };
}
