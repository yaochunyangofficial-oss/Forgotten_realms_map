export type ApiErrorCode =
  | 'SUPABASE_NOT_CONFIGURED'
  | 'AUTH_REQUIRED'
  | 'AUTH_FAILURE'
  | 'BACKEND_UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'CAMPAIGN_NOT_FOUND'
  | 'MAP_OBJECT_NOT_FOUND'
  | 'SCHEMA_NOT_READY'
  | 'SAVE_CONFLICT'
  | 'INVALID_REQUEST'
  | 'INVITE_INVALID'
  | 'CREATE_FAILED'
  | 'SAVE_FAILED'
  | 'LOAD_FAILED'
  | 'INTERNAL_ERROR'
  | 'ORIGIN_MISMATCH';

export const apiErrorText: Record<ApiErrorCode, string> = {
  SUPABASE_NOT_CONFIGURED: 'Supabase 尚未設定。請在部署環境填入必要的 Supabase 環境變數。',
  AUTH_REQUIRED: '請先登入，再使用戰役地圖。',
  AUTH_FAILURE: '登入狀態無效或已逾期，請重新登入。',
  BACKEND_UNAVAILABLE: '目前無法連線到 Supabase。請稍後重試。',
  PERMISSION_DENIED: '你沒有執行此操作的權限。',
  CAMPAIGN_NOT_FOUND: '找不到此戰役。請確認連結或重新整理戰役清單。',
  MAP_OBJECT_NOT_FOUND: '找不到這個地圖註記，請重新載入戰役。',
  SCHEMA_NOT_READY: 'Supabase 資料表尚未建立。請先執行專案中的資料庫結構 SQL。',
  SAVE_CONFLICT: '另一個視窗已更新戰役。請先保留你的編輯，再重新載入。',
  INVALID_REQUEST: '送出的資料不完整或格式錯誤。',
  INVITE_INVALID: '邀請碼無效，請確認後再試。',
  CREATE_FAILED: '建立戰役失敗。請稍後重試。',
  SAVE_FAILED: '儲存失敗，編輯內容仍保留在畫面上。請稍後重試。',
  LOAD_FAILED: '載入戰役失敗。請稍後重試。',
  INTERNAL_ERROR: '伺服器處理失敗。請稍後重試。',
  ORIGIN_MISMATCH: '請求來源不符。請重新載入網站後再試。',
};

export class AtlasApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
  ) {
    super(apiErrorText[code]);
    this.name = 'AtlasApiError';
  }
}

export function classifySupabaseError(error: unknown, context: 'auth' | 'database'): AtlasApiError {
  const value = error as { code?: string; status?: number; name?: string; message?: string } | null;
  const code = value?.code ?? '';
  const message = value?.message?.toLowerCase() ?? '';

  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST204') {
    return new AtlasApiError('SCHEMA_NOT_READY', 503);
  }
  if (code === '42501' || value?.status === 403 || /row-level security|permission denied/.test(message)) {
    return new AtlasApiError('PERMISSION_DENIED', 403);
  }
  if (error instanceof TypeError || value?.name === 'AuthRetryableFetchError' || /fetch failed|network|timeout/.test(message)) {
    return new AtlasApiError('BACKEND_UNAVAILABLE', 503);
  }
  if (context === 'auth' && (value?.status === 401 || value?.status === 400 || value?.name === 'AuthApiError')) {
    return new AtlasApiError('AUTH_FAILURE', 401);
  }
  return new AtlasApiError(context === 'auth' ? 'AUTH_FAILURE' : 'INTERNAL_ERROR', context === 'auth' ? 401 : 500);
}
