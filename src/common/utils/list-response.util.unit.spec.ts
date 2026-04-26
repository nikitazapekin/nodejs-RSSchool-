import { describe, expect, it } from 'vitest';

import { SortOrder } from '../enums/sort-order.enum';
import { paginateItems, sortItems } from './list-response.util';

describe('list-response utils', () => {
  it('sorts strings in ascending order', () => {
    const result = sortItems(
      [{ name: 'charlie' }, { name: 'alice' }, { name: 'bob' }],
      {
        sortBy: 'name',
        order: SortOrder.ASC,
        allowedSortFields: ['name'],
      },
    );

    expect(result.map((item) => item.name)).toEqual(['alice', 'bob', 'charlie']);
  });

  it('returns a paginated response when page or limit are provided', () => {
    const result = paginateItems(
      [{ id: 1 }, { id: 2 }, { id: 3 }],
      { page: 1, limit: 2 },
    );

    expect(result).toEqual({
      total: 3,
      page: 1,
      limit: 2,
      data: [{ id: 1 }, { id: 2 }],
    });
  });

  it('returns the original array shape when pagination is not requested', () => {
    const result = paginateItems([{ id: 1 }, { id: 2 }], {});
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('returns a copy when sortBy is invalid', () => {
    const items = [{ name: 'b' }, { name: 'a' }];
    const result = sortItems(items, { sortBy: 'invalid', allowedSortFields: ['name'] });

    expect(result).toEqual(items);
    expect(result).not.toBe(items);
  });

  it('handles null values and arrays during sorting', () => {
    const withNulls = sortItems(
      [{ name: 'b' }, { name: null }, { name: 'a' }],
      { sortBy: 'name', order: SortOrder.DESC, allowedSortFields: ['name'] },
    );
    const withArrays = sortItems(
      [{ tags: ['a', 'b'] }, { tags: ['c'] }],
      { sortBy: 'tags', order: SortOrder.ASC, allowedSortFields: ['tags'] },
    );

    expect(withNulls[withNulls.length - 1].name).toBeNull();
    expect(withArrays).toEqual([{ tags: ['a', 'b'] }, { tags: ['c'] }]);
  });

  it('handles equal values and descending number sort', () => {
    const equalValues = sortItems(
      [{ value: 1 }, { value: 1 }],
      { sortBy: 'value', order: SortOrder.ASC, allowedSortFields: ['value'] },
    );
    const descending = sortItems(
      [{ value: 1 }, { value: 3 }, { value: 2 }],
      { sortBy: 'value', order: SortOrder.DESC, allowedSortFields: ['value'] },
    );

    expect(equalValues).toEqual([{ value: 1 }, { value: 1 }]);
    expect(descending.map((item) => item.value)).toEqual([3, 2, 1]);
  });
});
