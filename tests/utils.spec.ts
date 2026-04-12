import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sortItems, paginateItems } from '../src/common/utils/list-response.util';
import { SortOrder } from '../src/common/enums/sort-order.enum';

describe('Utility Functions', () => {
  describe('sortItems', () => {
    it('should return a copy of the array when no sortBy is provided', () => {
      const items = [{ name: 'b' }, { name: 'a' }];
      const result = sortItems(items, { allowedSortFields: ['name'] });

      assert.deepEqual(result, items);
      assert.notStrictEqual(result, items); 
    });

    it('should return a copy when sortBy is not in allowed fields', () => {
      const items = [{ name: 'b' }, { name: 'a' }];
      const result = sortItems(items, { sortBy: 'invalid', allowedSortFields: ['name'] });

      assert.deepEqual(result, items);
    });

    it('should sort strings in ascending order', () => {
      const items = [{ name: 'charlie' }, { name: 'alice' }, { name: 'bob' }];
      const result = sortItems(items, { sortBy: 'name', order: SortOrder.ASC, allowedSortFields: ['name'] });

      assert.equal(result[0].name, 'alice');
      assert.equal(result[1].name, 'bob');
      assert.equal(result[2].name, 'charlie');
    });

    it('should sort strings in descending order', () => {
      const items = [{ name: 'alice' }, { name: 'charlie' }, { name: 'bob' }];
      const result = sortItems(items, { sortBy: 'name', order: SortOrder.DESC, allowedSortFields: ['name'] });

      assert.equal(result[0].name, 'charlie');
      assert.equal(result[1].name, 'bob');
      assert.equal(result[2].name, 'alice');
    });

    it('should sort numbers in ascending order', () => {
      const items = [{ value: 30 }, { value: 10 }, { value: 20 }];
      const result = sortItems(items, { sortBy: 'value', order: SortOrder.ASC, allowedSortFields: ['value'] });

      assert.equal(result[0].value, 10);
      assert.equal(result[1].value, 20);
      assert.equal(result[2].value, 30);
    });

    it('should handle null values by placing them first in ASC order', () => {
      const items = [{ name: 'b' }, { name: null }, { name: 'a' }];
      const result = sortItems(items, { sortBy: 'name', order: SortOrder.ASC, allowedSortFields: ['name'] });

      assert.equal(result[0].name, null);
    });

    it('should handle null values by placing them last in DESC order', () => {
      const items = [{ name: 'b' }, { name: null }, { name: 'a' }];
      const result = sortItems(items, { sortBy: 'name', order: SortOrder.DESC, allowedSortFields: ['name'] });

      assert.equal(result[result.length - 1].name, null);
    });

    it('should return 0 for array comparisons (no sorting)', () => {
      const items = [{ tags: ['a', 'b'] }, { tags: ['c'] }];
      const result = sortItems(items, { sortBy: 'tags', order: SortOrder.ASC, allowedSortFields: ['tags'] });

      assert.deepEqual(result, items);
    });
  });

  describe('paginateItems', () => {
    it('should return plain array when no pagination params are given', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = paginateItems(items, {});

      assert.equal(Array.isArray(result), true);
      assert.deepEqual(result, items);
    });

    it('should return paginated response when page is specified', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
      const result = paginateItems(items, { page: 1, limit: 2 });

      assert.equal(Array.isArray(result), false);
      assert.equal((result as any).total, 5);
      assert.equal((result as any).page, 1);
      assert.equal((result as any).limit, 2);
      assert.equal((result as any).data.length, 2);
      assert.equal((result as any).data[0].id, 1);
      assert.equal((result as any).data[1].id, 2);
    });

    it('should return paginated response when limit is specified (default page 1)', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = paginateItems(items, { limit: 2 });

      assert.equal((result as any).page, 1);
      assert.equal((result as any).limit, 2);
      assert.equal((result as any).data.length, 2);
    });

    it('should handle page beyond available data', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = paginateItems(items, { page: 5, limit: 2 });

      assert.equal((result as any).total, 2);
      assert.equal((result as any).data.length, 0);
    });

    it('should handle empty array with pagination', () => {
      const result = paginateItems([], { page: 1, limit: 10 });

      assert.equal((result as any).total, 0);
      assert.equal((result as any).data.length, 0);
    });
  });
});
