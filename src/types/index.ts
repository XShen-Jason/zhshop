export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN'
}

export enum OrderStatus {
    PENDING = '待联系',
    CONTACTED = '已联系',
    COMPLETED = '已完成',
    CANCELLED = '已取消'
}

export enum GroupStatus {
    ACTIVE = '进行中',
    LOCKED = '已锁单',
    COMPLETED = '已结束'
}

export enum LotteryStatus {
    PENDING = '待开奖',
    COMPLETED = '已结束'
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    points: number;
    contactInfo?: string;
    lastCheckIn?: string;
}

export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    subCategory?: string;
    inStock: boolean;
    stock: number;
    features: string[];
    specs?: string;
    tutorialId?: string;
    isHot?: boolean;
    image_url?: string;
    updatedAt?: string;
}

export interface Tutorial {
    id: string;
    title: string;
    summary: string;
    description?: string;
    content: string;
    updatedAt: string;
    category: string;
    tags: string[];
    relatedProductId?: string;
    isLocked?: boolean;
    isHot?: boolean;
    imageUrl?: string;
    format?: 'md' | 'html';
}

export interface GroupBuy {
    id: string;
    title: string;
    targetCount: number;
    currentCount: number;
    status: GroupStatus;
    price: number;
    description: string;
    features: string[];
    autoRenew?: boolean;
    isHot?: boolean;
}

export interface Lottery {
    id: string;
    title: string;
    drawDate: string;
    winnersCount: number;
    entryCost: number;
    status: LotteryStatus;
    participants: number;
    description: string;
    prizes: string[];
    hasEntered?: boolean;
    isHot?: boolean;
}

export interface Order {
    id: string;
    userId: string;
    itemId: string;
    itemType: 'PRODUCT' | 'GROUP' | 'LOTTERY';
    itemName: string;
    status: string;
    createdAt: string;
    contactDetails: string;
    notes?: string;
    cost?: number;
    currency?: 'USD' | 'CNY' | 'POINTS';
    quantity?: number;
    savedContacts?: { type: string; value: string }[];
}

export interface PointLog {
    id: string;
    userId: string;
    amount: number;
    reason: string;
    date: string;
    type: 'EARN' | 'SPEND';
}
