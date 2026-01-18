/**
 * Menu API endpoints (categories and items)
 */

import type {
  GetMenuCategoriesParams,
  GetMenuCategoriesResponse,
  GetMenuCategoryResponse,
  GetMenuItemResponse,
  GetMenuItemsParams,
  GetMenuItemsResponse,
} from '../../types/api';
import { getApiClient } from './client';

/**
 * Build query string from params object
 */
function buildQueryString<T extends object>(params: T): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Get all menu categories with optional filtering and pagination
 */
export async function getMenuCategories(
  params?: GetMenuCategoriesParams
): Promise<GetMenuCategoriesResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetMenuCategoriesResponse>(`/menu-category${queryString}`);
}

/**
 * Get a single menu category by ID
 */
export async function getMenuCategory(id: string): Promise<GetMenuCategoryResponse> {
  const client = getApiClient();
  return client.get<GetMenuCategoryResponse>(`/menu-category/${id}`);
}

/**
 * Get all menu items with optional filtering and pagination
 */
export async function getMenuItems(params?: GetMenuItemsParams): Promise<GetMenuItemsResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetMenuItemsResponse>(`/menu-item${queryString}`);
}

/**
 * Get a single menu item by ID
 */
export async function getMenuItem(id: string): Promise<GetMenuItemResponse> {
  const client = getApiClient();
  return client.get<GetMenuItemResponse>(`/menu-item/${id}`);
}
