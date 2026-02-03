// Shared types for admin pages

export interface GroupBuy {
    id: string;
    title: string;
    targetCount: number;
    currentCount: number;
    status: string;
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
    status: string;
    participants: number;
    description: string;
    prizes: string[];
    minParticipants?: number;
    isHot?: boolean;
}

export interface Participant {
    id: string;
    userId: string;
    name?: string;
    contact?: string; // Legacy field
    contactInfo?: string; // New field from API
    isWinner?: boolean;
    joinedAt?: string;
    createdAt: string; // From API
    quantity: number;
    users?: { name: string; email?: string } | null;
    savedContacts?: { type: string; value: string }[];
}

export interface SiteConfig {
    telegram_link: string;
    qq_group_link: string;
    official_email: string;
    friend_links: string;
    footer_copyright: string;
    footer_qr_image: string;
    footer_qr_title: string;
}

export interface TransactionStats {
    todayRevenue: number;
    yesterdayRevenue: number;
    monthlyRevenue: number;
    monthlyOrderCount: number;
    activeGroupsCount?: number;
    lockedGroupsCount?: number;
    endedGroupsCount?: number;
    totalEndedGroupSales?: number;
}
