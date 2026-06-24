/**
 * 公共工具函式模組
 * 統一存放各處重複定義的函式
 */

/**
 * 驗證 Turnstile token
 * @param {string} token - Turnstile token
 * @param {string} secretKey - Turnstile secret key
 * @returns {Promise<boolean>} 驗證結果
 */
export async function verifyTurnstileToken(token, secretKey) {
  if (!token || !secretKey) {
    return false;
  }
  
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token
      })
    });
    
    const data = await response.json();
    return data.success === true;
  } catch (e) {
    console.error('Turnstile verification error:', e);
    return false;
  }
}

/**
 * 計算 MD5 雜湊值
 * @param {string} input - 輸入字串
 * @returns {Promise<string>} MD5 雜湊值
 */
export async function md5Hash(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('MD5', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}