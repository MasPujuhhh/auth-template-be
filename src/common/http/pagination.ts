export interface PaginationMeta {
  page: number;
  perPage: number;
  totalRow: number;
  totalPage: number;
}

export function buildPaginationMeta(params: {
  page: number;
  perPage: number;
  totalRow: number;
}): PaginationMeta {
  const { page, perPage, totalRow } = params;

  return {
    page,
    perPage,
    totalRow,
    totalPage: Math.ceil(totalRow / perPage),
  };
}

export function paginateArray<T>(
  array: T[],
  pageSize: number,
  pageNumber: number,
): T[] {
  return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
}
