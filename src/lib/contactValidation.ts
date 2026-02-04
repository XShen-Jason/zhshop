export type ContactType = 'WeChat' | 'QQ' | 'Phone' | 'Email' | 'Telegram' | 'Other' | string;

export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

export function validateContact(type: ContactType, value: string): ValidationResult {
    if (!value) return { isValid: true }; // Empty is valid (handled by required check if needed)

    // Normalize type case
    const normalizedType = type.toLowerCase();

    // Custom types are skipped
    if (normalizedType === 'other') return { isValid: true };

    // WeChat: 6-20 chars, letter/num/_/-, start with letter (actually some strict rules, but broadly: no Chinese, no special chars)
    // User requirement: "No Chinese or special symbols"
    if (normalizedType === 'wechat' || normalizedType === '微信') {
        if (/[\u4e00-\u9fa5]/.test(value)) {
            return { isValid: false, message: '微信号不能包含中文' };
        }
        // Allow letters, numbers, _, -
        if (!/^[a-zA-Z0-9_\-]+$/.test(value)) {
            return { isValid: false, message: '微信号只能包含字母、数字、下划线和减号' };
        }
        return { isValid: true };
    }

    // QQ: Numbers only
    if (normalizedType === 'qq') {
        if (!/^[0-9]+$/.test(value)) {
            return { isValid: false, message: 'QQ号只能包含数字' };
        }
        return { isValid: true };
    }

    // Phone: Numbers, +, -
    if (normalizedType === 'phone' || normalizedType === '手机号') {
        if (!/^[0-9+\-]+$/.test(value)) {
            return { isValid: false, message: '手机号只能包含数字、+ 和 -' };
        }
        return { isValid: true };
    }

    // Email
    if (normalizedType === 'email' || normalizedType === '邮箱') {
        // Basic email regex
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return { isValid: false, message: '邮箱格式不正确' };
        }
        return { isValid: true };
    }

    // Telegram: username usually alphanumeric + _
    if (normalizedType === 'telegram') {
        const username = value.replace(/^@/, '');
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { isValid: false, message: 'Telegram 用户名只能包含字母、数字和下划线' };
        }
        return { isValid: true };
    }

    // For any other "defined" types that might slip in, default to permissive or check if it's "custom"
    // The requirement says "User自行设置的分类不需检测".
    // We assume anything else is custom.
    return { isValid: true };
}
